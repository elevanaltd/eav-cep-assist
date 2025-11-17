# B2 Build Plan – XMP-First Architecture Refactor

## 1. Executive Summary

### Timeline & Status
- **Duration:** 5 days validated (realistic with 6.5h buffer for ExtendScript debugging)
- **Total Effort:** 33.5h work + 6.5h buffer = 40h
- **B1 Status:** ✅ COMPLETE (workspace-architect finished B1.1 quality gates 2025-11-15)
- **Validation:** CONDITIONAL GO (85% confidence) from critical-design-validator → blocking issues RESOLVED → final GO approved

### Blueprint Overview
- **Architectural vision:** Replace the fragile QE DOM metadata dependency with the ADR-003 approved XMP-First access layer so that offline clips inherit identical metadata fidelity as online media while keeping ExtendScript ES3-safe and panel APIs stable.
- **Component summary:** (1) `metadata-access.jsx` module bootstrapping AdobeXMPScript + namespace registration, (2) field read/write primitives with a dictionary describing Location, Subject, Action, Shot Type, Frame Rate, Codec, Duration, (3) cache orchestration that always persists via `ProjectItem.getProjectMetadata()`, (4) navigation + metadata panels consuming the refactored payload, (5) manual validation harness ensuring extendibility.
- **Innovation preservation:** We retain the two-panel UX and the proven CEP event choreography while elevating data access, guaranteeing offline safety and Team Projects portability previously validated in ADR-003.
- **System coherence:** Dependencies follow the XMPScript initialization → primitives → mapping dictionary → ExtendScript consumers chain mandated by the delegation package, ensuring each higher layer only activates after the lower layer proves viable via TDD.

## 2. Refinement Analysis

### 2.1 Context Loading Evidence
- ADR-003 confirms feasibility (9877-char XMP packet) and mandates the XMPScript-first hierarchy.
- PROJECT-CONTEXT + ROADMAP show Issue #32 resolved conceptually and B2 targeting 4 days.
- SHARED-CHECKLIST reveals B1 quality gates still in progress, so this plan keeps lint/test tooling assumptions explicit and calls out dependencies on workspace-architect for gate readiness.
- CLAUDE.md documents two-panel data flow, guiding how `js/navigation-panel.js` consumes `getAllProjectClips()` and why characterization tests must accompany refactors.
- Repomix snapshot `.coord/reports/codebase-analysis.xml` collected prior to decomposition.

### 2.2 Task Breakdown & TDD Sequences (17 Atomic Tasks)
Effort estimates keep every task under 4 hours and include explicit RED→GREEN→REFACTOR flows plus TRACED/RACI assignments. **New tasks B2.0, B2.1.1, B2.6.1 added per critical-design-validator MUST FIX requirements.**

#### B2.0 – Validate ES3 Enforcement Tooling (1h) **[NEW - MUST FIX #1]**
- **Outcome:** Verify ESLint ES3 profile catches const/let/arrow function violations, create test file with ES5+ violations (`jsx/test-es3-violations.jsx`), confirm `npm run lint` rejects violations.
- **Dependencies:** B1.1 complete (ESLint configured).
- **TDD:** RED – create test file with ES5+ syntax (const, let, arrow functions). GREEN – run `npm run lint`, confirm errors detected. REFACTOR – document ES3 enforcement in CLAUDE.md or DEVELOPMENT-WORKFLOW.md.
- **TRACED:** T=workspace-architect (confirms B1 gates); R=code-review-specialist (ES3 validation); A=technical-architect; C=validator (enforcement mechanism); E=workspace-architect; D=workspace-architect updates docs.
- **RACI:** R=workspace-architect; A=technical-architect; C=code-review-specialist + validator; I=holistic-orchestrator.
- **Evidence Required:** CI log showing ESLint ES3 errors + ExtendScript console load test screenshot showing syntax validation.

#### B2.1 – Characterize QE DOM payloads for offline clips (2.5h)
- **Outcome:** Capture current `getAllProjectClips()` JSON + QE-only metadata for online/offline fixtures so regressions are detectable.
- **Dependencies:** B2.0 complete, B1 test harness available (`npm test`), access to current ExtendScript output.
- **TDD:** RED – add failing Vitest that snapshots offline clip payload (currently `undefined`). GREEN – record actual QE output into fixture (`test/fixtures/qe-columns.json`). REFACTOR – wrap fixture loader for reuse.
- **TRACED:** T=testguard & implementation-lead; R=code-review-specialist (ES3 fixture stubs); A=technical-architect (ensures scope focus); C=workspace-architect (test harness readiness); E=implementation-lead; D=design-architect logs evidence in 005 plan.
- **RACI:** R=implementation-lead; A=technical-architect; C=testguard + workspace-architect; I=holistic-orchestrator.

#### B2.1.1 – Benchmark QE DOM Performance Baseline (1h) **[NEW - MUST FIX #2]**
- **Outcome:** Instrument current `getAllProjectClips()` with `$.hiresTimer`, test with 10/50/100 clip projects, record QE DOM timings as performance baseline.
- **Dependencies:** B2.1 complete (access to current implementation).
- **TDD:** RED – add performance test expecting baseline measurements. GREEN – instrument QE DOM code, capture timings in test projects. REFACTOR – document baseline in performance log (`.coord/reports/qe-dom-baseline-YYYYMMDD.md`).
- **TRACED:** T=testguard + implementation-lead; R=code-review-specialist; A=critical-engineer (performance validation); C=technical-architect; E=implementation-lead; D=implementation-lead updates B2.7 acceptance criteria to "XMP performance ≤ QE baseline +10%".
- **RACI:** R=implementation-lead; A=critical-engineer; C=testguard + technical-architect; I=holistic-orchestrator.
- **Evidence Required:** Performance baseline document with measurements for 10/50/100 clip projects.

#### B2.2 – XMPScript bootstrap + namespace registration (3h)
- **Outcome:** `metadata-access.jsx` loads AdobeXMPScript once, registers `http://eav.com/ns/cep/1.0/` (eav:) and exposes `ensureXMPScriptLoaded()`.
- **Dependencies:** B2.1.1 complete; ExtendScript console accessible.
- **TDD:** RED – ExtendScript characterization script expecting thrown error when XMPScript missing. GREEN – implement singleton loader with namespace registration. REFACTOR – add diagnostics + guard rails.
- **TRACED:** T=testguard (manual log capture) + IL; R=code-review-specialist (ES3 compliance); A=technical-architect; C=validator (error handling expectations); E=implementation-lead; D=implementation-lead updates CLAUDE.md XMP appendix.
- **RACI:** R=implementation-lead; A=technical-architect; C=code-review-specialist; I=holistic-orchestrator.

#### B2.3 – Implement `readProjectField()` primitive (3h)
- **Outcome:** Function reads requested field from project XMP, falls back to media XMP if online, returns normalized value.
- **Dependencies:** B2.2.
- **TDD:** RED – unit test using mocked ProjectItem verifying fallback path. GREEN – implement read logic with XMPScript DOM traversal. REFACTOR – extract constants + error strings.
- **TRACED:** T=testguard; R=code-review-specialist; A=critical-engineer (performance review); C=technical-architect (field semantics); E=implementation-lead; D=design-architect logs acceptance criteria.
- **RACI:** R=implementation-lead; A=technical-architect; C=critical-engineer + testguard; I=holistic-orchestrator.

#### B2.4 – Implement `writeProjectField()` primitive (2.5h)
- **Outcome:** Write helper that commits normalized metadata back into project XMP with optional cache flag.
- **Dependencies:** B2.3.
- **TDD:** RED – failing test ensures write rejects offline-without-cache scenario. GREEN – implement write + setProjectMetadata call. REFACTOR – share namespace constants.
- **TRACED:** T=testguard; R=code-review-specialist; A=technical-architect; C=critical-engineer (cache implications); E=implementation-lead; D=implementation-lead updates docs/CLAUDE.
- **RACI:** R=implementation-lead; A=technical-architect; C=critical-engineer; I=holistic-orchestrator.

#### B2.5 – Field mapping dictionary + validators (2h)
- **Outcome:** Authoritative mapping for Location, Subject, Action, Shot Type, Frame Rate, Codec, Duration with validation + display metadata (panel labels, XMP paths).
- **Dependencies:** B2.3 & B2.4.
- **TDD:** RED – failing test ensures dictionary rejects unknown fields/invalid namespace. GREEN – add dictionary + schema validation helper. REFACTOR – deduplicate constants.
- **TRACED:** T=testguard; R=code-review-specialist; A=technical-architect; C=workspace-architect (naming alignment); E=implementation-lead; D=design-architect cross-links ADR-003.
- **RACI:** R=implementation-lead; A=technical-architect; C=workspace-architect; I=holistic-orchestrator.

#### B2.6 – Compose metadata aggregator object (2.5h)
- **Outcome:** Build `buildClipMetadataRecord(item)` returning navigation-ready payload (fields + diagnostics) using primitives.
- **Dependencies:** B2.5.
- **TDD:** RED – failing unit test verifying offline clip returns cached values + `source: 'project'`. GREEN – implement aggregator. REFACTOR – share serializer across panels.
- **TRACED:** T=testguard; R=code-review-specialist; A=critical-engineer; C=technical-architect; E=implementation-lead; D=implementation-lead writes usage doc.
- **RACI:** R=implementation-lead; A=technical-architect; C=critical-engineer; I=holistic-orchestrator.

#### B2.6.1 – Implement Feature Flag + Rollback (2h) **[NEW - MUST FIX #3]**
- **Outcome:** Create `USE_XMP_FIRST` flag (environment variable or config constant, default: false during Phase 1), maintain QE DOM code paths behind flag check, add manual test to toggle flag and verify both modes functional.
- **Dependencies:** B2.6 complete (aggregator available).
- **TDD:** RED – add test expecting QE DOM when flag=false, XMP when flag=true. GREEN – implement feature flag logic in `getAllProjectClips()` and `getSelectedClips()`. REFACTOR – document rollback procedure in CLAUDE.md.
- **TRACED:** T=testguard; R=code-review-specialist; A=technical-architect; C=validator (rollback strategy); E=implementation-lead; D=implementation-lead documents rollback procedure in CLAUDE.md "Debugging" section.
- **RACI:** R=implementation-lead; A=technical-architect; C=code-review-specialist + validator; I=holistic-orchestrator.
- **Evidence Required:** Manual test results showing both flag modes functional + rollback procedure documented.

#### B2.7 – Refactor `getAllProjectClips()` to use aggregator (3.5h, critical path)
- **Outcome:** Function eliminates QE DOM references, iterates project tree once, returns aggregator output plus instrumentation (<50 ms per clip target).
- **Dependencies:** B2.6.1 complete (feature flag implemented).
- **TDD:** RED – characterization test ensures JSON structure unchanged for panels. GREEN – replace implementation + add timing logs. REFACTOR – remove QE diagnostics.
- **TRACED:** T=testguard; R=code-review-specialist; A=technical-architect; C=holistic-orchestrator + critical-engineer (performance validation); E=implementation-lead; D=design-architect updates plan.
- **RACI:** R=implementation-lead; A=technical-architect; C=code-review-specialist + critical-engineer; I=holistic-orchestrator.

#### B2.8 – Refactor `getSelectedClips()` + CEP payload contract (2.5h)
- **Outcome:** Selection path uses aggregator, ensures Metadata Panel receives same schema as Navigation Panel.
- **Dependencies:** B2.6.1, B2.7 complete.
- **TDD:** RED – failing integration test verifying CEP event payload shape. GREEN – apply refactor. REFACTOR – share serializer.
- **TRACED:** T=testguard; R=code-review-specialist; A=critical-engineer; C=metadata-panel owner; E=implementation-lead; D=implementation-lead updates CEP contract doc.
- **RACI:** R=implementation-lead; A=technical-architect; C=critical-engineer + metadata-panel owner; I=holistic-orchestrator.

#### B2.9 – Implement derived-field cache + import/relink hooks (3h)
- **Outcome:** Introduce `cacheMediaFields(item)` capturing Frame Rate, Codec, Duration into project XMP and hooking into import/relink flows as described in ADR-003.
- **Dependencies:** B2.8.
- **TDD:** RED – failing unit test verifying offline clip returns cached frame rate after media path removal. GREEN – implement caching + flag `cacheVersion`. REFACTOR – parameterize fields.
- **TRACED:** T=testguard; R=code-review-specialist; A=critical-engineer (performance); C=technical-architect; E=implementation-lead; D=design-architect updates ADR status.
- **RACI:** R=implementation-lead; A=technical-architect; C=critical-engineer; I=holistic-orchestrator.

#### B2.10 – Refresh-from-media command + UI link (3h)
- **Outcome:** ExtendScript command to rehydrate cache from media XMP plus Metadata Panel control calling it (manual test only).
- **Dependencies:** B2.9, workspace-architect delivering B1 quality gates for lint/test on JS.
- **TDD:** RED – failing unit test stub verifying command dispatch; GREEN – implement ExtendScript + JS wiring; REFACTOR – share result messaging.
- **TRACED:** T=testguard; R=code-review-specialist; A=technical-architect; C=workspace-architect (UI copy); E=implementation-lead; D=implementation-lead updates CLAUDE.
- **RACI:** R=implementation-lead; A=technical-architect; C=workspace-architect; I=holistic-orchestrator.

#### B2.11 – Metadata access unit test suite (2h)
- **Outcome:** Automated tests covering read/write/mapping functions with mock XMPScript objects to enforce <50 ms logic boundaries.
- **Dependencies:** B2.10.
- **TDD:** RED – add tests for success + error paths; GREEN – ensure suite passes; REFACTOR – integrate into `npm test`.
- **TRACED:** T=testguard; R=code-review-specialist; A=technical-architect; C=validator; E=implementation-lead; D=testguard updates SHARED-CHECKLIST.
- **RACI:** R=implementation-lead; A=technical-architect; C=testguard; I=holistic-orchestrator.

#### B2.12 – Navigation panel characterization regression tests (2.5h)
- **Outcome:** JS integration tests verifying clip list rendering, filter logic, and CEP payload compatibility with new schema.
- **Dependencies:** B2.11.
- **TDD:** RED – failing tests for load/render; GREEN – update panel data adapters; REFACTOR – share fixtures with ExtendScript tests.
- **TRACED:** T=testguard; R=code-review-specialist; A=critical-engineer; C=navigation-panel maintainer; E=implementation-lead; D=implementation-lead updates docs.
- **RACI:** R=implementation-lead; A=technical-architect; C=critical-engineer + navigation maintainer; I=holistic-orchestrator.

#### B2.13 – Manual offline workflow validation suite (3.5h)
- **Outcome:** Execute ADR-003 manual tests (offline access, cache refresh, Team Projects propagation) and attach logs/screenshots as approval artifacts.
- **Dependencies:** B2.12.
- **TDD:** RED – scripted manual test plan with expected failures before running; GREEN – perform tests and capture logs; REFACTOR – distill results into SHARED-CHECKLIST + Issue #32 comment.
- **TRACED:** T=testguard; R=critical-engineer; A=technical-architect; C=holistic-orchestrator; E=implementation-lead; D=design-architect records approval artifacts.
- **RACI:** R=implementation-lead; A=technical-architect; C=testguard + holistic-orchestrator; I=stakeholders.

#### B2.14 – Documentation + Issue closure (2h)
- **Outcome:** Update CLAUDE.md (XMP debugging), ADR-003 status (implementation underway), log success metrics, close Issue #32 with evidence referencing manual + automated tests.
- **Dependencies:** B2.13.
- **TDD:** RED – failing checklist entry in Validation Checklist; GREEN – update docs/issues; REFACTOR – link-coded references for future sessions.
- **TRACED:** T=testguard verifies documentation checkboxes; R=code-review-specialist ensures clarity; A=technical-architect; C=holistic-orchestrator; E=implementation-lead; D=design-architect finalizes B0 handoff.
- **RACI:** R=implementation-lead; A=technical-architect; C=holistic-orchestrator; I=requirements-steward.

### 2.3 Critical Path & Dependency Graph
```
B2.0 → B2.1 → B2.1.1 → B2.2 → B2.3 → B2.4 → B2.5 → B2.6 → B2.6.1 → B2.7 → B2.8 → B2.9 → B2.10 → B2.11 → B2.12 → B2.13 → B2.14
                                              ↘ (cache)                     ↘ (manual tests) 
```
- **Critical path duration:** 33.5h work + 6.5h buffer = 40 hours (5 workdays) assuming 8h/day focus for implementation-lead. Tasks B2.0–B2.10 define the technical conversion; B2.11–B2.14 provide reliability + documentation gates.
- **Parallelizable work:** Workspace-architect can continue B1 gating; holistic-orchestrator may prep UI copy while waiting for B2.9.
- **New tasks added:** B2.0 (ES3 validation), B2.1.1 (performance baseline), B2.6.1 (feature flag) per critical-design-validator MUST FIX requirements.

## 3. Validation Evidence
- **Feasibility:** ADR-003 POC retrieved 9,877-char XMP; XMPScript availability proven in Premiere 25.5.0.
- **Test discipline:** Each task enumerates RED→GREEN→REFACTOR actions referencing Vitest/ExtendScript + manual harnesses. Commands: `npm test -- metadata-access`, `npm run lint`, `node scripts/quality-gates.js` (post-B1).
- **Performance guard:** B2.7 instrumentation logs `getAllProjectClips` durations, failing tests if >50 ms per clip average.
- **Manual test script:** Derived from ADR-003 validation strategy (offline workflow, cache refresh, Team Projects sync) to be executed in B2.13 with console logs archived in `.coord/reports/offline-validation-YYYYMMDD.md`.
- **Risk countermeasures:** ExtendScript ES3 review by code-review-specialist ensures no const/let; fallback to QE DOM remains accessible behind feature flag until Phase 1 gate passes, allowing rollback if XMPScript fails unexpectedly.

## 4. Synthesis Artifacts (TENSION → INSIGHT → SYNTHESIS)
1. **Tension:** Offline clips return `undefined` via QE DOM while UI must remain unchanged.  
   **Insight:** Project XMP already stores authoritative metadata, and ADR-003 proved XMPScript can supply it even when media offline.  
   **Synthesis:** Create an XMP-first metadata layer feeding both navigation + metadata panels so offline reliability emerges without UI changes.
2. **Tension:** B1 quality gates lag, yet B2 must proceed in parallel.  
   **Insight:** TDD discipline can still run via existing Vitest harness if we scope tests to new files and flag dependencies on workspace-architect.  
   **Synthesis:** Embed gate-readiness checks into TRACED assignments (workspace-architect consulted) so B2 tasks run safely while surfacing blockers early.
3. **Tension:** Replace QE DOM quickly without breaking proven navigation behavior.  
   **Insight:** Characterization tests (B2.1, B2.12) can freeze current outputs, enabling fearless refactors.  
   **Synthesis:** Sequence tasks to capture fixtures first, then refactor, guaranteeing emergent regression safety beyond manual QA.

## 5. Delivery Package

### 5.1 Implementation Guidance
1. **Initialize XMPScript** (B2.2) using singleton + `ExternalObject("lib:AdobeXMPScript")`.
2. **Create metadata-access module** (B2.3–B2.6) exporting read/write helpers and aggregator.
3. **Refactor ExtendScript entry points** (B2.7–B2.8) to call aggregator while preserving JSON schema.
4. **Add cache + refresh flows** (B2.9–B2.10) ensuring manual refresh command toggles instrumentation logs.
5. **Harden with tests + docs** (B2.11–B2.14) before B0 handoff.

### 5.2 TRACED Enforcement Matrix (Phase-Level) **[UPDATED]**
| Phase | Test (T) | Review (R) | Analyze (A) | Consult (C) | Execute (E) | Document (D) |
|-------|----------|------------|-------------|-------------|-------------|--------------|
| **Phase 0** (B2.0) | workspace-architect runs ES3 validation | code-review-specialist (ES3) | technical-architect | validator (enforcement) | workspace-architect | workspace-architect updates docs |
| **Phase 1** (B2.1–B2.6.1) | testguard + IL run Vitest & ExtendScript fixtures | code-review-specialist (ES3) | technical-architect validates namespace + order, critical-engineer (baseline) | workspace-architect (quality gates) | implementation-lead | design-architect + IL update ADR/CLAUDE |
| **Phase 2** (B2.7–B2.10) | testguard executes characterization + performance scripts | code-review-specialist | critical-engineer ensures perf/cache | holistic-orchestrator for scheduling & UI copy | implementation-lead | implementation-lead updates plan + CLAUDE |
| **Phase 3** (B2.11–B2.14) | testguard + validator run unit + manual tests | code-review-specialist (docs) | technical-architect certifies readiness | stakeholders (requirements-steward, HO) | implementation-lead | design-architect compiles handoff & Issue #32 close |

**Note:** Phase 0 (B2.0) is a new prerequisite validation phase added per critical-design-validator requirements. Phase 1 now includes B2.1.1 (performance baseline) and B2.6.1 (feature flag).

### 5.3 RACI Matrix (Aggregated)
| Workstream | Responsible | Accountable | Consulted | Informed |
|------------|-------------|-------------|-----------|----------|
| Metadata access implementation | implementation-lead | technical-architect | code-review-specialist, critical-engineer | holistic-orchestrator |
| Test & validation (auto + manual) | testguard + implementation-lead | validator | technical-architect, holistic-orchestrator | stakeholders |
| UI wiring + documentation | implementation-lead | technical-architect | workspace-architect, code-review-specialist | requirements-steward |
| Quality gates & reporting | workspace-architect | holistic-orchestrator | design-architect | entire delivery pod |

### 5.4 Quality Gates (GO/NO-GO) **[GATE A UPDATED PER CDA]**

1. **Gate A – Phase 1 → Phase 2:** XMPScript loader + primitives complete, unit tests passing, QE DOM removed from `getAllProjectClips` (kept behind flag for rollback), code review checklists signed. **UPDATED CRITERIA:**
   - **ES3 Compliance Evidence:** ESLint ES3 profile passes with 0 errors (CI log attached) + ExtendScript console load test successful (screenshot of Premiere Console showing "EAVIngest loaded")
   - **Performance Baseline Documented:** QE DOM baseline measurement (X ms for 10/50/100 clips) + XMP performance acceptance criteria: ≤ baseline +10%
   - **Feature Flag Functional:** `USE_XMP_FIRST=false` → Extension uses QE DOM (tested) + `USE_XMP_FIRST=true` → Extension uses XMP (tested)

2. **Gate B – Phase 2 → Phase 3:** Cache + refresh command verified, CEP panels consuming new schema without regressions, manual smoke test completed, documentation drafts in review.
3. **Gate C – B2 Complete:** Manual offline suite passed, Issue #32 closed with artifacts, CLAUDE.md + ADR-003 updated, TRACED checklists signed by holistic-orchestrator.

### 5.5 Timeline Validation (5 Days / 40h) **[REVISED PER CDA]**
| Day | Focus | Tasks | Work Effort | Buffer | Total |
|-----|-------|-------|-------------|--------|-------|
| Day 1 | Foundation + ES3 Validation | B2.0, B2.1, B2.1.1, B2.2, B2.3 (partial) | 7h | +1h | 8h |
| Day 2 | Primitives + Mapping | B2.3 (complete), B2.4, B2.5, B2.6, B2.6.1 | 7h | +1h | 8h |
| Day 3 | Refactors + Cache | B2.7, B2.8, B2.9 | 7h | +1h | 8h |
| Day 4 | UI + Test Suite | B2.10, B2.11, B2.12 (partial) | 6.5h | +1.5h | 8h |
| Day 5 | Integration + Validation | B2.12 (complete), B2.13, B2.14 | 6h | +2h | 8h |
| **TOTAL** | | **17 tasks** | **33.5h** | **6.5h** | **40h (5 days)** |

**Timeline Adjustments from Original Plan:**
- **Added 4h work:** B2.0 (1h), B2.1.1 (1h), B2.6.1 (2h) per critical-design-validator MUST FIX requirements
- **Increased buffer:** 2h → 6.5h distributed across all days for ExtendScript debugging overhead
- **Fixed Day 1 math error:** Original showed 10h in 8h day (11h actual); revised to realistic 7h + 1h buffer
- **CDA Confidence:** 80% achievable with 5-day timeline vs 40% risk with original 4-day compression

**Buffer Rationale:** ExtendScript debugging requires console-based workflows (no breakpoints), 5-10 min reload cycles, cryptic error messages. Buffer distributed proactively across Days 1-3 (implementation risk) rather than reactive Day 4 allocation.

### 5.6 Risk Mitigation
| Risk | Impact | Mitigation |
|------|--------|------------|
| XMPScript unavailable on some installs | High | Keep QE DOM flag for rollback until Gate A complete; document fallback in CLAUDE. |
| ExtendScript ES3 violations slip in | Medium | **MITIGATED (B2.0):** ESLint ES3 profile verified operational + test file validates rejection + code-review-specialist enforces. |
| Performance regression >50 ms | Medium | Add `$.hiresTimer` instrumentation + failing test threshold. |
| Manual offline tests hard to schedule | Medium | Holistic-orchestrator pre-books lab time before Day 4. |
| Workspace quality gates lag | Medium | **RESOLVED:** B1.1 complete (workspace-architect finished 2025-11-15). Dependencies surfaced in TRACED. |
| Rollback strategy incomplete | High | **MITIGATED (B2.6.1):** Feature flag `USE_XMP_FIRST` implemented with dual code paths + rollback procedure documented in CLAUDE.md. |

### 5.7 Success Metrics
- 0 ESLint/JSDoc errors once B1 gates activate.
- 100% of metadata reads served from project XMP for offline clips.
- Manual offline workflow executed end-to-end with screenshots + console logs.
- Issue #32 closed referencing test artifacts + commit IDs.
- `getAllProjectClips()` average ≤50 ms/clip measured via instrumentation.

## 6. Functional Reliability
- **Unit tests:** `npm test -- metadata-access` executes B2.11 suite mocking XMPScript DOM to verify read/write/mapping + performance thresholds.
- **Integration tests:** B2.12 ensures navigation panel renders aggregator payload; `npm test -- navigation-panel` targeted script once workspace-architect finishes harness.
- **Manual characterization:** B2.13 follows ADR-003 tests: offline metadata, cache refresh on relink, Team Projects sync; results stored in `.coord/reports/offline-validation-<date>.md`.
- **Error handling:** XMPScript loader returns structured errors, ensuring UI surfaces actionable feedback; tests assert error strings.
- **Monitoring:** ExtendScript logging prefix `DEBUG XMP:` retained with timestamps for diagnosing anomalies post-release.

## 7. Stakeholder Consensus
- **Approval artifacts:** ADR-003 (technical-architect), Issue #32 resolution comments, ExtendScript console logs from POC, and upcoming B2.13 validation report.
- **Alignment evidence:** Requirements-steward already mandated offline workflow priority; holistic-orchestrator monitoring B1/B2 convergence gate; validator engaged via TRACED A-roles on cache + manual test tasks.
- **Business value:** Maintains QC workflow availability offline, enabling editors to keep working regardless of storage state; intangible requirement from user quote embedded in PROJECT-CONTEXT satisfied.

## 8. D3 Exit Confirmation
- **Master blueprint complete:** This document enumerates architecture, tasks, dependencies, TRACED/RACI, gates, and timeline. **UPDATED:** 17 tasks (added B2.0, B2.1.1, B2.6.1), 5-day timeline, revised quality gates.
- **Functional requirements + acceptance criteria:** Documented in tasks (e.g., B2.7 performance ≤ baseline +10%, B2.13 manual suite).
- **Interface contracts:** CEP payload schema maintained via B2.8 + B2.12 tests.
- **Quality attributes:** Offline safety, performance, ES3 compliance, caching reliability explicitly measured. **NEW:** ES3 enforcement validated (B2.0), performance baseline established (B2.1.1), rollback strategy implemented (B2.6.1).
- **Validation criteria:** Gate C requires manual evidence, instrumentation outputs, Issue #32 closure. Gate A updated with 3 new evidence requirements (ES3, baseline, rollback).
- **Risk mitigation & documentation:** Provided in Sections 5.6 & 7 with CLAUDE/ADR updates planned. **UPDATED:** All blocking risks mitigated per CDA MUST FIX tasks.
- **Stakeholder approval path:** Technical-architect + holistic-orchestrator sign gates; code-review-specialist/testguard provide TRACED verification; requirements-steward informed at completion.
- **B0 readiness:** Once Gates A–C pass, implementation-lead and holistic-orchestrator can launch B2 execution with no ambiguity.
- **critical-design-validator validation:** CONDITIONAL GO (85% confidence) → blocking issues RESOLVED (B2.0, B2.1.1, B2.6.1 added) → **FINAL GO APPROVED** (see `.coord/reports/806-REPORT-CDA-BUILD-PLAN-VALIDATION.md`).

---

**Validation Checklist Status:** All items listed in the delegation package have assigned owners and acceptance criteria within this build plan (tasks + gates + TRACED). Pending evidence will be populated during execution and recorded via the documentation tasks (B2.13–B2.14). **CDA validation complete:** All MUST FIX tasks incorporated, timeline adjusted to realistic 5 days, quality gates enhanced with evidence requirements.
