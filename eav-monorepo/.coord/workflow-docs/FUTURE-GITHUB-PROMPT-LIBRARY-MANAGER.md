# Mission: Build library-manager App (B1→B2→B3)

**Role Activation:** implementation-lead (BUILD phase execution, task coordination, code development)

**Constitutional Requirements:**
- **North Star I7 (TDD RED Discipline):** MANDATORY - Every feature starts with failing test committed to git BEFORE implementation
- **North Star I8 (Production-Grade):** Strict TypeScript, 0 warnings, RLS security, performance optimization
- **North Star I11 (Independent Deployment):** Build for independent Vercel deployment (no runtime dependencies on other apps)
- **North Star I12 (Single Migration Source):** All migrations at `/supabase/migrations/`, follow immutable governance pattern

**Constitutional Identity (implementation-lead):**
You are the implementation lead responsible for:
- Task execution: Execute build tasks systematically per BUILD-PLAN.md
- Code development: Write production-grade code following established patterns
- Quality standards: Ensure all quality gates pass (lint, typecheck, test, build)
- Architectural coherence: Maintain consistency with monorepo patterns

---

## Context

**Project:** EAV Operations Hub (7-app monorepo)
**Current State:** copy-editor B4 operational, scenes-web Phase 1 complete, **copy-builder B3 complete (DEPENDENCY)**
**Your App:** library-manager (content curation, tag approved scripts for reuse)
**Blueprint Location:** `.coord/apps/library-manager/` (ARCHITECTURE.md, BUILD-PLAN.md, DATABASE.md)

**CRITICAL DEPENDENCY:**
- **Requires:** copy-builder migration `20251108000000_add_script_builder_tables.sql` MUST be merged to main BEFORE you start
- **Reason:** Your migration references `paragraph_library` table created by copy-builder
- **Verification:** Check that `/supabase/migrations/20251108000000_add_script_builder_tables.sql` exists in main branch

**Integration Points:**
- **Reads:** `scripts` (approved scripts for review queue), `paragraph_library` (displays cataloged components)
- **Writes:** `paragraph_library` (inserts new components), `scripts` (updates library_status columns)
- **Shared:** `@workspace/shared` v0.5.0 (auth, database, components, errors, services)

---

## Build Plan: B1 → B2 → B3

**Follow:** `.coord/apps/library-manager/BUILD-PLAN.md` (detailed task breakdown)

**Phase Summary:**

### B1: Foundation (12-16 hours)
**Deliverables:**
1. **Migration:** Create `20251109000000_add_library_manager_columns.sql`
   - ALTER TABLE `scripts` (add library_status, library_reviewed_at, library_reviewed_by)
   - RLS policies for library_status updates (editors/admins only)
   - Database function: `mark_script_reviewed()`
   - **IMPORTANT:** This migration DEPENDS on `paragraph_library` existing (created by copy-builder)

2. **Service Layer (TDD):**
   - `src/services/scriptService.ts` (getReviewQueue, getScriptForReview, markScriptReviewed)
   - `src/services/libraryService.ts` (saveComponent, checkDuplicate, getMakeModelSuggestions)
   - `src/utils/contentHash.ts` (client-side SHA-256 hashing)
   - Zod validation schemas
   - Error hierarchy (DuplicateContentError, InsufficientPermissionError)

3. **Auth & Navigation Shell:**
   - `src/App.tsx` (Router, AuthContext from @workspace/shared, QueryClientProvider)
   - Import Header from `@workspace/shared` (**DO NOT create custom AppHeader**)
   - Import AuthContext from `@workspace/shared/auth`
   - Import AutocompleteField from `@workspace/shared` (for make/model suggestions)
   - Role-based access control (editors/admins only)
   - Basic page scaffolds (ReviewQueue, ScriptReview, LibraryBrowser)

**Quality Gate B1:**
- ✅ `npm run lint` → 0 errors
- ✅ `npm run typecheck` → 0 errors
- ✅ `npm run test` → All passing (TDD evidence in git log)
- ✅ `npm run build` → Success
- ✅ Migration depends on paragraph_library (verify table exists)

### B2: Core Features (20-24 hours)
**Deliverables:**
1. Review queue (approved scripts, not_reviewed status)
2. Script review screen (2-column: paragraphs + sidebar)
3. Paragraph tagging form (component_name, make/model, category, notes)
4. Duplicate detection (content hash check, warning modal)
5. Make/model auto-suggest (dropdown with debounced search)
6. Mark script reviewed (removes from queue)

**Quality Gate B2:**
- ✅ All B1 quality gates still passing
- ✅ Manual testing: Load queue → Tag paragraphs → Check duplicate → Mark reviewed
- ✅ Integration tests passing (real database connections)
- ✅ RLS policies enforced (only editors/admins can tag)

### B3: Completion (12-16 hours)
**Deliverables:**
1. Library browser (display cataloged components)
2. Search library (reuses copy-builder's search implementation)
3. Filter controls (category, make/model, section type)
4. Integration tests: Full review workflow end-to-end
5. Polish: Loading states, empty states, error handling
6. Accessibility: ARIA labels, keyboard shortcuts (T to tag, N for next, Esc to collapse)

**Quality Gate B3:**
- ✅ All quality gates passing
- ✅ Accessibility score >90
- ✅ Manual QA checklist complete
- ✅ Integration tests 100% passing

---

## TDD Workflow (MANDATORY)

**RED → GREEN → REFACTOR for EVERY feature:**

```bash
# Step 1: RED - Write failing test first
git add src/**/*.test.ts
git commit -m "TEST: Add review queue test"

# Step 2: Verify test fails
npm test

# Step 3: GREEN - Minimal implementation to pass test
git add src/services/scriptService.ts
git commit -m "FEAT: Implement review queue query"

# Step 4: Verify test passes
npm test

# Step 5: REFACTOR - Improve code while tests stay green
git add src/services/scriptService.ts
git commit -m "REFACTOR: Extract RLS query to helper"

# Repeat for next feature...
```

Evidence Required:
- Git log MUST show TEST: ... commits BEFORE FEAT: ... commits
- No feature implementation without failing test first
- 40%+ explicit RED→GREEN evidence (copy-editor achieved this)

---

## Shared Package Usage (CRITICAL)

@workspace/shared v0.5.0 provides:

1. **Header Component** - Use this, NOT custom AppHeader:
```tsx
import { Header } from '@workspace/shared'

<Header
  title="Library Manager"
  userEmail={user?.email}
  lastSaved={lastSaved}
/>
```

2. **AutocompleteField** - For make/model auto-suggest:
```tsx
import { AutocompleteField } from '@workspace/shared'

<AutocompleteField
  value={makeModel}
  onChange={setMakeModel}
  getSuggestions={async (term) => {
    const { data } = await supabase
      .from('paragraph_library')
      .select('make_model')
      .ilike('make_model', `%${term}%`)
      .limit(10);
    return data?.map(r => r.make_model).filter(Boolean) || [];
  }}
  placeholder="e.g., Kohler K-12345"
  label="Make/Model"
/>
```

3. **AuthContext** - Singleton pattern enforced:
```tsx
import { AuthContext, useAuth } from '@workspace/shared/auth'
```

4. **Database Types** - Auto-generated from Supabase:
```tsx
import type { Tables, Inserts } from '@workspace/shared/types'
```

5. **Supabase Client** - Singleton pattern:
```tsx
import { getClient } from '@workspace/shared/client'
```

6. **Error Handling**:
```tsx
import { getUserFriendlyErrorMessage, withRetry } from '@workspace/shared/errors'
```

7. **Logger Service**:
```tsx
import { Logger } from '@workspace/shared/services'
```

**DO NOT RECREATE:**
- Header component (use shared)
- Auth context (use shared)
- AutocompleteField (use shared - CRITICAL for make/model suggestions)
- Database types (use shared)
- Supabase client (use shared)
- Error handling utilities (use shared)

---

## Branch Strategy

**Branch:** claude/library-manager-[ID] (create new branch from main AFTER copy-builder merged)

**CRITICAL:** Verify copy-builder migration exists in main before starting:
```bash
# Check migration exists
ls -la supabase/migrations/20251108000000_add_script_builder_tables.sql

# If missing, STOP and wait for copy-builder merge
```

**Push Strategy:** Incremental after each phase
```bash
# After B1 complete + quality gates pass:
git push origin claude/library-manager-[ID]
# Create PR → CI validates → Supabase preview created → Vercel preview deployed

# After B2 complete + quality gates pass:
git push origin claude/library-manager-[ID]
# PR updated → CI validates → Previews updated

# After B3 complete + quality gates pass:
git push origin claude/library-manager-[ID]
# Final PR update → Request review
```

---

## Migration Governance (HO-MIGRATION-GOVERNANCE-20251107)

**IMMUTABLE RULE:** Migration files are IMMUTABLE once created
- ✅ Create 20251109000000_add_library_manager_columns.sql
- ❌ NEVER delete migration files from git
- ❌ NEVER modify migration files after creation
- ✅ If changes needed: Create NEW migration with ALTER/DROP statements

**Migration Dependency:**
```sql
-- Your migration MUST reference paragraph_library table
-- Example from DATABASE.md:
ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS library_status TEXT DEFAULT 'not_reviewed'
      CHECK (library_status IN ('not_reviewed', 'in_review', 'reviewed')),
  ADD COLUMN IF NOT EXISTS library_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS library_reviewed_by UUID
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- RLS policy references paragraph_library indirectly (via cataloging workflow)
-- Verify paragraph_library exists before applying this migration
```

**Migration Testing:**
```bash
# Test locally (AFTER copy-builder migration applied)
supabase migration up
npm run test:integration

# Verify schema
supabase db diff
```

---

## Quality Gate Checklist (Before Each Push)

### B1 Foundation:
- Migration file created: 20251109000000_add_library_manager_columns.sql
- Migration depends on paragraph_library (verify reference)
- Migration tested locally (supabase migration up)
- Service layer tests: scriptService.test.ts, libraryService.test.ts
- Content hash utility: contentHash.test.ts
- TDD evidence: Git log shows TEST commits before FEAT commits
- Lint: 0 errors (npm run lint)
- TypeCheck: 0 errors (npm run typecheck)
- Tests: All passing (npm run test)
- Build: Success (npm run build)
- Role-based access: Only editors/admins can access

### B2 Core Features:
- All B1 quality gates still passing
- Review queue: Loads approved scripts (library_status='not_reviewed')
- Script review: Displays paragraphs (split on \n\n)
- Tagging form: Component name, make/model, category, notes
- Duplicate detection: Content hash check, warning modal
- Auto-suggest: Make/model dropdown with debounced search
- Mark reviewed: Updates library_status, removes from queue
- Integration tests: Real database connections tested
- RLS validation: Non-editors blocked from cataloging
- Manual QA: Full workflow tested

### B3 Completion:
- All B1 + B2 quality gates still passing
- Library browser: Displays cataloged components
- Library search: Full-text search working (reuses copy-builder implementation)
- Filter controls: Category, make/model, section type functional
- Integration tests: Full review workflow end-to-end (100% passing)
- Polish: Loading, empty, error states implemented
- Accessibility: ARIA labels, keyboard shortcuts (T, N, Esc)
- Accessibility score: >90
- Manual QA: Complete checklist passed

---

## Performance Targets

**Database Queries:**
- Review queue (50 scripts): <500ms
- Script paragraph display (50 paragraphs): <200ms
- Make/model auto-suggest: <100ms
- Duplicate check (content hash): <50ms
- Save component: <500ms (includes deduplication)
- Library browse (20 components): <200ms

**UI Interactions:**
- Paragraph rendering: Virtualize if >50 paragraphs
- Auto-suggest debounce: 150ms
- Tagging form: Lazy render (only when expanded)

---

## Handoff Criteria (When Complete)

**Deliverables:**
1. ✅ All B3 quality gates passing
2. ✅ Git log shows TDD evidence (TEST→FEAT commits)
3. ✅ Migration file created and tested: 20251109000000_add_library_manager_columns.sql
4. ✅ Migration dependency verified (paragraph_library referenced)
5. ✅ Preview deployment functional (Supabase + Vercel)
6. ✅ Integration tests 100% passing
7. ✅ Manual QA checklist complete
8. ✅ README updated with setup instructions

**PR Review Criteria:**
- Constitutional compliance: I7 (TDD), I8 (production-grade), I11 (independent), I12 (single migration)
- Code review: No blocking issues
- Preview testing: Manual smoke test passed
- Quality gates: All passing (lint, typecheck, test, build)
- RLS enforcement: Only editors/admins can catalog

**Upon Approval:**
- Merge to main
- Production deployment preparation
- Integration testing with copy-builder (circular workflow validation)

---

## Reference Documents

**Blueprint:**
- .coord/apps/library-manager/ARCHITECTURE.md - Component tree, data flow, integration points
- .coord/apps/library-manager/BUILD-PLAN.md - Detailed task breakdown with test-first examples
- .coord/apps/library-manager/DATABASE.md - Schema additions, RLS policies, migration scripts
- .coord/apps/library-manager/API.md - Service layer contracts (if exists)
- .coord/apps/library-manager/UI-SPEC.md - Screen layouts, interactions (if exists)

**System Context:**
- .coord/PROJECT-CONTEXT.md - System state dashboard
- .coord/workflow-docs/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md - Immutables I1-I12
- .coord/DECISIONS.md - Architectural decisions with rationale

**Shared Patterns:**
- apps/copy-editor/ - Reference implementation (TipTap editor, auth, RLS, testing)
- apps/copy-builder/ - Reference implementation (library search, JSONB components)
- packages/shared/ - Shared components, utilities, types

---

## Success Criteria

**Technical:**
- ✅ All quality gates passing (lint, typecheck, test, build)
- ✅ TDD evidence (git log TEST→FEAT)
- ✅ Migration governance compliance (immutable file created)
- ✅ Migration dependency verified (paragraph_library referenced)
- ✅ Preview deployment functional (Supabase + Vercel)
- ✅ Integration tests 100% passing
- ✅ Performance targets met (<500ms queue, <100ms auto-suggest)
- ✅ RLS enforcement (only editors/admins can catalog)

**Constitutional:**
- ✅ North Star I7: TDD RED discipline (failing test first)
- ✅ North Star I8: Production-grade quality (strict TS, 0 warnings, RLS)
- ✅ North Star I11: Independent deployment (no runtime coupling)
- ✅ North Star I12: Single migration source (/supabase/migrations/)

**Handoff:**
- ✅ PR created and reviewed
- ✅ Preview tested manually
- ✅ Documentation complete (README, migration notes)
- ✅ Ready for integration testing with copy-builder (circular workflow)

---

## Circular Workflow Integration Testing (Post-Merge)

After BOTH apps merged to main:
1. Use library-manager to catalog existing copy-editor approved content
2. Use copy-builder to search library and assemble draft
3. Complete draft → Creates script in copy-editor
4. Approve script → Appears in library-manager review queue
5. Tag approved script → Adds to library (circular pattern complete)

**Validation:**
- Paragraph_library shared correctly between apps
- Scripts table extensions working (library_status, built_from_library)
- RLS policies enforcing role boundaries
- Shared package (@workspace/shared) working with 3+ apps

---

## Start Command

**BEFORE STARTING - CRITICAL CHECK:**
```bash
# Verify copy-builder migration merged to main
git checkout main
git pull
ls -la supabase/migrations/20251108000000_add_script_builder_tables.sql

# If file exists → Proceed
# If file missing → STOP and wait for copy-builder merge
```

**Begin with B1 Foundation:**
1. Create branch: git checkout -b claude/library-manager-[ID]
2. Read blueprint: .coord/apps/library-manager/BUILD-PLAN.md
3. Write first test: src/services/scriptService.test.ts (RED)
4. Implement: src/services/scriptService.ts (GREEN)
5. Verify quality gates pass
6. Continue B1 tasks...

Remember: TDD discipline is MANDATORY. Every feature starts with failing test committed to git.

Good luck!
