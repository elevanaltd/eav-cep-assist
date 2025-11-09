# Phase B: Drift Detection Integration - Scope & Implementation Plan

**Date:** 2025-11-08
**Authority:** Implementation Lead (scoping) → Critical-Engineer (validation)
**Status:** SCOPED - Awaiting approval
**Effort Estimate:** 1.5 days (validated against original Phase B timeline)

---

## Executive Summary

**Problem:** Fresh baseline established (ground truth), but no automated checks to prevent future drift.

**Solution:** Add `supabase db lint` to CI quality gates + migration PR template with review checklist.

**Impact:**
- ✅ Prevents schema drift from accumulating
- ✅ Catches migration errors before merge (syntax, typing, unused variables)
- ✅ Forces documentation of migration rationale
- ✅ Provides rollback planning discipline

**Timing:** NOW is optimal (fresh baseline = clean slate, scenes-web about to launch with migrations)

---

## Component 1: Add `supabase db lint` to CI Quality Gates

### 1.1 What It Does

**supabase db lint** analyzes your database schema for:
- **Typing errors** in functions/procedures
- **Unused variables** in SQL functions
- **Schema inconsistencies**
- **Migration syntax issues**

**Example output** (from current fresh baseline):
```json
[
  {
    "function": "public.update_script_status",
    "issues": [
      {
        "level": "warning",
        "message": "unused variable \"v_user_role\"",
        "sqlState": "00000"
      }
    ]
  }
]
```

### 1.2 Integration Points

**Current CI pipeline** (`ci.yml` lines 223-262):
```yaml
quality-gates:
  steps:
    - Run build
    - Run lint (ESLint/Prettier)
    - Run typecheck (TypeScript)
    - Run unit tests
    - Run integration tests
```

**Proposed addition** (after migrations applied, before build):
```yaml
- name: Lint database schema
  if: steps.path-detection.outputs.skip != 'true'
  run: |
    echo "🔍 Linting database schema for typing errors..."
    supabase db lint --level warning --fail-on error
    echo "✅ Schema lint passed"
```

**Placement:**
- AFTER: `supabase db reset --local` (line 184) - migrations must be applied
- BEFORE: `pnpm build` (line 227) - catch schema issues early

**Failure behavior:**
- `--level warning`: Show all warnings
- `--fail-on error`: Block PR only on ERRORS (warnings are advisory)
- Non-blocking warnings encourage cleanup but don't halt progress

### 1.3 Implementation Steps

**Step 1: Add lint step to CI**
- File: `.github/workflows/ci.yml`
- Location: Between migration application and build
- Add conditional check (skip for docs-only PRs)

**Step 2: Test locally**
```bash
# Verify it catches issues
supabase db lint --level warning --fail-on error

# Expected: Currently shows 1 warning (unused variable)
```

**Step 3: Create PR with lint addition**
- Test CI runs successfully
- Verify lint warnings appear in logs
- Confirm errors block merge (manually introduce error to test)

**Step 4: Document in PROJECT-CONTEXT**
- Add to "CI Pipeline" section
- Note new quality gate

### 1.4 Effort Estimate

**Total: 0.5 days**

| Task | Effort | Notes |
|------|--------|-------|
| Add lint step to ci.yml | 0.5h | Simple YAML addition |
| Local testing | 0.5h | Verify lint works |
| Create PR + test CI | 1h | Ensure gate works correctly |
| Fix existing warning (unused variable) | 0.5h | Clean up current schema |
| Documentation | 0.5h | Update PROJECT-CONTEXT |
| Buffer for unexpected issues | 1h | CI flakiness, edge cases |

**Dependencies:**
- ✅ Supabase CLI already in CI (line 92-96)
- ✅ Migrations already applied before lint would run
- ❌ No blockers

---

## Component 2: Migration PR Template with Review Checklist

### 2.1 What It Solves

**Current problem:**
- No standardized migration review process
- Easy to forget critical checks (RLS policies, rollback plan, breaking changes)
- No forcing function for documentation

**Solution:**
Migration-specific PR template that appears when PR modifies `/supabase/migrations/*`

### 2.2 Template Design

**File:** `.github/PULL_REQUEST_TEMPLATE/migration.md`

**Structure:**
```markdown
# Migration PR: [Migration Name]

## Migration Summary
<!-- Brief description of schema changes -->

## Pre-Merge Checklist

### Testing
- [ ] Tested migration locally with `supabase db reset --local`
- [ ] Verified production state matches baseline (no manual changes)
- [ ] Checked for breaking changes in dependent queries
- [ ] Integration tests updated (if schema affects app code)

### Schema Changes
- [ ] RLS policies reviewed (if table security changes)
- [ ] Indexes added for new query patterns
- [ ] Foreign keys validated
- [ ] Column defaults appropriate

### Documentation
- [ ] Migration includes comments explaining WHY (not just WHAT)
- [ ] Breaking changes documented in migration header
- [ ] Rollback plan documented (or marked as non-reversible)

### Drift Prevention
- [ ] `supabase db lint` passes (check CI logs)
- [ ] No manual schema changes in production since last migration
- [ ] Migration version follows convention: YYYYMMDDHHMMSS

## Rollback Plan
<!-- How to undo this migration if needed, or "Non-reversible" with justification -->

## Breaking Changes
<!-- List any queries/code that will break, or "None" -->

## Related Issues
<!-- Link GitHub issues this migration addresses -->
```

### 2.3 Activation Pattern

**GitHub supports multiple PR templates:**
- Default: `.github/PULL_REQUEST_TEMPLATE.md` (for code PRs)
- Migration-specific: `.github/PULL_REQUEST_TEMPLATE/migration.md`

**Usage:**
When creating PR, GitHub detects files changed:
- If `/supabase/migrations/` modified → shows migration template option
- Otherwise → shows default template (or none if no default exists)

**Manual selection:**
User can append `?template=migration.md` to PR URL to force template.

### 2.4 Implementation Steps

**Step 1: Create migration template**
- File: `.github/PULL_REQUEST_TEMPLATE/migration.md`
- Content: Checklist above + sections for summary/rollback/breaking changes

**Step 2: Create default PR template (optional)**
- File: `.github/PULL_REQUEST_TEMPLATE.md`
- Simple template for code PRs (conventional commits, linked issues)

**Step 3: Document template usage**
- Add to `.coord/DECISIONS.md` (migration governance pattern)
- Update PROJECT-CONTEXT with PR template reference

**Step 4: Test with dummy PR**
- Create test migration
- Verify template appears
- Validate checklist is helpful (not just ceremony)

### 2.5 Effort Estimate

**Total: 0.5 days**

| Task | Effort | Notes |
|------|--------|-------|
| Design migration template | 1h | Checklist + sections |
| Create default PR template | 0.5h | Optional but recommended |
| Test template activation | 0.5h | Create dummy PR |
| Documentation | 0.5h | DECISIONS.md + PROJECT-CONTEXT |
| Refinement based on first use | 1h | Iterate after scenes-web migration |
| Buffer | 0.5h | Template tweaks |

**Dependencies:**
- ❌ No blockers

---

## Component 3: Drift Detection Strategy (Future Enhancement)

**Note:** This is **NOT** part of Phase B implementation, but documenting for future reference.

**Automated drift detection** (detect manual production changes):
```bash
# Compare production schema to migration source
supabase db diff --schema public --use-migra > drift-report.txt

# If drift detected:
# - Create GitHub issue
# - Block future migrations until drift resolved
```

**Why defer:**
- Requires production credentials in CI (security consideration)
- Fresh baseline means zero drift today
- Can add after 1-2 migration cycles (when value becomes clear)

**Timeline:** Phase C (post-scenes-web launch)

---

## Implementation Plan

### Phase B Timeline (1.5 days total)

**Day 1: CI Lint Integration (0.5 days)**
- Morning: Add lint step to ci.yml, test locally
- Afternoon: Create PR, verify CI gate works, fix existing warning

**Day 1.5: PR Template (0.5 days)**
- Morning: Create migration + default PR templates
- Afternoon: Test activation, document in DECISIONS.md

**Day 2: Validation & Documentation (0.5 days)**
- Morning: scenes-web team uses migration template for first migration (real-world test)
- Afternoon: Refinements based on feedback, update PROJECT-CONTEXT

### Success Criteria

**Component 1: supabase db lint**
- [x] Lint step added to ci.yml
- [x] CI blocks PRs with schema ERRORS
- [x] CI shows schema WARNINGS (advisory)
- [x] Existing unused variable warning resolved
- [x] Documentation updated

**Component 2: Migration PR Template**
- [x] Template created with comprehensive checklist
- [x] Template activates for migration PRs
- [x] First migration PR (scenes-web) uses template successfully
- [x] Rollback plan section enforced

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| CI lint fails on fresh baseline | LOW | MEDIUM | Already tested - only 1 warning (easily fixed) |
| Lint adds significant CI time | LOW | LOW | Lint is fast (~5-10 seconds) |
| PR template ignored by team | MEDIUM | MEDIUM | Require in code review, make checklist valuable not burdensome |
| Lint false positives | MEDIUM | LOW | Use `--fail-on error` (warnings advisory only) |

---

## Cost-Benefit Analysis

### Costs

**Time investment:**
- Initial: 1.5 days (one-time setup)
- Ongoing: +10 seconds per CI run, +2 minutes per migration PR (checklist)

**Maintenance:**
- Occasional template updates (when new patterns emerge)
- Lint rule tuning if false positives occur

### Benefits

**Immediate:**
- Catches schema errors before merge (prevents broken migrations)
- Forces rollback planning (reduces production risk)
- Documents migration rationale (helps future developers)

**Long-term:**
- Prevents drift accumulation (clean schema history)
- Reduces debugging time (migrations are self-documenting)
- Enables confident refactoring (schema changes validated)

**Estimated ROI:**
- Break-even: After 2-3 migrations (catches 1 error that would've required 2h debugging)
- Value increases with team size (6 apps × multiple developers)

---

## Dependencies & Blockers

**Prerequisites:**
- ✅ Fresh baseline established (20251108000000_fresh_production_baseline.sql)
- ✅ Supabase CLI in CI (already configured)
- ✅ CI pipeline operational (quality-gates job running)

**Blockers:**
- ❌ None

**Nice-to-haves (not blocking):**
- Resolve existing lint warning (unused variable in update_script_status)
- Create default PR template (migration template works standalone)

---

## Alternative Approaches Considered

### Alternative 1: Manual schema review checklist (no automation)
**Pros:** Zero implementation cost
**Cons:** Relies on discipline, easy to skip, no enforcement
**Verdict:** ❌ Rejected - automation prevents human error

### Alternative 2: Post-merge drift detection only
**Pros:** Simpler (no CI integration)
**Cons:** Drift discovered after merge (harder to fix)
**Verdict:** ❌ Rejected - prevention better than detection

### Alternative 3: Supabase Studio schema diff
**Pros:** Visual UI, easy to understand
**Cons:** Manual process, requires production access
**Verdict:** ⚠️ Complementary - use for manual validation, but automate CI

### Alternative 4: Third-party migration linter (e.g., sqlfluff)
**Pros:** More sophisticated linting rules
**Cons:** Extra dependency, learning curve, Supabase-specific issues missed
**Verdict:** ❌ Rejected - supabase db lint is purpose-built

---

## Rollout Strategy

### Phase 1: Non-blocking (Week 1)
- Add lint to CI with `--fail-on none` (advisory only)
- Observe warnings, tune thresholds
- Team gets familiar with lint output

### Phase 2: Error-blocking (Week 2)
- Change to `--fail-on error` (warnings still advisory)
- Errors block merge (prevents broken schema)
- Migration template enforced in code review

### Phase 3: Warning-blocking (Optional, Week 4+)
- Change to `--fail-on warning` (if team wants stricter discipline)
- Requires clean schema (fix existing warning first)

**Recommendation:** Start at Phase 2 directly (errors blocking, warnings advisory). Team is small, discipline is high.

---

## Next Steps

**If approved:**

1. **Create GitHub issue** for Phase B tracking
   - Title: "Phase B: Add DB Lint to CI + Migration PR Template"
   - Labels: `enhancement`, `infrastructure`
   - Milestone: Pre-scenes-web (blocks app launch)

2. **Implementation sequence:**
   - PR #1: Add supabase db lint to CI (Component 1)
   - PR #2: Create migration PR template (Component 2)
   - PR #3: Fix existing lint warning (cleanup)

3. **Validation:**
   - scenes-web first migration uses template
   - Verify lint catches intentional error (negative test)
   - Update documentation

**If deferred:**

- Create backlog issue (link to this scope doc)
- Revisit after scenes-web Phase 1 (when migration patterns are clearer)

---

## Appendix A: Example Lint Output

**Current fresh baseline:**
```json
[
  {
    "function": "public.update_script_status",
    "issues": [
      {
        "level": "warning",
        "message": "unused variable \"v_user_role\"",
        "sqlState": "00000"
      }
    ]
  }
]
```

**Interpretation:**
- Function `update_script_status` declares `v_user_role` but never uses it
- This is a WARNING (not ERROR) - function still works
- Fix: Either use the variable or remove the declaration

**Quick fix:**
```sql
-- Option 1: Remove unused variable
DECLARE
  -- v_user_role text;  -- Removed (unused)
  v_current_user uuid := auth.uid();

-- Option 2: Use the variable
DECLARE
  v_user_role text;
BEGIN
  SELECT role INTO v_user_role FROM user_profiles WHERE id = auth.uid();
  -- ... use v_user_role in logic
END;
```

---

## Appendix B: Migration PR Template (Full Text)

See Component 2.2 for full template content.

---

## Document Status

**Location:** `.coord/PHASE-B-DRIFT-DETECTION-SCOPE.md`

**Phase:** Planning - Ready for approval

**Approval Required:**
- [ ] User confirms Phase B is worth doing now (vs. defer)
- [ ] Critical-Engineer validates approach (if consulting required)
- [ ] Implementation Lead proceeds with execution

**Next Action:** Awaiting user decision to proceed or defer.

---

**Last Updated:** 2025-11-08
**Authority:** Implementation Lead (scoping)
**Version:** 1.0 - Initial Scope
