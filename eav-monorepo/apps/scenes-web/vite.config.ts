import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(() => {
  // Load env file based on `mode` in the current working directory

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor libraries
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-router': ['react-router-dom'],
            'vendor-utils': ['zod']
          }
        }
      },
      chunkSizeWarningLimit: 500
    },
    server: {
      port: 3002,
      host: true
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/tests/archive/**'
      ],

      // Memory optimization: Limit worker threads to prevent RAM exhaustion
      pool: 'threads',
      poolOptions: {
        threads: {
          maxThreads: 4,
          minThreads: 1,
          singleThread: false
        }
      },

      // Conditional Supabase configuration
      env: process.env.CI ? {
        // CI: Use GitHub Actions environment variables
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      } : {
        // Local: Use production Supabase (same as scripts-web for shared data)
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      }
    }
  }
})
