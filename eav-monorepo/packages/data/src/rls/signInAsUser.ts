/**
 * Sign In As User - Test Helper for RLS Validation
 * Pattern extracted from scripts-web MVP (proven in integration tests)
 *
 * PURPOSE: Authenticate as different users to test RLS policies
 * PATTERN: Sign out → Sign in → Return user ID
 *
 * @example
 * ```typescript
 * // Test admin access
 * const adminId = await signInAsUser(client, 'mock-admin@test.com', 'mock-password')
 * const { data: adminData } = await client.from('projects').select('*')
 *
 * // Test client access
 * const clientId = await signInAsUser(client, 'mock-client@test.com', 'mock-password')
 * const { data: clientData } = await client.from('projects').select('*')
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/index.js'

/**
 * Sign in as user and return user ID
 *
 * Ensures clean auth state by signing out first
 * Throws error if authentication fails
 *
 * @param client - Supabase client instance
 * @param email - User email
 * @param password - User password
 * @returns User ID
 * @throws Error if authentication fails
 */
export async function signInAsUser(
  client: SupabaseClient<Database>,
  email: string,
  password: string
): Promise<string> {
  // Ensure clean state
  await client.auth.signOut()

  // Authenticate
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error('Authentication succeeded but no user returned')
  }

  return data.user.id
}
