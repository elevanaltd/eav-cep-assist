# Extraction Testing Policy - Constitutional Ruling

**Date:** 2025-11-02
**Authority:** test-infrastructure-steward (BLOCKING domain authority)
**Consultation:** codex test-infrastructure-steward (400k context validation)
**Status:** CONSTITUTIONAL POLICY - Mandatory for all extraction work

---

## Constitutional Question

When extracting existing code from POC to shared library (not building new features), what does TDD discipline (North Star I7) require?

**Scenario:**
- Week 1 RED: Tests written for public API interface
- POC Reality: Functions have different internal interface
- Implementation: Adapter/wrapper bridges the gap
- Question: Must we test POC directly, or is testing wrapper sufficient?

---

## Ruling: Hybrid Testing Mandatory

**REQUIRED:** Both POC extraction AND public API integration must be tested

**Constitutional Basis:**
- North Star I7: TDD RED→GREEN discipline requires proving extraction correctness
- `.coord/test-context/RULES.md:75` - Extract proven POC patterns before new structure
- Test infrastructure domain: BLOCKING authority for test integrity violations

---

## Three-Tier Test Coverage Requirement

### Tier 1: Extraction Fidelity Tests (MANDATORY)

**Purpose:** Prove POC extraction is correct (not validation theater)

**Requirements:**
- Test POC functions directly with their actual interfaces
- Use same fixtures/edge cases as POC
- Validate all POC behavior paths (success, fallback, edge cases)
- No adapters/wrappers - direct POC function calls only

**Example:**
```typescript
// ✅ CORRECT - Tests POC directly
import { recoverCommentPosition } from '../domain/positionRecovery'

it('recoverCommentPosition finds exact text match', () => {
  const comment = { /* POC interface */ }
  const documentContent = 'content'

  const result = recoverCommentPosition(comment, documentContent)

  expect(result.status).toBe('relocated')
  expect(result.matchQuality).toBe('exact')
})

// ❌ WRONG - Only tests wrapper
import { attemptPositionRecovery } from '../domain/positionRecovery'

it('position recovery works', async () => {
  const result = await attemptPositionRecovery(supabase, commentId, capabilities)
  expect(result.recovered).toBe(true)  // Doesn't prove POC extraction!
})
```

**File Location Pattern:**
- `{module}.extraction.test.ts` (e.g., `positionRecovery.extraction.test.ts`)
- Co-located with source file
- Clearly labeled as extraction validation

### Tier 2: Public API Integration Tests (MANDATORY)

**Purpose:** Validate capability-aware public API works correctly

**Requirements:**
- Test public API interfaces (wrappers/adapters)
- Validate capability configuration integration
- Test success paths with capabilities enabled
- Test disabled paths with capabilities off

**Example:**
```typescript
// ✅ Tests public API + capability integration
import { attemptPositionRecovery } from '../domain/positionRecovery'

it('recovery executes when enablePositionRecovery=true', async () => {
  const capabilities = { enablePositionRecovery: true }
  const result = await attemptPositionRecovery(supabase, commentId, capabilities)
  expect(result.recovered).toBe(true)
})

it('recovery disabled when enablePositionRecovery=false', async () => {
  const capabilities = { enablePositionRecovery: false }
  const result = await attemptPositionRecovery(supabase, commentId, capabilities)
  expect(result.recovered).toBe(false)
})
```

**File Location Pattern:**
- `capability-config.test.ts` (public API contracts)
- `{feature}.integration.test.ts` (cross-app integration)

### Tier 3: Negative Path Tests (MANDATORY)

**Purpose:** Prevent adapter drift (wrapper diverging from POC behavior)

**Requirements:**
- Test wrapper returns correct results when POC fails
- Ensure wrapper doesn't fake success
- Validate error propagation
- Guard against hardcoded returns

**Example:**
```typescript
// ✅ Tests wrapper drift prevention
it('wrapper only signals recovered when POC relocates', async () => {
  // Setup: Comment POC cannot recover
  const commentId = 'no-match-comment'
  await createCommentWithNoTextMatch(commentId)

  const result = await attemptPositionRecovery(supabase, commentId, capabilities)

  // CRITICAL: Must return false when POC returns 'fallback'
  expect(result.recovered).toBe(false)
  expect(result.details.status).toBe('fallback')  // Verify POC result propagated
})
```

---

## What is Validation Theater?

**Validation Theater Defined:**
Testing new wrapper/adapter code without proving the underlying POC extraction is correct.

**Examples:**

**❌ Validation Theater (Blocked):**
```typescript
// Wrapper implementation
export async function attemptPositionRecovery(
  supabase: any,
  commentId: string,
  capabilities: CommentCapabilities
): Promise<{ recovered: boolean }> {
  if (!capabilities.enablePositionRecovery) {
    return { recovered: false }
  }
  return { recovered: true }  // ⚠️ HARDCODED - doesn't call POC!
}

// Test
it('recovery works', async () => {
  const result = await attemptPositionRecovery(supabase, commentId, capabilities)
  expect(result.recovered).toBe(true)  // Passes but doesn't validate extraction!
})
```

**Why This is Theater:**
- Test passes
- Wrapper exists
- But POC function was never extracted/tested
- Deployment will fail when wrapper's hardcoded logic doesn't match reality

**✅ Legitimate Adapter Pattern (Allowed):**
```typescript
// Wrapper implementation
export async function attemptPositionRecovery(
  supabase: any,
  commentId: string,
  capabilities: CommentCapabilities
): Promise<{ recovered: boolean }> {
  if (!capabilities.enablePositionRecovery) {
    return { recovered: false }
  }

  // ✅ CALLS ACTUAL POC FUNCTION
  const result = recoverCommentPosition(commentData, script.content)

  return {
    recovered: result.status === 'relocated',
    details: result
  }
}

// Extraction fidelity test (Tier 1)
it('recoverCommentPosition relocates exact match', () => {
  const result = recoverCommentPosition(comment, documentContent)
  expect(result.status).toBe('relocated')
})

// Wrapper integration test (Tier 2)
it('attemptPositionRecovery integrates capability check', async () => {
  const result = await attemptPositionRecovery(supabase, commentId, capabilities)
  expect(result.recovered).toBe(true)
})

// Negative path test (Tier 3)
it('wrapper returns false when POC fails', async () => {
  const result = await attemptPositionRecovery(supabase, noMatchCommentId, capabilities)
  expect(result.recovered).toBe(false)
})
```

**Why This is Valid:**
- Wrapper calls actual POC code
- Tier 1 tests prove POC extraction correct
- Tier 2 tests prove wrapper integrates capability config
- Tier 3 tests prevent wrapper drift
- All layers validated

---

## CI Evidence Requirement

**All three test tiers MUST execute in CI quality gates:**

```bash
# Quality gate sequence (from .coord/test-context/RULES.md:112)
pnpm turbo run typecheck --filter=@workspace/shared
pnpm turbo run lint --filter=@workspace/shared
pnpm turbo run test --filter=@workspace/shared  # ← Must include all 3 tiers
```

**Test output must show:**
- ✅ Extraction fidelity tests passing (Tier 1)
- ✅ Public API integration tests passing (Tier 2)
- ✅ Negative path tests passing (Tier 3)

**Git commit message must reference test artifacts:**
```
feat(shared): extract position recovery

Evidence artifacts:
- Extraction tests: 7/7 passing (positionRecovery.extraction.test.ts)
- Integration tests: 9/9 passing (capability-config.test.ts)
- Build: .coord/validation/phase2-build.txt (0 errors)
- TypeCheck: .coord/validation/phase2-typecheck.txt (0 errors)
- Test: .coord/validation/phase2-test.txt (16/16 passing)

Constitutional compliance: Hybrid testing (3 tiers validated)
```

---

## When Hybrid Testing is NOT Required

**Exception:** Pure utility functions with no POC extraction

**Example:**
```typescript
// New code (not extracted from POC)
export function formatCommentTimestamp(date: Date): string {
  return date.toISOString()
}
```

**This only needs:**
- Standard unit tests (no POC to validate)
- No extraction fidelity layer needed

**Hybrid testing applies ONLY when:**
1. Extracting code from POC
2. Creating wrapper/adapter for different interface
3. Public API differs from POC internal API

---

## Constitutional Authority Chain

**Test Infrastructure Steward:**
- BLOCKING authority for test integrity violations
- Domain: TEST_INFRASTRUCTURE (CI pipelines, test standards, harness patterns)
- Can block deployment if test coverage insufficient

**Holistic Orchestrator:**
- Constitutional enforcement authority
- Can escalate test integrity violations
- Ultimate accountability for system coherence

**Implementation Lead:**
- Tactical execution authority
- Must satisfy test infrastructure requirements
- Cannot bypass test coverage requirements

---

## Historical Context: Why This Ruling Exists

**Date:** 2025-11-02
**Incident:** copy-editor extraction Week 2 Phase 2

**What Happened:**
1. Week 1 tests defined public API: `attemptPositionRecovery(supabase, commentId, capabilities)`
2. POC had different interface: `recoverCommentPosition(comment, documentContent)`
3. Implementation created wrapper calling POC
4. Tests passed (wrapper worked)
5. Holistic-orchestrator blocked progression: "Validation theater - wrapper tested but not POC extraction"

**Constitutional Conflict:**
- HO claimed: "Tests validate wrapper not POC - remove wrapper"
- IL claimed: "Wrapper calls POC - this is adapter pattern not validation theater"
- Both partially correct

**Resolution:**
- Test-infrastructure-steward ruling: Hybrid testing mandatory
- Both POC extraction AND wrapper integration must be tested
- HO concern valid (missing POC tests) but solution overcorrected (wrapper removal)
- IL proposal correct (keep wrapper, add POC tests)

**Outcome:**
- Policy established: 3-tier test coverage for extraction work
- Prevents validation theater while preserving adapter patterns
- Constitutional clarity for future extraction work

---

## Quick Reference

**For Extraction Work:**

1. ✅ Write Tier 1: Extraction fidelity tests (prove POC correct)
2. ✅ Write Tier 2: Public API integration tests (prove wrapper works)
3. ✅ Write Tier 3: Negative path tests (prevent wrapper drift)
4. ✅ Commit with CI evidence (all tiers passing)

**Minimum Coverage:**
- Tier 1: All POC behavior paths (success, fallback, edge cases)
- Tier 2: Capability enabled/disabled paths
- Tier 3: Wrapper failure when POC fails

**CI Validation:**
- All 3 tiers execute in quality gate
- Test artifacts stored in .coord/validation/
- Commit message references evidence

---

**This policy is CONSTITUTIONAL and BLOCKING.**

Any extraction work without 3-tier test coverage will be blocked by test-infrastructure-steward.
