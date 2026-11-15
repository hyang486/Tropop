-- B3 / 0043 checks. Read-only (selects only); safe to run as postgres at any time. Not a migration.
-- Section A: run BEFORE applying 0043. Every row should show ok = true; any false means stop and ask.
-- Section B: run BEFORE the 0043 revert. It shows what the revert would delete (see its header).

-- A. Pre-apply: the live schema is the 0042 shape that 0043 expects.
select 'A1 0042 applied (connect tables exist)' as check, to_regclass('public.connect_requests') is not null as ok
union all
select 'A2 message_reactions PK is (message_id, user_id)',
  (select pg_get_constraintdef(c.oid) from pg_constraint c
    where c.conname = 'message_reactions_pkey' and c.conrelid = 'public.message_reactions'::regclass)
  = 'PRIMARY KEY (message_id, user_id)'
union all
select 'A3 no reaction column yet',
  not exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'message_reactions' and column_name = 'reaction')
union all
select 'A4 messages_kind_check is the 0001 list',
  (select pg_get_constraintdef(c.oid) from pg_constraint c
    where c.conname = 'messages_kind_check' and c.conrelid = 'public.messages'::regclass)
  like '%''text''%''media''%''system''%''arrival''%''emergency''%''status''%'
  and (select pg_get_constraintdef(c.oid) from pg_constraint c
        where c.conname = 'messages_kind_check' and c.conrelid = 'public.messages'::regclass) not like '%sticker%'
union all
select 'A5 no sticker messages', not exists (select 1 from public.messages where kind = 'sticker')
union all
select 'A6 no avatar_character column yet',
  not exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar_character')
union all
select 'A7 no toggle_message_reaction yet', to_regprocedure('public.toggle_message_reaction(uuid, smallint)') is null
union all
select 'A8 messages_insert policy exists', exists (select 1 from pg_policies
  where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_insert');

-- A9. Counts to compare after the apply (0043 keeps every row; all become reaction 2).
select count(*) as reaction_rows, count(distinct message_id) as messages, count(distinct room_id) as rooms
  from public.message_reactions;

-- B. Pre-revert: what the revert would delete or drop (all zero = lossless).
-- Run only after 0043 is applied (it reads the 0043 columns).
-- select
--   (select count(*) from public.messages where kind = 'sticker') as sticker_messages,
--   (select count(*) from public.message_reactions where reaction <> 2) as non_got_it_reactions,
--   (select count(*) from public.profiles where avatar_character is not null) as avatar_characters,
--   (select count(*) from public.message_reactions where reaction = 2) as kept_checks;
