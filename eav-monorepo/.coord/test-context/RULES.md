# Test Infrastructure Rules (Post-It Notes)

**Source:** POC copy-editor proven patterns

**📋 Key Policies:**
- **Extraction Testing:** See `EXTRACTION-TESTING-POLICY.md` for constitutional 3-tier coverage requirement
- **Infrastructure Validation:** See `INFRASTRUCTURE-VALIDATION.md` for smoke test results
- **Supabase Harness:** See `SUPABASE-HARNESS.md` for complete setup guide

---

## File Organization

**Co-locate tests next to source:**
```
src/components/Header.tsx
src/components/Header.test.tsx  ✅
```

**NOT in separate folders:**
```
src/components/Header.tsx
src/__tests__/Header.test.tsx  ❌
```

**Test infrastructure centralized:**
```
packages/shared/src/test/       # Shared utilities
apps/*/src/test/                # App-specific utilities
```

---

## Test Types

**Unit:** `*.test.ts(x)` - Mock Supabase, fast isolation
**Integration:** `*.integration.test.ts(x)` - Real Supabase (local or preview)

**Environment variable controls mock scope:**
```bash
VITEST_INTEGRATION=true  # Real Supabase client
# (unset)                # Mocked Supabase client
```

---

## Supabase Test Environment

**Local (development):**
```bash
supabase start  # Port 54321
# Tests use 127.0.0.1:54321 automatically
```

**CI (GitHub Actions):**
```bash
# Tier 1: Local Supabase (all commits)
supabase db reset --local  # Clean migrations

# Tier 2: Preview Branch (PRs only)
# Auto-created per PR, isolated database
```

---

## Test Users

**Standardized credentials:**
```typescript
admin: admin.test@example.com / test-password-admin-123
client: client.test@example.com / test-password-client-123
unauthorized: unauthorized.test@example.com / test-password-unauth-123
```

**Created via Auth Admin API** (not SQL)
**Rate limit:** 750ms delay between auth operations

---

## TDD Discipline (North Star I7)

**RED → GREEN → REFACTOR**

1. Write failing test FIRST
2. Commit RED state to git
3. Minimal implementation to pass
4. Commit GREEN state to git
5. Refactor while green

**Git evidence required (Conventional Commits format):**
```
git log --oneline
abc123 test(scope): add failing test for X (RED phase)
def456 feat(scope): implement X (GREEN phase)
ghi789 refactor(scope): improve X (REFACTOR phase)
```

---

## Conventional Commits Standard

**Formal adoption across repository** (binding since 2025-11-07)

**Format:** `type(scope): description`

**Types:** feat, fix, test, docs, refactor, chore, ci, style, perf

**Scopes:** Individual apps (copy-editor, scenes-web, etc.), shared, ci, db, deps, types, config

**Key Rules:**
- Use lowercase type (not TEST:, FEAT:)
- Include scope in parentheses: `test(copy-editor):`
- Imperative mood: "add" not "added"
- No period at end
- Max 50 chars for description

**TDD Pattern (Encouraged):**
```
test(scope): Add failing test for X        [RED]
feat(scope): Implement X                    [GREEN]
refactor(scope): Improve X                  [REFACTOR]
```

**Benefits:**
- Git log readability: `git log --oneline | grep feat:` finds all features
- TDD visibility: `test:` commit followed by `feat:` proves RED→GREEN discipline
- Scope clarity: Scope tells which app/package changed
- Standardization: Team consistency across all commits

**Configuration:**
```bash
git config commit.template /Volumes/HestAI-Projects/eav-monorepo/.gitmessage
# Template will auto-display on next git commit
```

**CI Enforcement:**
- Advisory commit linter (non-blocking suggestions)
- Full validation happens via code review + tests
- Human judgment preserved (linter is helper, not gate)

---

## GitGuardian Exclusions

**Paths excluded:**
- `packages/*/src/test/**`
- `apps/*/src/test/**`
- `**/*.test.ts(x)`
- `**/vitest.config.ts`

**Patterns excluded:**
- `test-mock-*` (any test credential prefix)
- `test-project.supabase.co` (test URLs)
- `test-password-*-123` (test user passwords)
- `127.0.0.1:54321` (local Supabase)

**Real credentials NEVER committed** (in .env, gitignored)

---

## CI Pipeline

**Tier 1 (quality-gates) - ALL commits:**
1. Start local Supabase (retry 3x, 300s timeout)
2. Apply migrations: `supabase db reset --local`
3. Create test users via Auth Admin API
4. Seed test data
5. Run: lint → typecheck → test:unit → build

**Tier 2 (preview-integration-tests) - PRs only:**
1. Wait for Supabase Preview Branch ready
2. Export preview environment variables
3. Seed preview database
4. Create test users in preview
5. Run: test:integration

---

## Environment Variables

**Root .env (shared by all apps):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Anon key
- `SUPABASE_SECRET_KEY` - Service role (tests only)
- `VITE_SMARTSUITE_API_KEY` - SmartSuite token
- `VITE_APP_URL_*` - Per-app dev URLs (localhost:3001-3007)

**CI overrides:**
- `SUPABASE_PREVIEW_URL` - Preview branch URL
- `VITEST_INTEGRATION=true` - Enable integration tests

---

## Vitest Configuration

**Shared base config:**
```
packages/shared/src/test/vitest.config.base.ts
```

**Per-app config extends base:**
```typescript
// apps/copy-editor/vitest.config.ts
import baseConfig from '@workspace/shared/test/vitest.config.base'
export default mergeConfig(baseConfig, { /* overrides */ })
```

**Global setup:**
```
packages/shared/src/test/setup.ts
```

---

## Browser API Polyfills (Node test environment)

**Required for Supabase + TipTap:**
- BroadcastChannel (Supabase Auth cross-tab sync)
- window.matchMedia
- ResizeObserver
- IntersectionObserver
- requestAnimationFrame / cancelAnimationFrame

**All polyfills in:** `packages/shared/src/test/setup.ts`

---

## Test Cleanup

**After each test:**
```typescript
afterEach(() => {
  cleanup()           // Clear React components
  vi.clearAllMocks()  // Clear all mocks
})
```

**After all tests:**
```typescript
afterAll(async () => {
  if (isIntegrationTest) {
    await testSupabase.realtime.disconnect()  // Prevent CI hangs
    testSupabase.removeAllChannels()
  }
})
```

---

## Fail-Fast Guards

**Prevent CI misconfiguration:**
```typescript
// Detect hardcoded URLs blocking preview connection
if (process.env.SUPABASE_PREVIEW_URL && SUPABASE_URL.includes('127.0.0.1')) {
  throw new Error('CI MISCONFIGURATION')
}
```

**Result:** Immediate failure instead of 50+ minute CI hangs

---

## Test File Naming

**Simple rule:** Add `.test` before extension
```
Header.tsx       → Header.test.tsx
utils.ts         → utils.test.ts
useScript.ts     → useScript.test.ts
api.integration  → api.integration.test.ts
```

---

## Coverage

**Not a blocking gate** (diagnostic metric)

**Targets:**
- Minimum: 70%
- Aspirational: 80%+
- Critical paths: 90%+ (auth, mutations, RLS)

**Coverage validates tests exist, NOT that tests are good**

---

## Migration Testing

**EMERGENCY FIX (2025-10-26):**
Use `supabase db reset --local` (NOT `db push`)

**Reason:** Complex trigger functions fail with `db push`
**Result:** Clean migration application including function replacements

---

## Supabase Preview Branch Integration

**Auto-created per PR when:**
- Migrations exist in `supabase/migrations/`
- Schema changes detected

**Skipped when:**
- No schema changes (docs/config-only PRs)
- Post-merge cleanup

**CI handles gracefully:**
```yaml
if ! preview_exists; then
  echo "No preview - skipping integration tests"
  exit 0  # Graceful skip, not failure
fi
```

---

## Test Data Factories

**Centralized factories:**
```
packages/shared/src/test/factories.ts  # Shared entities
apps/*/src/test/factories.ts           # App-specific
```

**Deterministic IDs:**
```typescript
beforeEach(() => resetFactoryIds())  # Consistent test data
```

---

## SmartSuite Test Configuration

**Separate test workspace** (optional)
**Or use production with test data tagging**

**Test table IDs in .env:**
```
TEST_SMARTSUITE_PROJECTS_TABLE=test_proj_id
TEST_SMARTSUITE_VIDEOS_TABLE=test_vid_id
```

---

## Port Assignments (Development)

```
copy-editor:       3001
scenes-web:        3002
data-entry-web:    3003
vo-web:            3004
cam-op-pwa:        3005
edit-web:          3006
translations-web:  3007
```

**Supabase local:** 54321
**Supabase Studio:** 54323

---

## TRACED Protocol (Quality Gates)

**Required evidence:**
- **T**est first (RED commit before GREEN)
- **R**eview (code-review-specialist)
- **A**rchitecture (critical-engineer validates)
- **C**onsult (domain specialists)
- **E**nforcement (lint + typecheck + test all pass)
- **D**ocument (TodoWrite + atomic commits)

---

**End of Rules**
*Updated: 2025-11-02*
*Source: POC copy-editor + monorepo adaptation*
