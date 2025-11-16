/**
 * Vitest Configuration
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    // Performance and stability settings
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 2,
        minForks: 1
      }
    },
    watch: false, // Disable watch mode
    isolate: true // Isolate tests
  },
});


