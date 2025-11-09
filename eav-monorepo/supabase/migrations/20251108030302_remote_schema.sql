create extension if not exists "citext" with schema "public";

create extension if not exists "moddatetime" with schema "public";

create extension if not exists "pg_jsonschema" with schema "public";

revoke delete on table "public"."audit_log" from "anon";

revoke update on table "public"."audit_log" from "anon";

revoke delete on table "public"."audit_log" from "authenticated";

revoke update on table "public"."audit_log" from "authenticated";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_script_status(p_script_id uuid, p_new_status text)
 RETURNS SETOF public.scripts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_user_id uuid := (SELECT auth.uid());
    v_user_role text;
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
$function$
;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.ensure_user_profile_on_signup();


  create policy "comments_channel_read"
  on "realtime"."messages"
  as permissive
  for select
  to authenticated
using (((topic ~~ 'room:%:comments'::text) AND (EXISTS ( SELECT 1
   FROM public.user_accessible_scripts uas
  WHERE ((uas.user_id = auth.uid()) AND ((uas.script_id)::text = split_part(messages.topic, ':'::text, 2)))))));



  create policy "comments_channel_write"
  on "realtime"."messages"
  as permissive
  for insert
  to authenticated
with check (((topic ~~ 'room:%:comments'::text) AND (EXISTS ( SELECT 1
   FROM public.user_accessible_scripts uas
  WHERE ((uas.user_id = auth.uid()) AND ((uas.script_id)::text = split_part(messages.topic, ':'::text, 2)))))));



