-- UX2-52: while the caller is in Emergency, set_my_status cannot switch them to an ordinary status.
-- NOT APPLIED. Apply only after explicit human sign-off (see docs/CURRENT_STATE.md).
--
-- Before (0023): picking any status while in Emergency replaced it and posted "<name> is OK (Emergency resolved)
-- · <label>"; picking Emergency again opened a second emergency_events row and posted a second needs-help line
-- (a second alert and push).
-- After:
--   ordinary status while in Emergency -> raise 'emergency_active' with errcode PT409 (HTTP 409). Nothing changes.
--     The client maps PT409 + 'emergency_active'. "I'm OK" (clear_my_status, unchanged from 0023) is the only way
--     out, and it still posts "<name> is OK (Emergency resolved)".
--   Emergency while already in Emergency -> no-op: no row change, no event, no message; returns the caller's latest
--     emergency_events id in this room (null if none), so callers that use the id keep working.
--   Anything else behaves as before. The "is OK (Emergency resolved) · <label>" branch of 0023 can no longer be
--   reached, so it is removed.
--
-- Function replacement only: same name, arguments and return type, so the grants from 0002 (execute to
-- authenticated, revoked from public and anon) carry over. security definer with search_path '' as before.

create or replace function public.set_my_status(p_room_id uuid, p_status_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_def public.status_definitions;
  v_was_emergency boolean;
  v_event uuid;
  v_name text;
begin
  if not private.is_room_member(p_room_id) then
    raise exception 'Not a member of this room' using errcode = '42501';
  end if;
  select * into v_def from public.status_definitions where id = p_status_id and room_id = p_room_id;
  if v_def.id is null then
    raise exception 'Unknown status' using errcode = '22023';
  end if;

  -- The current status, read before any change. for update: two taps at once cannot both pass the guard.
  select coalesce(d.is_emergency, false) into v_was_emergency
    from public.member_status s
    join public.status_definitions d on d.id = s.status_id and d.room_id = s.room_id
   where s.room_id = p_room_id and s.user_id = auth.uid()
     for update of s;

  if coalesce(v_was_emergency, false) then
    if not v_def.is_emergency then
      raise exception 'emergency_active' using errcode = 'PT409',
        detail = 'Tap I''m OK to end your Emergency first.';
    end if;
    select id into v_event from public.emergency_events
     where room_id = p_room_id and user_id = auth.uid()
     order by created_at desc limit 1;
    return v_event;
  end if;

  select coalesce(display_name, 'Someone') into v_name from public.profiles where id = auth.uid();

  insert into public.member_status (room_id, user_id, status_id, updated_at)
  values (p_room_id, auth.uid(), p_status_id, now())
  on conflict (room_id, user_id) do update set status_id = excluded.status_id, updated_at = now();

  if v_def.is_emergency then
    insert into public.emergency_events (room_id, user_id) values (p_room_id, auth.uid())
    returning id into v_event;
    insert into public.messages (room_id, sender_id, kind, body)
    values (p_room_id, auth.uid(), 'emergency', coalesce(v_name, 'Someone') || ' needs help (Emergency)');
  else
    insert into public.messages (room_id, sender_id, kind, body)
    values (p_room_id, auth.uid(), 'status', coalesce(v_name, 'Someone') || ': ' || v_def.label);
  end if;
  return v_event;
end;
$$;
