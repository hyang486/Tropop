-- S3 / UX3-B09: one reaction, an ink check ("Got it"), on chat bubbles (human D3, 2026-11-14;
-- spec docs/evidence/ux/audit-3-batch3-specs-2026-11-14.md S3).
-- NOT APPLIED. Apply only after explicit human sign-off (via qa).
--
-- Table message_reactions: one row per (message, user) = "this user checked this message".
--   room_id is copied from the message by the RPC, so RLS and the broadcast trigger can use it directly.
--   Deleted with the message, the room, or the user (FK cascades), so expiry cleanup needs nothing new.
-- RLS: select for members of an open room only (private.is_room_member reads expires_at/deleted_at at query time).
--   No insert/update/delete policy: writes go through toggle_message_check only.
-- RPC toggle_message_check(p_message_id uuid) returns boolean (true = the caller's check is now on).
--   Member of the message's open room; only 'text' and 'media' messages (bubbles, not system/status/arrival/
--   emergency lines). Errors: 42501 'Not allowed' (unknown message / not a member / closed room);
--   22023 'not_reactable' (system-style line).
--   An advisory xact lock per (message, caller) makes two quick double-taps toggle twice, not race.
-- Realtime: broadcast_room_change (0017/0018) is attached for insert/delete, so members get
--   {table:'message_reactions', op} on topic room:<id> and refetch. No id column, so the payload carries no id.

create table public.message_reactions (
  room_id uuid not null references public.rooms (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index message_reactions_room_idx on public.message_reactions (room_id);
create index message_reactions_user_idx on public.message_reactions (user_id);

alter table public.message_reactions enable row level security;

create policy message_reactions_select on public.message_reactions for select to authenticated
  using (private.is_room_member(room_id));

revoke all on public.message_reactions from anon;
revoke insert, update, delete on public.message_reactions from authenticated;
grant select on public.message_reactions to authenticated;

create trigger broadcast_room_change after insert or update or delete on public.message_reactions
  for each row execute function private.broadcast_room_change();

create or replace function public.toggle_message_check(p_message_id uuid)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_msg public.messages;
begin
  select * into v_msg from public.messages m where m.id = p_message_id;
  if v_msg.id is null or not private.is_room_member(v_msg.room_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_msg.kind not in ('text', 'media') then
    raise exception 'not_reactable' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_message_id::text || ':' || auth.uid()::text, 0));

  delete from public.message_reactions r where r.message_id = p_message_id and r.user_id = auth.uid();
  if found then
    return false;
  end if;
  insert into public.message_reactions (room_id, message_id, user_id) values (v_msg.room_id, p_message_id, auth.uid());
  return true;
end;
$$;

revoke execute on function public.toggle_message_check(uuid) from public, anon;
grant execute on function public.toggle_message_check(uuid) to authenticated;
