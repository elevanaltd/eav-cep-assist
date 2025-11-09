# Copy-Editor Migration: Holistic Extraction Strategy

**Status:** Architectural Recommendation (Pending Validation)
**Date:** 2025-11-01
**Constitutional Authority:** North Star I6 (Component Spine + App State), I8 (Production-Grade Quality), I11 (Independent Deployment)

---

## Executive Summary

**Problem:** Copy-editor POC (production-deployed) contains ~5,400 LOC of shared code across infrastructure, business logic, and UI components. Migrating the app without extracting shared components first would create iterative refactor cycles ("death by 1000 cuts").

**Solution:** Execute one-time extraction of production-validated code from POC `@elevanaltd/shared` → new monorepo `@workspace/shared` BEFORE migrating copy-editor app source.

**Evidence:** POC already extracted Header (84 LOC), HierarchicalNavigationSidebar (213 LOC), NavigationProvider/Context, and shared utilities - proven to be used by BOTH copy-editor AND scenes-web in production.

**Recommendation:** 3-phase extraction strategy:
1. **Phase 1:** Infrastructure utilities (auth, database, errors) - ~1,250 LOC
2. **Phase 2:** Business logic with capability config (comments, scripts state management) - ~2,826 LOC
3. **Phase 3:** Migrate copy-editor app (clean imports from @workspace/shared)

**Timeline:** 10-14 hours (one-time refactor) vs ongoing iterative cycles

---

## Background

### Current State

**POC Structure (`/Volumes/HestAI-Projects/eav-monorepo-experimental/`):**
```
packages/shared/                    # @elevanaltd/shared (v0.5.0)
  ├── src/
  │   ├── components/
  │   │   ├── Header.tsx                        # 84 LOC (scripts + scenes)
  │   │   ├── HierarchicalNavigationSidebar.tsx # 213 LOC (scripts + scenes)
  │   │   └── AutocompleteField.tsx             # Form component
  │   ├── lib/
  │   │   ├── navigation/
  │   │   │   ├── NavigationProvider.tsx        # (scripts + scenes)
  │   │   │   └── NavigationContext.ts
  │   │   ├── auth/                             # Auth utilities
  │   │   ├── client/                           # Supabase helpers
  │   │   └── rls/                              # RLS testing
  │   └── types/
  │       └── database.types.ts                 # Supabase types

apps/copy-editor/src/               # 161 files surveyed
  ├── lib/
  │   ├── comments.ts                           # 722 LOC (not yet extracted)
  │   ├── comments-position-recovery.ts         # 327 LOC
  │   ├── validation.ts                         # 288 LOC
  │   └── componentExtraction.ts                # 117 LOC
  ├── core/state/
  │   ├── useScriptComments.ts                  # 340 LOC (orchestration)
  │   ├── useCommentMutations.ts                # 294 LOC
  │   └── useScriptMutations.ts                 # 145 LOC
  ├── contexts/
  │   └── AuthContext.tsx                       # 210 LOC
  ├── hooks/
  │   └── useScriptLock.ts                      # 225 LOC
  └── [app-specific UI components]

apps/scenes-web/src/
  └── App.tsx                                   # imports Header from @elevanaltd/shared
  └── components/ScenesNavigationContainer.tsx  # imports HierarchicalNavigationSidebar
```

**New Monorepo Target (`/Volumes/HestAI-Projects/eav-monorepo/`):**
```
packages/shared/                    # @workspace/shared (migrated from POC)
  └── src/
      ├── [POC content + extracted copy-editor code]

apps/copy-editor/                   # To be migrated
  └── src/
      ├── [app-specific code]
      └── [imports from @workspace/shared]
```

### Key Discovery

**User Insight (Validated):** Header and HierarchicalNavigationSidebar are ALREADY extracted to `@elevanaltd/shared` in POC and used by BOTH copy-editor and scenes-web. This confirms universal reuse pattern - these are NOT app-specific.

**Surveyor Analysis:** Identified 20 additional extraction candidates (~5,400 LOC) in copy-editor that follow same pattern:
- Pure infrastructure (auth, validation, error handling)
- Business logic with multi-app potential (comments, scripts state)
- UI components already proven in scenes-web

---

## Architectural Analysis

### Extraction Tiers

#### **TIER 1: INFRASTRUCTURE (Extract Immediately)**
*Production-validated utilities with zero app coupling*

**From POC `@elevanaltd/shared` (already extracted, need namespace update):**
```
@workspace/shared/src/
├── components/
│   ├── Header.tsx                           # 84 LOC - Universal header (scripts + scenes)
│   ├── HierarchicalNavigationSidebar.tsx    # 213 LOC - Nav sidebar (scripts + scenes)
│   └── AutocompleteField.tsx                # Form component
├── lib/
│   ├── navigation/
│   │   ├── NavigationProvider.tsx           # Selection state (scripts + scenes)
│   │   └── NavigationContext.ts
│   ├── auth/                                # Auth utilities
│   ├── client/                              # Supabase helpers (buildClientQuery, etc.)
│   └── rls/                                 # RLS testing utilities
└── types/
    └── database.types.ts                    # Supabase schema types
```

**From copy-editor (to be extracted):**
```
@workspace/shared/src/
├── auth/
│   └── AuthContext.tsx                      # 210 LOC - Session lifecycle
├── database/
│   ├── validation.ts                        # 288 LOC - Zod schemas
│   └── supabaseHelpers.ts                   # Additional utilities
├── errors/
│   └── errorHandling.ts                     # 408 LOC - Error UX patterns
└── editor/
    ├── componentExtraction.ts               # 117 LOC - Paragraph→component transform
    └── locking/
        └── useScriptLock.ts                 # 225 LOC - Edit collision prevention
```

**Total TIER 1:** ~1,550 LOC (POC existing + new extraction)

**Risk:** LOW - Pure infrastructure, zero app coupling
**Evidence:** POC components used by 2+ apps in production

---

#### **TIER 2: BUSINESS LOGIC (Extract with Capability Config)**
*Per technical-architect guidance - requires capability pattern for flexibility*

```
@workspace/shared/src/
├── comments/
│   ├── domain/
│   │   ├── types.ts                         # 163 LOC - Type definitions
│   │   ├── capabilities.ts                  # NEW - Feature flags per app
│   │   ├── repository.ts                    # 722 LOC - CRUD operations
│   │   └── positionRecovery.ts              # 327 LOC - Anchor recovery
│   ├── state/
│   │   ├── useCommentMutations.ts           # 294 LOC - TanStack mutations
│   │   ├── useCommentsQuery.ts              # 48 LOC - RLS-safe reads
│   │   └── commentStore.ts                  # 98 LOC - Optimistic updates
│   ├── hooks/
│   │   └── useComments.ts                   # 340 LOC - Orchestration facade
│   └── extensions/
│       └── CommentPositionTracker.ts        # 120 LOC - TipTap extension
├── scripts/
│   ├── domain/
│   │   ├── scriptService.ts                 # 504 LOC - Lifecycle operations
│   │   └── scriptStore.ts                   # 71 LOC - Save status
│   └── hooks/
│       ├── useScriptMutations.ts            # 145 LOC - Mutation orchestration
│       └── useCurrentScript.ts              # 114 LOC - Unified facade
```

**Capability Config Pattern (NEW):**
```typescript
// @workspace/shared/src/comments/domain/capabilities.ts
export interface CommentCapabilities {
  requireAnchors: boolean;          // copy-editor: true, cam-op: false
  enablePositionRecovery: boolean;  // copy-editor: true, others: evaluate
  enableTipTapIntegration: boolean; // copy-editor: true, scenes: TBD
}

// Usage in apps:
// copy-editor: repository.create(..., { requireAnchors: true })
// cam-op: repository.create(..., { requireAnchors: false })
```

**Total TIER 2:** ~2,946 LOC

**Risk:** MEDIUM - Requires TipTap integration validation, React Query cache patterns
**Mitigation:** Extract with existing tests (comments.test.ts = 12,965 LOC position recovery tests)
**Evidence:** Comments used in copy-editor production, cam-op prototype validated pattern

---

#### **TIER 3: APP-SPECIFIC UI (Defer or Keep Local)**
*Per technical-architect: "pending design convergence"*

**Keep in apps/copy-editor/:**
- Page layouts (app-specific routing)
- TipTapEditor wrapper (editor-specific configuration)
- Settings modals (app-specific features)
- Script-specific forms

**Rationale:**
- Technical-architect flagged UI components as needing multi-app validation
- Current surveyor evidence shows divergence in page structure
- Header + Navigation already extracted (proven universal), others need 2nd consumer

**Total Deferred:** ~650 LOC

---

## Migration Sequence

### **PHASE 1: Namespace Migration + Infrastructure Extraction**

**Objective:** Update POC `@elevanaltd/shared` → `@workspace/shared` + add infrastructure utilities from copy-editor

**Steps:**

1. **Verify current @workspace/shared migration** (already complete per PROJECT-CHECKLIST.md)
   ```bash
   # Confirm packages/shared exists with POC content
   ls -la /Volumes/HestAI-Projects/eav-monorepo/packages/shared/
   ```

2. **Extract Infrastructure from copy-editor POC**
   ```bash
   # Copy infrastructure utilities
   mkdir -p packages/shared/src/auth
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/contexts/AuthContext.tsx \
      packages/shared/src/auth/

   mkdir -p packages/shared/src/database
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/lib/validation.ts \
      packages/shared/src/database/

   mkdir -p packages/shared/src/errors
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/utils/errorHandling.ts \
      packages/shared/src/errors/

   mkdir -p packages/shared/src/editor/locking
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/hooks/useScriptLock.ts \
      packages/shared/src/editor/locking/

   mkdir -p packages/shared/src/editor
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/lib/componentExtraction.ts \
      packages/shared/src/editor/
   ```

3. **Update package.json exports**
   ```json
   {
     "exports": {
       "./auth": {
         "types": "./dist/auth/index.d.ts",
         "import": "./dist/auth/index.js",
         "require": "./dist/auth/index.cjs"
       },
       "./database": {
         "types": "./dist/database/index.d.ts",
         "import": "./dist/database/index.js",
         "require": "./dist/database/index.cjs"
       },
       "./errors": {
         "types": "./dist/errors/index.d.ts",
         "import": "./dist/errors/index.js",
         "require": "./dist/errors/index.cjs"
       },
       "./editor": {
         "types": "./dist/editor/index.d.ts",
         "import": "./dist/editor/index.js",
         "require": "./dist/editor/index.cjs"
       }
     }
   }
   ```

4. **Build + validate**
   ```bash
   pnpm turbo run build --filter=@workspace/shared
   pnpm turbo run test --filter=@workspace/shared
   ```

**Timeline:** 2-4 hours
**Validation:** Build succeeds, existing tests pass

---

### **PHASE 2: Business Logic Extraction (Comments + Scripts)**

**Objective:** Extract comments and scripts state management with capability config pattern

**Steps:**

1. **Create capability config structure**
   ```bash
   mkdir -p packages/shared/src/comments/domain
   cat > packages/shared/src/comments/domain/capabilities.ts <<'EOF'
   export interface CommentCapabilities {
     requireAnchors: boolean;
     enablePositionRecovery: boolean;
     enableTipTapIntegration: boolean;
   }
   EOF
   ```

2. **Extract comments module**
   ```bash
   mkdir -p packages/shared/src/comments/{domain,state,hooks,extensions}

   # Domain layer
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/lib/comments.ts \
      packages/shared/src/comments/domain/repository.ts
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/lib/comments-position-recovery.ts \
      packages/shared/src/comments/domain/positionRecovery.ts
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/types/comments.ts \
      packages/shared/src/comments/domain/types.ts

   # State layer
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/core/state/useCommentMutations.ts \
      packages/shared/src/comments/state/
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/core/state/useScriptCommentsQuery.ts \
      packages/shared/src/comments/state/useCommentsQuery.ts
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/core/stores/commentStore.ts \
      packages/shared/src/comments/state/

   # Hooks layer
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/core/state/useScriptComments.ts \
      packages/shared/src/comments/hooks/useComments.ts

   # TipTap extension
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/components/extensions/CommentPositionTracker.ts \
      packages/shared/src/comments/extensions/
   ```

3. **Extract scripts module**
   ```bash
   mkdir -p packages/shared/src/scripts/{domain,hooks}

   # Domain layer
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/services/scriptService.ts \
      packages/shared/src/scripts/domain/
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/core/stores/scriptStore.ts \
      packages/shared/src/scripts/domain/

   # Hooks layer
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/core/state/useScriptMutations.ts \
      packages/shared/src/scripts/hooks/
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/core/state/useCurrentScript.ts \
      packages/shared/src/scripts/hooks/
   ```

4. **Update imports to use capability config**
   ```typescript
   // Example: packages/shared/src/comments/domain/repository.ts
   import type { CommentCapabilities } from './capabilities'

   export async function createComment(
     supabase: SupabaseClient,
     data: CreateCommentData,
     capabilities: CommentCapabilities
   ): Promise<CommentResult> {
     if (capabilities.requireAnchors && data.startPosition === 0) {
       return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Anchors required' }}
     }
     // ... rest of function
   }
   ```

5. **Migrate tests**
   ```bash
   mkdir -p packages/shared/src/comments/__tests__
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/lib/comments.test.ts \
      packages/shared/src/comments/__tests__/
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/lib/comments-position-recovery.test.ts \
      packages/shared/src/comments/__tests__/
   ```

6. **Update package.json exports**
   ```json
   {
     "exports": {
       "./comments": {
         "types": "./dist/comments/index.d.ts",
         "import": "./dist/comments/index.js"
       },
       "./scripts": {
         "types": "./dist/scripts/index.d.ts",
         "import": "./dist/scripts/index.js"
       }
     }
   }
   ```

7. **Build + test**
   ```bash
   pnpm turbo run build --filter=@workspace/shared
   pnpm turbo run test --filter=@workspace/shared
   ```

**Timeline:** 4-6 hours
**Validation:**
- Build succeeds
- Existing tests pass (12,965 LOC comments position recovery tests)
- Capability config pattern validated

---

### **PHASE 3: Migrate Copy-Editor App**

**Objective:** Migrate copy-editor app source with clean imports from @workspace/shared

**Steps:**

1. **Copy app structure (excluding extracted code)**
   ```bash
   mkdir -p apps/copy-editor/src

   # Copy app-specific directories only
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
            /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/src/ \
            apps/copy-editor/src/
   ```

2. **Update imports to @workspace/shared**
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

3. **Update capability config usage**
   ```typescript
   // apps/copy-editor/src/hooks/useComments.ts
   import { useComments } from '@workspace/shared/comments'

   const commentsConfig: CommentCapabilities = {
     requireAnchors: true,           // copy-editor enforces text anchoring
     enablePositionRecovery: true,   // copy-editor uses position recovery
     enableTipTapIntegration: true   // copy-editor uses TipTap
   }

   const comments = useComments(scriptId, commentsConfig)
   ```

4. **Copy app-specific configuration**
   ```bash
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/package.json \
      apps/copy-editor/
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/tsconfig.json \
      apps/copy-editor/
   cp /Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/vite.config.ts \
      apps/copy-editor/
   ```

5. **Update dependencies to @workspace/shared**
   ```json
   {
     "dependencies": {
       "@workspace/shared": "workspace:*",
       "@supabase/supabase-js": "^2.76.1",
       "react": "^18.3.1",
       "@tanstack/react-query": "^5.90.5"
     }
   }
   ```

6. **Install + build + test**
   ```bash
   pnpm install
   pnpm turbo run build --filter=copy-editor
   pnpm turbo run test --filter=copy-editor
   pnpm turbo run lint --filter=copy-editor
   pnpm turbo run typecheck --filter=copy-editor
   ```

**Timeline:** 3-4 hours
**Validation:**
- All quality gates pass (lint, typecheck, test)
- App builds successfully
- Imports resolve correctly
- No runtime errors

---

## Risk Assessment

### Risk 1: TipTap Integration Breaks
**Probability:** MEDIUM
**Impact:** HIGH (editor unusable)
**Mitigation:**
- Extract `CommentPositionTracker.ts` (TipTap extension) with comments module
- Run existing position recovery tests (12,965 LOC)
- Test with actual TipTap editor instance in copy-editor

**Validation:**
```bash
pnpm --filter copy-editor test -- comments-position-recovery
```

---

### Risk 2: React Query Cache Invalidation Issues
**Probability:** MEDIUM
**Impact:** MEDIUM (stale data, optimistic updates fail)
**Mitigation:**
- Extract complete state layer (mutations + queries + stores together)
- Preserve cache key patterns
- Test optimistic update flows

**Validation:**
```bash
# Test comment mutations with optimistic updates
pnpm --filter copy-editor test -- useCommentMutations
```

---

### Risk 3: Capability Config Complexity
**Probability:** LOW
**Impact:** MEDIUM (apps can't customize behavior)
**Mitigation:**
- Start simple: boolean flags only
- Document usage patterns clearly
- Provide sensible defaults

**Validation:**
- Cam-op adapter test (zero-length anchors work with `requireAnchors: false`)
- Copy-editor test (strict validation with `requireAnchors: true`)

---

### Risk 4: Missing Dependencies
**Probability:** LOW
**Impact:** MEDIUM (build failures)
**Mitigation:**
- Surveyor already mapped dependencies (React, Supabase, TanStack Query)
- POC shared package already has peer dependencies configured
- Test build after each phase

**Validation:**
```bash
pnpm turbo run build
```

---

### Risk 5: Test Migration Failures
**Probability:** LOW
**Impact:** HIGH (lose test coverage)
**Mitigation:**
- Copy tests WITH source code (comments.test.ts, position-recovery.test.ts)
- Maintain 1:1 test:code ratio
- Run tests after extraction to validate

**Validation:**
```bash
pnpm --filter @workspace/shared test
# Expect: 12,965 LOC position recovery tests pass
```

---

## Constitutional Compliance

### North Star Alignment

**I6: Component Spine with App-Specific State ✅**
- Extraction follows proven pattern: shared business logic, app-specific UI configuration
- Capability config allows apps to customize behavior while sharing core logic

**I8: Production-Grade Quality from Day One ✅**
- Extracting production-deployed POC code (not prototypes)
- Migrating comprehensive test suite (12,965 LOC position recovery tests)
- No "we'll clean it up later" technical debt

**I7: TDD Discipline ✅**
- Tests migrate WITH code
- Test-first approach maintained (RED→GREEN→REFACTOR)
- Quality gates enforced (lint, typecheck, test all must pass)

**I11: Independent Deployment Architecture ✅**
- Shared package bundles at build time (per deployment guide)
- No runtime coupling to monorepo structure
- Each app deploys independently with bundled shared code

### DECISIONS.md Compliance

**Single Shared Package ✅**
- Consolidates all shared code into `@workspace/shared`
- No separate lib + ui packages (simplified from POC's `@elevanaltd/shared-lib` + types)

**Monorepo Architecture ✅**
- Shared code reuse without runtime coupling
- Turborepo builds shared package first, then apps bundle with dist/

---

## Validation Chain

Before proceeding with extraction, the following validations are required:

### 1. Technical-Architect Review
**Objective:** Validate extraction architecture against scenes-web and full POC structure
**Scope:**
- Review `/Volumes/HestAI-Projects/eav-monorepo-experimental/apps/scenes-web`
- Assess full POC directory structure
- Validate 3-tier extraction strategy
**Deliverable:** Report at `.coord/reports/01-technical-architect-extraction-review.md`

### 2. Critical-Engineer GO/NO-GO
**Objective:** Production readiness assessment
**Scope:**
- Review technical-architect findings
- Assess production risk (what breaks in production?)
- Validate quality gates (lint, typecheck, test)
**Deliverable:** Report at `.coord/reports/02-critical-engineer-go-no-go.md`

### 3. Test-Methodology-Guardian TDD Protocol
**Objective:** Ensure TDD discipline during migration
**Scope:**
- Validate test migration strategy
- Confirm RED→GREEN→REFACTOR pattern maintained
- Assess test coverage preservation
**Deliverable:** Report at `.coord/reports/03-test-methodology-guardian-tdd-protocol.md`

### 4. Implementation Decision
**Objective:** Execute extraction OR escalate conflicts to user
**Criteria:**
- All reports show GO status
- No unresolved architectural conflicts
- TDD protocol validated
**Outcome:**
- **IF all clear:** Invoke implementation-lead with full context
- **IF conflicts:** Present holistic-orchestrator assessment to user

---

## Success Criteria

### Phase 1 Success
- ✅ @workspace/shared builds successfully
- ✅ Infrastructure utilities extracted (auth, database, errors, editor)
- ✅ Existing POC tests pass
- ✅ No TypeScript errors

### Phase 2 Success
- ✅ Comments module extracted with capability config
- ✅ Scripts module extracted with state management
- ✅ Position recovery tests pass (12,965 LOC)
- ✅ Capability config pattern validated

### Phase 3 Success
- ✅ Copy-editor app builds successfully
- ✅ All imports resolve to @workspace/shared
- ✅ Quality gates pass (lint 0E, typecheck 0E, tests passing)
- ✅ App runs without runtime errors
- ✅ TipTap editor works with extracted comments

### Overall Success
- ✅ One-time refactor completed (not iterative cycles)
- ✅ ~5,400 LOC extracted to shared package
- ✅ Production-grade quality maintained
- ✅ Constitutional compliance validated
- ✅ Test coverage preserved

---

## Timeline

**Total Estimated Time:** 10-14 hours (one-time investment)

**Phase Breakdown:**
- Phase 1 (Infrastructure): 2-4 hours
- Phase 2 (Business Logic): 4-6 hours
- Phase 3 (App Migration): 3-4 hours
- Validation + Testing: 1-2 hours buffer

**Alternative (Iterative Approach):** Ongoing refactor cycles over weeks/months

**Recommendation:** Pay refactor tax once, avoid accumulative complexity.

---

## References

**Constitutional Authority:**
- North Star: `/docs/workflow/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md`
- DECISIONS.md: `/.coord/DECISIONS.md`
- Deployment Guide: `/docs/guides/DEPLOYMENT.md`

**Source Locations:**
- POC Shared Package: `/Volumes/HestAI-Projects/eav-monorepo-experimental/packages/shared`
- Copy-Editor Source: `/Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor`
- Scenes-Web Source: `/Volumes/HestAI-Projects/eav-monorepo-experimental/apps/scenes-web`

**Surveyor Analysis:**
- 161 files scanned in copy-editor
- 20 extraction candidates identified
- Confidence scoring applied

**Technical-Architect Guidance:**
- Comments extraction: Capability config pattern required
- UI components: Defer until design convergence validated
- Position recovery: Infrastructure module, single consumer = keep local until proven

---

**Status:** Awaiting validation chain completion
**Next Steps:** Execute validation → implementation OR escalate conflicts
**Owner:** holistic-orchestrator
