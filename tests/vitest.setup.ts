/**
 * Vitest Setup File
 * 
 * Configures the test environment, sets up custom matchers,
 * and defines global test fixtures.
 * 
 * This file is automatically loaded by Vitest before running tests.
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import { resetTestDatabase, closeTestDatabase } from './setup/test-database';
import { setupCustomMatchers } from './utils/matchers';

/**
 * Setup custom matchers
 */
setupCustomMatchers();

/**
 * Global before hook: Initialize test environment
 */
beforeAll(async () => {
  console.log('\n🧪 Test environment initializing...\n');
});

/**
 * Global after hook: Clean up test environment
 */
afterAll(async () => {
  await closeTestDatabase();
  console.log('\n✓ Test environment cleaned up\n');
});

/**
 * Global afterEach hook: Reset database between tests
 */
afterEach(async () => {
  try {
    await resetTestDatabase();
  } catch (error) {
    console.warn('⚠ Database reset between tests failed:', error);
  }
});
