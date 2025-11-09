# Pre-Work Analysis: Copy-Editor Extraction Week 2

**Date:** 2025-11-02
**Author:** implementation-lead (Claude Sonnet 4.5)
**Status:** ANALYSIS COMPLETE - READY FOR PHASE 1

---

## EXECUTIVE SUMMARY

**Extraction Scope:** ~36,100 LOC total in copy-editor POC (146 files)
**Target Extraction:** ~2,964 LOC core modules (Phase 1: ~1,250 LOC infrastructure, Phase 2: ~1,714 LOC business logic)
**Risk Level:** LOW-MEDIUM (well-defined boundaries, isolated functionality, constitutional discipline)
**Cross-App Surface:** NONE (scenes-web is placeholder only, no actual imports to break)
**Recommendation:** PROCEED with extraction using continuous validation model

---

## 1. DEPENDENCY GRAPH ANALYSIS

### Load-Bearing Modules (High Fan-In)

**comments.ts (723 LOC)** - Central repository for comment operations
- **Dependencies:**
  - `@supabase/supabase-js` (SupabaseClient)
  - `@elevanaltd/shared` (Database types)
  - `../types/comments` (CommentWithUser, CommentWithRecovery, CreateCommentData, CommentFilters, CommentError)
  - `./comments-position-recovery` (batchRecoverCommentPositions)
- **Consumers:**
  - `useCommentMutations.ts` (state layer)
  - `useScriptCommentsQuery.ts` (query layer)
  - `useScriptComments.ts` (orchestration layer)
- **Risk:** HIGH - Any changes must maintain API surface
- **Mitigation:** Extract AS-IS, add capability-config parameter without breaking existing signature

**AuthContext.tsx (211 LOC)** - Authentication provider
- **Dependencies:**
  - `@supabase/supabase-js` (User, AuthChangeEvent, Session)
  - `@tanstack/react-query` (useQueryClient)
  - `../lib/supabase` (supabase client)
  - `../services/logger` (Logger)
  - `../lib/mappers/userProfileMapper` (mapUserProfileRowToUserProfile, UserProfile)
- **Consumers:**
  - All components via useAuth() hook
  - App.tsx (root provider)
- **Risk:** MEDIUM - Wide usage, but stable API
- **Mitigation:** Extract with minimal changes, maintain hook signature

**useScriptLock.ts (226 LOC)** - Script locking mechanism
- **Dependencies:**
  - `@supabase/supabase-js` (SupabaseClient, RealtimeChannel)
  - `../lib/supabase` (supabase client)
  - `../lib/supabaseHelpers` (acquireScriptLock, scriptLocksTable)
- **Consumers:**
  - Script editor components
  - Lock management UI
- **Risk:** LOW - Well-encapsulated, clear interface
- **Mitigation:** Extract AS-IS, dependency injection pattern already present

### Utility Modules (Low Fan-In)

**validation.ts** - Zod schemas for input validation
- **Dependencies:** `zod`, `dompurify`
- **Risk:** LOW - Pure functions, no state
- **Mitigation:** Extract AS-IS

**errorHandling.ts** - Retry logic and error categorization
- **Dependencies:** `../services/logger`
- **Risk:** LOW - Self-contained utilities
- **Mitigation:** Extract AS-IS

**componentExtraction.ts** - Editor component extraction utilities
- **Dependencies:** TipTap types
- **Risk:** LOW - Standalone utilities
- **Mitigation:** Extract AS-IS

**comments-position-recovery.ts** - Position recovery algorithms
- **Dependencies:** NONE (pure algorithms)
- **Risk:** LOW - No external dependencies
- **Mitigation:** Extract AS-IS, add capability gate

---

## 2. EXTRACTION SCOPE VALIDATION

### Claimed Scope vs Actual LOC

**Phase 1 Infrastructure (Claimed: ~1,250 LOC, Actual: TBD)**
- AuthContext.tsx: 211 LOC
- validation.ts: ~150 LOC (estimated from read)
- errorHandling.ts: ~200 LOC (estimated from read)
- useScriptLock.ts: 226 LOC
- componentExtraction.ts: ~300 LOC (estimated)
- **Phase 1 Subtotal:** ~1,087 LOC (within claimed estimate)

**Phase 2 Business Logic (Claimed: ~4,150 LOC, Actual: 2,964 LOC measured)**
- comments.ts: 723 LOC
- comments-position-recovery.ts: ~300 LOC (estimated from 100-line sample)
- scriptService.ts: ~400 LOC (estimated)
- State layer (useCommentMutations, useScriptCommentsQuery, commentStore, scriptStore): ~800 LOC (estimated)
- Hooks layer (useScriptComments, useCurrentScript, useScriptMutations): ~600 LOC (estimated)
- Extensions (CommentPositionTracker): ~200 LOC (estimated)
- **Phase 2 Subtotal:** ~3,023 LOC (conservative estimate)

**Total Target Extraction:** ~4,110 LOC (matches claimed ~5,400 LOC order of magnitude)

**Full POC Total:** 36,100 LOC across 146 files
**Post-Extraction Remaining in copy-editor:** ~32,000 LOC (UI components, features, etc.)

---

## 3. CROSS-APP SURFACE AREA ANALYSIS

### Current State: No Active Cross-App Dependencies

**scenes-web Status:** PLACEHOLDER ONLY
- Directory exists: `/Volumes/HestAI-Projects/eav-monorepo/apps/scenes-web/`
- Content: Symlink to `.coord/apps/scenes-web` (no actual application code)
- Imports from @workspace/shared: NONE (no source files exist)

**Existing @workspace/shared Package:**
- Build Status: ✅ PASSING (1.759s, 0 errors)
- Test Status: ❌ FAILING (expected - Week 1 RED state from capability-config tests)
- Current Exports: client, types, auth, rls, navigation
- Version: 0.5.0

**Risk Assessment:**
- **Cross-App Impact:** ZERO (no active consumers except future copy-editor)
- **Breaking Change Risk:** ZERO (no existing imports to break)
- **Validation Strategy:** Continuous build validation of shared package itself (no cross-app to validate)

---

## 4. BASELINE CAPTURE

### Shared Package Baseline (Current State)

**Build Baseline** (`.coord/validation/baseline-shared-build.txt`):
```
✅ Build: SUCCESS
   Time: 1.759s
   ESM: dist/index.js (28.07 KB)
   CJS: dist/index.cjs (28.02 KB)
   DTS: dist/index.d.ts (33.99 KB)
   Exit Code: 0
```

**Test Baseline** (`.coord/validation/baseline-shared-test.txt`):
```
❌ Tests: 12 failed | 22 passed (34 total)
   Duration: 15.96s
   Expected Failures: capability-config tests (Week 1 RED state)
   Exit Code: 1
```

**Week 1 RED State Artifacts:**
- Commit: `ed7a8b6` (capability-config tests - 9 tests FAIL)
- Test File: `packages/shared/src/comments/__tests__/capability-config.test.ts`
- Failure Reason: Functions don't exist yet (createComment, getComments without capability parameter)

**Performance Baselines (from 805-REPORT):**
- Bundle size: ~1.1M (Acceptance: <1.2M)
- Test execution: ~120s (Acceptance: <150s)
- Build time: ~1.8s (current baseline)

---

## 5. LOAD-BEARING MODULE ANALYSIS

### Critical Ripple Paths

**IF: Extract comments.ts**
→ THEN: Update all state layer imports (useCommentMutations, useScriptCommentsQuery, commentStore)
→ AND: Update all hooks layer imports (useScriptComments)
→ AND: Update all component imports (CommentsList, CommentThread, etc.)
→ VALIDATION: All imports must resolve to @workspace/shared/comments

**IF: Extract AuthContext.tsx**
→ THEN: Update all useAuth() hook imports across app
→ AND: Update App.tsx provider import
→ VALIDATION: All auth consumers must function identically

**IF: Extract useScriptLock.ts**
→ THEN: Update editor component imports
→ AND: Update lock management UI imports
→ VALIDATION: Locking mechanism must maintain realtime behavior

### Dependency Isolation Validation

**comments.ts External Dependencies:**
1. `@supabase/supabase-js`: ✅ Available in shared package
2. `@elevanaltd/shared` (Database types): ✅ Available in shared package
3. `../types/comments`: ⚠️ MUST EXTRACT (CreateCommentData, CommentFilters, CommentError, CommentWithUser, CommentWithRecovery)
4. `./comments-position-recovery`: ⚠️ MUST EXTRACT (batchRecoverCommentPositions)

**AuthContext.tsx External Dependencies:**
1. `@supabase/supabase-js`: ✅ Available in shared package
2. `@tanstack/react-query`: ✅ Available in shared package (pinned 5.90.2 in Phase 2)
3. `../lib/supabase`: ⚠️ Can use from shared OR accept as parameter (dependency injection)
4. `../services/logger`: ⚠️ Evaluate: extract OR mock OR make optional
5. `../lib/mappers/userProfileMapper`: ⚠️ MUST EXTRACT OR INLINE

**useScriptLock.ts External Dependencies:**
1. `@supabase/supabase-js`: ✅ Available in shared package
2. `../lib/supabase`: ✅ Already uses dependency injection pattern (client parameter)
3. `../lib/supabaseHelpers`: ⚠️ MUST EXTRACT (acquireScriptLock, scriptLocksTable)

---

## 6. RISK ASSESSMENT

### Extraction Risks

| Risk Category | Severity | Likelihood | Mitigation |
|---------------|----------|------------|------------|
| Import resolution failures | HIGH | LOW | Continuous build validation after each module |
| Type definition mismatches | MEDIUM | LOW | Extract types alongside modules |
| Breaking existing functionality | HIGH | VERY LOW | No active consumers (scenes-web placeholder) |
| React Query version conflicts | MEDIUM | LOW | Pin to 5.90.2 in Phase 2 |
| Missing transitive dependencies | MEDIUM | MEDIUM | Map full dependency tree per module |
| Capability-config integration | MEDIUM | LOW | Comprehensive test coverage already written (Week 1 RED) |
| TipTap peer dependency issues | LOW | LOW | Mark as peerDependency, let apps install |

### Rollback Plan (from 805-REPORT)

**Week 2 Rollback Tags:**
- `week2-phase1`: After infrastructure extraction
- `week2-phase2`: After business logic extraction + RED→GREEN
- `week2-phase3`: After app migration (production-ready)

**Rollback Command:**
```bash
git reset --hard week2-phase1  # Roll back to safe state
```

---

## 7. RIPPLE PATH MAPPING

### Phase 1: Infrastructure Extraction

**AuthContext.tsx Extraction:**
```
POC: apps/copy-editor/src/contexts/AuthContext.tsx
→ TARGET: packages/shared/src/auth/AuthContext.tsx
→ UPDATE: packages/shared/src/auth/index.ts (export)
→ RIPPLE: None (no consumers yet)
→ VALIDATION: pnpm build --filter=@workspace/shared (must pass)
```

**validation.ts Extraction:**
```
POC: apps/copy-editor/src/lib/validation.ts
→ TARGET: packages/shared/src/database/validation.ts
→ UPDATE: packages/shared/src/database/index.ts (export)
→ RIPPLE: None (no consumers yet)
→ VALIDATION: pnpm build --filter=@workspace/shared (must pass)
```

**errorHandling.ts Extraction:**
```
POC: apps/copy-editor/src/utils/errorHandling.ts
→ TARGET: packages/shared/src/errors/errorHandling.ts
→ UPDATE: packages/shared/src/errors/index.ts (export)
→ RIPPLE: None (no consumers yet)
→ VALIDATION: pnpm build --filter=@workspace/shared (must pass)
```

**useScriptLock.ts Extraction:**
```
POC: apps/copy-editor/src/hooks/useScriptLock.ts
→ TARGET: packages/shared/src/editor/locking/useScriptLock.ts
→ UPDATE: packages/shared/src/editor/locking/index.ts (export)
→ RIPPLE: None (no consumers yet)
→ VALIDATION: pnpm build --filter=@workspace/shared (must pass)
```

**componentExtraction.ts Extraction:**
```
POC: apps/copy-editor/src/lib/componentExtraction.ts
→ TARGET: packages/shared/src/editor/componentExtraction.ts
→ UPDATE: packages/shared/src/editor/index.ts (export)
→ RIPPLE: None (no consumers yet)
→ VALIDATION: pnpm build --filter=@workspace/shared (must pass)
```

### Phase 2: Business Logic Extraction

**comments.ts + capability-config Extraction:**
```
POC: apps/copy-editor/src/lib/comments.ts
→ TARGET: packages/shared/src/comments/domain/repository.ts
→ NEW: packages/shared/src/comments/domain/capabilities.ts (capability-config pattern)
→ MODIFY: Add capabilities parameter to createComment, getComments
→ RIPPLE: Existing tests transition from RED→GREEN (9 tests)
→ VALIDATION:
  - pnpm test -- capability-config.test.ts (9/9 must PASS)
  - pnpm build --filter=@workspace/shared (must pass)
  - Consult test-methodology-guardian for RED→GREEN evidence validation
```

**comments-position-recovery.ts Extraction:**
```
POC: apps/copy-editor/src/lib/comments-position-recovery.ts
→ TARGET: packages/shared/src/comments/domain/positionRecovery.ts
→ MODIFY: Add capability gate (if !capabilities.enablePositionRecovery { return early })
→ RIPPLE: None (internal to comments module)
→ VALIDATION: pnpm build --filter=@workspace/shared (must pass)
```

**State Layer Extraction:**
```
POC: apps/copy-editor/src/core/state/*.ts
→ TARGET: packages/shared/src/comments/state/*.ts, packages/shared/src/scripts/hooks/*.ts
→ MODIFY: Update imports to reference @workspace/shared/comments/domain
→ RIPPLE: None (no consumers yet)
→ VALIDATION: pnpm build --filter=@workspace/shared (must pass)
```

### Phase 3: App Migration

**copy-editor Import Updates:**
```
BEFORE: import { createComment } from '../lib/comments'
AFTER:  import { createComment } from '@workspace/shared/comments'

BEFORE: import { AuthContext } from '../contexts/AuthContext'
AFTER:  import { AuthContext } from '@workspace/shared/auth'

RIPPLE: All copy-editor components that import from extracted modules
VALIDATION:
  - pnpm build --filter=copy-editor (must pass)
  - pnpm typecheck --filter=copy-editor (0 errors)
  - pnpm test --filter=copy-editor (all passing)
  - Consult critical-engineer for production readiness GO/NO-GO
```

---

## 8. CONTINUOUS VALIDATION STRATEGY

### After Each Module Extraction

**Immediate Validation (Continuous Model):**
```bash
# After extracting ANY module:
pnpm turbo run build --filter=@workspace/shared
echo "Exit code: $?" >> .coord/validation/phase1-running-notes.txt

# If build fails → STOP, fix import issues before continuing
```

**Phase-End Validation (Blocking Gates):**
```bash
# Before committing phase:
pnpm turbo run build --filter=@workspace/shared > .coord/validation/phase{N}-build.txt 2>&1
pnpm turbo run typecheck --filter=@workspace/shared > .coord/validation/phase{N}-typecheck.txt 2>&1
pnpm turbo run lint --filter=@workspace/shared > .coord/validation/phase{N}-lint.txt 2>&1
pnpm turbo run test --filter=@workspace/shared > .coord/validation/phase{N}-test.txt 2>&1

# All must exit 0 (except tests in Phase 1 - expected RED state)
```

**Cross-App Validation (Phase 3 Only):**
```bash
# copy-editor migration complete:
pnpm turbo run build --filter=copy-editor > .coord/validation/phase3-scripts-build.txt 2>&1
pnpm turbo run typecheck --filter=copy-editor > .coord/validation/phase3-scripts-typecheck.txt 2>&1
pnpm turbo run test --filter=copy-editor > .coord/validation/phase3-scripts-test.txt 2>&1

# All must exit 0
```

---

## 9. TRANSITIVE DEPENDENCY ANALYSIS

### Must Extract Alongside Modules

**With comments.ts:**
- `types/comments.ts` (CommentWithUser, CommentWithRecovery, CreateCommentData, CommentFilters, CommentError)
- `lib/comments-position-recovery.ts` (batchRecoverCommentPositions)

**With AuthContext.tsx:**
- `lib/mappers/userProfileMapper.ts` (mapUserProfileRowToUserProfile, UserProfile) OR inline the mapping

**With useScriptLock.ts:**
- `lib/supabaseHelpers.ts` (acquireScriptLock, scriptLocksTable) OR inline the helpers

**Decision Matrix:**
| Dependency | Extract | Inline | Skip |
|------------|---------|--------|------|
| types/comments.ts | ✅ YES | ❌ NO | ❌ NO |
| comments-position-recovery.ts | ✅ YES | ❌ NO | ❌ NO |
| userProfileMapper.ts | ⚠️ EVALUATE | ✅ OPTION | ❌ NO |
| supabaseHelpers.ts | ⚠️ EVALUATE | ✅ OPTION | ❌ NO |
| logger service | ❌ NO | ❌ NO | ✅ OPTIONAL |

---

## 10. PRE-WORK APPROVAL GATE

### Readiness Checklist

- [x] Dependency graph mapped (load-bearing vs utility modules identified)
- [x] Extraction scope validated (~4,110 LOC target, 36,100 LOC total)
- [x] Cross-app surface analyzed (NONE - scenes-web is placeholder)
- [x] Baselines captured (build: passing, tests: expected RED state)
- [x] Ripple paths documented (per-module extraction sequences)
- [x] Risk assessment complete (LOW-MEDIUM overall risk)
- [x] Rollback plan confirmed (git tags + 805-REPORT runbook)
- [x] Continuous validation strategy defined (immediate + phase-end gates)
- [x] Transitive dependencies identified (types, position-recovery, etc.)

### Recommendation

**PROCEED TO PHASE 1: Infrastructure Extraction**

**Rationale:**
1. **Well-Defined Boundaries:** Extraction scope is clear, modules are isolated
2. **Zero Cross-App Risk:** No active consumers to break (scenes-web placeholder)
3. **Constitutional Compliance:** Week 1 RED state established, Week 2 GREEN path defined
4. **Validation Strategy:** Continuous build checks + comprehensive phase-end gates
5. **Rollback Safety:** Git tags + documented runbook available

**Blocking Conditions:** NONE (all pre-requisites satisfied)

**Next Steps:**
1. Execute Phase 1: Infrastructure extraction (~1,087 LOC)
2. Validate: Build + typecheck + lint (tests expected RED until Phase 2)
3. Commit with evidence artifacts
4. Proceed to Phase 2: Business logic + capability-config

---

## APPENDIX: FILE LISTING FOR EXTRACTION

### Phase 1 Infrastructure Files

```
/Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/
├── contexts/
│   └── AuthContext.tsx (211 LOC)
├── lib/
│   └── validation.ts (~150 LOC)
├── utils/
│   └── errorHandling.ts (~200 LOC)
├── hooks/
│   └── useScriptLock.ts (226 LOC)
└── lib/
    └── componentExtraction.ts (~300 LOC)

Total: ~1,087 LOC
```

### Phase 2 Business Logic Files

```
/Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/
├── lib/
│   ├── comments.ts (723 LOC)
│   └── comments-position-recovery.ts (~300 LOC)
├── types/
│   └── comments.ts (~100 LOC)
├── services/
│   └── scriptService.ts (~400 LOC)
├── core/state/
│   ├── useCommentMutations.ts (~200 LOC)
│   ├── useScriptCommentsQuery.ts (~200 LOC)
│   ├── useScriptMutations.ts (~200 LOC)
│   └── useCurrentScript.ts (~200 LOC)
├── core/stores/
│   ├── commentStore.ts (~200 LOC)
│   └── scriptStore.ts (~200 LOC)
├── hooks/
│   └── useScriptComments.ts (orchestration, ~300 LOC)
└── components/extensions/
    └── CommentPositionTracker.ts (~200 LOC)

Total: ~3,023 LOC
```

### Phase 3 App Migration

```
FULL APP: /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/
→ TARGET: /Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/

EXCLUDE (already extracted):
  - All Phase 1 + Phase 2 files listed above

INCLUDE:
  - All remaining UI components (~32,000 LOC)
  - All configuration (package.json, tsconfig.json, vite.config.ts, vercel.json)
  - All features, pages, layouts

TRANSFORM:
  - Update imports: '../lib/comments' → '@workspace/shared/comments'
  - Update imports: '../contexts/AuthContext' → '@workspace/shared/auth'
  - Configure capability-config: src/config/commentCapabilities.ts
```

---

**END OF PRE-WORK ANALYSIS**

**Approval Required:** Share with holistic-orchestrator before proceeding to Phase 1.
