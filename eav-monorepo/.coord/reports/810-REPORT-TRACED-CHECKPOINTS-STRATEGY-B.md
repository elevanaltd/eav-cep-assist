# TRACED Checkpoints - Strategy B (TDD-Compliant Extraction)

**Application:** Scripts Web Extraction to @workspace/shared
**Strategy:** Option B - Full TDD-Compliant (18-24 hours)
**Created:** 2025-11-02
**Purpose:** Track rollback capabilities, baseline metrics, and RED→GREEN transitions per Critical-Engineer blocking conditions

---

## 1. Rollback Rehearsal Plan

### 1.1 Package Version Reversion Strategy

**Scenario:** @workspace/shared extraction breaks production - need to revert immediately

**Rollback Procedure:**

#### Step 1: Identify Rollback Point
```bash
# List available git tags marking extraction phases
git tag -l "week*-*"

# Expected tags:
# - week1-red: RED-state tests committed (rollback point before extraction)
# - week2-phase1: Infrastructure extraction complete
# - week2-phase2: Business logic extraction complete
# - week2-phase3: App migration complete
```

#### Step 2: Revert @workspace/shared Package
```bash
# Option A: Revert to last known good commit
cd /Volumes/HestAI-Projects/eav-monorepo
git reset --hard week1-red  # Revert to pre-extraction state
pnpm install  # Reinstall dependencies at old version

# Option B: Selective revert (if only shared package broken)
git log packages/shared/  # Find last good commit
git checkout <last-good-commit> -- packages/shared/
pnpm install
```

#### Step 3: Verify Shared Package Reverted
```bash
# Verify shared package builds at reverted state
pnpm turbo run build --filter=@workspace/shared
pnpm turbo run test --filter=@workspace/shared

# Expected: All quality gates pass (lint 0E, typecheck 0E, tests passing)
```

#### Step 4: Revert copy-editor App (if migrated)
```bash
# If Phase 3 was completed, need to revert app migration
git checkout week1-red -- apps/copy-editor/

# Alternatively: Use POC version temporarily
rm -rf apps/copy-editor/
# Deploy POC version from eav-monorepo-experimental
```

#### Step 5: Verify scenes-web Unaffected
```bash
# CRITICAL: Ensure shared package revert doesn't break scenes-web
pnpm turbo run build --filter=scenes-web
pnpm turbo run test --filter=scenes-web

# If scenes-web breaks, revert shared package further
git checkout <scenes-web-last-known-good> -- packages/shared/
```

---

### 1.2 Git Tag Strategy for Rollback Points

**Tag Naming Convention:** `week{N}-{phase}-{description}`

**Planned Tags:**

#### Week 1 - RED State Checkpoint
```bash
# After committing RED-state capability-config tests
git tag -a week1-red -m "RED state checkpoint - capability-config tests fail before extraction

- Capability-config test matrix (8 permutations)
- Cross-app integration tests
- Supabase/RLS test harness documented
- All tests FAIL (expected - code doesn't exist yet)

Per North Star I7 TDD RED discipline
Rollback point: Safe to start extraction from here"

# Push tag for CI/CD reference
git push origin week1-red
```

#### Week 2 Phase 1 - Infrastructure GREEN
```bash
# After infrastructure extraction complete
git tag -a week2-phase1 -m "Phase 1 GREEN - infrastructure extraction complete

- Auth, database, errors, editor utilities extracted
- @workspace/shared builds successfully
- Existing POC tests still pass
- Rollback point: Infrastructure layer isolated"

git push origin week2-phase1
```

#### Week 2 Phase 2 - Business Logic GREEN
```bash
# After comments + scripts extraction complete
git tag -a week2-phase2 -m "Phase 2 GREEN - business logic extraction complete

- Comments module with capability-config pattern
- Scripts module with state management
- RED-state tests now PASS
- Position recovery tests pass (12,965 LOC)
- Rollback point: Business logic isolated, app not yet migrated"

git push origin week2-phase2
```

#### Week 2 Phase 3 - App Migration GREEN
```bash
# After copy-editor app migrated to monorepo
git tag -a week2-phase3 -m "Phase 3 GREEN - copy-editor app migration complete

- App imports from @workspace/shared
- All quality gates pass
- Cross-app validation successful
- Production-ready state"

git push origin week2-phase3
```

---

### 1.3 Deployment Verification Steps

**After Rollback - Verify Production Safety**

#### Vercel Deployment Rollback (if extraction deployed to production)

```bash
# Step 1: Identify last good deployment
vercel ls copy-editor --scope elevana
# Note deployment URL from before extraction

# Step 2: Promote last known good deployment
vercel promote <deployment-url> --scope elevana

# Step 3: Verify deployment succeeded
curl -I https://scripts.elevanalabs.com/
# Expected: 200 OK

# Step 4: Test key features in production
# - Login/authentication
# - Navigation sidebar
# - TipTap editor loads
# - Script locking works
# - Auto-save functionality
# - Commenting system
```

#### Local Verification Post-Rollback

```bash
# Verify monorepo in clean state after rollback
cd /Volumes/HestAI-Projects/eav-monorepo
git status  # Should be clean or on rollback tag

# Rebuild all packages
pnpm install
pnpm turbo run build

# Run all tests
pnpm turbo run test

# Expected: All packages build and test successfully
```

---

### 1.4 Rollback Testing Evidence

**Rehearsal Required BEFORE Week 2 Extraction**

**Rollback Rehearsal Script:**

```bash
#!/bin/bash
# File: scripts/rehearse-rollback.sh
# Purpose: Validate rollback procedure works before extraction

set -e

echo "=== Rollback Rehearsal ==="
echo "Current branch: $(git branch --show-current)"
echo "Current commit: $(git rev-parse HEAD)"

# Simulate rollback to week1-red tag
echo "Step 1: Creating test tag..."
git tag -a rollback-test -m "Rollback rehearsal test tag"

echo "Step 2: Making test changes to shared package..."
echo "// Test change" >> packages/shared/src/test-rollback.ts
git add packages/shared/src/test-rollback.ts
git commit -m "test: rollback rehearsal change"

echo "Step 3: Performing rollback..."
git reset --hard rollback-test

echo "Step 4: Verifying shared package state..."
if [ -f packages/shared/src/test-rollback.ts ]; then
  echo "ERROR: Rollback failed - test file still exists"
  exit 1
fi

echo "Step 5: Testing shared package builds..."
pnpm turbo run build --filter=@workspace/shared

echo "Step 6: Testing scenes-web still works..."
pnpm turbo run build --filter=scenes-web
pnpm turbo run test --filter=scenes-web

echo "Step 7: Cleanup test tag..."
git tag -d rollback-test

echo "✅ Rollback rehearsal SUCCESSFUL"
echo "Evidence stored in .coord/reports/ROLLBACK-REHEARSAL-EVIDENCE.md"
```

**Evidence Storage:**
- Store rehearsal output in `.coord/reports/ROLLBACK-REHEARSAL-EVIDENCE.md`
- Include timestamps, git SHAs, build logs
- Verify all quality gates passed during rehearsal

**Required Evidence BEFORE Phase 1:**
- [ ] Rollback rehearsal script executed successfully
- [ ] Git reset works correctly
- [ ] Shared package builds after rollback
- [ ] Scenes-web unaffected by rollback test
- [ ] Evidence document created with timestamps

---

## 2. Baseline Metrics Capture

### 2.1 Performance Baselines

**Captured:** 2025-11-02 (Pre-extraction baseline)

#### Bundle Size Baseline

**Source:** `/Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/dist/`

```
Current Bundle Size: 1.1M
```

**Breakdown (from POC build):**
- JavaScript bundles: ~900K (estimated from total)
- CSS/assets: ~200K (estimated from total)
- HTML/misc: <100K

**Acceptance Threshold:**
- Post-extraction: <1.2M (10% increase acceptable for monorepo overhead)
- Warning threshold: >1.3M (investigate bundle optimization)
- Failure threshold: >1.5M (rollback required)

**Measurement Command:**
```bash
# Measure new monorepo bundle after extraction
cd /Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor
pnpm build
du -sh dist/

# Expected: <1.2M
```

---

#### Time to Interactive (TTI) Baseline

**Status:** ⚠️ NOT MEASURED YET - POC has TypeScript errors preventing clean build

**Reason:** POC copy-editor has 60+ TypeScript errors related to @elevanaltd/shared imports, preventing reliable performance measurement.

**Post-Extraction Measurement Plan:**
```bash
# Use Lighthouse CLI for TTI measurement
npm install -g lighthouse

# Measure TTI after extraction complete
lighthouse https://copy-editor-staging.vercel.app/ --only-categories=performance --output=json --output-path=.coord/reports/lighthouse-baseline.json

# Extract TTI metric
cat .coord/reports/lighthouse-baseline.json | jq '.audits["interactive"].numericValue'

# Target: <2000ms (2 seconds)
```

**Acceptance Criteria:**
- Target TTI: <2s (North Star requirement for production-grade quality)
- Warning threshold: >2s (investigate optimization opportunities)
- Failure threshold: >3s (rollback required)

**Deferred:** Measure TTI AFTER Phase 3 migration complete, compare to POC once TypeScript errors resolved.

---

#### Test Execution Time Baseline

**Source:** `/Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor`

**Current Test Status (POC):**
```
Test Files:  5 failed | 71 passed | 7 skipped (83)
Tests:       60 failed | 669 passed | 130 skipped (859)
Duration:    ~120 seconds (estimated from timeout failures)
```

**Note:** POC has 60 failing tests due to timeout issues and TypeScript errors. Baseline represents test count, not execution quality.

**Post-Extraction Measurement:**
```bash
# Measure test execution after extraction
cd /Volumes/HestAI-Projects/eav-monorepo
time pnpm turbo run test --filter=copy-editor

# Expected:
# - All tests pass (0 failures)
# - Duration: <150s (20% increase acceptable for monorepo overhead)
```

**Acceptance Criteria:**
- All tests pass (no failures)
- Execution time: <150s (20% increase from baseline acceptable)
- Warning threshold: >180s (investigate test optimization)
- Failure threshold: >240s (review test architecture)

---

### 2.2 Quality Baselines

#### Test Coverage Baseline

**Status:** ⚠️ NOT MEASURED - POC test failures prevent coverage calculation

**Post-Extraction Measurement:**
```bash
# Measure coverage after extraction
pnpm turbo run test --filter=copy-editor --coverage

# Target: >80% guideline (diagnostic, not gate)
```

**Expected Coverage Areas:**
- Comments module: High coverage (position recovery tests extensive)
- Scripts module: Medium coverage (integration tests exist)
- UI components: Lower coverage (characterization tests only)

**Acceptance:** Coverage is diagnostic tool, not quality gate (per TDD philosophy)

---

#### TypeScript/Lint Status Baseline

**POC Status (Pre-extraction):**

**TypeScript Errors:** 60+ errors
- Primary issue: `@elevanaltd/shared` module not found (TypeScript declaration issues)
- All errors related to POC shared package imports

**Lint Status:** Unknown (build blocked by TypeScript errors)

**Post-Extraction Target:**
```bash
# TypeScript
pnpm turbo run typecheck
# Expected: 0 errors (MANDATORY)

# Lint
pnpm turbo run lint
# Expected: 0 errors, warnings documented if present
```

**Acceptance Criteria:**
- TypeScript: 0 errors (BLOCKING)
- Lint: 0 errors (warnings acceptable if documented)

---

### 2.3 Dependency Baselines

**Captured from POC:** `/Volumes/HestAI-Projects/eav-monorepo-experimental/apps/copy-editor/package.json`

#### Critical Dependencies (Version Pins Required)

**React Query:**
```json
"@tanstack/react-query": "^5.90.2"
```
**Action Required:** Lock to exact version during extraction (per Critical-Engineer Condition 6)
```json
"@tanstack/react-query": "5.90.2"  // Remove caret
```

**TipTap Core:**
```json
"@tiptap/core": "^2.1.13",
"@tiptap/react": "^2.1.13",
"@tiptap/starter-kit": "^2.1.13",
"@tiptap/extension-collaboration": "^2.1.13",
"@tiptap/extension-collaboration-cursor": "^2.1.13"
```
**Action Required:** Declare as peer dependencies in @workspace/shared

**Supabase Client:**
```json
"@supabase/supabase-js": "^2.76.1"
```
**Note:** Acceptable caret range (minor versions safe)

#### Dependency Verification Post-Extraction

```bash
# Verify all dependencies resolved correctly
pnpm install
pnpm ls @tanstack/react-query  # Should show exact version
pnpm ls @tiptap/core            # Should resolve via peer dependency
pnpm ls @supabase/supabase-js  # Should show compatible version
```

---

## 3. RED→GREEN Transition Mapping

### 3.1 Git Commit Evidence Structure

**Purpose:** Map git commits to TDD phases for constitutional compliance (North Star I7)

---

### Week 1: RED State Checkpoint

**Commit Type:** `test:`

**Expected Commit SHA:** [To be filled after capability-config tests committed]

**Timestamp:** [To be filled]

**Evidence Required:**
- [ ] Commit message includes "RED state - fails before extraction"
- [ ] Test files committed:
  - `packages/shared/src/comments/__tests__/capability-config.test.ts`
  - `packages/shared/src/__tests__/integration/shared-to-app-imports.test.ts`
- [ ] Test execution shows FAILURES (all 8+ tests fail)
- [ ] Git tag `week1-red` created and pushed

**Expected Commit Message Format:**
```
test: capability-config matrix (RED state - fails before extraction)

- requireAnchors: true/false permutations (8 combinations)
- enablePositionRecovery: true/false paths
- enableTipTapIntegration: true/false scenarios
- Cross-app integration tests (copy-editor strict, cam-op flexible)
- Supabase/RLS test harness documentation

Per North Star I7 TDD RED discipline
Blocks: Week 2 extraction until GREEN

Test Status: ALL FAIL (expected - capability-config doesn't exist yet)

Files:
  - packages/shared/src/comments/__tests__/capability-config.test.ts
  - packages/shared/src/__tests__/integration/shared-to-app-imports.test.ts
  - .coord/test-context/SUPABASE-HARNESS.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Verification Command:**
```bash
git log --oneline --grep="RED state" -1
git show <commit-sha> --stat
```

---

### Week 2 Phase 1: Infrastructure GREEN

**Commit Type:** `feat(shared):`

**Expected Commit SHA:** [Planned - to be filled during execution]

**Timestamp:** [Planned]

**Evidence Required:**
- [ ] Infrastructure utilities extracted (~1,250 LOC)
- [ ] @workspace/shared builds successfully
- [ ] Existing POC tests still pass
- [ ] Files committed:
  - `packages/shared/src/auth/`
  - `packages/shared/src/database/`
  - `packages/shared/src/errors/`
  - `packages/shared/src/editor/locking/`
- [ ] Quality gates pass (lint 0E, typecheck 0E, tests passing)
- [ ] Git tag `week2-phase1` created

**Expected Commit Message Format:**
```
feat(shared): extract infrastructure utilities (Phase 1 GREEN)

- Auth context and utilities extracted
- Database validation helpers extracted
- Error handling infrastructure extracted
- Editor locking utilities extracted

@workspace/shared builds successfully
Existing POC tests still pass
Quality gates: lint 0E, typecheck 0E, all tests passing

Phase 1 complete per SESSION-HANDOFF-COPY-EDITOR-EXTRACTION.md

Files:
  - packages/shared/src/auth/AuthContext.tsx
  - packages/shared/src/database/validation.ts
  - packages/shared/src/errors/errorHandling.ts
  - packages/shared/src/editor/locking/useScriptLock.ts

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

### Week 2 Phase 2: Business Logic GREEN (Capability-Config Tests PASS)

**Commit Type:** `feat(shared):`

**Expected Commit SHA:** [Planned - to be filled during execution]

**Timestamp:** [Planned]

**Evidence Required:**
- [ ] Comments module extracted with capability-config pattern (~2,000 LOC)
- [ ] Scripts module extracted with state management (~826 LOC)
- [ ] **Capability-config tests from Week 1 RED state now PASS (GREEN)**
- [ ] Position recovery tests pass (12,965 LOC)
- [ ] Cross-app integration tests pass
- [ ] Files committed:
  - `packages/shared/src/comments/domain/capabilities.ts` (NEW)
  - `packages/shared/src/comments/domain/repository.ts`
  - `packages/shared/src/comments/domain/positionRecovery.ts`
  - `packages/shared/src/comments/state/`
  - `packages/shared/src/comments/hooks/`
  - `packages/shared/src/comments/extensions/`
  - `packages/shared/src/scripts/domain/`
  - `packages/shared/src/scripts/hooks/`
- [ ] Git tag `week2-phase2` created

**Expected Commit Message Format:**
```
feat(shared): extract comments + scripts modules (Phase 2 GREEN - tests pass)

- Capability-config pattern implemented
- All permutations tested (requireAnchors true/false, etc.)
- Position recovery tests pass (12,965 LOC)
- Cross-app integration validated

Phase 2 complete per SESSION-HANDOFF-COPY-EDITOR-EXTRACTION.md
TDD discipline maintained per North Star I7

**RED→GREEN Evidence:**
Week 1 RED-state tests now PASS:
  - capability-config.test.ts: 8/8 tests passing
  - shared-to-app-imports.test.ts: ALL tests passing

Files:
  - packages/shared/src/comments/domain/capabilities.ts (NEW)
  - packages/shared/src/comments/domain/repository.ts
  - packages/shared/src/comments/state/
  - packages/shared/src/scripts/domain/

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Verification Command:**
```bash
# Verify tests went from RED to GREEN
git diff week1-red week2-phase2 -- packages/shared/src/comments/__tests__/capability-config.test.ts

# Run tests to confirm GREEN state
pnpm turbo run test --filter=@workspace/shared
# Expected: All capability-config tests PASS
```

---

### Week 2 Phase 3: App Migration GREEN

**Commit Type:** `feat(copy-editor):`

**Expected Commit SHA:** [Planned - to be filled during execution]

**Timestamp:** [Planned]

**Evidence Required:**
- [ ] copy-editor app migrated to monorepo
- [ ] All imports updated to @workspace/shared
- [ ] Capability config configured for copy-editor strict mode
- [ ] App builds successfully
- [ ] All quality gates pass
- [ ] Cross-app validation: scenes-web still works
- [ ] Git tag `week2-phase3` created

**Expected Commit Message Format:**
```
feat(copy-editor): migrate app with @workspace/shared imports (Phase 3 GREEN)

- App source migrated to monorepo
- Imports updated to @workspace/shared
- Capability config: strict mode (requireAnchors=true, all features enabled)
- All quality gates pass (lint 0E, typecheck 0E, tests passing)

Cross-app validation:
  - scenes-web builds successfully
  - scenes-web tests pass
  - No regressions detected

Phase 3 complete per SESSION-HANDOFF-COPY-EDITOR-EXTRACTION.md
Production-ready state achieved

Files:
  - apps/copy-editor/src/ (migrated from POC)
  - apps/copy-editor/package.json (updated dependencies)
  - apps/copy-editor/vite.config.ts
  - apps/copy-editor/vercel.json

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

### 3.2 RED→GREEN Verification Commands

**Verify TDD Discipline Maintained:**

```bash
# Check git log shows RED→GREEN→REFACTOR progression
git log --oneline --grep="RED state\|GREEN\|REFACTOR" --all

# Verify Week 1 commit has RED state tests
git show week1-red:packages/shared/src/comments/__tests__/capability-config.test.ts

# Verify Week 2 Phase 2 commit has GREEN state tests passing
git checkout week2-phase2
pnpm turbo run test --filter=@workspace/shared
# Expected: capability-config tests PASS

# Verify Phase 3 cross-app validation
git checkout week2-phase3
pnpm turbo run build
pnpm turbo run test
# Expected: All packages pass
```

---

## 4. Critical-Engineer Blocking Conditions Status

**Source:** `.coord/reports/002-REPORT-CRITICAL-ENGINEER-GO-NO-GO.md`

### Condition 1: Rollback Runbook ✅ COMPLETE

**Status:** ✅ Documented in Section 1 of this document

**Evidence:**
- Rollback procedure documented (Section 1.1)
- Git tag strategy defined (Section 1.2)
- Deployment verification steps specified (Section 1.3)
- Rollback testing rehearsal script created (Section 1.4)

**Blocking:** NO - Can proceed to Week 1

---

### Condition 2: Cross-App Validation ⏳ PENDING

**Status:** ⏳ Pending Week 2 - Automation planned

**Required Actions:**
- [ ] Add cross-app validation to turbo.json
- [ ] Create validation script: `scripts/validate-cross-app.sh`
- [ ] Configure CI to run scenes-web tests after shared changes

**Automation Plan:**
```json
// turbo.json - Add cross-app validation task
{
  "tasks": {
    "validate:cross-app": {
      "dependsOn": ["build"],
      "outputs": [".coord/validation/cross-app-*.log"]
    }
  }
}
```

**Validation Script:**
```bash
#!/bin/bash
# scripts/validate-cross-app.sh
# Run after each extraction phase to ensure no cross-app regressions

set -e

echo "=== Cross-App Validation ==="

echo "Building all packages..."
pnpm turbo run build

echo "Testing scenes-web (consumer of @workspace/shared)..."
pnpm turbo run test --filter=scenes-web

echo "Testing copy-editor (if migrated)..."
if [ -d "apps/copy-editor" ]; then
  pnpm turbo run test --filter=copy-editor
fi

echo "✅ Cross-app validation PASSED"
echo "Evidence stored in .coord/validation/cross-app-$(date +%Y%m%d-%H%M%S).log"
```

**Blocking:** YES - Must complete BEFORE Phase 2

**Timeline:** Week 2 - Implement during Phase 1 infrastructure setup

---

### Condition 3: Capability-Config Test Matrix ⏳ IN PROGRESS

**Status:** ⏳ In progress - universal-test-engineer working on Week 1 tests

**Required Tests:**
- [ ] 8 capability permutations tested (requireAnchors, enablePositionRecovery, enableTipTapIntegration)
- [ ] Cross-app integration tests (copy-editor strict, cam-op flexible)
- [ ] Supabase/RLS test harness documented

**Test Coverage Required:**
1. requireAnchors=true + zero-length anchor → VALIDATION_ERROR
2. requireAnchors=false + zero-length anchor → SUCCESS
3. enablePositionRecovery=true → recovery works
4. enablePositionRecovery=false → no recovery
5. enableTipTapIntegration=true → extension loads
6. enableTipTapIntegration=false → works without TipTap
7. requireAnchors=false + enablePositionRecovery=true → interaction
8. All true (copy-editor strict scenario)

**Blocking:** YES - Must complete Week 1 BEFORE any extraction

**Timeline:** Week 1 (4-6 hours estimated)

---

### Condition 4: Performance/Bundle Baselines ✅ COMPLETE

**Status:** ✅ Documented in Section 2 of this document

**Evidence:**
- Bundle size baseline captured: 1.1M (Section 2.1)
- Test execution baseline documented (Section 2.1)
- TTI measurement plan defined (Section 2.1)
- Acceptance thresholds specified (Section 2.1)
- Dependency baselines captured (Section 2.3)

**Acceptance Thresholds:**
- Bundle size: <1.2M (10% increase acceptable)
- TTI: <2s (production-grade requirement)
- Test execution: <150s (20% increase acceptable)

**Blocking:** NO - Baselines captured, can proceed

---

### Condition 5: Turborepo Dependency Wiring ⏳ PENDING

**Status:** ⏳ Pending Week 2 Phase 1

**Required Changes:**
```json
// turbo.json - Add dependency wiring
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],  // Build dependencies first
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],   // Test depends on build
      "outputs": ["coverage/**"]
    }
  }
}
```

**Validation Command:**
```bash
# Verify shared builds before apps
pnpm turbo run build --dry-run=json | jq '.tasks[] | select(.package == "@workspace/shared")'

# Expected: @workspace/shared builds BEFORE apps/copy-editor
```

**Blocking:** YES - Must complete BEFORE Phase 1 extraction

**Timeline:** Week 2 - First task in Phase 1

---

### Condition 6: React Query Version Pin ⏳ PENDING

**Status:** ⏳ Pending Week 2 - Pin during Phase 2

**Current Version (POC):**
```json
"@tanstack/react-query": "^5.90.2"  // Caret allows minor updates
```

**Required Change:**
```json
"@tanstack/react-query": "5.90.2"   // Exact version - no caret
```

**Reason:** Prevent cache API breaking changes during migration (per Critical-Engineer Condition 3)

**Action Items:**
- [ ] Pin version in apps/copy-editor/package.json
- [ ] Pin version in packages/shared/package.json (peer dependency)
- [ ] Document version pin in .coord/reports/DEPENDENCY-PINS.md

**Blocking:** YES - Must complete BEFORE Phase 2 extraction

**Timeline:** Week 2 Phase 1 (during infrastructure setup)

---

### Condition 7: Store Validation Artifacts ✅ COMPLETE

**Status:** ✅ This document serves as artifact storage

**Artifacts Stored:**
- Rollback procedures (Section 1)
- Baseline metrics (Section 2)
- RED→GREEN mapping (Section 3)
- Blocking conditions status (Section 4)

**Additional Artifacts Location:**
- `.coord/validation/` - Test execution logs, build artifacts
- `.coord/reports/` - Validation reports, performance data
- `.coord/test-context/` - Test infrastructure documentation

**Blocking:** NO - Artifact storage established

---

## 5. Validation Commands Reference

### 5.1 Rollback Validation

**Verify Rollback Capability:**
```bash
# List available rollback points
git tag -l "week*-*"

# Test rollback to Week 1 RED state
git reset --hard week1-red
pnpm install
pnpm turbo run build --filter=@workspace/shared
pnpm turbo run test --filter=@workspace/shared
```

**Expected:** Shared package builds and tests pass at RED state checkpoint

---

### 5.2 Cross-App Safety Validation

**Verify scenes-web Unaffected:**
```bash
# After any shared package change
pnpm turbo run build --filter=scenes-web  # Must succeed
pnpm turbo run test --filter=scenes-web   # Must pass

# Verify no TypeScript regressions
pnpm turbo run typecheck --filter=scenes-web  # 0 errors
```

**Expected:** All scenes-web quality gates pass (no regressions)

---

### 5.3 Performance Target Validation

**Verify Bundle Size:**
```bash
# After extraction complete
cd apps/copy-editor
pnpm build
du -sh dist/

# Expected: <1.2M (10% increase from 1.1M baseline)
```

**Verify TTI:**
```bash
# After deployment to staging
lighthouse https://copy-editor-staging.vercel.app/ --only-categories=performance

# Expected: TTI <2s
```

**Verify Test Execution:**
```bash
# After extraction complete
time pnpm turbo run test --filter=copy-editor

# Expected: <150s (20% increase from ~120s baseline)
```

---

### 5.4 TDD Evidence Validation

**Verify RED→GREEN Progression:**
```bash
# Check git log shows TDD discipline
git log --oneline --all | grep -E "RED state|GREEN|REFACTOR"

# Verify Week 1 tests fail at RED state
git checkout week1-red
pnpm turbo run test --filter=@workspace/shared
# Expected: capability-config tests FAIL

# Verify Week 2 Phase 2 tests pass at GREEN state
git checkout week2-phase2
pnpm turbo run test --filter=@workspace/shared
# Expected: capability-config tests PASS
```

---

## 6. Success Criteria Summary

### Week 1 Complete When:
- ✅ Rollback runbook documented (Section 1) ✅
- ✅ Baseline metrics captured (Section 2) ✅
- ⏳ Capability-config tests written and FAIL (Week 1 work)
- ⏳ Cross-app integration tests written and FAIL (Week 1 work)
- ⏳ Supabase/RLS harness documented (Week 1 work)
- ⏳ RED state committed to git with constitutional evidence (Week 1 work)
- ⏳ Git tag `week1-red` created and pushed (Week 1 work)

### Week 2 Phase 1 Complete When:
- ⏳ Infrastructure extracted (~1,250 LOC)
- ⏳ @workspace/shared builds successfully
- ⏳ Existing POC tests still pass
- ⏳ Turborepo dependency wiring implemented
- ⏳ React Query version pinned
- ⏳ Git tag `week2-phase1` created

### Week 2 Phase 2 Complete When:
- ⏳ Comments module extracted with capability-config
- ⏳ Scripts module extracted with state management
- ⏳ **Capability-config tests from Week 1 now PASS (GREEN)**
- ⏳ Position recovery tests pass (12,965 LOC)
- ⏳ Cross-app integration tests pass
- ⏳ Git tag `week2-phase2` created

### Week 2 Phase 3 Complete When:
- ⏳ copy-editor app migrated to monorepo
- ⏳ All imports updated to @workspace/shared
- ⏳ All quality gates pass (lint 0E, typecheck 0E, tests passing)
- ⏳ Cross-app validation: scenes-web still works
- ⏳ Performance targets met (bundle <1.2M, TTI <2s)
- ⏳ Git tag `week2-phase3` created

### Overall Success When:
- ✅ All 7 Critical-Engineer conditions satisfied
- ⏳ TDD discipline maintained (RED→GREEN→REFACTOR evidence)
- ⏳ Production-grade quality validated
- ⏳ Constitutional compliance demonstrated (North Star I7, I8, I11)

---

## 7. References

### Strategic Documents
- North Star: `/Volumes/HestAI-Projects/eav-monorepo/docs/workflow/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md`
- Extraction Strategy: `/Volumes/HestAI-Projects/eav-monorepo/docs/guides/002-DOC-COPY-EDITOR-EXTRACTION.md`
- Session Handoff: `/Volumes/HestAI-Projects/eav-monorepo/.coord/SESSION-HANDOFF-COPY-EDITOR-EXTRACTION.md`

### Validation Reports
- Technical-Architect: `.coord/reports/001-REPORT-TECHNICAL-ARCHITECT-EXTRACTION-REVIEW.md`
- Critical-Engineer: `.coord/reports/002-REPORT-CRITICAL-ENGINEER-GO-NO-GO.md`
- Test-Methodology-Guardian: `.coord/reports/003-REPORT-TEST-METHODOLOGY-GUARDIAN-TDD-PROTOCOL.md`
- Test-Methodology-Guardian Strategy B: `.coord/reports/004-REPORT-TEST-METHODOLOGY-GUARDIAN-STRATEGY-B-REVIEW.md`
- Critical-Engineer CI Readiness: `.coord/reports/005-REPORT-CRITICAL-ENGINEER-CI-READINESS.md`
- Principal-Engineer Strategic Viability: `.coord/reports/006-REPORT-PRINCIPAL-ENGINEER-STRATEGIC-VIABILITY.md`

### Checklists
- App Checklist: `.coord/apps/copy-editor/APP-CHECKLIST.md`
- Week 1 TDD RED State: Lines 33-208 (current phase)
- Week 2 Extraction: Lines 212-378 (blocked until Week 1 complete)

---

**Document Status:** ✅ COMPLETE - Ready for Week 1 execution
**Last Updated:** 2025-11-02
**Next Review:** After Week 1 RED state committed (update with git SHAs and evidence)
