# Supabase Test Harness

**Purpose:** Document how Supabase test infrastructure works in the monorepo.

**Pattern Source:** POC copy-editor proven over 3 months of CI/local testing

---

## Quick Start

### Local Development

```bash
# 1. Start local Supabase
supabase start

# 2. Create test users
node scripts/create-test-users-via-api.mjs

# 3. Run tests
pnpm test                    # All tests
pnpm test --filter=copy-editor  # Specific app
```

### CI (GitHub Actions)

Automated in `.github/workflows/ci.yml`:
1. Local Supabase starts automatically
2. Migrations applied via `supabase db reset --local`
3. Test users created via Auth Admin API
4. Tests run against local instance

---

## Test Environment Strategy

**Three-tier approach:**

### 1. Unit Tests (Default)
- **Mock:** Fake Supabase client
- **Credentials:** `test-project.supabase.co` (non-functional)
- **Speed:** Fast (no network calls)
- **Use:** Component isolation, logic testing

### 2. Integration Tests (Local)
- **Real:** Local Supabase (`127.0.0.1:54321`)
- **Credentials:** From `.env` or `supabase status`
- **Speed:** Medium (local network only)
- **Use:** RLS policies, realtime, triggers

### 3. Integration Tests (CI Preview)
- **Real:** Supabase Preview Branch (per PR)
- **Credentials:** Auto-set by Supabase CLI
- **Speed:** Slower (remote network)
- **Use:** Full production-like validation

**Environment variable controls tier:**
```bash
VITEST_INTEGRATION=true  # Enable integration mode
# (unset)                # Unit test mode (mocked)
```

---

## Test Users

**Standardized credentials** (all environments):

```typescript
admin: {
  email: 'admin.test@example.com',
  password: 'test-password-admin-123'
}

client: {
  email: 'client.test@example.com',
  password: 'test-password-client-123'
}

unauthorized: {
  email: 'unauthorized.test@example.com',
  password: 'test-password-unauth-123'
}
```

**Created via:** `scripts/create-test-users-via-api.mjs`
**Why Auth API:** Direct SQL bypasses GoTrue state (`auth.identities`)

---

## File Structure

```
packages/shared/src/test/
├── setup.ts                    # Vitest global setup
├── supabase-test-client.ts     # Test client + env detection
├── auth-helpers.ts             # Sign in/out utilities
└── factories.ts                # Test data builders

scripts/
└── create-test-users-via-api.mjs  # CI test user setup
```

---

## Usage Patterns

### Basic Test with Auth

```typescript
import { describe, it, expect } from 'vitest'
import { testSupabase, signInAsAdmin } from '@workspace/shared/test/auth-helpers'

describe('My Feature', () => {
  it('works with authenticated user', async () => {
    // Sign in as admin
    const userId = await signInAsAdmin()

    // Test authenticated behavior
    const { data } = await testSupabase
      .from('projects')
      .select('*')

    expect(data).toBeDefined()
  })
})
```

### Clean Auth Context

```typescript
import { asAdmin, asClient } from '@workspace/shared/test/auth-helpers'

it('admin can create, client cannot', async () => {
  // Fresh admin context (signs out after)
  await asAdmin(async (userId) => {
    const { error } = await testSupabase
      .from('projects')
      .insert({ title: 'Test' })
    expect(error).toBeNull()
  })

  // Fresh client context (signs out after)
  await asClient(async (userId) => {
    const { error } = await testSupabase
      .from('projects')
      .insert({ title: 'Test' })
    expect(error).not.toBeNull()  // RLS should block
  })
})
```

### Test Data Factories

```typescript
import { mockProject, mockVideo } from '@workspace/shared/test/factories'

it('creates related entities', async () => {
  const project = mockProject({ title: 'My Project' })
  const video = mockVideo({ project_id: project.id })

  // Insert test data
  await testSupabase.from('projects').insert(project)
  await testSupabase.from('videos').insert(video)

  // Test...
})
```

---

## Environment Detection

**Automatic URL selection:**

```typescript
// Priority order:
1. process.env.SUPABASE_PREVIEW_URL   // CI preview branch
2. http://127.0.0.1:54321             // Local dev
3. import.meta.env.VITE_SUPABASE_URL  // Fallback
```

**Fail-fast guard:**
```typescript
// Detects CI misconfiguration
if (PREVIEW_URL set but resolved to localhost) {
  throw 'CI MISCONFIGURATION'  // Prevents 50min hangs
}
```

---

## Local Supabase Setup

### Start

```bash
supabase start

# Services started:
# - API:    http://127.0.0.1:54321
# - Studio: http://127.0.0.1:54323
# - DB:     postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### Apply Migrations

```bash
supabase db reset --local  # Clean slate + all migrations
# OR
supabase db push          # Apply pending only
```

**Why `db reset`?** Ensures complex trigger functions apply correctly (POC lesson: `db push` failed on `COALESCE → IF/ELSE` replacements).

### Create Test Users

```bash
# Extract service role key
export SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | jq -r '.SERVICE_ROLE_KEY')

# Create users
node scripts/create-test-users-via-api.mjs
```

### Verify Setup

```bash
supabase status  # Check all services running

# Expected output:
# API URL: http://127.0.0.1:54321
# DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Studio URL: http://127.0.0.1:54323
# Anon key: eyJhbGc...
# Service role key: eyJhbGc...
```

---

## CI Configuration (GitHub Actions)

**Proven pattern from POC:**

```yaml
- name: Setup Supabase CLI
  uses: supabase/setup-cli@v1
  with:
    version: latest

- name: Start local Supabase instance
  run: |
    # Retry logic for transient failures
    MAX_ATTEMPTS=3
    ATTEMPT=1
    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
      if timeout 300 supabase start; then
        break
      fi
      ATTEMPT=$((ATTEMPT + 1))
    done

- name: Apply database migrations
  run: supabase db reset --local

- name: Create test users via Auth Admin API
  run: |
    export SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | jq -r '.SERVICE_ROLE_KEY')
    node scripts/create-test-users-via-api.mjs

- name: Override environment variables for local Supabase
  run: |
    echo "VITE_SUPABASE_URL=http://127.0.0.1:54321" >> $GITHUB_ENV
    echo "VITE_SUPABASE_PUBLISHABLE_KEY=$(supabase status -o json | jq -r '.ANON_KEY')" >> $GITHUB_ENV

- name: Run tests
  run: pnpm test
```

---

## Supabase Preview Branch (CI)

**Automatic per-PR isolation:**

1. **GitHub Integration:** Supabase monitors PR migrations
2. **Auto-create:** Preview branch created when migrations detected
3. **Environment:** `SUPABASE_PREVIEW_URL` + `SUPABASE_PREVIEW_ANON_KEY` set
4. **Tests:** Run against isolated preview database
5. **Cleanup:** Preview deleted on PR merge

**Benefits:**
- Real RLS policies (validates actual security)
- Real migrations (validates schema changes)
- No test interference between PRs
- Production-like environment

**Graceful skip when no preview:**
```yaml
if ! preview_exists; then
  echo "No preview - skipping integration tests"
  exit 0  # Not a failure
fi
```

---

## Rate Limiting

**Supabase Auth has rate limits:**

```typescript
// 750ms delay between auth operations
export async function authDelay() {
  const now = Date.now()
  const timeSinceLastAuth = now - lastAuthTime
  if (timeSinceLastAuth < MIN_AUTH_DELAY_MS) {
    await new Promise(resolve =>
      setTimeout(resolve, MIN_AUTH_DELAY_MS - timeSinceLastAuth)
    )
  }
  lastAuthTime = Date.now()
}
```

**Usage:** Automatic in `signInAsTestUser()`, `signOut()`

---

## Troubleshooting

### Test users not found

```bash
# Verify users exist
supabase db diff --linked

# Recreate
node scripts/create-test-users-via-api.mjs
```

### Connection refused (127.0.0.1:54321)

```bash
# Check Supabase running
supabase status

# Restart if needed
supabase stop
supabase start
```

### CI hangs for 50+ minutes

**Cause:** Hardcoded URL in `package.json` blocking preview connection
**Fix:** Fail-fast guard in `supabase-test-client.ts` prevents this

### Realtime connections not closing

**Fixed:** `afterAll` in `setup.ts` disconnects realtime + clears channels

---

## Production Project Configuration

**Project Ref:** `zbxvjyrbkycbfhwmmnmy`
**URL:** `https://zbxvjyrbkycbfhwmmnmy.supabase.co`

**Local label:** `eav-orchestrator` (in `config.toml`)
**Note:** Local label ≠ production ref (different purposes)

---

## Benchmarking Integration

**Test infrastructure enables automated benchmarking:**

```typescript
// Example: EXPLAIN ANALYZE in tests
it('validates FK index performance', async () => {
  await signInAsAdmin()

  const { data } = await testSupabase.rpc('explain_analyze', {
    query: 'SELECT * FROM videos WHERE project_id = $1'
  })

  // Assert query plan uses index
  expect(data).toContain('Index Scan')
  expect(data).not.toContain('Seq Scan')
})
```

**Future enhancement:** Automated pre/post migration benchmarks in CI

---

## APPENDIX: Critical CI Patterns (POC-Proven)

**⚠️ READ THIS BEFORE CI SETUP**

The following patterns are **CRITICAL** for reliable CI. Missing these causes:
- Flaky test failures (60-80% failure rate without retry logic)
- Production database pollution (without env override)
- Out-of-memory kills (without thread limits)
- 50-minute CI hangs (without GoTrue health check)

**Source:** POC copy-editor `.github/workflows/ci.yml` (proven over 3 months, 100+ CI runs)

---

### A1. Retry Logic with GoTrue Health Check 🔴 CRITICAL

**Problem:** Docker/network transient failures cause ~40% flaky CI failures

**POC Solution:**

```yaml
- name: Start local Supabase instance
  run: |
    MAX_ATTEMPTS=3
    ATTEMPT=1

    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
      echo "=== Attempt $ATTEMPT of $MAX_ATTEMPTS ==="

      # Clean up failed attempts
      if [ $ATTEMPT -gt 1 ]; then
        echo "Cleaning up previous attempt..."
        supabase stop --no-backup || true
        docker system prune -f || true
        sleep 5
      fi

      # Start with 300s timeout
      if timeout 300 supabase start; then
        echo "✅ Supabase started successfully"

        # CRITICAL: Wait for GoTrue (auth service) to be ready
        echo "=== Waiting for GoTrue health check ==="
        if timeout 60 bash -c 'until curl -f http://127.0.0.1:54321/auth/v1/health > /dev/null 2>&1; do
          echo "Waiting for GoTrue...";
          sleep 2;
        done'; then
          echo "✅ GoTrue is ready"
          break
        else
          echo "❌ GoTrue health check timeout"
          supabase status || true
        fi
      else
        echo "❌ Supabase start failed or timed out"
        supabase status || true
      fi

      if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        echo "❌ All attempts failed. Showing logs..."
        docker ps -a
        docker logs supabase_db_dev 2>&1 | tail -50 || true
        docker logs supabase_auth_dev 2>&1 | tail -50 || true
        exit 1
      fi

      ATTEMPT=$((ATTEMPT + 1))
      echo "Retrying in 10 seconds..."
      sleep 10
    done
```

**Why Each Part Matters:**
- **3 retries:** Handles transient Docker/network issues
- **Cleanup:** Failed containers block subsequent attempts
- **300s timeout:** Some CI runners are slow to pull images
- **GoTrue health check:** Supabase CLI reports "started" BEFORE auth is ready
  - Without this: Auth tests fail with "service unavailable"
  - Impact: 50+ minute CI waste debugging phantom failures
- **Sleep 10:** Gives Docker time to fully clean up
- **Logs on failure:** Critical for debugging which service failed

**Test locally:**
```bash
# Simulate GoTrue delay
docker pause supabase_auth_dev
# Health check will retry, then fail gracefully
```

---

### A2. Environment Variable Override Strategy 🔴 CRITICAL

**Problem:** Without override, tests hit production database in CI

**POC Solution (Two-Step Override):**

**Step 1: GitHub Actions Override (ci.yml:110-119)**
```yaml
- name: Override environment variables for local Supabase
  run: |
    # Override production URLs with local
    echo "VITE_SUPABASE_URL=http://127.0.0.1:54321" >> $GITHUB_ENV
    echo "VITE_SUPABASE_PUBLISHABLE_KEY=$(supabase status -o json | jq -r '.ANON_KEY')" >> $GITHUB_ENV

    # CRITICAL: Verify override worked
    echo "=== Local Supabase Configuration ==="
    echo "URL: http://127.0.0.1:54321"
    echo "Anon Key: $(supabase status -o json | jq -r '.ANON_KEY' | head -c 20)..."
```

**Step 2: Vitest Config Injection (vitest.config.ts)**
```typescript
export default defineConfig(({ mode }) => ({
  test: {
    // CRITICAL: CI detection for conditional env injection
    env: process.env.CI ? {
      // CI: Use GitHub Actions env vars (OVERRIDDEN above to 127.0.0.1)
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    } : {
      // Local: Hardcoded localhost
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_...',  // From supabase status
    }
  }
}))
```

**Why Two Steps:**
1. GitHub Actions sets `VITE_SUPABASE_URL=production` initially (from secrets)
2. Override step changes it to `127.0.0.1:54321`
3. Vitest config reads the OVERRIDDEN value
4. Tests connect to local Supabase, not production

**Without this:** Tests write to production database → data pollution, rate limits

**Verification:** Check CI logs for "URL: http://127.0.0.1:54321" confirmation

---

### A3. Vitest Memory Optimization 🟠 HIGH

**Problem:** Default Vitest spawns 12+ workers → 6GB RAM → OOM on 7GB GitHub runner

**POC Solution (vitest.config.ts):**

```typescript
export default defineConfig({
  test: {
    // Memory optimization: Limit worker threads
    // Without this: Vitest spawns workers = CPU cores (often 12+)
    // Each worker + jsdom environment = ~400-600MB
    // 12 workers × 500MB = 6GB+ → exceeds GitHub Actions 7GB limit
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,      // Limit concurrent test workers
        minThreads: 1,      // Keep at least one thread alive
        singleThread: false // Allow parallelism within limits
      }
    },

    // Extended timeouts for cleanup (Supabase realtime disconnect)
    teardownTimeout: 60000,  // 60s for cleanup (default 10s)
    hookTimeout: 30000,      // 30s for beforeEach/afterEach (default 10s)
  }
})
```

**Why It Matters:**
- GitHub Actions runners: 7GB RAM
- Default Vitest: 12 workers (on 12-core runner)
- jsdom per worker: ~500MB
- **Total:** 12 × 500MB = 6GB → leaves 1GB for OS/Node → OOM kills

**Impact without limits:** Random CI failures with "JavaScript heap out of memory"

**Test locally:**
```bash
# Check worker count
vitest run --reporter=verbose | grep "workers"

# Should show: "4 workers" (not 12)
```

---

### A4. Preview Branch Tri-State Logic 🟠 HIGH

**Problem:** CI crashes when preview branch doesn't exist (legitimate scenario)

**POC Solution:**

```yaml
- name: Export Preview Branch environment variables
  run: |
    BRANCH_NAME="${{ github.head_ref }}"

    # Check if preview exists BEFORE accessing
    if supabase --experimental branches list --project-ref "$SUPABASE_PROJECT_ID" | grep -q "$BRANCH_NAME"; then
      echo "✅ Preview branch found"

      # Export preview env vars
      supabase --experimental branches get "$BRANCH_NAME" \
        --project-ref "$SUPABASE_PROJECT_ID" \
        -o env >> $GITHUB_ENV

    else
      echo "⚠️  No preview branch for '$BRANCH_NAME'"
      echo "Reason: No schema changes (Supabase skips preview when migrations unchanged)"
      echo "✅ Skipping integration tests gracefully (no preview to test)"
      exit 0  # NOT A FAILURE
    fi
```

**Three States:**
1. **SUCCESS:** Preview exists → run tests
2. **SKIPPED:** No preview (no schema changes) → exit 0
3. **FAILURE:** Preview creation failed → exit 1 (caught by wait step)

**Why Tri-State:**
- Supabase doesn't create preview when migrations unchanged
- This is **legitimate**, not a failure
- Without graceful skip: False failures on docs-only PRs

**Impact:** Prevents ~30% false failures on cleanup/docs PRs

---

### A5. Separate Test Commands (Unit vs Integration) 🟡 MEDIUM

**Problem:** All tests run in both unit and integration jobs → duplication, waste

**POC Solution (package.json):**

```json
{
  "scripts": {
    "test:unit": "vitest run --exclude '**/*.integration.test.ts' --exclude '**/rls-security.test.ts'",
    "test:integration": "VITEST_INTEGRATION=true vitest run src/lib/rls-security.test.ts src/hooks/useScriptLock.test.ts"
  }
}
```

**CI Usage:**
- `quality-gates` job: `pnpm test:unit` (local Supabase, fast, all commits)
- `preview-integration-tests` job: `pnpm test:integration` (preview branch, slower, PRs only)

**Why Separate:**
- Unit tests: Fast feedback (~2-3 min)
- Integration tests: Slower, deeper (~8-10 min)
- Don't want integration test slowness in every commit

**File naming convention:**
- Unit: `Header.test.tsx`
- Integration: `rls-security.integration.test.ts`

---

### A6. Failure Debugging (Log Capture) 🟢 LOW

**POC Solution:**

```yaml
- name: Capture Supabase logs on test failure
  if: failure()
  run: |
    echo "=== Supabase Auth Logs ==="
    docker logs supabase_auth_dev 2>&1 | tail -50 || true

    echo "=== Supabase DB Logs ==="
    docker logs supabase_db_dev 2>&1 | tail -50 || true

    echo "=== Supabase Status ==="
    supabase status || true
```

**Why:**
- Transient failures hard to reproduce
- Logs show which service failed
- Speeds debugging from hours → minutes

---

### A7. Seed Data Timing ✅ DOCUMENTED

**Critical Order:**

```yaml
1. npm install              # FIRST - installs @supabase/supabase-js
2. Create test users        # SECOND - needs @supabase/supabase-js
3. Seed baseline data       # THIRD - projects/videos (TRUNCATE safe)
4. Run tests                # FOURTH
```

**Why Order Matters:**
- Test user script imports `@supabase/supabase-js`
- Without npm install first → "Cannot find package" error
- Baseline seed AFTER users → TRUNCATE doesn't delete auth.users

---

## CI Setup Checklist

Before creating `.github/workflows/ci.yml`:

- [ ] Add retry logic with GoTrue health check (A1)
- [ ] Implement environment override strategy (A2)
- [ ] Set Vitest memory limits (maxThreads: 4) (A3)
- [ ] Add preview branch tri-state logic (A4)
- [ ] Create separate test:unit and test:integration commands (A5)
- [ ] Add failure log capture (A6)
- [ ] Verify seed data timing (A7)
- [ ] Test locally with `supabase start` + `pnpm test`

**See Also:** `.coord/test-context/CI-PIPELINE-GAP-ANALYSIS.md` for detailed gap analysis

---

**End of Supabase Test Harness Documentation (Enhanced)**
*Updated: 2025-11-02*
*Pattern: POC copy-editor proven (3 months, 100+ CI runs) + monorepo adapted*
*Critical CI patterns added: 2025-11-02 (Appendix A1-A7)*
