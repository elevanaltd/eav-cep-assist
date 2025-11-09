# Scenes Web - Application Checklist

**Application:** EAV Scenes Web (App 2 of 7)
**Last Updated:** 2025-11-04
**Current Phase:** Phase 1 Planning (Migration from POC)

---

## Phase 1: Migration As-Is (2-3 days estimated)

**Status:** ⏸️ BLOCKED - Awaiting copy-editor CI test resolution (3-5 hours)

### Pre-Migration Setup
- [ ] **Blocker Resolution:** copy-editor CI integration tests 36/36 passing
  - Ensures test infrastructure patterns proven before scenes-web migration
  - Timeline: 3-5 hours (Issues #2 RLS-001, #4 TEST-001)

### Migration Execution
- [ ] **Copy POC source** from `/Volumes/HestAI-Projects/eav-monorepo-experimental/apps/scenes-web/`
  - Target: `/Volumes/HestAI-Projects/eav-monorepo/apps/scenes-web/`
  - Method: Systematic copy (not rsync - learned from copy-editor)

- [ ] **Import transformation** (@elevanaltd/shared-lib → @workspace/shared)
  - [ ] Auth imports: `@elevanaltd/shared-lib/auth` → `@workspace/shared/auth`
  - [ ] Database imports: `@elevanaltd/shared-lib/database` → `@workspace/shared/database`
  - [ ] Service imports: `@elevanaltd/shared-lib/services` → `@workspace/shared/services`
  - [ ] Verify all import paths updated (grep for @elevanaltd)

- [ ] **Package configuration**
  - [ ] package.json: Dependencies aligned with monorepo
  - [ ] tsconfig.json: Extends monorepo base config
  - [ ] vite.config.ts: Monorepo-compatible paths

- [ ] **Quality gate validation**
  - [ ] TypeScript: `pnpm turbo run typecheck --filter=scenes-web` → 0 errors
  - [ ] Lint: `pnpm turbo run lint --filter=scenes-web` → 0 errors/warnings
  - [ ] Tests: `pnpm turbo run test --filter=scenes-web` → All passing
  - [ ] Build: `pnpm turbo run build --filter=scenes-web` → Successful

### Deployment Configuration
- [ ] **Vercel setup** (Independent project per North Star I11)
  - [ ] Create new Vercel project: eav-scenes-web
  - [ ] Configure root directory: `apps/scenes-web`
  - [ ] Configure build command: `cd ../.. && pnpm turbo run build --filter=scenes-web`
  - [ ] Configure install command: `cd ../.. && corepack enable && pnpm install`
  - [ ] Set environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  - [ ] Deploy to production: Target URL https://eav-scenes.vercel.app/ (or similar)

- [ ] **Production validation**
  - [ ] Deployment successful
  - [ ] App loads without errors
  - [ ] Authentication works (login/logout)
  - [ ] Navigation functional (projects → videos → scripts → components)
  - [ ] Shot creation operational
  - [ ] Production notes functional
  - [ ] No console errors/warnings

### Phase 1 Completion
- [ ] **Git commit** Phase 1 migration
  - Pattern: `feat(scenes-web): migrate Phase 1 from POC to monorepo`
  - Evidence: Quality gates passing, Vercel deployment operational

- [ ] **Documentation update**
  - [ ] Update APP-CONTEXT.md: Phase 1 complete status
  - [ ] Update PROJECT-CONTEXT.md: scenes-web Phase 1 operational
  - [ ] Update PROJECT-CHECKLIST.md: Mark scenes-web Phase 1 complete

---

## Phase 2+ Planning (TBD - Post Phase 1)

**Defer Until Phase 1 Complete:**

### Potential Shared Component Extractions
- [ ] Evaluate shot management patterns (if VO/Edit reuse)
- [ ] Evaluate production notes threading (if reusable beyond scenes)
- [ ] Evaluate dropdown_options architecture (cross-app sharing?)

### Integration Enhancements
- [ ] SmartSuite webhooks (if scenes needs project sync)
- [ ] Cross-app shot coordination (if other apps reference shots)

### Quality Improvements
- [ ] Test coverage analysis (establish baseline in Phase 1)
- [ ] Performance optimization (if needed based on Phase 1 metrics)
- [ ] CI integration test suite (extend copy-editor patterns)

---

## Quality Gates (Constitutional I7+I8)

**Production-Grade from Day One:**
- [ ] TypeScript: 0 errors (strict mode)
- [ ] Lint: 0 errors, 0 warnings
- [ ] Tests: All passing (TDD discipline maintained)
- [ ] Build: Successful (no warnings)
- [ ] RLS Policies: Operational (multi-client isolation per I2)
- [ ] Performance: <100ms component operations (per I9 pattern)

**North Star Alignment:**
- [ ] I1: Reads script_components (component spine)
- [ ] I4: Independent workflow (parallel with scripts/VO/edit)
- [ ] I6: App-specific state (scene_planning_state, shots, dropdown_options, production_notes)
- [ ] I7: TDD discipline (tests carried over from POC, maintained during migration)
- [ ] I8: Production-grade quality (0 errors/warnings)
- [ ] I11: Independent deployment (separate Vercel project)
- [ ] I12: Shared migrations (/supabase/migrations/ schema)

---

## Metrics Tracking (Post Phase 1)

**Current (POC):**
- Tests: TBD (count during migration)
- Coverage: TBD (baseline during migration)
- Bundle Size: TBD (measure during build)

**Target (Post Migration):**
- Tests: All passing (maintain POC coverage minimum)
- Coverage: ≥80% (production-grade baseline)
- TypeScript: 0 errors (strict compliance)
- Lint: 0 errors/warnings (clean code)
- Build Time: <30s (monorepo optimization)

---

*This file tracks app-specific tasks. For suite-wide checklist see: `.coord/PROJECT-CHECKLIST.md`*
