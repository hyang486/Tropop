-- Revert of migration 0035. NOT a migration; apply by hand only on a rollback decision.
-- Destroys nothing: no table or row changes. Restores set_qrewing_room as of 0028.

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
