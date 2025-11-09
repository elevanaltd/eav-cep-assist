# CI Pipeline Configuration (Post-It Notes)

**Source:** POC copy-editor proven patterns + monorepo optimization
**Authority:** test-infrastructure-steward (CI_PIPELINE_CONFIGURATION domain)

**📋 Key References:**
- **Primary Source:** `.github/workflows/ci.yml` (Tier 1 + Tier 2 strategy)
- **POC Reference:** `/Volumes/HestAI-Projects/eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml`

---

## CI Strategy (Two-Tier Architecture)

**Tier 1: Quality Gates (ALL commits)**
- Triggers: All pushes to main + all PRs (with paths-ignore optimization)
- Runs: Local Supabase → Migrations → Test users → Lint → TypeCheck → Test:Unit → Build → Test:Integration
- Purpose: Validate code quality and functional correctness
- Duration: ~8-10 minutes (with Supabase infrastructure)

**Tier 2: Preview Integration (PRs only)**
- Triggers: Pull requests with functional code changes (auto-detected)
- Runs: Preview branch tests against deployed Supabase preview
- Purpose: Validate against production-like environment
- Duration: ~5-7 minutes (no local Supabase overhead)

---

## Paths-Ignore Optimization (2025-11-04)

**Problem:** Documentation-only commits trigger full CI pipeline (~8-10 minutes) unnecessarily.

**Solution:** Skip CI when ONLY documentation files are modified.

**Constitutional Principle:** COMPLETION_THROUGH_SUBTRACTION - "Minimal test configuration achieves maximum reliability"

### Safe to Skip (Cannot Break Tests)

```yaml
paths-ignore:
  - '**.md'                    # All Markdown documentation
  - '.coord/**'                # Coordination docs (ephemeral scaffolding)
  - 'docs/**'                  # Documentation directory
  - '.github/**/*.md'          # Workflow documentation
  - '.vscode/**'               # Editor configuration
  - '.editorconfig'            # Editor config
```

**Rationale:** These files cannot affect:
- TypeScript compilation (no code changed)
- ESLint rules (no code changed)
- Unit tests (no implementation changed)
- Integration tests (no database/API logic changed)
- Build output (no source files changed)

### MUST NEVER Skip (Affects Quality Gates)

**Dependencies:**
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`

**Build Configuration:**
- `tsconfig.json`, `tsconfig.*.json`
- `vite.config.ts`, `vitest.config.ts`
- `turbo.json`, `package.json` (scripts)

**Linting:**
- `eslint.config.js`, `.eslintrc.*`, `.eslintignore`

**Test Infrastructure:**
- `vitest.config.ts`, `vitest.*.config.ts`
- `.github/workflows/*.yml` (CI configuration itself)

**Code:**
- Any `.ts`, `.tsx`, `.js`, `.jsx` files (source code)
- Any `.sql` files (database migrations)

### Implementation

**Location:** `.github/workflows/ci.yml:3-23`

```yaml
on:
  push:
    branches:
      - main
    paths-ignore:
      - '**.md'
      - '.coord/**'
      - 'docs/**'
      - '.github/**/*.md'
      - '.vscode/**'
      - '.editorconfig'
  pull_request:
    branches:
      - main
    paths-ignore:
      - '**.md'
      - '.coord/**'
      - 'docs/**'
      - '.github/**/*.md'
      - '.vscode/**'
      - '.editorconfig'
```

### Verification Procedure

**Test 1: Documentation-only commit SHOULD skip CI**
```bash
# Make trivial doc change
echo "<!-- Test comment -->" >> CLAUDE.md
git add CLAUDE.md
git commit -m "docs: test CI skip"
git push

# Expected: No CI workflow triggered on GitHub Actions
```

**Test 2: Code change MUST trigger CI**
```bash
# Make trivial code change
echo "// Test comment" >> src/index.ts
git add src/index.ts
git commit -m "feat: test CI trigger"
git push

# Expected: CI workflow runs full quality gates
```

**Test 3: Mixed changes MUST trigger CI** (safety check)
```bash
# Change both doc AND code
echo "<!-- Test -->" >> README.md
echo "// Test" >> src/index.ts
git add .
git commit -m "feat: mixed changes"
git push

# Expected: CI workflow runs (code change takes precedence)
```

### Validation Theater Check

**Q:** Does this create validation theater (skipping tests that should run)?
**A:** NO - Documentation changes cannot break:
- TypeScript compilation (no code changed)
- ESLint rules (no code changed)
- Unit tests (no implementation changed)
- Integration tests (no database/API logic changed)

**ARGUS Vigilance:** Monitored patterns remain intact - all code changes trigger full quality gates.

**THEMIS Justice:** Same rules apply to all developers - everyone's doc changes skip CI consistently.

---

## Quality Gate Sequence

**Enforced Order (from turbo.json):**
```
typecheck → lint → test → build
```

**Critical:** Build runs BEFORE typecheck in monorepo CI (line 168-172)
**Reason:** TypeScript needs `@workspace/shared/dist/` for barrel exports

---

## Environment Variables

**Local Development:**
```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<from supabase status>
```

**CI Override (lines 108-122):**
```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=$(supabase status -o json | jq -r '.ANON_KEY')
```

**Integration Test Flag:**
```bash
VITEST_INTEGRATION=true  # Real Supabase client
# (unset)                # Mocked Supabase client
```

---

## Retry Logic (Supabase Start)

**Pattern:** 3 attempts, 300s timeout, GoTrue health check (lines 52-102)

**Why:** Handles transient Docker/network failures in CI

**Implementation:**
```bash
MAX_ATTEMPTS=3
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  supabase stop --no-backup || true  # Cleanup
  timeout 300 supabase start

  # CRITICAL: Wait for GoTrue health check
  timeout 60 bash -c 'until curl -f http://127.0.0.1:54321/auth/v1/health; do
    sleep 2;
  done'

  if [ $? -eq 0 ]; then break; fi
  ATTEMPT=$((ATTEMPT + 1))
done
```

---

## Database Setup Sequence

**Critical Order (lines 126-161):**
1. `supabase db reset --local` (NOT `db push` - complex triggers fail)
2. Create test users via Auth Admin API (needs auth.users table)
3. Seed baseline data (AFTER users - TRUNCATE safety)

**Why Order Matters:**
- `db reset` applies ALL migrations atomically (safer than `db push`)
- Test users MUST exist BEFORE seed.sql (foreign key constraints)
- seed.sql uses `TRUNCATE ... CASCADE` (safe for public.* tables, preserves auth.users)

---

## Preview Branch Integration (Tier 2)

**Graceful Skip Pattern (lines 309-390):**

**State 1: Functional changes detected → Check preview exists**
```bash
git diff --name-only | grep -E "^(src|lib)/.*\.(ts|tsx)$"
# If no functional changes → Skip integration tests (docs-only PR)
```

**State 2: Preview branch exists → Run integration tests**
```bash
supabase branches list | grep "pr-123"
# If preview exists → Export URL and run tests
```

**State 3: No preview branch → Skip gracefully (NOT failure)**
```bash
# Reason: No schema changes detected
# Action: Skip integration tests (tri-state: SKIPPED, not FAILED)
```

---

## Failure Debugging

**Capture Supabase logs on failure (lines 254-266):**
```bash
docker logs supabase_auth_dev 2>&1
docker logs supabase_db_dev 2>&1
supabase status
```

**Purpose:** Diagnose auth/database failures without re-running CI

---

## Constitutional Compliance

**TRACED Protocol:**
- **T:** Test-first (RED→GREEN→REFACTOR) - enforced via quality gates
- **R:** Code review (specialist consultation) - GitHub PR reviews
- **A:** Architecture decisions (critical-engineer) - escalation on failures
- **C:** Consult specialists (domain triggers) - test-methodology-guardian for TDD
- **E:** Quality gates (ALL must pass) - lint + typecheck + test + build
- **D:** TodoWrite + atomic commits - enforced via git discipline

**North Star Alignment:**
- **I7:** TDD RED discipline - tests run in CI BEFORE code reaches production
- **I8:** Production-grade quality - zero-error tolerance (lint, typecheck)

---

## Agent Consultation

**When to Escalate:**
- CI failures blocking PRs → critical-engineer (production risk assessment)
- TDD workflow violations → test-methodology-guardian (RED→GREEN→REFACTOR compliance)
- Test harness architecture → technical-architect (shared utilities structure)

---

## Resource Impact

**Before paths-ignore optimization:**
- Documentation commit: ~8-10 minutes (full Supabase + quality gates)
- Code commit: ~8-10 minutes (same)

**After paths-ignore optimization:**
- Documentation commit: 0 minutes (CI skipped entirely)
- Code commit: ~8-10 minutes (unchanged - full quality gates)

**Estimated savings:** 30-50 minutes per week (assumes 5-7 doc commits/week)

---

**Last Updated:** 2025-11-04 (test-infrastructure-steward)
**Authority:** ACCOUNTABLE for CI_PIPELINE_CONFIGURATION domain
**Pattern:** POC-proven (lines 309-332) + COMPLETION_THROUGH_SUBTRACTION principle
