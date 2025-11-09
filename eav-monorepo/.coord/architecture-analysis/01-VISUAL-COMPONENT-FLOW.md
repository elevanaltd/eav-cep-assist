# Visual Component Data Flow Diagrams

## 1. COMPONENT EXTRACTION PIPELINE

```
┌─────────────────────────────────────────────────────────┐
│                    USER EDITING                         │
│                  (Typing in editor)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              TipTap Editor (ProseMirror)                │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Document Node Tree:                              │   │
│  │ - heading: "Script: My Video"                    │   │
│  │ - paragraph: "First paragraph content"           │   │
│  │ - paragraph: "[[INTRO]]"                         │   │
│  │ - paragraph: "Second paragraph content"          │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓ (on every keystroke)
         ┌───────────────────────────┐
         │  ParagraphComponentTracker │
         │  (Extension - Decorations) │
         └───────────┬───────────────┘
                     │
                     ↓
        ┌────────────────────────────────┐
        │   Visual Labels (Left Margin)  │
        │   [C1] First paragraph...      │
        │   [C2] Second paragraph...     │
        │ (Decorations only - ephemeral) │
        └────────────────────────────────┘
                     │
                     ↓
       ┌──────────────────────────────────────┐
       │  extractComponents(editor.state.doc) │
       │  (Shared function)                   │
       └────────────┬───────────────────────┘
                    │
                    ↓
       ┌──────────────────────────────────────────┐
       │       ComponentData[] Extracted          │
       │  ┌────────────────────────────────────┐  │
       │  │ [0] {                              │  │
       │  │   number: 1,                       │  │
       │  │   content: "First paragraph...",   │  │
       │  │   wordCount: 5,                    │  │
       │  │   hash: "abc123..."                │  │
       │  │ }                                  │  │
       │  │ [1] {                              │  │
       │  │   number: 2,                       │  │
       │  │   content: "Second paragraph...",  │  │
       │  │   wordCount: 4,                    │  │
       │  │   hash: "def456..."                │  │
       │  │ }                                  │  │
       │  └────────────────────────────────────┘  │
       │ (Stored in React state)                  │
       └───────────┬────────────────────────────┘
                   │
              ┌────┴────┐
              ↓         ↓
    ┌──────────────┐  ┌──────────────────┐
    │ Display:     │  │  Save (2s delay) │
    │ C1, C2, C3...│  │  or user click   │
    └──────────────┘  └────────┬─────────┘
                               │
                               ↓
                    ┌──────────────────────┐
                    │  handleSave()        │
                    │  - plainText         │
                    │  - extractedComps    │
                    └──────────┬───────────┘
                               │
                               ↓
                    ┌──────────────────────────┐
                    │  useCurrentScript.save() │
                    │  (Hook method)           │
                    └──────────┬───────────────┘
                               │
                               ↓
                 ┌─────────────────────────────┐
                 │  saveMutation.mutateAsync() │
                 │  (TanStack Query)           │
                 └─────────────┬───────────────┘
                               │
                               ↓
         ┌─────────────────────────────────────────┐
         │  Backend: POST /rpc/                    │
         │  save_script_with_components            │
         └─────────────┬──────────────────────────┘
                       │
                       ↓
         ┌────────────────────────────────────┐
         │  PostgreSQL Function:              │
         │  1. Verify lock                    │
         │  2. UPDATE scripts                 │
         │  3. DELETE script_components WHERE │
         │  4. INSERT new components          │
         └────────────┬───────────────────────┘
                      │
                      ↓
        ┌────────────────────────────────────┐
        │  Supabase Database State           │
        │  (new components persisted)        │
        └────────────────────────────────────┘
```

## 2. COMPONENT NUMBER RECALCULATION

```
SAVE #1: User types 3 paragraphs
────────────────────────────────
Before extraction:
  Para 1: "Intro text"
  Para 2: "[[DETAIL]]"
  Para 3: "Main content"
                    ↓
  After extraction:
  C1: "Intro text"
  C2: (skipped - header)
  C3: "Main content"

[Save to DB as C1, C3]

─────────────────────────────────
SAVE #2: User deletes Para 1
────────────────────────────────
Before extraction:
  Para 1: "[[DETAIL]]"
  Para 2: "Main content"
                    ↓
  After extraction:
  C1: "Main content"  ← RENUMBERED (was C3)

[Delete all old components, insert new C1]

Key insight: Component number is NOT stable across saves
             → Can't use as DB primary key for metadata
```

## 3. UI LAYOUT: CURRENT vs. PROPOSED

```
CURRENT:
┌────────────────────────────────────────┐
│  Header: "Script: Video" | C1, C2, C3..│
├────────────────────────────────────────┤
│ [C1]  ← Decoration    Content Area     │
│        First para...                   │
│ [C2]                                   │
│        [[INTRO]]                       │
│ [C3]                                   │
│        Second para...                  │
│                                        │
└────────────────────────────────────────┘


PROPOSED WITH METADATA SIDEBAR:
┌──────────────────────────────┬──────────────────┐
│  Header                      │                  │
├──────────────────────────────┼──────────────────┤
│ [C1] Content                 │ Component        │
│      First para...           │ Metadata Panel   │
│                              │ ──────────────── │
│ [C2] ← Cursor here           │ Component 1      │
│      [[INTRO]]               │ ──────────────── │
│                              │ Content: "First" │
│ [C3]                         │ Words: 3         │
│      Second para...          │                  │
│                              │ Notes: [edit]    │
│                              │ Status: [draft v]│
│                              │ Reviewed By: [..]│
│                              │                  │
│                              │ [Save] [Cancel]  │
│                              │                  │
└──────────────────────────────┴──────────────────┘
```

## 4. COMPONENT METADATA STORE ARCHITECTURE

```
React Component Tree
        │
        ├─ TipTapEditor (main editor)
        │
        └─ ComponentMetadataPanel
            │
            ├─ useComponentMetadataStore (Zustand)
            │   │
            │   ├─ metadata: Map<number, ComponentMetadata>
            │   │   ├─ 1: { number: 1, notes: "...", status: "draft" }
            │   │   ├─ 2: { number: 2, notes: "...", status: "approved" }
            │   │   └─ 3: { number: 3, notes: "...", status: null }
            │   │
            │   └─ setMetadata(number, data)
            │
            └─ Bound to editor.selection
                │
                ├─ onSelectionChange
                │   └─ extractComponentNumber(selection)
                │
                └─ Display metadata for current component
```

## 5. DATABASE: COMPONENT STORAGE (CURRENT)

```
┌─────────────────────────────┐
│ scripts table               │
├─────────────────────────────┤
│ id: uuid                    │
│ video_id: text              │
│ yjs_state: bytea            │
│ plain_text: text            │
│ component_count: int        │
│ status: enum                │
│ created_at, updated_at      │
└────────────┬────────────────┘
             │ 1:many
             ↓
┌─────────────────────────────────────┐
│ script_components table             │
├─────────────────────────────────────┤
│ id: uuid (PK)                       │
│ script_id: uuid (FK)                │
│ component_number: int               │
│ content: text                       │
│ word_count: int                     │
│ created_at: timestamp               │
└─────────────────────────────────────┘

NOTE: No metadata fields currently
      Direct writes BLOCKED by trigger
      Must use save_script_with_components RPC
```

## 6. DATABASE: PROPOSED EXTENSION (Phase 3)

```
┌─────────────────────────────────────────────────┐
│ component_metadata table (NEW - Phase 3)         │
├─────────────────────────────────────────────────┤
│ id: uuid (PK)                                   │
│ script_id: uuid (FK)                            │
│ component_number: int (part of composite key)   │
│ notes: text (nullable)                          │
│ status: enum ('draft'|'approved'|'review')      │
│ reviewed_by: uuid (FK to user_profiles)         │
│ created_at, updated_at: timestamp               │
│                                                 │
│ COMPOSITE KEY: (script_id, component_number)    │
└─────────────────────────────────────────────────┘

Flow on save:
1. Extract components (renumber)
2. Send to backend with metadata updates
3. Update component_metadata table
4. Keep script_components "clean" (content only)
```

## 7. DECORATOR ENHANCEMENT PATTERN

```
Current ParagraphComponentTracker:
─────────────────────────────────
Decoration.widget(offset, () => {
  const span = document.createElement('span');
  span.className = 'component-label';
  span.setAttribute('data-component', `C${componentNumber}`);
  span.textContent = `C${componentNumber}`;
  return span;
}, { side: -1 });

Result:
  <span class="component-label" data-component="C1">C1</span>


Proposed Enhancement (with metadata):
──────────────────────────────────────
Decoration.widget(offset, () => {
  const metadata = useComponentMetadataStore(s => 
    s.metadata.get(componentNumber)
  );
  
  const span = document.createElement('span');
  span.className = 'component-label';
  span.setAttribute('data-component', `C${componentNumber}`);
  
  // Add visual indicator based on metadata
  if (metadata?.status === 'approved') {
    span.classList.add('component-approved');
  }
  if (metadata?.reviewedBy) {
    span.title = `Reviewed by ${metadata.reviewedBy}`;
  }
  
  span.textContent = `C${componentNumber}`;
  return span;
}, { side: -1 });

Result:
  <span class="component-label component-approved" 
        data-component="C1" 
        title="Reviewed by John">C1</span>
```

## 8. SAVE OPERATION TIMELINE

```
User stops typing
    ↓
    ├─ 0ms: onUpdate fires → extractComponents()
    ├─ 0ms: setSaveStatus('unsaved')
    ├─ 0ms: useEffect watches extractedComponents
    │
    ├─ 2000ms: auto-save timeout fires
    │
    ↓
handleSave() executes
    ├─ plainText = editor.getText()
    ├─ extractedComponents from state
    ├─ call useCurrentScript.save()
    │
    ├─ ~200ms: TanStack Query mutation starts
    │
    ├─ Network: POST to backend
    │
    ├─ ~500-1000ms: Backend validates + saves
    │   ├─ Verify lock
    │   ├─ DELETE old components
    │   ├─ INSERT new components
    │   ├─ UPDATE scripts table
    │
    ├─ ~1200-2000ms: Response received
    ├─ setSaveStatus('saved')
    ├─ loadCommentHighlights() to recover positions
    │
    ↓
User sees "Saved X minutes ago"
```

