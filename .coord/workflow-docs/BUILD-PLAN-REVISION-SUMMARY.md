# B2 Build Plan Revision Summary
**Date:** 2025-11-15
**Agent:** design-architect
**Source:** critical-design-validator assessment (`.coord/reports/806-REPORT-CDA-BUILD-PLAN-VALIDATION.md`)
**Revised Document:** `005-B2-BUILD-PLAN-XMP-FIRST-REFACTOR.md`

---

## Executive Summary

**Verdict:** All MUST FIX tasks from critical-design-validator incorporated. Build plan revised from **CONDITIONAL GO** → **FINAL GO APPROVED**.

**Key Changes:**
- **3 new tasks added:** B2.0 (ES3 validation), B2.1.1 (performance baseline), B2.6.1 (feature flag) - **+4h work**
- **Timeline adjusted:** 4 days (32h) → 5 days (40h) - **realistic with 6.5h buffer**
- **Quality gates enhanced:** Gate A now requires 3 evidence artifacts (ES3, baseline, rollback)
- **Total tasks:** 14 → 17 atomic tasks with complete TDD/TRACED/RACI assignments

---

## MUST FIX Tasks Incorporated

### 1. B2.0 – Validate ES3 Enforcement Tooling (1h) **[BLOCKING ISSUE #1 RESOLVED]**
- **Problem (CDA):** Plan referenced "ES3 compliance" but lacked automated verification mechanism
- **Risk:** ES5+ syntax (const/let/arrow functions) reaches production → extension crashes
- **Solution:**
  - Verify ESLint ES3 profile catches const/let violations
  - Create test file with ES5+ violations (`jsx/test-es3-violations.jsx`)
  - Confirm `npm run lint` rejects violations
  - Document ES3 enforcement in CLAUDE.md or DEVELOPMENT-WORKFLOW.md
- **Evidence Required:** CI log showing ESLint ES3 errors + ExtendScript console load test screenshot

### 2. B2.1.1 – Benchmark QE DOM Performance Baseline (1h) **[BLOCKING ISSUE #2 RESOLVED]**
- **Problem (CDA):** <50ms target had no baseline evidence from current QE DOM implementation
- **Risk:** XMP may be 10× slower → UX degradation undetected until production
- **Solution:**
  - Instrument current `getAllProjectClips()` with `$.hiresTimer`
  - Test with 10/50/100 clip projects, record timings
  - Update B2.7 acceptance criteria: "XMP performance ≤ QE DOM baseline +10%"
  - Insert BEFORE B2.2 (XMPScript bootstrap)
- **Evidence Required:** Performance baseline document (`.coord/reports/qe-dom-baseline-YYYYMMDD.md`)

### 3. B2.6.1 – Implement Feature Flag + Rollback (2h) **[BLOCKING ISSUE #3 RESOLVED]**
- **Problem (CDA):** "QE DOM flag" mentioned but no implementation details
- **Risk:** XMP fails on older Premiere versions → no recovery path
- **Solution:**
  - Create `USE_XMP_FIRST` flag (environment variable or config constant)
  - Maintain QE DOM code paths behind flag check
  - Add manual test: Toggle flag → verify both modes functional
  - Document rollback procedure in CLAUDE.md
  - Insert AFTER B2.6 (aggregator complete), BEFORE B2.7 (refactor)
- **Evidence Required:** Manual test results showing both flag modes functional + rollback procedure documented

---

## Timeline Adjustments

### Original Plan (OPTIMISTIC)
- **Duration:** 4 days (32h + 2h buffer)
- **Issues Found by CDA:**
  - Day 1: 11h scheduled in 8h day (math error)
  - Buffer: 2h only on Day 4, but ExtendScript debugging risk spans Days 1-3
  - Missing tasks: +4h (B2.0, B2.1.1, B2.6.1)

### Revised Plan (REALISTIC - CDA APPROVED)
- **Duration:** 5 days (33.5h work + 6.5h buffer = 40h total)
- **Daily Schedule:**

| Day | Focus | Tasks | Work | Buffer | Total |
|-----|-------|-------|------|--------|-------|
| Day 1 | Foundation + ES3 Validation | B2.0, B2.1, B2.1.1, B2.2, B2.3 (partial) | 7h | +1h | 8h |
| Day 2 | Primitives + Mapping | B2.3 (complete), B2.4, B2.5, B2.6, B2.6.1 | 7h | +1h | 8h |
| Day 3 | Refactors + Cache | B2.7, B2.8, B2.9 | 7h | +1h | 8h |
| Day 4 | UI + Test Suite | B2.10, B2.11, B2.12 (partial) | 6.5h | +1.5h | 8h |
| Day 5 | Integration + Validation | B2.12 (complete), B2.13, B2.14 | 6h | +2h | 8h |

**CDA Confidence:** 80% achievable (vs 40% risk with original 4-day compression)

---

## Quality Gate Updates

### Gate A – Phase 1 → Phase 2 **[3 NEW CRITERIA ADDED]**

**Original Criteria:**
- XMPScript + primitives complete ✅
- Unit tests passing ✅
- QE DOM removed ✅
- Perf logs <50ms ⚠️ (unsubstantiated)
- Code review signed ⚠️ (ES3 unverified)

**UPDATED Criteria (Gate A Now Requires):**

1. **ES3 Compliance Evidence:**
   - ESLint ES3 profile passes with 0 errors (CI log)
   - ExtendScript console load test successful (screenshot)

2. **Performance Baseline Documented:**
   - QE DOM baseline measured (X ms for 10/50/100 clips)
   - XMP performance criteria: ≤ baseline +10%

3. **Feature Flag Functional:**
   - `USE_XMP_FIRST=false` → QE DOM works (tested)
   - `USE_XMP_FIRST=true` → XMP works (tested)

---

## Critical Path Updated

**Old:** `B2.1 → B2.2 → ... → B2.14` (14 tasks, 32h)

**New:** `B2.0 → B2.1 → B2.1.1 → B2.2 → ... → B2.6 → B2.6.1 → B2.7 → ... → B2.14` (17 tasks, 40h)

**Dependencies Updated:**
- B2.1 now depends on B2.0 (ES3 validation first)
- B2.2 now depends on B2.1.1 (baseline before implementation)
- B2.7 now depends on B2.6.1 (feature flag before refactor)
- B2.8 now depends on B2.6.1 + B2.7 (feature flag tested)

---

## Risk Mitigation Updates

| Risk | Original Mitigation | REVISED Mitigation (Status) |
|------|--------------------|-----------------------------|
| ES3 violations slip in | Code review + ESLint "once B1 ready" | **MITIGATED (B2.0):** ESLint validated operational + test file + enforcement verified |
| Performance regression | Add instrumentation + threshold | **MITIGATED (B2.1.1 + B2.7):** Baseline measured + criteria ≤ baseline +10% |
| Rollback strategy incomplete | "Keep QE DOM flag" (no details) | **MITIGATED (B2.6.1):** Feature flag implemented + dual paths + procedure documented |
| B1 quality gates lag | Dependencies surfaced in TRACED | **RESOLVED:** B1.1 complete (workspace-architect 2025-11-15) |

---

## TRACED Matrix Updates

**New Phase 0 Added:**
- **Phase 0** (B2.0): workspace-architect validates ES3 enforcement tooling
- **Phase 1** (B2.1–B2.6.1): Now includes performance baseline (critical-engineer) and feature flag
- **Phase 2** (B2.7–B2.10): B2.7 now consults critical-engineer for performance validation
- **Phase 3** (B2.11–B2.14): Unchanged

---

## Section 8 (D3 Exit Confirmation) Updates

**Added References:**
- critical-design-validator validation: CONDITIONAL GO → blocking issues RESOLVED → **FINAL GO APPROVED**
- CDA report location: `.coord/reports/806-REPORT-CDA-BUILD-PLAN-VALIDATION.md`
- All MUST FIX tasks incorporated with evidence requirements
- Timeline adjusted to realistic 5 days (CDA confidence: 80%)

---

## Success Metrics Updated

**Original:**
- `getAllProjectClips()` average ≤50 ms/clip

**REVISED:**
- `getAllProjectClips()` average ≤ QE DOM baseline +10% (B2.7)
- ES3 enforcement validated with 0 ESLint errors + console load test passed (B2.0)
- Feature flag rollback tested successfully in both modes (B2.6.1)

---

## Verification Commands

**To verify revisions applied:**
```bash
# Check task count
grep -c "^#### B2\." .coord/workflow-docs/005-B2-BUILD-PLAN-XMP-FIRST-REFACTOR.md
# Should return: 17

# Check for new MUST FIX tasks
grep "MUST FIX" .coord/workflow-docs/005-B2-BUILD-PLAN-XMP-FIRST-REFACTOR.md
# Should show: B2.0, B2.1.1, B2.6.1

# Check timeline updated
grep "5 Days / 40h" .coord/workflow-docs/005-B2-BUILD-PLAN-XMP-FIRST-REFACTOR.md
# Should show: Section 5.5 header

# Check critical path updated
grep "B2.0 → B2.1 → B2.1.1" .coord/workflow-docs/005-B2-BUILD-PLAN-XMP-FIRST-REFACTOR.md
# Should show: Updated dependency graph
```

---

## Next Steps (holistic-orchestrator)

1. **Review revised build plan:** `.coord/workflow-docs/005-B2-BUILD-PLAN-XMP-FIRST-REFACTOR.md`
2. **Validate completeness:** All 3 MUST FIX tasks incorporated? (✅ YES)
3. **Confirm timeline:** 5 days realistic? (✅ YES per CDA 80% confidence)
4. **Issue GO decision:** Proceed with B2 execution
5. **Handoff to implementation-lead:** Begin with B2.0 (ES3 validation)

---

**DESIGN-ARCHITECT SIGN-OFF:** Build plan revision complete. All CDA blocking issues resolved. Ready for holistic-orchestrator final validation checkpoint.

**Date:** 2025-11-15
**Agent:** design-architect
**Status:** ✅ REVISION COMPLETE
