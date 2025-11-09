/**
 * Supabase Test Client
 *
 * Provides test-specific Supabase client with environment-aware configuration.
 *
 * **Environment Strategy:**
 * - CI: Uses Supabase preview branch (auto-created per PR via GitHub integration)
 * - Local: Uses local Supabase instance (supabase start on port 54321)
 * - Fallback: Remote Supabase (for emergency manual testing only)
 *
 * **Preview Branch Benefits:**
 * - Isolated per PR (no test interference between PRs)
 * - Real RLS policies (validates actual security)
 * - Real realtime (validates subscriptions)
 * - Real migrations (validates schema changes)
 * - Auto cleanup (preview branch deleted on PR merge)
 *
 * **Local Development:**
 * - Run `supabase start` to spin up local instance
 * - Tests use 127.0.0.1:54321 automatically (undici localhost fix)
 * - Fast iteration without network latency
 *
 * **Test Users:**
 * Uses test users created via Auth Admin API (scripts/create-test-users-via-api.mjs)
 *
 * Pattern extracted from: /Volumes/HestAI-Projects/eav-ops/eav-apps/scripts-web/src/test/supabase-test-client.ts
 * Adapted for: Monorepo with @workspace/shared package
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types.js'

// Environment-aware Supabase URL
// Priority: Preview branch (CI) > Local (dev) > Remote (fallback)
// NOTE: Use 127.0.0.1 instead of localhost to avoid Node.js v22 + undici@5.29.0 fetch failures
// See: https://github.com/nodejs/undici/issues/2219
const SUPABASE_URL =
  process.env.SUPABASE_PREVIEW_URL || // CI: Preview branch
  (typeof window === 'undefined' ? 'http://127.0.0.1:54321' : undefined) || // Local: 127.0.0.1 (undici fix)
  import.meta.env.VITE_SUPABASE_URL || // Fallback: Remote
  'http://127.0.0.1:54321' // Ultimate fallback (undici fix)

// Environment-aware anon key
// For local development, use the key from `supabase status`
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_PREVIEW_ANON_KEY || // CI: Preview branch key
  process.env.SUPABASE_ANON_KEY || // Local: From .env
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || // Fallback: Remote
  import.meta.env.VITE_SUPABASE_ANON_KEY || // Alternative fallback
  // ggignore: This is the well-known public anon key for local Supabase (supabase/supabase default)
  // NOT a production secret - safe for test fixtures and local development
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' // Local Supabase default anon key

// Service role key for test infrastructure
// BYPASSES RLS - use only for test fixture creation
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_PREVIEW_SERVICE_ROLE_KEY || // CI: Preview branch service key
  process.env.SUPABASE_SERVICE_ROLE_KEY || // Local: From environment
  // ggignore: This is the well-known public service_role key for local Supabase (supabase/supabase default)
  // NOT a production secret - safe for test fixtures and local development
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU' // Local Supabase default service key

/**
 * Fail-Fast Guard: Detect CI Misconfiguration
 *
 * **Issue**: Environment overrides (e.g., hardcoded URLs in package.json) can silently
 * break CI preview branch connection, causing tests to hang for 50+ minutes.
 *
 * **Solution**: Explicit validation that catches misconfigurations immediately.
 *
 * **Detection Logic**:
 * - If SUPABASE_PREVIEW_URL is set (CI environment)
 * - But resolved SUPABASE_URL contains 127.0.0.1 (localhost)
 * - Then package.json or another override is blocking preview connection
 *
 * **Impact**: Prevents silent regressions where future hardcoding causes CI hangs.
 */
if (process.env.SUPABASE_PREVIEW_URL && SUPABASE_URL.includes('127.0.0.1')) {
  throw new Error(
    'CI MISCONFIGURATION: SUPABASE_PREVIEW_URL is set but resolved URL is localhost. ' +
    'This indicates an environment override (likely in package.json) is preventing preview branch connection. ' +
    `Expected: ${process.env.SUPABASE_PREVIEW_URL}, Got: ${SUPABASE_URL}`
  )
}

/**
 * Supabase configuration for tests
 * Exported for tests that need direct access to URL/key
 */
export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
}

/**
 * Test Supabase client (authenticated user context)
 * Automatically uses preview branch (CI) or localhost (local dev)
 *
 * USAGE: Business logic tests that need authenticated context
 * ENFORCES: RLS policies (when not using service role)
 */
export const testSupabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)

/**
 * Service role client for test infrastructure
 *
 * USAGE: Test fixture creation (scripts, projects, test data)
 * BYPASSES: RLS policies (intentional - avoids circular dependency blocker)
 *
 * NOTE: Business logic tests use authenticated client (testSupabase) for capability-config validation
 * RLS validation deferred to dedicated test suite (see RLS-VALIDATION.md)
 *
 * BLOCKER CONTEXT: RLS circular dependency in user_accessible_scripts view
 * - Comment INSERT → Scripts FK → Scripts RLS → user_accessible_scripts → Scripts query → RLS (LOOP)
 * - Fix: Migration 20251102_fix_rls_circular_dependency.sql (parallel track)
 * - Workaround: Service role for fixtures only (standard testing practice)
 *
 * @returns Supabase client with service role (bypasses RLS)
 */
export function getServiceClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

/**
 * Authenticated client for business logic tests
 *
 * USAGE: Capability-config validation, business logic correctness
 * ENFORCES: RLS policies (when authenticated user context exists)
 *
 * NOTE: Currently same as testSupabase, provided for semantic clarity
 * Future: May diverge if different auth contexts needed
 *
 * @returns Supabase client with anon key (enforces RLS when authenticated)
 */
export function getTestClient(): SupabaseClient<Database> {
  return testSupabase
}

/**
 * Test user credentials
 *
 * Created via Auth Admin API (scripts/create-test-users-via-api.mjs)
 * Protocol: SUPABASE_PREVIEW_TESTING (monorepo adaptation)
 */
export const TEST_USERS = {
  admin: {
    email: 'admin.test@example.com',
    password: 'test-password-admin-123',
  },
  client: {
    email: 'client.test@example.com',
    password: 'test-password-client-123',
  },
  unauthorized: {
    email: 'unauthorized.test@example.com',
    password: 'test-password-unauth-123',
  },
} as const

/**
 * Rate limit protection for auth operations
 * Supabase has auth rate limits, this prevents test failures
 */
let lastAuthTime = 0
const MIN_AUTH_DELAY_MS = 750

export async function authDelay() {
  const now = Date.now()
  const timeSinceLastAuth = now - lastAuthTime
  if (timeSinceLastAuth < MIN_AUTH_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_AUTH_DELAY_MS - timeSinceLastAuth))
  }
  lastAuthTime = Date.now()
}

/**
 * Sign in as test user with rate limit protection
 */
export async function signInAsTestUser(
  client: SupabaseClient,
  userType: keyof typeof TEST_USERS
): Promise<string> {
  await authDelay()

  // Sign out first to clear any existing session
  await client.auth.signOut()
  await authDelay()

  const { email, password } = TEST_USERS[userType]
  const { data, error } = await client.auth.signInWithPassword({ email, password })

  if (error) {
    throw new Error(`Failed to sign in as ${userType}: ${error.message}`)
  }

  if (!data.user) {
    throw new Error(`No user returned for ${userType}`)
  }

  return data.user.id
}

/**
 * Clean up test data
 * Safe to use in preview branches (isolated per PR)
 */
export async function cleanupTestData(_client: SupabaseClient<Database>) {
  // Clean script_locks table (if exists)
  // TODO: Uncomment when script_locks table is added to database schema
  // await _client.from('script_locks').delete().neq('script_id', '')

  // Note: Preview branches are ephemeral, so cleanup is optional
  // but good practice for local testing
}

/**
 * Log current environment for debugging
 */
export function logTestEnvironment() {
  console.log('Test Environment:', {
    url: SUPABASE_URL,
    isPreviewBranch: !!process.env.SUPABASE_PREVIEW_URL,
    isLocal: SUPABASE_URL.includes('127.0.0.1') || SUPABASE_URL.includes('localhost'),
    isRemote: !SUPABASE_URL.includes('127.0.0.1') && !SUPABASE_URL.includes('localhost') && !process.env.SUPABASE_PREVIEW_URL,
  })
}
