import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Global test settings
    globals: true,           // No need to import describe/it/expect
    environment: 'jsdom',    // Browser environment (DOM APIs available)

    // Setup files
    setupFiles: ['./test/helpers/setup.js'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],

      // Include only source files
      include: [
        'js/**/*.js'
      ],

      // Exclude vendor libraries and ExtendScript
      exclude: [
        'js/CSInterface.js',  // Adobe vendor library
        'jsx/**/*.jsx',       // ExtendScript (cannot be tested with Vitest)
        'test/**/*'
      ],

      // Coverage thresholds (start low, increase over time)
      // NOTE: Currently at 0% - Phase 1 baseline. Increase to 50% in Phase 2.
      thresholds: {
        lines: 0,       // TODO Phase 2: Increase to 50%, Target: 70%
        functions: 0,   // TODO Phase 2: Increase to 50%, Target: 70%
        branches: 0,    // TODO Phase 2: Increase to 50%, Target: 70%
        statements: 0   // TODO Phase 2: Increase to 50%, Target: 70%
      }
    },

    // Test file patterns
    include: [
      'test/unit/**/*.test.js',
      'test/integration/**/*.test.js'
    ],

    // Exclude patterns
    exclude: [
      'test/manual/**/*',  // Manual tests (require Premiere Pro)
      'test/fixtures/**/*' // Test data
    ],

    // Test timeout (ExtendScript calls may be slow with mocks)
    testTimeout: 10000
  }
});
