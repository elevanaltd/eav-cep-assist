# Library Manager

**Phase:** D3 (Blueprint Refinement)
**Priority:** 2 (After Script Builder)
**Status:** Implementation-ready specifications

---

## Purpose

Curation tool for reviewers to catalog reusable script components from approved scripts. Library Manager enables the systematic review of approved scripts, tagging paragraphs with rich metadata, and building a searchable component library for Script Builder users.

## Quick Start Summary

**What it does:**
- Display review queue (approved scripts awaiting cataloging)
- Show script paragraphs with click-to-select interface
- Rich metadata tagging form (component name, make/model, category, notes)
- Save tagged paragraphs to `paragraph_library` table
- Browse and search existing library catalog
- Mark scripts as reviewed when complete

**What it doesn't do:**
- Edit script content (read-only view)
- Create new scripts (that's copy-editor's role)
- Delete library components (admin function only)
- Modify approved scripts (review only, no content changes)

## Tech Stack

**Frontend:**
- React 18 + TypeScript (strict mode)
- Vite (build tool, following copy-editor pattern)
- React Router 7 (navigation)
- React Query (data fetching, caching)
- Zustand (local UI state if needed)
- Tailwind CSS (consistent with copy-editor)

**Backend/Data:**
- @workspace/shared v0.5.0
  - `@workspace/shared` - Header component, AutocompleteField, HierarchicalNavigationSidebar
  - `@workspace/shared/client` - Supabase client singleton (getClient)
  - `@workspace/shared/types` - Database types (Tables<>, Inserts<>, Updates<>)
  - `@workspace/shared/auth` - AuthContext, useAuth hook
  - `@workspace/shared/errors` - Error handling utilities (getUserFriendlyErrorMessage, withRetry)
  - `@workspace/shared/services` - Logger service
- Supabase (database, RLS policies)
- PostgreSQL full-text search (tsvector for component search)

**Quality:**
- Vitest + React Testing Library (TDD from day one)
- ESLint + TypeScript strict mode (zero warnings)
- Turborepo (monorepo task orchestration)

## Key Decisions & Trade-offs

### Read-Only Script Display
**Decision:** Scripts displayed as plain text paragraphs, no TipTap editor needed.
**Rationale:** Library Manager is for cataloging, not editing. Plain text display is simpler and performs better. Approved scripts are immutable at this stage.
**Trade-off:** No rich formatting preview, but this matches the cataloging workflow (focus on content, not formatting).

### Paragraph-Level Selection
**Decision:** Click individual paragraphs to tag, not character-range selection.
**Rationale:** Paragraph is the natural unit of reuse (matches TipTap node structure). Simpler UX than text highlighting.
**Trade-off:** Cannot catalog partial paragraphs, but this matches business workflow (reuse full paragraphs as components).

### Inline Metadata Form
**Decision:** Tagging form appears inline below selected paragraph, not modal.
**Rationale:** Faster workflow (no modal open/close), see context while tagging. Multiple forms can be open simultaneously for batch tagging.
**Trade-off:** More vertical scrolling, but keyboard shortcuts mitigate this (Esc to collapse, Enter to save).

### Content Hash Deduplication
**Decision:** Generate SHA-256 hash of content, prevent duplicate cataloging.
**Rationale:** Same paragraph might appear in multiple scripts. Deduplication prevents library bloat and usage tracking confusion.
**Trade-off:** Edge case where identical content has different metadata (e.g., same text for different products). Solution: Allow override with confirmation dialog.

### Make/Model Auto-Suggest
**Decision:** Dropdown with previously-used make/model values, allows free text entry.
**Rationale:** Speeds up tagging (common values readily available), maintains flexibility (new products can be added).
**Trade-off:** Requires aggregation query on component load (minimal perf impact with caching).

## North Star Compliance

**I8 (Production-grade):** Strict TypeScript, zero warnings, comprehensive RLS policies, proper error handling from day one.

**I11 (Independent deployment):** Separate Vercel project, no shared runtime dependencies with other apps. Uses @workspace/shared (build-time dependency only).

**I12 (Single migration source):** All database migrations at `/supabase/migrations/`, shared schema with Script Builder (paragraph_library table created by Script Builder migration).

## Integration Points

**Reads from:**
- `scripts` (approved scripts awaiting review)
- `paragraph_library` (browse existing catalog)
- `videos` (script metadata for context)

**Writes to:**
- `paragraph_library` (save tagged components)
- `scripts` (update library_status field: 'not_reviewed' → 'reviewed')

**Shared Resources:**
- `paragraph_library` table (created by Script Builder migration)
- Full-text search indexes (GIN on search_vector)

## Documentation Structure

- **ARCHITECTURE.md** - System overview, component tree, data flows, state management
- **DATABASE.md** - Schema additions (scripts.library_status), RLS policies, queries
- **UI-SPEC.md** - Screen layouts, component breakdown, interaction flows
- **API.md** - Supabase queries, service layer design, error handling
- **BUILD-PLAN.md** - Phased task breakdown (B1→B2→B3), effort estimates, dependencies

## Development Phases

**B0 (Validation):** critical-design-validator review of master blueprint
**B1 (Foundation):** Database additions, RLS policies, auth scaffolding, basic UI shell
**B2 (Core Features):** Review queue, paragraph selection, metadata form, save to library
**B3 (Completion):** Browse library, search catalog, integration tests, polish
**B4 (Production Handoff):** Production deployment, monitoring, documentation

## Success Metrics

**Functional:**
- Reviewers can load approved scripts <500ms
- Paragraph selection feels instant (<16ms)
- Metadata form saves <500ms
- Full-text search returns results <200ms

**Quality:**
- 0 TypeScript errors (strict mode)
- 0 ESLint warnings
- All tests passing (TDD discipline)
- RLS policies prevent unauthorized cataloging

**User Experience:**
- Reviewers can tag 5 paragraphs in <5 minutes
- Make/model auto-suggest reduces typing by 70%
- Deduplication prevents accidental library bloat
- Browse library finds components in 1-2 queries

---

**Next:** Review ARCHITECTURE.md for system design, DATABASE.md for schema details.
