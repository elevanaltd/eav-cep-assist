# Copy Builder

**Phase:** D3 (Blueprint Refinement)
**Priority:** 1
**Status:** Implementation-ready specifications

---

## Purpose

**Assembly tool** for writers to build copy from cataloged library components and placeholders. Copy Builder enables rapid copy creation by combining pre-approved, reusable content blocks with custom placeholder elements.

**Key Principle:** Copy Builder produces **plain text output indistinguishable from manual input**. The system doesn't care whether copy was assembled from library, pasted from Google Docs, or typed manually - all inputs are treated identically by the Copy-Editor pipeline.

**User Clarification:** _"It makes ZERO difference if that was copy/pasted in from Google Docs by a human or automated by a system."_

**Stateless Transformation:**
- Library components → Plain text → Copy table
- No provenance tracking (origin is irrelevant)
- Reuses existing Copy-Editor component extraction pipeline
- Batch-optimized queries (no N+1 performance issues)

## Quick Start Summary

**What it does:**
- Search and browse cataloged script components from library
- Drag-and-drop components into script canvas (read-only, no editing)
- Add single-word placeholders for product-specific elements
- Attach notes to components (embedded when copy exported)
- Auto-save drafts as user works
- Complete and export to Copy table for final editing in Copy-Editor

**What it doesn't do:**
- Edit library component content (strictly assembly only)
- Replace Copy-Editor (complements it for initial assembly phase)
- Manage library catalog (that's Library Manager's role)
- Track provenance (origin doesn't matter - stateless transformation)

## Tech Stack

**Frontend:**
- React 18 + TypeScript (strict mode)
- Vite (build tool, following copy-editor pattern)
- React Router 7 (navigation)
- React Query (data fetching, caching)
- Zustand (local UI state if needed)
- @dnd-kit/core (drag & drop, modern alternative to react-beautiful-dnd)
- Tailwind CSS (consistent with copy-editor)

**Backend/Data:**
- @workspace/shared v0.5.0
  - `@workspace/shared` - Header component, HierarchicalNavigationSidebar, AutocompleteField
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

### Read-Only Component Display
**Decision:** Components displayed as read-only cards, no TipTap editor needed in Copy Builder.
**Rationale:** Separation of concerns - assembly phase is about selecting and ordering, editing happens in copy-editor. Avoids complexity of TipTap instance per component.
**Trade-off:** Users cannot preview full formatting during assembly, but this maintains clear workflow boundaries (Assembly → Editing).

### Drag & Drop Library Choice
**Decision:** Use @dnd-kit/core instead of react-beautiful-dnd.
**Rationale:** @dnd-kit is actively maintained, better TypeScript support, modern hooks API, supports touch devices. react-beautiful-dnd is in maintenance mode.
**Trade-off:** Slightly more setup code, but better long-term maintainability.

### Placeholder Storage Pattern
**Decision:** Store placeholders as JSON in `components` array, not separate database table initially.
**Rationale:** Simpler data model for MVP, placeholders are draft-specific. Can extract to `placeholder_types` table later if categorization/reuse patterns emerge.
**Trade-off:** Less structure initially, but faster implementation and validates usage patterns first.

### Component Note Embedding
**Decision:** Notes appended as "(NOTE: text)" when exporting to Copy table, not stored separately.
**Rationale:** Notes are draft-specific context for Copy-Editor, not permanent component metadata. Simple text embedding avoids complex note management.
**Trade-off:** Notes not searchable/indexable, but this matches their ephemeral, draft-specific nature.

### Stateless Export Pattern
**Decision:** Copy-Builder output is plain text indistinguishable from manual paste operations.
**Rationale:** User clarification - "It makes ZERO difference if that was copy/pasted in from Google Docs by a human or automated by a system." Origin tracking adds complexity without functional benefit.
**Trade-off:** Cannot trace which copy came from library assembly vs manual entry, but this is intentional - Copy-Editor processes all copy identically.

### Auto-save Strategy
**Decision:** Debounced auto-save (2 seconds after last change), optimistic UI updates.
**Rationale:** Balance between data safety and server load. 2-second debounce prevents excessive saves during rapid component additions.
**Trade-off:** Potential 2-second data loss window, but acceptable for draft content with visual feedback.

## North Star Compliance

**I8 (Production-grade):** Strict TypeScript, zero warnings, comprehensive RLS policies, proper error handling from day one.

**I11 (Independent deployment):** Separate Vercel project, no shared runtime dependencies with other apps. Uses @workspace/shared (build-time dependency only).

**I12 (Single migration source):** All database migrations at `/supabase/migrations/`, shared schema with other apps (scripts, videos, etc.).

## Integration Points

**Reads from:**
- `paragraph_library` (search and display cataloged components)
- `videos` (video selector for draft association)
- `user_profiles` (user context, auth)

**Writes to:**
- `script_builder_drafts` (save draft state)
- `copy` table (when "Complete & Export" writes assembled plain text)

**Redirects to:**
- Copy-Editor: `https://eav-copy-editor.vercel.app/copy/{id}/edit` (after completion)

## Documentation Structure

- **ARCHITECTURE.md** - System overview, component tree, data flows, state management
- **DATABASE.md** - Table schemas, RLS policies, indexes, migration plan
- **UI-SPEC.md** - Screen layouts, component breakdown, interaction flows
- **API.md** - Supabase queries, service layer design, error handling
- **BUILD-PLAN.md** - Phased task breakdown (B1→B2→B3), effort estimates, dependencies

## Development Phases

**B0 (Validation):** critical-design-validator review of master blueprint
**B1 (Foundation):** Database tables, RLS policies, auth scaffolding, basic UI shell
**B2 (Core Features):** Search, drag-drop, placeholders, notes, auto-save
**B3 (Completion):** "Complete & Send" flow, integration tests, polish
**B4 (Production Handoff):** Production deployment, monitoring, documentation

## Success Metrics

**Functional:**
- Search returns results <200ms (20 components)
- Drag-drop feels instant (<16ms frame time)
- Auto-save completes <500ms
- Complete & Send creates valid script <1s

**Quality:**
- 0 TypeScript errors (strict mode)
- 0 ESLint warnings
- All tests passing (TDD discipline)
- RLS policies prevent unauthorized access

**User Experience:**
- Writers can assemble 10-component script in <3 minutes
- Library search finds relevant components in 1-2 queries
- Draft auto-save provides confidence (visible save indicator)

---

**Next:** Review ARCHITECTURE.md for system design, DATABASE.md for schema details.
