# CEP Panel - Project Roadmap (B1→B2 Transition)

**Purpose:** Define prototype→production transition phases with clear deliverables

**Context:** Existing roadmap (`001-CEP_PANEL_EVOLUTION-D1-ROADMAP.md`) documents prototype evolution. This roadmap documents workspace setup (B1) and production build (B2+) phases.

---

## Version Strategy

### v0.1.0-prototype-validated (CURRENT)
**Status:** ✅ COMPLETE
**Tag:** `v0.1.0-prototype-validated`
**Date:** 2025-11-11

**Deliverables:**
- Two-panel architecture (Navigation + Metadata) working
- XMP namespace-aware write (Issue #4 fixed)
- Navigation Panel sorting (Issue #2 fixed)
- Tape Name XMP persistence (Issue #3 fixed)

**Validation Evidence:**
- Navigation Panel displays clips with search/filter
- Metadata Panel loads clip data on selection
- CEP event communication (Navigation → Metadata) functional
- XMP write preserves namespace separation (Dublin Core vs XMP)

**Known Limitations:**
- No automated tests
- No quality gates (lint, typecheck)
- Error handling minimal
- Input validation basic

---

### v0.2.0-production-ready (B1 TARGET)
**Status:** 🟡 IN PROGRESS (B1 Phase)
**Target Date:** 2025-11-13
**Phase:** B1 (Workspace Setup)

**Deliverables:**

#### Quality Gates Operational
- [x] ESLint configured for JavaScript (`eslint.config.js`)
- [x] JSDoc validation for ExtendScript (`jsconfig.json`)
- [x] Vitest test framework installed and configured
- [x] Test directory structure created (`test/unit/`, `test/integration/`, `test/manual/`)
- [x] Quality gate scripts (`npm run lint`, `npm test`, `npm run quality-gates`)

#### Documentation Complete
- [x] `.coord/SHARED-CHECKLIST.md` → B1 tasks + ongoing tracking
- [x] `.coord/docs/001-DOC-PROTOTYPE-LEGACY.md` → Code boundary documentation
- [x] `.coord/adrs/001-ADR-PROTOTYPE-PRODUCTION-TRANSITION.md` → Transition strategy
- [x] `.coord/adrs/002-ADR-TEST-INFRASTRUCTURE.md` → Test framework decision
- [x] `test/manual/CHARACTERIZATION-TESTS.md` → Manual test procedures

#### Workspace Structure
- [x] Test helpers created (`mock-csinterface.js`, `mock-extendscript.js`)
- [x] Example tests demonstrate CEP testing approach
- [x] CI/CD workflow configured (`.github/workflows/quality-gates.yml`)

#### Critical Path Protected
- [ ] XMP namespace-aware write characterization test documented
- [ ] CEP event communication integration test created
- [ ] Panel state management integration test created

**B1 Completion Criteria:**
- `npm run lint` executes (0 errors on existing code)
- `npm run typecheck` executes (JSDoc validation passes)
- `npm test` executes (at least 1 smoke test passes)
- All B1 documentation complete
- Git tag `v0.2.0-production-ready` created

---

### v1.0.0 (B2+ TARGET - First Production Release)
**Status:** 🔴 PENDING (After B1 Complete)
**Target Date:** TBD (depends on feature scope)
**Phase:** B2-B4 (Production Build)

**Strategic Goals:**
1. **Test Coverage:** >70% for business logic (unit + integration)
2. **Quality Discipline:** Test-first (RED→GREEN→REFACTOR) for all new features
3. **Characterization Tests:** All prototype code covered before refactoring
4. **Error Handling:** Centralized error handler, user-friendly messages
5. **Input Validation:** Field-level validation with real-time feedback

**Planned Features (B2):**
- [ ] Batch metadata edit (apply to multiple clips)
- [ ] Enhanced error handling (retry logic, graceful degradation)
- [ ] Input validation (sanitization, length limits, format validation)
- [ ] Shot type controlled vocabulary (dropdown with validation)
- [ ] Performance optimization (lazy loading for 100+ clips)

**Planned Features (B3):**
- [ ] Shoot grouping UI (collapsible groups by shoot_id)
- [ ] "Good" checkbox (QC approval workflow)
- [ ] Confidence badge display (AI metadata quality indicator)
- [ ] Search across all metadata fields
- [ ] Filter by Good/confidence

**Planned Features (B4):**
- [ ] Keyboard shortcuts (arrow keys for navigation, Enter to save)
- [ ] Undo/redo metadata changes
- [ ] Bulk operations (mark all Good, clear all fields)
- [ ] Export metadata to CSV
- [ ] Settings panel (user preferences)

**Production Readiness Checklist:**
- [ ] All critical paths have tests
- [ ] Quality gates pass on every commit
- [ ] CI/CD deploys automatically
- [ ] User documentation complete
- [ ] Team training completed
- [ ] Production deployment tested

---

### v2.0.0 (FUTURE - Supabase Integration)
**Status:** 🔵 PLANNED
**Target Date:** TBD (Phase 2 - After v1.0 stable)
**Phase:** Future Integration

**Strategic Vision:**
- Database integration (write tagged clips to `shots` table)
- Scenes Web visibility (tagged clips visible in shot planning)
- Two-way sync (Scenes Web → CEP Panel, CEP Panel → Scenes Web)
- AI enhancement (computer vision auto-suggests metadata)
- Lexicon support (project-specific vocabularies)

**Dependencies:**
- EAV monorepo Supabase schema stable
- `shots` table integration points defined
- Authentication strategy (Supabase Auth)

**See:** `.coord/ECOSYSTEM-POSITION.md` (Phase 2 integration details)

---

## Phase Breakdown

### B0: Prototype Validation (COMPLETE)
**Duration:** ~2 weeks
**Focus:** Prove core functionality works

**Key Activities:**
- Build two-panel architecture
- Fix critical bugs (Issues #2, #3, #4)
- Manual testing with real Premiere Pro projects
- Validate XMP write, CEP event system, form state

**Output:** Working prototype (v0.1.0-prototype-validated)

---

### B1: Workspace Setup (CURRENT)
**Duration:** 1-2 days
**Focus:** Establish quality gates without refactoring

**Key Activities:**
- Configure ESLint (JavaScript) + JSDoc (ExtendScript)
- Install Vitest test framework
- Create test directory structure
- Document prototype→production strategy (ADR-001, ADR-002)
- Create characterization test procedures

**Output:** Production-ready workspace (v0.2.0-production-ready)

**Quality Gates:**
```bash
npm run lint       # ESLint + JSDoc validation
npm run typecheck  # JSDoc type checking
npm test           # Vitest unit + integration tests
```

---

### B2: Production Hardening (NEXT - After B1)
**Duration:** 2-3 weeks
**Focus:** Apply TDD discipline, refactor with tests

**Key Activities:**
- Write characterization tests for prototype code
- Refactor XMP write with test coverage
- Add error handling (centralized, user-friendly)
- Implement input validation (real-time feedback)
- Add unit tests for all business logic

**Test-First Workflow:**
```bash
# New features: RED → GREEN → REFACTOR
git commit -m "test: Feature X should do Y"
git commit -m "feat: Feature X"
git commit -m "refactor: Clean up Feature X"

# Refactoring: CHARACTERIZE → REFACTOR → VERIFY
git commit -m "test: Characterize XMP write behavior"
git commit -m "refactor: Simplify XMP write (behavior unchanged)"
git commit -m "feat: Add retry logic to XMP write"
```

**Output:** Hardened codebase (v1.0.0-rc1)

---

### B3: Feature Expansion (FUTURE)
**Duration:** 2-3 weeks
**Focus:** Production features (shoot grouping, Good checkbox, etc.)

**Key Activities:**
- Implement shoot grouping UI
- Add "Good" checkbox + filtering
- Display confidence badges
- Enhanced search/filter
- Performance optimization

**Output:** Feature-complete v1.0.0-rc2

---

### B4: Production Deployment (FUTURE)
**Duration:** 1 week
**Focus:** Deploy to team, collect feedback

**Key Activities:**
- Deploy to 1-2 editors
- User training
- Daily check-ins
- Issue tracking
- Feedback collection

**Output:** Stable v1.0.0 (first production release)

---

### B5: Supabase Integration (FUTURE - Phase 2)
**Duration:** 3-4 weeks
**Focus:** Database write, Scenes Web sync

**Key Activities:**
- Integrate Supabase client
- Write tagged clips to `shots` table
- Read shot planning from Scenes Web
- Two-way sync (CEP ↔ Supabase)
- Authentication (Supabase Auth)

**Output:** v2.0.0 (database-integrated)

---

## Current Focus: B1 Workspace Setup

### Immediate Tasks (This Week)

#### Quality Gates Configuration
- [x] Install ESLint + create `eslint.config.js`
- [x] Create `jsconfig.json` for JSDoc validation
- [x] Install Vitest + create `vitest.config.js`
- [x] Update `package.json` scripts (lint, typecheck, test)

#### Test Infrastructure
- [x] Create test directory structure
- [x] Create mock CSInterface (`test/helpers/mock-csinterface.js`)
- [x] Create example unit test (`test/unit/metadata.test.js`)
- [x] Create example integration test (`test/integration/cep-events.test.js`)
- [x] Document manual tests (`test/manual/CHARACTERIZATION-TESTS.md`)

#### Documentation
- [x] Create SHARED-CHECKLIST.md (B1 tasks + ongoing tracking)
- [x] Create PROTOTYPE-LEGACY.md (code boundary)
- [x] Create ADR-001 (transition strategy)
- [x] Create ADR-002 (test infrastructure)
- [x] Update PROJECT-CONTEXT.md (quality gates status)

#### Validation
- [ ] Run `npm run lint` (verify 0 errors)
- [ ] Run `npm run typecheck` (verify JSDoc passes)
- [ ] Run `npm test` (verify smoke test passes)
- [ ] Create git tag `v0.2.0-production-ready`
- [ ] Create B1 completion report

---

## Success Metrics

### B1 Success (Workspace Setup)
- ✅ Quality gates operational (`npm run quality-gates` passes)
- ✅ Test framework configured (at least 1 test passing)
- ✅ Documentation complete (ADRs, SHARED-CHECKLIST, PROTOTYPE-LEGACY)
- ✅ CI/CD workflow created (GitHub Actions)

### B2 Success (Production Hardening)
- [ ] Test coverage >70% for business logic
- [ ] All prototype code has characterization tests
- [ ] Error handling centralized
- [ ] Input validation comprehensive
- [ ] Quality gates pass on every commit

### B4 Success (Production Deployment)
- [ ] 2+ editors using daily
- [ ] <5 critical bugs in production
- [ ] User feedback positive (workflow fits)
- [ ] Performance acceptable (100+ clips)

### B5 Success (Supabase Integration)
- [ ] Tagged clips visible in Scenes Web
- [ ] Two-way sync operational
- [ ] Authentication secure
- [ ] Zero data loss

---

## Risk Mitigation

### Risk: Quality gates skipped
**Mitigation:** Pre-commit hooks enforce `npm run quality-gates`

### Risk: Tests don't catch bugs
**Mitigation:** Manual characterization tests for critical paths (XMP write)

### Risk: ExtendScript breaks (ES6 sneaks in)
**Mitigation:** ESLint ES3 environment, code review checklist

### Risk: CEP testing automation blocked
**Mitigation:** Mix of automated (unit/integration) + manual (characterization) tests

### Risk: Prototype refactoring breaks working code
**Mitigation:** Characterization tests BEFORE any refactoring (backward handling)

---

## Related Documentation

**Coordination:**
- `.coord/SHARED-CHECKLIST.md` → Task tracking
- `.coord/docs/001-DOC-PROTOTYPE-LEGACY.md` → Code boundary
- `.coord/ECOSYSTEM-POSITION.md` → Pipeline position (Step 7 of 10)
- `.coord/PROJECT-CONTEXT.md` → Project identity

**Decision Records:**
- `.coord/adrs/001-ADR-PROTOTYPE-PRODUCTION-TRANSITION.md` → Transition strategy
- `.coord/adrs/002-ADR-TEST-INFRASTRUCTURE.md` → Test framework choice

**Implementation:**
- `.coord/workflow-docs/001-CEP_PANEL_EVOLUTION-D1-ROADMAP.md` → Original prototype roadmap
- `CLAUDE.md` → Operational guide (debugging, deployment)

---

**LAST UPDATED:** 2025-11-11
**CURRENT PHASE:** B1 (Workspace Setup)
**NEXT MILESTONE:** v0.2.0-production-ready (B1 complete)
**OWNER:** workspace-architect
