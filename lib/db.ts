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
    // Note: We don't set datasources.url here because Prisma reads it from DATABASE_URL env var
    // This allows the database to manage connections without pool parameters
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
  
  // Handle graceful shutdown in serverless environments
  // CRITICAL: Without connection pooling, we must explicitly manage connection lifecycle
  if (typeof process !== 'undefined') {
    // Disconnect on function termination to free up connections
    const disconnect = async () => {
      try {
        await db.$disconnect();
      } catch (error) {
        // Ignore disconnect errors during shutdown
      }
    };
    
    process.on('beforeExit', disconnect);
    process.on('SIGINT', disconnect);
    process.on('SIGTERM', disconnect);
    
    // Also handle uncaught exceptions to prevent connection leaks
    process.on('uncaughtException', async (error) => {
      console.error('[DB] Uncaught exception, disconnecting...', error);
      await disconnect();
    });
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

// Retry wrapper for database operations
// Works without connection pooling by managing connections explicitly
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Ensure connection is active before operation
      // This is critical when connection pooling is not available
      try {
        const isConnected = await checkDatabaseConnection();
        if (!isConnected) {
          // Explicitly connect if not connected
          // This is safe to call multiple times - Prisma handles it
          await db.$connect();
        }
      } catch (connectError) {
        // If connection check fails, try to reconnect
        if (attempt > 1) {
          try {
            await db.$disconnect();
            await db.$connect();
          } catch (reconnectError) {
            // If reconnect fails, continue to operation attempt
            // The operation itself might trigger a reconnect
          }
        }
      }
      
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection error
      const isConnectionError = 
        error?.name === 'PrismaClientInitializationError' || // Prisma client initialization failure
        error?.message?.includes('Connection closed') ||
        error?.message?.includes('Connection terminated') ||
        error?.message?.includes('Connection refused') ||
        error?.message?.includes('Can\'t reach database server') ||
        error?.message?.includes('Can\'t reach database') ||
        error?.code === 'P1001' || // Prisma connection error
        error?.code === 'P1008' || // Prisma operation timeout
        error?.code === 'P1017' || // Prisma server closed connection
        error?.code === 'P1010';   // Prisma connection timeout
      
      if (isConnectionError && attempt < maxRetries) {
        console.warn(`[DB] Connection error on attempt ${attempt}, retrying...`, {
          message: error?.message,
          code: error?.code,
        });
        
        // Disconnect and reconnect to reset connection state
        try {
          await db.$disconnect();
        } catch (disconnectError) {
          // Ignore disconnect errors
        }
        
        // Exponential backoff before retry
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        
        // Try to reconnect before next attempt
        try {
          await db.$connect();
        } catch (reconnectError) {
          // If reconnect fails, continue to next attempt
          // The operation will try again
        }
        
        continue;
      }
      
      // If not a connection error or max retries reached, throw
      throw error;
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

export default db;
export { db };

