# Database Development Workflow

**Last Updated:** 2025-11-02
**Status:** Active

---

## Overview

This document describes the database development workflow for the EAV monorepo, covering local development with Supabase, migration management, and synchronization with production.

---

## Quick Reference

```bash
# Morning: Start fresh (30-60 sec, once per session)
supabase start
supabase db reset --local

# Development: Work all day without resetting
npm run dev                    # ← No reset needed
npm test                       # ← No reset needed
git commit                     # ← No reset needed

# New migration: Quick push (5-10 sec)
supabase db push --local       # ← No reset needed

# Branch switching: Reset when migrations differ
git checkout feature/branch
supabase db reset --local     # ← Clean slate for new migrations
```

---

## Current State (2025-11-02)

### Production Database
```
Project: zbxvjyrbkycbfhwmmnmy (copy-editor)
Migrations Applied: 1
└── 20251102000000_production_baseline_schema (83KB)

Schemas: public, auth, storage, realtime, vault, extensions, graphql, net
Status: Clean, synchronized with local
```

### Local Development
```
Docker: Supabase local stack (ports 54321-54324)
Migrations: supabase/migrations/20251102000000_production_baseline_schema.sql
Status: Synchronized with production
```

---

## Database Workflow Patterns

### Pattern 1: Daily Development (No Reset Needed)

**Use Case:** Normal feature development, testing, committing code

```bash
# Start once in the morning
supabase start
supabase db reset --local  # ← 30-60 seconds, once per session

# Then work all day:
npm run dev
# Make changes
npm test
# More changes
git commit
# Rinse and repeat - NO database reset needed
```

**Why no reset?**
- Database state is ephemeral
- Tests use fixtures/harnesses (not manual data)
- TDD approach: tests manage their own data
- Reset only needed when migrations change

---

### Pattern 2: New Migration Development

**Use Case:** Creating new migrations, testing migration logic

```bash
# Create new migration
supabase migration new add_analytics_table

# Edit migration file
code supabase/migrations/20251102120000_add_analytics_table.sql

# Apply migration incrementally (fast, preserves data)
supabase db push --local  # ← 5-10 seconds

# Verify it worked
npm test

# If migration needs changes, edit and re-push
supabase db push --local

# When satisfied, validate clean application
supabase db reset --local  # ← Proves migration works from scratch
```

---

### Pattern 3: Branch Switching

**Use Case:** Switching between branches with different migrations

```bash
# On main branch
git checkout feature/new-schema

# If branch has different migrations, reset
supabase db reset --local  # ← Clean slate for feature branch migrations

# Work on feature
npm run dev

# Switch back to main
git checkout main
supabase db reset --local  # ← Back to main's migrations
```

---

### Pattern 4: Production Sync

**Use Case:** Pull production changes, verify local matches production

```bash
# Check migration status
supabase migration list

# Expected output:
# Local          | Remote         | Time (UTC)
# ---------------|----------------|---------------------
#  20251102000000 | 20251102000000 | 2025-11-02 00:00:00

# If out of sync, reset to production state
supabase db reset --local
```

---

## Migration Management

### Creating Migrations

**ADR-003 Compliance: Backwards-Compatible Additive Pattern**

```sql
-- ✓ GOOD: Additive changes
ALTER TABLE projects ADD COLUMN analytics_enabled BOOLEAN DEFAULT false;
CREATE INDEX idx_projects_analytics ON projects(analytics_enabled);

-- ✗ BAD: Breaking changes without deprecation
ALTER TABLE projects DROP COLUMN old_field;
ALTER TABLE projects ALTER COLUMN name TYPE VARCHAR(50);  -- shrinking size
```

**Migration Template:**
```sql
-- ==================================================
-- Migration: [Description]
-- Created: YYYY-MM-DD
-- Type: [SCHEMA|DATA|SECURITY|PERFORMANCE]
-- ==================================================

-- Changes
[Your DDL/DML here]

-- Validation
DO $$
BEGIN
  -- Verify changes applied correctly
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'your_table'
                 AND column_name = 'your_column') THEN
    RAISE EXCEPTION 'Migration validation failed';
  END IF;

  RAISE NOTICE '✓ Migration applied successfully';
END $$;
```

### Applying Migrations

**Development (Local):**
```bash
# Incremental (fast, preserves data)
supabase db push --local

# Clean application (validates from scratch)
supabase db reset --local
```

**Production:**
```bash
# Via MCP tool (recommended)
# supabase-expert uses: mcp__supabase__apply_migration

# Via CLI (alternative)
supabase db push
```

---

## TDD Integration

### Test Data Management

**Philosophy:** Tests are self-contained and manage their own data.

```typescript
// ✓ GOOD: Test creates its own data
describe('Projects API', () => {
  let testProject: Project;

  beforeEach(async () => {
    // Create test data
    testProject = await createTestProject({
      name: 'Test Project',
      client: 'Test Client'
    });
  });

  afterEach(async () => {
    // Clean up test data
    await deleteTestProject(testProject.id);
  });

  it('should fetch project', async () => {
    const result = await fetchProject(testProject.id);
    expect(result).toEqual(testProject);
  });
});

// ✗ BAD: Test relies on manual database state
it('should fetch project', async () => {
  const result = await fetchProject('abc-123'); // Assumes this exists!
  expect(result.name).toBe('My Project');
});
```

### Database Reset Philosophy

**From Test Infrastructure Steward:**
> "Local database should be ephemeral. Tests manage their own fixtures. Reset gives you confidence that migrations work from scratch, which is what CI/CD will do."

**Reset Frequency:**
- ✓ **Morning:** Once when starting work
- ✓ **Branch switch:** When migrations differ
- ✓ **Migration validation:** After creating migrations
- ✗ **NOT** after every test run
- ✗ **NOT** after every code change

---

## Troubleshooting

### "Schema does not exist" Error

**Symptom:**
```
ERROR: schema "hub" does not exist
```

**Cause:** Migration references schema that doesn't exist in baseline

**Solution:**
1. Check if schema is test data (should be deleted)
2. Or add schema creation to baseline/migration
3. Run `supabase db reset --local` after fix

---

### "Migration history mismatch" Error

**Symptom:**
```
The remote database's migration history does not match local files
```

**Cause:** Local migrations differ from production

**Solution:**
```bash
# View migration status
supabase migration list

# If migrations are correct locally, repair remote
supabase migration repair --status reverted [MIGRATION_VERSION]

# Or reset local to match remote
supabase db reset --local
```

---

### Test Data Pollution

**Symptom:** Tests pass locally but fail in CI

**Cause:** Tests depend on manual database state

**Solution:**
1. Refactor tests to use fixtures/factories
2. Add `beforeEach` setup and `afterEach` cleanup
3. Verify tests pass after `supabase db reset --local`

---

## CI/CD Integration

**GitHub Actions Example:**

```yaml
name: Test Migrations

on: [pull_request]

jobs:
  test-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Start Supabase
        run: supabase start

      - name: Test migrations with reset
        run: supabase db reset --local

      - name: Run tests
        run: npm test
```

---

## Security & Performance

### Security Warnings (Current: 4)

**Low Priority (Defer to major upgrade):**
- 3x Extensions in public schema (`citext`, `moddatetime`, `pg_jsonschema`)
  - Risk: Minor namespace pollution
  - Fix: Requires downtime to move to extensions schema

**Configuration (5 min fix):**
- 1x Leaked password protection disabled
  - Fix: Supabase Dashboard → Auth → Password Settings → Enable HaveIBeenPwned

### Performance Monitoring

```bash
# Check for security issues
supabase get-advisors --type security

# Check for performance issues
supabase get-advisors --type performance
```

---

## Best Practices

### ✓ DO

- Reset database once in morning, work all day
- Use test fixtures instead of manual data
- Create migrations for all schema changes
- Validate migrations with `db reset --local`
- Follow ADR-003 backwards-compatible pattern
- Use `IF NOT EXISTS` for idempotent migrations

### ✗ DON'T

- Reset database after every test
- Rely on manual test data
- Make breaking schema changes without deprecation
- Skip migration validation
- Modify production database directly
- Create test schemas without cleanup plan

---

## Configuration Reference

### Local Supabase URLs

```bash
API URL:      http://127.0.0.1:54321
Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL:   http://127.0.0.1:54323
Mailpit URL:  http://127.0.0.1:54324
```

### Connection Strings

```bash
# Local development
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Production (from environment)
DATABASE_URL="postgresql://postgres:[SUPABASE_DB_PASSWORD]@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
```

---

## Migration History

### Current Baseline
```
20251102000000_production_baseline_schema.sql (83KB)
- Consolidated production schema as of 2025-11-02
- Includes: public schema (12 tables, 2 views, 50+ functions)
- Clean baseline for monorepo development
```

### Removed Migrations
```
20251102012716_fix_function_search_path_security
- Removed: Referenced test schema (hub) that was deleted
- Note: Real search_path security issues would need new migration

20251024180000 through 20251031201059 (8 migrations)
- Removed: Divergent migration history from pre-monorepo consolidation
- Consolidated into baseline migration
```

---

## Additional Resources

- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [Migration Best Practices](https://supabase.com/docs/guides/database/migrations)
- [ADR-003: Schema Migration Governance](../../.coord/../../docs/decisions/ADR-003-schema-migration-governance.md)
- [Test Infrastructure Steward Guidance](../../.coord/apps/copy-editor/APP-CONTEXT.md)

---

## Questions?

For database questions, consult:
- **Migration Issues:** supabase-expert (via `/role supabase expert`)
- **Test Infrastructure:** Test Infrastructure Steward
- **Security Concerns:** critical-engineer (BLOCKING authority for AUTH_DOMAIN)

---

**Document Status:** Active
**Next Review:** When adding first post-baseline migration
**Owner:** Database Team / DevOps
