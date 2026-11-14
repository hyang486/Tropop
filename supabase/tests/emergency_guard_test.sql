-- UX2-52 test: while in Emergency, set_my_status rejects an ordinary status (PT409 'emergency_active') and treats
-- Emergency again as a no-op; clear_my_status (I'm OK) is the way out and still posts the resolved line.
-- Requires migrations through 0036 (emergency_status_guard). One transaction, ends with ROLLBACK.
-- Local: node supabase/tests/local/run.mjs supabase/migrations 20261104000036 supabase/tests/emergency_guard_test.sql
-- Success ends with the row 'EMERGENCY GUARD TESTS PASSED'.
--
-- Actors: H host, G guest member, O outsider (never joins).

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

grant execute on all functions in schema tests to authenticated;

insert into auth.users (instance_id, id, aud, role, email, is_anonymous, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'c3400000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'eg-host@test.invalid', false, '{"display_name":"Host"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3400000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', null, true, '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3400000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', null, true, '{}', now(), now());

-- t.r room, t.token invite token, t.emg Emergency status id, t.rest 'Resting' status id.
select tests.login('c3400000-0000-4000-8000-000000000001', false);
set local role authenticated;
do $$
declare r public.rooms;
begin
  r := public.create_room('Emergency guard test', 'sports', now() + interval '1 day', false, array['Resting']);
  perform set_config('t.r', r.id::text, true);
  perform set_config('t.token', r.invite_token, true);
end $$;
reset role;

select set_config('t.emg', (select id::text from public.status_definitions
                             where room_id = current_setting('t.r')::uuid and is_emergency), true);
select set_config('t.rest', (select id::text from public.status_definitions
                              where room_id = current_setting('t.r')::uuid and label = 'Resting'), true);
select tests.expect(current_setting('t.emg') <> '' and current_setting('t.rest') <> '', 'room has Emergency and Resting');

select tests.login('c3400000-0000-4000-8000-000000000002', true);
set local role authenticated;
select public.join_room(null, current_setting('t.token'));
reset role;

create function tests.resolved_lines() returns bigint language sql as $$
  select count(*) from public.messages
   where room_id = current_setting('t.r')::uuid and kind = 'status' and body like '% is OK (Emergency resolved)%';
$$;

create function tests.g_lines() returns bigint language sql as $$
  select count(*) from public.messages
   where room_id = current_setting('t.r')::uuid and sender_id = 'c3400000-0000-4000-8000-000000000002';
$$;
create function tests.g_events() returns bigint language sql as $$
  select count(*) from public.emergency_events
   where room_id = current_setting('t.r')::uuid and user_id = 'c3400000-0000-4000-8000-000000000002';
$$;
create function tests.g_status() returns uuid language sql as $$
  select status_id from public.member_status
   where room_id = current_setting('t.r')::uuid and user_id = 'c3400000-0000-4000-8000-000000000002';
$$;
grant execute on all functions in schema tests to authenticated;

-- 1. Resting -> Resting -> Emergency: ordinary changes work as before; Emergency opens one event and one line.
select tests.login('c3400000-0000-4000-8000-000000000002', true);
set local role authenticated;
select public.set_my_status(current_setting('t.r')::uuid, current_setting('t.rest')::uuid);
select set_config('t.ev1', coalesce(public.set_my_status(current_setting('t.r')::uuid, current_setting('t.emg')::uuid)::text, ''), true);
reset role;
select tests.expect(current_setting('t.ev1') <> '', 'Emergency returns its event id');
select tests.expect(tests.g_events() = 1, 'one Emergency event');
select tests.expect(tests.g_status() = current_setting('t.emg')::uuid, 'G is in Emergency');
select tests.expect(exists (select 1 from public.messages where room_id = current_setting('t.r')::uuid
                             and kind = 'status' and body like '%: Resting'), 'ordinary status line as before');

-- 2. Emergency -> Resting is rejected with PT409 emergency_active; nothing changes.
select set_config('t.n', tests.g_lines()::text, true);
select tests.login('c3400000-0000-4000-8000-000000000002', true);
set local role authenticated;
do $$
begin
  perform public.set_my_status(current_setting('t.r')::uuid, current_setting('t.rest')::uuid);
  raise exception 'FAIL: Emergency -> Resting was accepted';
exception when sqlstate 'PT409' then
  perform tests.expect(sqlerrm = 'emergency_active', 'error message is emergency_active');
end $$;
reset role;
select tests.expect(tests.g_status() = current_setting('t.emg')::uuid, 'still in Emergency after the rejected change');
select tests.expect(tests.g_lines() = current_setting('t.n')::bigint, 'rejected change posts nothing');

-- 3. Emergency -> Emergency is a no-op: same event id back, no new event, no new line.
select tests.login('c3400000-0000-4000-8000-000000000002', true);
set local role authenticated;
select set_config('t.ev2', coalesce(public.set_my_status(current_setting('t.r')::uuid, current_setting('t.emg')::uuid)::text, ''), true);
reset role;
select tests.expect(current_setting('t.ev2') = current_setting('t.ev1'), 'repeat Emergency returns the open event id');
select tests.expect(tests.g_events() = 1, 'repeat Emergency opens no second event');
select tests.expect(tests.g_lines() = current_setting('t.n')::bigint, 'repeat Emergency posts no second line');

-- 4. I'm OK ends it with exactly one resolved line; then an ordinary status works again (plain line).
select tests.login('c3400000-0000-4000-8000-000000000002', true);
set local role authenticated;
select public.clear_my_status(current_setting('t.r')::uuid);
select public.set_my_status(current_setting('t.r')::uuid, current_setting('t.rest')::uuid);
reset role;
select tests.expect((select count(*) from public.messages where room_id = current_setting('t.r')::uuid
                      and kind = 'status' and body like '% is OK (Emergency resolved)') = 1, 'one resolved line from I''m OK');
select tests.expect(tests.g_lines() = current_setting('t.n')::bigint + 2, 'resolved line + Resting line');
select tests.expect(tests.g_status() = current_setting('t.rest')::uuid, 'Resting after I''m OK');
select tests.expect(not exists (select 1 from public.messages where room_id = current_setting('t.r')::uuid
                                 and body like '%(Emergency resolved) · %'), 'no combined resolved · label line any more');

-- 5. A new Emergency after I'm OK opens a new event.
select tests.login('c3400000-0000-4000-8000-000000000002', true);
set local role authenticated;
select public.set_my_status(current_setting('t.r')::uuid, current_setting('t.emg')::uuid);
reset role;
select tests.expect(tests.g_events() = 2, 'Emergency after I''m OK opens a new event');

-- 6. An outsider is still refused (42501) before the guard; anon still cannot call it.
select tests.login('c3400000-0000-4000-8000-000000000003', true);
set local role authenticated;
do $$
begin
  perform public.set_my_status(current_setting('t.r')::uuid, current_setting('t.rest')::uuid);
  raise exception 'FAIL: outsider was accepted';
exception when insufficient_privilege then null;
end $$;
reset role;
select tests.expect(not has_function_privilege('anon', 'public.set_my_status(uuid, uuid)', 'execute'), 'anon: no set_my_status');

select 'EMERGENCY GUARD TESTS PASSED';

rollback;
