-- Revert of migration 0031. NOT a migration; apply by hand only on a rollback decision.
-- Destroys: question cards, room notices, public-room flags and the creation log. Rooms and members stay.

drop function if exists public.set_room_notice(uuid, text);
drop function if exists public.ask_question_in_chat(uuid);
drop function if exists public.answer_question_card(uuid, text, boolean);
drop table if exists public.question_cards cascade;
drop function if exists private.question_cards_cap();
drop function if exists public.join_open_room(uuid);
drop function if exists public.list_open_rooms(integer);
drop function if exists public.create_room(text, text, timestamptz, boolean, text[], text, double precision, double precision, timestamptz, integer, boolean, text, text, text);
drop table if exists private.public_room_creations;
drop index if exists public.rooms_open_idx;
alter table public.rooms
  drop constraint rooms_max_members_range, drop constraint rooms_visibility_check, drop constraint rooms_public_icon_check,
  drop constraint rooms_public_location_check, drop constraint rooms_public_fields, drop constraint rooms_notice_text_check,
  drop column no_limit, drop column visibility, drop column public_icon, drop column public_location,
  drop column notice_text, drop column notice_set_at, drop column notice_set_by;

-- create_room as of 0026
create function public.create_room(
  p_name text,
  p_type text,
  p_expires_at timestamptz,
  p_location_allowed boolean,
  p_statuses text[] default array[]::text[],
  p_place_name text default null,
  p_place_lat double precision default null,
  p_place_lng double precision default null,
  p_starts_at timestamptz default null
) returns public.rooms
language plpgsql security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
  v_label text;
  v_sort int := 1;
  v_place text := nullif(btrim(p_place_name), '');
begin
  if not private.is_host_account() then
    raise exception 'Host account required' using errcode = '42501';
  end if;
  if p_expires_at < now() + interval '5 minutes' or p_expires_at > now() + interval '7 days' then
    raise exception 'Expiration must be between 5 minutes and 7 days from now' using errcode = '22023';
  end if;
  if (p_place_lat is null) <> (p_place_lng is null) then
    raise exception 'A pin needs both latitude and longitude' using errcode = '22023';
  end if;
  if p_place_lat is not null and v_place is null then
    raise exception 'A pin needs a place name' using errcode = '22023';
  end if;
  if p_place_lat is not null
     and (not (p_place_lat between -90 and 90) or not (p_place_lng between -180 and 180)) then
    raise exception 'The pin is outside the valid range' using errcode = '22023';
  end if;
  if char_length(v_place) > 80 then
    raise exception 'Place name must be at most 80 characters' using errcode = '22023';
  end if;
  if p_starts_at is not null and (p_starts_at >= p_expires_at or p_starts_at < now() - interval '1 day') then
    raise exception 'Start time must be before the room closes and not more than a day ago' using errcode = '22023';
  end if;

  insert into public.rooms (host_id, name, type, expires_at, location_allowed, code,
                            place_name, place_lat, place_lng, starts_at)
  values (auth.uid(), trim(p_name), p_type, p_expires_at, coalesce(p_location_allowed, false),
          private.generate_room_code(), v_place, p_place_lat, p_place_lng, p_starts_at)
  returning * into v_room;

  insert into public.room_members (room_id, user_id, role) values (v_room.id, auth.uid(), 'host');

  insert into public.status_definitions (room_id, label, is_emergency, sort)
  values (v_room.id, 'Emergency', true, 0);
  foreach v_label in array coalesce(p_statuses, array[]::text[]) loop
    if char_length(trim(v_label)) between 1 and 30 and lower(trim(v_label)) <> 'emergency' then
      insert into public.status_definitions (room_id, label, sort) values (v_room.id, trim(v_label), v_sort);
      v_sort := v_sort + 1;
    end if;
  end loop;

  return v_room;
end;
$$;
revoke execute on function public.create_room(text, text, timestamptz, boolean, text[], text, double precision, double precision, timestamptz) from public, anon;
grant execute on function public.create_room(text, text, timestamptz, boolean, text[], text, double precision, double precision, timestamptz) to authenticated;
