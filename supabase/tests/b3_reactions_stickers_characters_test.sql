-- B3 / 0043 test: reactions 1-12 (+ the 0038 check -> reaction 2 data migration), sticker messages, avatar_character.
-- One transaction, ends with ROLLBACK. Run as postgres on a database at 0042. The "@@MIGRATION" line below is
-- replaced by the migration text by supabase/tests/local/run.mjs (PGlite):
-- node run.mjs supabase/migrations 20261104000042 supabase/tests/b3_reactions_stickers_characters_test.sql
-- Success ends with the row 'B3 0043 TESTS PASSED'.
--
-- Actors: H host, G guest, O outsider (never joins).

begin;

create schema tests;
grant usage on schema tests to authenticated;

create function tests.login(p_uid uuid, p_anon boolean) returns void language sql as $$
  select set_config('request.jwt.claims',
           json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
$$;

create function tests.expect(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then
    raise exception 'FAIL: %', p_label;
  end if;
end;
$$;

create function tests.code(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;

grant execute on all functions in schema tests to authenticated;

insert into auth.users (instance_id, id, aud, role, email, is_anonymous, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'c4300000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'b3-host@test.invalid', false, '{"display_name":"Host"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c4300000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', null, true, '{"display_name":"Gee"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c4300000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', null, true, '{"display_name":"Oz"}', now(), now());

select tests.login('c4300000-0000-4000-8000-000000000001', false);
set local role authenticated;
do $$
declare r public.rooms;
begin
  r := public.create_room('B3 test', 'sports', now() + interval '1 day', false, array['Resting']);
  perform set_config('t.r', r.id::text, true);
  perform set_config('t.token', r.invite_token, true);
end $$;
reset role;

select tests.login('c4300000-0000-4000-8000-000000000002', true);
set local role authenticated;
select public.join_room(null, current_setting('t.token'));
reset role;

-- t.m: G's text; t.m2: H's text; t.sys: a system line.
select set_config('t.m', gen_random_uuid()::text, true);
select set_config('t.m2', gen_random_uuid()::text, true);
select set_config('t.sys', gen_random_uuid()::text, true);
insert into public.messages (id, room_id, sender_id, kind, body) values
  (current_setting('t.m')::uuid, current_setting('t.r')::uuid, 'c4300000-0000-4000-8000-000000000002', 'text', 'hello'),
  (current_setting('t.m2')::uuid, current_setting('t.r')::uuid, 'c4300000-0000-4000-8000-000000000001', 'text', 'hi'),
  (current_setting('t.sys')::uuid, current_setting('t.r')::uuid, null, 'system', 'Someone left');

-- Pre-0043 state: three 0038 checks (H and G on t.m, G on t.m2).
select tests.login('c4300000-0000-4000-8000-000000000001', false);
set local role authenticated;
select public.toggle_message_check(current_setting('t.m')::uuid);
reset role;
select tests.login('c4300000-0000-4000-8000-000000000002', true);
set local role authenticated;
select public.toggle_message_check(current_setting('t.m')::uuid);
select public.toggle_message_check(current_setting('t.m2')::uuid);
reset role;

-- @@MIGRATION supabase/migrations/20261104000043_b3_reactions_stickers_characters.sql@@

-- 1. Data migration: every 0038 check is now reaction 2 ("Got it"); nothing lost.
select tests.expect((select count(*) from public.message_reactions) = 3, 'migration keeps all 3 rows');
select tests.expect((select count(*) from public.message_reactions where reaction = 2) = 3, 'old checks become reaction 2');
select tests.expect((select is_nullable from information_schema.columns
                      where table_name = 'message_reactions' and column_name = 'reaction') = 'NO', 'reaction not null');

create function tests.n(p_msg text, p_user uuid, p_reaction int) returns bigint language sql as $$
  select count(*) from public.message_reactions
   where message_id = current_setting(p_msg)::uuid and user_id = p_user and reaction = p_reaction;
$$;

-- 2. Kinds toggle independently: G adds Love (1) on t.m beside the migrated Got it (2), then removes Love only.
select tests.login('c4300000-0000-4000-8000-000000000002', true);
set local role authenticated;
select tests.expect(public.toggle_message_reaction(current_setting('t.m')::uuid, 1::smallint), 'Love on: true');
reset role;
select tests.expect(tests.n('t.m', 'c4300000-0000-4000-8000-000000000002', 1) = 1
                and tests.n('t.m', 'c4300000-0000-4000-8000-000000000002', 2) = 1, 'Love and Got it coexist');
select tests.expect((select room_id from public.message_reactions where message_id = current_setting('t.m')::uuid and reaction = 1)
                    = current_setting('t.r')::uuid, 'room_id copied from the message');
select tests.login('c4300000-0000-4000-8000-000000000002', true);
set local role authenticated;
select tests.expect(not public.toggle_message_reaction(current_setting('t.m')::uuid, 1::smallint), 'Love off: false');
select tests.expect(public.toggle_message_reaction(current_setting('t.m')::uuid, 12::smallint), 'Hi (12) on');
reset role;
select tests.expect(tests.n('t.m', 'c4300000-0000-4000-8000-000000000002', 1) = 0
                and tests.n('t.m', 'c4300000-0000-4000-8000-000000000002', 2) = 1, 'only Love removed');

-- 3. Legacy toggle_message_check toggles reaction 2 only.
select tests.login('c4300000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect(not public.toggle_message_check(current_setting('t.m')::uuid), 'legacy: H Got it off');
select tests.expect(public.toggle_message_check(current_setting('t.m')::uuid), 'legacy: H Got it on');
reset role;
select tests.expect(tests.n('t.m', 'c4300000-0000-4000-8000-000000000001', 2) = 1, 'legacy row is reaction 2');

-- 4. Bad reaction values and non-reactable lines: 22023.
select tests.login('c4300000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect(tests.code(format('select public.toggle_message_reaction(%L, 0::smallint)', current_setting('t.m'))) = '22023', 'reaction 0');
select tests.expect(tests.code(format('select public.toggle_message_reaction(%L, 13::smallint)', current_setting('t.m'))) = '22023', 'reaction 13');
select tests.expect(tests.code(format('select public.toggle_message_reaction(%L, null)', current_setting('t.m'))) = '22023', 'reaction null');
select tests.expect(tests.code(format('select public.toggle_message_reaction(%L, 1::smallint)', current_setting('t.sys'))) = '22023', 'system line');
reset role;
select tests.expect(tests.code(format(
  'insert into public.message_reactions (room_id, message_id, user_id, reaction) values (%L, %L, %L, 13)',
  current_setting('t.r'), current_setting('t.m'), 'c4300000-0000-4000-8000-000000000001')) = '23514', 'table check 1-12');
select tests.expect(tests.code(format(
  'insert into public.message_reactions (room_id, message_id, user_id, reaction) values (%L, %L, %L, 2)',
  current_setting('t.r'), current_setting('t.m'), 'c4300000-0000-4000-8000-000000000001')) = '23505', 'unique (message, user, reaction)');

-- 5. Stickers: a member sends valid ids; invalid ids, missing body, media or outsiders are rejected.
select set_config('t.st', gen_random_uuid()::text, true);
select tests.login('c4300000-0000-4000-8000-000000000002', true);
set local role authenticated;
select tests.expect(tests.code(format(
  'insert into public.messages (id, room_id, sender_id, kind, body) values (%L, %L, %L, %L, %L)',
  current_setting('t.st'), current_setting('t.r'), 'c4300000-0000-4000-8000-000000000002', 'sticker', 'meetup-01')) = 'ok', 'sticker meetup-01');
select tests.expect(tests.code(format(
  'insert into public.messages (room_id, sender_id, kind, body) values (%L, %L, %L, %L)',
  current_setting('t.r'), 'c4300000-0000-4000-8000-000000000002', 'sticker', 'connection-12')) = 'ok', 'sticker connection-12');
select tests.expect(tests.code(format(
  'insert into public.messages (room_id, sender_id, kind, body) values (%L, %L, %L, %L)',
  current_setting('t.r'), 'c4300000-0000-4000-8000-000000000002', 'sticker', 'usc-made-it')) = 'ok', 'sticker usc-made-it');
select tests.expect(tests.code(format(
  'insert into public.messages (room_id, sender_id, kind, body) values (%L, %L, %L, %L)',
  current_setting('t.r'), 'c4300000-0000-4000-8000-000000000002', 'sticker', 'meetup-13')) = '23514', 'unknown sticker id');
select tests.expect(tests.code(format(
  'insert into public.messages (room_id, sender_id, kind, body) values (%L, %L, %L, %L)',
  current_setting('t.r'), 'c4300000-0000-4000-8000-000000000002', 'sticker', 'meetup-01 ')) = '23514', 'id with trailing space');
select tests.expect(tests.code(format(
  'insert into public.messages (room_id, sender_id, kind, body) values (%L, %L, %L, null)',
  current_setting('t.r'), 'c4300000-0000-4000-8000-000000000002', 'sticker')) = '23514', 'sticker without body');
select tests.expect(tests.code(format(
  'insert into public.messages (room_id, sender_id, kind, body) values (%L, %L, %L, %L)',
  current_setting('t.r'), 'c4300000-0000-4000-8000-000000000002', 'status', 'meetup-01')) = '42501', 'members still cannot post status lines');
-- Stickers are reactable.
select tests.expect(public.toggle_message_reaction(current_setting('t.st')::uuid, 5::smallint), 'react to a sticker');
reset role;
select tests.login('c4300000-0000-4000-8000-000000000003', true);
set local role authenticated;
select tests.expect(tests.code(format(
  'insert into public.messages (room_id, sender_id, kind, body) values (%L, %L, %L, %L)',
  current_setting('t.r'), 'c4300000-0000-4000-8000-000000000003', 'sticker', 'meetup-02')) = '42501', 'outsider cannot send a sticker');
select tests.expect(tests.code(format('select public.toggle_message_reaction(%L, 1::smallint)', current_setting('t.m'))) = '42501', 'outsider cannot react');
select tests.expect((select count(*) from public.message_reactions) = 0, 'outsider reads no reactions');
select tests.expect((select count(*) from public.messages where kind = 'sticker') = 0, 'outsider reads no stickers');
reset role;
-- Media id on a sticker is rejected even for the server.
select tests.expect(tests.code(format(
  'insert into public.messages (room_id, sender_id, kind, body, media_id) values (%L, null, %L, %L, %L)',
  current_setting('t.r'), 'sticker', 'meetup-01', gen_random_uuid())) in ('23514', '23503'), 'sticker with media_id');
select tests.expect((select count(*) from public.messages where kind = 'sticker') = 3, 'three stickers stored');

-- 6. avatar_character: own row 1-12 or null; others' rows untouched.
insert into public.profiles (id, display_name) values ('c4300000-0000-4000-8000-000000000002', 'Gee'),
  ('c4300000-0000-4000-8000-000000000001', 'Host')
  on conflict (id) do nothing;
select tests.login('c4300000-0000-4000-8000-000000000002', true);
set local role authenticated;
select tests.expect(tests.code('update public.profiles set avatar_character = 5 where id = ''c4300000-0000-4000-8000-000000000002''') = 'ok', 'set own 5');
select tests.expect((select avatar_character from public.profiles where id = 'c4300000-0000-4000-8000-000000000002') = 5, 'reads own 5');
select tests.expect(tests.code('update public.profiles set avatar_character = 13 where id = ''c4300000-0000-4000-8000-000000000002''') = '23514', 'character 13');
select tests.expect(tests.code('update public.profiles set avatar_character = 0 where id = ''c4300000-0000-4000-8000-000000000002''') = '23514', 'character 0');
update public.profiles set avatar_character = 9 where id = 'c4300000-0000-4000-8000-000000000001';
reset role;
select tests.expect((select avatar_character from public.profiles where id = 'c4300000-0000-4000-8000-000000000001') is null, 'cannot set another user''s character');
select tests.login('c4300000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect((select avatar_character from public.profiles where id = 'c4300000-0000-4000-8000-000000000002') = 5, 'room member sees the character');
reset role;
select tests.login('c4300000-0000-4000-8000-000000000002', true);
set local role authenticated;
select tests.expect(tests.code('update public.profiles set avatar_character = null where id = ''c4300000-0000-4000-8000-000000000002''') = 'ok', 'clear to default');
reset role;

-- 7. Expired room: no reactions or stickers readable, toggle 42501, sticker insert denied.
update public.rooms set created_at = now() - interval '2 hours', expires_at = now() - interval '1 minute'
 where id = current_setting('t.r')::uuid;
select tests.login('c4300000-0000-4000-8000-000000000002', true);
set local role authenticated;
select tests.expect((select count(*) from public.message_reactions) = 0, 'expired: no reactions readable');
select tests.expect(tests.code(format('select public.toggle_message_reaction(%L, 1::smallint)', current_setting('t.m'))) = '42501', 'expired: toggle 42501');
select tests.expect(tests.code(format(
  'insert into public.messages (room_id, sender_id, kind, body) values (%L, %L, %L, %L)',
  current_setting('t.r'), 'c4300000-0000-4000-8000-000000000002', 'sticker', 'meetup-03')) = '42501', 'expired: sticker denied');
reset role;

-- 8. Cascade: deleting the message removes all its reactions.
delete from public.messages where id = current_setting('t.m')::uuid;
select tests.expect((select count(*) from public.message_reactions where message_id = current_setting('t.m')::uuid) = 0, 'reactions go with the message');

-- 9. Grants.
select tests.expect(not has_function_privilege('anon', 'public.toggle_message_reaction(uuid, smallint)', 'execute'), 'anon: no execute');
select tests.expect(has_function_privilege('authenticated', 'public.toggle_message_reaction(uuid, smallint)', 'execute'), 'authenticated: execute');
select tests.expect(has_function_privilege('authenticated', 'public.toggle_message_check(uuid)', 'execute'), 'legacy still granted');
select tests.expect(not has_function_privilege('anon', 'public.toggle_message_check(uuid)', 'execute'), 'legacy: anon no execute');

select 'B3 0043 TESTS PASSED';

rollback;
