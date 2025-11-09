-- Migration: Fix broadcast trigger parameter type
-- Problem: realtime.broadcast_changes() expects 'record' type but we passed 'jsonb' 
-- Solution: Pass OLD directly instead of row_to_json(OLD)

-- Drop and recreate the trigger function with correct parameter type
CREATE OR REPLACE FUNCTION notify_script_lock_deleted()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use realtime.broadcast_changes() for Realtime integration
  -- Pass OLD directly (record type), not row_to_json(OLD) (jsonb type)
  PERFORM realtime.broadcast_changes(
    'script_locks:' || OLD.script_id::text,  -- topic (matches client channel name)
    'DELETE',                                 -- event name
    'DELETE',                                 -- operation
    'script_locks',                           -- table name
    'public',                                 -- schema
    NULL,                                     -- new record (NULL for DELETE)
    OLD                                      -- old record (record type, not jsonb)
  );

  RETURN OLD;
END;
$$;

-- Note: Trigger and grants already exist from previous migration, no need to recreate
