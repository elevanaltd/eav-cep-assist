# ADR-002: PROJECT-* vs APP-* Naming Convention

## Status
Accepted

## Context

The monorepo contains coordination files at two levels:
1. **Suite-level**: Coordination for the entire monorepo project (7 apps together)
2. **App-level**: Coordination for individual applications

Initial implementation used `APP-*` naming at both levels, causing semantic confusion:
- Was `/.coord/APP-CONTEXT.md` about the monorepo or a specific app?
- Unclear hierarchy between root and app-specific files

## Decision

We will use a two-tier naming convention:

### PROJECT-* (Suite-Level)
**Location:** `/.coord/PROJECT-*.md`
**Scope:** Monorepo-wide coordination across all 7 applications
**Files:**
- `PROJECT-CONTEXT.md` - Current state of monorepo migration and setup
- `PROJECT-CHECKLIST.md` - Suite-wide phase checklist (Phase 1-4)

### APP-* (App-Level)
**Location:** `/.coord/apps/{app-name}/APP-*.md`
**Scope:** Individual application coordination
**Files:**
- `APP-CONTEXT.md` - App-specific current state
- `APP-CHECKLIST.md` - App-specific migration checklist
- `APP-HISTORY.md` - App-specific decision history

## Rationale

### Semantic Clarity
- **PROJECT-** clearly indicates monorepo suite level
- **APP-** clearly indicates individual application level
- Hierarchy is self-documenting: PROJECT contains multiple APPs

### Consistency with HestAI Patterns
Other HestAI projects use PROJECT-* for root coordination:
- Aligns with established organizational patterns
- Developers familiar with one project understand others

### Prevents Confusion
When a developer sees:
- `PROJECT-CHECKLIST.md` → They know: "Monorepo migration phases"
- `apps/copy-editor/.coord/APP-CHECKLIST.md` → They know: "Scripts-web specific tasks"

### Scales with Growth
As the suite grows to 10+ apps, the naming remains clear:
- PROJECT-* stays singular (one monorepo)
- APP-* multiplies (many apps)
- No ambiguity about scope

## Consequences

### Positive
- Clear semantic distinction between levels
- Self-documenting hierarchy
- Consistent with organizational patterns
- Scales naturally

### Neutral
- Requires updating DECISIONS.md documentation
- One-time rename of root-level files

### Negative
- None identified

## Implementation

1. Rename files at root level:
   - `APP-CONTEXT.md` → `PROJECT-CONTEXT.md`
   - `APP-CHECKLIST.md` → `PROJECT-CHECKLIST.md`

2. Update content to reflect suite-wide scope

3. Update DECISIONS.md with naming convention

4. Document in this ADR for future reference

## References

- DECISIONS.md: Lines 68-75 (Documentation Structure)
- ADR-001: Documentation Architecture
- Directory structure: Lines 36-60 in DECISIONS.md
