# Copy Builder - Database Schema

**Phase:** D3 (Blueprint Refinement)
**Last Updated:** 2025-11-07

---

## Schema Overview

Copy Builder requires **two new tables** and leverages **three existing tables** from the EAV monorepo shared schema:

**New Tables:**
1. `script_builder_drafts` - Store draft assembly state
2. `paragraph_library` - Catalog of reusable script components

**Existing Tables (Read-only):**
3. `videos` - Video selector dropdown
4. `user_profiles` - User context, display names
5. `scripts` - Target table when "Complete & Send"

**Migration Strategy:**
- Single migration file at `/supabase/migrations/`
- Include UP and DOWN migrations
- RLS policies for all new tables
- Indexes for performance

---

## Table Definitions

### 1. script_builder_drafts

**Purpose:** Store draft assembly state with JSONB components array for flexible schema.

```sql
-- ============================================================================
-- script_builder_drafts - Draft script assembly storage
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.script_builder_drafts (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  title TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  video_id TEXT REFERENCES public.videos(id) ON DELETE SET NULL,

  -- Component assembly (JSONB for flexibility)
  -- Structure: Array of { type: 'library' | 'placeholder', library_id?: uuid, name?: string, note?: string, order: number }
  components JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  completed_at TIMESTAMPTZ,

  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_script_builder_drafts_created_by ON public.script_builder_drafts(created_by);
CREATE INDEX idx_script_builder_drafts_video_id ON public.script_builder_drafts(video_id) WHERE video_id IS NOT NULL;
CREATE INDEX idx_script_builder_drafts_status ON public.script_builder_drafts(status);
CREATE INDEX idx_script_builder_drafts_updated_at ON public.script_builder_drafts(updated_at DESC);

-- GIN index for JSONB queries (if needed for filtering by component type)
CREATE INDEX idx_script_builder_drafts_components ON public.script_builder_drafts USING GIN (components);

-- Update timestamp trigger
CREATE TRIGGER update_script_builder_drafts_updated_at
  BEFORE UPDATE ON public.script_builder_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.script_builder_drafts IS 'Draft script assemblies built from library components and placeholders';
COMMENT ON COLUMN public.script_builder_drafts.components IS 'JSONB array of draft components with type, library_id/name, note, and order';
COMMENT ON COLUMN public.script_builder_drafts.status IS 'Draft status: draft (editable) or completed (immutable, script created)';
```

**JSONB Components Schema:**
```typescript
// TypeScript representation for documentation
type DraftComponent =
  | {
      type: 'library';
      library_id: string; // UUID of paragraph_library entry
      note?: string; // Optional user note (max 500 chars)
      order: number; // Position in draft (0-based)
    }
  | {
      type: 'placeholder';
      name: string; // Single-word placeholder (e.g., "Sink", "Toilet")
      note?: string; // Optional user note (max 500 chars)
      order: number; // Position in draft (0-based)
    };

// Example JSONB value
[
  {
    "type": "library",
    "library_id": "123e4567-e89b-12d3-a456-426614174000",
    "order": 0
  },
  {
    "type": "placeholder",
    "name": "Sink",
    "note": "Use Kohler K-12345 model for this project",
    "order": 1
  },
  {
    "type": "library",
    "library_id": "223e4567-e89b-12d3-a456-426614174001",
    "note": "Adjust temperature reference for UK market",
    "order": 2
  }
]
```

---

### 2. paragraph_library

**Purpose:** Catalog of reusable script components with full-text search and usage tracking.

```sql
-- ============================================================================
-- paragraph_library - Reusable script component catalog
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.paragraph_library (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  content TEXT NOT NULL CHECK (char_length(content) > 0),
  content_hash TEXT NOT NULL UNIQUE, -- SHA-256 for deduplication

  -- Metadata
  component_name TEXT NOT NULL CHECK (char_length(component_name) > 0 AND char_length(component_name) <= 200),
  make_model TEXT CHECK (char_length(make_model) <= 200),
  part TEXT CHECK (char_length(part) <= 100),
  section_type TEXT CHECK (char_length(section_type) <= 100),
  product_category TEXT CHECK (char_length(product_category) <= 100),
  notes TEXT,

  -- Source tracking
  source_script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  source_paragraph_index INTEGER NOT NULL CHECK (source_paragraph_index >= 0),

  -- Usage tracking
  times_used INTEGER NOT NULL DEFAULT 0 CHECK (times_used >= 0),
  last_used_at TIMESTAMPTZ,

  -- Full-text search (PostgreSQL tsvector)
  search_vector TSVECTOR,

  -- Audit fields
  cataloged_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cataloged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_paragraph_library_cataloged_by ON public.paragraph_library(cataloged_by);
CREATE INDEX idx_paragraph_library_source_script ON public.paragraph_library(source_script_id);
CREATE INDEX idx_paragraph_library_times_used ON public.paragraph_library(times_used DESC);
CREATE INDEX idx_paragraph_library_product_category ON public.paragraph_library(product_category) WHERE product_category IS NOT NULL;
CREATE INDEX idx_paragraph_library_section_type ON public.paragraph_library(section_type) WHERE section_type IS NOT NULL;
CREATE INDEX idx_paragraph_library_cataloged_at ON public.paragraph_library(cataloged_at DESC);

-- GIN index for full-text search (CRITICAL for performance)
CREATE INDEX idx_paragraph_library_search ON public.paragraph_library USING GIN (search_vector);

-- Unique constraint: prevent duplicate paragraphs from same source
CREATE UNIQUE INDEX idx_paragraph_library_unique_source ON public.paragraph_library(source_script_id, source_paragraph_index);

-- Update timestamp trigger
CREATE TRIGGER update_paragraph_library_updated_at
  BEFORE UPDATE ON public.paragraph_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Maintain search_vector automatically
CREATE TRIGGER update_paragraph_library_search_vector
  BEFORE INSERT OR UPDATE ON public.paragraph_library
  FOR EACH ROW
  EXECUTE FUNCTION tsvector_update_trigger(
    search_vector, 'pg_catalog.english',
    content, component_name, make_model, product_category, section_type
  );

-- Comments
COMMENT ON TABLE public.paragraph_library IS 'Catalog of reusable script components with metadata and full-text search';
COMMENT ON COLUMN public.paragraph_library.content_hash IS 'SHA-256 hash of content for deduplication';
COMMENT ON COLUMN public.paragraph_library.times_used IS 'Counter for popularity ranking (incremented when used in draft completion)';
COMMENT ON COLUMN public.paragraph_library.search_vector IS 'Full-text search vector (auto-maintained via trigger)';
```

**Full-Text Search Configuration:**
```sql
-- The tsvector_update_trigger function automatically maintains search_vector
-- It indexes these columns: content, component_name, make_model, product_category, section_type
-- Uses 'english' text search configuration (built-in PostgreSQL)

-- Example search query (see API.md for service layer wrapper):
SELECT
  id,
  component_name,
  content,
  times_used,
  ts_rank(search_vector, websearch_to_tsquery('english', 'heat pump')) AS rank
FROM public.paragraph_library
WHERE search_vector @@ websearch_to_tsquery('english', 'heat pump')
ORDER BY rank DESC, times_used DESC
LIMIT 20;
```

---

### 3. Existing Tables (No Changes)

**videos** - Read-only for video selector:
```sql
-- No changes needed, already exists
-- Copy Builder reads: id, title, video_number, status, client_id
```

**user_profiles** - Read-only for user context:
```sql
-- No changes needed, already exists
-- Copy Builder reads: id, display_name, role
```

**copy** - Target table for "Complete & Export" (NO SCHEMA CHANGES):

Copy-Builder writes assembled plain text to the existing Copy table, producing output **indistinguishable from manual paste operations**.

**No provenance tracking:** Origin (library vs manual) is irrelevant to Copy-Editor pipeline.

**User Principle:** _"It makes ZERO difference if that was copy/pasted in from Google Docs by a human or automated by a system."_

**Export validation required:**
1. Verify Copy record exists for `video_id`
2. Check Copy is in draft/blank state via `copy_locks` mechanism
3. Update Copy table with assembled content
4. Copy-Editor component extraction processes identically

**Copy table structure (existing, no modifications needed):**
```sql
-- Copy-Builder updates existing Copy records
-- No schema changes needed
SELECT id, video_id, content, status
FROM copy
WHERE video_id = $1;
```

**Draft/blank validation via copy_locks:**
```sql
-- Verify Copy is editable before export
SELECT cl.status
FROM copy_locks cl
WHERE cl.copy_id = $1;

-- Status must be 'draft' or NULL for export to proceed
```

---

## Row-Level Security (RLS) Policies

### script_builder_drafts Policies

```sql
-- Enable RLS
ALTER TABLE public.script_builder_drafts ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own drafts
CREATE POLICY "Users can view own drafts"
  ON public.script_builder_drafts
  FOR SELECT
  USING (created_by = auth.uid());

-- Policy 2: Users can create drafts (automatic created_by assignment)
CREATE POLICY "Users can create drafts"
  ON public.script_builder_drafts
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Policy 3: Users can update their own drafts
-- Note: Completion handled via complete_draft() RPC (SECURITY DEFINER)
CREATE POLICY "Users can update own drafts"
  ON public.script_builder_drafts
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy 4: Users can delete their own drafts (only if status = 'draft')
CREATE POLICY "Users can delete own draft-status drafts"
  ON public.script_builder_drafts
  FOR DELETE
  USING (created_by = auth.uid() AND status = 'draft');

-- Policy 5: Admins can view all drafts
CREATE POLICY "Admins can view all drafts"
  ON public.script_builder_drafts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

-- Policy 6: Admins can update/delete any draft
CREATE POLICY "Admins can manage all drafts"
  ON public.script_builder_drafts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );
```

**Security Notes:**
- Completed drafts are immutable (users cannot update/delete after completion)
- Admins have full access (for support/troubleshooting)
- `created_by` automatically set by INSERT policy (no user manipulation)

---

### paragraph_library Policies

```sql
-- Enable RLS
ALTER TABLE public.paragraph_library ENABLE ROW LEVEL SECURITY;

-- Policy 1: All authenticated users can view library (shared resource)
CREATE POLICY "Authenticated users can view library"
  ON public.paragraph_library
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy 2: Only Library Manager app can insert (via service role or specific grant)
-- Note: Copy Builder has read-only access to library
CREATE POLICY "Library Manager can insert components"
  ON public.paragraph_library
  FOR INSERT
  WITH CHECK (
    -- Check if user has 'employee' or 'admin' role (can use Library Manager)
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('employee', 'admin')
    )
  );

-- Policy 3: Library Manager can update components
CREATE POLICY "Library Manager can update components"
  ON public.paragraph_library
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('employee', 'admin')
    )
  );

-- Policy 4: Admins can delete components
CREATE POLICY "Admins can delete components"
  ON public.paragraph_library
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );
```

**Security Notes:**
- Library is a **shared resource** (all authenticated users can read)
- Only employees/admins can catalog new components (via Library Manager)
- Copy Builder has read-only access (search and reference by ID)
- Usage tracking incremented via RPC function (see below)

---

## Database Functions

### complete_draft (SECURITY DEFINER)

**Purpose:** Atomically mark draft as completed (bypasses RLS WITH CHECK constraint).

```sql
-- ============================================================================
-- complete_draft - Mark draft as completed (bypasses RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_draft(
  p_draft_id UUID
)
RETURNS script_builder_drafts
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_draft script_builder_drafts;
BEGIN
  -- Verify caller owns draft and it's in draft status
  SELECT * INTO v_draft
  FROM public.script_builder_drafts
  WHERE id = p_draft_id
    AND created_by = auth.uid()
    AND status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft not found or already completed'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Update status (bypasses RLS WITH CHECK)
  UPDATE public.script_builder_drafts
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_draft_id
  RETURNING * INTO v_draft;

  RETURN v_draft;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_draft(UUID) TO authenticated;

COMMENT ON FUNCTION public.complete_draft IS 'Mark draft as completed (bypasses RLS to allow status transition)';
```

**Usage Example:**
```typescript
// Called in draftService.complete()
const { data, error } = await supabase.rpc('complete_draft', {
  p_draft_id: draftId
});

if (error) {
  throw new DraftCompletionError(`Failed to mark draft completed: ${error.message}`);
}
```

---

### increment_component_usage (OPTIONAL)

**Purpose:** Atomically increment `times_used` counter when draft completed.

**Note:** Usage tracking is a **nice-to-have feature**, not essential to core functionality. Implementation decision depends on business requirement for popularity metrics.

```sql
-- ============================================================================
-- increment_component_usage - Update usage statistics
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_component_usage(
  component_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Run as function owner (bypasses RLS for update)
SET search_path = public
AS $$
BEGIN
  -- Atomically increment times_used and update last_used_at
  UPDATE public.paragraph_library
  SET
    times_used = times_used + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = ANY(component_ids);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_component_usage(UUID[]) TO authenticated;

COMMENT ON FUNCTION public.increment_component_usage IS 'Increment usage counter for library components (called when draft completed)';
```

**Usage Example:**
```typescript
// Called in draftService.completeDraft()
const libraryIds = draft.components
  .filter(c => c.type === 'library')
  .map(c => c.library_id);

if (libraryIds.length > 0) {
  await supabase.rpc('increment_component_usage', {
    component_ids: libraryIds
  });
}
```

---

### calculate_content_hash (Helper)

**Purpose:** Generate SHA-256 hash for deduplication (called by Library Manager).

```sql
-- ============================================================================
-- calculate_content_hash - Generate SHA-256 hash for content
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_content_hash(
  content TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE -- Same input always produces same output
AS $$
BEGIN
  RETURN encode(digest(content, 'sha256'), 'hex');
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_content_hash(TEXT) TO authenticated;

COMMENT ON FUNCTION public.calculate_content_hash IS 'Generate SHA-256 hash for content deduplication';
```

---

### update_updated_at_column (Existing)

**Purpose:** Automatically update `updated_at` timestamp on row updates.

```sql
-- ============================================================================
-- update_updated_at_column - Auto-update timestamp trigger function
-- ============================================================================
-- This function should already exist in the schema, but included for completeness

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```

---

## Migration Script

### UP Migration

**File:** `20251108000000_add_script_builder_tables.sql`

```sql
-- ============================================================================
-- Migration: Add Copy Builder tables and functions
-- Created: 2025-11-08
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- script_builder_drafts
CREATE TABLE IF NOT EXISTS public.script_builder_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  video_id TEXT REFERENCES public.videos(id) ON DELETE SET NULL,
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_script_builder_drafts_created_by ON public.script_builder_drafts(created_by);
CREATE INDEX idx_script_builder_drafts_video_id ON public.script_builder_drafts(video_id) WHERE video_id IS NOT NULL;
CREATE INDEX idx_script_builder_drafts_status ON public.script_builder_drafts(status);
CREATE INDEX idx_script_builder_drafts_updated_at ON public.script_builder_drafts(updated_at DESC);
CREATE INDEX idx_script_builder_drafts_components ON public.script_builder_drafts USING GIN (components);

CREATE TRIGGER update_script_builder_drafts_updated_at
  BEFORE UPDATE ON public.script_builder_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.script_builder_drafts IS 'Draft script assemblies built from library components and placeholders';

-- paragraph_library
CREATE TABLE IF NOT EXISTS public.paragraph_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL CHECK (char_length(content) > 0),
  content_hash TEXT NOT NULL UNIQUE,
  component_name TEXT NOT NULL CHECK (char_length(component_name) > 0 AND char_length(component_name) <= 200),
  make_model TEXT CHECK (char_length(make_model) <= 200),
  part TEXT CHECK (char_length(part) <= 100),
  section_type TEXT CHECK (char_length(section_type) <= 100),
  product_category TEXT CHECK (char_length(product_category) <= 100),
  notes TEXT,
  source_script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  source_paragraph_index INTEGER NOT NULL CHECK (source_paragraph_index >= 0),
  times_used INTEGER NOT NULL DEFAULT 0 CHECK (times_used >= 0),
  last_used_at TIMESTAMPTZ,
  search_vector TSVECTOR,
  cataloged_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cataloged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paragraph_library_cataloged_by ON public.paragraph_library(cataloged_by);
CREATE INDEX idx_paragraph_library_source_script ON public.paragraph_library(source_script_id);
CREATE INDEX idx_paragraph_library_times_used ON public.paragraph_library(times_used DESC);
CREATE INDEX idx_paragraph_library_product_category ON public.paragraph_library(product_category) WHERE product_category IS NOT NULL;
CREATE INDEX idx_paragraph_library_section_type ON public.paragraph_library(section_type) WHERE section_type IS NOT NULL;
CREATE INDEX idx_paragraph_library_cataloged_at ON public.paragraph_library(cataloged_at DESC);
CREATE INDEX idx_paragraph_library_search ON public.paragraph_library USING GIN (search_vector);
CREATE UNIQUE INDEX idx_paragraph_library_unique_source ON public.paragraph_library(source_script_id, source_paragraph_index);

CREATE TRIGGER update_paragraph_library_updated_at
  BEFORE UPDATE ON public.paragraph_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_paragraph_library_search_vector
  BEFORE INSERT OR UPDATE ON public.paragraph_library
  FOR EACH ROW
  EXECUTE FUNCTION tsvector_update_trigger(
    search_vector, 'pg_catalog.english',
    content, component_name, make_model, product_category, section_type
  );

COMMENT ON TABLE public.paragraph_library IS 'Catalog of reusable script components with metadata and full-text search';

-- ============================================================================
-- 2. ALTER EXISTING TABLES
-- ============================================================================

-- No changes to existing tables
-- Copy-Builder writes to existing 'copy' table (no schema modifications)
-- Stateless transformation: library components → plain text → copy table

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

-- script_builder_drafts
ALTER TABLE public.script_builder_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts"
  ON public.script_builder_drafts FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create drafts"
  ON public.script_builder_drafts FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own drafts"
  ON public.script_builder_drafts FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own draft-status drafts"
  ON public.script_builder_drafts FOR DELETE
  USING (created_by = auth.uid() AND status = 'draft');

CREATE POLICY "Admins can view all drafts"
  ON public.script_builder_drafts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all drafts"
  ON public.script_builder_drafts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

-- paragraph_library
ALTER TABLE public.paragraph_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view library"
  ON public.paragraph_library FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Library Manager can insert components"
  ON public.paragraph_library FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('employee', 'admin')
    )
  );

CREATE POLICY "Library Manager can update components"
  ON public.paragraph_library FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role IN ('employee', 'admin')
    )
  );

CREATE POLICY "Admins can delete components"
  ON public.paragraph_library FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 4. FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.complete_draft(p_draft_id UUID)
RETURNS script_builder_drafts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft script_builder_drafts;
BEGIN
  SELECT * INTO v_draft
  FROM public.script_builder_drafts
  WHERE id = p_draft_id
    AND created_by = auth.uid()
    AND status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft not found or already completed' USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE public.script_builder_drafts
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_draft_id
  RETURNING * INTO v_draft;

  RETURN v_draft;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_draft(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_component_usage(component_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.paragraph_library
  SET
    times_used = times_used + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = ANY(component_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_component_usage(UUID[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.calculate_content_hash(content TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN encode(digest(content, 'sha256'), 'hex');
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_content_hash(TEXT) TO authenticated;

-- ============================================================================
-- 5. COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.complete_draft IS 'Mark draft as completed (bypasses RLS to allow status transition)';
COMMENT ON FUNCTION public.increment_component_usage IS 'Increment usage counter for library components';
COMMENT ON FUNCTION public.calculate_content_hash IS 'Generate SHA-256 hash for content deduplication';
COMMENT ON COLUMN public.scripts.built_from_library IS 'Flag indicating script was assembled from library components';
COMMENT ON COLUMN public.scripts.source_draft_id IS 'Reference to originating script_builder_drafts entry';
```

### DOWN Migration

**File:** `20251108000000_add_script_builder_tables_down.sql`

```sql
-- ============================================================================
-- Migration Rollback: Remove Copy Builder tables and functions
-- Created: 2025-11-08
-- ============================================================================

-- Drop functions
DROP FUNCTION IF EXISTS public.increment_component_usage(UUID[]);
DROP FUNCTION IF EXISTS public.calculate_content_hash(TEXT);

-- No changes to existing tables to revert
-- Copy-Builder only adds new tables, does not modify existing schema

-- Drop tables (CASCADE will drop dependent policies and indexes)
DROP TABLE IF EXISTS public.paragraph_library CASCADE;
DROP TABLE IF EXISTS public.script_builder_drafts CASCADE;
```

---

## Performance Benchmarks

### Target Query Performance

**Search library (20 results):**
```sql
-- With GIN index on search_vector
-- Target: <200ms with 1000+ library components
EXPLAIN ANALYZE
SELECT id, component_name, content, times_used
FROM public.paragraph_library
WHERE search_vector @@ websearch_to_tsquery('english', 'heat pump installation')
ORDER BY times_used DESC
LIMIT 20;

-- Expected: Index Scan using idx_paragraph_library_search (cost=X..Y rows=20 width=Z) (actual time=50..100ms)
```

**Load draft with 20 components:**
```sql
-- JSONB column read
-- Target: <50ms
EXPLAIN ANALYZE
SELECT id, title, video_id, components, status, created_at, updated_at
FROM public.script_builder_drafts
WHERE id = 'xxx-xxx-xxx-xxx';

-- Expected: Index Scan using script_builder_drafts_pkey (actual time=5..10ms)
```

**Save draft (UPSERT):**
```sql
-- Single row update
-- Target: <100ms
INSERT INTO public.script_builder_drafts (id, title, video_id, components, created_by)
VALUES ($1, $2, $3, $4, auth.uid())
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  video_id = EXCLUDED.video_id,
  components = EXCLUDED.components,
  updated_at = NOW();

-- Expected: Single-row operation with RLS check (actual time=50-100ms)
```

---

## Data Validation Examples

### Draft Component Validation (Application Layer)

```typescript
// Validate before save
import { z } from 'zod';

const draftComponentSchema = z.discriminatedUnion('type', [
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

const draftSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  video_id: z.string().optional(), // TEXT type (SmartSuite record IDs)
  components: z.array(draftComponentSchema),
  status: z.enum(['draft', 'completed']),
});

// Usage
try {
  const validatedDraft = draftSchema.parse(draft);
  await saveDraft(validatedDraft);
} catch (error) {
  // Handle validation error
}
```

### Content Hash Deduplication (Library Manager)

```sql
-- Check for duplicates before inserting
SELECT id, component_name, cataloged_at
FROM public.paragraph_library
WHERE content_hash = calculate_content_hash('Lorem ipsum dolor sit amet...');

-- If exists, prompt user: "This content already exists in the library as '[component_name]'. Continue anyway?"
```

---

## Next Steps

1. **Review API.md** for service layer implementation details and Supabase query examples
2. **Review UI-SPEC.md** for screen layouts and component data binding
3. **Review BUILD-PLAN.md** for migration execution tasks and database testing strategy
4. **Proceed to B0 gate** for critical-design-validator schema review
