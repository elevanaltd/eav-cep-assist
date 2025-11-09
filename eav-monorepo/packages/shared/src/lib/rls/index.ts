/**
 * RLS Module - Row Level Security Utilities
 * Phase 2 Day 4: Production-ready RLS patterns from scripts-web MVP
 *
 * Proven patterns for:
 * - Client-filtered queries with InitPlan optimization (<50ms performance)
 * - RLS policy testing across roles (admin/client/unauthorized)
 * - Performance benchmarking and measurement
 * - Auth rate limit protection for tests
 *
 * @example
 * ```typescript
 * import { buildClientQuery, measureQueryTime, testRLSPolicy } from '@elevanaltd/shared-lib/rls'
 *
 * // Build optimized client query
 * const query = buildClientQuery(supabase, 'projects', userId)
 * const { data } = await query.select('*')
 *
 * // Measure performance
 * const { result, timeMs } = await measureQueryTime(async () => {
 *   return await supabase.from('comments').select('*')
 * })
 *
 * // Test RLS policies
 * const results = await testRLSPolicy(supabase, {
 *   table: 'projects',
 *   roles: { admin: { email: 'mock-admin@test.com', password: 'mock-password' } },
 *   expectations: { admin: { canRead: true, canWrite: true } }
 * })
 * ```
 */

// Query builders with InitPlan optimization
export { buildClientQuery } from './buildClientQuery.js'
export type { BuildClientQueryOptions } from './buildClientQuery.js'

// Performance measurement
export { measureQueryTime } from './measureQueryTime.js'

// Auth utilities for testing
export { createAuthDelay } from './createAuthDelay.js'
export { signInAsUser } from './signInAsUser.js'

// RLS policy testing
export { testRLSPolicy } from './testRLSPolicy.js'
export type {
  RoleCredentials,
  RoleExpectations,
  TestRLSPolicyConfig,
  RLSPolicyTestResult,
  RLSPolicyTestResults,
} from './testRLSPolicy.js'
