-- Revert of migration 0032. NOT a migration; apply by hand only on a rollback decision.
-- Destroys: user_plans rows (Plus preview choices). Rooms, members and their caps stay as stored.

-- create_room as of 0031
create or replace function public.create_room(
  p_name text,
  p_type text,
  p_expires_at timestamptz,
  p_location_allowed boolean,
  p_statuses text[] default array[]::text[],
  p_place_name text default null,
  p_place_lat double precision default null,
  p_place_lng double precision default null,
  p_starts_at timestamptz default null,
  p_max_members integer default null,
  p_no_limit boolean default false,
  p_visibility text default 'private',
  p_public_icon text default null,
  p_public_location text default null
) returns public.rooms
language plpgsql security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
  v_label text;
  v_sort int := 1;
  v_place text := nullif(btrim(p_place_name), '');
  v_max int := coalesce(p_max_members, 30);
  v_visibility text := coalesce(p_visibility, 'private');
  v_loc text := nullif(btrim(p_public_location), '');
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
  if v_max not between 2 and 30 then
    raise exception 'Capacity must be between 2 and 30' using errcode = '22023';
  end if;
  if v_visibility not in ('public', 'private') then
    raise exception 'Visibility must be public or private' using errcode = '22023';
  end if;
  if v_visibility = 'public' then
    if p_public_icon is null or p_public_icon !~ '^[a-z0-9-]{1,30}$' then
      raise exception 'A public room needs an icon' using errcode = '22023';
    end if;
    if v_loc is null or char_length(v_loc) > 60 then
      raise exception 'A public room needs a location of 1 to 60 characters' using errcode = '22023';
    end if;
    -- Serialize one person's creations so two parallel calls cannot both pass the count.
    perform pg_advisory_xact_lock(hashtextextended('public_room_creation:' || auth.uid()::text, 0));
    if (select count(*) from private.public_room_creations c
         where c.user_id = auth.uid() and c.created_at > now() - interval '24 hours') >= 5 then
      raise exception 'You can create up to 5 public rooms per day.' using errcode = 'PT422';
    end if;
  elsif p_public_icon is not null or v_loc is not null then
    raise exception 'Icon and location are only for public rooms' using errcode = '22023';
  end if;

  insert into public.rooms (host_id, name, type, expires_at, location_allowed, code,
                            place_name, place_lat, place_lng, starts_at,
                            max_members, no_limit, visibility, public_icon, public_location)
  values (auth.uid(), trim(p_name), p_type, p_expires_at, coalesce(p_location_allowed, false),
          private.generate_room_code(), v_place, p_place_lat, p_place_lng, p_starts_at,
          v_max, coalesce(p_no_limit, false), v_visibility,
          case when v_visibility = 'public' then p_public_icon end,
          case when v_visibility = 'public' then v_loc end)
  returning * into v_room;

  if v_visibility = 'public' then
    insert into private.public_room_creations (user_id) values (auth.uid());
  end if;

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

-- update_room_expiry as of 0002
create or replace function public.update_room_expiry(p_room_id uuid, p_expires_at timestamptz)
returns public.rooms
language plpgsql security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
begin
  if not private.is_room_host(p_room_id) then
    raise exception 'Only the host can change the expiration.' using errcode = '42501';
  end if;
  if p_expires_at < now() + interval '5 minutes' or p_expires_at > now() + interval '7 days' then
    raise exception 'Expiration must be between 5 minutes and 7 days from now' using errcode = '22023';
  end if;
  update public.rooms
     set expires_at = p_expires_at, expiry_version = expiry_version + 1
   where id = p_room_id
  returning * into v_room;
  return v_room;
end;
$$;

drop function if exists public.get_my_plan();
drop function if exists public.set_my_plan(text);
drop function if exists private.user_plan(uuid);
drop table if exists public.user_plans;
