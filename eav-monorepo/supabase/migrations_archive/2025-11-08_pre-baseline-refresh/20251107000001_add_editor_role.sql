-- ============================================================================
-- Migration: Add 'editor' role to user_profiles (FUTURE-PROOFING)
-- Created: 2025-11-07
-- Purpose: Future-proofs constraint for edit-web app (Phase 4+)
-- Context: Library Manager/Script Builder use 'employee' role for now
--          (script editors ARE employees). The 'editor' role will be
--          needed later for edit-web video editing workflows.
-- Note: This migration adds the role but current apps use 'employee'.
-- ============================================================================

-- Remove existing role constraint
ALTER TABLE "public"."user_profiles"
  DROP CONSTRAINT IF EXISTS "user_profiles_role_check";

-- Add updated constraint including 'editor'
ALTER TABLE "public"."user_profiles"
  ADD CONSTRAINT "user_profiles_role_check"
  CHECK ("role" = ANY (ARRAY['admin'::"text", 'client'::"text", 'employee'::"text", 'editor'::"text"]));

-- Comment for documentation
COMMENT ON CONSTRAINT "user_profiles_role_check" ON "public"."user_profiles"
  IS 'Allowed roles: admin, client, employee, editor. Editor role added 2025-11-07 for future edit-web app. Current apps (Library Manager, Script Builder) use employee role for script editing workflows.';
