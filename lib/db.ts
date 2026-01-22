import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton
 * 
 * CRITICAL: This singleton pattern prevents connection pool exhaustion.
 * In production, Next.js serverless functions can create new instances on each request
 * if not properly cached, leading to "Too many database connections" errors.
 * 
 * Connection Pool Configuration:
 * Configure via DATABASE_URL query parameters:
 * - ?connection_limit=10&pool_timeout=20&connect_timeout=10
 * 
 * Recommended for production:
 * - connection_limit: 10-20 (depends on database max_connections)
 * - pool_timeout: 20 seconds (time to wait for connection from pool)
 * - connect_timeout: 10 seconds (time to establish new connection)
 * 
 * Example DATABASE_URL:
 * postgresql://user:pass@host:port/db?connection_limit=10&pool_timeout=20&connect_timeout=10&sslmode=require
 * 
 * This protects against:
 * - Network hiccups
 * - Stuck queries
 * - Zombie connections
 * - Rare-but-deadly infra incidents
 */
const prismaClientSingleton = () => {
  return new PrismaClient({
    // Connection pool configuration for production
    // Prevents connection exhaustion
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

// CRITICAL FIX: Cache Prisma client in production to prevent connection pool exhaustion
// Previously only cached in development, causing new instances on every request
const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (!globalThis.prismaGlobal) {
  globalThis.prismaGlobal = db;
}

export default db;
