-- Spec 11 test (migration 0031: capacity, Open chat, question cards).
-- One transaction, ends with ROLLBACK. Run as postgres. The "@@MIGRATION" line below is replaced by the migration
-- text by supabase/tests/local/run.mjs (PGlite) or by the dry-run builder, so the DDL rolls back with the data.
-- Success ends with the row 'SPEC11 TESTS PASSED'.
-- Actors: H host (non-anonymous), M and A anonymous members, O anonymous outsider, X second non-anonymous host.

begin;
-- A busy rooms table makes the run fail fast instead of holding up live traffic.
set local lock_timeout = '3s';
-- @@MIGRATION supabase/migrations/20261104000031_spec11_capacity_open_chat_question_cards.sql@@

create schema tests;
grant usage on schema tests to authenticated, anon;

create function tests.login(p_uid uuid, p_anon boolean) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
$$;
create function tests.expect_ok(p_sql text, p_label text) returns void language plpgsql as $$
begin
  execute p_sql;
exception when others then
  raise exception 'FAIL: % (% %)', p_label, sqlstate, sqlerrm;
end;
$$;
-- Fails unless the statement raises with this SQLSTATE.
create function tests.expect_state(p_sql text, p_state text, p_label text) returns void language plpgsql as $$
declare v_state text;
begin
  begin
    execute p_sql;
  exception when others then
    v_state := sqlstate;
  end;
  if v_state is distinct from p_state then
    raise exception 'FAIL: % (expected SQLSTATE %, got %)', p_label, p_state, coalesce(v_state, 'success');
  end if;
end;
$$;
create function tests.expect_true(p_sql text, p_label text) returns void language plpgsql as $$
declare v boolean;
begin
  execute 'select (' || p_sql || ')' into v;
  if v is not true then
    raise exception 'FAIL: % (got %)', p_label, v;
  end if;
end;
$$;
create function tests.expect_count(p_sql text, p_n bigint, p_label text) returns void language plpgsql as $$
declare v bigint;
begin
  execute 'select count(*) from (' || p_sql || ') s' into v;
  if v is distinct from p_n then
    raise exception 'FAIL: % (expected %, got %)', p_label, p_n, v;
  end if;
end;
$$;
grant execute on all functions in schema tests to authenticated, anon;
select set_config('request.headers', '{"x-forwarded-for":"198.51.100.231"}', true);

insert into auth.users (instance_id, id, aud, role, email, is_anonymous, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'c3100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'sp11-host@test.invalid', false, '{"display_name":"S Host"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', null, true, '{"display_name":"M"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3100000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', null, true, '{"display_name":"A"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3100000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', null, true, '{"display_name":"O"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3100000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'sp11-x@test.invalid', false, '{"display_name":"X"}', now(), now());

create table tests.made (label text primary key, room_id uuid, code text);
grant all on tests.made to authenticated;

-- 0. Schema, grants, no overload.
select tests.expect_true($$ (select count(*) from pg_proc where proname = 'create_room' and pronamespace = 'public'::regnamespace) = 1 $$, 'one create_room');
select tests.expect_true($$ not has_function_privilege('anon', 'public.list_open_rooms(integer)', 'execute') $$, 'anon cannot list_open_rooms');
select tests.expect_true($$ not has_function_privilege('anon', 'public.join_open_room(uuid)', 'execute') $$, 'anon cannot join_open_room');
select tests.expect_true($$ not has_function_privilege('anon', 'public.answer_question_card(uuid, text, boolean)', 'execute') $$, 'anon cannot answer');
select tests.expect_true($$ has_function_privilege('authenticated', 'public.ask_question_in_chat(uuid)', 'execute') $$, 'authenticated can ask_question_in_chat');
select tests.expect_true($$ not has_table_privilege('authenticated', 'private.public_room_creations', 'select') $$, 'creation log is private');

set local role authenticated;
select tests.login('c3100000-0000-4000-8000-000000000001', false);

-- 1. B capacity on create.
select tests.expect_ok($$ insert into tests.made select 'cap2', r.id, r.code from public.create_room(
  p_name => 'S cap2', p_type => 'general', p_expires_at => now() + interval '3 hours', p_location_allowed => false,
  p_max_members => 2) r $$, 'capacity 2 room');
select tests.expect_ok($$ insert into tests.made select 'dflt', r.id, r.code from public.create_room(
  p_name => 'S dflt', p_type => 'general', p_expires_at => now() + interval '3 hours', p_location_allowed => false) r $$, 'old call keeps working');
select tests.expect_ok($$ insert into tests.made select 'nolimit', r.id, r.code from public.create_room(
  p_name => 'S nolimit', p_type => 'general', p_expires_at => now() + interval '3 hours', p_location_allowed => false,
  p_max_members => 6, p_no_limit => true) r $$, 'No limit with the Free plan max');
select tests.expect_state($$ select public.create_room('S c31', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 31) $$, '22023', 'capacity 31 refused');
select tests.expect_state($$ select public.create_room('S c1', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 1) $$, '22023', 'capacity 1 refused');
select tests.expect_true($$ (select max_members from public.rooms where id = (select room_id from tests.made where label = 'dflt')) = 30 $$, 'default capacity 30');
select tests.expect_true($$ (select no_limit and max_members = 6 from public.rooms where id = (select room_id from tests.made where label = 'nolimit')) $$, 'no_limit stored');

-- 2. Full room at join: host + M fill capacity 2, A is refused with PT409; M again is idempotent.
select tests.login('c3100000-0000-4000-8000-000000000002', true);
select tests.expect_ok($$ select public.join_room((select code from tests.made where label = 'cap2')) $$, 'M joins');
select tests.login('c3100000-0000-4000-8000-000000000003', true);
select tests.expect_state($$ select public.join_room((select code from tests.made where label = 'cap2')) $$, 'PT409', 'full room refused at join_room');

-- 3. D public room rules.
select tests.login('c3100000-0000-4000-8000-000000000001', false);
select tests.expect_state($$ select public.create_room('S pub', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 6, false, 'public') $$, '22023', 'public needs icon and location');
select tests.expect_state($$ select public.create_room('S pub', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 6, false, 'public', 'running', '   ') $$, '22023', 'blank location refused');
select tests.expect_state($$ select public.create_room('S priv', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 6, false, 'private', 'running', 'LA') $$, '22023', 'private cannot carry icon');
select tests.expect_state($$ select public.create_room('S bad', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 6, false, 'secret') $$, '22023', 'unknown visibility refused');
select tests.expect_state($$ select public.create_room('S badicon', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 6, false, 'public', 'Run!', 'LA') $$, '22023', 'icon key format');
select tests.expect_ok($$ insert into tests.made select 'pub1', r.id, r.code from public.create_room(
  p_name => 'S pub1', p_type => 'general', p_expires_at => now() + interval '3 hours', p_location_allowed => false,
  p_max_members => 3, p_visibility => 'public', p_public_icon => 'running', p_public_location => '  Los Angeles DTLA ') r $$, 'public room');
select tests.expect_true($$ (select public_location = 'Los Angeles DTLA' and visibility = 'public' from public.rooms where id = (select room_id from tests.made where label = 'pub1')) $$, 'location trimmed');
-- anonymous guests cannot create (host account rule unchanged)
select tests.login('c3100000-0000-4000-8000-000000000004', true);
select tests.expect_state($$ select public.create_room('S anon', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 6, false, 'public', 'running', 'LA') $$, '42501', 'guest cannot create');

-- 4. Listing: public, open, not full only.
select tests.expect_true($$ exists (select 1 from public.list_open_rooms() l where l.room_id = (select room_id from tests.made where label = 'pub1')
  and l.public_icon = 'running' and l.member_count = 1 and l.max_members = 3 and not l.already_member) $$, 'public room listed');
select tests.expect_true($$ not exists (select 1 from public.list_open_rooms() l where l.room_id in (select room_id from tests.made where label <> 'pub1')) $$, 'private rooms not listed');

-- 5. Join without a code.
select tests.expect_ok($$ select public.join_open_room((select room_id from tests.made where label = 'pub1')) $$, 'O joins public room');
select tests.expect_ok($$ select public.join_open_room((select room_id from tests.made where label = 'pub1')) $$, 'join twice is idempotent');
select tests.expect_true($$ (select count(*) from public.room_members where room_id = (select room_id from tests.made where label = 'pub1')) = 2 $$, 'two members');
select tests.expect_true($$ public.join_open_room((select room_id from tests.made where label = 'dflt')) is null $$, 'private room id returns null');
select tests.expect_true($$ public.join_open_room('c3199999-0000-4000-8000-000000000000') is null $$, 'unknown id returns null');
select tests.login('c3100000-0000-4000-8000-000000000003', true);
select tests.expect_ok($$ select public.join_open_room((select room_id from tests.made where label = 'pub1')) $$, 'A fills the room (3/3)');
select tests.login('c3100000-0000-4000-8000-000000000002', true);
select tests.expect_true($$ not exists (select 1 from public.list_open_rooms() l where l.room_id = (select room_id from tests.made where label = 'pub1')) $$, 'full room leaves the list');
select tests.login('c3100000-0000-4000-8000-000000000005', false);
select tests.expect_state($$ select public.join_open_room((select room_id from tests.made where label = 'pub1')) $$, 'PT409', 'full public room refused');

-- 6. Expired and deleted rooms never list or join (read-time check; the janitor has not run).
reset role;
update public.rooms set created_at = now() - interval '2 hours', expires_at = now() - interval '1 minute' where id = (select room_id from tests.made where label = 'pub1');
set local role authenticated;
select tests.login('c3100000-0000-4000-8000-000000000005', false);
select tests.expect_true($$ not exists (select 1 from public.list_open_rooms() l where l.room_id = (select room_id from tests.made where label = 'pub1')) $$, 'expired room not listed');
select tests.expect_true($$ public.join_open_room((select room_id from tests.made where label = 'pub1')) is null $$, 'expired room cannot be joined');

-- 7. 5 public rooms per rolling 24 h per person (X has none yet; H made 1 above, kept as the baseline test for H).
select tests.expect_ok($$ select public.create_room('X pub ' || g, 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 6, false, 'public', 'hiking', 'Griffith') from generate_series(1, 5) g $$, 'X creates 5');
select tests.expect_state($$ select public.create_room('X pub 6', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 6, false, 'public', 'hiking', 'Griffith') $$, 'PT422', 'sixth public room refused');
select tests.expect_ok($$ select public.create_room('X private', 'general', now() + interval '3 hours', false) $$, 'private rooms are not limited');
reset role;
update private.public_room_creations set created_at = now() - interval '25 hours'
  where id = (select id from private.public_room_creations where user_id = 'c3100000-0000-4000-8000-000000000005' order by created_at limit 1);
set local role authenticated;
select tests.login('c3100000-0000-4000-8000-000000000005', false);
select tests.expect_ok($$ select public.create_room('X pub 7', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 6, false, 'public', 'hiking', 'Griffith') $$, 'a creation older than 24 h frees one');
select tests.expect_state($$ select public.create_room('X pub 8', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 6, false, 'public', 'hiking', 'Griffith') $$, 'PT422', 'back at the limit');

-- 8. Direct writes are denied (no policy): a host cannot flip visibility or write cards.
select tests.login('c3100000-0000-4000-8000-000000000001', false);
update public.rooms set visibility = 'public' where id = (select room_id from tests.made where label = 'dflt');
select tests.expect_true($$ (select visibility from public.rooms where id = (select room_id from tests.made where label = 'dflt')) = 'private' $$, 'direct visibility update denied');
select tests.expect_state($$ insert into public.question_cards (room_id, asker_id, answerer_id, question)
  values ((select room_id from tests.made where label = 'dflt'), 'c3100000-0000-4000-8000-000000000001', 'c3100000-0000-4000-8000-000000000002', 'q') $$, '42501', 'direct card insert denied');

-- 9. C question cards. Room 'cap2' is full of H + M; use a fresh room with H, M, A and outsider O.
select tests.expect_ok($$ insert into tests.made select 'qroom', r.id, r.code from public.create_room(
  p_name => 'S q', p_type => 'general', p_expires_at => now() + interval '3 hours', p_location_allowed => false) r $$, 'question room');
select tests.login('c3100000-0000-4000-8000-000000000002', true);
select tests.expect_ok($$ select public.join_room((select code from tests.made where label = 'qroom')) $$, 'M joins qroom');
select tests.login('c3100000-0000-4000-8000-000000000003', true);
select tests.expect_ok($$ select public.join_room((select code from tests.made where label = 'qroom')) $$, 'A joins qroom');
reset role;
-- The qrewing function (service role) creates the card; here postgres plays the service role.
insert into public.question_cards (id, room_id, asker_id, answerer_id, question) values
  ('c3150000-0000-4000-8000-000000000001', (select room_id from tests.made where label = 'qroom'), 'c3100000-0000-4000-8000-000000000003', 'c3100000-0000-4000-8000-000000000001', 'Where do we meet?'),
  ('c3150000-0000-4000-8000-000000000002', (select room_id from tests.made where label = 'qroom'), 'c3100000-0000-4000-8000-000000000003', 'c3100000-0000-4000-8000-000000000001', 'Is there parking?');
set local role authenticated;
select tests.login('c3100000-0000-4000-8000-000000000003', true);
select tests.expect_count($$ select 1 from public.question_cards $$, 2, 'asker reads own cards');
select tests.login('c3100000-0000-4000-8000-000000000001', false);
select tests.expect_count($$ select 1 from public.question_cards $$, 2, 'answerer reads the cards');
select tests.login('c3100000-0000-4000-8000-000000000002', true);
select tests.expect_count($$ select 1 from public.question_cards $$, 0, 'other member sees no card');
select tests.expect_state($$ select public.answer_question_card('c3150000-0000-4000-8000-000000000001', 'Gate B') $$, '42501', 'non-answerer cannot answer');
select tests.login('c3100000-0000-4000-8000-000000000003', true);
select tests.expect_state($$ select public.answer_question_card('c3150000-0000-4000-8000-000000000001', 'self') $$, '42501', 'asker cannot answer');
select tests.expect_state($$ select public.ask_question_in_chat('c3150000-0000-4000-8000-000000000001') $$, '22023', 'no chat offer before the timeout');
select tests.login('c3100000-0000-4000-8000-000000000001', false);
select tests.expect_state($$ select public.answer_question_card('c3150000-0000-4000-8000-000000000001', '   ') $$, '22023', 'blank answer refused');
select tests.expect_ok($$ select public.answer_question_card('c3150000-0000-4000-8000-000000000001', 'Gate B at 6', true) $$, 'answer with Post as notice');
select tests.expect_true($$ (select notice_text = 'Gate B at 6' and notice_set_by = 'c3100000-0000-4000-8000-000000000001' from public.rooms where id = (select room_id from tests.made where label = 'qroom')) $$, 'notice pinned');
select tests.login('c3100000-0000-4000-8000-000000000003', true);
select tests.expect_true($$ (select answer = 'Gate B at 6' and status = 'answered' and posted_as_notice from public.question_cards where id = 'c3150000-0000-4000-8000-000000000001') $$, 'asker reads the answer');
select tests.expect_true($$ (select notice_text from public.rooms where id = (select room_id from tests.made where label = 'qroom')) = 'Gate B at 6' $$, 'members read the notice');
select tests.expect_state($$ select public.ask_question_in_chat('c3150000-0000-4000-8000-000000000001') $$, 'PT409', 'answered card cannot go to chat');
-- Timeout offer on card 2.
reset role;
update public.question_cards set timeout_at = now() - interval '1 second' where id = 'c3150000-0000-4000-8000-000000000002';
set local role authenticated;
select tests.login('c3100000-0000-4000-8000-000000000002', true);
select tests.expect_state($$ select public.ask_question_in_chat('c3150000-0000-4000-8000-000000000002') $$, '42501', 'only the asker can use the offer');
select tests.login('c3100000-0000-4000-8000-000000000003', true);
select tests.expect_ok($$ select public.ask_question_in_chat('c3150000-0000-4000-8000-000000000002') $$, 'asker takes the offer');
select tests.expect_ok($$ select public.ask_question_in_chat('c3150000-0000-4000-8000-000000000002') $$, 'offer is idempotent');
select tests.expect_true($$ (select count(*) from public.messages where room_id = (select room_id from tests.made where label = 'qroom')
  and kind = 'text' and sender_id = 'c3100000-0000-4000-8000-000000000003' and body = 'Is there parking?') = 1 $$, 'question posted once as a chat message');
select tests.login('c3100000-0000-4000-8000-000000000001', false);
select tests.expect_state($$ select public.answer_question_card('c3150000-0000-4000-8000-000000000002', 'late') $$, 'PT409', 'moved card cannot be answered');
-- set_room_notice: host only, clearing works.
select tests.expect_ok($$ select public.set_room_notice((select room_id from tests.made where label = 'qroom'), '') $$, 'host clears the notice');
select tests.expect_true($$ (select notice_text is null and notice_set_at is null from public.rooms where id = (select room_id from tests.made where label = 'qroom')) $$, 'notice cleared');
select tests.login('c3100000-0000-4000-8000-000000000002', true);
select tests.expect_state($$ select public.set_room_notice((select room_id from tests.made where label = 'qroom'), 'x') $$, '42501', 'member cannot set the notice');

-- 10. Pending cap: 5 pending per asker per room.
reset role;
select tests.expect_ok($$ insert into public.question_cards (room_id, asker_id, answerer_id, question)
  select (select room_id from tests.made where label = 'qroom'), 'c3100000-0000-4000-8000-000000000003', 'c3100000-0000-4000-8000-000000000001', 'q' || g from generate_series(1, 5) g $$, 'five pending cards');
select tests.expect_state($$ insert into public.question_cards (room_id, asker_id, answerer_id, question)
  values ((select room_id from tests.made where label = 'qroom'), 'c3100000-0000-4000-8000-000000000003', 'c3100000-0000-4000-8000-000000000001', 'q6') $$, '54000', 'sixth pending card refused');
select tests.expect_state($$ insert into public.question_cards (room_id, asker_id, answerer_id, question)
  values ((select room_id from tests.made where label = 'qroom'), 'c3100000-0000-4000-8000-000000000003', 'c3100000-0000-4000-8000-000000000004', 'leak') $$, '42501', 'answerer outside the room refused');
select tests.expect_state($$ insert into public.question_cards (room_id, asker_id, answerer_id, question)
  values ((select room_id from tests.made where label = 'qroom'), 'c3100000-0000-4000-8000-000000000004', 'c3100000-0000-4000-8000-000000000001', 'x') $$, '42501', 'asker outside the room refused');

-- 11. Read-time expiry: cards vanish with the room (RLS), even before the janitor deletes it.
update public.rooms set created_at = now() - interval '2 hours', expires_at = now() - interval '1 minute' where id = (select room_id from tests.made where label = 'qroom');
set local role authenticated;
select tests.login('c3100000-0000-4000-8000-000000000003', true);
select tests.expect_count($$ select 1 from public.question_cards $$, 0, 'expired room: no card readable');
reset role;

-- 12. Deletion: cards go with the room row.
delete from public.rooms where id = (select room_id from tests.made where label = 'qroom');
select tests.expect_count($$ select 1 from public.question_cards where room_id = (select room_id from tests.made where label = 'qroom') $$, 0, 'cards cascade with the room');

-- 12. A1 default avatars: 'default:<key>' is accepted, anything else outside the owner's folder is not.
reset role;
insert into public.profiles (id, display_name) values ('c3100000-0000-4000-8000-000000000001', 'H') on conflict (id) do nothing;
select tests.expect_ok($$ update public.profiles set avatar_path = 'default:star' where id = 'c3100000-0000-4000-8000-000000000001' $$, 'default avatar accepted');
select tests.expect_state($$ update public.profiles set avatar_path = 'default:Bad Key' where id = 'c3100000-0000-4000-8000-000000000001' $$, '22023', 'bad default key refused');
select tests.expect_state($$ update public.profiles set avatar_path = 'someone/else.jpg' where id = 'c3100000-0000-4000-8000-000000000001' $$, '22023', 'foreign path refused');
select tests.expect_ok($$ update public.profiles set avatar_path = null where id = 'c3100000-0000-4000-8000-000000000001' $$, 'default avatar cleared');
select tests.expect_count($$ select 1 from public.cleanup_jobs where reason = 'avatar_replaced' $$, 0, 'a default avatar queues no cleanup');

select 'SPEC11 TESTS PASSED' as result;
rollback;
