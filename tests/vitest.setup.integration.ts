/**
 * Vitest Setup — INTEGRATION tests
 *
 * Full setup: custom matchers + database lifecycle management.
 * Requires a running Postgres instance (Docker or local).
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import { resetTestDatabase, closeTestDatabase } from './setup/test-database';
import { setupCustomMatchers } from './utils/matchers';

setupCustomMatchers();

beforeAll(async () => {
  console.log('\n🧪 Integration test environment initializing...\n');
});

afterAll(async () => {
  await closeTestDatabase();
  console.log('\n✓ Integration test environment cleaned up\n');
});

afterEach(async () => {
  try {
    await resetTestDatabase();
  } catch (error) {
    console.warn('⚠ Database reset between tests failed:', error);
  }
});
