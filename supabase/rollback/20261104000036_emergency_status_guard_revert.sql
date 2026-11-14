-- Revert of migration 0036 (emergency_status_guard). NOT a migration; apply by hand only on a rollback decision.
-- Destroys nothing: no table or row changes. Restores public.set_my_status exactly as defined by
-- supabase/migrations/20261104000023_emergency_resolved_line.sql (lines 48-94). That is the last migration that
-- defines it before 0036 (live 0035 room_ai_plus does not touch it), so it is the body live runs before 0036; the
-- sitting's pre-check confirms that by md5.
-- Same name, arguments and return type, so the grants from 0002 carry over.

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
  select coalesce(display_name, 'Someone') into v_name from public.profiles where id = auth.uid();

  -- The previous status, read before the upsert replaces it.
  select coalesce(d.is_emergency, false) into v_was_emergency
    from public.member_status s
    join public.status_definitions d on d.id = s.status_id and d.room_id = s.room_id
   where s.room_id = p_room_id and s.user_id = auth.uid();

  insert into public.member_status (room_id, user_id, status_id, updated_at)
  values (p_room_id, auth.uid(), p_status_id, now())
  on conflict (room_id, user_id) do update set status_id = excluded.status_id, updated_at = now();

  if v_def.is_emergency then
    insert into public.emergency_events (room_id, user_id) values (p_room_id, auth.uid())
    returning id into v_event;
    insert into public.messages (room_id, sender_id, kind, body)
    values (p_room_id, auth.uid(), 'emergency', coalesce(v_name, 'Someone') || ' needs help (Emergency)');
  else
    -- One line either way: two rows in one transaction share created_at (the 0011 trigger sets now()), and
    -- chat breaks that tie by random id, so a separate resolved line could show after the status line.
    insert into public.messages (room_id, sender_id, kind, body)
    values (p_room_id, auth.uid(), 'status',
            case when coalesce(v_was_emergency, false)
                 then coalesce(v_name, 'Someone') || ' is OK (Emergency resolved) · ' || v_def.label
                 else coalesce(v_name, 'Someone') || ': ' || v_def.label end);
  end if;
  return v_event;
end;
$$;
