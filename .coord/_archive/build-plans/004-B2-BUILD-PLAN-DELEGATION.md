# Delegation: design-architect → B2 Build Plan Creation

**Date:** 2025-11-14
**Delegating Agent:** technical-architect
**Target Agent:** design-architect
**Deliverable:** B2 Build Plan for XMP-First Architecture Refactor
**Estimated Time:** 2 hours (design-architect work)

---

## Context Summary

**Issue #32 RESOLVED:** Offline metadata workflow architecture validated via POC

**Architectural Decision:** ADR-003 XMP-First Architecture **APPROVED**

**POC Validation Results:**
- ✅ All critical tests passed (Premiere Pro 25.5.0)
- ✅ `getProjectMetadata()` API confirmed working (9,877 chars XMP retrieved)
- ✅ AdobeXMPScript library available
- ✅ XMP-First architecture is FEASIBLE

**Current State:**
- Phase: B1 (Workspace Setup) → Transitioning to B2 (Production Hardening)
- Branch: `feat/phase1-panel`
- Approved architecture documented in ADR-003
- POC validation completed, GO decision confirmed

---

## Your Mission (design-architect)

**Create a detailed B2 Build Plan** that decomposes the XMP-First refactor into atomic tasks with:
1. **Task sequencing** (dependencies explicit)
2. **TDD discipline** (RED→GREEN→REFACTOR per task)
3. **TRACED integration** (who Reviews, Analyzes, Consults per task)
4. **RACI matrix** (Responsible, Accountable, Consulted, Informed)
5. **Quality gates** (phase boundaries with validation criteria)
6. **Estimated effort** (hours per task, total timeline validation)

**Deliverable Format:** `.coord/workflow-docs/005-B2-BUILD-PLAN-XMP-FIRST-REFACTOR.md`

---

## Required Context Loading

### **STEP 1: Read Core Documentation**

**Load these files in sequence:**

1. **ADR-003 (Approved Architecture):**
   ```
   /Volumes/HestAI-Projects/eav-cep-assist/.coord/adrs/003-ADR-OFFLINE-METADATA-ARCHITECTURE.md
   ```
   - Contains full architectural design
   - POC validation results
   - Implementation phases overview
   - 3 considered options (XMP-First recommended)

2. **PROJECT-CONTEXT (Current State):**
   ```
   /Volumes/HestAI-Projects/eav-cep-assist/.coord/PROJECT-CONTEXT.md
   ```
   - Current focus and active work
   - Key decisions timeline
   - Recent commits context

3. **SHARED-CHECKLIST (B1 Status):**
   ```
   /Volumes/HestAI-Projects/eav-cep-assist/.coord/SHARED-CHECKLIST.md
   ```
   - B1 completion status
   - Forward discipline (TDD for new features)
   - Backward handling (characterization tests for legacy)

4. **CLAUDE.md (Operational Knowledge):**
   ```
   /Volumes/HestAI-Projects/eav-cep-assist/CLAUDE.md
   ```
   - Two-panel architecture overview
   - ExtendScript layer details
   - Debugging console access
   - XMP metadata strategy

5. **PROJECT ROADMAP (Phase Context):**
   ```
   /Volumes/HestAI-Projects/eav-cep-assist/.coord/002-DOC-PROJECT-ROADMAP-B1-B2.md
   ```
   - B2 phase definition
   - Quality gates expected
   - Success metrics

### **STEP 2: Analyze Codebase with Repomix**

**Use repomix to understand current implementation:**

```bash
# Pack codebase for analysis
cd /Volumes/HestAI-Projects/eav-cep-assist

# Use MCP tool or command:
repomix --include "jsx/**,js/**,css/**,*.html" \
        --output .coord/reports/codebase-analysis.xml
```

**Key files to analyze:**
- `jsx/host.jsx` (ExtendScript layer - where QE DOM currently used)
- `js/navigation-panel.js` (calls `getAllProjectClips()`)
- `js/metadata-panel.js` (form operations, metadata display)

**Focus areas:**
1. **Identify all QE DOM calls** in `jsx/host.jsx`
   - `qe.project.getProjectColumnsMetadata()` (primary target for replacement)
   - Any other QE dependencies

2. **Map data flow:**
   - Navigation Panel → ExtendScript (`getAllProjectClips()`)
   - ExtendScript → Project XMP (new XMP access layer)
   - Project XMP → Navigation Panel (structured data)

3. **Identify test gaps:**
   - Critical paths without tests (XMP write, CEP events, panel state)
   - Characterization test candidates (existing working code)

### **STEP 3: Review Technical-Architect's Guidance**

**From ADR-003, extract implementation phases:**

**Phase 1: Refactor Metadata Access Layer (2 days estimated)**
- Create `jsx/metadata-access.js` - centralized XMP read/write
- Implement `readProjectField()` / `writeProjectField()`
- Field mapping dictionary (Location, Subject, Action, Shot Type)
- Replace QE DOM calls in `jsx/host.jsx`

**Phase 2: Cache Strategy (1 day estimated)**
- Implement media-derived field caching (at import when online)
- Cache refresh on relink
- Add "Refresh from Media" UI command

**Phase 3: Testing + Documentation (1 day estimated)**
- Manual characterization tests (offline workflow validation)
- Update CLAUDE.md (XMP debugging guidance)
- Close Issue #32

**Your job:** Break these phases into **atomic tasks with explicit dependencies**.

---

## Deliverable Requirements

### **B2 Build Plan Structure**

**Create:** `.coord/workflow-docs/005-B2-BUILD-PLAN-XMP-FIRST-REFACTOR.md`

**Required Sections:**

#### **1. Executive Summary**
- What we're building (XMP-First metadata access)
- Why (offline workflow enablement, QE DOM unreliability)
- Success criteria (offline workflows work, QE DOM eliminated, tests pass)
- Timeline (4 days validated, or adjusted with rationale)

#### **2. Architecture Overview**
- Hierarchical metadata access pattern diagram
- Project XMP (authoritative) → Media XMP (fallback) → Cache (bridge)
- Component relationships (Navigation Panel → metadata-access.js → ProjectItem)

#### **3. Task Breakdown (Atomic Level)**

**For each task, specify:**

```markdown
### Task ID: B2.1.1
**Title:** Initialize AdobeXMPScript in jsx/metadata-access.js
**Phase:** 1 (Metadata Access Layer)
**Estimated Effort:** 30 minutes
**Dependencies:** None (first task)

**TDD Sequence:**
1. RED: Create test that attempts to load AdobeXMPScript
2. GREEN: Implement library initialization in metadata-access.js
3. REFACTOR: Add error handling, singleton pattern

**Implementation Steps:**
1. Create `jsx/metadata-access.js` file
2. Add ExternalObject initialization code
3. Register custom namespace (http://eav.com/ns/cep/1.0/)
4. Export initialization function

**TRACED:**
- **T**est: Create unit test for XMP library initialization
- **R**eview: code-review-specialist validates ES3 compliance
- **A**nalyze: technical-architect reviews namespace strategy
- **C**onsult: N/A (no domain specialists needed)
- **E**xecute: implementation-lead implements
- **D**ocument: Update CLAUDE.md with XMP debugging notes

**RACI:**
- **R**esponsible: implementation-lead
- **A**ccountable: technical-architect
- **C**onsulted: code-review-specialist (ES3 syntax)
- **I**nformed: N/A

**Success Criteria:**
- [ ] AdobeXMPScript loads without error
- [ ] Custom namespace registered (eav:)
- [ ] Test passes (library initialization)
- [ ] Code review approved (ES3 compliant)

**Files Changed:**
- Create: `jsx/metadata-access.js`
- Create: `test/unit/metadata-access.test.js` (if applicable)
```

**Repeat this structure for ALL tasks in B2.**

**Minimum expected tasks:**
- ~12-15 atomic tasks across 3 phases
- Each task <4 hours effort
- Clear dependency chain (task X must complete before task Y)

#### **4. Dependency Graph**

**Visualize task dependencies:**

```
Phase 1: Metadata Access Layer
├─ B2.1.1: Initialize XMPScript (no deps)
├─ B2.1.2: Implement readProjectField() (deps: B2.1.1)
├─ B2.1.3: Implement writeProjectField() (deps: B2.1.1)
├─ B2.1.4: Create field mapping dictionary (deps: B2.1.2, B2.1.3)
├─ B2.1.5: Refactor getAllProjectClips() (deps: B2.1.4)
└─ B2.1.6: Replace QE DOM calls in host.jsx (deps: B2.1.5)

Phase 2: Cache Strategy
├─ B2.2.1: Implement cacheMediaFields() (deps: B2.1.6)
├─ B2.2.2: Add cache refresh on relink (deps: B2.2.1)
└─ B2.2.3: Create "Refresh from Media" UI (deps: B2.2.2)

Phase 3: Testing + Documentation
├─ B2.3.1: Manual characterization tests (deps: B2.2.3)
├─ B2.3.2: Update CLAUDE.md XMP debugging (deps: B2.3.1)
└─ B2.3.3: Close Issue #32 (deps: B2.3.2)
```

#### **5. TRACED Enforcement Matrix**

**Create table showing TRACED per phase:**

| Phase | Test-First? | Review By | Analysis By | Consult | Execute | Document |
|-------|-------------|-----------|-------------|---------|---------|----------|
| 1.1-1.6 | ✓ RED→GREEN→REFACTOR | code-review-specialist | technical-architect | N/A | implementation-lead | ADR-003 updates |
| 2.1-2.3 | ✓ Characterization first | code-review-specialist | critical-engineer | N/A | implementation-lead | CLAUDE.md |
| 3.1-3.3 | ✓ Manual test specs | testguard | critical-engineer | N/A | implementation-lead | Issue #32 closure |

#### **6. RACI Matrix (Full)**

**Comprehensive RACI per task type:**

| Task Type | Responsible | Accountable | Consulted | Informed |
|-----------|-------------|-------------|-----------|----------|
| XMP Library Init | implementation-lead | technical-architect | code-review-specialist | N/A |
| Field Mapping | implementation-lead | technical-architect | N/A | N/A |
| QE DOM Replacement | implementation-lead | technical-architect | code-review-specialist | N/A |
| Cache Strategy | implementation-lead | technical-architect | N/A | N/A |
| UI Changes | implementation-lead | technical-architect | code-review-specialist | N/A |
| Manual Tests | implementation-lead | testguard | critical-engineer | technical-architect |
| Documentation | implementation-lead | technical-architect | N/A | team |

#### **7. Quality Gates**

**Define phase boundaries with GO/NO-GO criteria:**

**Phase 1 → Phase 2 Gate:**
- [ ] All QE DOM calls replaced with XMP access
- [ ] `getAllProjectClips()` refactored successfully
- [ ] Unit tests pass (XMP read/write)
- [ ] Code review approved (ES3 compliance, no regressions)
- [ ] Manual smoke test (Navigation Panel loads clips)

**Phase 2 → Phase 3 Gate:**
- [ ] Cache strategy implemented
- [ ] Refresh from media logic works
- [ ] Manual test: import online → cache fields → go offline → fields persist
- [ ] Code review approved

**Phase 3 Complete:**
- [ ] Manual characterization tests documented
- [ ] Offline workflow validated (media offline, metadata accessible)
- [ ] CLAUDE.md updated with XMP debugging guidance
- [ ] Issue #32 closed with evidence
- [ ] Technical-architect sign-off

#### **8. Risk Mitigation**

**Identify risks and mitigation strategies:**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| XMP API version differences | HIGH | LOW | POC already validated Premiere 25.5.0 |
| ExtendScript ES3 syntax errors | MEDIUM | MEDIUM | Mandatory code review by specialist |
| Regression in existing workflows | HIGH | MEDIUM | Characterization tests before refactor |
| Performance degradation | MEDIUM | LOW | Benchmark before/after (Test 5 from POC) |
| Offline test complexity | MEDIUM | MEDIUM | Manual test procedure documented |

#### **9. Timeline Validation**

**Validate 4-day estimate with task-level granularity:**

| Day | Phase | Tasks | Hours | Cumulative |
|-----|-------|-------|-------|------------|
| 1 | 1.1-1.3 | XMP library + read/write functions | 8h | 8h |
| 2 | 1.4-1.6 | Field mapping + QE DOM replacement | 8h | 16h |
| 3 | 2.1-2.3 | Cache strategy + UI | 8h | 24h |
| 4 | 3.1-3.3 | Testing + documentation | 8h | 32h |

**Total: 32 hours (4 days)**

**If estimate changes, provide rationale and adjusted timeline.**

#### **10. Success Metrics**

**Define measurable outcomes:**

- [ ] **Code Quality:** 0 ESLint errors, 0 type errors (JSDoc)
- [ ] **Test Coverage:** All critical paths have tests (manual or automated)
- [ ] **Offline Functionality:** Metadata accessible when media offline (manual test)
- [ ] **Performance:** XMP access <50ms per clip (maintain current UX)
- [ ] **Documentation:** CLAUDE.md updated with XMP debugging procedures
- [ ] **Issue Closure:** Issue #32 closed with POC + validation evidence

---

## Tools at Your Disposal

**For codebase analysis:**
- `mcp__repomix__pack_codebase` - Pack codebase for AI analysis
- `mcp__repomix__grep_repomix_output` - Search packed codebase
- `Read` - Read specific files for detailed analysis

**For research:**
- `mcp__Context7__resolve-library-id` + `get-library-docs` - Adobe API documentation
- `WebSearch` - Current best practices for ExtendScript testing

**For validation:**
- Reference ADR-003 implementation blueprint (code examples provided)
- Reference POC validation (confirms API availability)

---

## Expected Workflow (design-architect)

**Step 1: Load Context (30 minutes)**
- Read all documentation listed above
- Pack codebase with repomix
- Analyze `jsx/host.jsx` for QE DOM usage

**Step 2: Task Decomposition (45 minutes)**
- Break Phase 1-3 into atomic tasks
- Identify dependencies (task graph)
- Estimate effort per task

**Step 3: TRACED/RACI Mapping (30 minutes)**
- Assign Review/Analyze/Consult per task
- Create RACI matrix
- Define quality gates

**Step 4: Documentation (15 minutes)**
- Write B2 Build Plan markdown
- Include all required sections
- Review for completeness

**Total: ~2 hours**

---

## Validation Checklist (Before Submitting)

**Before handing off to holistic-orchestrator, verify:**

- [ ] All ADR-003 implementation phases decomposed into atomic tasks
- [ ] Each task has TDD sequence (RED→GREEN→REFACTOR)
- [ ] TRACED protocol mapped per task (who Reviews, Analyzes, etc.)
- [ ] RACI matrix complete (no ambiguous ownership)
- [ ] Dependency graph shows critical path
- [ ] Quality gates defined with GO/NO-GO criteria
- [ ] 4-day timeline validated (or adjusted with rationale)
- [ ] Risk mitigation strategies documented
- [ ] Success metrics measurable and specific

---

## Handoff to holistic-orchestrator

**Once build plan complete, design-architect will:**

1. **Save build plan:** `.coord/workflow-docs/005-B2-BUILD-PLAN-XMP-FIRST-REFACTOR.md`
2. **Create handoff summary** for holistic-orchestrator (new session)
3. **Flag any concerns** discovered during planning (scope creep, timeline risks, missing information)

**holistic-orchestrator will then:**
- Coordinate implementation-lead execution
- Enforce TRACED discipline throughout build
- Monitor quality gates
- Ensure cross-boundary coherence (CEP ↔ ExtendScript)

---

## Questions for design-architect

**If you encounter ambiguities during planning:**

1. **Scope questions:** Refer to ADR-003 for boundaries (XMP-First only, no UI redesign)
2. **Technical questions:** Consult technical-architect's implementation blueprint in ADR-003
3. **Timeline questions:** Validate against 4-day estimate, flag if significantly different
4. **Dependency questions:** Map critical path, identify blockers

**Your authority:** Build plan structure and task sequencing (ACCOUNTABLE for decomposition quality)

**Not your responsibility:** Actual implementation, code review, testing execution (those are IL/specialists)

---

## Context Links (Quick Reference)

**Architectural Decision:**
- `.coord/adrs/003-ADR-OFFLINE-METADATA-ARCHITECTURE.md` (APPROVED)

**Current State:**
- `.coord/PROJECT-CONTEXT.md` (Issue #32 RESOLVED, B2 ready)
- `.coord/SHARED-CHECKLIST.md` (B1 status, TDD discipline)

**Codebase:**
- `jsx/host.jsx` (ExtendScript - QE DOM replacement target)
- `js/navigation-panel.js` (Navigation Panel - calls getAllProjectClips)
- `js/metadata-panel.js` (Metadata Panel - form operations)

**Operational Knowledge:**
- `CLAUDE.md` (Two-panel architecture, XMP strategy, debugging)

**Phase Context:**
- `.coord/002-DOC-PROJECT-ROADMAP-B1-B2.md` (B2 definition)

**POC Evidence:**
- Test script: `test/manual/POC-AUTO-RUN.jsx` (simplified version used)
- Validation: ADR-003 section "POC Validation Results"

---

**READY TO DELEGATE: Use this document as context for design-architect invocation.**

**Expected deliverable:** `.coord/workflow-docs/005-B2-BUILD-PLAN-XMP-FIRST-REFACTOR.md`

**Timeline:** 2 hours (design-architect planning work)

---

**LAST UPDATED:** 2025-11-14
**DELEGATING AGENT:** technical-architect
**TARGET AGENT:** design-architect
**NEXT STEP:** Invoke design-architect with this full context
