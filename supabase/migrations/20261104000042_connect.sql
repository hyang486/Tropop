-- Connect (friend connect via each user's own KakaoTalk / WeChat / WhatsApp / LINE / LinkedIn QR screenshot).
-- Human decisions: USER_DECISIONS 2026-11-14 ~19:35 and ~20:05; ux spec docs/evidence/ux/brand-rebuild/connect-spec.md §10-11.
-- Rules:
--   * A request needs both people in the same LIVE room (private.is_room_member) and full (non-anonymous) accounts.
--   * A pending request can be accepted or declined after the room ends or is deleted.
--   * Once accepted, a connection outlives room deletion (mutual consent). No room name or date is stored (H3):
--     room_id is ON DELETE SET NULL, and reads show the room name only while the room row still exists.
--   * Free = 1 accepted connection, Plus = unlimited. Checked at request (before insert) and at accept, for both sides.
--     A downgrade keeps existing connections and blocks new ones.
--   * Pending requests expire 14 days after they were sent (read-time; pruned daily). A decline is silent: the sender
--     keeps seeing "requested" until expiry, and the pair cannot be re-requested by the sender until then.
--   * An accepted connection sees all of the other user's codes. Removing a code or a connection ends access at once.
--   * No push notification on request or accept this round.
--   DEFAULTS (ux defaults via supervisor 2026-11-14, pending the human's batch confirmation): no guest connect; the Free
--   cap counts accepted connections only, with request and accept blocked at the cap; Plus->Free keeps existing
--   connections and blocks new ones; 14-day pending expiry; no push; all app codes shared with an accepted connection.
-- Errors: 42501 not allowed, 22023 bad input, P0002 not found, PT402 'connection_limit' / 'other_connection_limit',
--         PT422 'no_codes' / 'they_have_no_codes', PT429 rate limit.

-- ---------------------------------------------------------------- helpers
create function private.connect_ttl()
returns interval language sql immutable
set search_path = ''
as $$ select interval '14 days' $$;

-- A link is stored only when it is https and its host is on that app's list (the client stores null otherwise).
create function private.qr_link_ok(p_app text, p_link text)
returns boolean language sql immutable
set search_path = ''
as $$
  select p_link is not null
     and char_length(p_link) <= 512
     and p_link ~ '^https://[^\s]+$'
     and case p_app
       when 'kakaotalk' then p_link ~* '^https://(qr\.kakao\.com|open\.kakao\.com|pf-link\.kakao\.com)(/|$)'
       when 'wechat'    then p_link ~* '^https://(u\.wechat\.com|weixin\.qq\.com)(/|$)'
       when 'whatsapp'  then p_link ~* '^https://(wa\.me|api\.whatsapp\.com)(/|$)'
       when 'line'      then p_link ~* '^https://line\.me(/|$)'
       when 'linkedin'  then p_link ~* '^https://((www\.)?linkedin\.com/in/|lnkd\.in/)'
       else false
     end
$$;

-- {caller}/{uuid}.jpg|png
create function private.is_own_connect_qr_path(p_name text)
returns boolean language sql stable
set search_path = ''
as $$
  select auth.uid() is not null
     and p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png)$'
     and private.try_uuid(split_part(p_name, '/', 1)) = auth.uid()
     and private.try_uuid(split_part(split_part(p_name, '/', 2), '.', 1)) is not null
$$;

create function private.is_full_account(p_user uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select p_user is not null and exists (
    select 1 from auth.users u where u.id = p_user and u.is_anonymous = false and u.deleted_at is null)
$$;

-- ---------------------------------------------------------------- tables
create table public.qr_codes (
  owner_id uuid not null references auth.users (id) on delete cascade,
  app text not null check (app in ('kakaotalk', 'wechat', 'whatsapp', 'line', 'linkedin')),
  image_path text not null,
  link text check (link is null or private.qr_link_ok(app, link)),
  updated_at timestamptz not null default now(),
  reported_at timestamptz,
  reported_by uuid references auth.users (id) on delete set null,
  primary key (owner_id, app)
);
create index qr_codes_image_path_idx on public.qr_codes (image_path);

create table public.connections (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index connections_user_b_idx on public.connections (user_b);

-- One row per pair at a time. Accept and cancel delete the row; decline keeps it (silent) until expiry.
create table public.connect_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'declined')),
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create unique index connect_requests_pair_uq
  on public.connect_requests (least(from_user, to_user), greatest(from_user, to_user));
create index connect_requests_to_idx on public.connect_requests (to_user, created_at);
create index connect_requests_from_idx on public.connect_requests (from_user, created_at);

create function private.is_connected(p_other uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select auth.uid() is not null and p_other is not null and exists (
    select 1 from public.connections c
    where c.user_a = least(auth.uid(), p_other) and c.user_b = greatest(auth.uid(), p_other))
$$;

create function private.connection_count(p_user uuid)
returns integer language sql stable security definer
set search_path = ''
as $$
  select count(*)::integer from public.connections c where c.user_a = p_user or c.user_b = p_user
$$;

-- null = unlimited
create function private.connection_max(p_user uuid)
returns integer language sql stable security definer
set search_path = ''
as $$
  select case private.user_plan(p_user) when 'plus' then null else 1 end
$$;

create function private.can_add_connection(p_user uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select private.connection_max(p_user) is null or private.connection_count(p_user) < private.connection_max(p_user)
$$;

-- Serialises every change for one user (cap checks); callers lock both users in uuid order.
create function private.lock_connect_users(p_x uuid, p_y uuid)
returns void language sql volatile
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('connect:' || least(p_x, p_y)::text, 0)),
         pg_advisory_xact_lock(hashtextextended('connect:' || greatest(p_x, p_y)::text, 0))
$$;

alter table public.qr_codes enable row level security;
alter table public.connections enable row level security;
alter table public.connect_requests enable row level security;
revoke all on public.qr_codes, public.connections, public.connect_requests from public, anon, authenticated;

-- Owners and their connections read codes; who reported a code is only returned by RPCs.
grant select (owner_id, app, image_path, link, updated_at) on public.qr_codes to authenticated;
create policy qr_codes_select on public.qr_codes for select to authenticated
  using (owner_id = (select auth.uid()) or private.is_connected(owner_id));

grant select on public.connections to authenticated;
create policy connections_select on public.connections for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
-- connect_requests: no client access (declines are masked by the RPCs).

-- A replaced or removed image (and every image on account deletion, by cascade) is queued for storage cleanup.
create function private.on_qr_code_change()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.enqueue_cleanup('connect-qr', old.image_path, 'qr_removed');
    return old;
  end if;
  if new.image_path is distinct from old.image_path then
    perform private.enqueue_cleanup('connect-qr', old.image_path, 'qr_replaced');
  end if;
  return new;
end;
$$;
create trigger qr_codes_cleanup after update or delete on public.qr_codes
  for each row execute function private.on_qr_code_change();

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('connect-qr', 'connect-qr', false, 3145728, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create function private.can_read_connect_qr(p_name text)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.qr_codes q
    where q.image_path = p_name and private.is_connected(q.owner_id))
$$;

create policy connect_qr_select on storage.objects for select to authenticated
  using (bucket_id = 'connect-qr'
         and (private.try_uuid((storage.foldername(name))[1]) = (select auth.uid())
              or private.can_read_connect_qr(name)));
create policy connect_qr_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'connect-qr' and private.is_own_connect_qr_path(name)
              and private.is_full_account((select auth.uid())));
create policy connect_qr_update on storage.objects for update to authenticated
  using (bucket_id = 'connect-qr' and private.is_own_connect_qr_path(name))
  with check (bucket_id = 'connect-qr' and private.is_own_connect_qr_path(name));
create policy connect_qr_delete on storage.objects for delete to authenticated
  using (bucket_id = 'connect-qr' and private.is_own_connect_qr_path(name));

-- ---------------------------------------------------------------- my codes
create function public.upsert_qr_code(p_app text, p_image_path text, p_link text)
returns void language plpgsql security definer
set search_path = ''
as $$
declare v_me uuid := auth.uid();
begin
  if not private.is_full_account(v_me) then
    raise exception 'Account required' using errcode = '42501';
  end if;
  if p_app is null or p_app not in ('kakaotalk', 'wechat', 'whatsapp', 'line', 'linkedin') then
    raise exception 'Unknown app' using errcode = '22023';
  end if;
  if not private.is_own_connect_qr_path(p_image_path) then
    raise exception 'Bad image path' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'connect-qr' and o.name = p_image_path) then
    raise exception 'Upload the image first' using errcode = '22023';
  end if;
  if p_link is not null and not private.qr_link_ok(p_app, p_link) then
    raise exception 'Link is not for this app' using errcode = '22023';
  end if;
  insert into public.qr_codes (owner_id, app, image_path, link)
  values (v_me, p_app, p_image_path, p_link)
  on conflict (owner_id, app) do update
    set image_path = excluded.image_path, link = excluded.link, updated_at = now(),
        reported_at = null, reported_by = null;
end;
$$;

create function public.delete_qr_code(p_app text)
returns void language sql security definer
set search_path = ''
as $$
  delete from public.qr_codes where owner_id = auth.uid() and app = p_app
$$;

-- My codes, with the latest "code not working" report (reporter is a connection, or null if they left).
create function public.my_qr_codes()
returns table (app text, image_path text, link text, updated_at timestamptz,
               reported_at timestamptz, reported_by uuid, reported_by_name text)
language sql stable security definer
set search_path = ''
as $$
  select q.app, q.image_path, q.link, q.updated_at, q.reported_at,
         case when private.is_connected(q.reported_by) then q.reported_by end,
         case when private.is_connected(q.reported_by) then p.display_name end
  from public.qr_codes q
  left join public.profiles p on p.id = q.reported_by
  where q.owner_id = auth.uid()
  order by array_position(array['kakaotalk', 'wechat', 'whatsapp', 'line', 'linkedin'], q.app)
$$;

-- "Code not working?" on a connection's code.
create function public.report_qr_code(p_owner uuid, p_app text)
returns void language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_connected(p_owner) then
    raise exception 'Not connected' using errcode = '42501';
  end if;
  update public.qr_codes set reported_at = now(), reported_by = auth.uid()
  where owner_id = p_owner and app = p_app;
  if not found then
    raise exception 'Code not found' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------- reads
create function private.qr_apps(p_user uuid)
returns text[] language sql stable security definer
set search_path = ''
as $$
  select coalesce(array_agg(q.app order by array_position(array['kakaotalk', 'wechat', 'whatsapp', 'line', 'linkedin'], q.app)),
                  '{}'::text[])
  from public.qr_codes q where q.owner_id = p_user
$$;

-- Quota for the Plus sheet before Connect/Accept, plus the badge count (pending incoming).
create function public.my_connection_quota()
returns table (plan text, used integer, max_connections integer, can_add boolean, pending_incoming integer)
language sql stable security definer
set search_path = ''
as $$
  select private.user_plan(auth.uid()),
         private.connection_count(auth.uid()),
         private.connection_max(auth.uid()),
         private.can_add_connection(auth.uid()),
         (select count(*)::integer from public.connect_requests r
          where r.to_user = auth.uid() and r.status = 'pending'
            and r.created_at > now() - private.connect_ttl())
  where auth.uid() is not null
$$;

-- Person-card Connect state for every other member of a live room the caller is in.
-- state: connected | requested (I sent; a silent decline also reads as requested) | incoming | none.
create function public.room_connect_people(p_room_id uuid)
returns table (user_id uuid, apps text[], state text, request_id uuid, can_connect boolean)
language sql stable security definer
set search_path = ''
as $$
  select m.user_id,
         private.qr_apps(m.user_id),
         case
           when c.user_a is not null then 'connected'
           when r.from_user = auth.uid() then 'requested'
           when r.to_user = auth.uid() and r.status = 'pending' then 'incoming'
           else 'none'
         end,
         case when c.user_a is null and (r.from_user = auth.uid() or r.status = 'pending') then r.id end,
         private.is_full_account(m.user_id)
  from public.room_members m
  left join public.connections c
    on c.user_a = least(auth.uid(), m.user_id) and c.user_b = greatest(auth.uid(), m.user_id)
  left join public.connect_requests r
    on least(r.from_user, r.to_user) = least(auth.uid(), m.user_id)
   and greatest(r.from_user, r.to_user) = greatest(auth.uid(), m.user_id)
   and r.created_at > now() - private.connect_ttl()
  where m.room_id = p_room_id and m.user_id <> auth.uid()
    and private.is_room_member(p_room_id)
$$;

-- Inbox: incoming pending requests and my sent ones (declined shows as sent). room_name only while the room exists.
create function public.my_connect_requests()
returns table (request_id uuid, direction text, other_id uuid, other_name text, other_avatar_path text,
               other_apps text[], room_id uuid, room_name text, created_at timestamptz, expires_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select r.id,
         case when r.to_user = auth.uid() then 'incoming' else 'sent' end,
         o.id, p.display_name, p.avatar_path, private.qr_apps(o.id),
         ro.id, ro.name, r.created_at, r.created_at + private.connect_ttl()
  from public.connect_requests r
  cross join lateral (select case when r.to_user = auth.uid() then r.from_user else r.to_user end as id) o
  left join public.profiles p on p.id = o.id
  left join public.rooms ro on ro.id = r.room_id and ro.deleted_at is null
  where auth.uid() in (r.from_user, r.to_user)
    and r.created_at > now() - private.connect_ttl()
    and (r.from_user = auth.uid() or r.status = 'pending')
  order by r.created_at desc
$$;

create function public.my_connections()
returns table (other_id uuid, other_name text, other_avatar_path text, other_apps text[],
               room_id uuid, room_name text, created_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select o.id, p.display_name, p.avatar_path, private.qr_apps(o.id), ro.id, ro.name, c.created_at
  from public.connections c
  cross join lateral (select case when c.user_a = auth.uid() then c.user_b else c.user_a end as id) o
  left join public.profiles p on p.id = o.id
  left join public.rooms ro on ro.id = c.room_id and ro.deleted_at is null
  where auth.uid() in (c.user_a, c.user_b)
  order by c.created_at desc
$$;

-- A connection's codes, with whether I already reported each one.
create function public.connection_qr_codes(p_other uuid)
returns table (app text, image_path text, link text, updated_at timestamptz, reported_by_me boolean)
language sql stable security definer
set search_path = ''
as $$
  select q.app, q.image_path, q.link, q.updated_at, q.reported_by is not distinct from auth.uid()
  from public.qr_codes q
  where q.owner_id = p_other and private.is_connected(p_other)
  order by array_position(array['kakaotalk', 'wechat', 'whatsapp', 'line', 'linkedin'], q.app)
$$;

-- ---------------------------------------------------------------- actions
-- Returns 'requested' or 'connected' (the other person had already asked me).
create function public.request_connection(p_room_id uuid, p_to uuid)
returns text language plpgsql security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  r public.connect_requests;
begin
  if not private.is_full_account(v_me) then
    raise exception 'Account required' using errcode = '42501';
  end if;
  if p_to is null or p_to = v_me then
    raise exception 'Choose someone else' using errcode = '22023';
  end if;
  if not private.is_room_member(p_room_id) then
    raise exception 'Room is not open' using errcode = '42501';
  end if;
  if not exists (select 1 from public.room_members m where m.room_id = p_room_id and m.user_id = p_to)
     or not private.is_full_account(p_to) then
    raise exception 'They cannot be connected from this room' using errcode = '42501';
  end if;

  perform private.lock_connect_users(v_me, p_to);
  if private.is_connected(p_to) then
    return 'connected';
  end if;

  delete from public.connect_requests x
  where least(x.from_user, x.to_user) = least(v_me, p_to) and greatest(x.from_user, x.to_user) = greatest(v_me, p_to)
    and x.created_at <= now() - private.connect_ttl();
  select * into r from public.connect_requests x
  where least(x.from_user, x.to_user) = least(v_me, p_to) and greatest(x.from_user, x.to_user) = greatest(v_me, p_to);

  if r.id is not null and r.from_user = v_me then
    return 'requested';
  end if;
  if not exists (select 1 from public.qr_codes q where q.owner_id = v_me) then
    raise exception 'no_codes' using errcode = 'PT422';
  end if;
  if not exists (select 1 from public.qr_codes q where q.owner_id = p_to) then
    raise exception 'they_have_no_codes' using errcode = 'PT422';
  end if;
  if not private.can_add_connection(v_me) then
    raise exception 'connection_limit' using errcode = 'PT402';
  end if;

  if r.id is not null then
    -- They asked me (pending, or I had declined): asking back is consent from both.
    if not private.can_add_connection(p_to) then
      raise exception 'other_connection_limit' using errcode = 'PT402';
    end if;
    insert into public.connections (user_a, user_b, room_id)
    values (least(v_me, p_to), greatest(v_me, p_to), coalesce(r.room_id, p_room_id));
    delete from public.connect_requests x where x.id = r.id;
    return 'connected';
  end if;

  if (select count(*) from public.connect_requests x
      where x.from_user = v_me and x.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many requests. Try again later.' using errcode = 'PT429';
  end if;
  insert into public.connect_requests (from_user, to_user, room_id) values (v_me, p_to, p_room_id);
  return 'requested';
end;
$$;

-- Works after the room ended or was deleted. Returns 'connected' or 'declined'.
create function public.respond_connection(p_request_id uuid, p_accept boolean)
returns text language plpgsql security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  r public.connect_requests;
begin
  if not private.is_full_account(v_me) then
    raise exception 'Account required' using errcode = '42501';
  end if;
  select * into r from public.connect_requests x
  where x.id = p_request_id and x.to_user = v_me and x.status = 'pending'
    and x.created_at > now() - private.connect_ttl();
  if r.id is null then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  perform private.lock_connect_users(v_me, r.from_user);
  select * into r from public.connect_requests x
  where x.id = p_request_id and x.to_user = v_me and x.status = 'pending' for update;
  if r.id is null then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  if not coalesce(p_accept, false) then
    update public.connect_requests set status = 'declined' where id = r.id;
    return 'declined';
  end if;
  if private.is_connected(r.from_user) then
    delete from public.connect_requests where id = r.id;
    return 'connected';
  end if;
  if not private.can_add_connection(v_me) then
    raise exception 'connection_limit' using errcode = 'PT402';
  end if;
  if not private.can_add_connection(r.from_user) or not private.is_full_account(r.from_user) then
    raise exception 'other_connection_limit' using errcode = 'PT402';
  end if;
  insert into public.connections (user_a, user_b, room_id)
  values (least(v_me, r.from_user), greatest(v_me, r.from_user), r.room_id);
  delete from public.connect_requests where id = r.id;
  return 'connected';
end;
$$;

create function public.cancel_connect_request(p_request_id uuid)
returns void language sql security definer
set search_path = ''
as $$
  delete from public.connect_requests where id = p_request_id and from_user = auth.uid()
$$;

-- Either side; access to each other's codes ends at once. Silent for the other side.
create function public.remove_connection(p_other uuid)
returns void language plpgsql security definer
set search_path = ''
as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  delete from public.connections
  where user_a = least(v_me, p_other) and user_b = greatest(v_me, p_other);
  delete from public.connect_requests x
  where least(x.from_user, x.to_user) = least(v_me, p_other) and greatest(x.from_user, x.to_user) = greatest(v_me, p_other);
  update public.qr_codes set reported_at = null, reported_by = null
  where (owner_id = v_me and reported_by = p_other) or (owner_id = p_other and reported_by = v_me);
end;
$$;

-- Daily prune of expired requests (reads already ignore them).
create function private.prune_connect_requests()
returns integer language sql security definer
set search_path = ''
as $$
  with d as (delete from public.connect_requests where created_at <= now() - private.connect_ttl() returning 1)
  select count(*)::integer from d
$$;
select cron.schedule('connect-prune', '17 4 * * *', 'select private.prune_connect_requests()');

-- ---------------------------------------------------------------- grants
revoke all on function
  private.connect_ttl(), private.qr_link_ok(text, text), private.is_own_connect_qr_path(text),
  private.is_full_account(uuid), private.is_connected(uuid), private.connection_count(uuid),
  private.connection_max(uuid), private.can_add_connection(uuid), private.lock_connect_users(uuid, uuid),
  private.on_qr_code_change(), private.can_read_connect_qr(text), private.qr_apps(uuid),
  private.prune_connect_requests()
from public, anon, authenticated;
-- Used inside RLS policies and the qr_codes link check.
grant execute on function
  private.qr_link_ok(text, text), private.is_own_connect_qr_path(text), private.is_full_account(uuid),
  private.is_connected(uuid), private.can_read_connect_qr(text)
to authenticated;

revoke all on function
  public.upsert_qr_code(text, text, text), public.delete_qr_code(text), public.my_qr_codes(),
  public.report_qr_code(uuid, text), public.my_connection_quota(), public.room_connect_people(uuid),
  public.my_connect_requests(), public.my_connections(), public.connection_qr_codes(uuid),
  public.request_connection(uuid, uuid), public.respond_connection(uuid, boolean),
  public.cancel_connect_request(uuid), public.remove_connection(uuid)
from public, anon;
grant execute on function
  public.upsert_qr_code(text, text, text), public.delete_qr_code(text), public.my_qr_codes(),
  public.report_qr_code(uuid, text), public.my_connection_quota(), public.room_connect_people(uuid),
  public.my_connect_requests(), public.my_connections(), public.connection_qr_codes(uuid),
  public.request_connection(uuid, uuid), public.respond_connection(uuid, boolean),
  public.cancel_connect_request(uuid), public.remove_connection(uuid)
to authenticated;
