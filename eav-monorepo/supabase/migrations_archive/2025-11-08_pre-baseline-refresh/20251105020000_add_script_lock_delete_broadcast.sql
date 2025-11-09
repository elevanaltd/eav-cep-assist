-- Migration: Add pg_notify broadcast for script_locks DELETE events
-- Problem: Supabase Realtime + RLS blocks DELETE event broadcasts (0 events across 42 integration test runs)
-- Solution: Use realtime.broadcast_changes() to bypass RLS limitations on DELETE events
-- Authority: critical-engineer approved (Option A - pg_notify/broadcast workaround)
-- North Star: I1 (traceability), I6 (decoupled state), I8 (production-grade security)

-- Critical-Engineer: Consulted for Architecture pattern selection
-- Pattern: Database-triggered broadcast using realtime.broadcast_changes()
-- Reference: https://supabase.com/docs/guides/realtime/broadcast (database-triggered broadcasts)

-- Create trigger function for broadcasting script_locks DELETE events
CREATE OR REPLACE FUNCTION notify_script_lock_deleted()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public  -- CRITICAL: Prevents privilege escalation attacks
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use realtime.broadcast_changes() for Realtime integration
  -- This broadcasts to 'script_locks:{script_id}' channel with DELETE event
  PERFORM realtime.broadcast_changes(
    'script_locks:' || OLD.script_id::text,  -- topic (matches client channel name)
    'DELETE',                                 -- event name
    'DELETE',                                 -- operation
    'script_locks',                           -- table name
    'public',                                 -- schema
    NULL,                                     -- new record (NULL for DELETE)
    row_to_json(OLD)                         -- old record as JSON
  );

  RETURN OLD;
END;
$$;

-- Attach trigger to script_locks table for DELETE operations
CREATE TRIGGER script_locks_delete_broadcast_trigger
  AFTER DELETE ON script_locks
  FOR EACH ROW
  EXECUTE FUNCTION notify_script_lock_deleted();

-- Grant EXECUTE permissions to authenticated users (required for SECURITY DEFINER functions)
GRANT EXECUTE ON FUNCTION notify_script_lock_deleted() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_script_lock_deleted() TO service_role;

-- Create RLS policy on realtime.messages to allow authenticated users to receive DELETE broadcasts
-- This is required for Realtime Authorization when using private channels
CREATE POLICY "authenticated_users_receive_script_lock_deletes"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow receiving broadcast messages from script_locks channels
  realtime.topic() LIKE 'script_locks:%'
);

-- Note: The client must subscribe with .on('broadcast', {event: 'DELETE'}, callback)
-- Payload structure: payload.payload contains the OLD record data (not payload.old)
