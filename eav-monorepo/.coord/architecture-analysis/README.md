# TipTap Editor Architecture Analysis - Complete Investigation

**Date**: 2025-11-07
**Analyst**: Claude Code (Haiku 4.5)
**Project**: copy-editor component metadata UI integration feasibility
**Status**: ✅ Complete with actionable recommendations
**Implementation Status**: 🔄 DEFERRED until Library Manager/Script Builder operational

---

## ⚠️ RELATIONSHIP TO LIBRARY SYSTEM

**Important Context:** This analysis explores **editor-level component metadata** (notes, status, review) for copy-editor TipTap editor. This is a **SEPARATE architectural concern** from the Library Manager/Script Builder system currently in development (D3 phase).

### Architectural Layers (No Overlap)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. EDITOR COMPONENT METADATA (This Analysis)                │
│    Purpose: Per-script component annotations for review     │
│    Scope: copy-editor TipTap editor enhancement             │
│    Tables: component_metadata (optional Phase 3)            │
│    User: Script writers marking components for review       │
└─────────────────────────────────────────────────────────────┘
                              ↕ (Different concerns)
┌─────────────────────────────────────────────────────────────┐
│ 2. LIBRARY MANAGER (In Development - D3 Phase)              │
│    Purpose: Catalog reusable script components              │
│    Scope: Extract FROM script_components → paragraph_library│
│    Tables: paragraph_library (with metadata: category, etc.)│
│    User: Library managers cataloging for reuse              │
└─────────────────────────────────────────────────────────────┘
                              ↕ (Different concerns)
┌─────────────────────────────────────────────────────────────┐
│ 3. SCRIPT BUILDER (In Development - D3 Phase)               │
│    Purpose: Assemble scripts FROM library components        │
│    Scope: Search paragraph_library → draft → create script  │
│    Tables: script_builder_drafts, paragraph_library (read)  │
│    User: Script writers assembling from library             │
└─────────────────────────────────────────────────────────────┘
```

### Terminology Clarification

**"Component" means different things in each layer:**

| Layer | Component Definition | Persistence | Metadata |
|-------|---------------------|-------------|----------|
| **Editor Metadata** | Paragraphs in TipTap (C1, C2, C3...) | Ephemeral numbers (recalculated on save) | Notes, status, reviewedBy (in-memory or optional DB) |
| **Script Components** | Extracted paragraphs in `script_components` table | Database rows (deleted/recreated on save) | content, word_count only |
| **Library Components** | Cataloged reusable paragraphs in `paragraph_library` | Permanent database rows with stable IDs | component_name, category, make_model, times_used, full-text search |
| **Draft Components** | Assembly state in `script_builder_drafts.components` JSONB | Draft-scoped (references library_id or placeholder name) | type, library_id/name, note, order |

### Recommendation: Sequential Development

**Defer editor component metadata implementation until Library Manager/Script Builder are operational.** Reasoning:

1. **Avoid parallel editor changes** during library system development (minimize integration risk)
2. **Library system is higher priority** (enables Script Builder, which is Phase 4 planning requirement)
3. **Component metadata is enhancement** (valuable but not blocking for Phase 4)
4. **After library operational:** Revisit this analysis with clearer understanding of component workflows

### Implementation Timeline

- **Current Phase:** Library Manager D3 → B0 validation (2025-11-07)
- **Next Phase:** Script Builder D3 → B0 validation (after Library Manager)
- **Future Phase:** Editor component metadata (revisit after Script Builder B4)

---

## Files in This Analysis

1. **00-TIPTAP-METADATA-ARCHITECTURE.md** — Main technical analysis
   - Editor setup and initialization
   - Component extraction logic
   - Current UI architecture
   - Database persistence model
   - Feasibility analysis with recommendations
   - Implementation roadmap

2. **01-VISUAL-COMPONENT-FLOW.md** — Diagrams and visual flows
   - Component extraction pipeline
   - Component number recalculation pattern
   - Current vs. proposed UI layouts
   - Component metadata store architecture
   - Database schema (current + proposed)
   - Decorator enhancement patterns
   - Save operation timeline

---

## KEY FINDINGS SUMMARY

### What Are Components?
- **Not** custom TipTap nodes
- **Not** persistent entities with IDs
- **Are** paragraphs that get extracted and numbered (1, 2, 3...)
- **Are** recalculated on every save (numbers NOT stable across edits)
- **Are** stored in Supabase `script_components` table (flat structure, no metadata)

### Current Architecture Strengths
✅ Simple (paragraph-based extraction)  
✅ Portable (same logic across all 7 apps)  
✅ Flexible (easy to add metadata separately)  
✅ Proven (production-grade in Phase B4)

### Why Custom Nodes Would Break
❌ Violates North Star I1 (component spine stability)  
❌ Requires simultaneous migration of 7 apps  
❌ Changes save/load format (breaking change)  
❌ High risk for production system

### Recommended Integration Approach

**Pattern**: In-memory metadata store + UI sidebar  
**Risk**: Low  
**Effort**: Medium  
**Impact**: High  

```typescript
// Phase 1: Create Zustand store (in-memory)
useComponentMetadataStore  →  Map<number, ComponentMetadata>

// Phase 2: Add sidebar UI (mirroring CommentSidebar pattern)
ComponentMetadataPanel  →  Right sidebar with notes/status/reviewedBy

// Phase 3: Optional persistence
component_metadata table  →  Store metadata in DB with composite key (script_id, component_number)
```

### Integration Points (Ranked by Feasibility)

| Rank | Option | Feasibility | Effort | Notes |
|------|--------|-------------|--------|-------|
| 1 | In-memory Zustand store | ✅ High | Low | Recommended. No TipTap changes. |
| 2 | Metadata sidebar UI | ✅ High | Low-Med | Follow CommentSidebar pattern. |
| 3 | DB persistence (Phase 3) | ✅ Med | Med | Optional. Add after Phase 2 proof. |
| 4 | Decorator enhancement | ✅ Med | Med | Visual badges on C1, C2, etc. |
| 5 | Custom node type | ❌ Low | High | Rejected. Breaks North Star I1. |
| 6 | Node attributes | ⚠️ Low | High | Too risky. Sidle effect on extraction. |

---

## CRITICAL FILE PATHS

### Editor Core
- **Main component**: `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/components/TipTapEditor.tsx`
- **Styles**: `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/components/TipTapEditor.css`
- **Visual component tracker**: `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/features/editor/extensions/ParagraphComponentTracker.ts`
- **Header pattern extension**: `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/components/extensions/HeaderPatternExtension.ts`

### Shared (Component Logic)
- **Extract function**: `/Volumes/HestAI-Projects/eav-monorepo/packages/shared/src/editor/componentExtraction.ts`
- **Component types**: `/Volumes/HestAI-Projects/eav-monorepo/packages/shared/src/database/validation.ts`
- **Save hook**: `/Volumes/HestAI-Projects/eav-monorepo/packages/shared/src/scripts/hooks/useCurrentScript.ts`

### Database (Schema)
- **Production schema**: `/Volumes/HestAI-Projects/eav-monorepo/supabase/migrations/20251102000000_production_baseline_schema.sql`
  - scripts table: line 620
  - script_components table: line 922
  - save_script_with_components RPC: line 638

### Reference Patterns
- **CommentSidebar** (for UI pattern): `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/components/comments/CommentSidebar.tsx`
- **ScriptStatusContext** (for state): `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/contexts/ScriptStatusContext.tsx`

---

## IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1, Low Risk)
- [ ] Create `componentMetadataStore.ts` using Zustand
  - Store: `Map<number, ComponentMetadata>`
  - Methods: `setMetadata(number, data)`, `clear()`
  - Data: `{ number, notes?, status?, reviewedBy?, createdAt? }`
- [ ] Create `ComponentMetadataPanel.tsx` (right sidebar)
  - Layout: Similar to CommentSidebar
  - Bind to editor selection via `onSelectionUpdate`
  - Extract component number from cursor position
  - Display/edit metadata for current component
- [ ] Integrate panel into `TipTapEditor.tsx`
  - Add alongside CommentSidebar
  - Coordinate layout (200-250px width)

### Phase 2: UI/UX Polish (Week 2, Low-Medium Risk)
- [ ] Add metadata form fields
  - Notes: textarea
  - Status: dropdown (draft/approved/needs_review)
  - Reviewed By: user selector
  - Created At: timestamp display
- [ ] Add visual indicators
  - Color-coded badges on C1, C2, C3... labels
  - Hover tooltips showing status
- [ ] Add keyboard shortcuts
  - Alt+A to mark as approved
  - Alt+N to set review status
- [ ] Test with copy-editor team

### Phase 3: Persistence (Week 3, Medium Risk, Optional)
- [ ] Create `component_metadata` table in Supabase
  - Composite key: (script_id, component_number)
  - Fields: notes, status, reviewed_by, created_at, updated_at
- [ ] Extend `save_script_with_components` RPC
  - Accept metadata array alongside components
  - UPSERT metadata records
- [ ] Update extraction pipeline
  - Load metadata on script load
  - Save metadata on script save
- [ ] Handle component renumbering
  - Detect when component count changes
  - Reset/cleanup metadata for affected components

### Phase 4: Real-time Collaboration (Phase 4+, Future)
- [ ] Integrate metadata with Y.js state
- [ ] Broadcast metadata updates via Realtime
- [ ] Sync metadata across concurrent editors

---

## QUICK REFERENCE: COMPONENT NUMBERS

```
In Editor (Temporal):
  User types → Extraction on every keystroke → C1, C2, C3... decorations

On Save:
  1. Extract from current doc
  2. Renumber to 1, 2, 3...
  3. DELETE all old components in DB
  4. INSERT new components in DB

Result:
  Component numbers are NOT stable across saves
  → Can't use as DB primary key
  → Must use composite key (script_id, component_number) if persisting metadata
```

---

## EDGE CASES & MITIGATIONS

| Issue | Mitigation | Priority |
|-------|-----------|----------|
| Component renumbering (delete C2) | Reset metadata for affected numbers. Show warning. | HIGH |
| Metadata lost on page reload | Optional: Persist to DB in Phase 3 | MEDIUM |
| Component count decreased | Detect on extraction, offer cleanup | MEDIUM |
| Multi-user concurrent metadata edits | Use Y.js sync in Phase 4 | LOW (Phase 4+) |
| Undo/redo with metadata | Metadata stays in memory. Accept as limitation. | LOW |
| Copy/paste components | New components inherit no metadata. By design. | LOW |

---

## ANSWERS TO INVESTIGATION QUESTIONS

**Q: Can we add metadata to TipTap nodes without breaking the editor?**
- ✅ Yes, but risky. Recommend Zustand store instead (zero TipTap changes).

**Q: Is there a way to attach data to components separate from visible content?**
- ✅ Yes—Zustand in-memory store (Phase 1) or optional DB table (Phase 3).

**Q: What's the easiest UI integration point?**
- ✅ Collapsible right sidebar (follow CommentSidebar pattern).

**Q: Are components truly separate entities or just visual splits?**
- ❌ Visual splits only. By design per North Star I1. Components = paragraphs.

**Q: Constraints from TipTap's document model?**
- ✅ Minimal. Paragraph-based model is flexible. No breaking constraints.

**Q: Can we integrate without breaking the component extraction?**
- ✅ Yes. Metadata stored separately. Extraction logic unchanged.

---

## NEXT STEPS

1. **Review** this analysis with copy-editor team
2. **Validate** the Zustand store approach with team
3. **Spike** Phase 1 (create store + sidebar UI)
4. **Proof-of-concept** with sample script
5. **Decide** on Phase 3 persistence based on team feedback

---

## CONFIDENCE LEVEL

**High confidence** in findings based on:
- Complete codebase review (10+ source files)
- Database schema analysis
- Component extraction logic walkthrough
- Current data flow mapping
- Comparison with existing patterns (CommentSidebar)

**Risk assessment**: Low for Phase 1-2 (in-memory store + UI). Medium for Phase 3 (DB persistence).

---

## DOCUMENT HISTORY

- **2025-11-07**: Initial complete investigation (Claude Code)
- Files: 00-TIPTAP-METADATA-ARCHITECTURE.md, 01-VISUAL-COMPONENT-FLOW.md, README.md

