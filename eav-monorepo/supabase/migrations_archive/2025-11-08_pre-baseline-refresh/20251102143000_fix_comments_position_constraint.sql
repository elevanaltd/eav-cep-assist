-- Fix comments position constraint to allow zero-length anchors
--
-- BUG: Original constraint CHECK (end_position > start_position) blocks zero-length anchors
-- FIX: Change to >= to allow zero-length anchors (cam-op-pwa use case)
--
-- Application-level validation (requireAnchors capability) controls whether
-- zero-length anchors are acceptable for each app:
-- - scripts-web: requireAnchors=true → enforces non-zero length
-- - cam-op-pwa: requireAnchors=false → allows zero-length (script-level comments)
--
-- Phase: Phase 2 capability-config implementation
-- Tests affected: 5 failing tests in capability-config.test.ts

-- Drop the old constraint
ALTER TABLE "public"."comments"
  DROP CONSTRAINT IF EXISTS "check_position_range";

-- Add the new constraint (allow equality for zero-length anchors)
ALTER TABLE "public"."comments"
  ADD CONSTRAINT "check_position_range"
  CHECK (("end_position" >= "start_position"));

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT "check_position_range" ON "public"."comments" IS
  'Allows zero-length anchors (end_position = start_position) for script-level comments. Application validation (requireAnchors capability) controls whether zero-length anchors are allowed per app.';
