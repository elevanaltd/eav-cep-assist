# TipTap Editor Architecture - Quick Reference Card

## COMPONENT MODEL IN ONE PICTURE

```
Paragraph                    Component
─────────                    ─────────
"First para"          →      C1 { number: 1, content: "First para", hash: "abc..." }
"[[HEADER]]"          →      (skipped - not a component)
"Second para"         →      C2 { number: 2, content: "Second para", hash: "def..." }
"- List item"         →      C3 { number: 3, content: "- List item", hash: "ghi..." }

Key: Numbers RECALCULATE on each save. Not stable across edits.
```

---

## ARCHITECTURE LAYERS

| Layer | Technology | Key File | Role |
|-------|-----------|----------|------|
| **UI** | TipTap + React | `TipTapEditor.tsx` | Editing interface |
| **Extension** | TipTap Plugin | `ParagraphComponentTracker.ts` | Visual C1, C2, C3... labels |
| **Extraction** | Pure function | `componentExtraction.ts` | Parse doc → ComponentData[] |
| **State** | React hooks | `useCurrentScript.ts` | Script lifecycle + save |
| **Database** | PostgreSQL RPC | `save_script_with_components()` | Atomic save + lock verify |
| **Schema** | Supabase | `script_components` table | Component persistence |

---

## DATA FLOW: USER TYPES → SAVE → LOAD

```
USER TYPES
  ↓
editor.onUpdate fires
  ↓
extractComponents(editor.state.doc)
  ↓
setExtractedComponents([C1, C2, C3...])  ← In React state
  ↓
setSaveStatus('unsaved')
  ↓
[2 second delay...]
  ↓
handleSave()
  ↓
useCurrentScript.save(yjsState, plainText, extractedComponents)
  ↓
saveMutation.mutateAsync({components: [...]})
  ↓
Backend: POST /rpc/save_script_with_components
  ↓
save_script_with_components function:
  1. Verify lock
  2. UPDATE scripts (yjs_state, plain_text, component_count)
  3. DELETE FROM script_components WHERE script_id = ?
  4. INSERT INTO script_components (new rows)
  ↓
[Load state resets on next video selection]
```

---

## COMPONENT NUMBERING: WHY IT MATTERS

```
EDIT SCENARIO 1:
─────────────────────────
Document has:
  Para 1: "Intro"
  Para 2: "[[HEADER]]"
  Para 3: "Content"

Extract gives:
  C1: "Intro"       ← Number 1
  C2: "Content"     ← Number 2

Save to DB as C1, C2


EDIT SCENARIO 2: User deletes Para 1
──────────────────────────────────────
Document now has:
  Para 1: "[[HEADER]]"
  Para 2: "Content"

Extract gives:
  C1: "Content"    ← RENUMBERED (was C2!)

Save to DB as C1

KEY INSIGHT:
───────────
Component numbers are NOT persistent IDs.
They're temporary sequential numbers.
Metadata must use (script_id, component_number) as key,
NOT just component_number.
```

---

## FILE LOCATIONS (COPY-PASTE READY)

### Edit These to Add Metadata UI
```
/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/components/TipTapEditor.tsx
  → Add ComponentMetadataPanel here
  → New file location: src/components/metadata/ComponentMetadataPanel.tsx

/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/core/state/
  → Add componentMetadataStore.ts here
```

### Reference These for Patterns
```
CommentSidebar pattern (for UI):
/Volumes/HestAI-Projects/eav-monorepo/apps/copy-editor/src/components/comments/CommentSidebar.tsx

State management pattern (for Zustand):
/Volumes/HestAI-Projects/eav-monorepo/packages/shared/src/scripts/domain/scriptStore.ts

Component extraction logic:
/Volumes/HestAI-Projects/eav-monorepo/packages/shared/src/editor/componentExtraction.ts
```

### Don't Touch These (Would Break System)
```
ParagraphComponentTracker  ← Extension works perfectly
save_script_with_components RPC  ← Atomic save verified
script_components table  ← Schema is correct
```

---

## INTEGRATION CHECKLIST: METADATA SIDEBAR

### Phase 1: In-Memory Store (Week 1)
```typescript
// ✅ Create store
const useComponentMetadataStore = create<{
  metadata: Map<number, ComponentMetadata>;
  setMetadata: (num: number, data: Partial<ComponentMetadata>) => void;
  clear: () => void;
}>(...)

// ✅ Create sidebar component
const ComponentMetadataPanel: React.FC = () => {
  const [selectedComponentNumber, setSelectedComponentNumber] = useState<number | null>(null);
  
  // Bind to editor selection
  useEffect(() => {
    // Extract component number from editor cursor position
    // Update selectedComponentNumber
  }, [editor.selection]);
  
  // Display metadata for selectedComponentNumber
}

// ✅ Integrate into TipTapEditor
<TipTapEditor>
  <EditorContent editor={editor} />
  <ComponentMetadataPanel />
  <CommentSidebar />
</TipTapEditor>
```

### Phase 2: Visual Enhancements (Week 2)
```typescript
// ✅ Add status badges to decorations
// In ParagraphComponentTracker:
const metadata = useComponentMetadataStore(s => s.metadata.get(componentNumber));
if (metadata?.status === 'approved') {
  span.classList.add('component-approved');
}

// ✅ Add form fields
<textarea placeholder="Notes..." />
<select><option>Draft</option><option>Approved</option></select>
<UserSelector />
```

### Phase 3: Optional Persistence (Week 3)
```sql
-- ✅ Create table
CREATE TABLE component_metadata (
  id uuid PRIMARY KEY,
  script_id uuid NOT NULL,
  component_number int NOT NULL,
  notes text,
  status text,
  reviewed_by uuid,
  created_at, updated_at timestamp,
  UNIQUE(script_id, component_number)
);

-- ✅ Extend save function
-- Accept metadata_updates: jsonb in save_script_with_components
-- UPSERT into component_metadata table
```

---

## COMMON QUESTIONS ANSWERED

**Q: Can I store metadata on the TipTap node itself?**
A: Technically yes, but don't. Risky side effects. Use Zustand store instead.

**Q: What if user deletes a component?**
A: Component number shifts. Metadata for deleted component lost (by design).

**Q: Will metadata persist across page reload?**
A: Only in-memory (Phase 1). Persist to DB for permanent storage (Phase 3).

**Q: Do I need to change extractComponents()?**
A: No. Keep it pure (content only). Metadata is separate concern.

**Q: What about real-time sync?**
A: Phase 4 (with Y.js). Phase 1-3 is per-user in-memory.

**Q: Why not use custom TipTap nodes?**
A: Breaks North Star I1. Requires migrating all 7 apps. Too risky.

---

## RISK MATRIX

```
OPTION                    RISK    EFFORT   IMPACT   VERDICT
─────────────────────────────────────────────────────────────
Zustand in-memory store   LOW     LOW      HIGH     ✅ DO THIS
Sidebar UI (Phase 2)      LOW     MEDIUM   HIGH     ✅ DO THIS
DB persistence (Phase 3)  MEDIUM  MEDIUM   HIGH     ✅ LATER
Decorator enhancement     MEDIUM  MEDIUM   MEDIUM   ✅ MAYBE
Custom TipTap nodes       HIGH    HIGH     HIGH     ❌ NO
Node attributes           HIGH    HIGH     MEDIUM   ❌ NO
```

---

## SUCCESS CRITERIA

- [ ] Metadata sidebar appears next to editor
- [ ] Can enter notes for current component
- [ ] Can set status (draft/approved/review)
- [ ] Can select reviewer
- [ ] Status persists during editing session (until page reload)
- [ ] Zero errors in console
- [ ] Component extraction still works
- [ ] Save still works
- [ ] Comments still work
- [ ] Lock system still works

---

## ONE-LINERS

- **Component**: A paragraph that isn't a [[HEADER]]
- **Component number**: Temporary sequential ID (recalculates on save)
- **ComponentData**: { number, content, wordCount, hash }
- **Integration pattern**: Zustand store + sidebar UI
- **Database**: script_components (immutable, DELETE+INSERT only)
- **Risk level**: Low (Phase 1-2), Medium (Phase 3)

---

## NEXT ACTION

Start with Phase 1:
1. Create `componentMetadataStore.ts` (copy ScriptStore pattern)
2. Create `ComponentMetadataPanel.tsx` (copy CommentSidebar layout)
3. Bind to `editor.selectionUpdate`
4. Test with sample script

