import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '')

  return {
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // CRITICAL FIX: Extract @workspace/shared to prevent context duplication across lazy chunks
          // Without this, AuthContext gets bundled separately in index.js AND TipTapEditor chunk
          // causing "useAuth must be used within AuthProvider" errors in production
          // Check for both node_modules path and pnpm workspace path
          if (id.includes('@workspace/shared') || id.includes('/packages/shared/')) {
            return 'vendor-shared';
          }
          // Vendor libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('@tiptap/react') || id.includes('@tiptap/starter-kit') ||
              id.includes('@tiptap/extension-collaboration') || id.includes('@tiptap/extension-collaboration-cursor')) {
            return 'vendor-editor';
          }
          if (id.includes('@supabase/supabase-js')) {
            return 'vendor-supabase';
          }
          if (id.includes('react-router-dom')) {
            return 'vendor-router';
          }
          if (id.includes('zod') || id.includes('dompurify') || id.includes('yjs')) {
            return 'vendor-utils';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500
  },
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api/smartsuite': {
        target: 'https://app.smartsuite.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/smartsuite/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Add SmartSuite headers for development
            const apiKey = env.VITE_SMARTSUITE_API_KEY || '';

            // Debug: Log API key status (not the key itself)
            if (!apiKey) {
              console.error('[Dev Proxy] WARNING: No API key found!');
            } else {
              console.log('[Dev Proxy] API key loaded');
            }

            proxyReq.setHeader('Authorization', `Token ${apiKey}`);
            proxyReq.setHeader('ACCOUNT-ID', 's3qnmox1');
            proxyReq.setHeader('Content-Type', 'application/json');

            // Log the request for debugging
            console.log(`[Dev Proxy] ${req.method} ${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(`[Dev Proxy Response] ${proxyRes.statusCode} for ${req.url}`);
          });
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,

    // Memory optimization: Limit worker threads to prevent RAM exhaustion
    // Without this, Vitest spawns workers equal to CPU cores (often 12+)
    // Each worker + jsdom environment = ~400-600MB
    // See: coordination/planning-docs/005-VITEST-MEMORY-OPTIMIZATION.md
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,      // Limit concurrent test workers
        minThreads: 1,      // Keep at least one thread alive
        singleThread: false // Allow parallelism within limits
      }
    },

    // Conditional Supabase configuration:
    // - CI: Use production Supabase (env vars from GitHub Actions)
    // - Local: Use local Supabase Docker (isolated testing with seed data)
    // Run `supabase start` before running tests locally
    env: process.env.CI ? {
      // CI: Use GitHub Actions environment variables (production Supabase)
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      VITE_SMARTSUITE_API_KEY: process.env.VITE_SMARTSUITE_API_KEY,
      VITE_SMARTSUITE_WORKSPACE_ID: process.env.VITE_SMARTSUITE_WORKSPACE_ID,
      VITE_SMARTSUITE_PROJECTS_TABLE: process.env.VITE_SMARTSUITE_PROJECTS_TABLE,
      VITE_SMARTSUITE_VIDEOS_TABLE: process.env.VITE_SMARTSUITE_VIDEOS_TABLE,
    } : {
      // Local: Use local Supabase Docker instance (seeded via supabase/seed.sql)
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
    },

    // Coverage configuration (universal-test-engineer: 90% minimum threshold)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      reportOnFailure: true, // Generate coverage even when tests fail
      exclude: [
        'node_modules/',
        'src/test/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'src/vite-env.d.ts',
        '*.config.{ts,js}',
        'dist/',
        '.backup-temp/**'
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90
      }
    }
  }
  }
})