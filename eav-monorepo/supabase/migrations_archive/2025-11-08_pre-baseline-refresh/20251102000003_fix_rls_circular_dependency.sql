-- ================================================
-- RLS Circular Dependency Fix
-- Generated: 2025-11-02
-- Authority: supabase-expert (BLOCKING authority for database integrity)
-- ================================================
--
-- PROBLEM:
-- RLS circular dependency causing infinite recursion on Comment INSERT:
--   1. Comment INSERT → Scripts FK validation
--   2. Scripts FK queries scripts table
--   3. Scripts RLS policy fires → queries user_accessible_scripts view
--   4. View queries scripts table → RLS policy fires AGAIN → INFINITE RECURSION
--
-- SYMPTOM:
-- Comment creation with authenticated client returns 500 error:
-- "infinite recursion detected in policy for relation scripts"
--
-- SOLUTION:
-- Create SECURITY DEFINER helper function that checks script access WITHOUT
-- triggering RLS policies (using SET row_security = off within function scope).
-- This breaks the circular dependency while maintaining access control.
--
-- SECURITY VALIDATION:
-- - Function is SECURITY DEFINER but ONLY checks access, never modifies data
-- - Access control logic preserved (admin/employee/client role checks)
-- - RLS policies still enforce authorization on direct queries
-- - No new security holes introduced (same logic, different execution path)
-- ================================================

-- ================================================
-- STEP 1: Create SECURITY DEFINER helper function
-- ================================================
-- This function replicates user_accessible_scripts view logic
-- but executes WITHOUT triggering RLS policies on scripts table.
CREATE OR REPLACE FUNCTION public.user_has_script_access(
  p_user_id UUID,
  p_script_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with function owner's privileges (bypasses RLS)
SET search_path = public, pg_temp -- Security: prevent schema injection
SET row_security = off -- CRITICAL: Disable RLS within this function scope
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Get user's role (bypasses RLS on user_profiles)
  SELECT up.role INTO v_user_role
  FROM public.user_profiles up
  WHERE up.id = p_user_id;

  -- If user not found, deny access
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admin and employee have access to all scripts (per North Star "Internal" definition)
  IF v_user_role IN ('admin', 'employee') THEN
    RETURN TRUE;
  END IF;

  -- Client users: check if script is in their assigned projects
  IF v_user_role = 'client' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_clients uc
      JOIN public.projects p ON uc.client_filter = p.client_filter
      JOIN public.videos v ON p.eav_code = v.eav_code
      JOIN public.scripts s ON v.id = s.video_id
      WHERE uc.user_id = p_user_id
        AND s.id = p_script_id
    );
  END IF;

  -- Unknown role or other cases: deny access
  RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users (RLS policies call this)
GRANT EXECUTE ON FUNCTION public.user_has_script_access(UUID, UUID) TO authenticated;

-- Security note: This function is safe as SECURITY DEFINER because:
-- 1. It only performs READ operations (no modifications)
-- 2. It returns only BOOLEAN (no data leakage)
-- 3. It replicates exact logic from user_accessible_scripts view
-- 4. Access control rules remain identical (admin/employee/client checks)

COMMENT ON FUNCTION public.user_has_script_access(UUID, UUID) IS 'SECURITY DEFINER helper function to check script access WITHOUT triggering RLS policies. Breaks circular dependency: Comment INSERT → Scripts FK → Scripts RLS → user_accessible_scripts view → Scripts query (LOOP). Used by scripts table RLS policy to validate access during FK constraint checks. Replicates user_accessible_scripts view logic but executes with row_security = off.';

-- ================================================
-- STEP 2: Replace scripts RLS policy to use helper function
-- ================================================
-- Drop existing policy that causes circular dependency
DROP POLICY IF EXISTS "realtime_select_simple" ON public.scripts;

-- Create new policy using SECURITY DEFINER helper function
-- This policy enforces the SAME access control rules but without circular dependency
CREATE POLICY "realtime_select_simple" ON public.scripts
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_script_access(auth.uid(), id)
  );

COMMENT ON POLICY "realtime_select_simple" ON public.scripts IS 'Enforces script access control using user_has_script_access() helper function. Replaced direct user_accessible_scripts view query to break RLS circular dependency. Access rules unchanged: admin/employee see all scripts, clients see only assigned projects.';

-- ================================================
-- VALIDATION QUERIES (for testing)
-- ================================================
-- Uncomment to test after migration:

-- Test 1: Admin user can access all scripts
-- SET LOCAL role = 'authenticated';
-- SET LOCAL request.jwt.claims = '{"sub": "admin-user-id", "role": "admin"}';
-- SELECT public.user_has_script_access('admin-user-id', 'any-script-id');
-- Expected: TRUE

-- Test 2: Client user can access assigned script
-- SET LOCAL request.jwt.claims = '{"sub": "client-user-id", "role": "client"}';
-- SELECT public.user_has_script_access('client-user-id', 'assigned-script-id');
-- Expected: TRUE

-- Test 3: Client user CANNOT access unassigned script
-- SET LOCAL request.jwt.claims = '{"sub": "client-user-id", "role": "client"}';
-- SELECT public.user_has_script_access('client-user-id', 'unassigned-script-id');
-- Expected: FALSE

-- Test 4: Comment INSERT works without infinite recursion
-- INSERT INTO comments (script_id, content, start_position, end_position, user_id)
-- VALUES ('test-script-id', 'Test comment', 0, 5, auth.uid());
-- Expected: SUCCESS (no 500 error, no infinite recursion)

-- ================================================
-- ADR-003 COMPLIANCE
-- ================================================
-- ✅ Backwards compatible: Adds new function, modifies existing policy
-- ✅ Additive pattern: New helper function supplements existing access control
-- ✅ Zero downtime: Policy replacement is atomic (DROP + CREATE in same transaction)
-- ✅ Rollback safe: Can revert to original policy if needed
-- ✅ No breaking changes: Access control logic remains identical
-- ✅ Production ready: Tested on local Supabase, validated security model
-- ================================================
