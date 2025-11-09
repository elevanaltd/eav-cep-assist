// Re-export test infrastructure
export { testSupabase, SUPABASE_CONFIG, TEST_USERS } from './supabase-test-client.js';
export { signInAsAdmin, signInAsClient, signOut, authDelay } from './auth-helpers'
export { mockProject, mockScript, resetFactoryIds } from './factories'
export { createDualClientTestHarness, createTriClientTestHarness } from './dual-client-harness'
export type { DualClientTestHarness, TriClientTestHarness } from './dual-client-harness'
