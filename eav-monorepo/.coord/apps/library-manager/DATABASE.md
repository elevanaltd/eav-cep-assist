# Library Manager - Database Schema

**Phase:** D3 (Blueprint Refinement)
**Last Updated:** 2025-11-07

---

## Schema Overview

Library Manager **reuses the paragraph_library table** created by Script Builder migration. It adds **two columns to the existing scripts table** to track review status.

**Existing Tables (Created by Script Builder):**
1. `paragraph_library` - Reusable component catalog (full schema in Script Builder DATABASE.md)

**Schema Additions:**
2. `scripts` table - Add library review tracking columns

**No New Tables Required** - Library Manager writes to the same paragraph_library table that Script Builder reads from.

---

## Schema Additions

### scripts table (Add Review Status Columns)

```sql
-- ============================================================================
-- Add library review tracking to scripts table
-- ============================================================================
ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS library_status TEXT DEFAULT 'not_reviewed'
    CHECK (library_status IN ('not_reviewed', 'in_review', 'reviewed')),
  ADD COLUMN IF NOT EXISTS library_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS library_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for review queue queries
CREATE INDEX IF NOT EXISTS idx_scripts_library_status
  ON public.scripts(library_status, status)
  WHERE status = 'approved';

-- Index for reviewer tracking
CREATE INDEX IF NOT EXISTS idx_scripts_library_reviewed_by
  ON public.scripts(library_reviewed_by)
  WHERE library_reviewed_by IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.scripts.library_status IS 'Library cataloging status: not_reviewed (default), in_review (started), reviewed (complete)';
COMMENT ON COLUMN public.scripts.library_reviewed_at IS 'Timestamp when script marked as library-reviewed';
COMMENT ON COLUMN public.scripts.library_reviewed_by IS 'User who marked script as reviewed';
```

**Column Descriptions:**

- **library_status:** Tracks cataloging workflow state
  - `not_reviewed` (default) - Script not yet reviewed for library cataloging
  - `in_review` - Reviewer has opened script (optional status for "claimed" scripts)
  - `reviewed` - Reviewer finished cataloging, script no longer appears in queue

- **library_reviewed_at:** Timestamp for completion tracking and reporting

- **library_reviewed_by:** Audit trail for who performed review (optional for future reporting)

---

## RLS Policy Additions

### scripts table (Library Manager Access)

```sql
-- Policy: Employees can update library_status on approved scripts
CREATE POLICY "Editors can update library status"
  ON public.scripts
  FOR UPDATE
  USING (
    status = 'approved' -- Only approved scripts can be reviewed
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('employee', 'admin')
    )
  )
  WITH CHECK (
    -- Can only update library review fields, not script content
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('employee', 'admin')
    )
  );
```

**Security Notes:**
- Only employees/admins can update library_status (prevents unauthorized cataloging)
- RLS ensures users can only mark approved scripts as reviewed
- Script content (plain_text, yjs_state_vector) cannot be modified via Library Manager

---

## Database Functions

### mark_script_reviewed (Helper Function)

```sql
-- ============================================================================
-- mark_script_reviewed - Update library review status atomically
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_script_reviewed(
  p_script_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user has employee/admin role (double-check beyond RLS)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('employee', 'admin')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to mark script reviewed'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Update library status
  UPDATE public.scripts
  SET
    library_status = 'reviewed',
    library_reviewed_at = NOW(),
    library_reviewed_by = auth.uid()
  WHERE
    id = p_script_id
    AND status = 'approved' -- Must be approved
    AND library_status != 'reviewed'; -- Prevent re-reviewing

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Script not found or already reviewed'
      USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_script_reviewed(UUID) TO authenticated;

COMMENT ON FUNCTION public.mark_script_reviewed IS 'Mark script as library-reviewed (employees/admins only)';
```

**Usage:**
```typescript
// Service layer call
await supabase.rpc('mark_script_reviewed', {
  p_script_id: scriptId
});
```

---

## Migration Script

### UP Migration

**File:** `20251109000000_add_library_manager_columns.sql`

```sql
-- ============================================================================
-- Migration: Add Library Manager columns to scripts table
-- Created: 2025-11-09
-- Depends On: 20251108000000_add_script_builder_tables.sql
-- ============================================================================

-- ============================================================================
-- 1. ALTER EXISTING TABLES
-- ============================================================================

ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS library_status TEXT DEFAULT 'not_reviewed'
    CHECK (library_status IN ('not_reviewed', 'in_review', 'reviewed')),
  ADD COLUMN IF NOT EXISTS library_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS library_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scripts_library_status
  ON public.scripts(library_status, status)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_scripts_library_reviewed_by
  ON public.scripts(library_reviewed_by)
  WHERE library_reviewed_by IS NOT NULL;

-- ============================================================================
-- 2. RLS POLICIES
-- ============================================================================

CREATE POLICY "Editors can update library status"
  ON public.scripts
  FOR UPDATE
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('employee', 'admin')
    )
  )
  WITH CHECK (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('employee', 'admin')
    )
  );

-- ============================================================================
-- 3. FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_script_reviewed(p_script_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('employee', 'admin')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.scripts
  SET
    library_status = 'reviewed',
    library_reviewed_at = NOW(),
    library_reviewed_by = auth.uid()
  WHERE
    id = p_script_id
    AND status = 'approved'
    AND library_status != 'reviewed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Script not found or already reviewed' USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_script_reviewed(UUID) TO authenticated;

-- ============================================================================
-- 4. COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.scripts.library_status IS 'Library cataloging status: not_reviewed, in_review, reviewed';
COMMENT ON COLUMN public.scripts.library_reviewed_at IS 'Timestamp when marked reviewed';
COMMENT ON COLUMN public.scripts.library_reviewed_by IS 'User who marked reviewed';
COMMENT ON FUNCTION public.mark_script_reviewed IS 'Mark script as library-reviewed (employees/admins only)';
```

### DOWN Migration

**File:** `20251109000000_add_library_manager_columns_down.sql`

```sql
-- ============================================================================
-- Migration Rollback: Remove Library Manager columns
-- Created: 2025-11-09
-- ============================================================================

-- Drop function
DROP FUNCTION IF EXISTS public.mark_script_reviewed(UUID);

-- Drop RLS policy
DROP POLICY IF EXISTS "Editors can update library status" ON public.scripts;

-- Revert scripts table changes
ALTER TABLE public.scripts
  DROP COLUMN IF EXISTS library_reviewed_by,
  DROP COLUMN IF EXISTS library_reviewed_at,
  DROP COLUMN IF EXISTS library_status;
```

---

## Common Queries

### 1. Review Queue (Approved Scripts Awaiting Review)

```sql
-- Get scripts needing library review
SELECT
  s.id,
  s.title,
  s.created_at,
  s.library_status,
  v.title AS video_title,
  v.video_number,
  (SELECT COUNT(*) FROM unnest(string_to_array(s.plain_text, E'\n\n')) AS paragraph) AS paragraph_count
FROM public.scripts s
JOIN public.videos v ON v.id = s.video_id
WHERE
  s.status = 'approved'
  AND s.library_status IN ('not_reviewed', 'in_review')
ORDER BY s.created_at DESC;
```

### 2. Paragraph Split (Client-Side)

```javascript
// Split script into paragraphs
const paragraphs = script.plain_text
  .split('\n\n')
  .map(p => p.trim())
  .filter(Boolean);
```

### 3. Duplicate Detection (Content Hash)

```sql
-- Check if content already cataloged
SELECT
  id,
  component_name,
  cataloged_at,
  cataloged_by
FROM public.paragraph_library
WHERE content_hash = calculate_content_hash($1);
```

### 4. Make/Model Auto-Suggest

```sql
-- Get previously used make/model values
SELECT DISTINCT make_model
FROM public.paragraph_library
WHERE
  make_model IS NOT NULL
  AND make_model ILIKE '%' || $1 || '%'
ORDER BY make_model
LIMIT 20;
```

### 5. Mark Script Reviewed

```sql
-- Via RPC function (recommended)
SELECT mark_script_reviewed('xxx-xxx-xxx-xxx');

-- OR direct UPDATE (RLS enforced)
UPDATE public.scripts
SET
  library_status = 'reviewed',
  library_reviewed_at = NOW(),
  library_reviewed_by = auth.uid()
WHERE id = 'xxx-xxx-xxx-xxx';
```

---

## Performance Benchmarks

### Target Query Performance

**Review queue (50 scripts):**
```sql
-- With composite index on (library_status, status)
-- Target: <500ms
EXPLAIN ANALYZE
SELECT s.*, v.title
FROM public.scripts s
JOIN public.videos v ON v.id = s.video_id
WHERE s.status = 'approved' AND s.library_status = 'not_reviewed'
ORDER BY s.created_at DESC
LIMIT 50;

-- Expected: Index Scan using idx_scripts_library_status (actual time=50-100ms)
```

**Duplicate check (content hash):**
```sql
-- With UNIQUE index on content_hash
-- Target: <50ms
EXPLAIN ANALYZE
SELECT id, component_name
FROM public.paragraph_library
WHERE content_hash = 'xxx...xxx';

-- Expected: Index Scan using paragraph_library_content_hash_key (actual time=1-5ms)
```

**Make/model suggestions:**
```sql
-- With B-tree index on make_model
-- Target: <100ms
EXPLAIN ANALYZE
SELECT DISTINCT make_model
FROM public.paragraph_library
WHERE make_model ILIKE '%heat%'
LIMIT 20;

-- Expected: Index Scan + Sort (actual time=20-50ms)
```

---

## Data Validation

### Application-Layer Validation (Zod)

```typescript
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

// Usage
export function validateComponent(data: unknown): ComponentMetadata {
  return componentMetadataSchema.parse(data);
}
```

---

## Shared Resources with Script Builder

**paragraph_library table:**
- Created by Script Builder migration (20251108000000)
- Script Builder: **Reads** (search, reference by ID)
- Library Manager: **Writes** (insert new components)
- Both apps: **Read** access for all authenticated users

**Full-text search indexes:**
- GIN index on `search_vector` column
- Shared by both apps for component search
- Library Manager populates, Script Builder consumes

**RLS policies:**
- Script Builder users: Read-only access to library
- Library Manager users (employees/admins): Read + write access
- Admins: Full access (including delete)

---

## Next Steps

1. **Review API.md** for service layer implementation details
2. **Review UI-SPEC.md** for screen layouts and tagging workflow
3. **Review BUILD-PLAN.md** for migration execution and testing strategy
4. **Proceed to B0 gate** for critical-design-validator schema review
