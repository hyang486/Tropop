-- Running-crew #4: "I'm OK" posts a resolution line in chat.
-- NOT APPLIED. Apply only after explicit sign-off (see docs/CURRENT_STATE.md).
--
-- Before: clear_my_status only deleted the caller's member_status row, so after "I'm OK" the last chat event
-- stayed "<name> needs help (Emergency)" for everyone.
-- After: when the status being cleared is the room's Emergency status, one 'status' message
-- "<name> is OK (Emergency resolved)" is posted from the caller. Clearing any other status, or clearing
-- when no status is set, posts nothing (unchanged).
--
-- Function replacement only: same name, arguments and return type, so the existing grant (execute to
-- authenticated, revoked from public and anon in 0002) carries over. No table, RLS, publication or Edge
-- Function change. security definer with search_path '' as before. The delete still touches only the
-- caller's own row, so a non-member has nothing to delete and nothing is posted.

create or replace function public.clear_my_status(p_room_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_status uuid;
  v_name text;
begin
  delete from public.member_status
   where room_id = p_room_id and user_id = auth.uid()
  returning status_id into v_status;

  if v_status is not null and exists (
    select 1 from public.status_definitions d
     where d.id = v_status and d.room_id = p_room_id and d.is_emergency
  ) then
    select coalesce(display_name, 'Someone') into v_name from public.profiles where id = auth.uid();
    insert into public.messages (room_id, sender_id, kind, body)
    values (p_room_id, auth.uid(), 'status', coalesce(v_name, 'Someone') || ' is OK (Emergency resolved)');
  end if;
end;
$$;
