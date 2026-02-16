import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest config for UNIT tests only.
 *
 * ─ No database connection
 * ─ No global afterEach DB reset
 * ─ Runs purely in-memory with mocks / vi.fn()
 *
 * Matches: tests/unit/**  +  tests/infrastructure/**  +  tests/integration/appointment-scheduling*
 * (all of these use fully mocked Prisma / repos — zero real DB calls)
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/infrastructure/**/*.test.ts',
      // appointment-scheduling uses FakeAppointmentRepository (no DB)
      'tests/integration/appointment-scheduling.test.ts',
    ],
    exclude: ['node_modules/**'],
    setupFiles: ['./tests/vitest.setup.unit.ts'],
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
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, './domain'),
      '@': path.resolve(__dirname, './'),
    },
  },
});
