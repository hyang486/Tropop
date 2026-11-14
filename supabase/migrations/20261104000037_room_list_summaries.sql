-- UX3-A01 (audit-3 batch 3, S1): Rooms rows show the last item and an unread count.
-- * room_members.last_read_at: when this member last had the chat open. Default now(), so existing members start
--   with nothing unread and a new member's pre-join history never counts.
-- * mark_room_read(room): sets it to now() for the caller. Members of open rooms only (42501 otherwise).
-- * room_list_summaries(ids): per open room the caller belongs to, the last chat item and the unread count.
--   Every item type (text, media, arrival, status, emergency, activity lines) is a messages row, so one table covers
--   them. Join/leave lines are skipped for both the last item and the count; unread also skips the caller's own items.
--   Expired, deleted and non-member rooms return no row (expires_at checked at read time, as everywhere else).
-- Branch only; live apply needs the human's OK.

alter table public.room_members add column last_read_at timestamptz not null default now();

-- A join line is the joiner's "<name> joined"; a leave line has no sender ("<name> left").
create or replace function private.is_join_leave_line(p_kind text, p_sender uuid, p_body text)
returns boolean language sql immutable
set search_path = ''
as $$
  select p_kind = 'system' and (p_sender is null or coalesce(p_body, '') like '% joined')
$$;
revoke all on function private.is_join_leave_line(text, uuid, text) from public, anon, authenticated;

create or replace function public.mark_room_read(p_room_id uuid)
returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare v_at timestamptz := now();
begin
  update public.room_members m
     set last_read_at = v_at
    from public.rooms r
   where m.room_id = p_room_id and m.user_id = auth.uid()
     and r.id = m.room_id and r.deleted_at is null and r.expires_at > now();
  if not found then
    raise exception 'Not a member of an open room.' using errcode = '42501';
  end if;
  return v_at;
end;
$$;
revoke all on function public.mark_room_read(uuid) from public, anon;
grant execute on function public.mark_room_read(uuid) to authenticated;

create or replace function public.room_list_summaries(p_room_ids uuid[] default null)
returns table (
  room_id uuid,
  last_kind text,
  last_body text,
  last_sender_id uuid,
  last_sender_name text,
  last_at timestamptz,
  unread integer
)
language sql stable security definer
set search_path = ''
as $$
  select m.room_id, l.kind, l.body, l.sender_id, p.display_name, l.created_at,
         (select count(*)::integer
            from public.messages u
           where u.room_id = m.room_id
             and u.created_at > m.last_read_at
             and u.sender_id is distinct from m.user_id
             and not private.is_join_leave_line(u.kind, u.sender_id, u.body))
    from public.room_members m
    join public.rooms r on r.id = m.room_id
    left join lateral (
      select x.kind, x.body, x.sender_id, x.created_at
        from public.messages x
       where x.room_id = m.room_id
         and not private.is_join_leave_line(x.kind, x.sender_id, x.body)
       order by x.created_at desc, x.id desc
       limit 1
    ) l on true
    left join public.profiles p on p.id = l.sender_id
   where m.user_id = auth.uid()
     and r.deleted_at is null and r.expires_at > now()
     and (p_room_ids is null or m.room_id = any (p_room_ids))
$$;
revoke all on function public.room_list_summaries(uuid[]) from public, anon;
grant execute on function public.room_list_summaries(uuid[]) to authenticated;
