# Migration PR: [Brief Description]

<!-- Replace the title above with a brief description of this migration, e.g., "Add shots table for scenes-web" -->

## Migration Summary

<!-- Brief description of schema changes (2-3 sentences) -->
<!-- Example: "Adds shots table for scene planning workflow. Includes RLS policies for admin/employee access. Adds 4 dropdown fields for shot metadata." -->

---

## Pre-Merge Checklist

### Testing

- [ ] Tested migration locally with `supabase db reset --local`
- [ ] Verified production state matches baseline (no manual changes since last migration)
- [ ] Checked for breaking changes in dependent queries (grep codebase for affected tables/columns)
- [ ] Integration tests updated (if schema changes affect app code)
- [ ] `supabase db lint` passes (check CI logs for warnings/errors)

### Schema Changes

- [ ] RLS policies reviewed (if table security changes)
  - [ ] Admin access validated
  - [ ] Employee access validated
  - [ ] Client access validated (or confirmed not needed)
- [ ] Indexes added for new query patterns (check foreign keys, frequently queried columns)
- [ ] Foreign keys validated (CASCADE vs RESTRICT vs SET NULL appropriate)
- [ ] Column defaults appropriate (non-null columns have sensible defaults)
- [ ] Constraints validated (CHECK constraints, UNIQUE constraints match business logic)

### Documentation

- [ ] Migration includes SQL comments explaining WHY (not just WHAT)
- [ ] Breaking changes documented in migration header (or marked "None")
- [ ] Rollback plan documented below (or marked "Non-reversible" with justification)
- [ ] Related GitHub issues linked below

### Drift Prevention

- [ ] No manual schema changes in production since last migration (verified via `supabase db diff`)
- [ ] Migration filename follows convention: `YYYYMMDDHHMMSS_descriptive_name.sql`
- [ ] Migration is idempotent (safe to run multiple times with `IF NOT EXISTS` / `IF EXISTS`)

---

## Rollback Plan

<!-- How to undo this migration if needed -->
<!-- Example: "Run DROP TABLE statements in reverse order: DROP TABLE shots; DROP POLICY ..." -->
<!-- OR mark as "Non-reversible" with justification: "Non-reversible: Adds NOT NULL constraint. Would require data backfill to roll back." -->

**Rollback strategy:**


---

## Breaking Changes

<!-- List any queries/code that will break after this migration -->
<!-- Example: "Breaking: scripts table drops `legacy_status` column. All queries using this column must be updated." -->
<!-- OR: "None - backwards compatible" -->

**Impact:**


---

## Related Issues

<!-- Link GitHub issues this migration addresses -->
<!-- Example: Closes #42, Relates to #30 -->

**Issues:**


---

## Additional Context

<!-- Optional: Add any other context, design decisions, or considerations -->
<!-- Example: "Chose TEXT over ENUM for flexibility. ENUM requires migration for new values." -->


---

## Schema Validation Checklist (Post-Merge)

<!-- For reviewer / merger to confirm -->

- [ ] CI quality gates passed (lint + typecheck + test + build)
- [ ] Schema lint warnings reviewed (if any)
- [ ] RLS policies tested in integration tests (if applicable)
- [ ] Migration applied to production without errors

---

**Migration File:** `supabase/migrations/YYYYMMDDHHMMSS_[name].sql`

**Reviewer:** Please verify rollback plan is realistic and breaking changes are documented.
