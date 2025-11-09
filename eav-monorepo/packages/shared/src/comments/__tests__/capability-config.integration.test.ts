/**
 * Comment Capabilities Test Matrix (TDD RED State)
 *
 * Purpose: Test all permutations of capability-config pattern BEFORE implementation
 * Status: RED - All tests should FAIL until Week 2 extraction completes
 * Constitutional Authority: North Star I7 (TDD RED discipline)
 *
 * Capability-Config Pattern:
 * - requireAnchors: true/false (scripts-web strict vs cam-op flexible)
 * - enablePositionRecovery: true/false (position recovery logic)
 * - enableTipTapIntegration: true/false (TipTap extension loading)
 *
 * App Configurations:
 * - scripts-web: { requireAnchors: true, enablePositionRecovery: true, enableTipTapIntegration: true }
 * - cam-op-pwa: { requireAnchors: false, enablePositionRecovery: false, enableTipTapIntegration: false }
 *
 * Test Coverage: 8 permutations across 3 capability dimensions
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { testSupabase, getServiceClient } from '../../test/supabase-test-client'
import { signInAsAdmin, authDelay } from '../../test/auth-helpers'
import { createTestScript } from '../../test/factories'

// Service role client for RLS workaround
// See RLS-VALIDATION.md for context on circular dependency blocker
const serviceSupabase = getServiceClient()

// Week 2 GREEN: Import actual implementations (no longer mock declarations)
import { createComment } from '../domain/repository.js'
import type { CommentCapabilities } from '../domain/capabilities.js'
import type { CreateCommentData } from '../domain/types.js'

// Week 2 GREEN: All functions now imported from actual implementations
import { attemptPositionRecovery } from '../domain/positionRecovery.js'
import { loadTipTapExtension } from '../extensions/loadTipTapExtension.js'

// Helper to get current user ID from session
async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await testSupabase.auth.getUser()
  if (error || !user) {
    throw new Error('No authenticated user in session')
  }
  return user.id
}

// ============================================================================
// Test Suite 1: requireAnchors Validation (2 permutations)
// ============================================================================

describe('Comment Capabilities - requireAnchors', () => {
  let adminUserId: string

  beforeEach(async () => {
    await authDelay()
    adminUserId = await signInAsAdmin(testSupabase)
  })

  /**
   * Permutation 1: requireAnchors=true + zero-length anchor → VALIDATION_ERROR
   *
   * Use Case: scripts-web (strict mode)
   * Expected: Reject zero-length anchors to enforce text selection
   * Status: RED (createComment doesn't exist yet)
   */
  it('FAILS when requireAnchors=true and zero-length anchor provided', async () => {
    const testScriptId = await createTestScript()
    const userId = adminUserId // Use stored user ID from beforeEach

    // Week 2 GREEN: createComment now exists with capability validation
    // Using service role to bypass RLS circular dependency
    const result = await createComment(
      serviceSupabase,
      {
        scriptId: testScriptId,
        content: 'Comment requiring anchor',
        startPosition: 0, // Zero-length anchor (invalid when requireAnchors=true)
        endPosition: 0,
      },
      userId,
      { requireAnchors: true, enablePositionRecovery: false, enableTipTapIntegration: false }
    )

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('Text')
  })

  /**
   * Permutation 2: requireAnchors=false + zero-length anchor → SUCCESS
   *
   * Use Case: cam-op-pwa (flexible mode for script-level comments)
   * Expected: Allow zero-length anchors for non-anchored comments
   * Status: RED (createComment doesn't exist yet)
   */
  it('SUCCEEDS when requireAnchors=false and zero-length anchor provided', async () => {
    const testScriptId = await createTestScript()
    const userId = adminUserId // Use stored user ID from beforeEach

    // Week 2 GREEN: createComment now exists with capability validation't exist yet
    const result = await createComment(
      serviceSupabase,
      {
        scriptId: testScriptId,
        content: 'Script-level comment (no anchor)',
        startPosition: 0, // Zero-length anchor (valid when requireAnchors=false)
        endPosition: 0,
      },
      userId,
      { requireAnchors: false, enablePositionRecovery: false, enableTipTapIntegration: false }
    )

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  /**
   * Permutation 3: requireAnchors=true + valid anchor → SUCCESS
   *
   * Use Case: scripts-web with proper text selection
   * Expected: Accept anchored comments with text selection
   * Status: RED (createComment doesn't exist yet)
   */
  it('SUCCEEDS when requireAnchors=true and valid anchor provided', async () => {
    const testScriptId = await createTestScript()
    const userId = adminUserId // Use stored user ID from beforeEach

    // Week 2 GREEN: createComment now exists with capability validation't exist yet
    const result = await createComment(
      serviceSupabase,
      {
        scriptId: testScriptId,
        content: 'Anchored comment',
        startPosition: 10, // Valid anchor (non-zero length)
        endPosition: 25,
        anchorText: 'selected text',
      },
      userId,
      { requireAnchors: true, enablePositionRecovery: false, enableTipTapIntegration: false }
    )

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })
})

// ============================================================================
// Test Suite 2: enablePositionRecovery Paths (2 permutations)
// ============================================================================

describe('Comment Capabilities - enablePositionRecovery', () => {
  let adminUserId: string

  beforeEach(async () => {
    await authDelay()
    adminUserId = await signInAsAdmin(testSupabase)
  })

  /**
   * Permutation 4: enablePositionRecovery=true → recovery path executes
   *
   * Use Case: scripts-web (attempt position recovery on anchor mismatch)
   * Expected: Recovery logic invoked when position mismatches detected
   * Status: RED (attemptPositionRecovery doesn't exist yet)
   */
  it('EXECUTES recovery when enablePositionRecovery=true', async () => {
    const testCommentId = 'test-comment-1'

    // Using service role to bypass RLS circular dependency
    const result = await attemptPositionRecovery(
      serviceSupabase,
      testCommentId,
      { requireAnchors: false, enablePositionRecovery: true, enableTipTapIntegration: false }
    )

    // Verify recovery was attempted (even if unsuccessful)
    expect(result).toBeDefined()
    expect(typeof result.recovered).toBe('boolean')
  })

  /**
   * Permutation 5: enablePositionRecovery=false → no recovery attempted
   *
   * Use Case: cam-op-pwa (skip recovery for performance/simplicity)
   * Expected: Recovery logic bypassed entirely
   * Status: RED (attemptPositionRecovery doesn't exist yet)
   */
  it('SKIPS recovery when enablePositionRecovery=false', async () => {
    const testCommentId = 'test-comment-2'

    // Using service role to bypass RLS circular dependency
    const result = await attemptPositionRecovery(
      serviceSupabase,
      testCommentId,
      { requireAnchors: false, enablePositionRecovery: false, enableTipTapIntegration: false }
    )

    // When recovery disabled, should return immediately without attempting
    expect(result.recovered).toBe(false)
  })

  /**
   * NEGATIVE PATH: Wrapper Drift Prevention Test
   *
   * Purpose: Ensure wrapper only signals 'recovered: true' when POC actually relocates
   * Constitutional Authority: Test-Infrastructure-Steward ruling (prevent adapter drift)
   *
   * Use Case: Comment with text that cannot be found → POC returns 'fallback' or 'orphaned'
   * Expected: Wrapper must return 'recovered: false' (not claim success when POC fails)
   *
   * This test prevents the wrapper from hardcoding results instead of calling POC.
   * If wrapper returns true when POC returns fallback/orphaned, it's validation theater.
   */
  it('NEGATIVE PATH: only signals recovered when POC actually relocates', async () => {
    const testScriptId = await createTestScript()
    const userId = adminUserId // Use stored user ID from beforeEach

    // Create comment with text that won't be in the script
    // Using service role to bypass RLS circular dependency
    const { data: comment, error: insertError } = await serviceSupabase
      .from('comments')
      .insert({
        id: crypto.randomUUID(), // Must be valid UUID
        script_id: testScriptId,
        user_id: userId,
        content: 'Test comment',
        highlighted_text: 'text that does not exist in script',
        start_position: 100,
        end_position: 135,
        created_at: new Date(Date.now() - 20000).toISOString() // Old enough for recovery
      })
      .select()
      .single()

    if (insertError || !comment) {
      throw new Error(`Failed to create test comment: ${insertError?.message || 'No data returned'}`)
    }

    const capabilities = {
      enablePositionRecovery: true,
      requireAnchors: false,
      enableTipTapIntegration: false
    }

    // Using service role to bypass RLS circular dependency
    const result = await attemptPositionRecovery(serviceSupabase, comment.id, capabilities)

    // CRITICAL: Wrapper must return false when POC cannot relocate
    // If this returns true, the wrapper is not calling POC correctly
    expect(result.recovered).toBe(false)
    expect(result.details?.status).toMatch(/fallback|orphaned/)
  })
})

// ============================================================================
// Test Suite 3: enableTipTapIntegration Paths (2 permutations)
// ============================================================================

describe('Comment Capabilities - enableTipTapIntegration', () => {
  // No beforeEach needed - TipTap tests don't use database

  /**
   * Permutation 6: enableTipTapIntegration=true → TipTap extension loads
   *
   * Use Case: scripts-web (full TipTap integration for rich text editing)
   * Expected: TipTap extension loaded and integrated
   * Status: RED (loadTipTapExtension doesn't exist yet)
   */
  it('LOADS TipTap extension when enableTipTapIntegration=true', () => {
    // RED: This will fail because loadTipTapExtension doesn't exist yet
    const result = loadTipTapExtension({
      requireAnchors: false,
      enablePositionRecovery: false,
      enableTipTapIntegration: true,
    })

    expect(result.loaded).toBe(true)
  })

  /**
   * Permutation 7: enableTipTapIntegration=false → works without TipTap
   *
   * Use Case: cam-op-pwa (lightweight comment system without TipTap)
   * Expected: Comments work without TipTap extension
   * Status: RED (loadTipTapExtension doesn't exist yet)
   */
  it('SKIPS TipTap when enableTipTapIntegration=false', () => {
    // RED: This will fail because loadTipTapExtension doesn't exist yet
    const result = loadTipTapExtension({
      requireAnchors: false,
      enablePositionRecovery: false,
      enableTipTapIntegration: false,
    })

    expect(result.loaded).toBe(false)
  })
})

// ============================================================================
// Test Suite 4: Cross-App Integration Scenarios (1 permutation)
// ============================================================================

describe('Comment Capabilities - Cross-App Integration', () => {
  let adminUserId: string

  beforeEach(async () => {
    await authDelay()
    adminUserId = await signInAsAdmin(testSupabase)
  })

  /**
   * Permutation 8: scripts-web strict mode (all capabilities enabled)
   *
   * Use Case: scripts-web production configuration
   * Expected: All strict validations and features enabled
   * Status: RED (createComment doesn't exist yet)
   */
  it('APPLIES scripts-web strict configuration (all true)', async () => {
    const testScriptId = await createTestScript()
    const userId = adminUserId // Use stored user ID from beforeEach

    // scripts-web configuration: strict validation + full features
    const scriptsWebCapabilities: CommentCapabilities = {
      requireAnchors: true,
      enablePositionRecovery: true,
      enableTipTapIntegration: true,
    }

    // Test 1: Enforce anchor requirement
    const invalidResult = await createComment(
      serviceSupabase,
      {
        scriptId: testScriptId,
        content: 'Invalid (no anchor)',
        startPosition: 0,
        endPosition: 0,
      },
      userId,
      scriptsWebCapabilities
    )

    expect(invalidResult.success).toBe(false)
    expect(invalidResult.error?.code).toBe('VALIDATION_ERROR')

    // Test 2: Accept valid anchored comment
    const validResult = await createComment(
      serviceSupabase,
      {
        scriptId: testScriptId,
        content: 'Valid anchored comment',
        startPosition: 10,
        endPosition: 25,
        anchorText: 'selected text',
      },
      userId,
      scriptsWebCapabilities
    )

    expect(validResult.success).toBe(true)

    // Test 3: Verify TipTap integration enabled
    const tipTapResult = loadTipTapExtension(scriptsWebCapabilities)
    expect(tipTapResult.loaded).toBe(true)
  })

  /**
   * Bonus Permutation: cam-op-pwa flexible mode (all capabilities disabled)
   *
   * Use Case: cam-op-pwa production configuration
   * Expected: Flexible validation, lightweight implementation
   * Status: RED (createComment doesn't exist yet)
   */
  it('APPLIES cam-op-pwa flexible configuration (all false)', async () => {
    const testScriptId = await createTestScript()
    const userId = adminUserId // Use stored user ID from beforeEach

    // cam-op-pwa configuration: flexible validation + lightweight
    const camOpCapabilities: CommentCapabilities = {
      requireAnchors: false,
      enablePositionRecovery: false,
      enableTipTapIntegration: false,
    }

    // Test 1: Allow zero-length anchors
    const result = await createComment(
      serviceSupabase,
      {
        scriptId: testScriptId,
        content: 'Script-level comment',
        startPosition: 0,
        endPosition: 0,
      },
      userId,
      camOpCapabilities
    )

    expect(result.success).toBe(true)

    // Test 2: Verify TipTap NOT loaded
    const tipTapResult = loadTipTapExtension(camOpCapabilities)
    expect(tipTapResult.loaded).toBe(false)
  })
})
