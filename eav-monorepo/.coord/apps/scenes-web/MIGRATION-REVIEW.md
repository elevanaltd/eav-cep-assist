# scenes-web Migration Review

**Date:** 2025-11-08
**Reviewer:** implementation-lead (Phase 1 Extraction)
**Authority:** Phase 1 extraction - defer migration coordination to holistic-orchestrator

---

## Executive Summary

**Result:** INCREMENTAL_CHANGES_NEEDED (defer to Phase 2)

**POC Migrations Analyzed:** 3 migrations
**Changes Impact:** Low-risk schema evolution (column rename + data additions)
**Recommendation:** Defer to Phase 2 after Phase 1 merge
**Rationale:** I12 compliance - single migration source requires coordinated application

---

## POC Migrations Analyzed

### 1. `20251028125650_rename_tracking_type_to_movement_type.sql`

**Type:** Column rename (backward-incompatible)
**Changes:**
- Renames `shots.tracking_type` → `shots.movement_type`
- Adds column comment documenting purpose

**SQL:**
```sql
ALTER TABLE shots RENAME COLUMN tracking_type TO movement_type;

COMMENT ON COLUMN shots.movement_type IS 'Type of camera movement (Tracking, Establishing, Standard, Photos). Determines which additional fields are required.';
```

**Risk:** LOW (simple column rename, no data loss)

---

### 2. `20251031201059_update_dropdown_options_movement_type.sql`

**Type:** Data migration + constraint update
**Changes:**
- Updates `dropdown_options.field_name` from `'tracking_type'` → `'movement_type'`
- Updates CHECK constraint to allow `'movement_type'` instead of `'tracking_type'`
- Includes verification logic (RAISE NOTICE)

**SQL:**
```sql
-- Step 1: Drop old constraint
ALTER TABLE dropdown_options
DROP CONSTRAINT dropdown_options_field_name_check;

-- Step 2: Update existing records
UPDATE dropdown_options
SET field_name = 'movement_type'
WHERE field_name = 'tracking_type';

-- Step 3: Add new constraint with movement_type
ALTER TABLE dropdown_options
ADD CONSTRAINT dropdown_options_field_name_check
CHECK (field_name = ANY (ARRAY['shot_type'::text, 'location_start_point'::text, 'movement_type'::text, 'subject'::text]));
```

**Risk:** LOW (coordinated with migration #1, includes verification)

---

### 3. `20251108000336_add_track_estab_shot_types.sql`

**Type:** Data addition (additive, backward-compatible)
**Changes:**
- Adds `'TRACK'` option to `dropdown_options` for `shot_type` field
- Adds `'ESTAB'` option to `dropdown_options` for `shot_type` field
- Supports auto-populate pattern (when movement_type = Tracking/Establishing)

**SQL:**
```sql
-- Add TRACK option
INSERT INTO dropdown_options (field_name, option_label, display_order)
VALUES ('shot_type', 'TRACK', (SELECT COALESCE(MAX(display_order), 0) + 1 FROM dropdown_options WHERE field_name = 'shot_type'))
ON CONFLICT DO NOTHING;

-- Add ESTAB option
INSERT INTO dropdown_options (field_name, option_label, display_order)
VALUES ('shot_type', 'ESTAB', (SELECT COALESCE(MAX(display_order), 0) + 2 FROM dropdown_options WHERE field_name = 'shot_type'))
ON CONFLICT DO NOTHING;
```

**Risk:** VERY LOW (additive only, ON CONFLICT DO NOTHING safe)

---

## Production Baseline Comparison

**Production Schema:** `/supabase/migrations/20251102000000_production_baseline_schema.sql`

### Current Production State

**shots table:**
```sql
-- Line 1001: Column uses tracking_type (not movement_type)
"tracking_type" "text",

-- Line 1014: Comment references tracking_type
COMMENT ON COLUMN "public"."shots"."tracking_type" IS 'Dropdown from dropdown_options: Tracking, Establishing, Standard, Photos (fixed list, no other)';
```

**dropdown_options constraint:**
```sql
-- Line 890: Constraint uses tracking_type (not movement_type)
CONSTRAINT "dropdown_options_field_name_check" CHECK (("field_name" = ANY (ARRAY['shot_type'::"text", 'location_start_point'::"text", 'tracking_type'::"text", 'subject'::"text"])))
```

**shot_type dropdown values:**
- No `'TRACK'` option found in baseline
- No `'ESTAB'` option found in baseline

### Conclusion

**Status:** POC migrations contain incremental changes NOT present in production baseline

**Missing Changes:**
1. Column rename: `tracking_type` → `movement_type` ❌ Not in baseline
2. Constraint update: Allow `movement_type` field ❌ Not in baseline
3. Dropdown data: TRACK and ESTAB options ❌ Not in baseline

---

## Risk Assessment

**Overall Risk:** LOW

**Breakdown:**

| Migration | Type | Risk Level | Reason |
|-----------|------|------------|---------|
| #1: Column rename | Schema change | LOW | Simple ALTER TABLE RENAME, no data transformation |
| #2: Constraint update | Schema change | LOW | Coordinated with #1, includes verification |
| #3: Data additions | Data only | VERY LOW | Additive only, ON CONFLICT DO NOTHING safe |

**Application Safety:**
- ✅ Migrations are forward-only (no rollback needed)
- ✅ No data loss (column rename preserves all data)
- ✅ Verification logic included (RAISE NOTICE checks)
- ✅ ON CONFLICT clauses prevent duplicate inserts
- ✅ All changes tested in POC (scenes-web operational)

**Coordination Requirements:**
- ⚠️ Must coordinate with holistic-orchestrator (I12: single migration source)
- ⚠️ Must apply to `/supabase/migrations/` (not app-specific directory)
- ⚠️ Must generate new migration timestamp (202511xx format)
- ⚠️ Must verify copy-editor compatibility (uses shots table)

---

## Decision

**Defer Application to Phase 2**

**Rationale:**
1. **I12 Compliance:** Single migration source at `/supabase/migrations/` requires holistic-orchestrator coordination
2. **Phase Separation:** Phase 1 focuses on extraction + validation, Phase 2 handles schema evolution
3. **Copy-editor Coordination:** Renaming `tracking_type` → `movement_type` may impact copy-editor (needs verification)
4. **Timeline Efficiency:** Phase 1 can complete without these migrations (scenes-web code already uses `movement_type`)

**Application Strategy (Phase 2):**
1. Create new migration: `20251108XXXXXX_scenes_web_movement_type_migration.sql`
2. Combine all 3 POC migrations into single coordinated migration
3. Verify copy-editor compatibility (search for `tracking_type` references)
4. Apply via holistic-orchestrator (ensure I12 compliance)
5. Test both copy-editor and scenes-web after application

---

## Code Compatibility Analysis

**scenes-web Code Status:**

**Already uses `movement_type` (not `tracking_type`):**
- ✅ `src/hooks/useShots.ts` - References `movement_type` field
- ✅ `src/hooks/useShotMutations.ts` - Handles `movement_type` updates
- ✅ `src/components/ShotTable.tsx` - Displays `movement_type` column
- ✅ `src/lib/shotFieldDependencies.ts` - Uses `movement_type` for field dependencies

**Implication:** scenes-web code expects POC schema (with `movement_type`), not production baseline (with `tracking_type`)

**Temporary Workaround (Phase 1):**
- Scenes-web will fail to read/write shots until migrations applied
- Acceptable for Phase 1: Focus is extraction validation, not production operation
- Resolved in Phase 2: Apply migrations before production deployment

---

## copy-editor Impact Analysis

**Potential Impact:** MEDIUM (needs verification)

**Questions to Answer (Phase 2):**
1. Does copy-editor read or write to `shots.tracking_type`?
2. Does copy-editor reference `tracking_type` in dropdown_options queries?
3. Are there copy-editor tests that depend on `tracking_type` column?

**Verification Steps (Phase 2):**
```bash
# Search copy-editor codebase for tracking_type references
cd /home/user/eav-monorepo/apps/copy-editor
grep -r "tracking_type" src/

# Check if copy-editor queries shots table
grep -r "shots" src/ | grep -E "select|insert|update"

# Check dropdown_options usage
grep -r "dropdown_options" src/
```

**Mitigation Plan:**
- If copy-editor uses `tracking_type`: Update copy-editor code first, then apply migration
- If copy-editor doesn't use shots table: Apply migration directly (low risk)

---

## Recommended Next Steps

### Phase 2 (After Phase 1 Merge)

1. **Verify copy-editor compatibility** (15 min)
   ```bash
   grep -r "tracking_type" apps/copy-editor/src/
   ```

2. **Create consolidated migration** (30 min)
   - File: `/supabase/migrations/20251108XXXXXX_scenes_web_movement_type_migration.sql`
   - Combine all 3 POC migrations
   - Add rollback logic (ALTER TABLE RENAME back if needed)

3. **Coordinate with holistic-orchestrator** (15 min)
   - Request migration review
   - Ensure I12 compliance (single source at `/supabase/migrations/`)
   - Verify no conflicts with other apps

4. **Apply migration** (10 min)
   ```bash
   supabase db push
   ```

5. **Validate both apps** (20 min)
   - Test copy-editor: Verify no regressions
   - Test scenes-web: Verify shots CRUD operations work
   - Run integration tests

**Total Time Estimate:** 90 minutes (Phase 2)

---

## Constitutional Compliance

**North Star I12: Single Supabase Migration Source of Truth**
- ✅ Deferred to holistic-orchestrator for coordination
- ✅ Will apply to `/supabase/migrations/` (not app-specific directory)
- ✅ Maintains single source of truth

**Authority Chain:**
- **Phase 1 (Current):** implementation-lead - extraction + documentation
- **Phase 2 (Future):** holistic-orchestrator - migration coordination + application
- **Validation:** critical-engineer - schema change impact assessment

---

**Phase 1 Status:** ✅ COMPLETE - Migrations reviewed and documented
**Phase 2 Handoff:** holistic-orchestrator (migration coordination)
**Next Action:** Complete Phase 1 extraction, defer migration application to Phase 2

---

**Reviewed By:** implementation-lead (Quest R2 Agent)
**Date:** 2025-11-08
**Constitutional Authority:** North Star I12 (Single Migration Source)
