-- Emergency "On my way" (human FINAL 2026-11-14; ux spec docs/evidence/ux/emergency-on-my-way-spec-2026-11-14.md).
-- NOT APPLIED. Apply only after explicit human sign-off (via qa), like 0037-0039.
--
-- Before: members could only mark an Emergency as seen (ack_emergency -> emergency_acks row).
-- After:
--   emergency_acks gains on_way (default false) and on_way_at (null until the first "On my way").
--   set_emergency_on_way(p_event_id, p_on) lets a member other than the sender say they are coming (p_on = true)
--   or take it back ("Can't come", p_on = false).
--     Checks: caller is a member of the event's open room (private.is_room_member: not deleted, not expired, read at
--     call time); the event is active (it is the sender's latest event in that room and the sender's current status
--     is the room's Emergency status); the caller is not the sender.
--     Errors: 42501 'Not allowed' (no event / not a member / closed room); PT409 'emergency_not_active';
--     PT403 'own_emergency' (sender).
--     p_on = true: upserts the ack (On my way implies seen) with on_way = true; on_way_at is set once and kept.
--       The first time a responder turns On my way on for this event, one kind='status' chat line
--       "<name> is on the way" is posted from the responder (the client appends the time). Off -> on again does
--       not post a second line, so toggling cannot spam the chat.
--     p_on = false: on_way = false on the existing row; the seen row is kept; no chat line (quiet undo).
--       on_way_at is kept so a later "On my way" stays quiet. Without a row it is a no-op.
--   Returns the caller's emergency_acks row after the change (null for p_on = false without a row).
--
-- Realtime: clients get emergency_acks changes through the broadcast_room_change trigger (0017/0018), which is
-- "after insert or update or delete" on emergency_acks, so the UPDATE that this RPC makes reaches the room.
-- (supabase_realtime publication no longer carries this table since 0017.) The chat line is an ordinary messages
-- insert, broadcast the same way.
--
-- Existing rows: on_way false, on_way_at null (they were all plain "seen"). ack_emergency is unchanged.
-- RLS: no new policy. emergency_acks keeps select-only for members (0002); writes go through this
-- security definer RPC only.

alter table public.emergency_acks
  add column on_way boolean not null default false,
  add column on_way_at timestamptz;

create or replace function public.set_emergency_on_way(p_event_id uuid, p_on boolean)
returns public.emergency_acks
language plpgsql security definer
set search_path = ''
as $$
declare
  v_event public.emergency_events;
  v_prev public.emergency_acks;
  v_row public.emergency_acks;
  v_name text;
begin
  if p_on is null then
    raise exception 'p_on is required' using errcode = '22023';
  end if;

  select * into v_event from public.emergency_events e where e.id = p_event_id;
  if v_event.id is null or not private.is_room_member(v_event.room_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if v_event.user_id = auth.uid() then
    raise exception 'own_emergency' using errcode = 'PT403';
  end if;

  if exists (select 1 from public.emergency_events e
              where e.room_id = v_event.room_id and e.user_id = v_event.user_id
                and (e.created_at, e.id) > (v_event.created_at, v_event.id))
     or not exists (select 1 from public.member_status s
                      join public.status_definitions d on d.id = s.status_id
                     where s.room_id = v_event.room_id and s.user_id = v_event.user_id and d.is_emergency) then
    raise exception 'emergency_not_active' using errcode = 'PT409';
  end if;

  -- Serialize this caller's calls for this event (the row may not exist yet, so a row lock is not enough);
  -- two quick taps then cannot both post the first chat line.
  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text || ':' || auth.uid()::text, 0));
  select * into v_prev from public.emergency_acks a
   where a.event_id = p_event_id and a.user_id = auth.uid();

  if not p_on then
    update public.emergency_acks a set on_way = false
     where a.event_id = p_event_id and a.user_id = auth.uid()
    returning * into v_row;
    return v_row;
  end if;

  insert into public.emergency_acks (event_id, user_id, on_way, on_way_at)
  values (p_event_id, auth.uid(), true, now())
  on conflict (event_id, user_id) do update
    set on_way = true,
        on_way_at = coalesce(public.emergency_acks.on_way_at, excluded.on_way_at)
  returning * into v_row;

  if v_prev.on_way_at is null then
    select coalesce(display_name, 'Someone') into v_name from public.profiles where id = auth.uid();
    insert into public.messages (room_id, sender_id, kind, body)
    values (v_event.room_id, auth.uid(), 'status', coalesce(v_name, 'Someone') || ' is on the way');
  end if;

  return v_row;
end;
$$;

revoke execute on function public.set_emergency_on_way(uuid, boolean) from public, anon;
grant execute on function public.set_emergency_on_way(uuid, boolean) to authenticated;
