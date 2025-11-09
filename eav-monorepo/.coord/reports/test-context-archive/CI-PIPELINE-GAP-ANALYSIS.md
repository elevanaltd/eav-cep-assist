# CI Pipeline Gap Analysis - Supabase Testing

**Date:** 2025-11-02
**Purpose:** Identify gaps between POC copy-editor CI setup and monorepo documentation
**Source:** POC copy-editor/.github/workflows/ci.yml (proven over 3 months)
**Status:** ⚠️ CRITICAL GAPS IDENTIFIED

---

## Executive Summary

**Status:** Our SUPABASE-HARNESS.md covers the basics but **MISSING critical CI complexity** from POC.

**Risk:** Without these patterns, CI pipeline will encounter:
- Flaky test failures (Docker transient issues)
- 50-minute hangs (GoTrue not ready)
- Preview branch false failures (tri-state logic missing)
- Resource exhaustion (missing memory limits)
- Test interference (seed timing issues)

**Action Required:** Update monorepo CI workflow with POC-proven patterns BEFORE Phase 3 CI setup.

---

## Gap 1: Retry Logic & Health Checks ⚠️ CRITICAL

### What POC Does (ci.yml:52-98)

```yaml
- name: Start local Supabase instance
  run: |
    MAX_ATTEMPTS=3
    ATTEMPT=1

    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
      echo "=== Attempt $ATTEMPT of $MAX_ATTEMPTS ==="

      # Clean previous failed attempts
      if [ $ATTEMPT -gt 1 ]; then
        supabase stop --no-backup || true
        docker system prune -f || true
        sleep 5
      fi

      # Start with 300s timeout
      if timeout 300 supabase start; then
        echo "✅ Supabase started"

        # CRITICAL: Wait for GoTrue health check
        if timeout 60 bash -c 'until curl -f http://127.0.0.1:54321/auth/v1/health > /dev/null 2>&1; do
          echo "Waiting for GoTrue...";
          sleep 2;
        done'; then
          echo "✅ GoTrue ready"
          break
        else
          echo "❌ GoTrue timeout"
        fi
      fi

      ATTEMPT=$((ATTEMPT + 1))
      sleep 10
    done
```

### What SUPABASE-HARNESS.md Says

```yaml
# Simplified version - NO RETRY, NO HEALTH CHECK
- name: Start local Supabase instance
  run: |
    MAX_ATTEMPTS=3
    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
      if timeout 300 supabase start; then
        break
      fi
      ATTEMPT=$((ATTEMPT + 1))
    done
```

### The Gap

**Missing:**
1. ❌ Cleanup of failed attempts (Docker containers left running)
2. ❌ GoTrue health check (`/auth/v1/health`)
3. ❌ Exponential backoff / sleep between retries
4. ❌ Failure logging (container logs, status)

**Why It Matters:**
- **Without cleanup:** Failed Docker containers block subsequent attempts
- **Without GoTrue health:** Tests run before auth is ready → mass failures
- **Without logging:** Debugging transient failures impossible

**Impact:** High likelihood of flaky CI failures

---

## Gap 2: Environment Variable Override Strategy ⚠️ CRITICAL

### What POC Does (ci.yml:110-119)

```yaml
- name: Override environment variables for local Supabase
  run: |
    # Override production URLs with local
    echo "VITE_SUPABASE_URL=http://127.0.0.1:54321" >> $GITHUB_ENV
    echo "VITE_SUPABASE_PUBLISHABLE_KEY=$(supabase status -o json | jq -r '.ANON_KEY')" >> $GITHUB_ENV

    # Verify override
    echo "=== Local Supabase Configuration ==="
    echo "URL: http://127.0.0.1:54321"
    echo "Anon Key: $(supabase status -o json | jq -r '.ANON_KEY' | head -c 20)..."
```

**Plus vite.config.ts conditional env injection (vite.config.ts:90-103):**

```typescript
env: process.env.CI ? {
  // CI: Uses GitHub env vars (OVERRIDDEN to 127.0.0.1 above)
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
} : {
  // Local: Hardcoded to localhost
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_...',
}
```

### What SUPABASE-HARNESS.md Says

"Environment variable controls tier" - **NO EXPLANATION OF OVERRIDE PATTERN**

### The Gap

**Missing:**
1. ❌ Two-step override strategy (GitHub Actions env → Vitest env)
2. ❌ CI detection in vitest config (`process.env.CI` check)
3. ❌ Verification logging (confirm override worked)
4. ❌ Hardcoded local keys fallback

**Why It Matters:**
- **Without override:** Tests hit production database in CI → data pollution, rate limits
- **Without verification:** Silent failures when override doesn't work
- **Without CI detection:** Local tests might use wrong credentials

**Impact:** Tests could accidentally hit production Supabase in CI

---

## Gap 3: Test Data Seeding Timing & Separation ⚠️ MEDIUM

### What POC Does (ci.yml:144-168)

**Order matters:**

```yaml
1. npm install           # FIRST - need @supabase/supabase-js
2. Create test users     # SECOND - via Auth Admin API
3. Seed test data        # THIRD - projects/videos/scripts via seed.sql
4. Run tests             # FOURTH
```

**Separation:**
- **Test users:** `scripts/create-test-users-via-api.mjs` (per-run, auth.users)
- **Baseline data:** `supabase/seed.sql` (projects, videos - TRUNCATE safe)

### What SUPABASE-HARNESS.md Says

"Create test users" - **NO MENTION OF SEEDING ORDER OR SEPARATION**

### The Gap

**Missing:**
1. ❌ Timing: npm install MUST complete before test user creation
2. ❌ Separation: Test users (auth) vs baseline data (seed.sql)
3. ❌ TRUNCATE safety: seed.sql doesn't affect auth.users

**Why It Matters:**
- **Wrong order:** `@supabase/supabase-js` not available → user creation fails
- **No separation:** Confusion about what data lives where
- **No TRUNCATE safety:** Might accidentally delete test users

**Impact:** Test user creation failures in CI

---

## Gap 4: Preview Branch Tri-State Logic ⚠️ HIGH

### What POC Does (ci.yml:268-345)

**Three states:**

```yaml
1. SUCCESS → Run integration tests
2. SKIPPED → exit 0 (no schema changes, tests not needed)
3. FAILURE → exit 1 (preview deployment failed)
```

**Graceful skip logic:**

```yaml
if ! supabase branches list | grep -q "$BRANCH_NAME"; then
  echo "⚠️  No preview branch exists"
  echo "Reason: No schema changes (Supabase skips preview when migrations unchanged)"
  echo "✅ Skipping integration tests gracefully"
  exit 0
fi
```

### What SUPABASE-HARNESS.md Says

"Graceful skip when no preview" - **SIMPLIFIED, MISSING TRI-STATE**

### The Gap

**Missing:**
1. ❌ Tri-state detection (success/skipped/failure)
2. ❌ Branch existence check before access
3. ❌ Reason logging (why skip: no schema changes vs failure)
4. ❌ Exit 0 vs exit 1 distinction

**Why It Matters:**
- **Without tri-state:** False failures on legitimate skips
- **Without checks:** Crash when trying to access non-existent preview
- **Without logging:** Confusion about why tests skipped

**Impact:** Preview branch integration tests fail incorrectly

---

## Gap 5: Functional Change Detection (MIP Optimization) ⚠️ MEDIUM

### What POC Does (ci.yml:415-428, 457-474)

**Skip tests when only docs/config changed:**

```yaml
CHANGED_FILES=$(git diff --name-only $BASE...$HEAD)
FUNCTIONAL_CHANGES=$(echo "$CHANGED_FILES" | grep -E "^src/.*\.(ts|tsx|js|jsx)$" | grep -v "\.test\.")

if [ -z "$FUNCTIONAL_CHANGES" ]; then
  echo "⚠️  No functional code changes (cleanup/docs/migration-only PR)"
  echo "✅ Skipping integration tests - no behavior changes to validate"
  exit 0
fi
```

### What SUPABASE-HARNESS.md Says

**NOT MENTIONED**

### The Gap

**Missing:**
1. ❌ Functional change detection pattern
2. ❌ Git diff base...head analysis
3. ❌ Skip logic for docs-only PRs
4. ❌ MIP coordination theater elimination

**Why It Matters:**
- **Without detection:** Waste CI time on docs-only PRs
- **Without skip:** Unnecessary test user creation, preview access

**Impact:** CI runtime waste, resource inefficiency

---

## Gap 6: Vitest Memory Optimization ⚠️ HIGH

### What POC Does (vite.config.ts:77-84)

```typescript
pool: 'threads',
poolOptions: {
  threads: {
    maxThreads: 4,      // Limit concurrent workers
    minThreads: 1,
    singleThread: false
  }
}
```

**Comment:**
```
// Memory optimization: Limit worker threads to prevent RAM exhaustion
// Without this, Vitest spawns workers equal to CPU cores (often 12+)
// Each worker + jsdom = ~400-600MB
```

### What SUPABASE-HARNESS.md Says

**NOT MENTIONED**

### The Gap

**Missing:**
1. ❌ Thread pool limits
2. ❌ Memory exhaustion prevention
3. ❌ jsdom memory footprint awareness

**Why It Matters:**
- **Without limits:** GitHub Actions runner (7GB RAM) exhausted
- **Default behavior:** 12+ workers × 500MB = 6GB+ → OOM kills

**Impact:** CI failures due to out-of-memory errors

---

## Gap 7: Separate Test Commands (Unit vs Integration) ⚠️ MEDIUM

### What POC Does (package.json scripts)

```json
"test:unit": "vitest run --exclude '**/rls-security.test.ts' --exclude '**/hard-delete-governance.test.ts' --exclude '**/useScriptLock.test.ts'",

"test:integration": "VITEST_INTEGRATION=true vitest run src/lib/rls-security.test.ts src/lib/hard-delete-governance.test.ts src/hooks/useScriptLock.test.ts",
```

**CI uses:**
- `quality-gates` job: `npm run test:unit` (local Supabase, fast)
- `preview-integration-tests` job: `npm run test:integration` (preview branch, slower)

### What SUPABASE-HARNESS.md Says

"VITEST_INTEGRATION=true enables integration mode" - **NO SEPARATE COMMANDS**

### The Gap

**Missing:**
1. ❌ Explicit unit vs integration test commands
2. ❌ Exclude patterns for integration tests in unit runs
3. ❌ Two-tier CI strategy documentation

**Why It Matters:**
- **Without separation:** All tests run in both jobs (duplication, waste)
- **Without excludes:** Integration tests fail in unit test job

**Impact:** CI inefficiency, potential false failures

---

## Gap 8: Failure Debugging Artifacts ⚠️ LOW

### What POC Does (ci.yml:199-209)

```yaml
- name: Capture Supabase logs on test failure
  if: failure()
  run: |
    echo "=== Supabase Auth Logs ==="
    docker logs supabase_auth_dev || echo "❌ Auth logs not available"

    echo "=== Supabase DB Logs ==="
    docker logs supabase_db_dev || echo "❌ DB logs not available"

    echo "=== Supabase Status ==="
    supabase status || echo "❌ Status not available"
```

### What SUPABASE-HARNESS.md Says

**NOT MENTIONED**

### The Gap

**Missing:**
1. ❌ Failure log capture
2. ❌ Docker container log extraction
3. ❌ Status dump on failure

**Why It Matters:**
- **Without logs:** Debugging transient failures impossible
- **Without status:** Don't know which service failed

**Impact:** Difficult debugging, prolonged incident resolution

---

## Gap 9: Migration Application Method ✅ DOCUMENTED

### What POC Does (ci.yml:100-108)

```yaml
- name: Apply database migrations
  run: |
    # Use db reset (NOT db push)
    # Reason: db push fails on complex trigger function syntax
    supabase db reset --local
```

### What SUPABASE-HARNESS.md Says

**✅ DOCUMENTED:**
```markdown
supabase db reset --local  # Clean slate + all migrations

Why `db reset`? Ensures complex trigger functions apply correctly
(POC lesson: `db push` failed on `COALESCE → IF/ELSE` replacements).
```

**Status:** ✅ This pattern is correctly documented

---

## Gap 10: Test User Creation Timing ✅ DOCUMENTED

### What POC Does (ci.yml:144-160)

```yaml
- name: Create test users via Auth Admin API
  run: |
    # IMPORTANT: Must run AFTER npm install
    export SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | jq -r '.SERVICE_ROLE_KEY')
    node scripts/create-test-users-via-api.mjs
```

### What SUPABASE-HARNESS.md Says

**✅ DOCUMENTED:**
```markdown
Why Auth API: Direct SQL bypasses GoTrue state (auth.identities)
```

**Status:** ✅ Correctly documented (though timing dependency could be clearer)

---

## Summary Matrix

| Gap | Severity | Documented | Risk if Missing |
|-----|----------|------------|-----------------|
| 1. Retry Logic & Health Checks | 🔴 CRITICAL | ❌ No | Flaky failures, 50min hangs |
| 2. Env Var Override Strategy | 🔴 CRITICAL | ❌ No | Prod database pollution |
| 3. Seed Timing & Separation | 🟡 MEDIUM | ❌ No | User creation failures |
| 4. Preview Tri-State Logic | 🟠 HIGH | Partial | False failures on skip |
| 5. Functional Change Detection | 🟡 MEDIUM | ❌ No | CI waste |
| 6. Vitest Memory Optimization | 🟠 HIGH | ❌ No | OOM kills in CI |
| 7. Separate Test Commands | 🟡 MEDIUM | Partial | Test duplication |
| 8. Failure Debugging | 🟢 LOW | ❌ No | Slow debugging |
| 9. Migration Method | ✅ OK | ✅ Yes | N/A |
| 10. Test User Timing | ✅ OK | ✅ Yes | N/A |

**Critical Gaps:** 2 (Retry logic, Env override)
**High Gaps:** 2 (Preview tri-state, Memory limits)
**Medium Gaps:** 3 (Seeding, Change detection, Test separation)

---

## Recommended Actions

### Immediate (Before CI Setup)

1. **Update SUPABASE-HARNESS.md** with:
   - Retry logic with GoTrue health check
   - Environment override strategy
   - Preview branch tri-state logic
   - Memory optimization settings

2. **Create CI workflow template** with:
   - POC-proven retry patterns
   - GoTrue health check
   - Environment override verification
   - Failure log capture

3. **Update vitest.config.ts** with:
   - Thread pool limits (maxThreads: 4)
   - CI detection for env injection
   - Memory optimization comments

### Before Phase 3 CI Integration

4. **Add separate test commands:**
   ```json
   "test:unit": "vitest run --exclude '**/*.integration.test.ts'",
   "test:integration": "VITEST_INTEGRATION=true vitest run '**/*.integration.test.ts'"
   ```

5. **Document functional change detection:**
   - Add to SUPABASE-HARNESS.md
   - Create example skip logic

6. **Test locally:**
   - Verify retry logic works
   - Confirm health check catches GoTrue delays
   - Validate memory limits prevent OOM

---

## POC Lessons Learned (Not in Our Docs)

### 1. Docker System Prune Between Retries
**Why:** Failed Supabase start leaves containers running, blocking next attempt
**Fix:** `docker system prune -f` in retry loop

### 2. GoTrue Health Check is Non-Negotiable
**Why:** Supabase CLI reports "started" before GoTrue is ready
**Impact:** Auth tests fail with "service unavailable"
**Fix:** Explicit `/auth/v1/health` curl check with 60s timeout

### 3. CI Detection Must Be in Vitest Config
**Why:** Environment variables set in GitHub Actions not available at config load time
**Fix:** `process.env.CI` check in `vite.config.ts` for conditional env injection

### 4. Preview Branch Doesn't Always Exist
**Why:** Supabase skips preview when no schema changes
**Impact:** CI crashes trying to access non-existent preview
**Fix:** Check `supabase branches list` before access, exit 0 if missing

### 5. Test Users AFTER npm install
**Why:** `@supabase/supabase-js` required by `create-test-users-via-api.mjs`
**Impact:** "Cannot find package" errors in CI
**Fix:** User creation step MUST be after dependency installation

### 6. Vitest Workers Default to CPU Count
**Why:** Vitest spawns one worker per core
**Impact:** 12 workers × 500MB jsdom = 6GB → OOM on 7GB runner
**Fix:** `maxThreads: 4` in poolOptions

---

## Files to Create/Update

**New Files:**
1. `.github/workflows/ci.yml` - Full CI workflow with POC patterns
2. `.coord/test-context/CI-WORKFLOW-TEMPLATE.yml` - Reusable template

**Updates:**
1. `.coord/test-context/SUPABASE-HARNESS.md` - Add critical gaps
2. `packages/shared/vitest.config.ts` - Add memory limits, CI detection
3. `package.json` - Add test:unit and test:integration scripts
4. `.coord/test-context/RULES.md` - Add CI-specific rules

---

**Status:** ⚠️ Critical gaps identified, documentation update required before CI setup

**Next Steps:** Update documentation and create CI workflow template with POC-proven patterns
