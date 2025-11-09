import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/index.js'

/**
 * Creates browser-safe Supabase client using publishable key (RLS-enforced)
 *
 * Supports dependency injection for test environments while maintaining
 * production behavior using environment variables.
 *
 * Environment Variables (Optional when parameters provided):
 * - VITE_SUPABASE_URL: Supabase project URL
 * - VITE_SUPABASE_PUBLISHABLE_KEY: Client-side publishable key (or VITE_SUPABASE_ANON_KEY for backward compatibility)
 *
 * Security: Uses publishable key only (RLS policies enforced, per-user access)
 *
 * @param url - Supabase project URL (optional, defaults to import.meta.env.VITE_SUPABASE_URL)
 * @param key - Supabase publishable key (optional, defaults to import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
 * @returns Configured Supabase client
 * @throws Error if required credentials missing (neither parameters nor environment variables)
 *
 * @example
 * // Production: Use environment variables (no parameters)
 * const supabase = createBrowserClient()
 * const { data } = await supabase.from('scripts').select('*')
 *
 * @example
 * // Test: Override with test credentials
 * const supabase = createBrowserClient(
 *   'https://test-project.supabase.co',
 *   'test-anon-key'
 * )
 */
export function createBrowserClient(url?: string, key?: string): SupabaseClient<Database> {
  const supabaseUrl = url ?? import.meta.env.VITE_SUPABASE_URL
  const supabaseKey =
    key ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY // Backward compat

  if (!supabaseUrl) {
    throw new Error('Missing VITE_SUPABASE_URL environment variable')
  }

  if (!supabaseKey) {
    throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY environment variable')
  }

  return createClient<Database>(supabaseUrl, supabaseKey)
}
