/**
 * Test RLS Policy - Integration Test Helper
 * Pattern extracted from scripts-web MVP (proven RLS validation)
 *
 * PURPOSE: Validate RLS policies across multiple roles
 * PATTERN: Sign in as each role → Test read/write access → Compare with expectations
 *
 * @example
 * ```typescript
 * const results = await testRLSPolicy(client, {
 *   table: 'projects',
 *   roles: {
 *     admin: { email: 'mock-admin@test.com', password: 'mock-password' },
 *     client: { email: 'mock-client@test.com', password: 'mock-password' }
 *   },
 *   expectations: {
 *     admin: { canRead: true, canWrite: true },
 *     client: { canRead: true, canWrite: false }
 *   }
 * })
 *
 * console.log(results.admin.canRead) // true
 * console.log(results.client.canWrite) // false
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/index.js'
import { signInAsUser } from './signInAsUser.js'

export interface RoleCredentials {
  email: string
  password: string
}

export interface RoleExpectations {
  canRead: boolean
  canWrite: boolean
}

export interface TestRLSPolicyConfig {
  table: string
  roles: Record<string, RoleCredentials>
  expectations: Record<string, RoleExpectations>
}

export interface RLSPolicyTestResult {
  canRead: boolean
  canWrite: boolean
  readError?: string
  writeError?: string
}

export type RLSPolicyTestResults = Record<string, RLSPolicyTestResult>

/**
 * Test RLS policy against multiple roles
 *
 * Validates read and write access for each role
 * Returns detailed results including any errors
 *
 * @param client - Supabase client instance
 * @param config - Test configuration with roles and expectations
 * @returns Results for each role
 */
export async function testRLSPolicy(
  client: SupabaseClient<Database>,
  config: TestRLSPolicyConfig
): Promise<RLSPolicyTestResults> {
  const results: RLSPolicyTestResults = {}

  for (const [roleName, credentials] of Object.entries(config.roles)) {
    try {
      // Sign in as this role
      await signInAsUser(client, credentials.email, credentials.password)

      // Test read access
      const readResult = await client
        .from(config.table as keyof Database['public']['Tables'])
        .select('*')
        .limit(1)

      const canRead = !readResult.error && readResult.data !== null
      const readError = readResult.error?.message

      // Test write access (attempt insert)
      // Note: Using Record<string, unknown> for generic test insert
      const testInsert: Record<string, unknown> = { test: true }

      const writeResult = await client
        .from(config.table as keyof Database['public']['Tables'])
        .insert(testInsert)
      const canWrite = !writeResult.error
      const writeError = writeResult.error?.message

      results[roleName] = {
        canRead,
        canWrite,
        readError,
        writeError,
      }
    } catch (error) {
      results[roleName] = {
        canRead: false,
        canWrite: false,
        readError: error instanceof Error ? error.message : 'Unknown error',
        writeError: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Clean up auth state
  await client.auth.signOut()

  return results
}
