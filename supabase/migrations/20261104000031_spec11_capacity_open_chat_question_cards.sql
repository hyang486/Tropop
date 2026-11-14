-- Spec 11 (human FINAL 2026-11-13): B room capacity, D Open chat (public rooms), C question cards.
-- API contract for the clients: planning/spec11-briefs/API.md.
--
-- B  rooms.max_members already exists (default 30) and join_room already refuses a full room with PT409.
--    New: a 2..30 check, rooms.no_limit (display flag: the host chose "No limit"), and create_room takes the capacity.
--    The server has no plan data (see qrewing core.ts "No Plus check here"), so it enforces the hard cap 30
--    (Plus max); the Free cap 6 is chosen by the client and is NOT verified here.
-- D  rooms.visibility public|private, public_icon, public_location. list_open_rooms lists joinable public rooms
--    (open, not full); join_open_room joins one without a code. Creating a public room is limited to 5 per rolling
--    24 hours per person (private.public_room_creations log, PT422).
-- C  public.question_cards (asker and answerer read only; writes go through RPCs or the service role) plus
--    rooms.notice_* for "Post as notice". Cards broadcast {table, op, id} on room:<id> like every other table.

-- ------------------------------------------------------------------------------------------------ B + D: rooms
alter table public.rooms
  add column no_limit boolean not null default false,
  add column visibility text not null default 'private',
  add column public_icon text,
  add column public_location text,
  add column notice_text text,
  add column notice_set_at timestamptz,
  add column notice_set_by uuid references auth.users (id) on delete set null,
  add constraint rooms_max_members_range check (max_members between 2 and 30),
  add constraint rooms_visibility_check check (visibility in ('public', 'private')),
  add constraint rooms_public_icon_check check (public_icon is null or public_icon ~ '^[a-z0-9-]{1,30}$'),
  add constraint rooms_public_location_check
    check (public_location is null or (public_location = btrim(public_location) and char_length(public_location) between 1 and 60)),
  add constraint rooms_public_fields check (
    (visibility = 'public' and public_icon is not null and public_location is not null)
    or (visibility = 'private' and public_icon is null and public_location is null)),
  add constraint rooms_notice_text_check check (notice_text is null or char_length(notice_text) between 1 and 1000);

create index rooms_open_idx on public.rooms (created_at desc)
  where visibility = 'public' and deleted_at is null;

create table private.public_room_creations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index public_room_creations_user_idx on private.public_room_creations (user_id, created_at desc);
revoke all on private.public_room_creations from public, anon, authenticated;

-- create_room: five new optional arguments after starts_at. The nine-argument function is dropped so PostgREST
-- sees one create_room; callers pass arguments by name, so they keep working.
drop function public.create_room(text, text, timestamptz, boolean, text[], text, double precision, double precision, timestamptz);

create function public.create_room(
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
revoke execute on function public.create_room(text, text, timestamptz, boolean, text[], text, double precision, double precision, timestamptz, integer, boolean, text, text, text) from public, anon;
grant execute on function public.create_room(text, text, timestamptz, boolean, text[], text, double precision, double precision, timestamptz, integer, boolean, text, text, text) to authenticated;

-- Joinable public rooms: open (not deleted, not expired), not full. Read-time expires_at check, as for every room read.
-- Exposes only list fields; rooms stays readable by members only (rooms_select unchanged).
create function public.list_open_rooms(p_limit integer default 50)
returns table (room_id uuid, name text, type text, public_icon text, public_location text,
               member_count bigint, max_members integer, expires_at timestamptz, already_member boolean)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  return query
    select r.id, r.name, r.type, r.public_icon, r.public_location, c.n, r.max_members, r.expires_at,
           exists (select 1 from public.room_members m where m.room_id = r.id and m.user_id = auth.uid())
    from public.rooms r
    cross join lateral (select count(*) as n from public.room_members m where m.room_id = r.id) c
    where r.visibility = 'public' and r.deleted_at is null and r.expires_at > now()
      and c.n < r.max_members
    order by r.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;
$$;
revoke execute on function public.list_open_rooms(integer) from public, anon;
grant execute on function public.list_open_rooms(integer) to authenticated;

-- Join a listed public room without a code. A room that is private, deleted or expired returns null (same shape as
-- an unknown code in join_room). Full room: PT409 like join_room. No throttle: the id comes from the list, so there is
-- no code to guess.
create function public.join_open_room(p_room_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  select * into v_room from public.rooms r
  where r.id = p_room_id and r.visibility = 'public' and r.deleted_at is null and r.expires_at > now()
  for update;
  if v_room.id is null then
    return null;
  end if;
  if exists (select 1 from public.room_members where room_id = v_room.id and user_id = auth.uid()) then
    return v_room.id;
  end if;
  select count(*) into v_count from public.room_members where room_id = v_room.id;
  if v_count >= v_room.max_members then
    raise exception 'This room is full.' using errcode = 'PT409';
  end if;
  insert into public.room_members (room_id, user_id, role) values (v_room.id, auth.uid(), 'member');
  insert into public.messages (room_id, sender_id, kind, body)
  values (v_room.id, auth.uid(), 'system',
          coalesce((select display_name from public.profiles where id = auth.uid()), 'Someone') || ' joined');
  return v_room.id;
end;
$$;
revoke execute on function public.join_open_room(uuid) from public, anon;
grant execute on function public.join_open_room(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------- C: question cards
create table public.question_cards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  asker_id uuid not null references auth.users (id) on delete cascade,
  answerer_id uuid not null references auth.users (id) on delete cascade,
  question text not null check (char_length(question) between 1 and 500),
  answer text check (answer is null or char_length(answer) between 1 and 2000),
  -- pending: waiting. answered: answer saved (goes to the asker only). asked_in_chat: the asker took the offer
  -- after the timeout and the question was posted as a normal chat message.
  status text not null default 'pending' check (status in ('pending', 'answered', 'asked_in_chat')),
  created_at timestamptz not null default now(),
  -- ~3 minutes: after this the asker is told and offered "Ask in the room chat instead?". The card stays
  -- answerable until the room closes (status stays pending; the clients derive "timed out" from timeout_at).
  timeout_at timestamptz not null default now() + interval '3 minutes',
  answered_at timestamptz,
  posted_as_notice boolean not null default false,
  check (asker_id <> answerer_id),
  check ((status = 'answered') = (answer is not null)),
  check ((status = 'answered') = (answered_at is not null)),
  check (not posted_as_notice or status = 'answered')
);
create index question_cards_room_idx on public.question_cards (room_id, created_at desc);
create index question_cards_answerer_idx on public.question_cards (answerer_id, status);

alter table public.question_cards enable row level security;
-- Only the asker and the answerer read a card, and only while the room is open (read-time expires_at check).
create policy question_cards_select on public.question_cards for select to authenticated
  using ((asker_id = auth.uid() or answerer_id = auth.uid()) and private.room_is_open(room_id));
-- No insert/update/delete policy: cards are created by the qrewing function (service role) and changed by the RPCs below.

-- Max 5 pending cards per asker per room (a Qrewing loop cannot flood a host).
create function private.question_cards_cap()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.question_cards c
       where c.room_id = new.room_id and c.asker_id = new.asker_id and c.status = 'pending') >= 5 then
    raise exception 'Too many unanswered questions.' using errcode = '54000';
  end if;
  return new;
end;
$$;
revoke all on function private.question_cards_cap() from public, anon, authenticated;
create trigger question_cards_cap before insert on public.question_cards
  for each row execute function private.question_cards_cap();

-- Hint on room:<id> for every member: {table, op, id}. No content; the client refetches through the RLS select.
create trigger question_cards_broadcast after insert or update on public.question_cards
  for each row execute function private.broadcast_room_change();

-- The answerer answers. The answer goes back to the asker only (their row; the asker reads it by RLS).
-- p_post_as_notice also pins the answer as the room notice (rooms.notice_*).
create function public.answer_question_card(p_card_id uuid, p_answer text, p_post_as_notice boolean default false)
returns public.question_cards
language plpgsql security definer
set search_path = ''
as $$
declare
  v_card public.question_cards;
  v_text text := btrim(p_answer);
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  select * into v_card from public.question_cards c
  where c.id = p_card_id and c.answerer_id = auth.uid() and private.room_is_open(c.room_id)
  for update;
  if v_card.id is null then
    raise exception 'Question not found' using errcode = '42501';
  end if;
  if v_card.status = 'answered' then
    return v_card;
  end if;
  if v_card.status <> 'pending' then
    raise exception 'This question was moved to the chat.' using errcode = 'PT409';
  end if;
  if v_text is null or char_length(v_text) not between 1 and 2000 then
    raise exception 'An answer is 1 to 2000 characters' using errcode = '22023';
  end if;
  if coalesce(p_post_as_notice, false) and char_length(v_text) > 1000 then
    raise exception 'A notice is at most 1000 characters' using errcode = '22023';
  end if;
  update public.question_cards
     set answer = v_text, status = 'answered', answered_at = now(),
         posted_as_notice = coalesce(p_post_as_notice, false)
   where id = v_card.id
   returning * into v_card;
  if v_card.posted_as_notice then
    update public.rooms set notice_text = v_text, notice_set_at = now(), notice_set_by = auth.uid()
     where id = v_card.room_id;
  end if;
  return v_card;
end;
$$;
revoke execute on function public.answer_question_card(uuid, text, boolean) from public, anon;
grant execute on function public.answer_question_card(uuid, text, boolean) to authenticated;

-- The asker takes the "Ask in the room chat instead?" offer (only after timeout_at): the question becomes a normal
-- text message from the asker and the card is closed.
create function public.ask_question_in_chat(p_card_id uuid)
returns public.question_cards
language plpgsql security definer
set search_path = ''
as $$
declare
  v_card public.question_cards;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  select * into v_card from public.question_cards c
  where c.id = p_card_id and c.asker_id = auth.uid() and private.room_is_open(c.room_id)
  for update;
  if v_card.id is null then
    raise exception 'Question not found' using errcode = '42501';
  end if;
  if v_card.status = 'asked_in_chat' then
    return v_card;
  end if;
  if v_card.status <> 'pending' then
    raise exception 'This question was already answered.' using errcode = 'PT409';
  end if;
  if now() < v_card.timeout_at then
    raise exception 'Wait for the answer a little longer.' using errcode = '22023';
  end if;
  insert into public.messages (room_id, sender_id, kind, body)
  values (v_card.room_id, auth.uid(), 'text', v_card.question);
  update public.question_cards set status = 'asked_in_chat' where id = v_card.id returning * into v_card;
  return v_card;
end;
$$;
revoke execute on function public.ask_question_in_chat(uuid) from public, anon;
grant execute on function public.ask_question_in_chat(uuid) to authenticated;

-- The host clears the pinned room notice (set by Post as notice or by the host's own notice).
create function public.set_room_notice(p_room_id uuid, p_text text)
returns public.rooms
language plpgsql security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
  v_text text := nullif(btrim(p_text), '');
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.room_members m
                  where m.room_id = p_room_id and m.user_id = auth.uid() and m.role = 'host')
     or not private.room_is_open(p_room_id) then
    raise exception 'Host only' using errcode = '42501';
  end if;
  if v_text is not null and char_length(v_text) > 1000 then
    raise exception 'A notice is at most 1000 characters' using errcode = '22023';
  end if;
  update public.rooms
     set notice_text = v_text,
         notice_set_at = case when v_text is null then null else now() end,
         notice_set_by = case when v_text is null then null else auth.uid() end
   where id = p_room_id
   returning * into v_room;
  return v_room;
end;
$$;
revoke execute on function public.set_room_notice(uuid, text) from public, anon;
grant execute on function public.set_room_notice(uuid, text) to authenticated;

notify pgrst, 'reload schema';
