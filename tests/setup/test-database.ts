/**
 * Test Database Configuration
 * 
 * Provides a test database instance for testing.
 * 
 * SAFETY: This module refuses to connect to production databases.
 * It requires TEST_DATABASE_URL or a clearly-local DATABASE_URL.
 * 
 * Usage in tests:
 *   import { getTestDatabase } from './tests/setup/test-database';
 *   const db = getTestDatabase();
 *   const users = await db.user.findMany();
 */

import { PrismaClient } from '@prisma/client';

let testClient: PrismaClient | null = null;

/**
 * Check if a database URL looks like a production/remote database.
 * Blocks connections to Aiven, Supabase, Neon, AWS RDS, and other cloud providers.
 */
function isProductionUrl(url: string): boolean {
  const productionPatterns = [
    'aivencloud.com',
    'supabase.co',
    'neon.tech',
    'amazonaws.com',
    'azure.com',
    'digitalocean.com',
    'render.com',
    'railway.app',
    'planetscale.com',
    'cockroachlabs.cloud',
    'nairobisculpt',
    'nsac.co.ke',
  ];
  const lower = url.toLowerCase();
  return productionPatterns.some((pattern) => lower.includes(pattern));
}

/**
 * Get or create the test database client
 * Uses TEST_DATABASE_URL from environment, or falls back to dev DATABASE_URL.
 * 
 * SAFETY: Throws an error if the resolved URL points to a production database.
 * 
 * @returns Configured PrismaClient for testing
 */
export function getTestDatabase(): PrismaClient {
  if (!testClient) {
    const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

    // ── PRODUCTION SAFETY GUARD ──────────────────────────────────────
    if (dbUrl && isProductionUrl(dbUrl)) {
      throw new Error(
        `🚨 REFUSING TO RUN TESTS AGAINST PRODUCTION DATABASE!\n` +
        `   Detected production-like DATABASE_URL.\n` +
        `   Set TEST_DATABASE_URL to a local/test database, or ensure\n` +
        `   DATABASE_URL points to localhost/docker.\n` +
        `   Blocked URL pattern found in: ${dbUrl.substring(0, 40)}…`
      );
    }
    // ─────────────────────────────────────────────────────────────────

    testClient = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  }
  return testClient;
}

/**
 * Reset the test database to a clean state
 * This should be called before each test suite
 * 
 * @returns Promise that resolves when database is reset
 */
export async function resetTestDatabase(): Promise<void> {
  const db = getTestDatabase();

  try {
    // Delete in dependency order (reverse of creation)
    await db.appointment.deleteMany({});
    await db.consultation.deleteMany({});
    await db.availabilitySlot.deleteMany({});
    await db.availabilityTemplate.deleteMany({});
    await db.slotConfiguration.deleteMany({});
    await db.doctor.deleteMany({});
    await db.patient.deleteMany({});
    await db.user.deleteMany({});

    console.log('✓ Test database reset successful');
  } catch (error) {
    console.error('✗ Failed to reset test database:', error);
    throw error;
  }
}

/**
 * Close database connection
 * Call this after all tests complete
 * 
 * @returns Promise that resolves when connection is closed
 */
export async function closeTestDatabase(): Promise<void> {
  if (testClient) {
    await testClient.$disconnect();
    testClient = null;
  }
}

/**
 * Disconnect from test database without resetting
 * Used between test runs
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (testClient) {
    await testClient.$disconnect();
    testClient = null;
  }
}
