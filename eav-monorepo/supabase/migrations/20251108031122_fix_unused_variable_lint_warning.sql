-- ============================================================================
-- Fix: Remove unused variable from update_script_status function
-- ============================================================================
-- Purpose: Fix schema lint warning (unused variable "v_user_role")
-- Reference: Phase B - Drift Detection (supabase db lint quality gate)
-- Impact: No functional change - variable was declared but never used
-- ============================================================================

-- Replace function without v_user_role declaration
CREATE OR REPLACE FUNCTION public.update_script_status(p_script_id uuid, p_new_status text)
 RETURNS SETOF public.scripts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid := (SELECT auth.uid());
    -- REMOVED: v_user_role text; (unused variable - lint warning fix)
BEGIN
    -- Validate status is allowed value (ALL 6 statuses)
    IF p_new_status NOT IN ('pend_start', 'draft', 'in_review', 'rework', 'approved', 'reuse') THEN
        RAISE EXCEPTION 'Invalid status: %. Must be one of: pend_start, draft, in_review, rework, approved, reuse', p_new_status;
    END IF;

    -- Check if user has access to this script
    IF NOT EXISTS (
        SELECT 1 FROM public.user_accessible_scripts uas
        WHERE uas.user_id = v_user_id
        AND uas.script_id = p_script_id
    ) THEN
        RAISE EXCEPTION 'Permission denied: User does not have access to script %', p_script_id
            USING ERRCODE = '42501';
    END IF;

    -- Perform the update on ONLY status and updated_at columns
    UPDATE public.scripts
    SET
        status = p_new_status,
        updated_at = now()
    WHERE id = p_script_id;

    -- Verify update succeeded (script exists)
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Script not found: %', p_script_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Return the updated script row
    RETURN QUERY SELECT * FROM public.scripts WHERE id = p_script_id;
END;
$function$;

-- ============================================================================
-- Validation: supabase db lint should now show "No schema errors found"
-- ============================================================================
