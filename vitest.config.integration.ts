import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest config for INTEGRATION tests.
 *
 * ─ Requires a running Postgres database (Docker or local)
 * ─ Uses TEST_DATABASE_URL (falls back to DATABASE_URL)
 * ─ Runs DB reset between tests for isolation
 *
 * Matches: tests/integration/**  (excluding the in-memory scheduling test)
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      // This test uses FakeAppointmentRepository, not a real DB
      'tests/integration/appointment-scheduling.test.ts',
    ],
    setupFiles: ['./tests/vitest.setup.integration.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/dist/',
      ],
    },
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, './domain'),
      '@': path.resolve(__dirname, './'),
    },
  },
});
