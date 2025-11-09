-- Migration: Remove orphaned script_locks DELETE broadcast infrastructure
-- Problem: Migration 20251105020000 was deleted from git but still applied to remote instances
-- Solution: DROP trigger/function/policy created by 20251105020000 to restore consistency
-- Authority: holistic-orchestrator (North Star I12 compliance restoration)
-- Pattern: Proper migration governance - migrate forward with DROP (never delete migration files)

-- Context:
-- - Commit 53e1119 deleted 20251105020000 migration file (MIP enforcement)
-- - Remote Supabase instances (preview branches) still have migration applied
-- - Supabase CLI validation error: "Remote migration versions not found in local"
-- - Solution: Restore migration file + create cleanup migration (this file)
--
-- North Star I12: Single migration source of truth requires complete history
-- Migration files are IMMUTABLE once applied - use DROP migrations to remove objects

-- Drop RLS policy on realtime.messages (if exists)
-- This policy was created to allow authenticated users to receive DELETE broadcasts
DROP POLICY IF EXISTS "authenticated_users_receive_script_lock_deletes" ON realtime.messages;

-- Drop trigger (if exists)
-- This trigger was broadcasting DELETE events via realtime.broadcast_changes()
DROP TRIGGER IF EXISTS script_locks_delete_broadcast_trigger ON script_locks;

-- Drop function (if exists)
-- This function contained the broadcast logic for script_locks DELETE events
DROP FUNCTION IF EXISTS notify_script_lock_deleted();

-- Result: Clean state with no script_lock DELETE broadcast infrastructure
-- - Migration history complete (20251105020000 restored to satisfy CLI)
-- - Orphaned objects removed from all databases (production + preview branches)
-- - MIP intent preserved (accumulative complexity removed)
-- - I12 compliance restored (local migration source matches remote end-state)

-- Constitutional Reference:
-- - North Star I12: Single Supabase migration source of truth
-- - MIP: COMPLETION_THROUGH_SUBTRACTION (remove non-essential elements)
-- - Proper governance: Never delete migrations, always migrate forward
