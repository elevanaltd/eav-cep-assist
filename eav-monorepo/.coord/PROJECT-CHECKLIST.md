# Monorepo Setup Checklist

## Infrastructure
- [x] Monorepo structure (directories, symlinks, root configs)
- [x] Git repository initialized
- [x] Turborepo configuration

## Shared Packages
- [x] @workspace/shared v0.5.0 operational
  - [x] Barrel exports (9 paths: auth, comments, scripts, services, editor, database, errors, extensions, mappers)
  - [x] Singleton pattern enforced (Supabase client, AuthContext)
  - [x] Quality gates passing (Lint ✅ TypeCheck ✅ Build ✅)
  - Details: Work attribution in copy-editor (created during Phase 3A)

## CI Pipeline
- [x] CI Tier 1 operational (lint→typecheck→test:unit→build on all commits)
- [x] CI Tier 2 command added (test:integration)
- [x] CI Tier 2 operational (39/39 passing, 100%) ✅
  - Status: ALL RESOLVED - Issues #2, #4, #5, #7, #15 ✅
  - Integration tests: 39/39 passing (100%)
  - Lock coordination: UX clarified with honest refresh messaging
  - PR #21: ✅ MERGED (2025-11-07) - Lock coordination resolved
  - Details: Removed realtime notification complexity, fixed force-unlock bug

## App Migrations
- [x] copy-editor Phase 3 complete
  - [x] Phase 3A: Barrel exports + import transformations (Git: 882261a)
  - [x] Phase 3B: Orchestration hooks (Git: 5a7c1dd)
  - [x] Production deployment operational (https://eav-copy-editor.vercel.app/)
  - [x] Production stability fixes (singleton pattern enforcement)
  - Details: `.coord/apps/copy-editor/APP-CHECKLIST.md` (complete task breakdown)

- [ ] scenes-web Phase 1 migration (2-3 days estimated)
  - Status: ✅ UNBLOCKED - All copy-editor tests passing, ready to begin
  - [x] Planning complete (North Star aligned, POC analyzed)
  - [ ] Migration execution: POC → monorepo (systematic import transformation)
  - [ ] Quality gates validated (lint, typecheck, test, build)
  - [ ] Vercel deployment configured (independent project per I11)
  - [ ] Production operational (target: https://eav-scenes.vercel.app/)
  - Details: `.coord/apps/scenes-web/APP-CHECKLIST.md` (Phase 1 task breakdown)

- [ ] vo-web, cam-op-pwa, edit-web, translations-web, data-entry-web (sequential)

## Supabase
- [x] Migrations source of truth (/supabase/migrations/)
- [x] Singleton pattern implemented and documented

## Documentation
- [x] Selective .coord tracking implemented (2025-11-04)
  - Binding decisions committed (North Star, DECISIONS, PROJECT-*)
  - Ephemeral scaffolding gitignored (sessions, reports, apps)
- [x] Dashboard model documented (2025-11-04)
  - PROJECT-level: Overview + references
  - APP-level: Detailed implementation + tasks
