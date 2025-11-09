# EAV Operations Hub - Project Roadmap

**Last Updated:** 2025-11-07
**Authority:** holistic-orchestrator (cross-app coordination)
**Strategic Validation:** principal-engineer (2025-11-07) - GO with guardrails
**Scope:** 7-app sequential migration (copy-editor → data-entry-web)

---

## EXECUTIVE SUMMARY

**Status:** copy-editor B4 COMPLETE ✅ | scenes-web Phase 1 READY TO START
**Timeline:** Phase 1-4 sequential migrations (~6-8 weeks total)
**Strategic Assessment:** GO with architectural guardrails (PE validation)

**Critical Inflection Points:**
- **3-App Horizon**: Shared package modularization required (avoid PR contention)
- **5-App Horizon**: Migration coordination + test harness expansion mandatory
- **7-App Horizon**: Remote caching + auth role evolution critical

---

## APP MIGRATION SEQUENCE

### Phase 1: Foundation (COMPLETE ✅)

**App 1: copy-editor**
- **Status**: B4 Production Operational ✅
- **Production**: https://eav-copy-editor.vercel.app/
- **Completion**: 2025-11-03 (Phase 3B) + 2025-11-07 (Issue #15 resolved)
- **Quality Gates**: Lint ✅ TypeCheck ✅ Test 378/384 (98.4%) ✅ Build ✅
- **Architecture Established**:
  - Barrel exports: 9 clean paths from `@workspace/shared`
  - Singleton pattern: Supabase client + AuthContext
  - Test infrastructure: Dual-client harness, CI patterns A1-A7
  - Migration governance: HO-MIGRATION-GOVERNANCE-20251107
  - RLS security: 47 policies operational, fail-closed
- **Patterns Proven**:
  - Monorepo → independent Vercel deployment (zero blast radius)
  - App-specific state: `script_locks` table + shared component spine
  - Orchestration hooks: Shared primitives → app hooks → UI components
  - TDD discipline: 40% explicit RED→GREEN evidence, 98.4% coverage

---

### Phase 2: Second App Validation (READY TO START)

**App 2: scenes-web**
- **Status**: Phase 1 Planning Complete, Migration UNBLOCKED
- **Target**: https://eav-scenes.vercel.app/
- **Timeline**: 2-3 days (systematic POC extraction)
- **Strategic Validation**: principal-engineer GO (2025-11-07) with guardrails
- **Dependencies**:
  - ✅ copy-editor patterns proven
  - ✅ @workspace/shared v0.5.0 operational
  - ✅ Quality gates validated
  - ⚠️ TipTapEditor extraction pending (future enhancement)
- **Phase 1 Scope**:
  - Extract from POC → monorepo (import transformation)
  - Reuse @workspace/shared packages (auth, database, scripts)
  - Configure independent Vercel deployment
  - Validate quality gates (lint, typecheck, test, build)
  - Implement scene-specific state tables: `scene_planning_state`, `shots`
- **App-Specific State**:
  - `scene_planning_state`: Scene planning workflow status
  - `shots`: Shot-level filming details
  - Read-only: `script_components` (shared component spine)
- **Strategic Checkpoints** (from PE assessment):
  - ⚠️ Monitor `@workspace/shared` size (currently 108 files, 20K LOC)
  - ⚠️ Validate singleton pattern across 2 concurrent apps
  - ⚠️ Test dual-client harness with 2 apps in CI

**Next Phase Gate:** scenes-web B4 complete → Evaluate shared package modularization

---

### Phase 3: Modularization Checkpoint (STRATEGIC REMEDIATION)

**Timing:** After scenes-web B4, before vo-web Phase 1
**Duration:** 1 week (architectural refactoring)
**Authority:** principal-engineer strategic recommendation

**Critical Decision Point:**
> "Without sub-packages, `@workspace/shared` becomes the only release train; every change to `auth` or `editor` will force synchronized deploys. Expect PR contention and regression risk by app 3."

**Modularization Plan:**
1. Split `@workspace/shared` into sub-packages:
   - `@workspace/auth` (AuthContext, auth helpers)
   - `@workspace/data` (Supabase client, database utilities)
   - `@workspace/editor` (TipTap integration, lock coordination)
   - `@workspace/comments` (commenting system, position recovery)
2. Maintain barrel re-export for backward compatibility
3. Publish isolated build pipelines (per-package versioning)
4. Update copy-editor + scenes-web to use sub-packages
5. Track LOC per module (trend data for future scaling)

**Migration Coordination Enhancement:**
- Introduce weekly migration queue + owner assignment
- Add automated drift checks (`supabase db lint` or `migra` diff in CI)
- Tie every migration PR to app ID in PROJECT-CONTEXT

**Test Harness Expansion:**
- Move `auth-helpers` + BroadcastChannel stubs to shared testing kit
- Expand test user matrix: Admin, Client, Scenes, VO, Cam, Translator
- Shard credentials per app (avoid Supabase 30-60 req/hr limit)
- Add per-suite rate limit telemetry

**Performance Guardrails:**
- Wire Turborepo remote caching (before 3+ app builds)
- Set build/test SLOs per app (fail CI when >2× baseline)
- Clone copy-editor bundle optimization tests to all apps

**GO/NO-GO:** Must complete modularization before vo-web Phase 1

---

### Phase 4: Parallel Workflows Apps (3-5)

**App 3: vo-web (Voice-Over Generation)**
- **Status**: Planned (awaits Phase 3 modularization)
- **Timeline**: 3-4 days (after modularization complete)
- **Dependencies**:
  - ✅ TipTapEditor extraction to `@workspace/editor` (enables script reuse)
  - ✅ Sub-package modularization (reduces deployment coupling)
  - ⚠️ ElevenLabs API integration (voice generation)
- **App-Specific State**:
  - `vo_generation_state`: Voice-over generation workflow
  - `voice_takes`: Audio file references + approval tracking
  - Read-only: `script_components` (shared spine for VO scripts)
- **Strategic Checkpoint**:
  - ⚠️ Validate sub-package isolation (vo-web shouldn't force copy-editor redeploy)
  - ⚠️ Monitor migration coordination (first app touching shared tables post-modularization)

**App 4: cam-op-pwa (Offline-Capable Filming Checklist)**
- **Status**: Planned
- **Timeline**: 4-5 days (PWA complexity + offline sync)
- **Dependencies**:
  - ✅ Sub-package modularization
  - ⚠️ PWA architecture (service worker, offline storage)
  - ⚠️ Offline sync strategy ("server wins" conflict resolution)
- **App-Specific State**:
  - `shot_completion_state`: Offline shot tracking
  - `filming_notes`: Field notes + sync queue
  - Read-only: `shots`, `scene_planning_state` (filming reference)
- **Strategic Checkpoint** (North Star I5):
  - ⚠️ Offline-capable PWA validation (constitutional requirement)
  - ⚠️ Conflict resolution testing (5+ days offline → sync)

**App 5: edit-web (Edit Guidance with Script Reference)**
- **Status**: Planned
- **Timeline**: 3-4 days
- **Dependencies**:
  - ✅ TipTapEditor reuse from `@workspace/editor`
  - ✅ Script component spine (read-only reference during editing)
- **App-Specific State**:
  - `edit_guidance_state`: Edit workflow tracking
  - `edit_notes`: Editor instructions + timestamps
  - Read-only: `script_components`, `shots` (reference material)
- **Strategic Checkpoint** (5-App Horizon):
  - ⚠️ Migration conflict detection (PE prediction: dominant failure mode)
  - ⚠️ Dual-client harness collision (5 apps in CI = test user saturation)
  - ⚠️ Auth role drift detection (non-client-first roles emerging)

---

### Phase 5: Content Generation Apps (6-7)

**App 6: translations-web (Subtitle Translation)**
- **Status**: Planned
- **Timeline**: 3-4 days (LLM integration complexity)
- **Dependencies**:
  - ✅ Sub-package modularization
  - ⚠️ LLM API integration (translation generation, North Star I3)
  - ⚠️ Human review workflow (approval gate for LLM output)
- **App-Specific State**:
  - `translation_state`: Translation workflow + language tracking
  - `translated_subtitles`: Translated content + approval status
  - Read-only: `script_components` (source content for translation)
- **Strategic Checkpoint** (North Star I3):
  - ⚠️ LLM content generation quality validation
  - ⚠️ Human review gate enforcement (prevent LLM hallucinations)

**App 7: data-entry-web (Client Specs → Structured Data)**
- **Status**: Planned (final app)
- **Timeline**: 4-5 days (complex form logic + SmartSuite integration)
- **Dependencies**:
  - ✅ Sub-package modularization
  - ⚠️ SmartSuite webhook handler (project/video sync)
  - ⚠️ LLM extraction (180+ fields from client specs, North Star I3)
- **App-Specific State**:
  - `data_entry_state`: Form completion workflow
  - `extracted_specs`: LLM-extracted client specifications
  - Read/Write: `projects`, `videos` (SmartSuite sync targets)
- **Strategic Checkpoint** (7-App Horizon):
  - ⚠️ CI build time validation (PE prediction: >15 min without remote cache)
  - ⚠️ Auth context evolution (parameterized roles operational)
  - ⚠️ Bundle size regression prevention (all apps <2MB per chunk)

---

## CROSS-APP DEPENDENCIES

### Shared Database Tables (Read by All Apps)
- `projects`: Client project metadata (SmartSuite sync)
- `videos`: Video details + project association
- `user_profiles`: User authentication + role management
- `script_components`: Component-based content spine (North Star I1)

### Shared Infrastructure
- **@workspace/shared** (modularized after Phase 3):
  - `@workspace/auth`: AuthContext, singleton, helpers
  - `@workspace/data`: Supabase client, database utilities
  - `@workspace/editor`: TipTap integration, lock coordination
  - `@workspace/comments`: Commenting system, position recovery
- **CI/CD Pipeline**: Tier 1 (lint→typecheck→test:unit→build) + Tier 2 (test:integration)
- **Supabase**: Single project, `/supabase/migrations/` source of truth (North Star I12)
- **Test Infrastructure**: Dual-client harness, auth helpers, factories

### App-Specific State Tables (No Cross-App Dependencies)
| App | State Tables | Purpose |
|-----|--------------|---------|
| copy-editor | `script_locks` | Lock coordination, heartbeat tracking |
| scenes-web | `scene_planning_state`, `shots` | Scene planning workflow, shot details |
| vo-web | `vo_generation_state`, `voice_takes` | VO generation, audio file references |
| cam-op-pwa | `shot_completion_state`, `filming_notes` | Offline shot tracking, field notes |
| edit-web | `edit_guidance_state`, `edit_notes` | Edit workflow, editor instructions |
| translations-web | `translation_state`, `translated_subtitles` | Translation workflow, translated content |
| data-entry-web | `data_entry_state`, `extracted_specs` | Form completion, LLM extraction |

---

## TIMELINE ESTIMATES

**Total Duration:** 6-8 weeks (sequential migrations)

| Phase | Apps | Duration | Dependencies |
|-------|------|----------|--------------|
| **Phase 1** | copy-editor | ✅ COMPLETE | Monorepo setup, test infrastructure |
| **Phase 2** | scenes-web | 2-3 days | copy-editor patterns proven |
| **Phase 3** | Modularization | 1 week | scenes-web B4 complete |
| **Phase 4** | vo-web, cam-op-pwa, edit-web | 10-13 days | Sub-packages operational |
| **Phase 5** | translations-web, data-entry-web | 7-9 days | 5-app validation complete |

**Parallel Work Opportunities:**
- Documentation can parallel with implementation
- Quality gate validation can parallel with next app planning
- Test infrastructure improvements can parallel with migrations

**Risk Buffers:**
- Add 20% contingency for unexpected integration issues
- Add 1-2 days per app for production validation
- PE checkpoint meetings: 1 hour each at 3-app and 5-app horizons

---

## STRATEGIC REMEDIATION CHECKPOINTS

### 3-App Checkpoint (After scenes-web B4)
**Triggers:** [DEBT_ACCUMULATION] pattern detected by PE
**Required Actions:**
1. ✅ Split `@workspace/shared` into sub-packages
2. ✅ Introduce migration queue + drift automation
3. ✅ Expand dual-client test harness (user matrix)
4. ✅ Wire Turborepo remote caching

**Validation Criteria:**
- Sub-package build independence verified (vo-web doesn't trigger copy-editor rebuild)
- Migration queue operational with automated drift checks
- Test harness supports 5+ concurrent users without rate limit errors
- Remote cache hit rate >80% on CI

**GO/NO-GO:** Must pass 3-app checkpoint before vo-web Phase 1

---

### 5-App Checkpoint (After edit-web B4)
**Triggers:** [FAILURE_PATTERN] migration conflicts + harness saturation
**Required Actions:**
1. ✅ Validate migration coordination (no out-of-order SQL conflicts)
2. ✅ Confirm test harness sharding (per-app credentials)
3. ✅ Auth context evolution deployed (parameterized roles)
4. ✅ Build SLOs enforced (CI fails when >2× baseline)

**Validation Criteria:**
- Zero migration conflicts in last 10 PRs
- Test suite duration <5 min per app (sharded credentials effective)
- Auth role assignment automatic per app (no manual overrides)
- CI build time <10 min for all 5 apps

**GO/NO-GO:** Must pass 5-app checkpoint before translations-web Phase 1

---

### 7-App Checkpoint (After data-entry-web B4)
**Triggers:** [DECAY_DETECTED] CI performance + auth drift
**Required Actions:**
1. ✅ CI build time <15 min (PE prediction threshold)
2. ✅ All apps bundle size <2MB per chunk
3. ✅ Auth singleton operational across 7 concurrent apps
4. ✅ Migration governance compliance 100% (no policy violations)

**Validation Criteria:**
- Full monorepo build + test suite <15 min on CI
- No bundle size regressions (all apps meet copy-editor baseline)
- Concurrent local dev servers (7 apps) without localStorage conflicts
- Zero migration governance violations in last 20 PRs

**GO/NO-GO:** System ready for production handoff + ongoing maintenance

---

## PRINCIPAL ENGINEER STRATEGIC ASSESSMENT

**Date:** 2025-11-07
**Authority:** principal-engineer (6-12 month viability validation)
**Verdict:** GO with architectural guardrails

**Key Findings:**
1. **Shared Package Fragility** (Primary Decay Vector):
   - Current: 108 source files, 20,151 LOC, 12 barrel exports
   - Prediction: PR contention + regression risk by app 3 without modularization
   - Remediation: Split into `@workspace/{auth,data,editor,comments}` before vo-web

2. **Security + State Layer** (Healthy but Pressure Rising):
   - Current: 58 RLS policies centralized in baseline migration
   - Prediction: Migration conflicts dominant failure mode by app 5
   - Remediation: Weekly migration queue + automated drift checks

3. **Testing Infrastructure** (Strong but Brittle):
   - Current: 377/383 tests @ 98.4%, dual-client harness reduces auth calls by 92.5%
   - Prediction: Harness saturation when 5+ apps hit CI simultaneously
   - Remediation: Expand test user matrix, shard credentials per app

4. **Performance Baseline** (Optimistic Floor):
   - Current: ~1.4s build for shared + copy-editor, chunk sizes <2MB
   - Prediction: >15 min CI by app 7 without remote caching
   - Remediation: Wire Turborepo remote caching now, enforce build SLOs

5. **Auth Singleton** (Works Per App, Requires Evolution):
   - Current: Manual chunking prevents singleton duplication, role=`client` default
   - Prediction: Auth role drift by app 7 (cam ops, translators need non-client roles)
   - Remediation: Parameterize `AuthProvider` for per-app default roles

**Strategic Recommendations (Prioritized):**
1. **CRITICAL**: Modularize shared package before app 3 (avoid release train bottleneck)
2. **HIGH**: Institutionalize migration cadence (weekly queue + drift automation)
3. **HIGH**: Operationalize dual-client harness (expand user matrix, shard credentials)
4. **MEDIUM**: Performance guardrails (remote caching, build SLOs)
5. **MEDIUM**: Auth context evolution (parameterized roles)

**Inflection Points:**
- **3-App Horizon**: Shared package becomes bottleneck without modularization
- **5-App Horizon**: Migration conflicts + test harness collision dominant failure modes
- **7-App Horizon**: CI performance + auth role drift critical issues

**Next Steps:**
1. Create RFC for shared package segmentation + testing kit
2. Stand up migration release calendar + drift automation
3. Clone copy-editor's build/test guardrails into scenes-web before code import

---

## RISK MATRIX

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| **Shared package bottleneck** | HIGH (by app 3) | HIGH | Modularize after scenes-web B4 | principal-engineer |
| **Migration conflicts** | MEDIUM (by app 5) | HIGH | Weekly queue + drift automation | holistic-orchestrator |
| **Test harness saturation** | MEDIUM (by app 5) | MEDIUM | Expand user matrix, shard credentials | test-infrastructure-steward |
| **CI performance degradation** | HIGH (by app 7) | MEDIUM | Remote caching + build SLOs | principal-engineer |
| **Auth role drift** | LOW (by app 7) | MEDIUM | Parameterize AuthProvider | code-review-specialist |
| **Bundle size regression** | LOW | MEDIUM | Per-app bundle tests | code-review-specialist |
| **LocalStorage conflicts** | LOW | LOW | UX clarification (shared sessions) | implementation-lead |

---

## QUALITY GATES (ALL APPS)

**Mandatory Before Phase Progression:**
- Lint: 0 errors, 0 warnings
- TypeCheck: 0 errors
- Test:unit: >95% passing
- Test:integration: 100% passing
- Build: Success (all workspaces)

**Mandatory Before Production:**
- RLS policies implemented for all app-specific tables
- Migration governance compliance (no deleted migrations)
- Bundle size <2MB per chunk
- Performance baseline met (<100ms component extraction for relevant apps)
- Vercel deployment successful (independent domain configured)

---

## CONSTITUTIONAL COMPLIANCE

**North Star Immutables (Validated):**
- I1: Component-based spine ✅ (copy-editor operational)
- I2: Multi-client RLS ✅ (47 policies, fail-closed)
- I6: App-specific state ✅ (deployment independence proven)
- I7: TDD RED discipline ⚠️ (40% explicit evidence, formalization pending)
- I8: Production-grade quality ✅ (strict TypeScript, RLS, singleton)
- I11: Independent deployment ✅ (Vercel architecture validated)
- I12: Single migration source ✅ (governance pattern established)

**RACI Consultations:**
- principal-engineer: Strategic validation ✅ (2025-11-07)
- critical-engineer: Tactical validation (per-app before B4)
- test-methodology-guardian: Test discipline (per-app before B2)
- requirements-steward: North Star alignment (phase transitions)

---

## DOCUMENTATION REFERENCES

**Binding Decisions:**
- `.coord/DECISIONS.md` - All architectural decisions with rationale
- `.coord/workflow-docs/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md` - North Star I1-I12

**Strategic Assessments:**
- This document: PROJECT-ROADMAP.md (7-app timeline)
- `.coord/reports/REPORT-COMPREHENSIVE-REPOSITORY-REVIEW-20251107.md` - Full health audit
- `.coord/reports/REPORT-COMPREHENSIVE-TDD-REVIEW-20251107.md` - TDD discipline analysis

**App-Specific:**
- `.coord/apps/copy-editor/APP-CONTEXT.md` - copy-editor complete history
- `.coord/apps/copy-editor/APP-CHECKLIST.md` - copy-editor task breakdown
- `.coord/apps/scenes-web/` - scenes-web planning (created during Phase 1)

---

**Authority:** holistic-orchestrator (ULTIMATE_ACCOUNTABILITY)
**Strategic Validation:** principal-engineer (GO with guardrails)
**Last Updated:** 2025-11-07

<!-- Constitutional compliance: North Star I1-I12, RACI consultations complete -->
<!-- Strategic remediation: 3-app, 5-app, 7-app checkpoints defined -->
<!-- PE assessment: GO with modularization before app 3 (CRITICAL) -->
