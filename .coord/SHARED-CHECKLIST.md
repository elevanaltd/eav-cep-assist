# CEP Panel - Shared Checklist

**Purpose:** Track workspace setup (B1) and ongoing development tasks

---

## B1: WORKSPACE SETUP (Current Phase)

### B1.1: Quality Gates Configuration

**Status:** ✅ Complete (2025-11-15)

- [x] ESLint for JavaScript (CEP panels: `js/*.js`)
  - [x] Create `eslint.config.js` (flat config format, ESLint 9.39.1)
  - [x] Configure for browser environment (Chromium/CEP) + ExtendScript ES3
  - [x] Add npm script: `npm run lint`
  - [x] Verify: `npm run lint` runs with 0 errors (8 warnings acceptable)
- [x] JSDoc for ExtendScript (ES3: `jsx/host.jsx`)
  - [x] Create `tsconfig.json` + `jsconfig.json` (TypeScript 5.9.3)
  - [x] Create `types/extendscript.d.ts` (ExtendScript API definitions)
  - [x] Document ES3 constraints via type definitions
  - [x] Add npm script: `npm run typecheck` (TypeScript validation)
  - [x] Verify: ExtendScript typecheck passes (0 errors)
- [x] Test Infrastructure Decision
  - [x] Test framework: Vitest 2.1.8 (already configured)
  - [x] Testing strategy: Unit tests (Vitest) + Manual tests (Premiere Pro)
  - [x] Test directory structure exists (`test/unit/`, `test/integration/`)
  - [x] Add npm script: `npm test`
  - [x] Verify: 6 tests passing (smoke.test.js + cep-events.test.js)

### B1.2: Coordination Documentation

**Status:** 🟡 In Progress

- [x] Create `SHARED-CHECKLIST.md` (this file)
- [ ] Update `PROJECT-ROADMAP.md` (prototype vs production phasing)
- [ ] Create ADR-001: Prototype→Production transition strategy
- [ ] Create ADR-002: Test infrastructure for CEP extensions
- [ ] Update `PROJECT-CONTEXT.md` quality gates (line 47)

### B1.3: Workspace Structure

**Status:** 🔴 Not Started

- [ ] Create test directory structure
  ```
  test/
    unit/              # Unit tests (JS functions)
    integration/       # Integration tests (CEP ↔ ExtendScript)
    fixtures/          # Test data (mock clips, XMP samples)
    helpers/           # Test utilities
  ```
- [ ] Create quality gate scripts
  - [ ] `scripts/lint.sh` → ESLint wrapper
  - [ ] `scripts/typecheck.sh` → JSDoc validation
  - [ ] `scripts/test.sh` → Test runner
  - [ ] `scripts/quality-gates.sh` → Run all gates (lint + typecheck + test)
- [ ] Create development workflow docs
  - [ ] `.coord/docs/DEVELOPMENT-WORKFLOW.md`
  - [ ] `.coord/docs/TESTING-GUIDE.md`

### B1.4: Critical Path Analysis

**Status:** 🔴 Not Started

**Which code paths need characterization tests FIRST?**

- [ ] **Priority 1: XMP Namespace-Aware Write** (`jsx/host.jsx:177-447`)
  - **Why:** Just fixed (Issue #4), proven working, HIGH RISK if broken
  - **Test:** Write metadata → read back → verify namespace separation
  - **Characterization:** Save Description (Dublin Core) + Location/Subject (XMP) → verify no corruption
- [ ] **Priority 2: CEP Event Communication** (`js/navigation-panel.js` → `js/metadata-panel.js`)
  - **Why:** Two-panel architecture depends on event system
  - **Test:** Dispatch `com.eav.clipSelected` → verify Metadata Panel receives
  - **Characterization:** Click Navigation clip → Metadata Panel loads correct clip
- [ ] **Priority 3: Panel State Management** (`js/metadata-panel.js:loadClipIntoForm()`)
  - **Why:** Form must correctly load/save metadata
  - **Test:** Load clip → edit fields → save → reload → verify persistence
  - **Characterization:** Save operation → PP Name field matches generated name

### B1.5: Prototype Legacy Boundary

**Status:** 🔴 Not Started

- [ ] Document "Prototype Code" boundary
  - [ ] Identify files that are "proven working" (preserve as-is)
  - [ ] Identify files that need characterization tests before refactoring
  - [ ] Create `.coord/docs/PROTOTYPE-LEGACY.md` with boundary documentation
- [ ] Tag prototype state in git
  - [ ] Create tag: `v0.1.0-prototype-validated` (Issues 2, 3, 4 fixed)
  - [ ] Document what's proven working in tag message

### B1.6: B2 Handoff Preparation

**Status:** 🔴 Not Started

- [ ] Document B1 completion criteria (see below)
- [ ] Create `.coord/B1-COMPLETION-REPORT.md` (evidence of readiness)
- [ ] Prepare B2 first task list (see PROJECT-ROADMAP.md)
- [ ] Coordinate with implementation-lead for B2 execution

---

## B2+: PRODUCTION BUILD (Future - After B1 Complete)

**Note:** These tasks are tracked here for visibility but will not start until B1 completes.

### Forward Discipline: Test-First for New Features

- [ ] Example: New feature "Batch Metadata Edit"
  - [ ] RED: Write failing test (select 5 clips → apply metadata → verify all updated)
  - [ ] GREEN: Implement feature (minimal code to pass)
  - [ ] REFACTOR: Improve while tests pass
  - [ ] Commit sequence: `test: Batch metadata edit` → `feat: Batch metadata edit`

### Backward Handling: Characterization Tests for Legacy

- [ ] Example: Refactor `jsx/host.jsx:getAllProjectClips()`
  - [ ] CHARACTERIZE: Test current behavior (input → output, including edge cases)
  - [ ] REFACTOR: Change implementation while tests pass
  - [ ] VERIFY: Characterization tests still pass
  - [ ] Commit: `refactor: Simplify getAllProjectClips (behavior unchanged)`

---

## B1 COMPLETION CRITERIA

**B1 phase is complete when ALL of the following are true:**

### Quality Gates Operational
- [x] `npm run lint` executes (ESLint 9.39.1, 0 errors, 8 warnings)
- [x] `npm run typecheck` executes (TypeScript 5.9.3, 0 errors)
- [x] `npm test` executes (Vitest 2.1.8, 6 tests passing)
- [x] `npm run quality-gates` executes all gates successfully

### Documentation Complete
- [ ] ADR-001: Prototype→Production strategy documented
- [ ] ADR-002: Test infrastructure decision documented
- [ ] `PROJECT-ROADMAP.md` updated with v0.1 (prototype) vs v1.0 (production) phases
- [ ] `PROTOTYPE-LEGACY.md` documents code boundary (what to preserve, what to test first)
- [ ] `DEVELOPMENT-WORKFLOW.md` explains TDD discipline + characterization test approach

### Critical Path Protected
- [ ] XMP namespace-aware write has characterization test (or test plan)
- [ ] CEP event communication has test (or test plan)
- [ ] Panel state management has test (or test plan)
- [ ] Tests execute in CI/CD (GitHub Actions workflow) OR documented why not possible

### Workspace Validated
- [ ] Test directory structure created and documented
- [ ] Example tests demonstrate CEP testing approach (mocks, fixtures, etc.)
- [ ] Quality gate scripts tested and working
- [ ] Git tag `v0.1.0-prototype-validated` exists

### Handoff Ready
- [ ] B1 completion report created (`.coord/B1-COMPLETION-REPORT.md`)
- [ ] B2 first task identified (from PROJECT-ROADMAP.md)
- [ ] implementation-lead briefed on workspace setup
- [ ] All B1 checklist items completed or explicitly deferred with rationale

---

## ONGOING: Development Discipline

**These practices apply throughout B2+ (after B1 complete):**

### Git Discipline
- [ ] Atomic commits (one task = one commit)
- [ ] Conventional commit format (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`)
- [ ] Commit sequence proves TDD: `test: X` → `feat: X` (for new features)

### Quality Gate Enforcement
- [ ] Run `npm run lint` before every commit
- [ ] Run `npm run typecheck` before every commit
- [ ] Run `npm test` before every commit
- [ ] All gates MUST pass (no "fix later" commits)

### Code Review
- [ ] Every change reviewed by code-review-specialist (TRACED)
- [ ] Architectural decisions reviewed by critical-engineer (TRACED)
- [ ] Test coverage reviewed by testguard (TRACED)

### Context Preservation
- [ ] Update `.coord/workflow-docs/003-QUICK_REFERENCE-NEXT_SESSION.md` after significant work
- [ ] Document "why" decisions in ADRs (not just "what" in code comments)
- [ ] Update `CLAUDE.md` with new diagnostic patterns (console prefixes, error patterns)

---

## ISSUE TRACKING

**Active Issues:**
- [x] Issue #2: Navigation Panel sorting ✅ FIXED
- [x] Issue #3: Tape Name XMP persistence ✅ FIXED
- [x] Issue #4: XMP namespace corruption ✅ FIXED
- [x] LogComment parsing (element vs attribute format) ✅ FIXED (2025-11-14)
- [ ] Issue #32: Offline metadata workflow ⊗ Project Columns API research ⊗ CRITICAL

**Future Issues:**
- (Track new issues in GitHub Issues or `.coord/workflow-docs/ISSUES-LOG.md`)

---

## NOTES

**Testing Challenges:**
- Adobe CEP extensions require Premiere Pro running (hard to automate)
- ExtendScript is ES3 (limited tooling for type checking)
- Two execution contexts (CEP Chromium vs ExtendScript) complicate mocking

**Testing Strategy:**
- **Unit tests:** Pure JavaScript functions (helper utilities, data transformations)
- **Integration tests:** CEP event system, form validation, state management (mocked ExtendScript)
- **Manual tests:** XMP write operations (requires Premiere Pro running)
- **Characterization tests:** Capture current behavior before refactoring legacy code

**Prototype Preservation:**
- Working code in `jsx/host.jsx` (XMP write), `js/metadata-panel.js`, `js/navigation-panel.js`
- Two-panel architecture validated (Issues 2, 3, 4 resolved)
- Forward discipline: Test-first for NEW features
- Backward handling: Characterization tests BEFORE refactoring EXISTING code

---

**LAST UPDATED:** 2025-11-11
**PHASE:** B1 (Workspace Setup)
**OWNER:** workspace-architect
