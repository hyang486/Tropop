-- Server Free/Plus plan (human FINAL 2026-11-13, USER_DECISIONS "Spec 11 plan on server + qa defaults").
-- API contract for the clients: planning/spec11-briefs/API.md ("0032 plan").
--
-- public.user_plans: one row per account; no row = 'free'. The owner reads their own row; nobody writes it directly
--   (no insert/update/delete policy, no table grant for writes). set_my_plan is the only client write path: the Plus
--   preview switch, until real payments exist. Anonymous guests may call it (the preview row is on their profile too).
-- Caps from the caller's plan, on create_room and update_room_expiry only (the only RPCs that set max_members or
--   expires_at). Free: 2..6 people, closes at most 2 days (+5 min clock slack) from now. Plus: 2..30, at most 7 days.
--   "No limit" is stored as the plan max. A value the plan does not allow is PT402 'plan_limit'; a value outside every
--   plan stays 22023.
-- Grandfathered: no data change. Existing rooms keep max_members and expires_at; join keeps the room's stored
--   max_members (0031) and never reads the host's plan.

create table public.user_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('free', 'plus')),
  updated_at timestamptz not null default now()
);
alter table public.user_plans enable row level security;
revoke all on public.user_plans from public, anon, authenticated;
grant select on public.user_plans to authenticated;
create policy user_plans_select_own on public.user_plans
  for select to authenticated using (user_id = (select auth.uid()));

-- The plan of a user ('free' without a row). Called from SECURITY DEFINER RPCs and the service role only.
create function private.user_plan(p_user_id uuid)
returns text
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select p.plan from public.user_plans p where p.user_id = p_user_id), 'free');
$$;
revoke execute on function private.user_plan(uuid) from public, anon, authenticated;

create function public.set_my_plan(p_plan text)
returns text
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if p_plan is null or p_plan not in ('free', 'plus') then
    raise exception 'Plan must be free or plus' using errcode = '22023';
  end if;
  insert into public.user_plans (user_id, plan) values (auth.uid(), p_plan)
  on conflict (user_id) do update set plan = excluded.plan, updated_at = now();
  return p_plan;
end;
$$;
revoke execute on function public.set_my_plan(text) from public, anon;
grant execute on function public.set_my_plan(text) to authenticated;

create function public.get_my_plan()
returns text
language sql stable security definer
set search_path = ''
as $$
  select private.user_plan(auth.uid());
$$;
revoke execute on function public.get_my_plan() from public, anon;
grant execute on function public.get_my_plan() to authenticated;

-- create_room: 0031's body plus the plan caps. Same 14-argument signature, so grants and callers are unchanged.
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
  v_plan text := private.user_plan(auth.uid());
  v_cap int := case when v_plan = 'plus' then 30 else 6 end;
  v_max int := case when coalesce(p_no_limit, false) then null else p_max_members end;
  v_visibility text := coalesce(p_visibility, 'private');
  v_loc text := nullif(btrim(p_public_location), '');
begin
  if not private.is_host_account() then
    raise exception 'Host account required' using errcode = '42501';
  end if;
  if p_expires_at < now() + interval '5 minutes' or p_expires_at > now() + interval '7 days' then
    raise exception 'Expiration must be between 5 minutes and 7 days from now' using errcode = '22023';
  end if;
  if v_plan = 'free' and p_expires_at > now() + interval '2 days 5 minutes' then
    raise exception 'plan_limit' using errcode = 'PT402', detail = 'Free rooms close within 2 days.';
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
  -- No value or "No limit" = the plan max (0031 stored 30 for both).
  v_max := coalesce(v_max, v_cap);
  if v_max not between 2 and 30 then
    raise exception 'Capacity must be between 2 and 30' using errcode = '22023';
  end if;
  if v_max > v_cap then
    raise exception 'plan_limit' using errcode = 'PT402', detail = 'Free rooms hold up to 6 people.';
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
revoke execute on function public.create_room(text, text, timestamptz, boolean, text[], text, double precision, double precision, timestamptz, integer, boolean, text, text, text) from public, anon;
grant execute on function public.create_room(text, text, timestamptz, boolean, text[], text, double precision, double precision, timestamptz, integer, boolean, text, text, text) to authenticated;

-- update_room_expiry: 0002's body plus the Free 2-day cap (the caller is the host).
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
  -- Free cap counts from the room's creation, so repeated changes cannot extend a Free room past 2 days.
  if private.user_plan(auth.uid()) = 'free' and p_expires_at > (select r.created_at from public.rooms r where r.id = p_room_id) + interval '2 days 5 minutes' then
    raise exception 'plan_limit' using errcode = 'PT402', detail = 'Free rooms close within 2 days.';
  end if;
  update public.rooms
     set expires_at = p_expires_at, expiry_version = expiry_version + 1
   where id = p_room_id
  returning * into v_room;
  return v_room;
end;
$$;
