/**
 * Auth Test Helpers
 *
 * Utilities for authentication testing with Supabase.
 *
 * Pattern extracted from: /Volumes/HestAI-Projects/eav-ops/eav-apps/scripts-web/src/test/auth-helpers.ts
 * Adapted for: Monorepo with @workspace/shared package
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { testSupabase, TEST_USERS, authDelay, signInAsTestUser, SUPABASE_CONFIG } from './supabase-test-client'

// Re-export for convenience
export { authDelay, TEST_USERS, SUPABASE_CONFIG, testSupabase, signInAsTestUser }

/**
 * Sign in as admin test user
 * Convenience wrapper for common test scenario
 */
export async function signInAsAdmin(client: SupabaseClient = testSupabase): Promise<string> {
  return signInAsTestUser(client, 'admin')
}

/**
 * Sign in as client test user
 * Convenience wrapper for common test scenario
 */
export async function signInAsClient(client: SupabaseClient = testSupabase): Promise<string> {
  return signInAsTestUser(client, 'client')
}

/**
 * Sign in as unauthorized test user
 * Convenience wrapper for testing access control
 */
export async function signInAsUnauthorized(client: SupabaseClient = testSupabase): Promise<string> {
  return signInAsTestUser(client, 'unauthorized')
}

/**
 * Sign out from test client
 * Includes rate limit protection
 */
export async function signOut(client: SupabaseClient = testSupabase): Promise<void> {
  await authDelay()
  await client.auth.signOut()
}

/**
 * Get current session user ID
 * Returns null if no active session
 */
export async function getCurrentUserId(client: SupabaseClient = testSupabase): Promise<string | null> {
  const { data: { session } } = await client.auth.getSession()
  return session?.user?.id ?? null
}

/**
 * Assert user is authenticated
 * Throws error if no active session
 */
export async function assertAuthenticated(client: SupabaseClient = testSupabase): Promise<string> {
  const userId = await getCurrentUserId(client)
  if (!userId) {
    throw new Error('Expected user to be authenticated, but no session found')
  }
  return userId
}

/**
 * Assert user is NOT authenticated
 * Throws error if active session exists
 */
export async function assertNotAuthenticated(client: SupabaseClient = testSupabase): Promise<void> {
  const userId = await getCurrentUserId(client)
  if (userId) {
    throw new Error(`Expected no authentication, but found session for user: ${userId}`)
  }
}

/**
 * Get test user by email
 * Useful for assertions about user identity
 */
export function getTestUserByEmail(email: string) {
  const entry = Object.entries(TEST_USERS).find(([_, user]) => user.email === email)
  if (!entry) {
    throw new Error(`No test user found with email: ${email}`)
  }
  return { type: entry[0] as keyof typeof TEST_USERS, ...entry[1] }
}

/**
 * Create a fresh auth context for tests
 * Ensures clean state by signing out first
 */
export async function withFreshAuthContext<T>(
  client: SupabaseClient,
  userType: keyof typeof TEST_USERS,
  callback: (userId: string) => Promise<T>
): Promise<T> {
  // Sign out first for clean state
  await signOut(client)

  // Sign in as specified user
  const userId = await signInAsTestUser(client, userType)

  try {
    // Execute test callback
    return await callback(userId)
  } finally {
    // Always sign out after test
    await signOut(client)
  }
}

/**
 * Test helper: Execute callback with admin user
 */
export async function asAdmin<T>(
  callback: (userId: string) => Promise<T>,
  client: SupabaseClient = testSupabase
): Promise<T> {
  return withFreshAuthContext(client, 'admin', callback)
}

/**
 * Test helper: Execute callback with client user
 */
export async function asClient<T>(
  callback: (userId: string) => Promise<T>,
  client: SupabaseClient = testSupabase
): Promise<T> {
  return withFreshAuthContext(client, 'client', callback)
}

/**
 * Test helper: Execute callback with unauthorized user
 */
export async function asUnauthorized<T>(
  callback: (userId: string) => Promise<T>,
  client: SupabaseClient = testSupabase
): Promise<T> {
  return withFreshAuthContext(client, 'unauthorized', callback)
}
