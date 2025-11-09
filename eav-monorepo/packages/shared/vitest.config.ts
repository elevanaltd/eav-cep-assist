import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Load .env from monorepo root (2 levels up)
  envDir: '../../',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [react() as any],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],

    // Integration test configuration
    // When VITEST_INTEGRATION=true, only run .integration.test.ts files
    // Otherwise, exclude .integration.test.ts files
    include: process.env.VITEST_INTEGRATION
      ? ['**/*.integration.test.ts']
      : ['**/*.{test,spec}.{ts,tsx}'],
    exclude: process.env.VITEST_INTEGRATION
      ? []
      : ['**/*.integration.test.ts', '**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**', '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*'],

    // CRITICAL: CI detection for conditional env injection (A2)
    // In CI: GitHub Actions overrides VITE_SUPABASE_URL to 127.0.0.1:54321
    // Locally: Use hardcoded localhost credentials
    env: process.env.CI ? {
      // CI: Use GitHub Actions env vars (overridden to local Supabase in workflow)
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
    } : {
      // Local: Hardcoded localhost (from `supabase status`)
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      SUPABASE_URL: 'http://127.0.0.1:54321',
    },

    // Memory optimization (A3): Prevent OOM on GitHub Actions
    // Without this: Vitest spawns workers = CPU cores (often 12+)
    // Each worker + jsdom environment = ~400-600MB
    // 12 workers × 500MB = 6GB → exceeds GitHub Actions 7GB limit → OOM kills
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,      // Limit concurrent test workers
        minThreads: 1,      // Keep at least one thread alive
        singleThread: false // Allow parallelism within limits
      }
    },

    // Extended timeouts for Supabase cleanup (realtime disconnect)
    teardownTimeout: 60000,  // 60s for cleanup (default 10s)
    hookTimeout: 30000,      // 30s for beforeEach/afterEach (default 10s)

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
        'src/test/**',
        'dist/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
