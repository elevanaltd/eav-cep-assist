/**
 * Dual-Client Test Harness
 *
 * **Purpose:** Realistic multi-user realtime testing
 *
 * **Problem Solved:**
 * Production uses separate browser sessions (separate Supabase client instances per user).
 * Tests that simulate multi-user scenarios by switching auth on a single client don't match
 * production reality because:
 * - Realtime subscriptions detect the auth switch
 * - Hook sees 'current user' changed (not 'other user' acquired lock)
 *
 * **Solution:**
 * Create separate Supabase client instances for concurrent users, each with independent
 * auth sessions. This matches production architecture:
 * - Production: User A (browser 1, client A) + User B (browser 2, client B)
 * - Test: User A (clientA) + User B (clientB)
 *
 * **Usage Example:**
 * ```typescript
 * const harness = await createDualClientTestHarness()
 * 
 * // Admin client acquires lock
 * const { result: adminResult } = renderHook(() => 
 *   useScriptLock(TEST_SCRIPT_ID, harness.adminClient)
 * )
 * 
 * // Client client sees lock held by admin (separate client instance)
 * const { result: clientResult } = renderHook(() => 
 *   useScriptLock(TEST_SCRIPT_ID, harness.clientClient)
 * )
 * 
 * // Cleanup
 * await harness.cleanup()
 * ```
 *
 * **Pattern:** Reusable for any realtime multi-user scenario test
 *
 * @see Issue: TEST-INFRA: Build dual-client test harness for realtime multi-user scenarios
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/types/database.types.js'
import { SUPABASE_CONFIG, TEST_USERS, authDelay, cleanupTestData } from './supabase-test-client.js'

/**
 * Dual-client test harness
 * Provides separate Supabase clients for admin and client users
 */
export interface DualClientTestHarness {
  /** Admin user's Supabase client (independent auth session) */
  adminClient: SupabaseClient<Database>
  
  /** Client user's Supabase client (independent auth session) */
  clientClient: SupabaseClient<Database>
  
  /** Admin user ID (from authenticated session) */
  adminUserId: string
  
  /** Client user ID (from authenticated session) */
  clientUserId: string
  
  /** Cleanup function - removes channels and signs out both clients */
  cleanup: () => Promise<void>
}

/**
 * Create dual-client test harness for multi-user realtime scenarios
 *
 * **Architecture:**
 * - Creates two separate Supabase client instances
 * - Each client has independent auth session (admin vs client)
 * - Realtime channels are isolated per client
 * - Matches production topology (separate browsers)
 *
 * **Lifecycle:**
 * 1. Create two client instances with same URL/key
 * 2. Authenticate each client independently
 * 3. Return harness with both clients + cleanup function
 * 4. Tests use clients for concurrent user scenarios
 * 5. Cleanup removes channels and signs out
 *
 * @returns Harness with adminClient, clientClient, and cleanup function
 */
export async function createDualClientTestHarness(): Promise<DualClientTestHarness> {
  // Create separate client instances (simulates separate browsers)
  const adminClient = createClient<Database>(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
      // Persist to memory only (avoid localStorage conflicts in tests)
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const clientClient = createClient<Database>(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
      // Persist to memory only (avoid localStorage conflicts in tests)
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  // Authenticate admin client
  await authDelay()
  const { data: adminAuth, error: adminError } = await adminClient.auth.signInWithPassword({
    email: TEST_USERS.admin.email,
    password: TEST_USERS.admin.password,
  })

  if (adminError || !adminAuth.user) {
    throw new Error(`Failed to authenticate admin client: ${adminError?.message}`)
  }

  // Authenticate client client (with rate limit protection)
  await authDelay()
  const { data: clientAuth, error: clientError } = await clientClient.auth.signInWithPassword({
    email: TEST_USERS.client.email,
    password: TEST_USERS.client.password,
  })

  if (clientError || !clientAuth.user) {
    throw new Error(`Failed to authenticate client client: ${clientError?.message}`)
  }

  // Cleanup function - call at end of test
  const cleanup = async () => {
    // Parallelize independent operations for better performance
    await Promise.all([
      // Clean up test data (can run in parallel)
      cleanupTestData(adminClient),
      cleanupTestData(clientClient),
      // Remove all realtime channels (can run in parallel)
      adminClient.removeAllChannels(),
      clientClient.removeAllChannels(),
    ])

    // Sign out sequentially (requires rate limiting)
    await authDelay()
    await adminClient.auth.signOut()
    await authDelay()
    await clientClient.auth.signOut()
  }

  return {
    adminClient,
    clientClient,
    adminUserId: adminAuth.user.id,
    clientUserId: clientAuth.user.id,
    cleanup,
  }
}

/**
 * Tri-client test harness for scenarios requiring third user
 * 
 * **Use Cases:**
 * - Admin observing two users
 * - Chain of lock ownership transfers
 * - Complex multi-user realtime scenarios
 *
 * **Note on cleanup:** The returned cleanup function handles all three clients.
 * It extends (not replaces) the dual-client cleanup by adding unauthorized client cleanup
 * first, then calling the original dual-client cleanup. Always use the cleanup function
 * from the harness you created (tri-client cleanup cleans all 3 clients).
 *
 * @returns Harness with adminClient, clientClient, unauthorizedClient, and cleanup function
 */
export interface TriClientTestHarness extends DualClientTestHarness {
  /** Unauthorized user's Supabase client (independent auth session) */
  unauthorizedClient: SupabaseClient<Database>
  
  /** Unauthorized user ID (from authenticated session) */
  unauthorizedUserId: string
  
  /** 
   * Cleanup function - removes channels and signs out all THREE clients
   * (unauthorized, then admin and client via dual-harness cleanup)
   */
  cleanup: () => Promise<void>
}

export async function createTriClientTestHarness(): Promise<TriClientTestHarness> {
  // Create dual-client harness first
  const dualHarness = await createDualClientTestHarness()

  // Create third client for unauthorized user
  const unauthorizedClient = createClient<Database>(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  // Authenticate unauthorized client
  await authDelay()
  const { data: unauthorizedAuth, error: unauthorizedError } = await unauthorizedClient.auth.signInWithPassword({
    email: TEST_USERS.unauthorized.email,
    password: TEST_USERS.unauthorized.password,
  })

  if (unauthorizedError || !unauthorizedAuth.user) {
    throw new Error(`Failed to authenticate unauthorized client: ${unauthorizedError?.message}`)
  }

  // Extended cleanup function
  const cleanup = async () => {
    // Parallelize independent operations
    await Promise.all([
      // Clean up test data (can run in parallel)
      cleanupTestData(unauthorizedClient),
      // Remove all realtime channels (can run in parallel)
      unauthorizedClient.removeAllChannels(),
    ])

    // Sign out unauthorized client (with rate limiting)
    await authDelay()
    await unauthorizedClient.auth.signOut()

    // Call original cleanup (handles admin and client)
    await dualHarness.cleanup()
  }

  return {
    ...dualHarness,
    unauthorizedClient,
    unauthorizedUserId: unauthorizedAuth.user.id,
    cleanup,
  }
}
