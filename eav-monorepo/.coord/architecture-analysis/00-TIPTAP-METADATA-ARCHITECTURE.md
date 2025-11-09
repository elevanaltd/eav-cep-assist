# TipTap Editor Architecture & Component Metadata Integration

**Investigation Date**: 2025-11-07  
**Scope**: copy-editor TipTap editor component metadata UI integration feasibility  
**Status**: Complete analysis with integration recommendations

---

## EXECUTIVE SUMMARY

The copy-editor TipTap editor uses a **paragraph-based component model** where each paragraph automatically becomes a numbered component (C1, C2, C3...). 

**Key Findings**:
- Components are NOT TipTap custom nodes (purely visual via decorations)
- Components are extracted and renumbered on every save
- Component metadata CAN be integrated with ZERO TipTap modifications
- Recommended approach: Zustand in-memory store + metadata sidebar UI

---

## 1. TIPTAP EDITOR SETUP

**File**: `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/components/TipTapEditor.tsx` (lines 177-324)

```typescript
const editor = useEditor({
  editable: permissions.canEditScript && lockStatus === 'acquired',
  extensions: [
    StarterKit.configure({
      paragraph: { HTMLAttributes: { class: 'component-paragraph' } }
    }),
    ParagraphComponentTracker,        // Visual C1, C2, C3... labels
    HeaderPatternExtension,           // [[HEADER]] syntax
    CommentHighlightExtension,        // Comment highlights
    CommentPositionTracker            // Dynamic comment updates
  ],
  content: '',
  onUpdate: ({ editor }) => {
    extractComponents(editor);        // Extract on every keystroke
    if (permissions.canEditScript) {
      setSaveStatus('unsaved');
    }
  },
  editorProps: { handlePaste: ... }
});
```

**Pattern**: Minimal extension stack. Extensions are stateless utilities, not data stores.

---

## 2. COMPONENT EXTRACTION & DEFINITION

**File**: `/Volumes/HestAI-Projects/eav-monorepo/packages/shared/src/editor/componentExtraction.ts`

Components are **derived from paragraphs**, not explicit entities:

```typescript
export function extractComponents(
  doc: ProseMirrorNode,
  generateHash: (text: string) => string
): ComponentData[] {
  const components: ComponentData[] = [];
  let componentNum = 0;

  doc.forEach((node: ProseMirrorNode) => {
    const textContent = node.textContent.trim();

    if (textContent.length === 0) return;

    // List items → components
    if (node.type.name === 'list_item') {
      componentNum++;
      components.push({
        number: componentNum,
        content: `- ${textContent}`,
        wordCount: calculateWordCount(textContent),
        hash: generateHash(...)
      });
      return;
    }

    // Paragraphs → components (except [[HEADER]])
    if (node.type.name === 'paragraph') {
      if (HEADER_PATTERN.test(textContent)) return; // Skip headers
      
      componentNum++;
      components.push({
        number: componentNum,
        content: textContent,
        wordCount: calculateWordCount(textContent),
        hash: generateHash(textContent)
      });
    }
  });

  return components;
}
```

**Component Data Structure**:

```typescript
export interface ComponentData {
  number: number;      // Sequential (1, 2, 3...) — recalculated on every save
  content: string;     // Full text (with "- " prefix for lists)
  wordCount: number;   // Calculated
  hash: string;        // Content hash for change detection
}
```

**Key Insight**: Components have **NO persistent ID**. The number is recalculated on every extraction based on order.

---

## 3. COMPONENT VISUAL RENDERING

**File**: `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/features/editor/extensions/ParagraphComponentTracker.ts`

```typescript
export const ParagraphComponentTracker = Extension.create({
  addProseMirrorPlugins() {
    return [new Plugin({
      props: {
        decorations(state) {
          const decorations: Decoration[] = [];
          let componentNumber = 0;
          
          state.doc.forEach((node, offset) => {
            if (node.type.name === 'paragraph' && 
                node.content.size > 0 && 
                isComponentParagraph(node.textContent.trim())) {
              
              componentNumber++;
              
              const widget = Decoration.widget(offset, () => {
                const span = document.createElement('span');
                span.className = 'component-label';
                span.setAttribute('data-component', `C${componentNumber}`);
                span.textContent = `C${componentNumber}`;
                return span;
              }, { side: -1 });
              
              decorations.push(widget);
            }
          });
          
          return DecorationSet.create(state.doc, decorations);
        }
      }
    })];
  }
});
```

**Rendering**: 
- Decorations are ephemeral (regenerated on every render)
- No persistent data stored in TipTap nodes
- Pure visual indicator in left margin
- CSS: `left: -50px; position: absolute;`

**CSS** (`/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/components/TipTapEditor.css`):

```css
.editor-content {
  padding-left: 120px;  /* Space for C1, C2, C3... labels */
}

.component-label {
  position: absolute;
  left: -50px;          /* In left margin */
  top: 3px;
  background: #6B7280;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  user-select: none;
  pointer-events: none;
}
```

---

## 4. DATABASE PERSISTENCE

### 4.1 Script Components Table

**File**: `/Volumes/HestAI-Projects/eav-monorepo/supabase/migrations/20251102000000_production_baseline_schema.sql` (line 922)

```sql
CREATE TABLE "public"."script_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "script_id" "uuid" NOT NULL,
    "component_number" integer NOT NULL,
    "content" "text" NOT NULL,
    "word_count" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);
```

**Constraints**:
- ✅ Has `component_number` (sequential 1, 2, 3...)
- ✅ Has `content` and `word_count`
- ❌ NO custom metadata fields
- ❌ NO component-level status/attributes
- 🔒 Direct writes BLOCKED by trigger (must use RPC)

### 4.2 Save Function

**File**: Line 638 of same migration

```sql
CREATE OR REPLACE FUNCTION save_script_with_components(
  p_script_id uuid,
  p_yjs_state text,
  p_plain_text text,
  p_components jsonb  -- Array of ComponentData
)
RETURNS SETOF scripts AS $$
BEGIN
  -- Verify lock
  IF NOT EXISTS (SELECT 1 FROM script_locks ...) THEN
    RAISE EXCEPTION 'Cannot save: You no longer hold the edit lock';
  END IF;

  UPDATE scripts
  SET yjs_state = decode(p_yjs_state, 'base64'),
      plain_text = p_plain_text,
      component_count = jsonb_array_length(p_components),
      updated_at = now()
  WHERE id = p_script_id;

  -- DELETE and REBUILD (not UPDATE)
  DELETE FROM script_components WHERE script_id = p_script_id;
  
  INSERT INTO script_components (script_id, component_number, content, word_count)
  SELECT p_script_id, (comp->>'number')::int, comp->>'content', (comp->>'wordCount')::int
  FROM jsonb_array_elements(p_components) AS comp;

  RETURN QUERY SELECT * FROM scripts WHERE id = p_script_id;
END;
$$ SECURITY DEFINER;
```

**Save Pattern**: On every save:
1. Extract all components (renumber to 1, 2, 3...)
2. Send entire array to backend
3. Backend DELETES all old components
4. Backend INSERTS new components
5. Result: NO metadata preservation (by design)

---

## 5. CURRENT UI ARCHITECTURE

### 5.1 Editor Layout

```
┌──────────────────────────────────────────────────────────┐
│ Header: "Script: Video Title" | Save status | Lock icon  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  [C1 label]  Script heading                              │
│                                                           │
│  [C2 label]  First paragraph becomes a component...      │
│                                                           │
│  [C3 label]  Second paragraph becomes a component...     │
│                                                           │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Current Component UI**:
- Only left-margin labels (C1, C2, C3...)
- Component count in ScriptStatusContext (for header)
- No component list, no metadata display

### 5.2 State Management

**File**: `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/contexts/ScriptStatusContext.tsx`

```typescript
export interface ScriptStatus {
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  lastSaved: Date | null;
  componentCount: number;  // Only count, not individual data
}

// Updated in TipTapEditor.tsx line 552
useEffect(() => {
  updateScriptStatus({
    saveStatus,
    lastSaved,
    componentCount: extractedComponents.length  // Just the length
  });
}, [saveStatus, lastSaved, extractedComponents.length]);
```

**Pattern**: Only count is tracked, not individual component metadata.

---

## 6. DATA FLOW: EXTRACTION → SAVE → LOAD

### 6.1 Loading Script

```
User selects video
    ↓
TipTapEditor useEffect (line 437)
    ↓
loadScriptForVideo(videoId)
    ↓
Supabase: SELECT * FROM scripts WHERE video_id = ?
    ↓
Supabase: SELECT * FROM script_components WHERE script_id = ?
    ↓
mapScriptRowToScript(scriptRow, components)
    ↓
editor.commands.setContent(plainText)
    ↓
TipTapEditor renders ProseMirror document
    ↓
ParagraphComponentTracker generates C1, C2, C3... decorations
    ↓
extractComponents(editor.state.doc)
    ↓
setExtractedComponents(components)
```

### 6.2 Extraction During Editing

```
User types character
    ↓
TipTap editor.onUpdate fires
    ↓
extractComponents(editor.state.doc)  ← Every keystroke
    ↓
setExtractedComponents(newComponents)
    ↓
setSaveStatus('unsaved')
```

### 6.3 Saving to Database

```
2 seconds of inactivity
    ↓
auto-save timer triggers handleSave()
    ↓
plainText = editor.getText()
extractedComponents = state from component extraction
    ↓
save(yjsState, plainText, extractedComponents)
    ↓
useCurrentScript hook → saveMutation.mutateAsync()
    ↓
Backend: POST /rpc/save_script_with_components
    ↓
save_script_with_components function:
  1. Verify lock held by current user
  2. UPDATE scripts (yjs_state, plain_text, component_count)
  3. DELETE FROM script_components WHERE script_id = ?
  4. INSERT INTO script_components (new components)
    ↓
loadCommentHighlights(scriptId)  ← Recover comment positions
```

---

## 7. METADATA INTEGRATION: FEASIBILITY ANALYSIS

### 7.1 Constraints

| Constraint | Impact | Severity |
|-----------|--------|----------|
| No persistent component ID | Can't use DB PK for metadata | HIGH |
| Component numbers recalculate on save | Metadata keys can't be numbered | HIGH |
| Components are visual-only (no custom nodes) | No node attributes to leverage | MEDIUM |
| Extract happens every keystroke | Overhead if metadata sync per-keystroke | MEDIUM |
| script_components table is immutable per-save | Must rebuild entire table | LOW |

### 7.2 Why Custom Nodes Would Break

**Option**: Replace paragraph extraction with custom TipTap nodes
```typescript
const ComponentNode = Node.create({
  name: 'component',
  addAttributes() {
    return { 
      componentNumber: { default: 1 },
      metadata: { default: {} }  // NEW
    };
  }
});
```

**Why rejected**:
- **Breaks North Star I1**: "Component spine must be stable across all 7 apps"
- Requires simultaneous migration of all 7 apps
- Changes save format (cannot append to existing system)
- Major refactoring risk

### 7.3 Recommended Approach: In-Memory Store

**Store metadata in Zustand** (in-memory or optional DB):

```typescript
// New: src/core/state/componentMetadataStore.ts
export const useComponentMetadataStore = create<{
  metadata: Map<number, ComponentMetadata>;
  setMetadata: (num: number, data: Partial<ComponentMetadata>) => void;
  clear: () => void;
}>((set) => ({
  metadata: new Map(),
  setMetadata: (num, data) => set((state) => {
    const updated = new Map(state.metadata);
    updated.set(num, { 
      number: num,
      ...updated.get(num),
      ...data
    });
    return { metadata: updated };
  }),
  clear: () => set({ metadata: new Map() })
}));

interface ComponentMetadata {
  number: number;
  notes?: string;
  status?: 'draft' | 'approved' | 'needs_review';
  reviewedBy?: string;
  createdAt?: Date;
}
```

**Integration**:
1. Add metadata sidebar (right side, like CommentSidebar)
2. Bind to editor selection → extract component number at cursor
3. Lookup metadata from store
4. Display/edit in sidebar
5. Optional: Persist to `component_metadata` table (future)

**Pros**:
- ✅ Zero TipTap changes
- ✅ No schema changes yet
- ✅ Works with current architecture
- ✅ Can be persisted later

**Cons**:
- Metadata lost on reload (unless persisted)
- No real-time sync with other editors

---

## 8. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1)
- [ ] Create `componentMetadataStore.ts` (Zustand)
- [ ] Create `ComponentMetadataPanel.tsx` (sidebar)
- [ ] Integrate into `TipTapEditor.tsx` layout
- [ ] Bind panel to editor selection (onSelectionUpdate)
- [ ] Extract component number from cursor position

### Phase 2: UI/UX (Week 2)
- [ ] Build metadata form (notes, status, reviewed_by)
- [ ] Add visual badges to C1, C2, C3... labels
- [ ] Add hotkeys for quick status changes
- [ ] Test with sample scripts

### Phase 3: Persistence (Week 3, optional)
- [ ] Create `component_metadata` table in Supabase
- [ ] Extend `save_script_with_components` to include metadata
- [ ] Update extraction to load/save metadata
- [ ] Handle component renumbering on delete

### Phase 4: Real-time (Phase 4+, future)
- [ ] Sync metadata via Y.js when collaborative editing enabled
- [ ] Broadcast metadata updates to all connected editors

---

## 9. EDGE CASES & MITIGATIONS

### 9.1 Component Renumbering
**Issue**: Delete C2 → C3 becomes C2, metadata might be attached to wrong component

**Mitigation**:
- Store metadata by number (ephemeral, regenerated on save)
- On extraction, if component count decreased, reset metadata for affected components
- Show warning: "Metadata may have shifted due to component changes"

### 9.2 Undo/Redo
**Issue**: TipTap undo doesn't track component changes explicitly

**Current**: Already handled by extractComponents() in onUpdate hook

**No change needed**

### 9.3 Copy/Paste
**Issue**: Pasted content gets new C numbers, old metadata lost

**Design decision**: Accept as intended behavior (components are content-tied, not identity-tied)

---

## 10. FILE PATHS REFERENCE

### Core Editor
- TipTapEditor: `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/components/TipTapEditor.tsx`
- Styles: `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/components/TipTapEditor.css`

### Extensions
- ParagraphComponentTracker: `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/features/editor/extensions/ParagraphComponentTracker.ts`
- HeaderPatternExtension: `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/components/extensions/HeaderPatternExtension.ts`

### Shared (packages/shared)
- extractComponents: `/Volumes/HestAI-Projects/eav-monorepo/packages/shared/src/editor/componentExtraction.ts`
- ComponentData type: `/Volumes/HestAI-Projects/eav-monorepo/packages/shared/src/database/validation.ts`
- useCurrentScript: `/Volumes/HestAI-Projects/eav-monorepo/packages/shared/src/scripts/hooks/useCurrentScript.ts`

### Database
- Schema: `/Volumes/HestAI-Projects/eav-monorepo/supabase/migrations/20251102000000_production_baseline_schema.sql`
  - scripts table: line 620
  - script_components: line 922
  - save_script_with_components: line 638

### Reference (Pattern Model)
- CommentSidebar: `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/components/comments/CommentSidebar.tsx`
- ScriptStatusContext: `/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/contexts/ScriptStatusContext.tsx`

---

## CONCLUSION

**Metadata integration is feasible with zero TipTap modifications.** The paragraph-based, decoration-only component model is actually an advantage—it's flexible and allows metadata to be stored separately.

**Recommended approach**:
1. Create Zustand store for component metadata (in-memory)
2. Add metadata sidebar UI (following CommentSidebar pattern)
3. Bind sidebar to editor cursor position (extract component number)
4. Optional: Persist to DB in Phase 3

**Risk**: Low | **Effort**: Medium | **Impact**: High

