/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables used in browser client
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_ANON_KEY?: string // Backward compatibility
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
