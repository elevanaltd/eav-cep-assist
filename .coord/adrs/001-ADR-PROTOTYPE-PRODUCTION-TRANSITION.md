# ADR-001: Prototype to Production Transition Strategy

**Status:** Accepted
**Date:** 2025-11-11
**Decision Makers:** workspace-architect, implementation-lead
**Consulted:** Requirements context from `.coord/PROJECT-CONTEXT.md`, `.coord/ECOSYSTEM-POSITION.md`

---

## Context

The CEP Panel project has successfully validated a working prototype:
- **Issues Resolved:** Navigation Panel sorting (#2), Tape Name XMP persistence (#3), XMP namespace corruption (#4)
- **Working Architecture:** Two-panel system (Navigation + Metadata) with CEP event communication
- **Critical Code:** XMP namespace-aware write (`jsx/host.jsx:177-447`) proven stable

**Decision Point:** How do we transition from "working prototype" to "production-ready with quality gates"?

**Key Constraints:**
1. **ExtendScript is ES3** → No TypeScript, limited tooling
2. **CEP Testing Challenges** → Requires Premiere Pro running (hard to automate)
3. **Working Code is Fragile** → XMP write has bug history (Issue #4), must not break
4. **Two Execution Contexts** → CEP (Chromium, modern JS) vs ExtendScript (ES3)

---

## Decision

**Adopt a TWO-PHASE transition strategy:**

### Phase 1 (B1): Establish Workspace Infrastructure
**Goal:** Create quality gates WITHOUT refactoring working code
**Duration:** 1-2 days
**Deliverables:**
1. ESLint for JavaScript (CEP panels: `js/*.js`)
2. JSDoc validation for ExtendScript (`jsx/host.jsx`)
3. Test infrastructure decision and minimal test setup
4. Documentation: PROTOTYPE-LEGACY boundary, testing strategy

### Phase 2 (B2+): Incremental Production Hardening
**Goal:** Apply TDD discipline going forward, characterization tests for refactoring
**Strategy:**
- **Forward Discipline:** Test-first (RED→GREEN→REFACTOR) for NEW features
- **Backward Handling:** Characterization tests BEFORE refactoring EXISTING code
- **Preservation:** Working prototype code stays as-is until tests exist

---

## Rationale

### Option 1: Immediate Rebuild (REJECTED)
**Approach:** Rebuild from scratch with TDD, full test coverage
**Pros:** Clean architecture, test coverage from day 1
**Cons:**
- Throws away validated working code (sunk cost fallacy)
- Risk of reintroducing bugs (XMP namespace issue took time to fix)
- No guarantee new architecture will work better
- Delays production deployment by weeks

**Tension:** VISION (perfect architecture) vs. REALITY (working code exists)
**Why Rejected:** Violates COMPLETION_THROUGH_SUBTRACTION and EMPIRICAL_DEVELOPMENT principles

---

### Option 2: Test-Around-Prototype (REJECTED)
**Approach:** Write tests for current code as-is, no quality gates
**Pros:** Quick to deploy, preserves working code
**Cons:**
- Technical debt accumulates (no quality enforcement)
- Hard to test current code (tightly coupled, no abstractions)
- New features added without tests (no discipline)

**Tension:** CONSTRAINT (quick deployment) vs. MASTERY (quality discipline)
**Why Rejected:** No quality gates = validation theater, fails long-term viability

---

### Option 3: Incremental Hardening with Boundaries (ACCEPTED)
**Approach:** Establish quality gates FIRST, then apply discipline incrementally
**Pros:**
- Preserves working code (no rewrite risk)
- Quality gates prevent regression
- Forward discipline (test-first) for new work
- Characterization tests enable safe refactoring
- Incremental improvement (sustainable)

**Cons:**
- Mixed codebase temporarily (prototype + production)
- Requires discipline to not refactor without tests
- Some manual testing required (CEP automation limits)

**Synthesis:**
- **VISION:** Production-quality codebase with full test coverage
- **CONSTRAINT:** Working prototype must not break
- **STRUCTURE:** Quality gates + testing strategy provide framework
- **REALITY:** CEP testing limitations require pragmatic approach
- **JUDGEMENT:** User needs working tool, not perfect architecture
- **MASTERY:** TDD discipline applied where possible, characterization tests where needed

**Third-Way Solution:**
Instead of choosing "rewrite perfect" OR "keep as-is," we create a **BOUNDARY** between proven-working (preserve) and needs-hardening (test-first). Quality gates enforce discipline for new work while protecting existing functionality.

---

## Implementation Plan

### B1: Workspace Setup (1-2 days)

#### 1. ESLint for JavaScript (CEP Panels)
**Files:** `js/metadata-panel.js`, `js/navigation-panel.js`, `js/CSInterface.js`
**Config:** `eslint.config.js` (ES6+, browser environment)
**Rules:**
- No unused variables
- Consistent code style (2-space indent, single quotes)
- No console.log (except error handling)
**Quality Gate:** `npm run lint` → 0 errors (configure, do not fix existing code yet)

#### 2. JSDoc for ExtendScript
**Files:** `jsx/host.jsx`
**Config:** `jsconfig.json` (JSDoc type checking)
**Rules:**
- ES3 environment (`target: "ES3"`)
- Document function parameters and return types
- No modern JS syntax (arrow functions, const/let, template literals)
**Quality Gate:** `npm run typecheck` → JSDoc validation passes

#### 3. Test Infrastructure Decision
**Challenge:** CEP extensions require Premiere Pro running (hard to automate)
**Strategy:**
- **Unit Tests (Automated):** Pure JavaScript functions (e.g., `generateClipName()`)
- **Integration Tests (Automated with Mocks):** CEP event system, form validation
- **Characterization Tests (Manual):** XMP write, Premiere Pro API interactions
- **CI/CD:** Run unit and integration tests in GitHub Actions (mocked ExtendScript)

**Test Framework:** Vitest (modern, fast, Vite ecosystem)
- Why Vitest: Built-in mocking, browser API support, fast execution
- Alternative: Mocha + Chai (more traditional, but slower)

**Directory Structure:**
```
test/
  unit/              # Pure JavaScript functions
  integration/       # CEP event system, form state (mocked ExtendScript)
  fixtures/          # Test data (mock clips, XMP samples)
  helpers/           # Test utilities (mock CSInterface, etc.)
```

**Quality Gate:** `npm test` → At least 1 smoke test passes

#### 4. Documentation
**Files:**
- `.coord/SHARED-CHECKLIST.md` → B1 tasks + ongoing tracking
- `.coord/docs/001-DOC-PROTOTYPE-LEGACY.md` → Code boundary documentation
- `.coord/adrs/001-ADR-PROTOTYPE-PRODUCTION-TRANSITION.md` → This document
- `.coord/adrs/002-ADR-TEST-INFRASTRUCTURE.md` → Test framework decision

---

### B2: Production Hardening (Ongoing)

#### Forward Discipline: Test-First for New Features
**Example: New Feature "Batch Metadata Edit"**
```bash
# 1. RED: Write failing test
npm test  # Verify test fails
git commit -m "test: Batch edit should apply metadata to all selected clips"

# 2. GREEN: Minimal implementation
# ... implement feature ...
npm test  # Verify test passes
git commit -m "feat: Batch metadata edit"

# 3. REFACTOR: Improve while tests pass
# ... refactor implementation ...
npm test  # Verify tests still pass
git commit -m "refactor: Extract batch edit validation logic"
```

#### Backward Handling: Characterization Tests Before Refactoring
**Example: Refactoring XMP Write**
```bash
# 1. CHARACTERIZE: Test current behavior
# Create test that captures XMP namespace write behavior
npm test  # Verify characterization test passes
git commit -m "test: Characterize XMP namespace write behavior"

# 2. REFACTOR: Change implementation
# Simplify updateClipMetadata() while tests pass
npm test  # Verify characterization test still passes
git commit -m "refactor: Simplify XMP write (behavior unchanged)"

# 3. IMPROVE: Add new capabilities
# Add retry logic for XMP write failures
npm test  # Verify new tests pass
git commit -m "feat: Add retry logic to XMP write"
```

---

## Quality Gates (Enforced in B1+)

### Lint Gate
```bash
npm run lint
# ESLint checks JavaScript (CEP panels)
# JSDoc checks ExtendScript (ES3 compatibility)
# Exit code 0 = pass, 1 = fail
```

### Test Gate
```bash
npm test
# Vitest runs unit + integration tests
# Characterization tests run manually (documented in test/README.md)
# Exit code 0 = all pass, 1 = any fail
```

### Quality Gate Script (Run Before Commit)
```bash
npm run quality-gates
# Runs: lint → typecheck → test
# Fails if ANY gate fails
```

---

## Consequences

### Positive
✅ **Working Code Protected:** Prototype stays stable (no rewrite risk)
✅ **Quality Discipline:** ESLint + JSDoc + Tests prevent regression
✅ **Incremental Improvement:** Test-first for new work, characterization for refactoring
✅ **Pragmatic Testing:** Mix of automated (unit/integration) and manual (CEP-specific)
✅ **Sustainable:** Gradual improvement vs. big-bang rewrite

### Negative
⚠️ **Mixed Codebase:** Prototype code lacks tests temporarily (until refactored)
⚠️ **Discipline Required:** Easy to skip tests if not enforced
⚠️ **Manual Testing:** Some CEP behaviors hard to automate (requires Premiere Pro)
⚠️ **Gradual Coverage:** Full test coverage takes time (not immediate)

### Risks & Mitigations

**Risk:** Developers skip quality gates
**Mitigation:** Pre-commit hooks enforce `npm run quality-gates`

**Risk:** Characterization tests miss edge cases
**Mitigation:** Code review by critical-engineer before refactoring

**Risk:** CEP testing limitations block automation
**Mitigation:** Mix of automated (unit/integration) and documented manual tests

---

## Validation Criteria

**B1 Complete When:**
- [ ] `npm run lint` executes (ESLint + JSDoc configured)
- [ ] `npm run test` executes (Vitest + at least 1 smoke test)
- [ ] `npm run quality-gates` runs all gates
- [ ] `.coord/docs/001-DOC-PROTOTYPE-LEGACY.md` documents code boundary
- [ ] Test directory structure created (`test/unit/`, `test/integration/`)
- [ ] Git tag `v0.1.0-prototype-validated` exists

**B2 Success When:**
- [ ] All new features have tests written first (RED→GREEN→REFACTOR)
- [ ] Refactored prototype code has characterization tests
- [ ] Test coverage >70% for business logic (measured by Vitest)
- [ ] CI/CD runs quality gates on every commit

---

## Alternative Considered: TypeScript for CEP Panels

**Question:** Should we use TypeScript for CEP panels (`js/*.js`)?

**Analysis:**
- **Pro:** Type safety, modern tooling, better IDE support
- **Con:** Build step complexity (TypeScript → JavaScript), ExtendScript still ES3
- **Decision:** DEFER to B2+ (JSDoc provides enough type safety for B1, TypeScript adds complexity)

**Rationale:**
- JSDoc annotations provide type checking without build step
- ExtendScript (`jsx/host.jsx`) cannot use TypeScript (ES3 limitation)
- Mixed TypeScript (CEP) + ES3 (ExtendScript) adds complexity
- Revisit after B1 complete (if type safety insufficient)

---

## References

- `.coord/PROJECT-CONTEXT.md` → Project identity, pipeline position
- `.coord/ECOSYSTEM-POSITION.md` → EAV production pipeline (Step 7 of 10)
- `.coord/workflow-docs/001-CEP_PANEL_EVOLUTION-D1-ROADMAP.md` → Prototype evolution plan
- `.coord/workflow-docs/002-CEP_PANEL_CURRENT_STATE-BUILD-STATUS.md` → Build status
- `CLAUDE.md` → Operational guide (console debugging, deployment)
- `/Volumes/HestAI/docs/standards/102-SYSTEM-CODE-QUALITY-ENFORCEMENT-GATES.oct.md` → Quality gate patterns

---

**LAST UPDATED:** 2025-11-11
**STATUS:** Accepted (B1 implementation in progress)
**NEXT REVIEW:** After B1 complete (evaluate test coverage, quality gate effectiveness)
