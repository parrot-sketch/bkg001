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

  const isBuilding = process.env.NEXT_PHASE === 'phase-production-build';
  const databaseUrl = process.env.DATABASE_URL || (isBuilding ? 'postgresql://dummy:dummy@localhost:5432/dummy' : '');

  if (!databaseUrl && !isBuilding) {
    console.error(`${LOG_PREFIX} DATABASE_URL is not defined`);
  }

  // FORCE local dev to be direct connection only
  if (!isProduction) {
    console.log(`${LOG_PREFIX} Local/Dev Environment: Using direct PrismaClient (no accelerate)`);
    return new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }

  // Production logic with Accelerate
  const isAccelerate = databaseUrl.startsWith('prisma://');
  const logConfig: Array<'query' | 'error' | 'warn'> = ['error'];

  if (isAccelerate) {
    return new PrismaClient({ log: logConfig }).$extends(withAccelerate()) as unknown as PrismaClient;
  }

  return new PrismaClient({
    log: logConfig,
  }).$extends(withAccelerate()) as unknown as PrismaClient;
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

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
