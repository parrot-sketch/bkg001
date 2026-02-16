import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Default vitest config — delegates to UNIT config.
 *
 * Use explicit configs for other tiers:
 *   pnpm test                → unit tests (this config)
 *   pnpm test:integration    → integration tests (vitest.config.integration.ts)
 *
 * See TESTING.md for the full testing strategy.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/infrastructure/**/*.test.ts',
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
