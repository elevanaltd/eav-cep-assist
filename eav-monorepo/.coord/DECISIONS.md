# EAV Operations Suite - Decisions

**Single source of truth for all active decisions**

---

## Architecture

### Monorepo vs Multi-Repo
**Decision:** Use monorepo structure
**Reason:** Cannot maintain parallel development with shared database across 2 repos
**Status:** Migrating

### Supabase Schema Location
**Decision:** Single location at `/eav-monorepo/supabase/`
**Reason:** Shared database requires single migration source of truth
**Constitutional Authority:** North Star I12 (Single Supabase Migration Source of Truth)
**Status:** Active

### Migration Governance Pattern
**Decision:** Migration files are IMMUTABLE once applied to any environment (local/preview/production). To remove database objects, create new migration with DROP statements. Never delete migration files from git.
**Token:** HO-MIGRATION-GOVERNANCE-20251107
**Date:** 2025-11-07
**Authority:** holistic-orchestrator (ULTIMATE_ACCOUNTABILITY)
**Constitutional Authority:** North Star I12 (Single Supabase Migration Source of Truth)
**Status:** ✅ BINDING POLICY (commit 59eeb81)

**Context:**
- Migration 20251105020000 deleted from git in commit 53e1119 (MIP enforcement)
- Remote Supabase instances (preview branches) still had migration applied
- Supabase CLI validation error: "Remote migration versions not found in local"
- CI preview workflow blocked (cannot validate schema consistency)

**Solution Implemented (Option C - Proper Governance):**
1. Restored deleted migration file 20251105020000 (satisfies CLI validation requirement)
2. Created cleanup migration 20251107000000 with DROP statements (removes orphaned objects)
3. Result: Migration history complete + remote databases cleaned + I12 compliance restored

**Constitutional Rationale:**
- **North Star I12:** Single source of truth requires **complete migration history**
- **Migration Immutability:** Files are contracts with database state (never delete once applied)
- **Proper Governance:** Migrate forward with DROP statements (database best practice)
- **Split-Brain Prevention:** Local migration sequence must match remote database state

**Pattern for Future:**
```
❌ WRONG: Delete migration file from git after applying to remote
✓ CORRECT: Create new migration with DROP statements to remove database objects
```

**Example:**
```sql
-- Migration: 20251107000000_remove_orphaned_trigger.sql
DROP TRIGGER IF EXISTS my_trigger ON my_table;
DROP FUNCTION IF EXISTS my_function();
```

**Quality Evidence:**
- Migration sequence valid: 20251102 → 20251105 → 20251106 → 20251107 (no gaps)
- CLI validation passes: Complete migration history satisfies remote/local validation
- Database cleanup successful: DROP statements applied to all instances (local/preview/production)
- I12 compliance restored: Single source of truth coherence maintained

**Applies To:**
- All Supabase database migrations (any `.sql` file in `/supabase/migrations/`)
- Any environment: local development, preview branches, production
- Any team member: developers, infrastructure, database admins

**Documentation:**
- Git commit 59eeb81 contains full implementation details
- Migration file 20251107000000 contains constitutional references and rationale

### Copy-Editor Location
**Decision:** Copy-editor moves to monorepo with other apps
**Reason:** Schema changes across 2 repos is unsolvable coordination problem
**Status:** Migrating

### Deployment Independence
**Decision:** Each app deploys independently (separate Vercel projects)
**Reason:** Zero blast radius between apps
**Constitutional Authority:** North Star I11 (Independent Deployment Architecture)
**Status:** ✅ VALIDATED (POC Phase 0 production deployment successful)
**Evidence:** Live deployment at https://eav-monorepo-experimental-scenes-we.vercel.app/

### Deployment Platform Architecture
**Decision:** Vercel with monorepo support (one GitHub repo → multiple Vercel projects)
**Reason:** Empirically validated in POC Phase 0, supports independent app deployment with shared package bundling
**Constitutional Authority:** Resolves North Star A1 (Deployment Platform Compatibility)
**Status:** ✅ PROVEN (Nov 1, 2025)
**Architecture:**
- One GitHub repository connects to 7 separate Vercel projects
- Each project configures root directory to specific app (`apps/copy-editor`, etc.)
- Build command uses Turborepo filter: `cd ../.. && pnpm turbo run build --filter=<app-name>`
- Shared packages (`@workspace/shared`) bundle at build time (no runtime coupling)
- Each app gets independent domain and deployment lifecycle
**Validation:** See `/Volumes/HestAI-Projects/eav-ops/coordination/poc-phase-0/COMPLETION-SUMMARY.md`
**Implementation Guide:** See `/docs/guides/DEPLOYMENT.md` for detailed configuration
**Key Issues Resolved:**
- Module resolution: Install command runs from monorepo root (`cd ../.. && corepack enable && pnpm install`)
- Environment variables: Vite vars must be set in Vercel for all environments (build-time bundling)
- Build warnings: TypeScript `types` condition must come first in package.json exports

### Lock Coordination UX Strategy
**Decision:** Use page refresh + Teams communication for lock coordination (no realtime notifications)
**Token:** HO-LOCK-SUBTRACTION-DECISION-20251107
**Authority:** holistic-orchestrator (ULTIMATE_ACCOUNTABILITY)
**Date:** 2025-11-07
**Status:** ✅ RESOLVED (PR ready, Issue #15 closed)

**Context:**
16 commits attempted 4+ realtime notification mechanisms (broadcast→postgres_changes→pg_notify→notification table) without resolution. Production evidence showed users successfully work around lack of realtime updates via page refresh.

**Rationale:**
- **Production Reality:** Users successfully coordinate via refresh + Teams (acceptable workflow per user validation)
- **COMPLETION_THROUGH_SUBTRACTION:** Removed 236 lines accumulative complexity, preserved 10-line essential bug fix (4% essential, 96% accumulative)
- **MIP Compliance:** 16 commits exceeded 38% coordination budget maximum
- **test-methodology-guardian:** [VIOLATION] verdict - tests validated nice-to-have realtime (not essential lock protection)
- **critical-engineer:** Validated production risk acceptable (heartbeat-based discovery for force-unlock)

**Implementation:**
- Fixed force-unlock bug: Set status='unlocked' BEFORE DELETE (prevents auto-reacquisition race)
- Removed realtime DELETE notification code (236 lines)
- Updated UI: "Refresh page to edit again" (honest messaging vs broken "Re-acquire Lock" button)
- Removed: "Request Edit" button → "Contact {user} via Teams"

**Quality Evidence:**
- Integration tests: 39/39 passing (100%)
- Unit tests: 378/384 passing
- All quality gates: Lint ✅ TypeCheck ✅ Build ✅
- Git: Branch claude/remove-realtime-lock-tests-011CUoQbxuWyEK5DrN716QYk (commit 53e1119)

**Constitutional Compliance:**
- North Star I8: Production-grade quality = clear UX, not broken buttons
- TRACED: T✅(TDD) R✅(review) A✅(architecture) C✅(consulted TMG+CE) E✅(quality gates) D✅(documented)

### Build Orchestration
**Decision:** Use Turborepo for monorepo orchestration
**Reason:** POC validated it works for our needs
**Status:** Active

---

## Directory Structure

```
/Volumes/HestAI-Projects/eav-monorepo/
├── apps/
│   ├── copy-editor/
│   │   └── .coord -> ../../.coord/apps/copy-editor    (symlink to app coordination)
│   ├── scenes-web/
│   │   └── .coord -> ../../.coord/apps/scenes-web
│   └── [other apps...]
├── packages/
│   └── shared/                        (single shared package)
├── supabase/                          (SINGLE LOCATION - all migrations)
├── docs/                              (suite-wide architectural decisions only)
│   ├── adr/                          (ADR-001, ADR-002...)
│   ├── guides/                       (migration protocols, standards)
│   └── workflow/                     (north star, phase plans)
└── .coord/                            (project coordination - gitignored)
    ├── PROJECT-CONTEXT.md            (suite-wide monorepo context)
    ├── PROJECT-CHECKLIST.md          (suite-wide monorepo checklist)
    ├── apps/                         (app-specific coordination)
    │   ├── copy-editor/
    │   │   ├── APP-CONTEXT.md       (app-specific context)
    │   │   ├── APP-CHECKLIST.md     (app-specific checklist)
    │   │   └── APP-HISTORY.md       (app-specific history)
    │   └── [other apps...]
    ├── sessions/
    ├── reports/
    └── analysis/
```

**Archive:** `/Volumes/HestAI-Projects/eav-ops-archive/` (old multi-repo structure + scattered docs)

---

## Documentation

### Documentation Structure
**Decision:** Two locations only - `/docs/` for architectural decisions, `/.coord/` for coordination work
**Reason:** Eliminate duplication, clear rules for what goes where
**Status:** Active

**Rules:**
- Suite-wide architectural decisions → `/docs/adr/` (git tracked)
- Suite-wide project coordination → `/.coord/PROJECT-*` (gitignored)
- App-specific planning/state/reports → `/.coord/apps/{app}/APP-*` (gitignored, symlinked from each app)
- NO app-specific docs directories (eliminated to prevent duplication)

**Naming Convention:**
- `PROJECT-*` = Monorepo suite-level coordination (7 apps together)
- `APP-*` = Individual app coordination (copy-editor, scenes-web, etc.)

### Documentation Approach
**Decision:** Start fresh in monorepo with clean structure, archive old scattered docs
**Reason:** Existing docs across 4 locations cause confusion, fresh start avoids migration complexity
**Status:** Active

### Documentation Size
**Decision:** Keep docs under 500 words unless absolutely required
**Reason:** Avoid documentation sprawl
**Status:** Active

### Coordination Artifact Tracking Strategy
**Decision:** Selective .coord tracking (binding decisions committed, ephemeral scaffolding gitignored)
**Date:** 2025-11-04
**Authority:** holistic-orchestrator (ULTIMATE_ACCOUNTABILITY for documentation coherence)
**Constitutional Basis:** North Star I7 (TDD traceability) + I8 (production-grade quality)
**Status:** ✅ IMPLEMENTED (commit cd0db53)

**Pattern:**
- **TRACKED (Binding Decisions):**
  - `.coord/workflow-docs/*NORTH-STAR*.md` - Immutable requirements (I1-I12)
  - `.coord/DECISIONS.md` - Architectural choices with rationale
  - `.coord/PROJECT-CONTEXT.md` - System state dashboard
  - `.coord/PROJECT-CHECKLIST.md` - High-level task status
  - `.coord/PROJECT-HISTORY.md` - Historical binding context

- **GITIGNORED (Ephemeral Scaffolding):**
  - `.coord/sessions/` - Session notes, handoffs (high churn)
  - `.coord/reports/` - Interim work evidence (phase-specific)
  - `.coord/apps/` - App-specific docs (high churn, dashboard references these)
  - `.coord/analysis/`, `test-context/`, `validation/` - Scaffolding

**Rationale:**
1. **Constitutional Compliance:**
   - I7 (TDD): Git history shows CONTEXT (North Star) → IMPLEMENTATION (code) → VALIDATION
   - I8 (Production-grade): Binding decisions permanent, traceable, accountable (no "temporary" decisions)

2. **Collaboration Enablement:**
   - Branch switching preserves PROJECT-CONTEXT (orientation restored)
   - Team onboarding sees North Star + architectural rationale
   - Future you (6 months later): "Why barrel exports?" → git log shows decision token + rationale

3. **Multi-App Scaling:**
   - Dashboard (committed) + app details (local) = no duplication
   - 7 apps × APP-CONTEXT (gitignored) + 1 PROJECT-CONTEXT (committed) = clean git history

**Benefits:**
- Context restoration perfect (branch switch preserves system state)
- Accountability trail (all decisions visible in git history)
- No git noise (ephemeral scaffolding excluded)
- Collaboration ready (team sees binding context without clutter)

**Alternatives Considered:**
- Never commit .coord: Lost I7/I8 compliance, context loss on branch switch
- Always commit .coord: Git noise, merge conflicts on session notes
- Commit final artifacts only: Manual effort, risk of forgetting

### Documentation Hierarchy (Dashboard Model)
**Decision:** PROJECT-level docs as dashboard/overview, APP-level docs as detailed drill-down
**Date:** 2025-11-04
**Authority:** holistic-orchestrator (ULTIMATE_ACCOUNTABILITY for documentation architecture)
**Constitutional Basis:** COMPLETION_THROUGH_SUBTRACTION + MIP_ENFORCEMENT (eliminate duplication)
**Status:** ✅ APPROVED - Implementation pending

**Pattern:**
- **PROJECT-CONTEXT.md (Dashboard View ~40 lines):**
  - High-level status per app: "copy-editor: Phase 3B complete → Production operational"
  - Shared infrastructure status: "@workspace/shared v0.5.0 (9 barrel exports operational)"
  - System-wide decisions: "CI Tier 1/2 operational, affects all apps"
  - References APP-CONTEXT for details: "See .coord/apps/copy-editor/APP-CONTEXT.md"

- **PROJECT-CHECKLIST.md (High-Level Tasks ~30 lines):**
  - Major milestones only: "[ ] copy-editor Phase 3 migration"
  - References APP-CHECKLIST for task breakdown
  - Cross-app coordination: "[ ] CI Tier 1 activation (affects all apps)"

- **APP-CONTEXT.md (Detailed State ~150 lines):**
  - App-specific phase details: "Phase 3B: Created useCommentSidebar (660 LOC orchestration)..."
  - App-specific decisions: "Export strategy: HO-EXPORTS-DECISION-OPTION1-20251102"
  - App-specific architecture: "Orchestration pattern: shared primitives → app hooks → UI"
  - References PROJECT-CONTEXT for shared infrastructure

- **APP-CHECKLIST.md (Detailed Tasks ~120 lines):**
  - Granular task breakdown: "[ ] Phase 3B.1: Create useScriptComments"
  - App-specific quality gates: "[ ] copy-editor build validation"

**Rationale:**
1. **Eliminates Duplication (60% reduction):**
   - Current: Phase 3 status repeated in 4 files (PROJECT-CONTEXT × 2, APP-CONTEXT × 2)
   - Dashboard: Phase 3 status in APP-CONTEXT once, PROJECT-CONTEXT references it

2. **Prevents Staleness Cascade:**
   - Current: APP-CHECKLIST lags 10 commits behind PROJECT-CHECKLIST (contradictory status)
   - Dashboard: Single source of truth (update APP, PROJECT references it → always current)

3. **Scales to 7 Apps (Linear vs Quadratic):**
   - Current pattern: 7 apps × detailed status each → 700+ line PROJECT-CONTEXT (unreadable)
   - Dashboard pattern: 7 apps × 1 line status each → 60 line PROJECT-CONTEXT (scannable)

4. **Preserves Work Attribution:**
   - Work done in app context (copy-editor) stays in APP-CONTEXT (attribution clear)
   - Impact surfaces in PROJECT-CONTEXT (all apps see barrel exports available)
   - Not artificial content movement (natural attribution + impact visibility)

**Key Insight:**
> "If you're working on an app and it has something that affects all apps, it doesn't have to be broken off as separate work to PROJECT and should remain in APP work, but the context just needs to be in PROJECT so everyone can see it."

Work attribution (where code written) ≠ Impact visibility (what it enables for others)

**Alternatives Considered:**
- Move shared work details to PROJECT: Splits attribution artificially, duplication risk
- Keep current pattern: 60% duplication, staleness cascade worsens at multi-app scale
- Incremental fix: Temporary inconsistency during transition

**Implementation:**
- Timing: Phase 3 complete, Phase 4 not started (natural boundary)
- Effort: 2-3 hours (refactor 4 files following dashboard pattern)
- Risk: Low (documentation only, git revert if needed)

### Obsolete Documentation
**Decision:** Archive POC and multi-repo planning docs to `/eav-ops-archive/`
**Reason:** They become obsolete after monorepo migration
**Status:** Pending migration

---

## Shared Infrastructure

### Shared Database
**Decision:** All apps use same Supabase project
**Reason:** North Star I6 requirement
**Status:** Active

### Test Infrastructure
**Decision:** Reset-before pattern with factory framework in shared-lib
**Reason:** Reliable test isolation across all apps
**Status:** Implementing

### Dual-Client Test Harness (Phase 4 Enhancement)
**Token:** HO-DECISION-DUAL-CLIENT-TEST-HARNESS-20251104
**Decision:** Use separate Supabase client instances for multi-user realtime tests
**Date:** 2025-11-04
**Authority:** test-methodology-guardian
**Constitutional Basis:** North Star I7 (TDD RED discipline) + I8 (Production-grade from day one)
**Status:** ✅ IMPLEMENTED

**Architecture:**
- Multi-user realtime tests MUST use separate client instances (one per simulated user)
- Production topology: User A (browser 1 → client A) + User B (browser 2 → client B)
- Test topology: User A (clientA) + User B (clientB) - matches production
- AVOID: Auth switching on single client (creates false failures in realtime subscriptions)

**Implementation:**
- `createDualClientTestHarness()` for 2-user scenarios (admin + client)
- `createTriClientTestHarness()` for 3+ user scenarios
- Each client maintains independent auth session and realtime subscriptions
- Cleanup pattern: Remove channels → Sign out (with rate limiting)

**Impact:**
- Fixed 3 quarantined integration tests (Tests 7, 8, 9 in useScriptLock)
- Reusable pattern for all future multi-user realtime tests
- Test coverage improved from 5/10 to 8/10 passing

**Documentation:** `packages/shared/docs/DUAL-CLIENT-TEST-HARNESS.md`

**When to Use:**
- Realtime subscriptions with multiple users
- Lock/mutex behavior across users
- Collaborative features (presence, typing indicators)
- RLS policies with different user contexts

**When NOT to Use:**
- Single-user workflows
- Auth flow testing (single client with auth switching is correct)
- Non-realtime features
- UI component tests

### Extraction Testing Policy (Constitutional Ruling)
**Decision:** Hybrid testing mandatory for all POC extraction work (3-tier coverage)
**Date:** 2025-11-02
**Authority:** test-infrastructure-steward (BLOCKING domain authority)
**Constitutional Basis:** North Star I7 (TDD RED→GREEN discipline)
**Status:** ✅ CONSTITUTIONAL POLICY - Mandatory
**Consultation:** codex test-infrastructure-steward (400k context validation)

**Three-Tier Coverage Required:**
1. **Tier 1: Extraction Fidelity Tests** - Prove POC extraction correct (test POC functions directly)
2. **Tier 2: Public API Integration Tests** - Validate capability-aware wrappers work
3. **Tier 3: Negative Path Tests** - Prevent adapter drift (wrapper failure when POC fails)

**Rationale:**
- Prevents "validation theater" (testing new wrapper code without proving POC extraction)
- Balances extraction validation with API design flexibility
- Adapter/wrapper patterns allowed IF both POC and wrapper are tested
- Removing wrapper to test POC only is overcorrection (loses valid API design)

**CI Evidence Requirement:**
- All 3 tiers must execute in quality gates (typecheck → lint → test)
- Test artifacts stored in `.coord/validation/`
- Git commit must reference evidence

**Detailed Policy:** `.coord/test-context/EXTRACTION-TESTING-POLICY.md`

**Historical Context:**
- Incident: copy-editor Week 2 extraction (2025-11-02)
- holistic-orchestrator blocked progression claiming "validation theater"
- implementation-lead showed wrapper called POC (not hardcoded)
- Both partially correct: wrapper valid but missing POC extraction tests
- Resolution: Hybrid testing satisfies both requirements

**Applies When:**
- Extracting code from POC to shared library
- Creating wrapper/adapter for different interface
- Public API differs from POC internal API

**Does NOT Apply:**
- New code (not extracted from POC) - standard unit tests only

---

## Package Structure

### Single Shared Package
**Decision:** Combine eav-shared-lib + eav-ui + types into single `@workspace/shared` package
**Reason:** Only these 7 apps use them, no external consumers need separate packages
**Status:** Active

### TipTapEditor Location
**Decision:** Extract TipTapEditor to `@workspace/shared` during migration
**Reason:** Used by copy-editor and vo-web (confirmed shared component)
**Status:** Migrating

---

## Integration Patterns

### Webhook Architecture
**Decision:** Each app owns its webhooks (no centralized webhook service)
**Reason:** No shared webhook logic - each integration is app-specific
**Status:** Active

**Pattern:**
- SmartSuite (projects/videos) → copy-editor webhook → updates shared Supabase tables
- ElevenLabs (voice) → vo-web webhook → updates VO-specific data
- Future: Cam-op status → cam-op-pwa webhook → sends TO SmartSuite

**Note:** SmartSuite webhook in copy-editor updates shared tables consumed by all apps. This is fine - it's just an API endpoint, location doesn't matter.

---

## App Migration Strategy

### Copy-Editor Migration Approach
**Decision:** Phased migration (Option A - 4 phases)
**Reason:** Balances safety with incremental improvement, validates each step in monorepo, enables systematic extraction of shared components
**Status:** ✅ APPROVED (2025-11-01)
**Timeline:** 6-10 days total

**Phases:**
1. **Migrate As-Is** (1-2 days) - Copy production app, minimal changes, validate deployment
2. **Extract TipTapEditor** (2-3 days) - Move to @workspace/shared for vo-web reuse
3. **Extract Commenting** (2-3 days) - Move to @workspace/shared for app reuse
4. **Test Infrastructure** (1-2 days) - Implement reset-before pattern, resolve CI issues

**Alternatives Considered:**
- **All-at-once migration:** Faster (3-5 days) but higher risk, harder to debug
- **Minimal migration:** Safest (1 day) but defers extractions indefinitely

**Rationale:** Aligns with user feedback "Do it properly", documented extraction requirements (TipTapEditor + commenting must move to shared per production APP-CONTEXT), enables vo-web to reuse editor

**Primary Documentation:** `.coord/apps/copy-editor/APP-CONTEXT.md`

---

## Open Questions

1. Do we need RLS contracts immediately or add later?
2. What's the guild governance model?
