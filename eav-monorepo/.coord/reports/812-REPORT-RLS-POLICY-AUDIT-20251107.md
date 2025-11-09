# RLS Policy Audit & Cleanup Plan

**Date:** 2025-11-07
**Authority:** critical-engineer (tactical validation) + security-specialist (security review)
**Status:** FINDINGS - AWAITING DECISION

---

## Executive Summary

**Current State:**
- 32 RLS policies across 14 tables
- Only 10 tables actively used in production (copy-editor)
- **5 policies protecting unused tables** (scene_planning_state, shots)
- **1 critical overly-permissive policy** flagged in migration (dropdown_options)

**Recommendation:**
- **KEEP:** 21 policies (scripts, comments, projects, videos, auth, audit infrastructure)
- **REMOVE:** 5 policies (scene_planning_state × 3, shots × 2) - DEAD CODE
- **REMEDIATE:** 2 policies (dropdown_options - overly permissive)
- **REVISIT:** 4 policies (harddelete_audit_log, profiles read_all - minimal usage)

**Impact if cleaned:**
- Reduce policy count: 32 → 25 (22% reduction)
- Regression test surface: 32 → ~20 policies (cleaner test suite)
- Unblock future apps: Establish clear "shared vs app-specific" pattern

---

## SECTION 1: POLICY INVENTORY BY TABLE

### TABLE: `scripts` (Core - KEEP ALL)
**Status:** ✅ CRITICAL - heavily used, recently hardened

| Policy | Purpose | Role Access | Status | Notes |
|--------|---------|-------------|--------|-------|
| `realtime_select_simple` | Read scripts user has access to | admin/employee/client | ✅ SECURE | Fixed 2025-11-01: SECURITY_ISSUE_1 (was overly permissive) |
| `scripts_modify_admin_employee` | Modify scripts | admin/employee | ✅ SECURE | Properly restricted |

**Code Usage:** 9 queries in copy-editor
**Risk Assessment:** CRITICAL - handles all script read access
**RLS Regression Test:** ✅ REQUIRED (existing test foundation in rls-security.test.ts)

---

### TABLE: `script_components` (Core - KEEP ALL)
**Status:** ✅ IMPORTANT - linked to scripts via FK

| Policy | Purpose | Role Access | Status | Notes |
|--------|---------|-------------|--------|-------|
| `components_select_unified` | Read components (admin/employee all, client via script) | admin/employee/client | ✅ SECURE | Complex JOIN validates script access |
| `components_modify_admin_employee` | Modify components | admin/employee | ✅ SECURE | Properly restricted |

**Code Usage:** 2 queries in copy-editor
**Risk Assessment:** HIGH - directly coupled to script access
**RLS Regression Test:** ✅ REQUIRED

---

### TABLE: `script_locks` (Core - KEEP ALL)
**Status:** ✅ IMPORTANT - edit coordination

| Policy | Purpose | Role Access | Status | Notes |
|--------|---------|-------------|--------|-------|
| `Users can view all locks` | Read locks on user's accessible scripts | any authenticated | ✅ SECURE | Uses user_accessible_scripts view (fixed circular dependency) |
| `Users can acquire available locks` | Acquire lock if script accessible | any authenticated | ✅ SECURE | Validates script access before allowing lock |
| `Lock holder can update heartbeat` | Refresh lock (heartbeat) | lock holder | ✅ SECURE | Tight ownership check |
| `Lock holder or admin can release` | Release lock | lock holder OR admin | ✅ SECURE | Allows admin override for abandoned locks |

**Code Usage:** 16 queries in copy-editor (most frequent table!)
**Risk Assessment:** HIGH - essential for collaborative editing
**RLS Regression Test:** ✅ REQUIRED

---

### TABLE: `comments` (Core - KEEP ALL)
**Status:** ✅ IMPORTANT - script annotation system

| Policy | Purpose | Role Access | Status | Notes |
|--------|---------|-------------|--------|-------|
| `comments_admin_employee_all` | Full access for internal team | admin/employee | ✅ SECURE | Proper role check |
| `comments_client_create_optimized_v2` | Clients can create on accessible scripts | client | ✅ SECURE | Validates script access before INSERT |
| `comments_client_update_own_optimized_v2` | Clients update own comments only | client | ✅ SECURE | Checks user ownership + script access |
| `comments_client_delete_own_optimized_v2` | Clients delete own comments only | client | ✅ SECURE | Uses helper function for circular dependency fix |
| `realtime_select_simple` (comments) | Read comments on accessible scripts | admin/employee/client | ✅ SECURE | Role-based + helper function validation |

**Code Usage:** 5 queries in copy-editor
**Risk Assessment:** HIGH - handles comment access + ownership
**RLS Regression Test:** ✅ REQUIRED

**⚠️ Technical Note:** Uses `get_user_accessible_comment_ids()` helper function to break circular dependency (migration 20251102000003). This is correct but adds complexity—consider as refactoring candidate for next phase.

---

### TABLE: `projects` (Shared - KEEP ALL)
**Status:** ✅ IMPORTANT - client segmentation foundation

| Policy | Purpose | Role Access | Status | Notes |
|--------|---------|-------------|--------|-------|
| `projects_select_unified` | Read projects (admin/employee all, client via user_clients) | admin/employee/client | ✅ SECURE | Complex role + user_clients check |
| `projects_modify_admin_employee` | Modify projects | admin/employee | ✅ SECURE | Properly restricted |

**Code Usage:** 27 queries in copy-editor (MOST FREQUENT!)
**Risk Assessment:** CRITICAL - all client filtering depends on this
**RLS Regression Test:** ✅ REQUIRED

**Note:** Must test that clients see ONLY their assigned projects via user_clients table.

---

### TABLE: `videos` (Shared - KEEP ALL)
**Status:** ✅ IMPORTANT - project content

| Policy | Purpose | Role Access | Status | Notes |
|--------|---------|-------------|--------|-------|
| `videos_select_unified` | Read videos (admin/employee all, client via project) | admin/employee/client | ✅ SECURE | Validates via project access + user_clients |
| `videos_modify_admin_employee` | Modify videos | admin/employee | ✅ SECURE | Properly restricted |

**Code Usage:** 8 queries in copy-editor
**Risk Assessment:** HIGH - couples to project access
**RLS Regression Test:** ✅ REQUIRED

---

### TABLE: `user_clients` (Auth/Config - KEEP ALL)
**Status:** ✅ IMPORTANT - multi-client segmentation

| Policy | Purpose | Role Access | Status | Notes |
|--------|---------|-------------|--------|-------|
| `user_clients_select_unified` | Read own assignments or admin sees all | any authenticated | ✅ SECURE | Users see own, admins see all |
| `user_clients_modify_admin` | Modify assignments | admin only | ✅ SECURE | Properly restricted |

**Code Usage:** 12 queries in copy-editor
**Risk Assessment:** HIGH - controls client isolation
**RLS Regression Test:** ✅ REQUIRED

**⚠️ Current Limitation:** `rls-security.test.ts` is SKIPPED because user_clients test data is not fully set up in CI environment. Needs manual creation via `scripts/create-test-users-via-api.mjs`.

---

### TABLE: `user_profiles` (Auth - KEEP 2 of 3)
**Status:** ⚠️ MIXED - keep secure policies, review admin-all

| Policy | Purpose | Role Access | Status | Notes |
|--------|---------|-------------|--------|-------|
| `profiles_admin_read_all` | Admins read all profiles | admin | ⚠️ AUDIT | See OVERLY PERMISSIVE section |
| `profiles_read_own` | Users read own profile | any authenticated | ✅ SECURE | Proper ownership check |
| `profiles_update_own` | Users update own profile | any authenticated | ✅ SECURE | Proper ownership check |

**Code Usage:** 1 query in copy-editor (minimal)
**Risk Assessment:** MEDIUM - minimal app usage
**RLS Regression Test:** ✅ KEEP (but limited scope)

---

### TABLE: `audit_log` (Admin - KEEP)
**Status:** ✅ SECURE - admin-only

| Policy | Purpose | Role Access | Status | Notes |
|--------|---------|-------------|--------|-------|
| `audit_log_admin_read` | Admins read audit log | admin | ✅ SECURE | Properly admin-gated |

**Code Usage:** 2 queries in copy-editor (admin features only)
**Risk Assessment:** MEDIUM - admin functionality
**RLS Regression Test:** ⚠️ OPTIONAL (low risk, low usage)

---

### TABLE: `hard_delete_audit_log` (Admin - KEEP)
**Status:** ✅ SECURE - admin-only

| Policy | Purpose | Role Access | Status | Notes |
|--------|---------|-------------|--------|-------|
| `admin_read_audit_log` | Admins read hard delete audit log | admin | ✅ SECURE | Properly admin-gated |

**Code Usage:** 2 queries in copy-editor (admin features only)
**Risk Assessment:** MEDIUM - admin functionality
**RLS Regression Test:** ⚠️ OPTIONAL (low risk, admin-only)

---

### TABLE: `dropdown_options` (Config/Admin - REMEDIATE)
**Status:** ⚠️ OVERLY PERMISSIVE - See section below

| Policy | Purpose | Role Access | Status | Notes |
|--------|---------|-------------|--------|-------|
| `admin_all_dropdown_options` | Admins modify dropdowns | admin | ✅ SECURE | Proper role check |
| `client_select_dropdown_options` | ALL authenticated users can read | any authenticated | ❌ OVERLY PERMISSIVE | See OVERLY PERMISSIVE section |

**Code Usage:** In useDropdownOptions hook (shared package) - no direct app queries
**Risk Assessment:** MEDIUM-HIGH - overly permissive READ
**RLS Regression Test:** ✅ REQUIRED (if kept)

---

### TABLE: `scene_planning_state` (App-Specific/UNUSED - REMOVE)
**Status:** ❌ DEAD CODE - not used in copy-editor or any active app

| Policy | Purpose | Role Access | Status | Notes |
|--------|---------|-------------|--------|-------|
| `admin_all_scene_planning_state` | Admins full access | admin | ❌ DEAD | Inherited from scene planning phase (not implemented) |
| `employee_all_scene_planning_state` | Employees full access | employee | ❌ DEAD | Inherited from scene planning phase |
| `client_select_scene_planning_state` | Clients see via script access | client | ❌ DEAD | Complex JOIN, but table never queried in code |

**Code Usage:** ZERO - only appears in database.types.ts (auto-generated)
**Inheritance:** From previous phase (scene planning feature, not yet extracted to app)
**Recommendation:** **REMOVE all 3 policies** via cleanup migration

**Decision Required:** Should we DROP the entire table + policies, or preserve it for future scene-planning-web app?

---

### TABLE: `shots` (App-Specific/UNUSED - REMOVE)
**Status:** ❌ DEAD CODE - not used in copy-editor or any active app

| Policy | Purpose | Role Access | Status | Notes |
|--------|---------|-------------|--------|-------|
| `admin_all_shots` | Admins full access | admin | ❌ DEAD | Inherited from scene planning phase |
| `employee_all_shots` | Employees full access | employee | ❌ DEAD | Inherited from scene planning phase |
| `client_select_shots` | Clients see via scene planning | client | ❌ DEAD | Complex 4-table JOIN, never triggered |

**Code Usage:** ZERO - only in database.types.ts
**Inheritance:** From previous phase (scene planning feature)
**Recommendation:** **REMOVE all 2 policies** via cleanup migration

**Decision Required:** Should we DROP the entire table + policies, or preserve it for future scene-planning-web app?

---

## SECTION 2: IDENTIFIED ISSUES

### ⚠️ OVERLY PERMISSIVE POLICY: dropdown_options

**Policy:** `client_select_dropdown_options`
**Current Rule:** `USING (true)` - ANY authenticated user can read ALL dropdown options

**Problem:**
- No role restriction (admins, employees, clients all have equal access)
- No data filtering (all options visible regardless of context)
- Violates principle of least privilege (read any config data)

**Migration Comment Flag:**
- Line in migration: No explicit TODO, but policy is overly broad compared to other "config" reads

**Current Usage:**
- useDropdownOptions hook queries with optional fieldName filter
- Used for form dropdowns in editing UI
- No documented restriction on who should see which options

**Options:**

**Option A: RESTRICT to Admin/Employee (conservative)**
```sql
CREATE POLICY "client_select_dropdown_options" ON "public"."dropdown_options" FOR SELECT USING (
  "public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'employee'::"text"])
);
```
- Pros: Principle of least privilege, admins control what clients can see
- Cons: All clients see all options (no per-client filtering)

**Option B: RESTRICT by field_name (custom logic needed)**
- Pros: Fine-grained control
- Cons: Requires understanding which fields are client-visible vs admin-only
- Current code: Doesn't support this (would need schema change)

**Option C: KEEP as-is (permissive but documented)**
- Pros: Simpler, current code works
- Cons: Violates least privilege, accumulates risk as system grows

**Recommendation:** **Option A (restrict to admin/employee)** unless you explicitly need clients to read specific dropdown options.

**Security-Specialist Input Needed:** Should dropdown options be visible to clients at all?

---

### ⚠️ COMPLEX POLICIES: Comments RLS

**Issue:** Multiple policies use `get_user_accessible_comment_ids()` helper function

**Policies Affected:**
- `comments_client_delete_own_optimized_v2`
- `comments_client_update_own_optimized_v2`
- `realtime_select_simple` (on comments)

**Why This Exists:**
- Circular dependency: Comment → Script FK → Script RLS → user_accessible_scripts view → Script query (LOOP)
- Migration 20251102000003 created helper function to break cycle
- Helper executes with `row_security = off` to avoid recursion

**Current Status:** ✅ Functionally correct, working in production

**Future Refactoring Opportunity:**
- Could simplify by denormalizing access check in comments table
- Or pre-computing accessible comment IDs via materialized view
- **Timeline:** Post-5-app stabilization (not blocking)

**For Now:** Keep as-is, document in regression tests

---

### ⚠️ MINIMAL USAGE: admin_read_audit_log

**Issue:** `profiles_admin_read_all` - admins can read all user profiles

**Current Usage:** 0 queries in copy-editor code

**Question:** Should we restrict this? Or is it intentional for admin dashboards?

**Recommendation:** Keep for now (low risk, admin-only), revisit during admin dashboard implementation.

---

## SECTION 3: CLEANUP MIGRATION PROPOSAL

**If you approve removal of dead code:**

```sql
-- Migration: 20251108000000_remove_unused_rls_policies.sql
-- Purpose: Clean up RLS policies for unused tables (scene_planning_state, shots)
-- North Star I12: Single migration source maintains immutable history

-- ================================================
-- REMOVE: Scene Planning State Policies (Dead Code)
-- ================================================
-- Reason: Tables not used in copy-editor, scene planning feature not yet extracted
-- Impact: Removes 3 unused policies (safe - no active code queries these)

DROP POLICY IF EXISTS "admin_all_scene_planning_state" ON "public"."scene_planning_state";
DROP POLICY IF EXISTS "employee_all_scene_planning_state" ON "public"."scene_planning_state";
DROP POLICY IF EXISTS "client_select_scene_planning_state" ON "public"."scene_planning_state";

-- ================================================
-- REMOVE: Shots Policies (Dead Code)
-- ================================================
-- Reason: Table not used in copy-editor, scene planning feature not yet extracted
-- Impact: Removes 2 unused policies (safe - no active code queries these)

DROP POLICY IF EXISTS "admin_all_shots" ON "public"."shots";
DROP POLICY IF EXISTS "employee_all_shots" ON "public"."shots";
DROP POLICY IF EXISTS "client_select_shots" ON "public"."shots";

-- ================================================
-- REMEDIATE: Dropdown Options (Overly Permissive)
-- ================================================
-- Current: client_select_dropdown_options allows ANY authenticated user to read ALL options
-- Fixed: Restrict to admin/employee (principle of least privilege)

DROP POLICY IF EXISTS "client_select_dropdown_options" ON "public"."dropdown_options";

CREATE POLICY "client_select_dropdown_options" ON "public"."dropdown_options" FOR SELECT USING (
  "public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'employee'::"text"])
);

COMMENT ON POLICY "client_select_dropdown_options" ON "public"."dropdown_options" IS
'Restrict dropdown options to admin/employee (principle of least privilege). Clients do not need to see form dropdown definitions.';
```

**Result:**
- 32 policies → 25 policies (7 removed, 1 modified)
- Dead code eliminated
- Overly permissive policy fixed
- Regression test surface reduced to 20 core policies

---

## SECTION 4: TABLE CATEGORIZATION (For Issue #30 Shared/App-Specific)

### SHARED TABLES (Required for all 7 apps)
**Definition:** Multi-tenant tables used across multiple apps, RLS enforces client isolation

| Table | Policies | Usage | Shared? | Notes |
|-------|----------|-------|---------|-------|
| `projects` | 2 | Critical | ✅ YES | All apps need project access (North Star I1) |
| `videos` | 2 | High | ✅ YES | Content spine, shared across pipeline |
| `user_clients` | 2 | High | ✅ YES | Client segmentation, required for all apps |
| `user_profiles` | 3 | Minimal | ✅ YES | Auth support, required for all apps |
| `scripts` | 2 | Critical | ⚠️ MIXED | Only used by copy-editor, but part of component spine |
| `script_components` | 2 | High | ⚠️ MIXED | Only used by copy-editor currently |
| `script_locks` | 4 | High | ⚠️ MIXED | Only used by copy-editor (collaborative editing) |
| `comments` | 5 | High | ⚠️ MIXED | Only used by copy-editor (annotations) |

**Decision Point:** Should `scripts`, `script_components`, `script_locks`, `comments` be considered:
- **"Core shared" (all apps depend on component spine)** → Keep as shared, add policies for other apps
- **"Copy-editor specific" (other apps don't use)** → Move to copy-editor schema, simpler isolation

### APP-SPECIFIC TABLES (Not shared, can be dropped from main schema)

| Table | Policies | Apps | Status | Decision |
|-------|----------|------|--------|----------|
| `scene_planning_state` | 3 | scenes-web | ❌ DEAD | **REMOVE** - not implemented yet |
| `shots` | 2 | scenes-web | ❌ DEAD | **REMOVE** - not implemented yet |
| `dropdown_options` | 2 | copy-editor | ✅ ACTIVE | **REMEDIATE** - overly permissive |
| `audit_log` | 1 | Internal | ✅ ACTIVE | **KEEP** - admin audit trail |
| `hard_delete_audit_log` | 1 | Internal | ✅ ACTIVE | **KEEP** - compliance audit |

---

## SECTION 5: REGRESSION TEST STRATEGY

### High Priority (CRITICAL - Test immediately)
**Cover:** 16 policies, 5 tables
**Complexity:** Medium (multiple roles + user_clients junction)

```
✅ scripts: realtime_select_simple, scripts_modify_admin_employee
✅ script_components: components_select_unified, components_modify_admin_employee
✅ script_locks: All 4 policies (acquisition, heartbeat, release, read)
✅ comments: All 5 policies (admin access, client create/update/delete, select)
✅ projects: projects_select_unified (complex user_clients check), projects_modify_admin_employee
```

**Estimated Coverage:** ~90% of security-critical access patterns

### Medium Priority (HIGH - Test in Phase 2)
**Cover:** 4 policies, 3 tables
**Complexity:** Low (role-based only)

```
✅ videos: videos_select_unified, videos_modify_admin_employee
✅ user_clients: user_clients_select_unified, user_clients_modify_admin
⚠️ user_profiles: profiles_admin_read_all (AUDIT), profiles_read_own, profiles_update_own
```

**Estimated Coverage:** ~85% overall

### Low Priority (MEDIUM - Optional for Phase 2)
**Cover:** 2 policies, 2 tables
**Complexity:** Low (admin-only)

```
⚠️ audit_log: audit_log_admin_read
⚠️ hard_delete_audit_log: admin_read_audit_log
```

**Estimated Coverage:** ~80% overall

### Don't Test (Dead Code - will be removed)
```
❌ scene_planning_state: All 3 policies (REMOVE VIA MIGRATION)
❌ shots: All 2 policies (REMOVE VIA MIGRATION)
```

---

## DECISIONS REQUIRED

### Decision 1: Dead Code Removal
**Question:** Should we DROP the 5 unused policies (scene_planning_state × 3, shots × 2) via cleanup migration?

**Option A: YES, remove immediately**
- Simplify policy surface
- Prevent future confusion (what are these for?)
- Unblock cleaner test suite
- If scene-planning-web is built, re-add policies then

**Option B: NO, keep for future scene-planning-web**
- Preserve placeholder policies
- Don't need migration if/when scene-planning-web is built
- But carrying dead code in the meantime

**Recommendation:** **Option A** - Remove now, re-add when scene-planning-web actually needs them

---

### Decision 2: Dropdown Options - Overly Permissive Fix
**Question:** Should we restrict `client_select_dropdown_options` to admin/employee only?

**Option A: YES, restrict immediately (principle of least privilege)**
- Clients can't read form dropdown definitions
- If they need specific options, admin provides them per-request
- Principle of least privilege enforced

**Option B: NO, keep open (current permissive model)**
- Simpler for clients to access all options
- No documented harm from current usage
- Keep status quo

**Option C: CUSTOM, field-based restriction**
- Certain fields visible to clients, others admin-only
- Requires schema understanding + code changes
- Complex to implement

**Recommendation:** **Option A** - Restrict to admin/employee (security-first, aligns with intent)

**Security-Specialist Input Requested:** Confirm this aligns with dropdown usage intent.

---

### Decision 3: Scene Planning & Shots Tables
**Question:** Should we DROP the entire tables (scene_planning_state, shots) or just the policies?

**Option A: DROP tables + policies**
- Clean slate for scene-planning-web to design correctly
- No foreign key constraints to maintain
- Remove schema cruft

**Option B: KEEP tables + DROP policies only**
- Preserve structure if scene-planning-web needs it
- Easier to re-add policies later
- Schema exists even if unused

**Option C: MOVE to scene-planning-web schema**
- Create separate schema for app-specific tables
- Don't pollute main public schema with unused tables
- Cleaner separation of concerns

**Recommendation:** **Option B for now** - DROP policies only (keep tables in case scene-planning-web reuses structure)

**Timeline:** Revisit in Phase 4 when scene-planning-web starts implementation.

---

## IMPLEMENTATION TIMELINE

**Phase A: Decisions (1 day)**
- [ ] Review this audit with critical-engineer + security-specialist
- [ ] Approve/modify decisions (1, 2, 3 above)
- [ ] Create GitHub issue for tracking if needed

**Phase B: Migration Creation (0.5 day)**
- [ ] Create cleanup migration (20251108000000_remove_unused_rls_policies.sql)
- [ ] Apply migration locally, verify CI passes
- [ ] Commit with evidence + decision rationale

**Phase C: Regression Tests (2-3 days)**
- [ ] Create rls-regression.test.ts with high-priority policies
- [ ] Add to CI pipeline (run post-migration)
- [ ] Verify all tests pass
- [ ] Document test design decisions

**Phase D: Shared vs App-Specific Documentation (0.5 day)**
- [ ] Update PROJECT-CONTEXT.md with table categorization
- [ ] Document which tables are "shared immutable" vs "app-specific"
- [ ] Reference in migration review protocol

**Total:** 4-5 days before migration coordination infrastructure (Issue #30) is fully ready

---

## APPENDIX: Policy Matrix Summary

**By Table:**
```
scripts (2 policies) ............................ ✅ KEEP ALL
script_components (2) .......................... ✅ KEEP ALL
script_locks (4) ............................... ✅ KEEP ALL
comments (5) ................................... ✅ KEEP ALL
projects (2) ................................... ✅ KEEP ALL
videos (2) ..................................... ✅ KEEP ALL
user_clients (2) ............................... ✅ KEEP ALL
user_profiles (3) .............................. ✅ KEEP ALL (AUDIT: admin_read_all)
audit_log (1) .................................. ✅ KEEP (low usage)
hard_delete_audit_log (1) ...................... ✅ KEEP (low usage)
dropdown_options (2) ........................... ⚠️ REMEDIATE 1 (overly permissive)
scene_planning_state (3) ....................... ❌ REMOVE (dead code)
shots (2) ...................................... ❌ REMOVE (dead code)

TOTAL: 32 → 25 policies (after cleanup)
REGRESSION TEST SURFACE: 16-20 critical policies
```

**By Status:**
```
✅ Production-ready (keep as-is): 21 policies
⚠️ Audit needed (keep + review): 4 policies
⚠️ Fix required (remediate): 2 policies (dropdown_options)
❌ Dead code (remove): 5 policies (scene planning × 3, shots × 2)
```

---

## NEXT STEPS

1. **Review this document** with critical-engineer + security-specialist
2. **Approve decisions** (dead code removal, dropdown fix, table preservation)
3. **Create cleanup migration** if approved
4. **Build regression tests** (Phase C)
5. **Update migration queue system** (Issue #30 parallel work)

---

**Document Status:** Ready for Security Review + Critical Engineer Validation
**Last Updated:** 2025-11-07
**Constitutional Authority:** critical-engineer (tactical), security-specialist (security domain)
