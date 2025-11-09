# EAV Operations Suite - Context

**Last Updated:** 2025-11-08
**Current Phase:** Phase 2 Planning - copy-editor operational, scenes-web deployed (preview), parallel work: copy-builder + library-manager

---

## App Status Dashboard

**copy-editor:**
- Phase: B4 (Production Handoff) ✅ COMPLETE
- Production: https://eav-copy-editor.vercel.app/ ✅ OPERATIONAL
- Current: Integration tests 39/39 passing (100%) ✅ ALL ISSUES RESOLVED
- Status: All quality gates passing (Issues #2, #4, #5, #7, #15 ✅ RESOLVED)
- Next: Continue production monitoring
- Details: `.coord/apps/copy-editor/APP-CONTEXT.md` (complete phase history)

**scenes-web:**
- Phase: Phase 1 ✅ DEPLOYED TO PREVIEW
- Production: https://eav-scenes-git-claude-session-in-6ba3cb-shaun-buswells-projects.vercel.app/ ✅ OPERATIONAL
- Current: All quality gates passing (lint ✅, typecheck ✅, test 78/78 ✅, build ✅)
- Status: Extraction complete (76 files, 100% import transformation success), deployed to Vercel preview
- Next: Phase 2 (vercel.json SPA config, migration application, shared component evaluation)
- Details: `.coord/apps/scenes-web/APP-CONTEXT.md` (extraction status + Phase 2 planning), `EXTRACTION-TEST-REPORT.md`, `MIGRATION-REVIEW.md`, `DEPLOYMENT.md`

**Other apps (5):**
- Status: Awaiting sequential migration (vo-web, cam-op-pwa, edit-web, translations-web, data-entry-web)

---

## System Infrastructure

**Modularized Packages (Issue #29, PR #53):**

**@workspace/data** (Foundation Layer)
- Version: 0.1.0
- Purpose: Pure data layer (no React dependencies)
- Exports: Supabase client, database types, validation, RLS utilities, services, mappers
- Dependencies: @supabase/supabase-js (peer)
- Quality: Lint ✅ TypeCheck ✅ Build ✅ Tests 41/41 ✅
- Build: ESM + CJS + DTS (tsup with code splitting)
- Pattern: Singleton Supabase client enforced across all packages

**@workspace/auth** (Authentication Layer)
- Version: 0.1.0
- Purpose: React authentication context and session management
- Exports: AuthContext, useAuth hook, test utilities
- Dependencies: @workspace/data, react, react-dom, @tanstack/react-query (peers)
- Quality: Lint ✅ TypeCheck ✅ Build ✅ Tests 5/5 ✅
- Build: ESM + CJS + DTS (JSX support enabled)
- Pattern: Singleton AuthContext enforced

**@workspace/ui** (UI Components Layer)
- Version: 0.1.0
- Purpose: Shared React UI components and navigation
- Exports: Navigation (NavigationProvider, useNavigation), Components (Header, AutocompleteField, HierarchicalNavigationSidebar), Contexts (DropdownProvider)
- Dependencies: @workspace/data, @workspace/auth, react, react-dom (peers)
- Quality: Lint ✅ TypeCheck ✅ Build ✅ Tests 60/60 ✅
- Build: ESM + CJS + DTS + CSS

**@workspace/shared** (Facade Layer)
- Version: 0.5.0
- Status: ✅ OPERATIONAL (now re-exports from modular packages)
- Architecture: Facade pattern (re-exports from @workspace/data, @workspace/auth, @workspace/ui)
- App-Specific Modules: comments, editor, scripts, dropdowns (remain in shared - see Issue #55)
- Quality: Lint ✅ TypeCheck ✅ Build ✅
- Tests: Unit 371/401 passing, 30 integration skipped (without local Supabase)
- Backward Compatibility: ✅ All import paths preserved (`@workspace/shared/auth` still works)
- Strategic Impact: Universal component changes (auth, data, UI) no longer force synchronized deploys
- Details: Modularization complete (PR #53), app-specific modules decision pending (Issue #55)

**CI Pipeline:**
- Tier 1: ✅ OPERATIONAL (lint→typecheck→test:unit→build on all commits)
- Tier 2: ✅ OPERATIONAL (preview workflow error resolved 2025-11-07)
- **Phase B: Drift Detection** ✅ COMPLETE (2025-11-08)
  - Database schema lint: supabase db lint in CI (blocks on errors, warnings advisory)
  - PR templates: Migration template (comprehensive checklist) + default code template
  - Schema quality: Fixed unused variable warning, baseline now clean
- Migration Governance: Proper migration governance pattern established (see DECISIONS.md)
- Optimization: paths-ignore for documentation-only changes (saves ~8-10 min/commit)
- Status: All issues resolved (#2, #4, #5, #7, #15)
- Coverage: Complete test coverage including lock coordination, comments, RLS security

**Supabase:**
- Location: Single source at `/supabase/migrations/` (North Star I12)
- **Fresh Baseline:** 20251108000000_fresh_production_baseline.sql (ground truth from production)
- Migrations: 2 total (fresh baseline + dropdown population)
- Pattern: Singleton client enforced across all apps
- RLS: Admin/Employee-only policies (no client policies for shots/dropdown_options)
- **Drift Detection:** ✅ ACTIVE
  - Schema lint in CI (prevents typing errors, unused variables, syntax issues)
  - Migration PR template enforces rollback planning + breaking change documentation
  - Baseline clean: "No schema errors found"
- Governance: Migration files IMMUTABLE once applied (see DECISIONS.md HO-MIGRATION-GOVERNANCE-20251107)

---

## System-Wide Decisions

**Architectural:**
- Monorepo structure: 1 GitHub repo → 7 independent Vercel deployments (North Star I11)
- Shared packages: Modularized (Issue #29, PR #53)
  - @workspace/data (foundation - no React deps)
  - @workspace/auth (React authentication)
  - @workspace/ui (React components + navigation)
  - @workspace/shared (facade re-export + app-specific modules)
- Dependency graph: data → auth → ui → shared (no cycles)
- Database: Single Supabase project, shared migrations source
- Deployment: Independent per app (zero blast radius)
- Production stability: Singleton pattern enforcement (Supabase client, AuthContext across all packages)

**Quality Standards:**
- TDD discipline: RED→GREEN→REFACTOR (North Star I7)
- Production-grade from day one: No "MVP shortcuts" (North Star I8)
- Quality gates: lint + typecheck + test + build (all must pass)

**Documentation Pattern:**
- Selective .coord tracking: Binding decisions committed, ephemeral gitignored (2025-11-04)
- Dashboard model: PROJECT as overview, APP as detail (eliminates 60% duplication)
- See: `.coord/DECISIONS.md` for all architectural decisions with rationale

---

## Active Work

**Status:** copy-editor production operational, CI Tier 2 operational (39/39 passing, 100%)

**Current Focus:**
- ✅ Modularization: 3 packages extracted (data, auth, ui) - PR #53 merged
- ✅ Test Infrastructure: ALL RESOLVED (Issues #2, #4, #5, #7, #15)
- ✅ Lock Coordination: UX clarified with honest refresh messaging
- ✅ Integration Tests: 39/39 passing (100%)
- Next: scenes-web Phase 1 migration (UNBLOCKED)

**Recent Commits (2025-11-08):**
- feat(modularization): Extract @workspace/data, @workspace/auth, @workspace/ui packages (PR #53)
  - Issue #29: Prevents release train bottleneck (principal-engineer strategic requirement)
  - Extracted: data (foundation), auth (React context), ui (components + navigation)
  - Backward compatible: Facade re-export pattern in @workspace/shared
  - Quality gates: All passing (371/401 tests, lint ✅, typecheck ✅, build ✅)
  - Strategic impact: Universal component changes no longer force synchronized deploys
  - Remaining work: App-specific modules (editor, comments) - decision pending (Issue #55)
  - Details: 13 commits, 605 tests, TDD discipline (Phase 0 tests first)

**Recent Commits (2025-11-07):**
- fix(db): Restore migration 20251105020000 and add cleanup migration (commit 59eeb81)
  - Resolved CI preview workflow error: "Remote migration versions not found in local"
  - Established migration governance pattern (IMMUTABLE files, migrate forward with DROP)
  - North Star I12 compliance restored (single source of truth)
  - Details: Restored deleted migration + created cleanup migration (proper governance)

- fix(editor): Remove realtime lock notification tests, clarify UX messaging (commit 53e1119)
  - Fixed force-unlock bug (10 lines essential fix)
  - Removed 236 lines accumulative complexity (realtime notifications)
  - Updated UI: honest refresh instructions, removed broken buttons
  - Issue #15 closed (all test failures resolved)

**Recent Commits (2025-11-04):**
- fix(editor): Issue #5 unmount cleanup production bug (commit 0f9f87d - TMG escalation)
- test(editor): Issue #7 heartbeat configuration seam (commit d5416f3 - TMG approved)
- test(comments): Issue #8 constraint validation (PR #10 merge - Copilot)

**Next Priorities:**
1. ✅ COMPLETE: All integration tests passing
2. **scenes-web Phase 1 migration** (UNBLOCKED - ready to begin)
3. Continued production monitoring and stability

---

## Key Decisions

See: `.coord/DECISIONS.md` for comprehensive decision log with constitutional rationale

**Recent Decisions (2025-11-08):**
- **Modularization Strategy (Issue #29, PR #53)**: Extract universal shared components (data, auth, ui) to prevent release train bottleneck. App-specific modules (editor, comments) remain in @workspace/shared pending decision (Issue #55). Strategy: Extract proven universal patterns, defer app-specific until second use case validates abstraction. (Constitutional: North Star I11, COMPLETION_THROUGH_SUBTRACTION, principal-engineer strategic validation)

**Recent Decisions (2025-11-07):**
- **Migration Governance Pattern**: Migration files IMMUTABLE once applied to any environment (local/preview/production). To remove database objects, create new migration with DROP statements. Never delete migration files from git. (Constitutional: North Star I12, holistic-orchestrator, Token: HO-MIGRATION-GOVERNANCE-20251107)
- Lock coordination UX: Honest refresh messaging, removed realtime notification complexity (Constitutional: MIP + COMPLETION_THROUGH_SUBTRACTION)
- test-methodology-guardian verdict: Realtime tests validated accumulative complexity, not essential behavior

**Earlier Decisions (2025-11-04):**
- Selective .coord tracking: Binding decisions committed, ephemeral gitignored (Constitutional: I7+I8)
- Dashboard model: PROJECT as overview, APP as detailed drill-down (Eliminates 60% duplication)
- Production stability pattern: Singleton enforcement (Supabase, AuthContext)
- Barrel exports strategy: 9 clean export paths for all apps (Created during copy-editor Phase 3A)
