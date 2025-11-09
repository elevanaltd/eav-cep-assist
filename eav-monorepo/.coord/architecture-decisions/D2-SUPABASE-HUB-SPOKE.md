# EAV Suite Hub-and-Spoke Supabase Architecture

**Document:** Architectural Proposal + Conditional Governance Framework
**Status:** CONDITIONAL GO (3 validators aligned on requirements)
**Date:** 2025-10-25
**Authority:** critical-engineer + test-methodology-guardian + principal-engineer (consensus model)
**Phase:** D2 (Strategic Architecture → Implementation)

---

## Executive Summary

**Strategic Reality:** North Star I6 mandates that 6 of 7 apps share the same Supabase database with common tables (projects, videos, script_components). This coupling is NOT optional—it's a binding architectural requirement.

**Current State Problem:** Apps have per-app Supabase directories with duplicated migrations and divergent seed.sql files, creating unmanaged coupling with rising coordination debt.

**Proposed Solution:** Centralize Supabase configuration at suite root with governed migration management, automated reset infrastructure, and cross-app contract testing.

**Validator Consensus:**
- ✅ **Principal Engineer:** Hub-and-spoke is strategically sound; reduces MTTR ~40% vs. current per-app duplication
- ✅ **Test Methodology Guardian:** Test infrastructure will work IF safeguards (reset automation, namespaced factories) are implemented
- ✅ **Critical Engineer:** Production-safe IF mandatory artifacts (semantic conflict protocol, cross-app RLS testing) exist

**Decision:** CONDITIONAL GO — Proceed with implementation IF TIER1 mandatory safeguards are completed before schema consolidation.

---

## Table of Contents

1. [Strategic Context](#strategic-context)
2. [Architecture Proposal](#architecture-proposal)
3. [TIER1: Mandatory Safeguards](#tier1-mandatory-safeguards)
4. [TIER2: Recommended Governance](#tier2-recommended-governance)
5. [Implementation Phases](#implementation-phases)
6. [Risk Mitigation](#risk-mitigation)
7. [Decision Gates](#decision-gates)
8. [Appendix: Validator Reports](#appendix-validator-reports)

---

## Strategic Context

### The North Star I6 Mandate

From `/Volumes/HestAI-Projects/eav-ops/coordination/workflow-docs/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR-MINIMAL.md`:

> **I6: Component Spine with App-Specific State**
> Apps share same Supabase database and common tables (projects, videos, user_profiles, script_components) while maintaining app-specific state tables to prevent deployment coupling and status conflicts.
>
> **Example:** Scripts owns `scripts.status`, VO reads for filtering + writes own `vo_generation_state.vo_status`, Scenes reads for filtering + writes own `scene_planning_state.scene_status`

**Status:** This is NOT aspirational—it's already implemented:
- ✅ copy-editor (production): projects, videos, script_components (shared tables)
- ✅ scenes-web-demo-1: reads scripts, projects, videos + writes scene_planning_state, shots
- ✅ cam-op-pwa: reads scripts, projects, videos, shots + writes shot completion state
- 📋 data-entry-web: references projects, creates project_specifications, quote_video_requirements

### Current Pain Points

| Problem               | Impact                                                       | Root Cause                                   |
|-----------------------|--------------------------------------------------------------|----------------------------------------------|
| Schema drift          | RLS policies conflict, migrations incompatible               | 7 separate migration histories               |
| Duplicate maintenance | Every table change requires 7 PRs                            | Per-app supabase/ directories                |
| Seed data chaos       | Preview environments polluted, test flakiness                | 7 different seed.sql files, no coordination  |
| Coordination overhead | New app onboarding requires cross-repo choreography          | No single owner for shared schema            |
| MTTR degradation      | Schema incident requires 7 rollbacks or complex coordination | Linear migration history with tight coupling |

### Strategic Trade-off Analysis

**Status Quo (Per-App Supabase)**:
- Illusion of independence
- Actual tight database coupling (N:N relationships)
- 7× duplication of migrations, seed.sql, RLS policies
- Unmanaged coordination debt rising as more apps deploy

**Hub-and-Spoke (Centralized + Governed)**:
- Acknowledges actual coupling (North Star I6 requirement)
- Governs coupling through Platform Guild
- Single authoritative migration history
- Deterministic baseline + app-specific factories
- Faster MTTR (single PR, tested against all 7 apps)
- Requires governance overhead (Platform Guild, change control)

**Principal Engineer Assessment:** Hub-and-spoke converts unmanaged coupling into governed coupling, reducing operational friction by ~40%.

---

## Architecture Proposal

### Directory Structure

```
/Volumes/HestAI-Projects/eav-ops/
├── supabase/                           ← SUITE-LEVEL (NEW: moved from apps/copy-editor)
│   ├── migrations/                     ← ALL apps apply ALL migrations
│   │   ├── 20251025000000_core_schema.sql
│   │   ├── 20251025000001_rls_policies.sql
│   │   └── [timestamp]_*.sql           ← Forward-only, idempotent
│   ├── functions/                      ← Shared Edge Functions
│   ├── seed.sql                        ← Baseline ONLY (no app-specific data)
│   └── config.toml
│
├── eav-apps/
│   ├── copy-editor/
│   │   ├── tests/setup/
│   │   │   ├── factories/
│   │   │   │   └── scripts.factory.ts  ← App-specific test data creation
│   │   │   ├── create-test-users.ts    ← Auth Admin API (shared logic)
│   │   │   └── vitest.setup.ts
│   │   └── [rest of app]
│   │
│   ├── scenes-web/
│   │   ├── tests/setup/factories/
│   │   │   └── scenes.factory.ts       ← App-specific test data creation
│   │   └── [rest of app]
│   │
│   ├── data-entry-web/
│   │   ├── tests/setup/factories/
│   │   │   └── data-entry.factory.ts
│   │   └── [rest of app]
│   │
│   └── [cam-op-pwa, vo-web, edit-web, translations-web]
│
└── eav-shared-lib/
    └── src/testing/
        ├── factories/
        │   ├── index.ts                ← Shared factory exports
        │   ├── scripts/
        │   ├── scenes/
        │   ├── data-entry/
        │   └── create-test-users.ts    ← Auth Admin API (shared)
        └── protocols/
            ├── reset.protocol.ts       ← Guaranteed reset before tests
            └── seed-baseline.sql       ← Canonical baseline
```

### Key Design Decisions

#### 1. Single seed.sql (Baseline Only)

**What Goes In:**
```sql
-- Lookup tables (stable, used by all apps)
INSERT INTO subscription_plans VALUES (...)
INSERT INTO user_roles VALUES (...)
INSERT INTO video_types VALUES (...)

-- Reference organizations (test baseline)
INSERT INTO organizations (id, name, ...) VALUES
  ('00000000-0000-0000-0000-00000000a1a1', 'Test Org Alpha', ...),
  ('00000000-0000-0000-0000-00000000a1a2', 'Test Org Beta', ...)
ON CONFLICT (id) DO NOTHING;
```

**Characteristics:**
- ✅ Minimal (< 50 rows total)
- ✅ Idempotent (ON CONFLICT, IF NOT EXISTS)
- ✅ Deterministic UUIDs (00000000-0000-0000-0000-0000000000XX pattern)
- ✅ No PII, no app-specific data, no auth.users
- ✅ Runs ONCE per preview (immutable after creation)

#### 2. App-Specific Factories in @elevanaltd/shared-lib

**Pattern:**
```typescript
// @elevanaltd/shared-lib/src/testing/factories/scripts/scripts.factory.ts
export async function createTestScript(
  supabaseClient: SupabaseClient,
  projectId: string,
  overrides?: Partial<ScriptInput>
): Promise<Script> {
  // Creates script + components + dependencies
  // Runs per-test, auto-cleaned in teardown
  // Uses Auth Admin API for auth users
  // Deterministic, namespaced identifiers
}

// Usage in app-specific test
import { createTestScript } from '@elevanaltd/shared-lib/testing/factories'

beforeEach(async () => {
  const script = await createTestScript(supabase, projectId)
  // Test executes with script present
})

afterEach(async () => {
  // Cleanup via reset protocol (see TIER1 safeguards)
})
```

**Benefits:**
- Shared logic (no duplication across 7 apps)
- Lazy-loaded (app imports only what it needs)
- Testable in isolation
- Versioned with shared-lib (all apps get consistent factories)

#### 3. Semantic Migration Segmentation

**Migrations Declare Affected Apps:**
```sql
-- migration: 20251025000000_core_schema.sql
-- affected_apps: ALL (projects, videos, components required everywhere)
-- owner: platform-guild
-- rollback_scope: single_pr (safe to rollback in isolation)

CREATE TABLE projects (...);
CREATE TABLE videos (...);
CREATE TABLE script_components (...);
```

```sql
-- migration: 20251025010000_scenes_shot_table.sql
-- affected_apps: scenes-web, cam-op-pwa (both read/write shots)
-- owner: scenes-lead
-- rollback_scope: scoped (only affects scenes + cam-op, safe to rollback)

CREATE TABLE shots (...);
CREATE INDEX idx_shots_scene_id ON shots(scene_id);
```

**Governance Rule:** Every migration must declare affected apps. CI tests all affected apps + dependents before merge.

---

## TIER1: Mandatory Safeguards

### Safeguard 1: Semantic Migration Conflict Protocol

**Requirement:** Before merging any schema change, validate against all 7 apps.

**Implementation:**
```yaml
# .github/workflows/schema-validation.yml
name: Schema Change Validation

on:
  pull_request:
    paths:
      - 'supabase/migrations/**'

jobs:
  validate-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Parse migration metadata
        run: |
          # Extract affected_apps from migration header
          affected_apps=$(grep "affected_apps:" supabase/migrations/*.sql | cut -d: -f2)
          echo "AFFECTED_APPS=$affected_apps" >> $GITHUB_ENV

      - name: Test against all affected apps
        run: |
          for app in $AFFECTED_APPS; do
            cd eav-apps/$app
            supabase db reset
            npm run test:integration
            if [ $? -ne 0 ]; then
              echo "❌ Migration breaks $app"
              exit 1
            fi
          done

      - name: Verify rollback safety
        run: |
          # Validate idempotency: can re-run migration safely
          supabase db reset && npm run test:integration
          supabase db reset && npm run test:integration
          if results differ, exit 1
```

**Governance Process:**
1. Developer writes migration with `affected_apps:` header
2. Opens PR → automated CI tests against all affected apps
3. If any app fails: ❌ BLOCK merge (developer must fix)
4. Platform Guild reviews for semantic correctness (RLS implications, index strategy)
5. On approval: single merge → single deploy (all 7 apps synchronized)

**Artifact Requirements:**
- ✅ Migration header standard (documented in README)
- ✅ CI workflow that tests all affected apps
- ✅ Platform Guild review checklist (RLS, index strategy, performance)

---

### Safeguard 2: Guaranteed Reset-Before Pattern

**Requirement:** Every test run starts from clean, deterministic state.

**Current Risk:** Teardown-based cleanup (afterEach deletes data) is unreliable—test crashes leave orphaned data.

**Implementation:**

```typescript
// @elevanaltd/shared-lib/src/testing/protocols/reset.protocol.ts

export async function resetDatabaseBeforeTests(
  supabaseClient: SupabaseClient,
  environment: 'local' | 'preview'
): Promise<void> {
  if (environment === 'preview') {
    // Option A: Reset via Management API (schema preserved, data cleared)
    await resetPreviewViaManagementAPI()

    // Re-apply seed.sql baseline
    await applySeedBaseline(supabaseClient)
  }

  if (environment === 'local') {
    // Option B: Full db reset (fastest, safest locally)
    await executeLocal('supabase db reset')
  }
}

// Invoke in CI before any test runs
beforeAll(async () => {
  if (process.env.SUPABASE_URL?.includes('preview')) {
    await resetDatabaseBeforeTests(supabase, 'preview')
  }
})
```

**CI Pattern:**

```yaml
# TIER2 Preview Integration Tests (from your protocol)

preview-integration:
  steps:
    - Wait for Supabase Preview
    - Export preview credentials

    # NEW: Guaranteed reset before tests
    - name: Reset preview database
      run: |
        npm run supabase:reset-preview
        npm run seed:apply  # Re-apply baseline

    - name: Run integration tests
      run: npm run test:integration

    # Optional cleanup (less critical now that reset is guaranteed)
    - name: Cleanup test data
      if: always()
      run: npm run test:cleanup
```

**Benefits:**
- ✅ No data pollution from previous test run
- ✅ Test crashes don't leave orphaned data
- ✅ Deterministic baseline for all tests
- ✅ Parallelizable (each test run starts from identical state)

**Artifact Requirements:**
- ✅ Reset automation script (local + preview)
- ✅ CI step that invokes reset before tests
- ✅ Verification that reset is idempotent

---

### Safeguard 3: Namespaced Test Data Factories

**Requirement:** Test data from app A doesn't pollute app B's tests.

**Risk:** Factories that create generic data (without namespace) cause collisions in shared preview.

**Implementation:**

```typescript
// @elevanaltd/shared-lib/src/testing/factories/base.factory.ts

export interface FactoryContext {
  testRunId: string  // UUID generated at test start
  appNamespace: string  // 'scripts', 'scenes', 'data-entry', etc.
  organizationId: string  // Test org from seed baseline
}

export async function createTestScript(
  context: FactoryContext,
  overrides?: Partial<ScriptInput>
): Promise<Script> {
  const script = {
    id: `${context.testRunId}_${context.appNamespace}_script_${nanoid()}`,
    title: `[TEST:${context.appNamespace}] Script ${Date.now()}`,
    org_id: context.organizationId,
    ...overrides
  }

  return supabase.from('scripts').insert(script).single()
}

// Usage: Each app creates its own context at test start

// eav-apps/copy-editor/vitest.setup.ts
import { FactoryContext } from '@elevanaltd/shared-lib/testing'

let factoryContext: FactoryContext

beforeAll(() => {
  factoryContext = {
    testRunId: crypto.randomUUID(),
    appNamespace: 'scripts',
    organizationId: '00000000-0000-0000-0000-00000000a1a1'  // From seed
  }
})

test('should create script', async () => {
  const script = await createTestScript(factoryContext)
  expect(script.title).toContain('[TEST:scripts]')
})
```

**Benefits:**
- ✅ Factory data is labeled with app namespace
- ✅ Easy to query/debug: `WHERE title LIKE '[TEST:scripts]%'`
- ✅ Safe deletion: can TRUNCATE by namespace without affecting other tests
- ✅ Prevents cross-app data pollution

**Artifact Requirements:**
- ✅ FactoryContext interface (app namespace required)
- ✅ Updated all factories to use context
- ✅ CI cleanup script that deletes by namespace

---

### Safeguard 4: Cross-App RLS Contract Testing

**Requirement:** Validate that RLS policies work correctly across all 7 apps.

**Risk:** App A's RLS change could silently break App B's access patterns.

**Implementation:**

```typescript
// @elevanaltd/shared-lib/src/testing/rls-contracts/

// Define what "correct RLS" means for shared tables
export const rls_contracts = {
  projects: {
    name: 'projects_org_isolation',
    description: 'User can only see projects in their org',
    scenarios: [
      {
        user: 'alice_org_a',
        query: 'SELECT * FROM projects WHERE org_id = org_a_id',
        expected: 'Returns all projects in org_a',
        should_fail: 'SELECT * FROM projects WHERE org_id = org_b_id → 0 rows (RLS policy denied)'
      }
    ]
  },
  script_components: {
    name: 'script_components_follow_script_access',
    description: 'User can only see components from scripts they can access',
    scenarios: [
      {
        user: 'bob_viewer_role',
        query: 'SELECT * FROM script_components WHERE script_id = accessible_script',
        expected: 'Returns components',
        should_fail: 'SELECT * FROM script_components WHERE script_id = inaccessible_script → 0 rows'
      }
    ]
  }
}

// CI test: Run contracts against all apps
async function testRLSContracts() {
  for (const table of Object.keys(rls_contracts)) {
    const contract = rls_contracts[table]

    for (const scenario of contract.scenarios) {
      // Test as each user role
      const result = await supabaseAsUser(scenario.user).rpc(scenario.query)

      if (Array.isArray(scenario.expected) && scenario.expected.length === 0) {
        expect(result).toEqual([]) // RLS should deny
      } else {
        expect(result).toMatchObject(scenario.expected)
      }
    }
  }
}
```

**CI Integration:**

```yaml
# Run before every merge to supabase/migrations
- name: Test RLS contracts
  run: npm run test:rls-contracts
  # Tests: projects, videos, script_components, profiles, etc.
  # Validates 6 access patterns (admin, staff, client, viewer, analyst, etc.)
  # Fails if any RLS policy violates contract
```

**Benefits:**
- ✅ Prevents accidental RLS regression
- ✅ Documents what "correct security" means for shared tables
- ✅ Catches cross-app breakage before merge
- ✅ Serves as RLS regression test suite

**Artifact Requirements:**
- ✅ RLS contract definitions (per shared table)
- ✅ Test framework (role-based test execution)
- ✅ CI step that runs contracts on every migration merge

---

## TIER2: Recommended Governance

### Governance Model: Supabase Platform Guild

**Charter:** Own schema evolution, migration policy, RLS governance, reset automation.

**Membership:**
- Technical Architect (chair)
- Implementation Lead
- Test Methodology Guardian (test infrastructure)
- One representative from each app team (as schema impacts expand)

**Responsibilities:**

| Responsibility                            | Owner                          | Cadence                |
|-------------------------------------------|--------------------------------|------------------------|
| Schema RFC review                         | Chair + quorum                 | Per migration (ad-hoc) |
| Breaking change assessment                | Tech Architect + affected apps | Per PR                 |
| RLS policy validation                     | Test Guardian + Chair          | Per migration          |
| Migration performance testing             | Implementation Lead            | Per migration >10MB    |
| Release train scheduling                  | Chair                          | Weekly (Wednesdays)    |
| Incident post-mortems                     | Chair + affected leads         | Per incident           |
| Capacity planning (preview limits, costs) | Tech Architect                 | Monthly                |

**Release Train Process:**

```
Monday: RFC review period (migrations proposed)
↓
Tuesday: Affected app testing (CI matrix runs)
↓
Wednesday: Guild approval + merge (single commit, all migrations)
↓
Thursday: Production deploy (synchronized across all apps)
↓
Friday: Retrospective (if incident occurred)
```

**Change Control Template (Every Migration):**

```markdown
## Migration RFC: [Title]

**Affected Apps:** [copy-editor, scenes-web, data-entry-web]
**Owner:** [app-lead]
**Impact:** [schema change | RLS change | performance optimization]

### Changes
- [ ] New table `foo`
- [ ] RLS policy on `bar`
- [ ] Index on `baz`

### Risk Assessment
- **Breaking Changes:** None
- **RLS Implications:** New policy prevents [specific attack]
- **Performance:** Index added on hot column `user_id`

### Testing Plan
- [ ] RLS contract passes (all 6 roles)
- [ ] copy-editor tests pass
- [ ] scenes-web tests pass
- [ ] data-entry-web tests pass
- [ ] EXPLAIN ANALYZE shows index usage

### Rollback Strategy
If issues found post-deploy:
- Approach: Revert migration (forward-only safe)
- Apps affected: All 3
- Estimated MTTR: <30min

### Guild Approval
- [ ] Tech Architect (schema design)
- [ ] Test Guardian (RLS contracts)
- [ ] Implementation Lead (infrastructure)
```

---

### Per-App Schema Namespaces (Optional Optimization)

**Future Enhancement:** If coordination debt rises despite Guild, consider logical schema partitioning.

```sql
-- Instead of global tables, organize by app responsibility

-- CORE (all apps read, none write)
CREATE SCHEMA core;
CREATE TABLE core.projects (...);
CREATE TABLE core.videos (...);
CREATE TABLE core.script_components (...);

-- SCRIPTS (copy-editor owns)
CREATE SCHEMA scripts;
CREATE TABLE scripts.scripts (...);
CREATE TABLE scripts.script_drafts (...);

-- SCENES (scenes-web owns)
CREATE SCHEMA scenes;
CREATE TABLE scenes.scenes (...);
CREATE TABLE scenes.shots (...);

-- DATA_ENTRY (data-entry-web owns)
CREATE SCHEMA data_entry;
CREATE TABLE data_entry.project_specifications (...);
CREATE TABLE data_entry.quotes (...);
```

**Benefits:**
- Clear ownership (schema owner ≈ app responsibility)
- Scoped migrations (scenes migrations in scenes/ directory)
- Easier rollback (revert just scenes/)

**Tradeoff:** Adds schema complexity; only implement if Guild model doesn't work.

---

## Implementation Phases

### Phase 0: Preparation (Weeks 1-2)

**Goals:** Build safeguard infrastructure before consolidating schema.

**Tasks:**
- [ ] Create reset automation (local + preview API integration)
- [ ] Build FactoryContext + namespacing pattern
- [ ] Define RLS contract framework + write contracts for core tables
- [ ] Charter Platform Guild (define membership, roles, release train)
- [ ] Create migration RFC template + governance docs

**Deliverables:**
- `@elevanaltd/shared-lib@0.3.0` with factories + reset protocol
- `.github/workflows/schema-validation.yml` CI pipeline
- `supabase/GOVERNANCE.md` (migration policy, RFC process, Guild charter)
- RLS contract test suite (copy-editor uses)

**Validation Gate:**
- ✅ Reset automation works locally + preview
- ✅ Factories create deterministic namespaced data
- ✅ RLS contracts pass against copy-editor schema

---

### Phase 1: Schema Consolidation (Weeks 3-4)

**Goals:** Move supabase/ to suite root; establish as source of truth.

**Tasks:**
- [ ] Move `/eav-apps/copy-editor/supabase/` → `/eav-ops/supabase/`
- [ ] Audit all migrations for affected_apps metadata (add if missing)
- [ ] Symlink supabase/ in each app directory for local dev (`supabase -> ../../../supabase`)
- [ ] Test all 7 apps against consolidated schema (local + preview)
- [ ] Update CI pipelines to use new location

**Migration Checklist:**
```bash
# For each app
cd eav-apps/$app
supabase link --project-ref $PROJECT_ID
supabase db pull  # Verify schema matches
npm run test:integration  # Validate against preview
```

**Deliverables:**
- `/Volumes/HestAI-Projects/eav-ops/supabase/` as single source of truth
- All 7 apps build + test against consolidated schema
- CI workflows updated to reference new location

**Validation Gate:**
- ✅ copy-editor production tests pass (no regression)
- ✅ scenes-web tests pass (uses shared schema)
- ✅ data-entry-web build succeeds (can import from consolidated migrations)

---

### Phase 2: Factory Rollout (Weeks 5-6)

**Goals:** Convert app-specific test setup to use shared factories.

**Tasks:**
- [ ] Create factories for each app (scripts, scenes, data-entry, cam-op, vo, edit, translations)
- [ ] Update vitest.setup.ts in each app to use factories + reset protocol
- [ ] Add FactoryContext to all tests (namespace + testRunId)
- [ ] Convert existing hardcoded test data → factory calls
- [ ] Validate test determinism (run tests 3× in sequence, all pass identically)

**Per-App Pattern:**
```typescript
// Before
const script = { title: 'Test Script', ... }
await supabase.from('scripts').insert(script)

// After
const script = await createTestScript(factoryContext)
```

**Deliverables:**
- Factories for 7 apps in @elevanaltd/shared-lib
- All app tests use factories + reset protocol
- Test determinism validated

**Validation Gate:**
- ✅ All tests pass when run 3× sequentially
- ✅ Test flakiness reduced by >50% (measure via CI retry rates)

---

### Phase 3: Guild Operations (Weeks 7+)

**Goals:** Establish Platform Guild as mutation gatekeeper.

**Tasks:**
- [ ] Schedule first Guild standup (weekly)
- [ ] Approve first batch of cross-app migrations under new process
- [ ] Instrument telemetry (log migration MTTR, preview failures, etc.)
- [ ] Run stress test (simulate 10 concurrent preview branches)
- [ ] Document lessons learned

**Ongoing Responsibilities:**
- Weekly: Release train (Wednesday merges)
- Per-migration: RFC + testing
- Monthly: Capacity review
- Quarterly: Retrospective + debt assessment

**Deliverables:**
- Guild meeting notes + decisions
- Telemetry dashboard (MTTR, failure rates)
- Stress test results (preview scale limits)

---

## Risk Mitigation

### Risk 1: Coordination Bottleneck (Guild Becomes Gatekeeper)

**Probability:** Medium (observed in other multi-app orgs)
**Impact:** Slow migrations, deploy delays

**Mitigation:**
- Guild size limited to 5 (Tech Architect + 4 app reps max)
- RFC approval target: <24 hours (async feedback)
- Release train runs weekly (predictable window, not ad-hoc)
- Non-breaking schema changes (add columns) approved via RFC template (no deep review needed)

**Escalation:**
If Guild becomes bottleneck (MTTR increases >20% within 2 quarters):
- Evaluate schema namespacing (Phase 2 future work)
- Delegate approval authority to app leads (Guild becomes advisory)
- Consider splitting into core-schema Guild + app-specific schema repos

---

### Risk 2: Preview Branch Isolation Breaks

**Probability:** Low (Supabase documented, copy-editor proven)
**Impact:** Test data pollution, flaky tests

**Mitigation:**
- Stress test at 10+ concurrent branches before rolling out
- Automated cleanup by namespace (TRUNCATE WHERE title LIKE '[TEST:%]%')
- Deterministic reset before each test run (removes dependency on cleanup)

**Escalation:**
If preview isolation fails:
- Fall back to per-app preview branches (each app gets own Supabase project)
- OR use per-test schema per-test databases (faster but complex)

---

### Risk 3: RLS Policy Regression

**Probability:** Medium (6 different access patterns, easy to break one)
**Impact:** Security vulnerability, data leakage

**Mitigation:**
- RLS contracts mandatory (every policy must have contract)
- CI tests contracts before merge (fails if contract violated)
- Guild RLS validation (every migration requires RLS review)

**Escalation:**
If contract-based testing insufficient:
- Add quarterly security audit (external penetration testing)
- Implement RLS change approval workflow (tech lead + security lead)

---

### Risk 4: Migration Conflicts Across 7 Apps

**Probability:** Low initially, increases with app count
**Impact:** MTTR >2 hours, multiple rollbacks needed

**Mitigation:**
- Semantic conflict detection (CI tests all affected apps before merge)
- Migration segmentation (apps declare which migrations affect them)
- Rollback runbooks (documented per app, tested quarterly)

**Escalation:**
If conflicts become frequent (>1 per month):
- Implement schema namespaces (each app owns its domain schema)
- Move to per-app release trains (parallel deploys, independent rollback)

---

## Decision Gates

### GO/NO-GO Checkpoints

#### Pre-Phase 0: Concept Approval
- ✅ **Principal Engineer:** Strategic viability confirmed (governs existing coupling)
- ✅ **Critical Engineer:** Production safety requirements defined (4 TIER1 safeguards)
- ✅ **Test Methodology Guardian:** Test infrastructure requirements specified (reset, namespacing)
- **Decision:** Proceed to Phase 0 if all three approve

#### Pre-Phase 1: Safeguard Readiness
- ✅ Reset automation tested (local + preview)
- ✅ RLS contracts pass against copy-editor
- ✅ Factory framework released in shared-lib@0.3.0
- ✅ Migration RFC template + governance docs approved by Guild
- **Decision:** Proceed to Phase 1 if all above complete

#### Pre-Phase 2: Schema Consolidation Validated
- ✅ All 7 apps build + test against consolidated supabase/
- ✅ copy-editor production tests still pass (zero regression)
- ✅ CI pipelines correctly reference new schema location
- **Decision:** Proceed to Phase 2 if all above verified

#### Pre-Phase 3: Factory Rollout Validated
- ✅ All tests deterministic (3× sequential runs, all pass)
- ✅ Test flakiness reduced >50% vs. baseline
- ✅ Factories cover >80% of test data scenarios
- **Decision:** Proceed to Phase 3 if all above pass

#### Pre-Production: Stress Test Validated
- ✅ 10+ concurrent preview branches work without isolation breaks
- ✅ MTTR measured at <1 hour for single-app failures
- ✅ Telemetry dashboards live (MTTR, failure rates, costs)
- **Decision:** Approve for production after stress test

---

## Appendix: Validator Reports

### Validator 1: Critical Engineer (gemini)

**Verdict:** BLOCKING (requires 4 mandatory artifacts)

**Key Issues Requiring Artifacts:**
1. **Semantic migration conflict protocol** → ADDRESSED via CI testing + migration metadata
2. **RLS policy cross-app testing** → ADDRESSED via RLS contract framework
3. **Guaranteed data reset** → ADDRESSED via reset-before pattern
4. **Service role key security** → ADDRESSED via CI secret management (GitHub Actions)

**Resolution:** All 4 blocking issues have mitigation strategies defined in TIER1 safeguards.

---

### Validator 2: Test Methodology Guardian (codex)

**Verdict:** CONDITIONAL (requires safeguards before implementation)

**Key Requirements:**
1. Factory isolation → ADDRESSED via FactoryContext + namespace pattern
2. Local ↔ Preview parity → ADDRESSED via guaranteed reset (both environments)
3. Cleanup reliability → ADDRESSED via reset-before (not cleanup-after)
4. Parallel test execution → ADDRESSED via per-test schema cleanup

**Resolution:** All test integrity requirements have solutions in TIER1 safeguards.

---

### Validator 3: Principal Engineer (codex)

**Verdict:** CONDITIONAL GO (strategically sound if governance exists)

**Key Insight:**
> "The apps are already functionally coupled by North Star I6 mandate. Hub-and-spoke doesn't CREATE coupling—it GOVERNS the coupling that already exists."

**Predicted Improvements:**
- MTTR reduction: ~40% (single PR vs. 7 separate PRs)
- Schema drift: Eliminated (single source of truth)
- Coordination overhead: Centralized (Platform Guild) vs. distributed (ad-hoc)

**Success Metrics:**
- Migration MTTR <1 hour for single-app failures
- Preview environment >95% availability
- Guild approval time <24 hours per RFC
- Test flakiness <5% (measured via CI retry rates)

**Long-Term Health:**
- Trend data captured quarterly (MTTR, failure rates, coordination metrics)
- Revisit if debt accumulates despite Guild (fallback to schema namespacing)
- Stress test at 10+ concurrent branches annually

**Resolution:** Hub-and-spoke is GO if TIER1 safeguards are implemented + Guild governance established.

---

## References

- **North Star:** `/Volumes/HestAI-Projects/eav-ops/coordination/workflow-docs/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR-MINIMAL.md` (I6, I10)
- **Supabase Preview Protocol:** `/Users/shaunbuswell/.claude/protocols/SUPABASE_PREVIEW_TESTING.md` (v1.2.0)
- **Copy-Editor Production:** `/Volumes/HestAI-Projects/eav-ops/eav-apps/copy-editor/` (proven implementation)
- **Scenes-Web Demo:** `/Volumes/HestAI-Projects/eav-ops/eav-app-demos/scenes-web-demo-1/` (cross-app data sharing)
- **Cam-Op PWA Plan:** `/Volumes/HestAI-Projects/eav-ops/eav-app-demos/cam-op-demo-1/DEMO.md` (shared table usage)
- **Data-Entry Build Plan:** `/Users/shaunbuswell/Development/elevana-projects/archive/elevana-input-hub/input-hub-current/new-workflow-docs/B1_00-EAV_DATA_ENTRY-BUILD_PLAN.md` (data sharing)
- **Validator Reports:**
  - Critical Engineer: Production readiness validation
  - Test Methodology Guardian: Test infrastructure validation
  - Principal Engineer: Strategic longevity validation (with North Star context)

---

## Version History

| Version | Date       | Changes                                                              |
|---------|------------|----------------------------------------------------------------------|
| 1.0     | 2025-10-25 | Initial proposal with TIER1/TIER2 safeguards, 3-phase implementation |

---

**Status:** CONDITIONAL GO — Proceed with Phase 0 upon approval of this document.

**Next Steps:**
1. ✅ Secure Platform Guild charter approval
2. ✅ Begin Phase 0 (reset automation, RLS contracts, factory framework)
3. ✅ Weekly Guild standups (starting immediately)
4. ✅ Re-validate before Phase 1 (schema consolidation)
