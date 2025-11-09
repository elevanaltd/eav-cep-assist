import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // setupFiles removed - had React dependencies (moved to @workspace/ui)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'dist/**',
        '**/*.config.*',
        '**/*.test.ts',
        '**/*.integration.test.ts',
        '**/test/**',
      ],
    },
  },
})
