# CI Workflow Activation Checklist

**Date Created:** 2025-11-03
**Status:** READY FOR ACTIVATION (after Phase 3B completion)
**Authority:** test-methodology-guardian CONDITIONAL-GO (806-REPORT)
**Constitutional Basis:** Zero-error discipline, PROVEN_PATTERNS, test integrity

---

## Executive Summary

The CI workflow (`.github/workflows/ci.yml`) has been created and validated. It implements all POC-proven patterns and addresses all 10 gaps from CI-PIPELINE-GAP-ANALYSIS.md.

**Activation is CONDITIONAL** on:
1. Phase 3B completion (orchestration hooks)
2. Quality baseline achievement (0 TypeCheck errors, 100% test pass)
3. Full dry-run validation on latest main
4. Evidence documentation

---

## Prerequisites

### 1. Phase 3B Completion Status

**Current State (as of 2025-11-03):**
- ✅ Phase 3A: COMPLETE (92% - barrel exports + import transformations)
- ⏸️ Phase 3B: DEFERRED (~1.5-2h - orchestration hooks)

**Required for Activation:**
- [ ] useCommentSidebar hook created
- [ ] useScriptComments hook created
- [ ] TypeScript implicit any warnings fixed (4 occurrences)
- [ ] Full validation passed (build + quality gates + cross-app)

### 2. Quality Baseline Requirements

**Zero-Error Discipline (TMG-approved):**

| Gate | Current | Required | Gap |
|------|---------|----------|-----|
| Lint | TBD | 0 errors | TBD |
| TypeCheck | 6 errors | 0 errors | -6 |
| Tests | 324/338 passing | 338/338 passing | -14 |
| Build | SUCCESS | SUCCESS | ✅ |

**Action Required:** Complete Phase 3B to achieve 0 TypeCheck errors and 100% test pass rate.

### 3. Infrastructure Readiness

**Already Complete:** ✅
- vitest.config.ts: Memory limits (maxThreads: 4), CI detection, env override
- package.json: test:unit / test:integration commands (lines 98-99)
- scripts/create-test-users-via-api.mjs: Test user creation script
- .github/workflows/ci.yml: Complete CI workflow

---

## Activation Procedure

### Step 1: Verify Phase 3B Completion

**Command:**
```bash
cd /Volumes/HestAI-Projects/eav-monorepo/packages/shared

# Check TypeScript errors
pnpm typecheck
# Expected: exit 0 (0 errors)

# Check test pass rate
pnpm test
# Expected: All tests passing (338/338 or higher)

# Check build
pnpm build
# Expected: exit 0 (build success)
```

**Gate:** All three commands must exit 0. If any fail, return to Phase 3B work.

### Step 2: Run Full Dry-Run (MANDATORY - TMG Requirement)

**Purpose:** Validate CI workflow on latest main before activation.

**Command:**
```bash
cd /Volumes/HestAI-Projects/eav-monorepo

# Start local Supabase (if not running)
supabase start

# Wait for GoTrue health check
timeout 60 bash -c 'until curl -f http://127.0.0.1:54321/auth/v1/health > /dev/null 2>&1; do
  echo "Waiting for GoTrue...";
  sleep 2;
done'

# Export environment variables
export VITE_SUPABASE_URL=http://127.0.0.1:54321
export VITE_SUPABASE_PUBLISHABLE_KEY=$(supabase status -o json | jq -r '.ANON_KEY')

# Apply migrations
supabase db reset --local

# Create test users
export SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | jq -r '.SERVICE_ROLE_KEY')
node scripts/create-test-users-via-api.mjs

# Seed baseline data (if exists)
if [ -f supabase/seed.sql ]; then
  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/seed.sql
fi

# Run quality gates (exact CI sequence)
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
```

**Expected Output:**
```
✅ Lint passed (0 errors)
✅ TypeCheck passed (0 errors)
✅ Unit tests passed (all passing)
✅ Build successful
```

**Gate:** All commands must succeed. Any failure requires investigation and fix before activation.

### Step 3: Document Evidence

**Create evidence file:**
```bash
cd /Volumes/HestAI-Projects/eav-monorepo/.coord/reports

cat > 808-REPORT-CI-DRY-RUN-EVIDENCE.md <<'EOF'
# CI Dry-Run Evidence

**Date:** $(date +%Y-%m-%d)
**Branch:** main
**Commit:** $(git rev-parse HEAD)

## Quality Gates Results

**Lint:**
$(pnpm lint 2>&1 | tail -5)

**TypeCheck:**
$(pnpm typecheck 2>&1 | tail -5)

**Test:Unit:**
$(pnpm test:unit 2>&1 | tail -10)

**Build:**
$(pnpm build 2>&1 | tail -5)

## Verdict

All quality gates PASSED. CI workflow ready for activation.

**Authorized by:** [Your name]
**Date:** $(date +%Y-%m-%d)
EOF
```

### Step 4: Activate CI Workflow

**Git sequence:**
```bash
cd /Volumes/HestAI-Projects/eav-monorepo

# Ensure you're on main and up to date
git checkout main
git pull origin main

# Verify CI workflow exists
ls -la .github/workflows/ci.yml

# Stage and commit
git add .github/workflows/ci.yml
git add .coord/reports/808-REPORT-CI-DRY-RUN-EVIDENCE.md

git commit -m "feat(ci): activate CI workflow with POC-proven patterns

- Tier 1: quality-gates (lint, typecheck, test:unit, build)
- Tier 2: preview-integration-tests (PRs only)
- All 10 gaps from CI-PIPELINE-GAP-ANALYSIS.md addressed
- Zero-error discipline enforced (TMG CONDITIONAL-GO)

Evidence: .coord/reports/808-REPORT-CI-DRY-RUN-EVIDENCE.md
TIS Review: .coord/reports/CI-WORKFLOW-REVIEW-TIS.md
TMG Decision: .coord/reports/806-REPORT-CI-WORKFLOW-TMG-DECISION.md

Phase 3B complete: 0 TypeCheck errors, 100% test pass rate

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to trigger CI
git push origin main
```

### Step 5: Monitor First CI Run

**GitHub Actions:**
1. Go to: https://github.com/[YOUR_ORG]/eav-monorepo/actions
2. Click on latest "CI Pipeline" workflow run
3. Monitor quality-gates job

**Expected Behavior:**
```
✅ Checkout code
✅ Setup Node.js
✅ Setup pnpm
✅ Install dependencies
✅ Setup Supabase CLI
✅ Start local Supabase (attempt 1/3) → GoTrue ready
✅ Override environment variables
✅ Apply database migrations
✅ Create test users (3/3 successful)
✅ Seed baseline data (if exists)
✅ Run lint (0 errors)
✅ Run typecheck (0 errors)
✅ Run unit tests (all passing)
✅ Run build (success)
```

**On Failure:**
1. Check "Capture Supabase logs" step output
2. Review Docker logs for auth/db services
3. Verify environment overrides logged correctly
4. Check test user creation summary

### Step 6: Validate CI Integration

**Create test PR to validate Tier 2:**
```bash
# Create feature branch
git checkout -b test/ci-validation

# Make trivial change
echo "# CI Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: validate CI workflow integration"
git push origin test/ci-validation

# Create PR via GitHub CLI or web UI
gh pr create --title "Test: Validate CI Workflow" --body "Validates both Tier 1 and Tier 2 jobs"
```

**Expected PR Checks:**
- ✅ quality-gates (runs on PR)
- ⚠️ preview-integration-tests (may skip if no schema changes - tri-state logic)

---

## Troubleshooting

### Issue: Supabase Fails to Start

**Symptoms:** Retry loop exhausts all 3 attempts

**Debug Steps:**
```bash
# Check Docker status
docker ps

# Check Supabase logs locally
supabase start
docker logs supabase_auth_dev
docker logs supabase_db_dev

# Clean Docker state
supabase stop
docker system prune -f
supabase start
```

**Fix:** Retry logic should handle transient failures. Persistent failures indicate infrastructure issue.

### Issue: GoTrue Health Check Timeout

**Symptoms:** "GoTrue health check timeout on attempt X"

**Debug Steps:**
```bash
# Test health endpoint manually
curl -f http://127.0.0.1:54321/auth/v1/health

# Check GoTrue logs
docker logs supabase_auth_dev
```

**Fix:** Increase timeout or add additional retry attempt if needed.

### Issue: Test User Creation Fails

**Symptoms:** "user_profiles creation failed" or "Auth API failed after 3 attempts"

**Debug Steps:**
```bash
# Verify migrations applied
supabase db diff

# Check user_profiles table exists
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "\dt user_profiles"

# Manually run script
export SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | jq -r '.SERVICE_ROLE_KEY')
node scripts/create-test-users-via-api.mjs
```

**Fix:** Ensure migrations applied before test user creation.

### Issue: Tests Fail in CI but Pass Locally

**Symptoms:** Different behavior local vs CI

**Debug Steps:**
1. Check environment override verification logs
2. Confirm VITE_SUPABASE_URL = 127.0.0.1:54321 in CI
3. Verify VITE_SUPABASE_PUBLISHABLE_KEY extracted correctly
4. Check test logs for connection errors

**Fix:** Environment override issue - verify GitHub Actions env logs.

---

## Rollback Procedure

**If CI activation fails catastrophically:**

```bash
# Revert CI workflow activation
git revert HEAD  # Reverts activation commit
git push origin main

# Or disable workflow temporarily
# Navigate to: Settings → Actions → Disable workflow
```

**Note:** CI workflow is non-invasive - disabling it doesn't affect local development.

---

## Post-Activation Enhancements

**Non-blocking improvements (TIS recommendations):**

### 1. Add Caching
```yaml
- uses: actions/cache@v3
  with:
    path: |
      ~/.pnpm-store
      ~/.cache/turbo
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
```

### 2. Add Telemetry
```yaml
- name: Publish Supabase metrics
  run: |
    echo "supabase_startup_attempts=$ATTEMPT" >> $GITHUB_OUTPUT
    echo "supabase_startup_duration=${SECONDS}s" >> $GITHUB_OUTPUT
```

### 3. Add Turbo Filtering
```yaml
pnpm turbo run lint --filter=@workspace/shared
pnpm turbo run test:unit --filter=@workspace/shared
```

**Implementation:** After CI proves stable for 1-2 weeks.

---

## Success Criteria

**Activation Successful When:**
- ✅ First CI run on main passes all quality gates
- ✅ Test PR triggers both Tier 1 and Tier 2 jobs correctly
- ✅ Zero false failures in first week
- ✅ Developer confidence in CI signal (green = actually good)

**Constitutional Compliance:**
- ✅ Zero-error discipline enforced
- ✅ Test integrity preserved
- ✅ No validation theater
- ✅ PROVEN_PATTERNS from POC implemented

---

## References

- **TIS Review:** CI-WORKFLOW-REVIEW-TIS.md
- **TMG Decision:** 806-REPORT-CI-WORKFLOW-TMG-DECISION.md
- **Final Plan:** 805-REPORT-CI-WORKFLOW-FINAL-PLAN.md
- **Gap Analysis:** test-context/CI-PIPELINE-GAP-ANALYSIS.md
- **POC Patterns:** test-context/SUPABASE-HARNESS.md

---

**Activation Authority:** test-methodology-guardian (CONDITIONAL-GO)
**Condition:** Full dry-run validation MUST pass before activation
**Next Step:** Complete Phase 3B → Run dry-run → Document evidence → Activate
