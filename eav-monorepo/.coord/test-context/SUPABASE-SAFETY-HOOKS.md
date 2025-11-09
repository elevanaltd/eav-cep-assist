# Supabase Safety Hooks Architecture

**Version:** 1.0.0
**Created:** 2025-11-07
**Authority:** supabase-expert + skills-expert validation
**Status:** Production

---

## Executive Summary

This document describes the Supabase MCP safety enforcement system that prevents data loss, state divergence, and ADR-003 violations when AI agents interact with the database through MCP tools.

**Architecture:** Three-tier safety system (Hook → Skill → Protocol) with blocking enforcement at the boundary and advisory recovery through skill guidance.

---

## Problem Statement

### Risk: AI-Driven Database Operations

Without enforcement, AI agents can:
- Apply migrations without local files (prevents version control tracking)
- Execute destructive operations without deprecation cycles
- Create split-brain state (local/remote divergence)
- Bypass migration tracking via `execute_sql` DDL operations
- Lock production tables with non-concurrent index creation

**Industry Evidence:**
> "Most migration failures happen in the 11th hour" - early detection is critical for success.

**Supabase Best Practice:**
> "Highly recommended: turn on 'required check' for Supabase integration, which prevents PRs from being merged when migration checks fail."

This safety system implements the "required check" pattern for AI coding environments.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ TIER 1: PreToolUse Hook (supabase_migration_guard)                 │
│ Authority: BLOCKING (exit code 2)                                  │
│ Function: Intercept MCP tool calls, validate safety, block if fail │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
                    [PASS] → MCP tool executes
                    [FAIL] → Block + error message
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│ TIER 2: Skill (supabase-operations)                                │
│ Authority: ADVISORY                                                 │
│ Function: Provide guidance, checklists, recovery workflows         │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
                    Claude follows guidance → Corrects issue → Retries
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│ TIER 3: Protocol (SUPABASE-EMERGENCY-PROCEDURES.md)               │
│ Authority: REFERENCE                                                │
│ Function: Document emergency procedures, rollback workflows        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### TIER 1: PreToolUse Hook

**Location:** `.claude/hooks/pre_tool_use/supabase_migration_guard.sh`

**Configuration:** `.claude/hooks/pre_tool_use/supabase_migration_guard.yaml`
```yaml
matchers:
  - mcp__supabase__apply_migration
  - mcp__supabase__execute_sql
```

**Execution Flow:**

1. Claude attempts to use `mcp__supabase__apply_migration` or `mcp__supabase__execute_sql`
2. Hook intercepts BEFORE MCP tool execution
3. Hook performs validation checks
4. Hook returns:
   - Exit 0 → Pass to MCP tool
   - Exit 2 → Block with error message to Claude

**Validation Checks:**

#### For `apply_migration`:

1. **Local file existence** (BLOCKING)
   - Verify `supabase/migrations/[name].sql` exists
   - Block if missing: *"Create and commit the migration file first"*

2. **Git commit status** (BLOCKING)
   - Verify file is committed (not just staged or dirty)
   - Block if uncommitted: *"Migration file must be committed to git first"*

3. **Migration naming convention** (BLOCKING)
   - Format: `YYYYMMDDHHMMSS_description.sql`
   - Block if invalid: *"Must follow: YYYYMMDDHHMMSS_description.sql"*

4. **State sync validation** (BLOCKING)
   - Call `supabase migration list --project-ref zbxvjyrbkycbfhwmmnmy`
   - Compare local vs remote migrations
   - Block if divergence: *"State divergence detected: Remote has [X] not in local"*
   - Block if CLI unavailable: *"Install Supabase CLI to verify migration state sync"*

5. **ADR-003 destructive pattern detection** (BLOCKING)
   - Scan for: DROP TABLE, DROP COLUMN, TRUNCATE, ALTER TYPE, RENAME, DELETE WHERE, ALTER NOT NULL, ALTER DROP DEFAULT
   - Check for SAFETY_OVERRIDE comment
   - Block if destructive without override: *"Destructive operation requires SAFETY_OVERRIDE comment"*
   - Warn if override present: *"Proceeding with forced operation - ensure approval and backup exists"*

6. **Concurrent operation safety** (BLOCKING)
   - Detect `CREATE INDEX` without `CONCURRENTLY`
   - Block: *"CREATE INDEX must use CONCURRENTLY to avoid table locks"*

7. **Transaction safety** (ADVISORY)
   - Warn if missing BEGIN/COMMIT
   - Non-blocking: *"Consider wrapping DDL in transaction for atomic rollback"*

8. **Description comment** (ADVISORY)
   - Warn if missing `-- Migration:` comment
   - Non-blocking: *"Add: -- Migration: [description]"*

#### For `execute_sql`:

1. **DDL operation blocking** (BLOCKING)
   - Detect CREATE, ALTER, DROP, TRUNCATE at start of SQL
   - Block all DDL: *"DDL operations must use apply_migration, not execute_sql"*
   - Rationale: Migration tracking, rollback capability, version control, violates I12

2. **Dangerous DML patterns** (ADVISORY)
   - Warn on DELETE without WHERE: *"Deletes ALL rows"*
   - Warn on UPDATE without WHERE: *"Updates ALL rows"*
   - Non-blocking warnings only

**Performance:**
- Hook execution: ~2-3 seconds total
  - File checks: <100ms
  - Git operations: <500ms
  - Supabase CLI state sync: ~1-2s
  - Pattern matching: <100ms
- Acceptable overhead (migration application itself takes 5-30s)

---

### TIER 2: Skill (supabase-operations)

**Location:** `.claude/skills/supabase-operations/SKILL.md`

**Function:** Advisory guidance and recovery workflows

**Updated Description:**
> "Supabase operational knowledge enforcing safety checks via PreToolUse hooks. Use when migration blocked by safety hooks, validating database migrations..."

**Key Triggers:**
- "migration blocked"
- "safety hook error"
- "migration validation"
- "ADR-003"
- "state sync"

**Integration with Hook:**

1. Hook blocks operation → Error message references skill
2. Claude sees: *"CONSULT: Invoke supabase-operations skill for proper workflow"*
3. Claude invokes skill → Skill provides 7-step migration workflow
4. Claude follows guidance → Corrects issue → Retries operation
5. Hook validates again → Passes → MCP tool executes

**Provides:**
- 7-step migration workflow (migration-protocols.md)
- State tracking procedures (state-tracking.md)
- ADR-003 compliance checklist (adr-003-compliance.md)
- RLS optimization patterns (rls-optimization.md)
- MCP tool benchmarks (mcp-benchmarks.md)

**Tool Restrictions:**
- Read-only: `Read`, `list_tables`, `list_extensions`, `list_migrations`, `get_advisors`
- Cannot perform write operations (enforced by Claude Code)
- Hook enforces writes, skill guides through proper workflow

---

### TIER 3: Protocol (Emergency Procedures)

**Location:** `.claude/protocols/SUPABASE-EMERGENCY-PROCEDURES.md`

**Function:** Document emergency overrides and rollback procedures

**Contents:**
- SAFETY_OVERRIDE comment template
- Emergency migration workflow (7 steps)
- Rollback procedures by scenario
- Communication protocol
- Approval matrix
- Prevention guidelines

**When Used:**
- Production incidents requiring immediate intervention
- Data integrity risks in progress
- Security vulnerabilities requiring emergency schema fix
- NOT for "faster" deployments or skipping review

---

## Discovery Mechanisms

### Proactive Discovery

Claude discovers safety system through skill triggers:

```yaml
Triggers on: migration blocked, safety hook error, migration validation,
             RLS patterns, Supabase benchmarks, ADR-003, database state
             tracking, schema governance
```

**Flow:**
1. User asks: "Apply this migration"
2. Claude's skill discovery matches "migration" keyword
3. Claude invokes `supabase-operations` skill proactively
4. Skill guides through proper workflow
5. Hook validates when MCP tool called
6. Operation succeeds on first try (no block needed)

### Reactive Discovery

Claude discovers safety system through hook errors:

```
BLOCKED: Supabase migration safety check failed.
CONSULT: Invoke supabase-operations skill for proper migration workflow.
REASON: Migration file exists but is not committed to git.
```

**Flow:**
1. Claude attempts unsafe operation
2. Hook blocks with structured error message
3. Claude sees "CONSULT: Invoke supabase-operations skill"
4. Claude invokes skill for recovery guidance
5. Claude follows corrective workflow
6. Claude retries operation → Hook passes

---

## Safety Guarantees

### What This System Prevents

✅ **Local file missing:** Cannot apply migration without local file in version control
✅ **Uncommitted changes:** Cannot apply uncommitted migrations (prevents accidental execution)
✅ **State divergence:** Cannot apply when local/remote out of sync (prevents split-brain)
✅ **Destructive operations:** Cannot perform DROP/TRUNCATE without explicit SAFETY_OVERRIDE
✅ **DDL bypass:** Cannot use execute_sql for DDL (enforces migration tracking)
✅ **Table locks:** Cannot create non-concurrent indexes (prevents production locks)
✅ **ADR-003 violations:** Blocks breaking changes without deprecation cycle

### What This System Allows (With Safety)

✅ **Emergency operations:** SAFETY_OVERRIDE pattern with documentation
✅ **DML operations:** execute_sql allowed for SELECT/INSERT/UPDATE/DELETE
✅ **Additive changes:** ADD COLUMN, CREATE INDEX CONCURRENTLY always allowed
✅ **RLS policies:** Policy changes allowed (validated by get_advisors after)

---

## Integration Testing

### Test Scenarios

**Scenario 1: Hook Blocks Uncommitted Migration**

```bash
# Setup
echo "CREATE TABLE test_table (id UUID PRIMARY KEY);" > supabase/migrations/20251107120000_test.sql
# File exists but NOT committed

# Expected: Hook blocks
mcp__supabase__apply_migration(name="20251107120000_test", query="...")

# Result:
# BLOCKED: Migration file exists but is not committed to git
# CONSULT: Invoke supabase-operations skill for proper workflow
```

**Scenario 2: Hook Blocks Destructive Pattern**

```bash
# Setup
cat > supabase/migrations/20251107120000_drop_test.sql <<EOF
DROP TABLE old_table;
EOF
git add supabase/migrations/20251107120000_drop_test.sql
git commit -m "test: drop table"

# Expected: Hook blocks (no SAFETY_OVERRIDE)
mcp__supabase__apply_migration(name="20251107120000_drop_test", query="...")

# Result:
# BLOCKED: Destructive operation detected without SAFETY_OVERRIDE:
#   - Pattern: DROP TABLE
# ADR-003 requires 14-day deprecation cycle
```

**Scenario 3: Hook Passes Valid Migration**

```bash
# Setup
cat > supabase/migrations/20251107120000_add_column.sql <<EOF
ALTER TABLE users ADD COLUMN analytics_enabled BOOLEAN DEFAULT false;
EOF
git add supabase/migrations/20251107120000_add_column.sql
git commit -m "feat: add analytics_enabled column"

# Expected: Hook passes
mcp__supabase__apply_migration(name="20251107120000_add_column", query="...")

# Result: ✓ All safety checks passed - migration executes
```

**Scenario 4: Hook Blocks DDL via execute_sql**

```bash
# Expected: Hook blocks
mcp__supabase__execute_sql(query="CREATE TABLE test (id UUID);")

# Result:
# BLOCKED: DDL operations must use apply_migration, not execute_sql
# REASON: Migration tracking, rollback capability, version control
```

---

## Configuration

### Project-Specific Settings

**Project ID:** `zbxvjyrbkycbfhwmmnmy`
**Migrations Directory:** `supabase/migrations/`
**Skill Name:** `supabase-operations`

**Hardcoded in Hook:**
```bash
PROJECT_ID="zbxvjyrbkycbfhwmmnmy"
MIGRATIONS_DIR="supabase/migrations"
SKILL_NAME="supabase-operations"
```

### Customization Points

**To change project:**
1. Edit `supabase_migration_guard.sh` line 13: `PROJECT_ID="..."`
2. Update state sync validation calls

**To add validation patterns:**
1. Edit `supabase_migration_guard.sh` DESTRUCTIVE_PATTERNS array (line 147)
2. Add new grep pattern to detection logic

**To modify error messages:**
1. Edit `block_with_guidance()` calls in hook
2. Maintain structure: BLOCKED → CONSULT → REASON

---

## Maintenance

### When to Update

**Hook requires updates when:**
- New destructive SQL patterns discovered
- ADR-003 governance rules change
- Supabase CLI changes API
- New project added (multi-project support)

**Skill requires updates when:**
- Migration workflow changes
- New best practices discovered
- RLS optimization patterns evolve
- MCP tool benchmarks change

**Protocol requires updates when:**
- Emergency procedures tested in production
- Rollback procedures refined
- Approval matrix changes

### Version Control

All safety system components are tracked in git:
- `.claude/hooks/` → Hook implementation
- `.claude/skills/supabase-operations/` → Skill guidance
- `.claude/protocols/` → Emergency procedures
- `.coord/test-context/` → This documentation

Changes require:
1. Update component files
2. Test validation with all scenarios
3. Update version numbers in headers
4. Document changes in git commit

---

## Performance Monitoring

### Hook Execution Metrics

**Target:** <3 seconds overhead per validation

**Breakdown:**
- File existence check: <100ms
- Git commit validation: <500ms
- State sync (Supabase CLI): 1-2s
- Pattern scanning: <100ms
- Total: ~2-3s

**Monitoring:**
```bash
# Test hook performance
time .claude/hooks/pre_tool_use/supabase_migration_guard.sh \
  mcp__supabase__apply_migration \
  '{"name":"test_migration","query":"..."}'
```

### Success Rate Tracking

**Metrics to track:**
- Hook blocks per week (should decrease over time as Claude learns)
- SAFETY_OVERRIDE usage (should be rare)
- State divergence incidents (should be zero)
- Emergency procedure invocations (should be minimal)

---

## Related Documentation

- **ADR-003:** Schema Migration Governance
- **.claude/skills/supabase-operations/migration-protocols.md:** 7-step workflow
- **.claude/skills/supabase-operations/state-tracking.md:** Sync validation
- **.claude/protocols/SUPABASE-EMERGENCY-PROCEDURES.md:** Emergency overrides
- **docs/development/102-DOC-DATABASE-WORKFLOW.md:** Database development guide

---

## Expert Validation

This architecture was validated by domain experts:

**supabase-expert (BLOCKING authority):**
- ✅ State sync validation mandatory (split-brain prevention)
- ✅ DDL blocking in execute_sql (I12 compliance)
- ✅ Concurrent operation safety (table lock prevention)
- ✅ Enhanced SAFETY_OVERRIDE pattern
- ✅ Migration naming convention enforcement

**skills-expert (BLOCKING authority):**
- ✅ Hook-skill integration pattern
- ✅ Skill description with hook triggers
- ✅ Structured error messages with skill reference
- ✅ Discovery mechanisms (proactive + reactive)
- ✅ Read-only tool restrictions in skill

**Approval Status:** Approved with all required modifications implemented.

---

## Revision History

| Date | Version | Changes | Authority |
|---|---|---|---|
| 2025-11-07 | 1.0.0 | Initial creation with expert validation | system-steward + supabase-expert + skills-expert |

---

**Constitutional Compliance:**

- **CONSTRAINT_CATALYSIS:** Hook boundaries enable safety → Skill guidance enables recovery
- **THOUGHTFUL_ACTION:** VISION(safety) → CONSTRAINT(hook blocks) → STRUCTURE(skill guides)
- **COMPLETION_THROUGH_SUBTRACTION:** Minimal enforcement at boundary, comprehensive guidance when needed
- **EMERGENT_EXCELLENCE:** System quality emerges from hook+skill+protocol interactions
- **HUMAN_PRIMACY:** SAFETY_OVERRIDE preserves human judgment override capability
