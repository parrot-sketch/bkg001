import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton for Serverless Environments
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CONNECTION BUDGET  (Aiven Free Tier — ~20 usable slots)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aiven free-tier PostgreSQL typically provides max_connections = 25, of
 * which ~5 are reserved for superuser / replication.  That leaves ~20
 * usable connection slots for the application.
 *
 * Strategy:
 *   • ONE PrismaClient instance per process (globalThis singleton)
 *   • connection_limit=1 per instance — each serverless function handles
 *     one request at a time, so one DB connection is sufficient.
 *   • pool_timeout=5 / connect_timeout=5 — fail fast to prevent pile-ups.
 *   • If Aiven exposes a PgBouncer pooled URL, set DATABASE_URL to that
 *     and DIRECT_URL to the direct connection (for migrations only).
 *
 * With connection_limit=1 you can safely run ~15-20 concurrent Vercel
 * function instances before exhausting the pool.
 *
 * This singleton protects against:
 *   • HMR re-creation in dev (globalThis survives hot-reload)
 *   • Per-request instantiation in prod (globalThis survives across
 *     Vercel invocations on the same instance)
 *   • Connection pool exhaustion
 * ═══════════════════════════════════════════════════════════════════════════
 */

const LOG_PREFIX = '[DB]';

const prismaClientSingleton = () => {
  const isProduction = process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production';

  const client = new PrismaClient({
    // Log config: errors everywhere; queries + warns in dev only
    log: isProduction
      ? ['error']
      : ['query', 'error', 'warn'],
    // connection_limit=1: one connection per serverless instance — fits Aiven free tier
    // pool_timeout=5:     fail fast if no slot is available
    // connect_timeout=5:  don't hang on cold-start TCP handshake
    datasources: isProduction ? {
      db: {
        url: (process.env.DATABASE_URL || '') +
          (process.env.DATABASE_URL?.includes('?') ? '&' : '?') +
          'connection_limit=1&pool_timeout=5&connect_timeout=5',
      },
    } : undefined,
  });

  return client;
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

// Cache Prisma client on globalThis to survive HMR (dev) and
// Vercel function reuse (prod).  Never create more than one instance.
const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (!globalThis.prismaGlobal) {
  globalThis.prismaGlobal = db;

  // Handle graceful shutdown — only register once (guarded by the globalThis check)
  // In Vercel serverless these fire when the function instance is recycled.
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

/** Quick health-check.  Call sparingly — every call is a real round-trip. */
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
 * Retry wrapper for database operations with exponential backoff.
 *
 * Only retries on *transient connection errors* (P1001, P1008, P1017,
 * P1010, "Connection closed/terminated/refused").  Application-level
 * Prisma errors (unique constraint, validation, etc.) are surfaced
 * immediately.
 *
 * NOTE: In serverless (one request per instance) calling $disconnect +
 * $connect is safe.  In a long-running `next start` process avoid
 * calling this wrapper around operations that run concurrently — the
 * disconnect would tear down connections used by parallel requests.
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
        // Safe in serverless (single concurrent request per instance).
        try {
          await db.$disconnect();
          await db.$connect();
        } catch {
          // Swallow — the next operation attempt triggers lazy reconnect
        }

        continue;
      }

      // Not a connection error, or max retries reached — surface immediately
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

