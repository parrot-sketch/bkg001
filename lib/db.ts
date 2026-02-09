import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton for Serverless Environments
 * 
 * CRITICAL: This singleton pattern prevents connection pool exhaustion.
 * In production, Next.js serverless functions can create new instances on each request
 * if not properly cached, leading to "Too many database connections" errors.
 * 
 * IMPORTANT: This implementation works WITHOUT connection pool parameters in DATABASE_URL.
 * Some databases (like certain managed services) don't support connection pool parameters.
 * 
 * Connection Management Strategy (without pooling):
 * - Single Prisma client instance shared across all requests (via globalThis)
 * - Explicit connection lifecycle management
 * - Automatic reconnection on connection failures
 * - Graceful connection cleanup on function termination
 * 
 * This protects against:
 * - Network hiccups
 * - Stuck queries
 * - Zombie connections
 * - Serverless cold starts
 * - Connection exhaustion (by reusing single client)
 */
const prismaClientSingleton = () => {
  const isProduction = process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production';

  return new PrismaClient({
    // Logging configuration
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // LIMIT CONNECTION POOL:
    // Aiven free tier has ~25 connection slots, with some reserved for superuser.
    // In Vercel serverless, EACH cold-start creates its own process with its own pool.
    // connection_limit=2 per process means ~10 concurrent serverless instances can run
    // before hitting the DB limit (~20 usable slots).
    // pool_timeout=10 ensures queries that can't get a connection fail fast.
    datasources: isProduction ? {
      db: {
        url: (process.env.DATABASE_URL || '') + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'connection_limit=2&pool_timeout=10',
      },
    } : undefined,
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

// CRITICAL FIX: Cache Prisma client in production to prevent connection pool exhaustion
// Previously only cached in development, causing new instances on every request
// In serverless (Vercel), globalThis persists across function invocations
const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (!globalThis.prismaGlobal) {
  globalThis.prismaGlobal = db;

  // Handle graceful shutdown — only register once (guarded by the globalThis check above)
  // NOTE: In Vercel serverless, these fire when the function instance is recycled.
  // We intentionally omit 'uncaughtException' — it can mask errors and the async
  // disconnect may not complete before the process exits.
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

// Connection health check helper
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('[DB] Connection check failed:', error);
    return false;
  }
}

/**
 * Retry wrapper for database operations with exponential backoff.
 *
 * OPTIMIZED: Removed the pre-flight `SELECT 1` health check that ran before EVERY
 * operation. That doubled the number of queries and wasted a connection slot each time.
 * Prisma's internal pool already handles lazy connect/reconnect.
 *
 * Retries are only attempted for transient connection errors — not for application-level
 * Prisma errors (unique constraint, validation, etc.).
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

      // Only retry on transient connection errors
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
        console.warn(`[DB] Connection error on attempt ${attempt}/${maxRetries}, retrying...`, {
          message: error?.message,
          code: error?.code,
        });

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));

        // Reset connection state before retry
        try {
          await db.$disconnect();
          await db.$connect();
        } catch {
          // Swallow — the next operation attempt will trigger lazy reconnect
        }

        continue;
      }

      // Not a connection error, or max retries reached — surface the error
      throw error;
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

export default db;
export { db };

