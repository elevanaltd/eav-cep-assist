# Copy Builder - API Specification

**Phase:** D3 (Blueprint Refinement)
**Last Updated:** 2025-11-07

---

## Service Layer Architecture

```
React Components
       ↓
  React Query Hooks (useLibrarySearch, useDraft, etc.)
       ↓
  Service Layer (libraryService, draftService)
       ↓
  Supabase Client (@workspace/shared)
       ↓
  PostgreSQL + RLS Policies
```

---

## Shared Utilities (@workspace/shared)

### Type Safety

**Import database types:**

```typescript
import type { Tables, Inserts, Updates } from '@workspace/shared/types'

// Instead of manual interfaces, use generated types:
type Draft = Tables<'script_builder_drafts'>
type DraftInsert = Inserts<'script_builder_drafts'>
type DraftUpdate = Updates<'script_builder_drafts'>
type LibraryComponent = Tables<'paragraph_library'>
type Video = Tables<'videos'>
```

**Benefits:**
- Auto-generated from Supabase schema
- No manual interface duplication
- Type errors when schema changes
- Single source of truth

### Error Handling

**Import error utilities:**

```typescript
import {
  getUserFriendlyErrorMessage,
  withRetry,
  categorizeError
} from '@workspace/shared/errors'

// Retry operations automatically
export async function search(params: SearchParams) {
  return withRetry(
    () => supabase.from('paragraph_library').select('*'),
    { maxRetries: 3, backoff: 'exponential' }
  );
}

// Display user-friendly messages
try {
  await operation();
} catch (error) {
  const message = getUserFriendlyErrorMessage(error);
  // Show to user in toast/alert
  throw new AppError(message, error);
}
```

**Available utilities:**
- `getUserFriendlyErrorMessage(error)` - Convert technical errors to user-friendly messages
- `withRetry(fn, config)` - Automatic retry with exponential backoff
- `categorizeError(error)` - Categorize errors (network, auth, validation, etc.)
- `useErrorHandling()` - React hook for error handling

### Logging

**Import logger:**

```typescript
import { Logger } from '@workspace/shared/services'

const logger = new Logger('DraftService')

export async function save(draft: Draft) {
  logger.info('Saving draft', { draftId: draft.id });

  try {
    const result = await supabase.from('drafts').insert(draft);
    logger.info('Draft saved successfully', { draftId: draft.id });
    return result;
  } catch (error) {
    logger.error('Draft save failed', { draftId: draft.id, error });
    throw error;
  }
}
```

**Log levels:**
- `logger.debug(message, data)` - Development debugging
- `logger.info(message, data)` - Informational events
- `logger.warn(message, data)` - Warning conditions
- `logger.error(message, data)` - Error conditions

### Supabase Client

**Import singleton client:**

```typescript
import { getClient } from '@workspace/shared/client'

const supabase = getClient()
// Same instance across entire app
```

**Benefits:**
- Singleton pattern enforced
- Configured with environment variables
- Consistent across all EAV apps
- No duplicate initialization

---

## Library Service

**File:** `src/services/libraryService.ts`

### search()

```typescript
interface SearchParams {
  query?: string;
  category?: string;
  sectionType?: string;
  limit?: number;
  offset?: number;
}

interface LibraryComponent {
  id: string;
  content: string;
  component_name: string;
  make_model?: string;
  part?: string;
  section_type?: string;
  product_category?: string;
  times_used: number;
  cataloged_at: string;
}

export async function search(params: SearchParams): Promise<{
  data: LibraryComponent[];
  total: number;
}> {
  const {
    query,
    category,
    sectionType,
    limit = 20,
    offset = 0,
  } = params;

  let queryBuilder = supabase
    .from('paragraph_library')
    .select('*', { count: 'exact' });

  // Full-text search (if query provided)
  if (query) {
    queryBuilder = queryBuilder.textSearch('search_vector', query, {
      type: 'websearch',
      config: 'english',
    });
  }

  // Filter by category
  if (category) {
    queryBuilder = queryBuilder.eq('product_category', category);
  }

  // Filter by section type
  if (sectionType) {
    queryBuilder = queryBuilder.eq('section_type', sectionType);
  }

  // Order by popularity, then recency
  queryBuilder = queryBuilder
    .order('times_used', { ascending: false })
    .order('cataloged_at', { ascending: false });

  // Pagination
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data, error, count } = await queryBuilder;

  if (error) {
    throw new LibrarySearchError(`Failed to search library: ${error.message}`, error);
  }

  return {
    data: data || [],
    total: count || 0,
  };
}
```

**Example Usage:**
```typescript
// Search for "heat pump"
const results = await libraryService.search({
  query: 'heat pump installation',
  limit: 20,
  offset: 0,
});

// Filter by category
const results = await libraryService.search({
  category: 'Heating Systems',
  limit: 20,
});
```

---

### getCategories()

```typescript
export async function getCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('paragraph_library')
    .select('product_category')
    .not('product_category', 'is', null)
    .order('product_category');

  if (error) {
    throw new LibrarySearchError(`Failed to load categories: ${error.message}`, error);
  }

  // Extract unique categories
  const categories = [...new Set(data.map(row => row.product_category))];
  return categories.filter(Boolean) as string[];
}
```

---

### getSectionTypes()

```typescript
export async function getSectionTypes(): Promise<string[]> {
  const { data, error } = await supabase
    .from('paragraph_library')
    .select('section_type')
    .not('section_type', 'is', null)
    .order('section_type');

  if (error) {
    throw new LibrarySearchError(`Failed to load section types: ${error.message}`, error);
  }

  const types = [...new Set(data.map(row => row.section_type))];
  return types.filter(Boolean) as string[];
}
```

---

## Draft Service

**File:** `src/services/draftService.ts`

### list()

```typescript
export async function list(): Promise<Draft[]> {
  const { data, error } = await supabase
    .from('script_builder_drafts')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new DraftError(`Failed to load drafts: ${error.message}`, 'DRAFT_LIST_ERROR');
  }

  return data || [];
}
```

---

### getById()

```typescript
export async function getById(id: string): Promise<Draft> {
  const { data, error } = await supabase
    .from('script_builder_drafts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new DraftNotFoundError(id);
    }
    throw new DraftError(`Failed to load draft: ${error.message}`, 'DRAFT_LOAD_ERROR');
  }

  return data;
}
```

---

### save()

```typescript
export async function save(draft: Partial<Draft>): Promise<Draft> {
  // Validate before save
  const validated = draftSchema.parse(draft);

  const payload = {
    id: validated.id,
    title: validated.title,
    video_id: validated.video_id,
    components: validated.components,
    status: validated.status || 'draft',
    updated_at: new Date().toISOString(),
  };

  // If no ID, this is a new draft
  if (!payload.id) {
    payload.id = crypto.randomUUID();
  }

  const { data, error } = await supabase
    .from('script_builder_drafts')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    throw new DraftSaveError(`Failed to save draft: ${error.message}`, error);
  }

  return data;
}
```

---

### complete()

```typescript
export async function complete(draftId: string): Promise<Copy> {
  // 1. Load draft
  const draft = await getById(draftId);

  if (draft.status === 'completed') {
    throw new DraftCompletionError('Draft already completed');
  }

  if (!draft.title || !draft.video_id || draft.components.length === 0) {
    throw new DraftCompletionError('Draft incomplete: missing title, video, or components');
  }

  // 2. Validate Copy exists and is editable
  const { data: existingCopy, error: copyError } = await supabase
    .from('copy')
    .select('id, status')
    .eq('video_id', draft.video_id)
    .single();

  if (copyError || !existingCopy) {
    throw new DraftCompletionError('No Copy record exists for this video');
  }

  // 3. Check Copy is in editable state via copy_locks
  const { data: lock } = await supabase
    .from('copy_locks')
    .select('status')
    .eq('copy_id', existingCopy.id)
    .single();

  if (lock && lock.status !== 'draft') {
    throw new DraftCompletionError('Copy is locked or not in draft state');
  }

  // 4. Mark draft completed (via RPC to bypass RLS)
  const { error: updateError } = await supabase.rpc('complete_draft', {
    p_draft_id: draftId
  });

  if (updateError) {
    throw new DraftCompletionError(`Failed to mark draft completed: ${updateError.message}`, updateError);
  }

  // 5. Assemble content (batch fetch - no N+1)
  const { plainText, libraryIds } = await assembleContent(draft.components);

  // 6. Update Copy table with assembled plain text
  const { data: copy, error: copyUpdateError } = await supabase
    .from('copy')
    .update({
      content: plainText,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existingCopy.id)
    .select()
    .single();

  if (copyUpdateError) {
    throw new DraftCompletionError(`Failed to update Copy: ${copyUpdateError.message}`, copyUpdateError);
  }

  // 7. (OPTIONAL) Update library component usage
  if (libraryIds.length > 0) {
    const { error: usageError } = await supabase.rpc('increment_component_usage', {
      component_ids: libraryIds,
    });

    if (usageError) {
      console.warn('Failed to update usage counts:', usageError);
      // Non-fatal, Copy already updated
    }
  }

  return copy;
}
```

---

### assembleContent() (Helper - Batch Optimized)

```typescript
interface AssembledContent {
  plainText: string;
  libraryIds: string[];
}

async function assembleContent(components: DraftComponent[]): Promise<AssembledContent> {
  const sortedComponents = [...components].sort((a, b) => a.order - b.order);

  // ✅ BATCH FETCH: Single query for all library components (no N+1)
  const libraryIds = sortedComponents
    .filter((c) => c.type === 'library')
    .map((c) => c.library_id);

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

**Performance improvement:**
- ❌ **OLD:** N queries (1 per library component)
- ✅ **NEW:** 1 query (batch fetch all components)
- **Example:** 20 components: 20 queries → 1 query (20x faster)

---

### deleteDraft()

```typescript
export async function deleteDraft(id: string): Promise<void> {
  const { error } = await supabase
    .from('script_builder_drafts')
    .delete()
    .eq('id', id);

  if (error) {
    throw new DraftError(`Failed to delete draft: ${error.message}`, 'DRAFT_DELETE_ERROR');
  }
}
```

---

## Video Service

**File:** `src/services/videoService.ts`

### getClientVideos()

```typescript
export async function getClientVideos(clientId: string): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('id, title, video_number, status, client_id')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load videos: ${error.message}`);
  }

  return data || [];
}
```

---

## React Query Hooks

**File:** `src/hooks/useLibrarySearch.ts`

```typescript
export function useLibrarySearch(params: SearchParams) {
  return useQuery({
    queryKey: ['library', 'search', params],
    queryFn: () => libraryService.search(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    enabled: true,
  });
}
```

**File:** `src/hooks/useDraft.ts`

```typescript
export function useDraft(id: string | null) {
  return useQuery({
    queryKey: ['drafts', id],
    queryFn: () => (id ? draftService.getById(id) : null),
    enabled: !!id,
  });
}
```

**File:** `src/hooks/useDrafts.ts`

```typescript
export function useDrafts() {
  return useQuery({
    queryKey: ['drafts'],
    queryFn: () => draftService.list(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}
```

**File:** `src/hooks/useSaveDraft.ts`

```typescript
export function useSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: Partial<Draft>) => draftService.save(draft),
    onSuccess: (saved) => {
      // Update cache
      queryClient.setQueryData(['drafts', saved.id], saved);
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
    onError: (error) => {
      console.error('Save failed:', error);
      // Error notification handled by component
    },
  });
}
```

**File:** `src/hooks/useCompleteDraft.ts`

```typescript
export function useCompleteDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draftId: string) => draftService.complete(draftId),
    onSuccess: (copy) => {
      // Invalidate drafts list
      queryClient.invalidateQueries({ queryKey: ['drafts'] });

      // Redirect to Copy-Editor
      const copyEditorUrl = import.meta.env.VITE_COPY_EDITOR_URL;
      window.location.href = `${copyEditorUrl}/copy/${copy.id}/edit`;
    },
    onError: (error) => {
      console.error('Completion failed:', error);
      // Error notification handled by component
    },
  });
}
```

---

## Error Handling Patterns

### Service Layer Errors

```typescript
// errors/DraftError.ts
export class DraftError extends Error {
  constructor(message: string, public code: string, public originalError?: unknown) {
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
  constructor(message: string, originalError?: unknown) {
    super(message, 'DRAFT_SAVE_ERROR', originalError);
  }
}

export class DraftCompletionError extends DraftError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'DRAFT_COMPLETION_ERROR', originalError);
  }
}

export class LibrarySearchError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'LibrarySearchError';
  }
}
```

### Component Error Handling

```typescript
// Component level
function DraftEditor() {
  const { data: draft, error, isLoading } = useDraft(draftId);

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load draft"
        message={getUserFriendlyMessage(error)}
        onRetry={() => queryClient.invalidateQueries(['drafts', draftId])}
      />
    );
  }

  return <DraftEditorContent draft={draft} />;
}
```

---

## Supabase Query Examples

### Full-Text Search with Ranking

```typescript
// Search library with relevance ranking
const { data } = await supabase
  .from('paragraph_library')
  .select(`
    id,
    content,
    component_name,
    times_used,
    ts_rank(search_vector, websearch_to_tsquery('english', '${query}')) as rank
  `)
  .textSearch('search_vector', query, { type: 'websearch', config: 'english' })
  .order('rank', { ascending: false })
  .order('times_used', { ascending: false })
  .limit(20);
```

### Pagination

```typescript
// Load page 2 (offset 20, limit 20)
const { data, count } = await supabase
  .from('paragraph_library')
  .select('*', { count: 'exact' })
  .range(20, 39); // offset 20, limit 20
```

### Filter by Multiple Criteria

```typescript
const { data } = await supabase
  .from('paragraph_library')
  .select('*')
  .eq('product_category', 'Heating Systems')
  .eq('section_type', 'Product Overview')
  .gte('times_used', 5)
  .order('times_used', { ascending: false });
```

---

## Performance Optimizations

### 1. Debounced Search

```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedTerm = useDebouncedValue(searchTerm, 300);

  const { data } = useLibrarySearch({ query: debouncedTerm });

  return <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />;
}
```

### 2. Optimistic Updates

```typescript
const { mutate: saveDraft } = useSaveDraft({
  onMutate: async (newDraft) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries(['drafts', newDraft.id]);

    // Snapshot previous value
    const previous = queryClient.getQueryData(['drafts', newDraft.id]);

    // Optimistically update
    queryClient.setQueryData(['drafts', newDraft.id], newDraft);

    return { previous };
  },
  onError: (err, newDraft, context) => {
    // Rollback on error
    if (context?.previous) {
      queryClient.setQueryData(['drafts', newDraft.id], context.previous);
    }
  },
});
```

### 3. Background Refetching

```typescript
// Refetch stale data in background
const { data } = useLibrarySearch(params, {
  staleTime: 5 * 60 * 1000, // Data fresh for 5 minutes
  cacheTime: 10 * 60 * 1000, // Cache kept for 10 minutes
  refetchOnWindowFocus: true, // Refetch when user returns to tab
});
```

---

## API Testing Strategy

### Unit Tests (Service Layer)

```typescript
// tests/services/draftService.test.ts
describe('draftService.save', () => {
  it('creates new draft with generated ID', async () => {
    const draft = { title: 'Test', components: [] };
    const saved = await draftService.save(draft);

    expect(saved.id).toBeDefined();
    expect(saved.title).toBe('Test');
  });

  it('updates existing draft', async () => {
    const existing = await draftService.save({ title: 'Original' });
    const updated = await draftService.save({ id: existing.id, title: 'Updated' });

    expect(updated.id).toBe(existing.id);
    expect(updated.title).toBe('Updated');
  });

  it('throws validation error for invalid draft', async () => {
    await expect(draftService.save({ title: '' })).rejects.toThrow();
  });
});
```

### Integration Tests (React Query Hooks)

```typescript
// tests/hooks/useSaveDraft.test.ts
describe('useSaveDraft', () => {
  it('updates cache after save', async () => {
    const { result } = renderHook(() => useSaveDraft(), { wrapper: QueryWrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: 'Test Draft' });
    });

    expect(result.current.data?.title).toBe('Test Draft');
  });
});
```

---

## Next Steps

1. **Review BUILD-PLAN.md** for phased implementation tasks
2. **Implement service layer** with TDD (tests first)
3. **Implement React Query hooks** with integration tests
4. **Proceed to B1 gate** for foundation implementation
