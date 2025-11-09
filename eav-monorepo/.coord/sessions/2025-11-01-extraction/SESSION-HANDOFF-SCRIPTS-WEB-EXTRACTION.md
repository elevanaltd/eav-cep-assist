# Session Handoff: Copy-Editor Extraction - Option B (TDD-Compliant)

**Date:** 2025-11-01 (Updated: 2025-11-02)
**Session Status:** Infrastructure Complete - Week 1 Ready
**Decision:** OPTION B - Full TDD-Compliant Extraction (18-24 hours)
**Owner:** holistic-orchestrator → implementation-lead (pending)

---

## ✅ Infrastructure Status Update (2025-11-02)

**Test Infrastructure Complete:**
- ✅ Test utilities created and validated (16/16 smoke tests passing)
- ✅ Local Supabase running (127.0.0.1:54321)
- ✅ Test users created with RLS tables (user_profiles, user_clients)
- ✅ Environment configured (.env, .env.example, .gitguardian.yaml)
- ✅ Documentation complete (.coord/test-context/)
- ✅ CI scripts created (create-test-users-via-api.mjs)

**Blocker Removed:** Test environment production-ready for Week 1

**See:** `.coord/test-context/INFRASTRUCTURE-SETUP-SUMMARY.md` for complete details

---

## Executive Summary

**Objective:** Extract ~5,400 LOC of shared code from copy-editor POC to @workspace/shared BEFORE migrating app source, following TDD RED→GREEN→REFACTOR discipline.

**Status:**
- ✅ Architectural validation complete (technical-architect: CONDITIONAL GO)
- ✅ Production risk assessment complete (critical-engineer: CONDITIONAL GO with blocking conditions)
- ✅ Test infrastructure validated (16/16 smoke tests passing)
- ⏳ TDD protocol: Week 1 ready - RED-state tests pending
- 📋 **USER DECISION:** Proceed with Option B (TDD-compliant, 18-24 hours)

**Key Issue:** Capability-config pattern introduces NEW BEHAVIOR (requireAnchors: true/false, enablePositionRecovery, enableTipTapIntegration) that requires failing tests BEFORE extraction per North Star I7.

---

## Critical Documents (Read These First)

### Strategic Documents
1. **North Star:** `/Volumes/HestAI-Projects/eav-monorepo/docs/workflow/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md`
   - I6: Component Spine + App State
   - I7: TDD RED Discipline (**BLOCKING REQUIREMENT**)
   - I8: Production-Grade Quality
   - I11: Independent Deployment

2. **Decisions:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/DECISIONS.md`
   - Single shared package (@workspace/shared)
   - Monorepo architecture

3. **Deployment Guide:** `/Volumes/HestAI-Projects/eav-monorepo/docs/guides/001-DOC-DEPLOYMENT.md`
   - Vercel deployment model
   - Shared package bundling at build time

### Extraction Planning
4. **Extraction Strategy:** `/Volumes/HestAI-Projects/eav-monorepo/docs/guides/002-DOC-COPY-EDITOR-EXTRACTION.md`
   - 3-phase extraction plan (Infrastructure → Business Logic → App)
   - 20 components identified (~5,400 LOC)
   - Timeline estimates, risk assessment

### Validation Reports (.coord/reports/)
5. **Technical-Architect Review:** `001-REPORT-TECHNICAL-ARCHITECT-EXTRACTION-REVIEW.md`
   - **Verdict:** CONDITIONAL GO (90% confidence)
   - **Token:** `TECHNICAL-ARCHITECT-APPROVED-20251101-COPY-EDITOR-EXTRACTION`
   - **Conditions:** 5 pre-flight checks required

6. **Critical-Engineer GO/NO-GO:** `002-REPORT-CRITICAL-ENGINEER-GO-NO-GO.md`
   - **Verdict:** CONDITIONAL GO
   - **Blocking Conditions:** Rollback runbook, cross-app validation, capability-config test matrix, performance baselines
   - **Production Risk:** 15% without conditions, <5% with conditions

7. **Test-Methodology-Guardian:** `003-REPORT-TEST-METHODOLOGY-GUARDIAN-TDD-PROTOCOL.md`
   - **Verdict:** **REJECT** - [VIOLATION] TDD protocol
   - **Issue:** Capability-config is NEW BEHAVIOR, requires RED-state tests first
   - **Requirement:** Write failing tests for ALL capability permutations BEFORE extraction

---

## Validation Chain Summary

| Agent | Decision | Key Finding |
|-------|----------|-------------|
| technical-architect | ✅ CONDITIONAL GO | Architecture sound, multi-app reuse validated (Header + Nav used by scripts + scenes) |
| critical-engineer | ⚠️ CONDITIONAL GO | Production-safe IF blocking conditions met (rollback, baselines, cross-app tests) |
| test-methodology-guardian | ❌ REJECT | Capability-config = NEW BEHAVIOR → needs RED-state tests BEFORE extraction (North Star I7) |

**Overall:** BLOCKED on TDD protocol - must write failing tests for capability-config BEFORE extraction

---

## Option B: Full TDD-Compliant Extraction (User Selected)

### Timeline: 18-24 hours

**Week 1 (8-10 hours): TDD RED State - Write Failing Tests**
1. Capability-config test matrix (all permutations)
2. Cross-app integration tests (shared→app imports)
3. Supabase/RLS test harness documentation
4. Commit RED state to git (constitutional evidence)

**Week 2 (10-14 hours): Extraction with GREEN Discipline**
1. Phase 1: Infrastructure extraction (~1,250 LOC)
2. Phase 2: Business logic with capability config (~2,826 LOC) - tests exist = GREEN
3. Phase 3: App migration (clean imports from @workspace/shared)

---

## TDD Protocol Requirements (From test-methodology-guardian)

### BLOCKING: RED-State Tests Required BEFORE Extraction

**Capability-Config Test Matrix:**
```typescript
// @workspace/shared/src/comments/__tests__/capability-config.test.ts

describe('Comment Capabilities - requireAnchors', () => {
  it('FAILS when requireAnchors=true and zero-length anchor provided', () => {
    // RED: This test should FAIL initially
    const result = createComment(supabase, {
      scriptId: 'test',
      content: 'Comment',
      startPosition: 0,  // Zero-length anchor
      endPosition: 0
    }, { requireAnchors: true })

    expect(result.success).toBe(false)
    expect(result.error.code).toBe('VALIDATION_ERROR')
  })

  it('SUCCEEDS when requireAnchors=false and zero-length anchor provided', () => {
    // RED: This test should FAIL initially (cam-op use case)
    const result = createComment(supabase, {
      scriptId: 'test',
      content: 'Script-level comment',
      startPosition: 0,
      endPosition: 0
    }, { requireAnchors: false })

    expect(result.success).toBe(true)
  })
})

describe('Comment Capabilities - enablePositionRecovery', () => {
  it('SUCCEEDS with recovery when enablePositionRecovery=true', () => {
    // RED: Test position recovery path
  })

  it('SKIPS recovery when enablePositionRecovery=false', () => {
    // RED: Test non-recovery path
  })
})

describe('Comment Capabilities - enableTipTapIntegration', () => {
  it('LOADS TipTap extension when enableTipTapIntegration=true', () => {
    // RED: Test TipTap integration
  })

  it('SKIPS TipTap when enableTipTapIntegration=false', () => {
    // RED: Test without TipTap (cam-op use case)
  })
})
```

**Cross-App Integration Tests:**
```typescript
// @workspace/shared/src/__tests__/integration/shared-to-app-imports.test.ts

describe('Shared Package → App Imports', () => {
  it('copy-editor imports comments with strict capabilities', () => {
    // RED: Test copy-editor capability config
    const config = { requireAnchors: true, enablePositionRecovery: true, enableTipTapIntegration: true }
    // Validate imports work, types resolve, build succeeds
  })

  it('cam-op imports comments with flexible capabilities', () => {
    // RED: Test cam-op capability config
    const config = { requireAnchors: false, enablePositionRecovery: false, enableTipTapIntegration: false }
    // Validate zero-length anchors work
  })
})
```

**Supabase/RLS Test Harness:**
- Document test database setup
- RLS policy validation
- User authentication for tests
- Transaction isolation

**Git Evidence:**
- Commit RED-state tests with message: "test: capability-config matrix (RED state - fails before extraction)"
- This provides constitutional evidence per North Star I7

---

## Critical-Engineer Blocking Conditions

**MUST COMPLETE BEFORE ANY EXTRACTION:**

1. **Rollback Runbook** (1 hour)
   - Document: How to revert extraction if production breaks?
   - Test: Can we rollback successfully?
   - Store: `.coord/docs/ROLLBACK-PROCEDURE.md`

2. **Cross-App Validation** (2 hours)
   - Test: scenes-web still works after shared package changes
   - Test: Build all apps with new @workspace/shared
   - Evidence: CI logs showing all apps pass

3. **Capability-Config Test Matrix** (4-6 hours)
   - See TDD protocol above
   - ALL permutations tested
   - RED→GREEN evidence in git

4. **Performance/Bundle Baselines** (1 hour)
   - Capture: copy-editor current performance (TTI, bundle size)
   - Store: `.coord/reports/BASELINE-METRICS.md`
   - Validate: Post-extraction <10% regression acceptable

**MUST COMPLETE BEFORE PHASE 2/3:**

5. **Turborepo Dependency Wiring**
   - Add `dependsOn: ["^build"]` to turbo.json
   - Validate: `pnpm turbo run build` builds shared first

6. **React Query Version Pin**
   - Lock: Exact @tanstack/react-query version during migration
   - Why: Prevent cache API breaking changes mid-migration

7. **Store Validation Artifacts**
   - Logs, metrics, configs saved with reports
   - Evidence trail for rollback decisions

---

## Extraction Sequence (After TDD RED State Satisfied)

### Phase 1: Infrastructure Extraction (2-4 hours)

**Source:** `/Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/`

**Extract to:** `/Volumes/HestAI-Projects/eav-monorepo/packages/shared/src/`

**Components (Already in POC shared, need namespace update):**
- ✅ `components/Header.tsx` (84 LOC)
- ✅ `components/HierarchicalNavigationSidebar.tsx` (213 LOC)
- ✅ `lib/navigation/NavigationProvider.tsx`
- ✅ `lib/navigation/NavigationContext.ts`
- ✅ `lib/auth/`, `lib/client/`, `lib/rls/`
- ✅ `types/database.types.ts`

**Extract from copy-editor:**
```bash
# Auth
mkdir -p packages/shared/src/auth
cp ../eav-monorepo-experimental/apps/copy-editor/src/contexts/AuthContext.tsx \
   packages/shared/src/auth/

# Database
mkdir -p packages/shared/src/database
cp ../eav-monorepo-experimental/apps/copy-editor/src/lib/validation.ts \
   packages/shared/src/database/

# Errors
mkdir -p packages/shared/src/errors
cp ../eav-monorepo-experimental/apps/copy-editor/src/utils/errorHandling.ts \
   packages/shared/src/errors/

# Editor
mkdir -p packages/shared/src/editor/locking
cp ../eav-monorepo-experimental/apps/copy-editor/src/hooks/useScriptLock.ts \
   packages/shared/src/editor/locking/
cp ../eav-monorepo-experimental/apps/copy-editor/src/lib/componentExtraction.ts \
   packages/shared/src/editor/
```

**Validation:**
```bash
pnpm turbo run build --filter=@workspace/shared
pnpm turbo run test --filter=@workspace/shared
pnpm turbo run lint --filter=@workspace/shared
pnpm turbo run typecheck --filter=@workspace/shared
```

---

### Phase 2: Business Logic Extraction (4-6 hours)

**Source:** `/Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/`

**Extract to:** `/Volumes/HestAI-Projects/eav-monorepo/packages/shared/src/`

**Comments Module:**
```bash
mkdir -p packages/shared/src/comments/{domain,state,hooks,extensions,__tests__}

# Domain
cp ../eav-monorepo-experimental/apps/copy-editor/src/lib/comments.ts \
   packages/shared/src/comments/domain/repository.ts
cp ../eav-monorepo-experimental/apps/copy-editor/src/lib/comments-position-recovery.ts \
   packages/shared/src/comments/domain/positionRecovery.ts
cp ../eav-monorepo-experimental/apps/copy-editor/src/types/comments.ts \
   packages/shared/src/comments/domain/types.ts

# Create capability config
cat > packages/shared/src/comments/domain/capabilities.ts <<'EOF'
export interface CommentCapabilities {
  requireAnchors: boolean;
  enablePositionRecovery: boolean;
  enableTipTapIntegration: boolean;
}
EOF

# State
cp ../eav-monorepo-experimental/apps/copy-editor/src/core/state/useCommentMutations.ts \
   packages/shared/src/comments/state/
cp ../eav-monorepo-experimental/apps/copy-editor/src/core/state/useScriptCommentsQuery.ts \
   packages/shared/src/comments/state/useCommentsQuery.ts
cp ../eav-monorepo-experimental/apps/copy-editor/src/core/stores/commentStore.ts \
   packages/shared/src/comments/state/

# Hooks
cp ../eav-monorepo-experimental/apps/copy-editor/src/core/state/useScriptComments.ts \
   packages/shared/src/comments/hooks/useComments.ts

# Extensions
cp ../eav-monorepo-experimental/apps/copy-editor/src/components/extensions/CommentPositionTracker.ts \
   packages/shared/src/comments/extensions/

# Tests (including RED-state capability tests written in Phase 1)
cp ../eav-monorepo-experimental/apps/copy-editor/src/lib/comments.test.ts \
   packages/shared/src/comments/__tests__/
cp ../eav-monorepo-experimental/apps/copy-editor/src/lib/comments-position-recovery.test.ts \
   packages/shared/src/comments/__tests__/
```

**Scripts Module:**
```bash
mkdir -p packages/shared/src/scripts/{domain,hooks}

# Domain
cp ../eav-monorepo-experimental/apps/copy-editor/src/services/scriptService.ts \
   packages/shared/src/scripts/domain/
cp ../eav-monorepo-experimental/apps/copy-editor/src/core/stores/scriptStore.ts \
   packages/shared/src/scripts/domain/

# Hooks
cp ../eav-monorepo-experimental/apps/copy-editor/src/core/state/useScriptMutations.ts \
   packages/shared/src/scripts/hooks/
cp ../eav-monorepo-experimental/apps/copy-editor/src/core/state/useCurrentScript.ts \
   packages/shared/src/scripts/hooks/
```

**Update Capability Config Integration:**
```typescript
// packages/shared/src/comments/domain/repository.ts
import type { CommentCapabilities } from './capabilities'

export async function createComment(
  supabase: SupabaseClient,
  data: CreateCommentData,
  capabilities: CommentCapabilities  // NEW parameter
): Promise<CommentResult> {
  // Validation based on capabilities
  if (capabilities.requireAnchors && data.startPosition === 0) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Text anchors required' }
    }
  }
  // ... rest of function
}
```

**Validation:**
```bash
pnpm turbo run build --filter=@workspace/shared
pnpm turbo run test --filter=@workspace/shared  # Should see GREEN (tests pass now)
pnpm turbo run lint --filter=@workspace/shared
pnpm turbo run typecheck --filter=@workspace/shared
```

**Git Evidence:**
```bash
git add packages/shared/
git commit -m "feat(shared): extract comments + scripts modules (GREEN state - tests pass)

- Capability-config pattern implemented
- All permutations tested (requireAnchors true/false, etc.)
- Position recovery tests pass (12,965 LOC)
- Cross-app integration validated

Phase 2 complete per 002-DOC-COPY-EDITOR-EXTRACTION.md
TDD discipline maintained per North Star I7"
```

---

### Phase 3: App Migration (3-4 hours)

**Objective:** Migrate copy-editor app with clean imports from @workspace/shared

**Copy app structure (excluding extracted code):**
```bash
mkdir -p apps/copy-editor/src

rsync -av --exclude='lib/comments*' \
         --exclude='lib/validation.ts' \
         --exclude='lib/componentExtraction.ts' \
         --exclude='contexts/AuthContext.tsx' \
         --exclude='utils/errorHandling.ts' \
         --exclude='hooks/useScriptLock.ts' \
         --exclude='core/state/useComment*' \
         --exclude='core/state/useScript*' \
         --exclude='core/stores/commentStore.ts' \
         --exclude='core/stores/scriptStore.ts' \
         --exclude='services/scriptService.ts' \
         ../eav-monorepo-experimental/apps/copy-editor/src/ \
         apps/copy-editor/src/
```

**Update imports:**
```typescript
// Before (POC):
import { createComment } from '../lib/comments'
import { AuthContext } from '../contexts/AuthContext'
import { useScriptLock } from '../hooks/useScriptLock'

// After (new monorepo):
import { createComment } from '@workspace/shared/comments'
import { AuthContext } from '@workspace/shared/auth'
import { useScriptLock } from '@workspace/shared/editor'
```

**Configure capability config:**
```typescript
// apps/copy-editor/src/hooks/useComments.ts
import { useComments, type CommentCapabilities } from '@workspace/shared/comments'

// copy-editor: Strict validation
const scriptsWebCapabilities: CommentCapabilities = {
  requireAnchors: true,           // Enforce text anchoring
  enablePositionRecovery: true,   // Use position recovery
  enableTipTapIntegration: true   // Integrate with TipTap
}

const comments = useComments(scriptId, scriptsWebCapabilities)
```

**Validation:**
```bash
pnpm install
pnpm turbo run build --filter=copy-editor
pnpm turbo run test --filter=copy-editor
pnpm turbo run lint --filter=copy-editor
pnpm turbo run typecheck --filter=copy-editor
```

**Cross-App Validation:**
```bash
# Validate scenes-web still works
pnpm turbo run build --filter=scenes-web
pnpm turbo run test --filter=scenes-web

# Build all apps
pnpm turbo run build
```

---

## Success Criteria (From Extraction Guide)

### Phase 1 Success
- ✅ @workspace/shared builds successfully
- ✅ Infrastructure utilities extracted
- ✅ Existing POC tests pass
- ✅ No TypeScript errors

### Phase 2 Success
- ✅ Comments module extracted with capability config
- ✅ Scripts module extracted with state management
- ✅ Position recovery tests pass (12,965 LOC)
- ✅ **Capability config tests pass** (RED→GREEN evidence in git)

### Phase 3 Success
- ✅ Copy-editor app builds successfully
- ✅ All imports resolve to @workspace/shared
- ✅ Quality gates pass (lint 0E, typecheck 0E, tests passing)
- ✅ App runs without runtime errors
- ✅ TipTap editor works with extracted comments
- ✅ **Cross-app validation:** scenes-web still works

### Overall Success
- ✅ One-time refactor completed
- ✅ ~5,400 LOC extracted to shared package
- ✅ Production-grade quality maintained
- ✅ Constitutional compliance validated (North Star I7 TDD)
- ✅ Test coverage preserved + enhanced (capability tests added)

---

## Resumption Instructions

**To resume this work in a new session:**

1. **Run:** `/GET-CONTEXT` (loads PROJECT-CONTEXT, CHECKLIST, etc.)

2. **Read validation reports:**
   ```
   .coord/reports/001-REPORT-TECHNICAL-ARCHITECT-EXTRACTION-REVIEW.md
   .coord/reports/002-REPORT-CRITICAL-ENGINEER-GO-NO-GO.md
   .coord/reports/003-REPORT-TEST-METHODOLOGY-GUARDIAN-TDD-PROTOCOL.md
   ```

3. **Read extraction strategy:**
   ```
   docs/guides/002-DOC-COPY-EDITOR-EXTRACTION.md
   ```

4. **Invoke implementation-lead with Context7 + TDD:**
   ```
   @Task implementation-lead

   MISSION: Execute copy-editor extraction - Option B (TDD-compliant)

   CONTEXT:
   - Read: .coord/SESSION-HANDOFF-COPY-EDITOR-EXTRACTION.md (this file)
   - Read: All validation reports in .coord/reports/
   - Read: docs/guides/002-DOC-COPY-EDITOR-EXTRACTION.md
   - Constitutional: North Star I7 TDD RED discipline MANDATORY

   PROTOCOL:
   1. Week 1 (8-10 hours): Write RED-state capability-config tests
   2. Week 2 Phase 1 (2-4 hours): Infrastructure extraction
   3. Week 2 Phase 2 (4-6 hours): Business logic extraction (GREEN state)
   4. Week 2 Phase 3 (3-4 hours): App migration

   VALIDATION:
   - All blocking conditions from critical-engineer must be met
   - RED→GREEN→REFACTOR discipline throughout
   - Git commits show TDD evidence

   USE:
   - Context7 for React Query, TipTap, Supabase documentation
   - TDD protocol from test-methodology-guardian report
   - Capability-config test matrix specified in this handoff

   Execute with constitutional compliance.
   ```

5. **Monitor RED→GREEN evidence:**
   - Git commits show "test: capability-config (RED state - fails)"
   - Then "feat(shared): extract comments (GREEN state - tests pass)"

---

## Key Contacts (Agents)

- **holistic-orchestrator:** Overall coordination, gap ownership
- **technical-architect:** Architecture validation (already approved conditionally)
- **critical-engineer:** Production risk assessment (already approved conditionally)
- **test-methodology-guardian:** TDD discipline enforcement (blocked - needs RED state)
- **universal-test-engineer:** Write capability-config test matrix (invoke for Week 1)
- **implementation-lead:** Execute extraction (invoke after tests written)

---

## Git Evidence Requirements

**Week 1 (RED State):**
```bash
git add packages/shared/src/comments/__tests__/capability-config.test.ts
git commit -m "test: capability-config matrix (RED state - fails before extraction)

- requireAnchors: true/false permutations
- enablePositionRecovery: true/false paths
- enableTipTapIntegration: true/false scenarios
- Cross-app integration tests

Per North Star I7 TDD RED discipline
Blocks: Phase 2 extraction until GREEN"
```

**Week 2 Phase 2 (GREEN State):**
```bash
git add packages/shared/src/comments/
git commit -m "feat(shared): extract comments module (GREEN state - tests pass)

- Capability-config pattern implemented
- All permutation tests pass
- Position recovery tests pass (12,965 LOC)

Phase 2 complete per 002-DOC-COPY-EDITOR-EXTRACTION.md"
```

---

**Status:** Ready for execution - pending TDD RED-state tests (Week 1)
**Owner:** implementation-lead (after universal-test-engineer writes capability tests)
**Timeline:** 18-24 hours total (8-10 hours tests + 10-14 hours extraction)
**Constitutional Authority:** North Star I7, I8, I11
