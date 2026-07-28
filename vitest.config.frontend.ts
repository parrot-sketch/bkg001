import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'tests/frontend/**/*.test.ts',
      'tests/frontend/**/*.test.tsx',
      'tests/frontend/**/*.spec.ts',
      'tests/frontend/**/*.spec.tsx',
      '__tests__/**/*.test.tsx',
      '__tests__/**/*.spec.tsx',
    ],
    exclude: ['node_modules/**', '**/node_modules/**'],
    setupFiles: ['./tests/frontend/setup/test-setup.ts'],
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
