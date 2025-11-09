# Library Manager - API Specification

**Phase:** D3 (Blueprint Refinement)
**Last Updated:** 2025-11-07

---

## Service Layer Architecture

```
React Components
       ↓
  React Query Hooks (useReviewQueue, useScript, etc.)
       ↓
  Service Layer (scriptService, libraryService)
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
type Script = Tables<'scripts'>
type LibraryComponent = Tables<'paragraph_library'>
type LibraryComponentInsert = Inserts<'paragraph_library'>
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
export async function getReviewQueue() {
  return withRetry(
    () => supabase.from('scripts').select('*'),
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

const logger = new Logger('LibraryService')

export async function catalogComponent(component: ComponentMetadata) {
  logger.info('Cataloging component', { componentName: component.name });

  try {
    const result = await supabase.from('paragraph_library').insert(component);
    logger.info('Component cataloged successfully', { id: result.data?.id });
    return result;
  } catch (error) {
    logger.error('Cataloging failed', { componentName: component.name, error });
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

## Script Service

**File:** `src/services/scriptService.ts`

### getReviewQueue()

```typescript
interface ReviewQueueScript {
  id: string;
  title: string;
  status: string;
  library_status: string;
  created_at: string;
  video: {
    id: string;
    title: string;
    video_number: string;
  };
  paragraph_count: number;
}

export async function getReviewQueue(): Promise<ReviewQueueScript[]> {
  const { data, error } = await supabase
    .from('scripts')
    .select(`
      id,
      title,
      status,
      library_status,
      created_at,
      plain_text,
      videos (
        id,
        title,
        video_number
      )
    `)
    .eq('status', 'approved')
    .in('library_status', ['not_reviewed', 'in_review'])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load review queue: ${error.message}`);
  }

  // Calculate paragraph count client-side
  return (data || []).map(script => ({
    ...script,
    video: script.videos,
    paragraph_count: script.plain_text.split('\n\n').filter(Boolean).length,
  }));
}
```

---

### getScriptForReview()

```typescript
interface ScriptForReview {
  id: string;
  title: string;
  plain_text: string;
  library_status: string;
  video: {
    id: string;
    title: string;
    video_number: string;
  };
  paragraphs: string[];
}

export async function getScriptForReview(id: string): Promise<ScriptForReview> {
  const { data, error } = await supabase
    .from('scripts')
    .select(`
      id,
      title,
      plain_text,
      library_status,
      videos (
        id,
        title,
        video_number
      )
    `)
    .eq('id', id)
    .eq('status', 'approved')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new ScriptNotFoundError(id);
    }
    throw new Error(`Failed to load script: ${error.message}`);
  }

  // Split into paragraphs
  const paragraphs = data.plain_text
    .split('\n\n')
    .map(p => p.trim())
    .filter(Boolean);

  return {
    ...data,
    video: data.videos,
    paragraphs,
  };
}
```

---

### markScriptReviewed()

```typescript
export async function markScriptReviewed(scriptId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_script_reviewed', {
    p_script_id: scriptId,
  });

  if (error) {
    if (error.code === 'insufficient_privilege') {
      throw new InsufficientPermissionError();
    }
    if (error.code === 'no_data_found') {
      throw new Error('Script not found or already reviewed');
    }
    throw new Error(`Failed to mark reviewed: ${error.message}`);
  }
}
```

---

## Library Service

**File:** `src/services/libraryService.ts`

### saveComponent()

```typescript
interface NewLibraryComponent {
  content: string;
  component_name: string;
  make_model?: string;
  part?: string;
  section_type?: string;
  product_category?: string;
  notes?: string;
  source_script_id: string;
  source_paragraph_index: number;
}

export async function saveComponent(data: NewLibraryComponent): Promise<LibraryComponent> {
  // Validate metadata
  const validated = componentMetadataSchema.parse(data);

  // Calculate content hash
  const contentHash = await calculateContentHash(validated.content);

  // Check for duplicates (strict enforcement)
  const duplicate = await checkDuplicate(contentHash);
  if (duplicate) {
    throw new DuplicateContentError(duplicate);
  }

  // Insert component
  const { data: saved, error } = await supabase
    .from('paragraph_library')
    .insert({
      content: validated.content,
      content_hash: contentHash,
      component_name: validated.component_name,
      make_model: validated.make_model,
      part: validated.part,
      section_type: validated.section_type,
      product_category: validated.product_category,
      notes: validated.notes,
      source_script_id: validated.source_script_id,
      source_paragraph_index: validated.source_paragraph_index,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation (content_hash or source location)
      throw new DuplicateContentError({ id: '', component_name: 'Unknown', cataloged_at: '' });
    }
    throw new Error(`Failed to save component: ${error.message}`);
  }

  return saved;
}
```

---

### checkDuplicate()

```typescript
interface DuplicateInfo {
  id: string;
  component_name: string;
  cataloged_at: string;
  cataloged_by_name?: string;
}

async function checkDuplicate(contentHash: string): Promise<DuplicateInfo | null> {
  const { data, error } = await supabase
    .from('paragraph_library')
    .select(`
      id,
      component_name,
      cataloged_at,
      user_profiles (
        display_name
      )
    `)
    .eq('content_hash', contentHash)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No duplicate found
    }
    throw new Error(`Duplicate check failed: ${error.message}`);
  }

  return {
    id: data.id,
    component_name: data.component_name,
    cataloged_at: data.cataloged_at,
    cataloged_by_name: data.user_profiles?.display_name,
  };
}
```

---

### getMakeModelSuggestions()

```typescript
export async function getMakeModelSuggestions(query: string): Promise<string[]> {
  if (query.length < 2) return [];

  const { data, error } = await supabase
    .from('paragraph_library')
    .select('make_model')
    .not('make_model', 'is', null)
    .ilike('make_model', `%${query}%`)
    .order('make_model')
    .limit(20);

  if (error) {
    console.error('Failed to load suggestions:', error);
    return [];
  }

  // Extract unique values
  const unique = [...new Set(data.map(row => row.make_model))];
  return unique.filter(Boolean) as string[];
}
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
    console.error('Failed to load categories:', error);
    return [];
  }

  const unique = [...new Set(data.map(row => row.product_category))];
  return unique.filter(Boolean) as string[];
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
    console.error('Failed to load section types:', error);
    return [];
  }

  const unique = [...new Set(data.map(row => row.section_type))];
  return unique.filter(Boolean) as string[];
}
```

---

### calculateContentHash() (Client-Side)

```typescript
export async function calculateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
```

---

## React Query Hooks

**File:** `src/hooks/useReviewQueue.ts`

```typescript
export function useReviewQueue() {
  return useQuery({
    queryKey: ['scripts', 'review-queue'],
    queryFn: () => scriptService.getReviewQueue(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
```

**File:** `src/hooks/useScriptForReview.ts`

```typescript
export function useScriptForReview(id: string) {
  return useQuery({
    queryKey: ['scripts', 'review', id],
    queryFn: () => scriptService.getScriptForReview(id),
    enabled: !!id,
  });
}
```

**File:** `src/hooks/useSaveComponent.ts`

```typescript
export function useSaveComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewLibraryComponent) => libraryService.saveComponent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
    onError: (error) => {
      if (error instanceof DuplicateContentError) {
        // Component handles showing duplicate warning
        return;
      }
      console.error('Save failed:', error);
    },
  });
}
```

**File:** `src/hooks/useMarkScriptReviewed.ts`

```typescript
export function useMarkScriptReviewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scriptId: string) => scriptService.markScriptReviewed(scriptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts', 'review-queue'] });
    },
  });
}
```

**File:** `src/hooks/useMakeModelSuggestions.ts`

```typescript
export function useMakeModelSuggestions(query: string) {
  return useQuery({
    queryKey: ['library', 'make-models', query],
    queryFn: () => libraryService.getMakeModelSuggestions(query),
    enabled: query.length > 2,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

---

## Error Handling

```typescript
// errors/LibraryError.ts
export class LibraryError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'LibraryError';
  }
}

export class ScriptNotFoundError extends LibraryError {
  constructor(id: string) {
    super(`Script not found: ${id}`, 'SCRIPT_NOT_FOUND');
  }
}

export class DuplicateContentError extends LibraryError {
  constructor(public existing: DuplicateInfo) {
    super('Duplicate content detected', 'DUPLICATE_CONTENT');
  }
}

export class InsufficientPermissionError extends LibraryError {
  constructor() {
    super('You do not have permission to catalog components', 'INSUFFICIENT_PERMISSION');
  }
}
```

---

## Validation Schemas

```typescript
// validation/componentValidation.ts
import { z } from 'zod';

export const componentMetadataSchema = z.object({
  content: z.string().min(1),
  component_name: z.string().min(1).max(200),
  make_model: z.string().max(200).optional(),
  part: z.string().max(100).optional(),
  section_type: z.string().max(100).optional(),
  product_category: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  source_script_id: z.string().uuid(),
  source_paragraph_index: z.number().int().nonnegative(),
});

export type ComponentMetadata = z.infer<typeof componentMetadataSchema>;
```

---

## Supabase Query Examples

### Review Queue with Paragraph Count

```typescript
// Optimized: Load scripts + calculate paragraph count client-side
const { data } = await supabase
  .from('scripts')
  .select('id, title, plain_text, created_at, videos(title, video_number)')
  .eq('status', 'approved')
  .eq('library_status', 'not_reviewed')
  .order('created_at', { ascending: false });

const scriptsWithCount = data.map(s => ({
  ...s,
  paragraph_count: s.plain_text.split('\n\n').filter(Boolean).length,
}));
```

### Duplicate Check (Content Hash)

```typescript
// Fast lookup with UNIQUE index on content_hash
const { data } = await supabase
  .from('paragraph_library')
  .select('id, component_name, cataloged_at')
  .eq('content_hash', contentHash)
  .maybeSingle(); // Returns null if not found

if (data) {
  // Duplicate exists
}
```

### Auto-Suggest Make/Model

```typescript
// With B-tree index on make_model
const { data } = await supabase
  .from('paragraph_library')
  .select('make_model')
  .not('make_model', 'is', null)
  .ilike('make_model', `%${query}%`)
  .limit(20);

const suggestions = [...new Set(data.map(r => r.make_model))];
```

---

## Performance Optimizations

### 1. Debounced Auto-Suggest

```typescript
const [query, setQuery] = useState('');
const debouncedQuery = useDebounced(query, 150);

const { data: suggestions } = useMakeModelSuggestions(debouncedQuery);
```

### 2. Optimistic Updates

```typescript
const { mutate: saveComponent } = useSaveComponent({
  onMutate: async (newComponent) => {
    // Optimistically add to tagged list
    addTaggedParagraph(index, newComponent);
  },
  onError: (err, newComponent, context) => {
    // Rollback optimistic update
    removeTaggedParagraph(index);
  },
});
```

### 3. Cached Category/Section Lists

```typescript
// Load once, cache for 10 minutes
const { data: categories } = useQuery({
  queryKey: ['library', 'categories'],
  queryFn: () => libraryService.getCategories(),
  staleTime: 10 * 60 * 1000,
  cacheTime: 30 * 60 * 1000,
});
```

---

## Testing Strategy

### Unit Tests (Service Layer)

```typescript
describe('libraryService.saveComponent', () => {
  it('saves component with metadata', async () => {
    const component = {
      content: 'Test content',
      component_name: 'Test Component',
      source_script_id: testScriptId,
      source_paragraph_index: 0,
    };

    const saved = await libraryService.saveComponent(component);

    expect(saved.id).toBeDefined();
    expect(saved.content_hash).toBeDefined();
  });

  it('detects duplicate content', async () => {
    const component = { content: 'Duplicate', ... };

    await libraryService.saveComponent(component);

    await expect(
      libraryService.saveComponent(component)
    ).rejects.toThrow(DuplicateContentError);
  });
});
```

### Integration Tests

```typescript
describe('Review workflow', () => {
  it('tags paragraph and marks script reviewed', async () => {
    // Load script
    const script = await scriptService.getScriptForReview(testScriptId);

    // Tag first paragraph
    await libraryService.saveComponent({
      content: script.paragraphs[0],
      component_name: 'Test Component',
      source_script_id: script.id,
      source_paragraph_index: 0,
    });

    // Mark reviewed
    await scriptService.markScriptReviewed(script.id);

    // Verify status updated
    const queue = await scriptService.getReviewQueue();
    expect(queue.find(s => s.id === script.id)).toBeUndefined();
  });
});
```

---

## Next Steps

1. **Review BUILD-PLAN.md** for phased implementation
2. **Implement service layer** with TDD (tests first)
3. **Proceed to B1 gate** for foundation implementation
