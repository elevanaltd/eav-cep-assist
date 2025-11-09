# Copy Builder - Architecture

**Phase:** D3 (Blueprint Refinement)
**Last Updated:** 2025-11-07

---

## System Overview

Copy Builder is a **component assembly application** that enables writers to construct scripts by combining cataloged library components with placeholders. The architecture emphasizes clear separation between assembly (Copy Builder) and editing (copy-editor), with read-only component display and draft-based workflow.

### Core Architecture Pattern

```
ASSEMBLY PHASE (Copy Builder)        EDITING PHASE (copy-editor)
┌─────────────────────────┐            ┌──────────────────────────┐
│ Library Search          │            │ TipTap Rich Editor       │
│ Drag & Drop Components  │───────────▶│ Full Text Editing        │
│ Add Placeholders        │ Complete   │ Formatting Controls      │
│ Attach Notes            │ & Send     │ Collaboration Features   │
│ Auto-save Drafts        │            │ Component Extraction     │
└─────────────────────────┘            └──────────────────────────┘
         │                                       │
         └───────────────┬───────────────────────┘
                         ▼
                  Supabase Database
              (Single source of truth)
```

### Architectural Principles

1. **Stateless Transformation** - Library components → Plain text → Copy table (no provenance tracking)
2. **Read-Only Component Display** - No TipTap editor in Copy Builder, components shown as preview cards
3. **Draft-Based Workflow** - All work saved as drafts until "Complete & Export"
4. **Immutable Completion** - Once completed, drafts cannot be edited (redirects to Copy-Editor)
5. **Component Reuse** - Library components referenced by ID, not duplicated
6. **Optimistic UI** - Immediate visual feedback with background persistence
7. **Batch Query Optimization** - Single query for all library components (no N+1 pattern)

**Core Principle:** Copy-Builder produces plain text output **indistinguishable from manual input**.

**User Clarification:** _"It makes ZERO difference if that was copy/pasted in from Google Docs by a human or automated by a system."_

**Why No Provenance:**
- Origin tracking adds complexity without functional benefit
- Copy-Editor processes all copy identically (library-assembled or manually pasted)
- Maintains stateless architecture pattern
- Simpler implementation and fewer database dependencies

---

## Component Tree

```
App (Router, Auth, QueryClient)
│
├─ Layout
│  ├─ Navigation (AppHeader)
│  └─ Main Content Area
│
├─ Routes
│  ├─ /drafts (DraftsList)
│  │  ├─ DraftCard[]
│  │  └─ NewDraftButton
│  │
│  ├─ /drafts/new (DraftEditor)
│  │  ├─ DraftHeader
│  │  │  ├─ TitleInput
│  │  │  ├─ VideoSelector
│  │  │  ├─ SaveIndicator
│  │  │  └─ ActionButtons (Save, Complete)
│  │  │
│  │  ├─ LayoutContainer (3-column)
│  │  │  │
│  │  │  ├─ LibrarySidebar (left, 300px)
│  │  │  │  ├─ SearchBar
│  │  │  │  ├─ FilterControls
│  │  │  │  ├─ ResultsList
│  │  │  │  │  └─ LibraryComponentCard[] (draggable)
│  │  │  │  └─ Pagination
│  │  │  │
│  │  │  ├─ DraftCanvas (center, flex-1)
│  │  │  │  ├─ DropZone
│  │  │  │  ├─ DraftComponentCard[] (droppable, sortable)
│  │  │  │  │  ├─ ComponentPreview
│  │  │  │  │  ├─ ComponentMeta (type, source info)
│  │  │  │  │  ├─ NoteButton & NoteEditor
│  │  │  │  │  ├─ ReorderButtons (up/down)
│  │  │  │  │  └─ DeleteButton
│  │  │  │  └─ EmptyState
│  │  │  │
│  │  │  └─ PlaceholderPanel (right, 250px)
│  │  │     ├─ PlaceholderInput
│  │  │     ├─ AddPlaceholderButton
│  │  │     └─ PlaceholderHints
│  │  │
│  │  └─ KeyboardShortcuts (Esc to close note, Cmd+S to save)
│  │
│  └─ /drafts/:id/edit (same as /new but loads existing)
│
└─ Providers
   ├─ AuthProvider (@workspace/shared)
   ├─ QueryClientProvider (React Query)
   └─ DndContext (@dnd-kit)
```

---

## Shared Component Usage

**From @workspace/shared v0.5.0:**

### 1. Header Component

```typescript
import { Header } from '@workspace/shared'

// Usage in App.tsx
<Header
  title="Copy Builder"
  userEmail={user?.email}
  lastSaved={lastSaved}
  onSettings={handleSettings}
/>
```

**Features:**
- Consistent header across all EAV apps
- Fixed 3-column layout (Title | Save Status | User Controls)
- Auto-formats save time (2s ago, 3m ago, 2h ago, etc.)
- Responsive layout
- Accessibility built-in

### 2. Database Types

```typescript
import type { Tables, Inserts, Updates } from '@workspace/shared/types'

type Draft = Tables<'script_builder_drafts'>
type DraftInsert = Inserts<'script_builder_drafts'>
type DraftUpdate = Updates<'script_builder_drafts'>
type LibraryComponent = Tables<'paragraph_library'>
```

**Benefits:**
- Auto-generated from Supabase schema
- Ensures type safety across apps
- Single source of truth
- No manual interface definitions needed

### 3. Auth Context

```typescript
import { AuthContext, useAuth } from '@workspace/shared/auth'

function App() {
  return (
    <AuthContext>
      <Routes />
    </AuthContext>
  )
}

function SomeComponent() {
  const { user, signOut } = useAuth()
  // user has full type safety from Supabase auth
}
```

### 4. Error Handling

```typescript
import {
  getUserFriendlyErrorMessage,
  withRetry,
  useErrorHandling
} from '@workspace/shared/errors'

// Retry failed operations
const data = await withRetry(() => fetchData(), { maxRetries: 3 })

// Display user-friendly messages
catch (error) {
  const message = getUserFriendlyErrorMessage(error)
  toast.error(message)
}
```

### 5. Supabase Client

```typescript
import { getClient } from '@workspace/shared/client'

const supabase = getClient()
// Singleton pattern - same instance across app
```

### 6. Logger Service

```typescript
import { Logger } from '@workspace/shared/services'

const logger = new Logger('DraftService')

logger.info('Draft saved', { draftId })
logger.error('Save failed', { error })
```

---

## Data Flow Diagrams

### 1. Draft Creation & Editing Flow

```
User Action                 UI Layer              Service Layer           Database
───────────────────────────────────────────────────────────────────────────────────
Create New Draft
  │
  ├─▶ Click "New Draft"
  │     │
  │     ├─▶ Navigate /drafts/new
  │     │     │
  │     │     └─▶ Initialize empty draft     ────▶ (No DB call yet)
  │           state in memory
  │
Add Library Component
  │
  ├─▶ Search library
  │     │
  │     ├─▶ LibrarySearch.tsx
  │     │     │
  │     │     └─▶ useLibrarySearch()         ────▶ SELECT paragraph_library
  │               (React Query)                      WHERE content @@ search
  │                                                  ORDER BY times_used DESC
  │                                                  LIMIT 20
  │
  ├─▶ Drag component to canvas
  │     │
  │     ├─▶ DndContext handles drag
  │     │     │
  │     │     └─▶ Update draft.components[]   (Optimistic update)
  │               (local state)
  │                 │
  │                 └─▶ Trigger auto-save     ────▶ UPSERT script_builder_drafts
  │                     (debounced 2s)                SET components = $1
  │                                                    WHERE id = $2
  │
Add Placeholder
  │
  ├─▶ Type name, click Add
  │     │
  │     ├─▶ PlaceholderPanel.tsx
  │     │     │
  │     │     └─▶ Update draft.components[]   (Optimistic update)
  │               (push placeholder)
  │                 │
  │                 └─▶ Trigger auto-save     ────▶ UPSERT script_builder_drafts
  │
Attach Note to Component
  │
  ├─▶ Click note icon
  │     │
  │     ├─▶ Show NoteEditor
  │     │     │
  │     │     └─▶ Update component.note       (Optimistic update)
  │                 │
  │                 └─▶ Trigger auto-save     ────▶ UPSERT script_builder_drafts
  │
Complete & Send
  │
  ├─▶ Click "Complete & Send"
  │     │
  │     ├─▶ Validation (title, components)
  │     │     │
  │     │     ├─▶ useDraftCompletion()        ────▶ 1. UPDATE drafts
  │     │           │                                   SET status='completed'
  │     │           │
  │     │           └─▶ createScriptFromDraft() ────▶ 2. INSERT scripts
  │     │                 │                              (assemble content)
  │     │                 │
  │     │                 └─▶ 3. UPDATE paragraph_library
  │     │                       (increment times_used)
  │     │
  │     └─▶ Redirect to copy-editor
  │         https://eav-copy-editor.vercel.app/scripts/{id}/edit
```

### 2. Library Component Search Flow

```
User Input              UI Component            Service Layer          Database Query
──────────────────────────────────────────────────────────────────────────────────────
Type search query
  │
  ├─▶ SearchBar (debounced 300ms)
  │     │
  │     └─▶ useLibrarySearch({ query, filters })
  │           │
  │           ├─▶ React Query cache check
  │           │     │
  │           │     ├─ Cache Hit  ────▶ Return cached results
  │           │     │
  │           │     └─ Cache Miss
  │           │           │
  │           │           └─▶ libraryService.search() ────▶ SELECT
  │           │                 │                            pl.*,
  │           │                 │                            ts_rank(search_vector, query) as rank
  │           │                 │                          FROM paragraph_library pl
  │           │                 │                          WHERE
  │           │                 │                            search_vector @@ websearch_to_tsquery($1)
  │           │                 │                            [AND filters]
  │           │                 │                          ORDER BY rank DESC, times_used DESC
  │           │                 │                          LIMIT 20 OFFSET $2;
  │           │                 │
  │           │                 └─▶ Return results
  │           │
  │           └─▶ Update UI with results
  │                 │
  │                 └─▶ Render LibraryComponentCard[]
  │
Apply filters
  │
  ├─▶ FilterControls (category, section_type)
  │     │
  │     └─▶ Update query params
  │           │
  │           └─▶ Re-run useLibrarySearch()  (same flow as above)
  │
Pagination
  │
  ├─▶ Click "Next Page"
  │     │
  │     └─▶ Increment offset
  │           │
  │           └─▶ useLibrarySearch({ offset: 20 })
```

### 3. Auto-Save Flow (Optimistic UI Pattern)

```
User Change           UI State              Auto-save Queue         Database
────────────────────────────────────────────────────────────────────────────────
Modify draft
  │
  ├─▶ Add/remove/reorder component
  │     │
  │     ├─▶ Update local state (Zustand)  (Instant UI feedback)
  │     │     │
  │     │     ├─▶ Display SaveIndicator: "Saving..."
  │     │     │
  │     │     └─▶ Queue save operation (debounced 2s)
  │     │           │
  │     │           └─▶ Wait for debounce...
  │     │                 │
  │     │                 └─▶ Execute save mutation  ────▶ UPSERT script_builder_drafts
  │     │                       │                            SET
  │     │                       │                              title = $1,
  │     │                       │                              components = $2::jsonb,
  │     │                       │                              updated_at = NOW()
  │     │                       │                            WHERE id = $3
  │     │                       │                            RETURNING *;
  │     │                       │
  │     │                       ├─▶ Success
  │     │                       │     │
  │     │                       │     └─▶ Update SaveIndicator: "Saved"
  │     │                       │           (fade out after 2s)
  │     │                       │
  │     │                       └─▶ Error
  │     │                             │
  │     │                             ├─▶ Show error notification
  │     │                             │
  │     │                             └─▶ SaveIndicator: "Error - Retry?"
  │     │                                   (manual retry button)
  │
Rapid changes (within 2s)
  │
  ├─▶ Change 1  ──▶ Queue save (debounce timer starts)
  ├─▶ Change 2  ──▶ Cancel previous timer, restart
  ├─▶ Change 3  ──▶ Cancel previous timer, restart
  │     │
  │     └─▶ 2s elapses without new change
  │           │
  │           └─▶ Execute single save with final state
```

---

## State Management Strategy

### Local UI State (Zustand Store)

**Purpose:** Manage draft editing session, optimistic updates, UI state (modals, panels).

```typescript
// stores/useDraftStore.ts
interface DraftStore {
  // Draft state
  currentDraft: Draft | null;
  isDirty: boolean;
  lastSaved: Date | null;

  // UI state
  isNoteEditorOpen: boolean;
  selectedComponentIndex: number | null;

  // Actions
  setDraft: (draft: Draft) => void;
  addComponent: (component: DraftComponent) => void;
  removeComponent: (index: number) => void;
  reorderComponent: (fromIndex: number, toIndex: number) => void;
  updateComponentNote: (index: number, note: string) => void;
  addPlaceholder: (name: string) => void;
  markSaved: () => void;
  reset: () => void;
}
```

**Why Zustand:**
- Lightweight (no providers, direct imports)
- TypeScript-first
- Optimistic updates with simple state transitions
- Easy to test (plain functions)

### Server State (React Query)

**Purpose:** Fetch, cache, and synchronize server data.

```typescript
// hooks/useLibrarySearch.ts
function useLibrarySearch(params: SearchParams) {
  return useQuery({
    queryKey: ['library', 'search', params],
    queryFn: () => libraryService.search(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

// hooks/useDraft.ts
function useDraft(id: string | null) {
  return useQuery({
    queryKey: ['drafts', id],
    queryFn: () => draftService.getById(id!),
    enabled: !!id,
  });
}

// hooks/useSaveDraft.ts
function useSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: Draft) => draftService.save(draft),
    onSuccess: (saved) => {
      queryClient.setQueryData(['drafts', saved.id], saved);
    },
    onError: (error) => {
      // Show error notification
    },
  });
}

// hooks/useCompleteDraft.ts
function useCompleteDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draftId: string) => {
      const script = await draftService.complete(draftId);
      return script;
    },
    onSuccess: (script) => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      // Redirect to copy-editor
      window.location.href = `https://eav-copy-editor.vercel.app/scripts/${script.id}/edit`;
    },
  });
}
```

**Why React Query:**
- Automatic caching and background refetching
- Optimistic updates with rollback
- Request deduplication
- Pagination support
- Proven pattern from copy-editor

---

## Integration Points

### 1. Read Operations

**From `paragraph_library` table:**
```typescript
// Service: libraryService.ts
export async function search(params: SearchParams): Promise<LibraryComponent[]> {
  const { data, error } = await supabase
    .from('paragraph_library')
    .select('*')
    .textSearch('search_vector', params.query, {
      type: 'websearch',
      config: 'english',
    })
    .order('times_used', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) throw new DatabaseError(error);
  return data;
}
```

**From `videos` table:**
```typescript
// For video selector dropdown
export async function getClientVideos(clientId: string): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('id, title, video_number, status')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw new DatabaseError(error);
  return data;
}
```

### 2. Write Operations

**To `script_builder_drafts` table:**
```typescript
// Auto-save draft
export async function saveDraft(draft: Draft): Promise<Draft> {
  const { data, error } = await supabase
    .from('script_builder_drafts')
    .upsert({
      id: draft.id,
      title: draft.title,
      video_id: draft.video_id,
      components: draft.components, // JSONB array
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new DatabaseError(error);
  return data;
}
```

**To `copy` table (completion):**
```typescript
// Complete draft & update Copy table
export async function completeDraft(draftId: string): Promise<Copy> {
  // 1. Mark draft completed
  const { data: draft, error: draftError } = await supabase
    .from('script_builder_drafts')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .select()
    .single();

  if (draftError) throw new DatabaseError(draftError);

  // 2. Validate Copy exists and is editable
  const { data: existingCopy, error: copyError } = await supabase
    .from('copy')
    .select('id, status')
    .eq('video_id', draft.video_id)
    .single();

  if (copyError || !existingCopy) {
    throw new Error('No Copy record exists for this video');
  }

  // Check via copy_locks if Copy is editable (draft/blank state)
  const { data: lock } = await supabase
    .from('copy_locks')
    .select('status')
    .eq('copy_id', existingCopy.id)
    .single();

  if (lock && lock.status !== 'draft') {
    throw new Error('Copy is locked or not in draft state');
  }

  // 3. Assemble content from components (batch fetch - no N+1)
  const content = await assembleContent(draft.components);

  // 4. Update Copy table with assembled plain text
  const { data: copy, error: copyUpdateError } = await supabase
    .from('copy')
    .update({
      content: content.plainText,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existingCopy.id)
    .select()
    .single();

  if (copyUpdateError) throw new DatabaseError(copyUpdateError);

  // 5. (OPTIONAL) Update library component usage counts
  // Only if business requirement confirmed for popularity metrics
  const libraryIds = draft.components
    .filter(c => c.type === 'library')
    .map(c => c.library_id);

  if (libraryIds.length > 0) {
    await supabase.rpc('increment_component_usage', {
      component_ids: libraryIds
    });
  }

  return copy;
}

// Helper: Assemble content with BATCH fetch (no N+1 query problem)
async function assembleContent(components: DraftComponent[]): Promise<{
  plainText: string;
  libraryIds: string[];
}> {
  const sortedComponents = [...components].sort((a, b) => a.order - b.order);

  // ✅ BATCH FETCH: Single query for all library components (no N+1)
  const libraryIds = sortedComponents
    .filter(c => c.type === 'library')
    .map(c => c.library_id);

  const { data: libraryComponents } = await supabase
    .from('paragraph_library')
    .select('id, content')
    .in('id', libraryIds);

  // Create lookup map for O(1) access
  const contentMap = new Map(
    libraryComponents?.map(lc => [lc.id, lc.content]) || []
  );

  // Assemble paragraphs in order
  const paragraphs = sortedComponents.map(component => {
    if (component.type === 'library') {
      let text = contentMap.get(component.library_id) || '[Missing component]';

      // Append note if present
      if (component.note) {
        text += `\n\n(NOTE: ${component.note})`;
      }

      return text;
    } else if (component.type === 'placeholder') {
      let text = component.name || '[Placeholder]';

      // Append note if present
      if (component.note) {
        text += `\n\n(NOTE: ${component.note})`;
      }

      return text;
    }
    return '';
  });

  // Join with double newlines (paragraph separation)
  const plainText = paragraphs.filter(p => p).join('\n\n');

  return { plainText, libraryIds };
}
```

### 3. External Integration (Copy-Editor)

**Export destination: Copy table (NOT scripts table)**

Copy-Builder writes assembled plain text to the existing Copy table. Copy-Editor processes this content identically to manually pasted text.

**Redirect after completion:**
```typescript
// After successful Copy update
const copyId = updatedCopy.id;
const videoId = draft.video_id;
const copyEditorUrl = import.meta.env.VITE_COPY_EDITOR_URL;
const editorUrl = `${copyEditorUrl}/copy/${copyId}/edit`;

// Redirect to Copy-Editor
window.location.href = editorUrl;
```

**Copy-Editor processes identically:**
- Library-assembled copy → Component extraction → Editable TipTap document
- Manually pasted copy → Component extraction → Editable TipTap document
- **NO special handling** based on origin (origin is irrelevant)

**Environment variables:**
```bash
# .env
VITE_COPY_EDITOR_URL=https://eav-copy-editor.vercel.app

# .env.local (development)
VITE_COPY_EDITOR_URL=http://localhost:5173
```

---

## Error Handling Strategy

### Error Hierarchy

```typescript
// errors/DraftError.ts
export class DraftError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'DraftError';
  }
}

export class DraftNotFoundError extends DraftError {
  constructor(id: string) {
    super(`Draft not found: ${id}`, 'DRAFT_NOT_FOUND');
  }
}

export class DraftSaveError extends DraftError {
  constructor(message: string, public originalError?: unknown) {
    super(message, 'DRAFT_SAVE_ERROR');
  }
}

export class DraftCompletionError extends DraftError {
  constructor(message: string, public originalError?: unknown) {
    super(message, 'DRAFT_COMPLETION_ERROR');
  }
}

export class LibrarySearchError extends DraftError {
  constructor(message: string, public originalError?: unknown) {
    super(message, 'LIBRARY_SEARCH_ERROR');
  }
}
```

### Error Boundaries

```typescript
// components/ErrorBoundary.tsx
export function DraftErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>{error.message}</p>
          <button onClick={resetError}>Try again</button>
          <button onClick={() => window.location.href = '/drafts'}>
            Back to drafts
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### User-Facing Error Messages

```typescript
// utils/errorMessages.ts
export function getUserFriendlyMessage(error: Error): string {
  if (error instanceof DraftNotFoundError) {
    return 'This draft could not be found. It may have been deleted.';
  }

  if (error instanceof DraftSaveError) {
    return 'Unable to save draft. Check your connection and try again.';
  }

  if (error instanceof DraftCompletionError) {
    return 'Unable to complete draft. Ensure all required fields are filled.';
  }

  if (error instanceof LibrarySearchError) {
    return 'Unable to search library. Check your connection and try again.';
  }

  // Generic fallback
  return 'An unexpected error occurred. Please try again or contact support.';
}
```

---

## Performance Considerations

### Optimization Targets

1. **Library Search:** <200ms for 20 results (with full-text search index)
2. **Drag & Drop:** <16ms frame time (60fps), no jank
3. **Auto-save:** <500ms database round-trip
4. **Complete & Send:** <1s total (draft update + script creation + redirect)

### Performance Strategies

**1. Search Optimization:**
- PostgreSQL GIN index on `search_vector` column
- React Query caching (5-minute stale time)
- Debounced search input (300ms)
- Pagination (20 results per page)

**2. Drag & Drop Optimization:**
- Use `@dnd-kit` sensors with pointer events (better performance than mouse events)
- Virtual scrolling if component list exceeds 50 items (use `react-window`)
- Avoid re-rendering entire list on drag (use stable keys)

**3. Auto-save Optimization:**
- Debounced saves (2-second delay)
- Optimistic UI updates (instant feedback)
- Single UPSERT operation (not multiple queries)
- JSONB column for components (no JOIN queries needed)

**4. Component Rendering:**
- Memoize library component cards (`React.memo`)
- Use `key` prop correctly (stable IDs, not array indexes)
- Lazy load component previews if content exceeds 500 chars

### Monitoring

```typescript
// utils/performance.ts
export function measureOperation(name: string, fn: () => Promise<void>) {
  const start = performance.now();

  return fn().finally(() => {
    const duration = performance.now() - start;

    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation: ${name} took ${duration}ms`);
    }

    // Send to monitoring service (e.g., Sentry)
    if (import.meta.env.PROD) {
      // sendPerformanceMetric(name, duration);
    }
  });
}
```

---

## Security Considerations

### RLS Policy Enforcement

All database queries automatically enforced by Supabase RLS policies:

1. **draft reads:** User must have access to draft's associated video (via client)
2. **draft writes:** User must be creator OR have admin role
3. **library reads:** All authenticated users (library is shared resource)
4. **script creation:** User must have access to target video

### Data Validation

```typescript
// validation/draftValidation.ts
import { z } from 'zod';

export const draftComponentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('library'),
    library_id: z.string().uuid(),
    note: z.string().max(500).optional(),
    order: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('placeholder'),
    name: z.string().min(1).max(50),
    note: z.string().max(500).optional(),
    order: z.number().int().nonnegative(),
  }),
]);

export const draftSchema = z.object({
  id: z.string().uuid().optional(), // Draft ID (UUID generated by Supabase)
  title: z.string().min(1).max(200),
  video_id: z.string().optional(), // SmartSuite video ID (TEXT, not UUID)
  components: z.array(draftComponentSchema),
  status: z.enum(['draft', 'completed']),
});

// Usage
export function validateDraft(draft: unknown): Draft {
  return draftSchema.parse(draft);
}
```

### Input Sanitization

```typescript
// No HTML sanitization needed (no rich text input)
// But validate string lengths and patterns

export function sanitizePlaceholderName(name: string): string {
  // Remove whitespace, special chars (allow only alphanumeric, hyphen, underscore)
  return name
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .slice(0, 50);
}

export function sanitizeNote(note: string): string {
  // Trim whitespace, limit length
  return note.trim().slice(0, 500);
}
```

---

## Testing Strategy

### Test Pyramid

```
           ╱╲
          ╱  ╲
         ╱ E2E╲         5% - Critical user journeys
        ╱──────╲
       ╱        ╲
      ╱Integration╲     15% - Component integration, data flows
     ╱────────────╲
    ╱              ╲
   ╱  Unit Tests    ╲   80% - Business logic, utilities, hooks
  ╱────────────────╲
```

### Test Categories

**1. Unit Tests (80%):**
- Service layer functions (search, save, complete)
- Validation functions
- Error handling
- Utility functions (assembleScriptContent, sanitization)
- Custom hooks (useLibrarySearch, useDraft, etc.)

**2. Integration Tests (15%):**
- Component interactions with real Supabase (test database)
- Drag & drop flows
- Auto-save behavior
- Complete & Send flow (draft → script creation)

**3. E2E Tests (5%):**
- Full user journey: Search → Drag → Add placeholder → Complete → Redirect
- Error recovery scenarios
- Performance regression checks

### TDD Workflow (North Star I7)

```bash
# RED: Write failing test first
git add tests/draftService.test.ts
git commit -m "TEST: Add draft save validation"

# GREEN: Implement minimal code to pass
git add src/services/draftService.ts
git commit -m "FEAT: Implement draft save with validation"

# REFACTOR: Improve while tests pass
git add src/services/draftService.ts
git commit -m "REFACTOR: Extract validation to separate function"
```

---

## Deployment Architecture

### Build Output

```
dist/
├── index.html          # Entry point
├── assets/
│   ├── index-[hash].js   # Main bundle (React, Router, Query, DnD)
│   ├── index-[hash].css  # Tailwind output
│   └── ...              # Code-split chunks
└── manifest.json       # PWA manifest (optional)
```

### Environment Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable'],
        },
      },
    },
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
    'import.meta.env.VITE_SCRIPTS_WEB_URL': JSON.stringify(process.env.VITE_SCRIPTS_WEB_URL),
  },
});
```

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "pnpm install --frozen-lockfile",
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "VITE_SCRIPTS_WEB_URL": "https://eav-copy-editor.vercel.app"
  }
}
```

### Independent Deployment (North Star I11)

- Separate Vercel project: `eav-copy-builder`
- No runtime dependencies on other apps
- Shares Supabase instance (database layer)
- Uses `@workspace/shared` (build-time only, bundled into output)
- Can deploy without coordinating with copy-editor, library-manager, etc.

---

## Next Steps

1. **Review DATABASE.md** for complete table schemas and RLS policies
2. **Review UI-SPEC.md** for detailed screen layouts and component specifications
3. **Review API.md** for service layer contracts and Supabase query details
4. **Review BUILD-PLAN.md** for phased implementation tasks and effort estimates
5. **Proceed to B0 gate** for critical-design-validator review
