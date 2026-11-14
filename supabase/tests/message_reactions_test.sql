-- S3 / 0038 test: message_reactions + toggle_message_check.
-- One transaction, ends with ROLLBACK. Run as postgres (Supabase MCP execute_sql, after 0038 is applied) or locally:
-- node supabase/tests/local/run.mjs supabase/migrations 20261104000038 <this file>.
-- Success ends with the row 'MESSAGE REACTIONS TESTS PASSED'.
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
  ('00000000-0000-0000-0000-000000000000', 'c3800000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'mr-host@test.invalid', false, '{"display_name":"Host"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3800000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', null, true, '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3800000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', null, true, '{}', now(), now());

select tests.login('c3800000-0000-4000-8000-000000000001', false);
set local role authenticated;
do $$
declare r public.rooms;
begin
  r := public.create_room('Reactions test', 'sports', now() + interval '1 day', false, array['Resting']);
  perform set_config('t.r', r.id::text, true);
  perform set_config('t.token', r.invite_token, true);
end $$;
reset role;

select tests.login('c3800000-0000-4000-8000-000000000002', true);
set local role authenticated;
select public.join_room(null, current_setting('t.token'));
reset role;

-- t.m: G's text message; t.sys: a system line.
select set_config('t.m', gen_random_uuid()::text, true);
select set_config('t.sys', gen_random_uuid()::text, true);
select tests.login('c3800000-0000-4000-8000-000000000002', true);
set local role authenticated;
insert into public.messages (id, room_id, sender_id, kind, body)
values (current_setting('t.m')::uuid, current_setting('t.r')::uuid, 'c3800000-0000-4000-8000-000000000002', 'text', 'hello');
reset role;
insert into public.messages (id, room_id, sender_id, kind, body)
values (current_setting('t.sys')::uuid, current_setting('t.r')::uuid, null, 'system', 'Someone left');

create function tests.checks() returns bigint language sql as $$
  select count(*) from public.message_reactions where message_id = current_setting('t.m')::uuid;
$$;

-- 1. H checks G's message: true, one row with the message's room_id.
select tests.login('c3800000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect(public.toggle_message_check(current_setting('t.m')::uuid), 'first toggle returns true');
reset role;
select tests.expect(tests.checks() = 1, 'one check');
select tests.expect((select room_id from public.message_reactions where message_id = current_setting('t.m')::uuid)
                    = current_setting('t.r')::uuid, 'room_id copied from the message');

-- 2. G checks own message too: two rows; G can read both.
select tests.login('c3800000-0000-4000-8000-000000000002', true);
set local role authenticated;
select tests.expect(public.toggle_message_check(current_setting('t.m')::uuid), 'own message can be checked');
select tests.expect((select count(*) from public.message_reactions where message_id = current_setting('t.m')::uuid) = 2,
                    'member reads all checks');
reset role;

-- 3. H toggles again: false, back to one row.
select tests.login('c3800000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect(not public.toggle_message_check(current_setting('t.m')::uuid), 'second toggle returns false');
reset role;
select tests.expect(tests.checks() = 1, 'check removed');

-- 4. System line: 22023.
select tests.login('c3800000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect(tests.code(format('select public.toggle_message_check(%L)', current_setting('t.sys'))) = '22023',
                    'system line gets 22023');
reset role;

-- 5. Outsider: 42501, reads nothing. Unknown message: 42501.
select tests.login('c3800000-0000-4000-8000-000000000003', true);
set local role authenticated;
select tests.expect(tests.code(format('select public.toggle_message_check(%L)', current_setting('t.m'))) = '42501',
                    'outsider gets 42501');
select tests.expect(tests.code(format('select public.toggle_message_check(%L)', gen_random_uuid())) = '42501',
                    'unknown message gets 42501');
select tests.expect((select count(*) from public.message_reactions) = 0, 'outsider reads no checks');
reset role;

-- 6. Direct writes by a member are blocked.
select tests.login('c3800000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect(tests.code(format(
  'insert into public.message_reactions (room_id, message_id, user_id) values (%L, %L, %L)',
  current_setting('t.r'), current_setting('t.m'), 'c3800000-0000-4000-8000-000000000001')) = '42501', 'direct insert denied');
select tests.expect(tests.code(format('delete from public.message_reactions where message_id = %L', current_setting('t.m'))) = '42501',
                    'direct delete denied');
reset role;
select tests.expect(tests.checks() = 1, 'direct writes changed nothing');

-- 7. Expired room: member reads nothing and cannot toggle.
update public.rooms set created_at = now() - interval '2 hours', expires_at = now() - interval '1 minute'
 where id = current_setting('t.r')::uuid;
select tests.login('c3800000-0000-4000-8000-000000000002', true);
set local role authenticated;
select tests.expect((select count(*) from public.message_reactions) = 0, 'expired room: no checks readable');
select tests.expect(tests.code(format('select public.toggle_message_check(%L)', current_setting('t.m'))) = '42501',
                    'expired room: toggle 42501');
reset role;

-- 8. Deleting the message removes its checks.
delete from public.messages where id = current_setting('t.m')::uuid;
select tests.expect(tests.checks() = 0, 'checks go with the message');

-- 9. Grants.
select tests.expect(not has_function_privilege('anon', 'public.toggle_message_check(uuid)', 'execute'), 'anon: no execute');
select tests.expect(has_function_privilege('authenticated', 'public.toggle_message_check(uuid)', 'execute'), 'authenticated: execute');
select tests.expect(not has_table_privilege('anon', 'public.message_reactions', 'select'), 'anon: no select');

select 'MESSAGE REACTIONS TESTS PASSED';

rollback;
