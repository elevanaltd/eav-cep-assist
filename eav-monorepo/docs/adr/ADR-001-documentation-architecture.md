# ADR-001: Documentation Architecture

## Status
Accepted (2025-11-01)

## Context

The EAV Operations Suite monorepo requires a clear documentation strategy that:
- Separates architectural decisions from operational coordination
- Prevents documentation duplication across app-specific directories
- Maintains clean git history (coordination files should not be tracked)
- Provides easy access to app-specific coordination files

Prior to this decision, there was a misalignment between the documented specification in `/Volumes/HestAI-Projects/eav-ops/DECISIONS.md` and the actual implementation, where:
- Directory was named `coordination/` instead of `.coord/`
- The `coordination/` directory was being tracked in git
- Symlinks pointed to the wrong directory name

## Decision

**Two-location documentation strategy:**

### 1. `/docs/` - Architectural Decisions (git tracked)
- Suite-wide architectural decisions → `/docs/adr/`
- Development guides and protocols → `/docs/guides/`
- Workflow documentation → `/docs/workflow/`
- **Purpose:** Permanent, versioned architectural knowledge
- **Audience:** All developers across all apps

### 2. `/.coord/` - App Coordination (gitignored)
- App-specific planning, state, and reports
- Session notes and implementation history
- Analysis and diagnostics
- **Purpose:** Working files, temporary coordination
- **Audience:** Per-app development teams

### 3. Symlink Architecture
Each app has a `.coord` symlink: `apps/{app}/.coord -> ../../.coord/apps/{app}`

This provides:
- Easy access: `cd apps/copy-editor/.coord`
- Single source of truth: All coordination at `/.coord/`
- Clean git history: `.coord/` is gitignored

## Rationale

**Why `.coord/` instead of `coordination/`?**
- Dot-prefix convention clearly signals "not tracked in git" (like `.git/`, `.github/`)
- Matches DECISIONS.md specification exactly
- Shorter symlink paths
- Standard practice for tooling-related directories

**Why inside monorepo instead of external directory?**
- Easy developer access (no path confusion)
- Symlinks remain relative and portable
- Follows monorepo best practices
- Centralized location for all app coordination

**Why eliminate app-specific docs directories?**
- Prevents duplication of architectural decisions
- Forces clear distinction between permanent (ADRs) vs temporary (coordination)
- Reduces cognitive load: exactly two locations to check

## Consequences

### Positive
- Clear rules: "Is it an architectural decision or app coordination?"
- No more scattered docs across multiple locations
- Clean git history (coordination files don't pollute commits)
- Easy to find all coordination files (single `.coord/` directory)

### Neutral
- Developers must understand the two-location model
- Symlinks require basic understanding of how they work

### Negative
- None identified; this resolves existing architectural misalignment

## Implementation

Executed 2025-11-01:
1. Removed `coordination/` from git tracking: `git rm -r --cached coordination/`
2. Renamed directory: `mv coordination/ .coord/`
3. Updated all 7 app symlinks to point to `../../.coord/apps/{app}`
4. Verified `.gitignore` contains `.coord` entry
5. Validated symlink navigation works correctly

## Related Decisions
- See `/Volumes/HestAI-Projects/eav-ops/DECISIONS.md` for overall architecture decisions
- This ADR formalizes the documentation structure specified there
