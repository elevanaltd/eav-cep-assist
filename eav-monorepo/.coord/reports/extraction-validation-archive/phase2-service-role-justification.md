# Phase 2 Service Role Usage - Constitutional Justification

## Decision: Use Service Role for Test Infrastructure

**Authority:** holistic-orchestrator (approved via supabase-expert assessment)
**Date:** 2025-11-02
**Context:** RLS circular dependency blocking Phase 2 tests

## Rationale

1. **Test Scope:** Phase 2 validates capability-config business logic (not RLS policies)
2. **Standard Pattern:** Service role for test fixtures = acceptable testing practice
3. **Production Safety:** RLS fix applied on parallel track (SECURITY DEFINER pattern)
4. **Separation of Concerns:** RLS validation = dedicated test suite (future work)

## What Service Role Enables

- ✅ Test fixture creation (scripts, projects, users) without RLS circular dependency
- ✅ Capability-config validation (requireAnchors, enablePositionRecovery, enableTipTapIntegration)
- ✅ Business logic correctness testing (createComment, attemptPositionRecovery)

## What Service Role Does NOT Validate

- ❌ RLS policy enforcement (user_accessible_scripts filtering)
- ❌ Multi-tenant access control (client isolation)
- ❌ Role-based permissions (admin vs employee vs client)

## Implementation Details

### Database Constraint Bug Fixed
**Issue:** Original constraint `CHECK (end_position > start_position)` blocked zero-length anchors
**Fix:** Migration `20251102143000_fix_comments_position_constraint.sql`
**Change:** `CHECK (end_position >= start_position)` allows zero-length anchors
**Validation:** Application-level `requireAnchors` capability controls enforcement per app

### RLS Circular Dependency Workaround
**Issue:** Comment INSERT → Scripts FK → Scripts RLS → user_accessible_scripts → Scripts query → RLS (LOOP)
**Error:** `infinite recursion detected in rules for relation "user_accessible_scripts"`
**Workaround:** Service role client bypasses RLS for ALL test database operations
**Future Fix:** Migration `20251102_fix_rls_circular_dependency.sql` (parallel track, SECURITY DEFINER pattern)

### Service Role Usage Pattern
```typescript
// Service role client created once
const serviceSupabase = getServiceClient()

// Used for ALL database operations in tests
await createComment(serviceSupabase, data, userId, capabilities)
await serviceSupabase.from('comments').insert(commentData)
await createTestScript() // Internally uses service client
```

## Test Results Evidence

**Phase 2 Tests: 17/17 PASSING** ✅

### Capability-Config Tests (10/10):
1. ✅ FAILS when requireAnchors=true and zero-length anchor
2. ✅ SUCCEEDS when requireAnchors=false and zero-length anchor
3. ✅ SUCCEEDS when requireAnchors=true and valid anchor
4. ✅ EXECUTES recovery when enablePositionRecovery=true
5. ✅ SKIPS recovery when enablePositionRecovery=false
6. ✅ NEGATIVE PATH: only signals recovered when POC relocates
7. ✅ LOADS TipTap extension when enableTipTapIntegration=true
8. ✅ SKIPS TipTap when enableTipTapIntegration=false
9. ✅ APPLIES copy-editor strict configuration (all true)
10. ✅ APPLIES cam-op-pwa flexible configuration (all false)

### POC Extraction Tests (7/7):
1. ✅ recoverCommentPosition finds exact text match
2. ✅ recoverCommentPosition handles case-insensitive match
3. ✅ recoverCommentPosition handles fuzzy match
4. ✅ recoverCommentPosition falls back when no match found
5. ✅ recoverCommentPosition skips fresh comments (<10 seconds)
6. ✅ batchRecoverCommentPositions processes multiple comments
7. ✅ recoverCommentPosition handles legacy comments without highlighted_text

**Output:** `.coord/validation/phase2-10-tests-passing.txt`

## Mitigation

- Dedicated RLS test suite planned (after RLS fix migration applied)
- Service role usage documented in test files (comments explain why)
- RLS validation gap tracked in `RLS-VALIDATION.md`

## Constitutional Compliance

**Phase 2 Scope:** Extract comments + scripts (not redesign RLS architecture)

**Test-Infrastructure-Steward:** Approved service role workaround for Phase 2
- Hybrid testing mandated: POC extraction tests + capability-config tests
- Both test layers completed and passing

**Holistic-Orchestrator:** Approved separation of concerns (RLS = parallel track)
- Production CRITICAL issue (RLS circular dependency)
- Not Phase 2 blocking (service role workaround unblocks tests)

**North Star I7:** TDD discipline satisfied with service role
- Business logic tests PASS (capability-config pattern validated)
- POC extraction tests PASS (extraction correctness proven)

**TRACED Protocol:** Evidence = business logic correctness (capability-config pattern)
- RED state: Week 1 tests defined expected behavior
- GREEN state: Phase 2 implementation passes all tests
- Evidence: 17/17 tests passing with service role

**Approved:** supabase-expert + holistic-orchestrator (2025-11-02)

## Files Modified

### Test Infrastructure:
1. `packages/shared/src/test/supabase-test-client.ts` - Added `getServiceClient()` function
2. `packages/shared/src/test/factories.ts` - Updated `createTestScript()` to use service role
3. `packages/shared/src/test/RLS-VALIDATION.md` - Documented RLS validation gap

### Database:
4. `supabase/migrations/20251102143000_fix_comments_position_constraint.sql` - Fixed CHECK constraint

### Tests:
5. `packages/shared/src/comments/__tests__/capability-config.test.ts` - Updated to use `serviceSupabase`
6. `packages/shared/src/comments/__tests__/positionRecovery.extraction.test.ts` - POC extraction tests (NEW)

## Next Steps

1. ✅ Service role implementation complete (17/17 tests passing)
2. ⏭️ Create consultation request for test-methodology-guardian
3. ⏭️ Quality gates (lint + typecheck + test - all passing)
4. ⏭️ Git commit with evidence
5. ⏭️ Document Phase 2 completion

## Summary

Service role usage is **constitutionally justified** for Phase 2:
- ✅ Business logic correctness validated (capability-config pattern works)
- ✅ POC extraction correctness proven (functions behave as expected)
- ✅ Standard testing practice (service role for infrastructure)
- ⚠️ RLS validation deferred (dedicated test suite after RLS fix applied)
- 🎯 Phase 2 goal achieved: Comments + scripts extracted and tested
