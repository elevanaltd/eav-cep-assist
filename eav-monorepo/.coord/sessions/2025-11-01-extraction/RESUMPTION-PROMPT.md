# Resumption Prompt for Copy-Editor Extraction

**Copy-paste this prompt in a new session after running /GET-CONTEXT**

---

COPY-EDITOR EXTRACTION - OPTION B EXECUTION (TDD-Compliant)

**BACKGROUND:**
We completed comprehensive architectural validation for copy-editor extraction strategy. User selected Option B (Full TDD-Compliant Extraction, 18-24 hours) which requires writing RED-state tests BEFORE extracting code.

**VALIDATION CHAIN RESULTS:**
- ✅ technical-architect: CONDITIONAL GO (90% confidence)
- ⚠️ critical-engineer: CONDITIONAL GO (blocking conditions specified)
- ❌ test-methodology-guardian: REJECT - capability-config requires RED-state tests first

**CONSTITUTIONAL REQUIREMENT:**
North Star I7 (TDD RED Discipline) - must write failing tests for capability-config BEFORE extraction because capability pattern introduces NEW BEHAVIOR (not pure refactor).

**READ THESE DOCUMENTS (in order):**

1. **Session Handoff (START HERE):**
   `/Volumes/HestAI-Projects/eav-monorepo/.coord/SESSION-HANDOFF-COPY-EDITOR-EXTRACTION.md`
   - Complete execution protocol
   - TDD requirements
   - Blocking conditions
   - Phase-by-phase instructions

2. **Validation Reports (.coord/reports/):**
   - `001-REPORT-TECHNICAL-ARCHITECT-EXTRACTION-REVIEW.md`
   - `002-REPORT-CRITICAL-ENGINEER-GO-NO-GO.md`
   - `003-REPORT-TEST-METHODOLOGY-GUARDIAN-TDD-PROTOCOL.md`

3. **Extraction Strategy:**
   `/Volumes/HestAI-Projects/eav-monorepo/docs/guides/002-DOC-COPY-EDITOR-EXTRACTION.md`

4. **North Star:**
   `/Volumes/HestAI-Projects/eav-monorepo/docs/workflow/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md`
   - Focus on I7 (TDD), I8 (Production-Grade), I11 (Independent Deployment)

**CURRENT STATE:**
- ✅ Packages migration complete (@workspace/shared v0.5.0 from POC)
- ✅ Architectural validation complete (3 specialist reports in .coord/reports/)
- ✅ User decision: Option B (TDD-compliant extraction)
- ⏸️ **BLOCKED:** Need RED-state capability-config tests BEFORE extraction

**YOUR MISSION:**

**WEEK 1 (8-10 hours): Write RED-State Tests**

Invoke universal-test-engineer to create capability-config test matrix:

```
@Task universal-test-engineer

MISSION: Write RED-state capability-config test matrix for comments module

CONTEXT:
- Read: .coord/SESSION-HANDOFF-COPY-EDITOR-EXTRACTION.md (section "TDD Protocol Requirements") along with all relevant reports and files
- Constitutional: North Star I7 - tests MUST fail before implementation

REQUIREMENTS:

1. Create test file: packages/shared/src/comments/__tests__/capability-config.test.ts

2. Test ALL capability permutations:
   - requireAnchors: true (copy-editor) vs false (cam-op)
   - enablePositionRecovery: true vs false
   - enableTipTapIntegration: true vs false

3. Cross-app integration tests:
   - copy-editor config: { requireAnchors: true, enablePositionRecovery: true, enableTipTapIntegration: true }
   - cam-op config: { requireAnchors: false, enablePositionRecovery: false, enableTipTapIntegration: false }

4. Tests MUST initially FAIL (RED state)

5. Commit RED state to git with message:
   "test: capability-config matrix (RED state - fails before extraction)
   
   Per North Star I7 TDD RED discipline"

Use Context7 for:
- @tanstack/react-query testing patterns
- Supabase test setup
- TipTap extension testing

Deliver: Comprehensive test suite in RED state, committed to git.
```

**WEEK 2 (10-14 hours): Execute Extraction**

After RED-state tests committed, invoke implementation-lead:

```
@Task implementation-lead

MISSION: Execute copy-editor extraction per Option B protocol

CONTEXT:
- Read: .coord/SESSION-HANDOFF-COPY-EDITOR-EXTRACTION.md (complete protocol)
- Read: All validation reports (.coord/reports/001-*, 002-*, 003-*)
- Verify: RED-state tests exist in git (capability-config.test.ts)

CRITICAL-ENGINEER BLOCKING CONDITIONS (must complete BEFORE extraction):
1. Rollback runbook documented
2. Cross-app validation plan
3. Capability-config test matrix (should exist from Week 1)
4. Performance/bundle baselines captured

EXECUTION SEQUENCE:
1. Phase 1 (2-4 hours): Infrastructure extraction
   - Auth, database, errors, editor utilities (~1,250 LOC)
   - Build + test validation
   
2. Phase 2 (4-6 hours): Business logic extraction
   - Comments module with capability config (~2,826 LOC)
   - Scripts module
   - Tests should now PASS (GREEN state)
   - Git commit with GREEN evidence
   
3. Phase 3 (3-4 hours): App migration
   - Migrate copy-editor with @workspace/shared imports
   - Configure capability config in app
   - Cross-app validation (scenes-web still works)

Use Context7 for:
- React Query documentation
- TipTap integration
- Supabase client patterns

VALIDATION GATES (must pass at each phase):
- lint 0E
- typecheck 0E
- tests passing
- build successful

Deliver: Complete extraction with TDD evidence in git, all apps passing quality gates.
```

**SUCCESS CRITERIA:**
- ✅ RED-state tests in git (Week 1)
- ✅ GREEN-state extraction (Week 2)
- ✅ ~5,400 LOC extracted to @workspace/shared
- ✅ Copy-editor migrated with clean imports
- ✅ All quality gates pass
- ✅ TDD discipline maintained (North Star I7)

**IF CONFLICTS ARISE:**
Escalate to holistic-orchestrator for gap ownership and cross-boundary coherence.

**TIMELINE:**
Total: 18-24 hours
- Week 1: 8-10 hours (tests)
- Week 2: 10-14 hours (extraction)

Execute with constitutional compliance.
