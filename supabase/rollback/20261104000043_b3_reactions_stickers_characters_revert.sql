-- Revert of migration 0043 (b3_reactions_stickers_characters). NOT a migration; apply by hand only on a rollback
-- decision, after the human's OK. Returns the schema to its 0042 state (0038 reactions, 0003 messages_insert).
--
-- Lossy for B3 data, so it refuses by default. It raises 'b3_data_present' if any of these exist:
--   sticker messages (deleted, with their reactions), reactions other than 2 "Got it" (deleted), or
--   profiles.avatar_character values (the column is dropped). Remaining reaction-2 rows become 0038 checks.
-- To accept that loss, run  select set_config('b3.rollback_force', 'on', false);  in the same session first.
-- Run supabase/rollback/20261104000043_b3_precheck.sql (section B) first to see the counts.
-- Run the whole file as ONE transaction (wrap it in begin; ... commit;), so a failure changes nothing.

do $$
declare
  v_stickers bigint;
  v_other bigint;
  v_chars bigint;
begin
  select count(*) into v_stickers from public.messages where kind = 'sticker';
  select count(*) into v_other from public.message_reactions where reaction <> 2;
  select count(*) into v_chars from public.profiles where avatar_character is not null;
  if (v_stickers + v_other + v_chars) > 0 and coalesce(current_setting('b3.rollback_force', true), '') <> 'on' then
    raise exception 'b3_data_present: % sticker messages, % non-Got-it reactions, % avatar characters',
      v_stickers, v_other, v_chars;
  end if;
end $$;

-- (c) characters
alter table public.profiles drop column avatar_character;

-- (b) stickers. Deleting the sticker rows also removes their reactions (FK cascade).
delete from public.messages where kind = 'sticker';
drop policy messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and kind in ('text', 'media')
              and private.is_room_member(room_id)
              and (media_id is null or exists (
                select 1 from public.media m
                where m.id = media_id and m.room_id = messages.room_id
                  and m.uploader_id = (select auth.uid()))));
alter table public.messages
  drop constraint messages_sticker_body,
  drop constraint messages_kind_check,
  add constraint messages_kind_check
    check (kind in ('text', 'media', 'system', 'arrival', 'emergency', 'status'));

-- (a) reactions: keep only reaction 2 (one row per message and user is then guaranteed by the old key).
drop function public.toggle_message_reaction(uuid, smallint);
delete from public.message_reactions where reaction <> 2;
alter table public.message_reactions
  drop constraint message_reactions_pkey,
  add constraint message_reactions_pkey primary key (message_id, user_id),
  drop constraint message_reactions_reaction_range,
  drop column reaction;

-- toggle_message_check exactly as in supabase/migrations/20261104000038_message_reactions.sql.
-- Same name, arguments and return type, so the 0038 grants carry over.
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
