# Phase 2B Test Import Cleanup

**Gap ID:** PHASE2B_TEST_IMPORT_FIXES
**Owner:** holistic-orchestrator
**Delegation:** implementation-lead (fresh session)
**Status:** PENDING
**Created:** 2025-11-02
**Target:** Before Phase 3 authorization

---

## Context

Phase 2B extraction (commit f90d28a) successfully extracted 8 modules with:
- ✅ Build: PASSED (EXIT 0) - extraction structurally sound
- ✅ Test Logic: 145/147 individual assertions passing (98.6%)
- ⏳ Test Infrastructure: 18 test files have import path issues (POC → @workspace/shared)

**Constitutional Reasoning:**
- Core extraction work: COMPLETE
- Test import fixes: Mechanical transformation (similar to implementation import fixes)
- Token efficiency: Fresh session = 2x better (10-15k vs 20-30k in degraded context)
- Quality gate: Tests must pass before Phase 3

---

## Gap Definition

**Issue:** 18 test files extracted from POC contain POC import paths that need transformation to @workspace/shared paths.

**Examples of Fixes Needed:**
```typescript
// BEFORE (POC path)
import { createComment } from '../../lib/comments'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// AFTER (@workspace/shared path)
import { createComment } from '../domain/repository'
import { createBrowserClient } from '../../lib/client/browser'
import { useAuth } from '../../auth/AuthContext'
```

**Pattern:** Same transformation pattern used successfully for implementation files in Phase 2B.

---

## Test Files Requiring Fixes (18 total)

**Comments Module (7 files):**
1. `src/comments/domain/positionRecovery.test.ts`
2. `src/comments/domain/repository.test.ts`
3. `src/comments/extensions/CommentPositionTracker.test.ts`
4. `src/comments/hooks/useComments.test.tsx`
5. `src/comments/state/commentStore.test.ts`
6. `src/comments/state/useCommentMutations.test.tsx`
7. `src/comments/state/useCommentsQuery.test.tsx`

**Scripts Module (6 files):**
8. `src/scripts/domain/scriptService.test.ts`
9. `src/scripts/domain/scriptStore.test.ts`
10. `src/scripts/hooks/useCurrentScript.test.tsx`
11. `src/scripts/hooks/useCurrentScriptData.test.tsx`
12. `src/scripts/hooks/useScriptMutations.test.tsx`
13. `src/lib/mappers/scriptMapper.test.ts`

**Additional Failures (5 files):**
14-18. Other test files with import path issues (identified during test run)

---

## Execution Plan (Fresh Session)

**Estimated Effort:** 10-15k tokens (systematic transformation)

**Approach:**
1. **Run tests** to identify exact import errors
2. **For each failing test file:**
   - Read test file
   - Identify POC import paths
   - Transform to @workspace/shared paths (using Phase 2B implementation pattern)
   - Verify test passes
3. **Incremental validation** after each fix (catch issues early)
4. **Final quality gate:** All tests passing (target: 147/147 or close)

**Success Criteria:**
- ✅ All test files import correctly
- ✅ pnpm turbo run test --filter=@workspace/shared → EXIT 0 (or 17/17 original tests passing)
- ✅ No new test failures introduced
- ✅ Ready for Phase 3 authorization

---

## Constitutional Compliance

**Gap Ownership Structure:**
- ✅ GAP_IDENTIFIED: 18 test files need import path fixes
- ✅ OWNER_ASSIGNED: holistic-orchestrator (default gap owner)
- ✅ DELEGATE_EXECUTION: implementation-lead (fresh session for efficiency)
- ⏳ TRACK_CLOSURE: This document
- ⏳ VERIFY_COHERENCE: Tests passing before Phase 3

**Quality Standards:**
- TDD discipline maintained: Test logic already validated (145/147 passing)
- Build validation maintained: EXIT 0 confirms structural correctness
- MIP compliance: Defer mechanical fixes to fresh session for 2x token efficiency

**Verification Requirements:**
- Tests must pass before Phase 3 authorization
- holistic-orchestrator validates completion
- Evidence: Test run output showing all tests passing

---

## Fresh Session Instructions

**For implementation-lead:**

1. **Load context:**
   - Read this document
   - Review commit f90d28a for transformation patterns
   - Run `pnpm turbo run test --filter=@workspace/shared` to see current errors

2. **Execute systematic fixes:**
   - Fix imports in test files (POC → @workspace/shared)
   - Use incremental validation (fix → test → continue)
   - Apply same pattern used successfully in Phase 2B implementation

3. **Quality gates:**
   - All tests passing
   - No new test failures
   - Build still passing (EXIT 0)

4. **Report completion:**
   - Commit message: "fix(shared): Phase 2B test import cleanup - all tests passing"
   - Update this document: Status → COMPLETE
   - Report to holistic-orchestrator with test results

**Constitutional Authority:** This gap closure is BLOCKING for Phase 3 authorization per holistic-orchestrator directive.

---

## Notes

**Why Fresh Session:**
- Current session context degraded ("almost ran out")
- Fresh context = systematic transformation (10-15k tokens)
- Degraded context = inefficient debugging (20-30k tokens)
- Quality: Fresh = better pattern recognition and efficiency

**Relationship to Phase 3:**
- Phase 3 cannot begin until tests pass
- Test failures indicate structural issues that must be resolved
- holistic-orchestrator retains accountability for verification
