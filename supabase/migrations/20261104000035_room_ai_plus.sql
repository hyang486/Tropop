-- UX2-03: Qrewing AI in a room is a Plus feature. API contract: planning/spec11-briefs/API.md ("0035 room AI").
-- set_qrewing_room: a Free host (private.user_plan, 0032) turning AI on (stored off, or no row, and p_ai_enabled
-- true) gets PT402 'plan_limit'. Turning AI off, and any call that leaves AI as stored (a grandfathered AI-on room
-- changing entry_required, or a repeat), stays open to a Free host. Plus hosts are unchanged. No data change.
-- The body is 0028's with the one plan check added; checks run in 0028's order, the plan check after the host check.

create or replace function public.set_qrewing_room(p_room_id uuid, p_ai_enabled boolean, p_entry_required boolean)
returns public.qrewing_rooms
language plpgsql security definer
set search_path = ''
as $$
declare
  v_row public.qrewing_rooms;
  v_ai boolean := coalesce(p_ai_enabled, false);
  v_entry boolean := coalesce(p_entry_required, false);
begin
  if not private.is_room_host(p_room_id) then
    raise exception 'Only the host of an open room can change Qrewing AI' using errcode = '42501';
  end if;
  if v_ai
     and not coalesce((select q.ai_enabled from public.qrewing_rooms q where q.room_id = p_room_id), false)
     and private.user_plan(auth.uid()) = 'free' then
    raise exception 'plan_limit' using errcode = 'PT402', detail = 'Qrewing AI in a room is part of Qrew Plus.';
  end if;
  if v_entry and (not v_ai or (select r.type from public.rooms r where r.id = p_room_id) <> 'event') then
    raise exception 'Entry info can be required only in an event room with Qrewing AI on' using errcode = '22023';
  end if;
  if v_entry and not exists (select 1 from public.entry_questions q where q.room_id = p_room_id) then
    raise exception 'Add at least one entry question first' using errcode = '22023';
  end if;

  insert into public.qrewing_rooms as q (room_id, ai_enabled, entry_required)
  values (p_room_id, v_ai, v_entry)
  on conflict (room_id) do update
    set ai_enabled = excluded.ai_enabled, entry_required = excluded.entry_required
  returning q.* into v_row;
  return v_row;
end;
$$;
