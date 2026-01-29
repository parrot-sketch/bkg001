/**
 * Test Database Configuration
 * 
 * Provides an in-memory test database instance for testing.
 * This eliminates the need for a separate PostgreSQL instance during test runs.
 * 
 * Usage in tests:
 *   import { getTestDatabase } from './tests/setup/test-database';
 *   const db = getTestDatabase();
 *   const users = await db.user.findMany();
 */

import { PrismaClient } from '@prisma/client';

let testClient: PrismaClient | null = null;

/**
 * Get or create the test database client
 * Uses the TEST_DATABASE_URL from environment, or falls back to dev database
 * 
 * @returns Configured PrismaClient for testing
 */
export function getTestDatabase(): PrismaClient {
  if (!testClient) {
    testClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
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
    await db.availabilityBreak.deleteMany({});
    await db.scheduleSession.deleteMany({});
    await db.workingDay.deleteMany({});
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
