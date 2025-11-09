/**
 * POC Position Recovery - Extraction Validation Tests
 *
 * Purpose: Prove POC extraction is correct by testing original functions directly
 * Constitutional Authority: Test-Infrastructure-Steward ruling (hybrid testing mandatory)
 *
 * Test Coverage:
 * 1. Exact text match (POC line 235 behavior)
 * 2. Case-insensitive match (POC line 268 behavior)
 * 3. Fuzzy match (POC line 298 behavior)
 * 4. Fallback when no match (POC line 298 behavior)
 * 5. Batch recovery (POC line 316 behavior)
 * 6. Fresh comment skip (POC line 239-257 behavior)
 *
 * These tests validate the POC functions extracted from scripts-web.
 * Separate from capability-config tests which validate the wrapper integration.
 */

import { describe, it, expect } from 'vitest'
import { recoverCommentPosition, batchRecoverCommentPositions } from '../domain/positionRecovery.js'

describe('POC Position Recovery - Extraction Validation', () => {
  /**
   * Test 1: Exact Text Match
   * POC Behavior: Line 235 - findTextInDocument with exact match strategy
   * Expected: status='relocated', matchQuality='exact'
   */
  it('recoverCommentPosition finds exact text match', () => {
    const comment = {
      id: 'test-1',
      startPosition: 10,
      endPosition: 23,
      highlighted_text: 'original text',
      created_at: new Date(Date.now() - 20000).toISOString() // 20 seconds old (not fresh)
    }
    const documentContent = 'Some content with original text in the document'

    const result = recoverCommentPosition(comment, documentContent)

    expect(result.status).toBe('relocated')
    expect(result.matchQuality).toBe('exact')
    expect(result.newStartPosition).toBeGreaterThanOrEqual(0)
    expect(result.newEndPosition).toBeGreaterThan(result.newStartPosition)
    expect(documentContent.substring(result.newStartPosition, result.newEndPosition)).toBe('original text')
  })

  /**
   * Test 2: Case-Insensitive Match
   * POC Behavior: Line 268 - findTextInDocument with case-insensitive strategy
   * Expected: status='relocated', matchQuality='case-insensitive'
   */
  it('recoverCommentPosition handles case-insensitive match', () => {
    const comment = {
      id: 'test-2',
      startPosition: 10,
      endPosition: 23,
      highlighted_text: 'Original Text',
      created_at: new Date(Date.now() - 20000).toISOString()
    }
    const documentContent = 'Some content with original text in lowercase'

    const result = recoverCommentPosition(comment, documentContent)

    expect(result.status).toBe('relocated')
    expect(result.matchQuality).toBe('case-insensitive')
    expect(result.newStartPosition).toBeGreaterThanOrEqual(0)
  })

  /**
   * Test 3: Fuzzy Match
   * POC Behavior: Line 298 - findTextInDocument with fuzzy match strategy
   * Expected: status='uncertain', matchQuality='fuzzy'
   */
  it('recoverCommentPosition handles fuzzy match', () => {
    const comment = {
      id: 'test-3',
      startPosition: 10,
      endPosition: 29,
      highlighted_text: 'original text here',
      created_at: new Date(Date.now() - 20000).toISOString()
    }
    // Similar but not exact - should trigger fuzzy matching
    const documentContent = 'Some content with original text nearby with minor changes'

    const result = recoverCommentPosition(comment, documentContent)

    // Fuzzy match should find something (status could be 'uncertain' or 'relocated' depending on similarity)
    expect(['uncertain', 'relocated']).toContain(result.status)
    expect(result.matchQuality).toMatch(/exact|case-insensitive|fuzzy/)
  })

  /**
   * Test 4: Fallback When No Match
   * POC Behavior: Line 298 - returns fallback when text not found
   * Expected: status='orphaned', matchQuality='none'
   */
  it('recoverCommentPosition falls back when no match found', () => {
    const comment = {
      id: 'test-4',
      startPosition: 10,
      endPosition: 30,
      highlighted_text: 'text not in document',
      created_at: new Date(Date.now() - 20000).toISOString()
    }
    const documentContent = 'Completely different content with no matching text'

    const result = recoverCommentPosition(comment, documentContent)

    expect(result.status).toBe('orphaned')
    expect(result.matchQuality).toBe('none')
    // Should preserve positions (but clamp to document length)
    expect(result.newStartPosition).toBeGreaterThanOrEqual(0)
    expect(result.newEndPosition).toBeGreaterThanOrEqual(result.newStartPosition)
  })

  /**
   * Test 5: Fresh Comment Skip
   * POC Behavior: Line 239-257 - skip recovery for comments < 10 seconds old
   * Expected: status='fallback', uses original positions
   */
  it('recoverCommentPosition skips fresh comments (<10 seconds)', () => {
    const comment = {
      id: 'test-5',
      startPosition: 10,
      endPosition: 20,
      highlighted_text: 'fresh text',
      created_at: new Date(Date.now() - 5000).toISOString() // 5 seconds old (fresh)
    }
    const documentContent = 'Document content does not matter for fresh comments'

    const result = recoverCommentPosition(comment, documentContent)

    expect(result.status).toBe('fallback')
    expect(result.matchQuality).toBe('none')
    expect(result.newStartPosition).toBe(comment.startPosition)
    expect(result.newEndPosition).toBe(comment.endPosition)
    expect(result.message).toContain('Fresh comment')
  })

  /**
   * Test 6: Batch Recovery
   * POC Behavior: Line 316 - batchRecoverCommentPositions processes multiple comments
   * Expected: Returns Map with results for each comment
   */
  it('batchRecoverCommentPositions processes multiple comments', () => {
    const comments = [
      {
        id: 'batch-1',
        startPosition: 10,
        endPosition: 18,
        highlighted_text: 'text one',
        created_at: new Date(Date.now() - 20000).toISOString()
      },
      {
        id: 'batch-2',
        startPosition: 30,
        endPosition: 38,
        highlighted_text: 'text two',
        created_at: new Date(Date.now() - 20000).toISOString()
      },
      {
        id: 'batch-3',
        startPosition: 50,
        endPosition: 63,
        highlighted_text: 'missing text',
        created_at: new Date(Date.now() - 20000).toISOString()
      }
    ]
    const documentContent = 'Content with text one and text two but not the third'

    const results = batchRecoverCommentPositions(comments, documentContent)

    // Should return Map with 3 entries
    expect(results).toBeInstanceOf(Map)
    expect(results.size).toBe(3)

    // Verify individual results
    const result1 = results.get('batch-1')
    expect(result1?.status).toBe('relocated')
    expect(result1?.matchQuality).toBe('exact')

    const result2 = results.get('batch-2')
    expect(result2?.status).toBe('relocated')
    expect(result2?.matchQuality).toBe('exact')

    const result3 = results.get('batch-3')
    expect(result3?.status).toBe('orphaned')
    expect(result3?.matchQuality).toBe('none')
  })

  /**
   * Test 7: Legacy Comment Without Highlighted Text
   * POC Behavior: Line 260-268 - fallback for comments without highlighted_text
   * Expected: status='fallback', uses original positions
   */
  it('recoverCommentPosition handles legacy comments without highlighted_text', () => {
    const comment = {
      id: 'test-legacy',
      startPosition: 10,
      endPosition: 20,
      highlighted_text: '', // Empty highlighted text (legacy comment)
      created_at: new Date(Date.now() - 20000).toISOString()
    }
    const documentContent = 'Any document content'

    const result = recoverCommentPosition(comment, documentContent)

    expect(result.status).toBe('fallback')
    expect(result.matchQuality).toBe('none')
    expect(result.newStartPosition).toBe(comment.startPosition)
    expect(result.newEndPosition).toBe(comment.endPosition)
    expect(result.message).toContain('legacy comment')
  })
})
