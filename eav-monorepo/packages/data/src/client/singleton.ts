import { createBrowserClient } from './browser.js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types.js'

/**
 * Singleton Supabase Client
 *
 * PROBLEM: Multiple GoTrueClient instances detected in browser context
 * CAUSE: Each createBrowserClient() call creates separate auth instance
 * SOLUTION: Single shared instance across all @workspace/shared modules
 *
 * IMPACT:
 * - Prevents auth state conflicts (competing GoTrueClient instances)
 * - Prevents storage key collisions (localStorage conflicts)
 * - Prevents memory leaks (duplicate subscription instances)
 */

// Singleton instance - created once, shared across all modules
let instance: SupabaseClient<Database> | null = null

/**
 * Get shared Supabase client instance
 *
 * Creates client on first call, returns cached instance on subsequent calls.
 * Ensures single GoTrueClient instance across all @workspace/shared modules.
 *
 * USAGE:
 * ```typescript
 * // Before (WRONG - creates multiple instances):
 * const supabase = createBrowserClient()
 *
 * // After (CORRECT - uses singleton):
 * const supabase = getSupabaseClient()
 * ```
 *
 * @returns Shared Supabase client
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!instance) {
    instance = createBrowserClient()
  }
  return instance
}

/**
 * Reset singleton (TEST ONLY - do not use in production code)
 *
 * Allows test isolation by resetting singleton state between tests.
 *
 * @internal
 */
export function __resetSupabaseClient(): void {
  instance = null
}
