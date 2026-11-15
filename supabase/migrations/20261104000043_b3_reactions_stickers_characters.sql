-- B3 (spec docs/evidence/ux/brand-rebuild/b3-characters-stickers-reactions-spec.md §1-§3): 12 micro reactions,
-- sticker messages, profile characters. Builds on 0038 (message_reactions) and follows 0042.
-- NOT APPLIED. Apply only after explicit human sign-off (via qa).
--
-- (a) message_reactions gets reaction smallint 1-12 (file order: 1 Love, 2 Got it, 3 Like, 4 Clap, 5 Haha, 6 Wow,
--     7 Water, 8 Location, 9 Time, 10 Coffee, 11 Photo, 12 Hi). Key (message_id, user_id) -> (message_id, user_id,
--     reaction): a user may hold several kinds on one message, each toggled on its own.
--     Data: every existing 0038 "check" row becomes reaction 2 "Got it" (ux decision, B3 plan 2026-11-15).
--     RPC toggle_message_reaction(p_message_id uuid, p_reaction smallint) returns boolean (true = now on).
--       Member of the message's open room; only 'text', 'media' and 'sticker' messages.
--       Errors: 42501 'Not allowed' (unknown message / not a member / closed room); 22023 'not_reactable'
--       (system/status/arrival/emergency line); 22023 'bad_reaction' (null or outside 1-12).
--     toggle_message_check(uuid) stays for clients built before B3 and toggles reaction 2.
--     RLS, cascades and the broadcast trigger are unchanged from 0038.
-- (b) messages.kind 'sticker': body = a bundled sticker id (meetup-01..12, connection-01..12, usc-fight-on,
--     usc-lets-go, usc-made-it), no media. Members insert it like text (messages_insert). A sticker is only a chat
--     line: no server function treats it as a status change, Arrived or Emergency (those lines come only from their
--     own RPCs with kinds status/arrival/emergency/system, and qrewing reads kind 'text' plus 'status'/'emergency').
-- (c) profiles.avatar_character smallint null, 1-12. Own-row update through the existing profiles_update policy.

-- (a) reactions
alter table public.message_reactions add column reaction smallint;
-- ux (B3 plan 2026-11-15): the single 0038 ink check maps to reaction 2 "Got it".
update public.message_reactions set reaction = 2 where reaction is null;
alter table public.message_reactions
  alter column reaction set not null,
  add constraint message_reactions_reaction_range check (reaction between 1 and 12),
  drop constraint message_reactions_pkey,
  add constraint message_reactions_pkey primary key (message_id, user_id, reaction);

create or replace function public.toggle_message_reaction(p_message_id uuid, p_reaction smallint)
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
  if v_msg.kind not in ('text', 'media', 'sticker') then
    raise exception 'not_reactable' using errcode = '22023';
  end if;
  if p_reaction is null or p_reaction not between 1 and 12 then
    raise exception 'bad_reaction' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_message_id::text || ':' || auth.uid()::text || ':' || p_reaction, 0));

  delete from public.message_reactions r
   where r.message_id = p_message_id and r.user_id = auth.uid() and r.reaction = p_reaction;
  if found then
    return false;
  end if;
  insert into public.message_reactions (room_id, message_id, user_id, reaction)
  values (v_msg.room_id, p_message_id, auth.uid(), p_reaction);
  return true;
end;
$$;

revoke execute on function public.toggle_message_reaction(uuid, smallint) from public, anon;
grant execute on function public.toggle_message_reaction(uuid, smallint) to authenticated;

-- Pre-B3 clients: the check is reaction 2. Same errors as 0038 (stickers did not exist then, so they now pass).
create or replace function public.toggle_message_check(p_message_id uuid)
returns boolean
language sql security definer
set search_path = ''
as $$
  select public.toggle_message_reaction(p_message_id, 2::smallint);
$$;

-- (b) stickers
alter table public.messages drop constraint messages_kind_check;
alter table public.messages
  add constraint messages_kind_check
    check (kind in ('text', 'media', 'system', 'arrival', 'emergency', 'status', 'sticker')),
  add constraint messages_sticker_body
    check (kind <> 'sticker' or (media_id is null and body is not null and body ~ (
      '^(meetup-(0[1-9]|1[0-2])|connection-(0[1-9]|1[0-2])|usc-(fight-on|lets-go|made-it))$')));

drop policy messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and kind in ('text', 'media', 'sticker')
              and private.is_room_member(room_id)
              and (media_id is null or exists (
                select 1 from public.media m
                where m.id = media_id and m.room_id = messages.room_id
                  and m.uploader_id = (select auth.uid()))));

-- (c) characters
alter table public.profiles
  add column avatar_character smallint
    constraint profiles_avatar_character_range check (avatar_character between 1 and 12);
