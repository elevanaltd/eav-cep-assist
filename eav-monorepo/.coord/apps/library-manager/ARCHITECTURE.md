# Library Manager - Architecture

**Phase:** D3 (Blueprint Refinement)
**Last Updated:** 2025-11-07

---

## System Overview

Library Manager is a **content curation application** that enables reviewers to catalog reusable components from approved scripts. The architecture emphasizes efficient batch tagging workflows, content deduplication, and searchable metadata organization.

### Core Architecture Pattern

```
CURATION WORKFLOW (Library Manager)
┌──────────────────────────────┐
│ Review Queue                 │
│ (Approved scripts)           │
│         ↓                    │
│ Paragraph Selection          │
│ (Click to tag)               │
│         ↓                    │
│ Metadata Tagging             │
│ (Component name, make/model) │
│         ↓                    │
│ Save to Library              │
│ (Deduplication check)        │
│         ↓                    │
│ Mark Script Reviewed         │
└──────────────────────────────┘
         ↓
  Supabase Database
  paragraph_library table
         ↓
  Available in Script Builder
```

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
│  ├─ /review-queue (ReviewQueue)
│  │  ├─ ScriptCard[] (list of approved scripts)
│  │  └─ FilterControls (status filter, search)
│  │
│  ├─ /review/:scriptId (ScriptReview)
│  │  ├─ ScriptHeader
│  │  │  ├─ ScriptMetadata (title, video, status)
│  │  │  └─ ReviewProgress (N tagged / M paragraphs)
│  │  │
│  │  ├─ ReviewContainer (2-column)
│  │  │  │
│  │  │  ├─ ParagraphList (left, 60%)
│  │  │  │  ├─ ParagraphCard[] (clickable)
│  │  │  │  │  ├─ ParagraphContent (plain text)
│  │  │  │  │  ├─ SelectButton
│  │  │  │  │  ├─ TaggingForm (inline, expandable)
│  │  │  │  │  └─ DeduplicationWarning (if duplicate detected)
│  │  │  │
│  │  │  └─ ReviewSidebar (right, 40%)
│  │  │     ├─ TaggedComponentsList (preview)
│  │  │     ├─ QuickMetadata (common make/models)
│  │  │     └─ MarkReviewedButton
│  │  │
│  │  └─ KeyboardShortcuts (N for next, T to tag, Esc to collapse)
│  │
│  └─ /library (LibraryBrowser)
│     ├─ SearchBar (full-text search)
│     ├─ FilterControls (category, make/model)
│     ├─ ComponentGrid (masonry layout)
│     │  └─ LibraryComponentCard[] (display only)
│     └─ Pagination
│
└─ Providers
   ├─ AuthProvider (@workspace/shared)
   └─ QueryClientProvider (React Query)
```

---

## Shared Component Usage

**From @workspace/shared v0.5.0:**

### 1. Header Component

```typescript
import { Header } from '@workspace/shared'

// Usage in App.tsx
<Header
  title="Library Manager"
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

### 2. AutocompleteField Component

```typescript
import { AutocompleteField } from '@workspace/shared'

<AutocompleteField
  value={makeModel}
  onChange={setMakeModel}
  getSuggestions={async (term) => {
    const { data } = await supabase
      .from('paragraph_library')
      .select('make_model')
      .ilike('make_model', `%${term}%`)
      .limit(10);
    return data?.map(r => r.make_model).filter(Boolean) || [];
  }}
  placeholder="e.g., Kohler K-12345"
  label="Make/Model"
/>
```

**Features:**
- Auto-complete dropdown
- Debounced search (300ms)
- Keyboard navigation (↑↓ arrows, Enter, Esc)
- Loading states
- Accessible (ARIA labels)

### 3. Database Types

```typescript
import type { Tables, Inserts, Updates } from '@workspace/shared/types'

type Script = Tables<'scripts'>
type LibraryComponent = Tables<'paragraph_library'>
type LibraryComponentInsert = Inserts<'paragraph_library'>
```

**Benefits:**
- Auto-generated from Supabase schema
- Ensures type safety across apps
- Single source of truth
- No manual interface definitions needed

### 4. Auth Context

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

### 5. Error Handling

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

### 6. Supabase Client

```typescript
import { getClient } from '@workspace/shared/client'

const supabase = getClient()
// Singleton pattern - same instance across app
```

### 7. Logger Service

```typescript
import { Logger } from '@workspace/shared/services'

const logger = new Logger('LibraryService')

logger.info('Component cataloged', { componentId })
logger.error('Cataloging failed', { error })
```

---

## Data Flow Diagrams

### Script Review Flow

```
User Action              UI Layer              Service Layer           Database
──────────────────────────────────────────────────────────────────────────────
Load review queue
  │
  ├─▶ Navigate /review-queue
  │     │
  │     └─▶ useReviewQueue()         ────▶ SELECT scripts
  │           (React Query)                   WHERE status='approved'
  │                                           AND library_status='not_reviewed'
  │
Select script
  │
  ├─▶ Click [Review]
  │     │
  │     ├─▶ Navigate /review/{id}
  │     │     │
  │     │     └─▶ useScript(id)       ────▶ SELECT scripts WHERE id = $1
  │               (loads script + paragraphs)
  │
Tag paragraph
  │
  ├─▶ Click paragraph → Expand tagging form
  │     │
  │     ├─▶ Auto-suggest make/models   ────▶ SELECT DISTINCT make_model
  │     │                                      FROM paragraph_library
  │     │                                      WHERE make_model ILIKE '%{query}%'
  │     │
  │     ├─▶ Type metadata (component name, make/model, category)
  │     │
  │     ├─▶ Click [Save to Library]
  │     │     │
  │     │     ├─▶ Check for duplicate    ────▶ SELECT FROM paragraph_library
  │     │     │   (content hash)                WHERE content_hash = $1
  │     │     │
  │     │     ├─▶ If duplicate: Show warning
  │     │     │   "This content already cataloged as..."
  │     │     │   [Cancel] [Save Anyway]
  │     │     │
  │     │     └─▶ Save component        ────▶ INSERT INTO paragraph_library
  │     │           (if confirmed)              (content, component_name, metadata...)
  │     │                                       RETURNING *
  │
Mark reviewed
  │
  ├─▶ Click [Mark Script Reviewed]
  │     │
  │     └─▶ updateScriptStatus()       ────▶ UPDATE scripts
  │                                            SET library_status='reviewed',
  │                                                library_reviewed_at=NOW()
  │                                            WHERE id = $1
  │
Browse library
  │
  ├─▶ Navigate /library
  │     │
  │     ├─▶ Search components
  │     │     │
  │     │     └─▶ useLibrarySearch()    ────▶ SELECT * FROM paragraph_library
  │                                            WHERE search_vector @@ query
  │                                            ORDER BY times_used DESC
  │
  └─▶ Filter by category/make
        │
        └─▶ useLibrarySearch(filters) ────▶ SELECT * WHERE category = $1
```

---

## State Management Strategy

### Local UI State (Zustand)

```typescript
interface ReviewStore {
  // Review session state
  currentScriptId: string | null;
  selectedParagraphIndex: number | null;
  expandedForms: Set<number>; // Which tagging forms are open
  taggedParagraphs: Map<number, LibraryComponent>; // Preview

  // Actions
  selectParagraph: (index: number) => void;
  expandForm: (index: number) => void;
  collapseForm: (index: number) => void;
  addTaggedParagraph: (index: number, component: LibraryComponent) => void;
  clearSession: () => void;
}
```

### Server State (React Query)

```typescript
// Review queue
function useReviewQueue() {
  return useQuery({
    queryKey: ['scripts', 'review-queue'],
    queryFn: () => scriptService.getReviewQueue(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Script details
function useScript(id: string) {
  return useQuery({
    queryKey: ['scripts', id],
    queryFn: () => scriptService.getById(id),
    enabled: !!id,
  });
}

// Make/model suggestions
function useMakeModelSuggestions(query: string) {
  return useQuery({
    queryKey: ['library', 'make-models', query],
    queryFn: () => libraryService.getMakeModelSuggestions(query),
    enabled: query.length > 2,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Save component
function useSaveComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (component: NewLibraryComponent) => libraryService.saveComponent(component),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      // Show success notification
    },
  });
}
```

---

## Integration Points

### 1. Read Operations (Review Queue)

```typescript
// Get scripts awaiting review
export async function getReviewQueue(): Promise<Script[]> {
  const { data, error } = await supabase
    .from('scripts')
    .select('*, videos(id, title, video_number)')
    .eq('status', 'approved')
    .in('library_status', ['not_reviewed', 'in_review'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}
```

### 2. Read Operations (Script Content)

```typescript
// Get script with paragraphs
export async function getScriptWithParagraphs(id: string): Promise<{
  script: Script;
  paragraphs: string[];
}> {
  const { data: script, error } = await supabase
    .from('scripts')
    .select('*, videos(id, title)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);

  // Split plain_text into paragraphs (double newline separator)
  const paragraphs = script.plain_text
    .split('\n\n')
    .map(p => p.trim())
    .filter(Boolean);

  return { script, paragraphs };
}
```

### 3. Write Operations (Save Component)

```typescript
// Save tagged paragraph to library
export async function saveComponent(data: NewLibraryComponent): Promise<LibraryComponent> {
  // 1. Calculate content hash
  const contentHash = await calculateHash(data.content);

  // 2. Check for duplicates
  const { data: existing } = await supabase
    .from('paragraph_library')
    .select('id, component_name, cataloged_at')
    .eq('content_hash', contentHash)
    .single();

  if (existing && !data.allowDuplicate) {
    throw new DuplicateContentError(existing);
  }

  // 3. Insert component
  const { data: saved, error } = await supabase
    .from('paragraph_library')
    .insert({
      content: data.content,
      content_hash: contentHash,
      component_name: data.component_name,
      make_model: data.make_model,
      part: data.part,
      section_type: data.section_type,
      product_category: data.product_category,
      notes: data.notes,
      source_script_id: data.source_script_id,
      source_paragraph_index: data.source_paragraph_index,
      cataloged_by: (await supabase.auth.getUser()).data.user!.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return saved;
}
```

### 4. Update Operations (Mark Reviewed)

```typescript
// Mark script as reviewed
export async function markScriptReviewed(scriptId: string): Promise<void> {
  const { error } = await supabase
    .from('scripts')
    .update({
      library_status: 'reviewed',
      library_reviewed_at: new Date().toISOString(),
    })
    .eq('id', scriptId);

  if (error) throw new Error(error.message);
}
```

---

## Performance Considerations

### Optimization Targets

1. **Review Queue Load:** <500ms for 50 scripts
2. **Script Paragraph Display:** <200ms for 50-paragraph script
3. **Metadata Auto-Suggest:** <100ms for make/model dropdown
4. **Save Component:** <500ms including deduplication check
5. **Library Browse:** <200ms for 20 components (same as Script Builder)

### Performance Strategies

**1. Paragraph Rendering:**
- Virtualize long scripts (>50 paragraphs) with `react-window`
- Memoize ParagraphCard components
- Lazy render tagging forms (only when expanded)

**2. Auto-Suggest Optimization:**
- Cache make/model list in React Query (10-minute stale time)
- Debounce input (150ms)
- Limit results to 20 suggestions

**3. Deduplication Check:**
- Hash calculation client-side (crypto.subtle.digest)
- Single DB query for duplicate check (indexed on content_hash)
- Show warning immediately (no save attempt unless confirmed)

**4. Library Browse:**
- Reuse Script Builder's search implementation
- Same GIN indexes apply
- Same pagination strategy (20 per page)

---

## Error Handling

```typescript
// Duplicate content error
export class DuplicateContentError extends Error {
  constructor(public existing: { id: string; component_name: string; cataloged_at: string }) {
    super('This content already exists in the library');
    this.name = 'DuplicateContentError';
  }
}

// Insufficient permission error
export class InsufficientPermissionError extends Error {
  constructor() {
    super('You do not have permission to catalog components');
    this.name = 'InsufficientPermissionError';
  }
}

// Component error handling
function TaggingForm({ paragraph, scriptId, index }: Props) {
  const { mutate: saveComponent, error, isLoading } = useSaveComponent();

  const handleSave = (data: FormData) => {
    saveComponent(
      { ...data, source_script_id: scriptId, source_paragraph_index: index },
      {
        onSuccess: () => {
          showNotification('Component saved to library');
          collapseForm();
        },
        onError: (err) => {
          if (err instanceof DuplicateContentError) {
            setShowDuplicateWarning(true);
          } else {
            showErrorNotification(getUserFriendlyMessage(err));
          }
        },
      }
    );
  };

  // ...
}
```

---

## Security Considerations

### RLS Policy Enforcement

**Library Manager specific policies:**
1. Only users with 'employee' or 'admin' role can INSERT into paragraph_library
2. Only users with 'employee' or 'admin' role can UPDATE scripts.library_status
3. All authenticated users can READ paragraph_library (shared resource)

**See DATABASE.md for complete RLS policy definitions.**

### Content Validation

```typescript
// Metadata validation
export const componentMetadataSchema = z.object({
  component_name: z.string().min(1).max(200),
  make_model: z.string().max(200).optional(),
  part: z.string().max(100).optional(),
  section_type: z.string().max(100).optional(),
  product_category: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

// Usage
function validateMetadata(data: unknown): ComponentMetadata {
  return componentMetadataSchema.parse(data);
}
```

---

## Testing Strategy

### Test Pyramid (Same as Script Builder)

```
           ╱╲
          ╱  ╲
         ╱ E2E╲         5% - Full review workflow
        ╱──────╲
       ╱        ╲
      ╱Integration╲     15% - Component interactions, DB
     ╱────────────╲
    ╱              ╲
   ╱  Unit Tests    ╲   80% - Service layer, validation
  ╱────────────────╲
```

### TDD Workflow (North Star I7)

```bash
# RED: Write failing test first
git commit -m "TEST: Add duplicate detection test"

# GREEN: Implement minimal code
git commit -m "FEAT: Implement duplicate detection"

# REFACTOR: Improve while tests pass
git commit -m "REFACTOR: Extract hash calculation to utility"
```

---

## Deployment Architecture

### Independent Deployment (North Star I11)

- Separate Vercel project: `eav-library-manager`
- No runtime dependencies on Script Builder or copy-editor
- Shares Supabase instance (database layer)
- Uses `@workspace/shared` (build-time only, bundled into output)

### Environment Configuration

```bash
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Vercel Configuration

```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "pnpm install --frozen-lockfile"
}
```

---

## Next Steps

1. **Review DATABASE.md** for schema additions (scripts.library_status columns)
2. **Review UI-SPEC.md** for detailed screen layouts and interaction flows
3. **Review API.md** for service layer contracts and query details
4. **Review BUILD-PLAN.md** for phased implementation tasks
5. **Proceed to B0 gate** for critical-design-validator review
