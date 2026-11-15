-- Connect lists: add the other person's character (items 5/11, character avatars for everyone).
-- Same bodies as 20261104000042_connect.sql:335-370, with ONE output column added at the end:
-- other_character smallint (profiles.avatar_character, 1-12 or null). A function's return type cannot change in place, so drop and re-create.

drop function public.my_connect_requests();
drop function public.my_connections();

-- Inbox: incoming pending requests and my sent ones (declined shows as sent). room_name only while the room exists.
create function public.my_connect_requests()
returns table (request_id uuid, direction text, other_id uuid, other_name text, other_avatar_path text,
               other_apps text[], room_id uuid, room_name text, created_at timestamptz, expires_at timestamptz,
               other_character smallint)
language sql stable security definer
set search_path = ''
as $$
  select r.id,
         case when r.to_user = auth.uid() then 'incoming' else 'sent' end,
         o.id, p.display_name, p.avatar_path, private.qr_apps(o.id),
         ro.id, ro.name, r.created_at, r.created_at + private.connect_ttl(),
         p.avatar_character
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
               room_id uuid, room_name text, created_at timestamptz, other_character smallint)
language sql stable security definer
set search_path = ''
as $$
  select o.id, p.display_name, p.avatar_path, private.qr_apps(o.id), ro.id, ro.name, c.created_at, p.avatar_character
  from public.connections c
  cross join lateral (select case when c.user_a = auth.uid() then c.user_b else c.user_a end as id) o
  left join public.profiles p on p.id = o.id
  left join public.rooms ro on ro.id = c.room_id and ro.deleted_at is null
  where auth.uid() in (c.user_a, c.user_b)
  order by c.created_at desc
$$;

-- Same grants as 0042: anon and public locked out, authenticated may execute.
revoke all on function public.my_connect_requests(), public.my_connections() from public, anon;
grant execute on function public.my_connect_requests(), public.my_connections() to authenticated;
