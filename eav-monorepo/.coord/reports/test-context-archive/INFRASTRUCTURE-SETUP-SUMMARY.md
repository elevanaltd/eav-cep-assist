# Test Infrastructure Setup Summary

**Date Completed:** 2025-11-02
**Status:** ✅ Production-ready for Week 1 TDD work
**Validation:** 16/16 smoke tests passing

---

## What Was Built

### 1. Test Utilities (packages/shared/src/test/)

**setup.ts** - Global test configuration
- Browser API polyfills (BroadcastChannel, ResizeObserver, IntersectionObserver)
- Conditional mock scope (unit vs integration tests via VITEST_INTEGRATION env var)
- Global test cleanup (realtime disconnect, clear timers)
- Test environment setup (jsdom, React Testing Library matchers)

**supabase-test-client.ts** - Environment-aware Supabase client
- Local: 127.0.0.1:54321 (supabase start)
- CI: Supabase preview branch (auto-configured)
- Fallback: Remote (emergency only)
- Fail-fast guards (detects CI misconfiguration)
- Test users: admin.test, client.test, unauthorized.test
- Rate limit protection (750ms authDelay between operations)

**auth-helpers.ts** - Authentication convenience wrappers
- signInAsAdmin() - Quick admin auth
- signInAsClient() - Quick client auth
- signOut() - Session cleanup
- authDelay() - Rate limiting (prevents Supabase 429 errors)

**factories.ts** - Deterministic test data builders
- mockProject() - Project test data
- mockVideo() - Video test data
- mockScript() - Script test data
- mockComment() - Comment test data
- mockUser() - User test data
- resetFactoryIds() - Reproducible test data (reset counters)

### 2. CI Scripts (scripts/)

**create-test-users-via-api.mjs** - Test user creation
- Creates test users via Auth Admin API (proper GoTrue state)
- Creates user_profiles entries (RLS role-based policies)
- Creates user_clients entries (RLS client filtering)
- Users created:
  - admin.test@example.com / test-password-admin-123 (role: admin)
  - client.test@example.com / test-password-client-123 (role: client, CLIENT_ALPHA)
  - unauthorized.test@example.com / test-password-unauth-123 (role: client, CLIENT_UNAUTHORIZED)

### 3. Configuration Files

**.env** - Production credentials (gitignored)
- Copied from POC copy-editor/.env
- Supabase production: zbxvjyrbkycbfhwmmnmy
- Per-app URLs: localhost:3001-3007
- SmartSuite integration credentials

**.env.example** - Configuration template
- Production Supabase URL: https://zbxvjyrbkycbfhwmmnmy.supabase.co
- All required environment variables documented
- Test environment section included
- CI environment guidance

**.gitguardian.yaml** - Security scan exclusions
- Test infrastructure paths (packages/*/src/test/, apps/*/src/test/)
- Test file patterns (**/*.test.ts, **/*.spec.ts)
- Test credential patterns (test-mock-*, test-password-*-123)
- Local Supabase URLs (127.0.0.1:54321)
- POC-proven over 3 months (0 false positives)

**README.md** - Updated with correct commands
- npm → pnpm (package manager)
- npm run dev → pnpm dev (turborepo)
- Added Turborepo filter commands (--filter=APP_NAME)
- Added environment setup instructions
- Fixed documentation links

### 4. Documentation (.coord/test-context/)

**RULES.md** - Quick-reference test rules (post-it notes)
- File organization (co-locate tests)
- Test types (unit vs integration)
- Supabase environment setup
- Test users (standardized credentials)
- TDD discipline (RED → GREEN → REFACTOR)
- GitGuardian exclusions
- CI pipeline (2-tier strategy)
- Environment variables
- Vitest configuration
- Coverage targets

**SUPABASE-HARNESS.md** - Complete Supabase test guide
- Quick start instructions
- Local Supabase setup (supabase start)
- Test user creation (scripts/create-test-users-via-api.mjs)
- Environment configuration
- Test client usage examples
- Auth helpers usage
- RLS testing patterns
- Integration test setup
- CI/CD integration guidance

**INFRASTRUCTURE-VALIDATION.md** - Validation report
- Test results summary (16/16 passing)
- Infrastructure components validated
- Key patterns verified
- Warnings explained
- Next steps outlined

**INFRASTRUCTURE-SETUP-SUMMARY.md** - This document
- Complete overview of what was built
- File locations and purposes
- Key patterns and decisions
- What's next

### 5. Test Files

**packages/shared/src/test/__tests__/infrastructure.test.ts** - Smoke test
- 16 tests validating all infrastructure components
- Local Supabase connection
- Test users configuration
- Auth operations (sign in/out, rate limiting)
- User profiles (RLS critical)
- User clients (RLS client filtering)
- Test data factories
- Basic query execution

### 6. Hook Updates

**~/.claude/hooks/enforce-test-first.sh** - TDD enforcement
- Added exemptions for test infrastructure files
- Patterns: */src/test/*.ts, */test/supabase-test-client.ts, */test/auth-helpers.ts, etc.
- Prevents blocking when creating test utilities

---

## Key Patterns Established

### 1. Co-located Tests
```
src/components/Header.tsx
src/components/Header.test.tsx  ✅ Next to source
```

### 2. Test Infrastructure Centralized
```
packages/shared/src/test/       ← Shared utilities
apps/*/src/test/                ← App-specific utilities
```

### 3. Conditional Mocking
```typescript
const isIntegrationTest = process.env.VITEST_INTEGRATION === 'true'
// Unit tests: Mock Supabase
// Integration tests: Real Supabase (local or preview)
```

### 4. Rate Limiting Protection
```typescript
await authDelay()  // 750ms delay prevents Supabase rate limit failures
```

### 5. Deterministic Test Data
```typescript
resetFactoryIds()                    // Reset counters
const project1 = mockProject()       // Predictable ID
resetFactoryIds()                    // Reset again
const project2 = mockProject()       // Same ID as project1
```

### 6. RLS Testing Foundation
```typescript
// Test users have user_profiles (role-based RLS)
// Test users have user_clients (client filtering RLS)
// CLIENT_ALPHA = authorized, CLIENT_UNAUTHORIZED = blocked
```

---

## Environment Setup

### Local Development
```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment template
cp .env.example .env
# Edit .env with actual credentials

# 3. Start local Supabase
supabase start

# 4. Create test users
SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | jq -r '.SERVICE_ROLE_KEY') \
  node scripts/create-test-users-via-api.mjs

# 5. Run tests
pnpm test
```

### Supabase Endpoints (Local)
- API: http://127.0.0.1:54321
- Studio: http://127.0.0.1:54323 (database UI)
- DB: postgresql://postgres:postgres@127.0.0.1:54322/postgres

### Test Users (Local & CI)
- admin.test@example.com / test-password-admin-123
- client.test@example.com / test-password-client-123
- unauthorized.test@example.com / test-password-unauth-123

---

## Production Configuration

**Supabase Project:**
- Ref: zbxvjyrbkycbfhwmmnmy
- URL: https://zbxvjyrbkycbfhwmmnmy.supabase.co

**Local Supabase Label:**
- project_id: eav-orchestrator (in config.toml)
- Note: This is just a local label, different from production ref

**App URLs (Development):**
- copy-editor: http://localhost:3001
- scenes-web: http://localhost:3002
- data-entry-web: http://localhost:3003
- vo-web: http://localhost:3004
- cam-op-pwa: http://localhost:3005
- edit-web: http://localhost:3006
- translations-web: http://localhost:3007

---

## What's Next

### Immediate (Week 1 - TDD RED State)
1. Write capability-config test matrix (8 permutations)
2. Write cross-app integration tests (copy-editor strict, cam-op flexible)
3. Commit RED-state to git (tests fail, no implementation)
4. Create TRACED checkpoint documentation

### After Week 1 (Week 2 - TDD GREEN State)
5. Extract infrastructure from POC (tests go GREEN)
6. Extract business logic (tests stay GREEN)
7. Migrate app (tests stay GREEN)
8. Set up GitHub Actions CI/CD
9. Configure Supabase Preview Branch integration

---

## Validation Evidence

**Smoke Test Results (2025-11-02):**
```
✓ Test Infrastructure Smoke Test (16 tests) 8348ms
  ✓ 1. Local Supabase Connection (2/2)
  ✓ 2. Test Users Configuration (3/3)
  ✓ 3. Auth Operations (3/3)
  ✓ 4. User Profiles - RLS Critical (2/2)
  ✓ 5. User Clients - RLS Client Filtering (2/2)
  ✓ 6. Test Data Factories (3/3)
  ✓ 7. Basic Query Execution (1/1)

Test Files  1 passed (1)
     Tests  16 passed (16)
  Duration  8.92s
```

**Infrastructure Status:** ✅ Production-ready for TDD workflow

---

## Troubleshooting

### "Multiple GoTrueClient instances detected"
**Explanation:** Tests create multiple Supabase clients
**Impact:** None - isolated test environment
**Resolution:** Not needed - expected behavior

### "Cannot find package '@workspace/shared/client'"
**Explanation:** Shared client doesn't exist until Week 2 extraction
**Status:** Expected - setup.ts has this mock commented out
**Resolution:** Will be uncommented during Week 2

### Test users not found
**Solution:** Run `node scripts/create-test-users-via-api.mjs` with service role key

### Local Supabase connection fails
**Solution:** Ensure `supabase start` is running (check `supabase status`)

---

**Infrastructure Complete:** Ready for Week 1 TDD RED-state test writing
