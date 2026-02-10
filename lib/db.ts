import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

/**
 * Prisma Client Singleton — Connection Strategy
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PRODUCTION  (Vercel → Prisma Accelerate → Aiven Postgres)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Problem: Aiven free tier has max_connections = 15 (~12 usable).
 * Vercel serverless can spin up 12+ concurrent function instances,
 * each needing its own DB connection → instant pool exhaustion.
 *
 * Solution: Prisma Accelerate acts as a connection pooler proxy:
 *
 *   Vercel fn #1 ──┐
 *   Vercel fn #2 ──┤── Accelerate proxy ──── Aiven Postgres (15 conns)
 *   Vercel fn #N ──┘     (managed pool)
 *
 * DATABASE_URL = prisma://accelerate.prisma-data.net/?api_key=...
 * DIRECT_URL  = postgres://avnadmin:...@pg-xxx.aivencloud.com:22630/...
 *
 * Accelerate multiplexes unlimited client connections over ~5 real
 * database connections. No connection_limit tuning needed.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LOCAL DEVELOPMENT  (Docker Postgres, 100+ max_connections)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * DATABASE_URL = postgresql://postgres:postgres@localhost:5433/nairobi_sculpt
 * DIRECT_URL   = (same as DATABASE_URL)
 *
 * withAccelerate() is a no-op when URL is postgres:// — zero overhead.
 * A conservative connection_limit=5 is applied as a safety net.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const LOG_PREFIX = '[DB]';

const prismaClientSingleton = () => {
  const isVercel = process.env.VERCEL === '1';
  const isProduction = isVercel ||
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production';

  const databaseUrl = process.env.DATABASE_URL || '';
  const isAccelerate = databaseUrl.startsWith('prisma://');

  const logConfig: Array<'query' | 'error' | 'warn'> = isProduction
    ? ['error']
    : ['query', 'error', 'warn'];

  // ── Prisma Accelerate (production) ─────────────────────────────────
  // The proxy handles all connection pooling — no datasources override.
  // withAccelerate() enables the Accelerate protocol for prisma:// URLs.
  if (isAccelerate) {
    if (!isProduction) {
      console.log(`${LOG_PREFIX} Prisma Accelerate: connection pooling via proxy`);
    }

    const client = new PrismaClient({ log: logConfig })
      .$extends(withAccelerate());

    // Cast to PrismaClient for type compatibility with 17 repository
    // constructors that accept PrismaClient. At runtime the extended
    // client is a strict superset — all methods work identically.
    return client as unknown as PrismaClient;
  }

  // ── Direct Postgres (local dev / Docker) ───────────────────────────
  // Apply conservative connection limits. Docker has 100+ max_connections
  // so 5 is plenty. Also protects if accidentally pointing at a remote DB.
  const cleanUrl = databaseUrl
    .replace(/[&?]connection_limit=\d+/g, '')
    .replace(/[&?]pool_timeout=\d+/g, '')
    .replace(/[&?]connect_timeout=\d+/g, '');
  const sep = cleanUrl.includes('?') ? '&' : '?';
  const pooledUrl = `${cleanUrl}${sep}connection_limit=5&pool_timeout=10`;

  if (!isProduction) {
    console.log(`${LOG_PREFIX} Direct Postgres: connection_limit=5, pool_timeout=10s`);
  }

  const client = new PrismaClient({
    log: logConfig,
    datasources: {
      db: { url: pooledUrl },
    },
  }).$extends(withAccelerate()); // No-op for postgres:// URLs

  return client as unknown as PrismaClient;
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

// Cache on globalThis to survive HMR (dev) and Vercel function reuse (prod).
// Never create more than one instance per process/function.
const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (!globalThis.prismaGlobal) {
  globalThis.prismaGlobal = db;

  // Graceful shutdown — disconnect when the process exits.
  // On Vercel serverless these fire when the function instance is recycled.
  if (typeof process !== 'undefined') {
    const disconnect = async () => {
      try {
        await db.$disconnect();
      } catch {
        // Ignore disconnect errors during shutdown
      }
    };

    process.on('beforeExit', disconnect);
    process.on('SIGTERM', disconnect);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Quick health-check. Call sparingly — every call is a real round-trip. */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} [DB-ERR-001] Connection check failed:`, error);
    return false;
  }
}

/**
 * Retry wrapper for transient connection errors with exponential backoff.
 *
 * Retries on: P1001 (unreachable), P1008 (timeout), P1017 (server closed),
 * P1010 (connect timeout), and common connection error messages.
 *
 * Non-connection errors (unique constraint, validation, etc.) throw immediately.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      const isConnectionError =
        error?.name === 'PrismaClientInitializationError' ||
        error?.message?.includes('Connection closed') ||
        error?.message?.includes('Connection terminated') ||
        error?.message?.includes('Connection refused') ||
        error?.message?.includes('Can\'t reach database server') ||
        error?.message?.includes('Can\'t reach database') ||
        error?.code === 'P1001' || // Can't reach DB server
        error?.code === 'P1008' || // Operation timeout
        error?.code === 'P1017' || // Server closed connection
        error?.code === 'P1010';   // Connection timeout

      if (isConnectionError && attempt < maxRetries) {
        console.warn(
          `${LOG_PREFIX} [DB-CONN-RETRY] attempt ${attempt}/${maxRetries}`,
          { message: error?.message, code: error?.code },
        );

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));

        // Reset connection state before retry.
        try {
          await db.$disconnect();
          await db.$connect();
        } catch {
          // Swallow — next operation triggers lazy reconnect
        }

        continue;
      }

      if (isConnectionError) {
        console.error(
          `${LOG_PREFIX} [DB-ERR-002] Connection error after ${maxRetries} retries:`,
          { message: error?.message, code: error?.code },
        );
      }
      throw error;
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

export default db;
export { db };
