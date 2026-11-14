-- Emergency "On my way" test for 0040 (set_emergency_on_way, emergency_acks.on_way/on_way_at).
-- One transaction, ends with ROLLBACK: leaves no data behind. Run as postgres (Supabase MCP execute_sql, after
-- 0040 is applied) or locally: node supabase/tests/local/run.mjs supabase/migrations 20261104000040 <this file>.
-- Success ends with the row 'EMERGENCY ON WAY TESTS PASSED'.
--
-- Actors: H host (responder), G guest (in Emergency), M second guest, O outsider (never joins).

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

-- Runs p_sql and returns 'ok' or the SQLSTATE it raised.
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
  ('00000000-0000-0000-0000-000000000000', 'c4000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'ow-host@test.invalid', false, '{"display_name":"Host"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c4000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', null, true, '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c4000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', null, true, '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c4000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', null, true, '{}', now(), now());

select tests.login('c4000000-0000-4000-8000-000000000001', false);
set local role authenticated;
do $$
declare r public.rooms;
begin
  r := public.create_room('On my way test', 'sports', now() + interval '1 day', false, array['Resting']);
  perform set_config('t.r', r.id::text, true);
  perform set_config('t.token', r.invite_token, true);
end $$;
reset role;

select set_config('t.emg', (select id::text from public.status_definitions
                             where room_id = current_setting('t.r')::uuid and is_emergency), true);

select tests.login('c4000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select public.join_room(null, current_setting('t.token'));
reset role;
select tests.login('c4000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select public.join_room(null, current_setting('t.token'));
reset role;

-- G enters Emergency; t.ev is the event.
select tests.login('c4000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select set_config('t.ev', public.set_my_status(current_setting('t.r')::uuid, current_setting('t.emg')::uuid)::text, true);
reset role;
select tests.expect(current_setting('t.ev') <> '', 'Emergency event created');

create function tests.on_way_lines() returns bigint language sql as $$
  select count(*) from public.messages
   where room_id = current_setting('t.r')::uuid and kind = 'status' and body like '% is on the way';
$$;
create function tests.ack(p_uid uuid) returns public.emergency_acks language sql as $$
  select * from public.emergency_acks where event_id = current_setting('t.ev')::uuid and user_id = p_uid;
$$;

-- 1. Existing columns: defaults.
select tests.expect((select column_default from information_schema.columns
                      where table_schema = 'public' and table_name = 'emergency_acks' and column_name = 'on_way') = 'false',
                    'on_way defaults to false');

-- 2. Outsider: 42501, nothing written.
select tests.login('c4000000-0000-4000-8000-000000000004', true);
set local role authenticated;
select tests.expect(tests.code(format('select public.set_emergency_on_way(%L, true)', current_setting('t.ev'))) = '42501',
                    'outsider gets 42501');
select tests.expect(tests.code(format('select public.set_emergency_on_way(%L, true)', gen_random_uuid())) = '42501',
                    'unknown event gets 42501');
reset role;
select tests.expect(tests.ack('c4000000-0000-4000-8000-000000000004') is null, 'outsider wrote no ack');

-- 3. The sender cannot say they are on their own way: PT403.
select tests.login('c4000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select tests.expect(tests.code(format('select public.set_emergency_on_way(%L, true)', current_setting('t.ev'))) = 'PT403',
                    'sender gets PT403');
select tests.expect(tests.code(format('select public.set_emergency_on_way(%L, null)', current_setting('t.ev'))) = '22023',
                    'null p_on gets 22023');
reset role;

-- 4. H: On my way. Row is seen + on way, one line from H.
select tests.login('c4000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect((public.set_emergency_on_way(current_setting('t.ev')::uuid, true)).on_way, 'returns the row, on_way true');
reset role;
select tests.expect((tests.ack('c4000000-0000-4000-8000-000000000001')).on_way_at is not null, 'on_way_at set');
select set_config('t.at', (tests.ack('c4000000-0000-4000-8000-000000000001')).on_way_at::text, true);
select tests.expect(tests.on_way_lines() = 1, 'one on-the-way line');
select tests.expect((select sender_id from public.messages
                      where room_id = current_setting('t.r')::uuid and body = 'Host is on the way')
                    = 'c4000000-0000-4000-8000-000000000001', 'line "Host is on the way" is from H');

-- 5. H again (double tap): no second line.
select tests.login('c4000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select public.set_emergency_on_way(current_setting('t.ev')::uuid, true);
reset role;
select tests.expect(tests.on_way_lines() = 1, 'repeat On my way posts no second line');

-- 6. H: Can't come. Seen row kept, on_way false, on_way_at kept, no line.
select tests.login('c4000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect(not (public.set_emergency_on_way(current_setting('t.ev')::uuid, false)).on_way, 'returns on_way false');
reset role;
select tests.expect(tests.ack('c4000000-0000-4000-8000-000000000001') is not null, 'seen row kept');
select tests.expect((tests.ack('c4000000-0000-4000-8000-000000000001')).on_way_at::text = current_setting('t.at'), 'on_way_at kept');
select tests.expect(tests.on_way_lines() = 1, 'Can''t come posts no line');

-- 7. H: On my way after Can't come. On again, still one line, same on_way_at.
select tests.login('c4000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select public.set_emergency_on_way(current_setting('t.ev')::uuid, true);
reset role;
select tests.expect((tests.ack('c4000000-0000-4000-8000-000000000001')).on_way, 'on again');
select tests.expect((tests.ack('c4000000-0000-4000-8000-000000000001')).on_way_at::text = current_setting('t.at'), 'on_way_at unchanged');
select tests.expect(tests.on_way_lines() = 1, 'off then on posts no second line');

-- 8. M: Can't come without a row is a no-op returning null.
select tests.login('c4000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select tests.expect(public.set_emergency_on_way(current_setting('t.ev')::uuid, false) is null, 'off without a row returns null');
reset role;
select tests.expect(tests.ack('c4000000-0000-4000-8000-000000000003') is null, 'off without a row writes nothing');

-- 9. M: seen first (ack_emergency), then On my way. acked_at kept, line posted ("Someone": no display name).
select tests.login('c4000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select public.ack_emergency(current_setting('t.ev')::uuid);
reset role;
select set_config('t.acked', (tests.ack('c4000000-0000-4000-8000-000000000003')).acked_at::text, true);
select tests.expect(not (tests.ack('c4000000-0000-4000-8000-000000000003')).on_way, 'seen row starts with on_way false');
select tests.login('c4000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select public.set_emergency_on_way(current_setting('t.ev')::uuid, true);
reset role;
select tests.expect((tests.ack('c4000000-0000-4000-8000-000000000003')).on_way, 'seen -> on way');
select tests.expect((tests.ack('c4000000-0000-4000-8000-000000000003')).acked_at::text = current_setting('t.acked'), 'acked_at kept');
select tests.expect(tests.on_way_lines() = 2, 'second responder posts a line');

-- 10. Direct writes by a member stay blocked (no insert/update policy).
select tests.login('c4000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select tests.code(format('update public.emergency_acks set on_way = false where event_id = %L', current_setting('t.ev')));
reset role;
select tests.expect((tests.ack('c4000000-0000-4000-8000-000000000003')).on_way, 'direct update does not change the row');

-- 11. G: I'm OK. The event is no longer active: PT409.
select tests.login('c4000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select public.clear_my_status(current_setting('t.r')::uuid);
reset role;
select tests.login('c4000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect(tests.code(format('select public.set_emergency_on_way(%L, false)', current_setting('t.ev'))) = 'PT409',
                    'resolved event gets PT409');
reset role;

-- 12. G: a new Emergency. The old event stays inactive; the new one accepts H and posts a new line.
-- now() is fixed inside this transaction; real events are created in separate transactions, so age the old one.
update public.emergency_events set created_at = now() - interval '1 minute' where id = current_setting('t.ev')::uuid;
select tests.login('c4000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select set_config('t.ev2', public.set_my_status(current_setting('t.r')::uuid, current_setting('t.emg')::uuid)::text, true);
reset role;
select tests.expect(current_setting('t.ev2') <> current_setting('t.ev'), 'new event id');
select tests.login('c4000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect(tests.code(format('select public.set_emergency_on_way(%L, true)', current_setting('t.ev'))) = 'PT409',
                    'older event gets PT409 while a newer one is active');
select public.set_emergency_on_way(current_setting('t.ev2')::uuid, true);
reset role;
select tests.expect(tests.on_way_lines() = 3, 'new event: H posts a new line');

-- 13. Expired room: 42501.
update public.rooms set created_at = now() - interval '2 hours', expires_at = now() - interval '1 minute'
 where id = current_setting('t.r')::uuid;
select tests.login('c4000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select tests.expect(tests.code(format('select public.set_emergency_on_way(%L, true)', current_setting('t.ev2'))) = '42501',
                    'expired room gets 42501');
reset role;
select tests.expect(tests.on_way_lines() = 3, 'expired room posts no line');

-- 14. Grants.
select tests.expect(not has_function_privilege('anon', 'public.set_emergency_on_way(uuid, boolean)', 'execute'), 'anon: no execute');
select tests.expect(has_function_privilege('authenticated', 'public.set_emergency_on_way(uuid, boolean)', 'execute'), 'authenticated: execute');

select 'EMERGENCY ON WAY TESTS PASSED';

rollback;
