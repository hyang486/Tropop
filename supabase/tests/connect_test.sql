-- Connect test (0042): qr_codes, connect_requests, connections, connect-qr storage RLS, RPCs.
-- One transaction, ends with ROLLBACK. Run as postgres, or locally:
-- node supabase/tests/local/run.mjs supabase/migrations 20261104000042 <this file>.
-- Success ends with the row 'CONNECT TESTS PASSED'.
--
-- Actors (full accounts unless noted): A host, B, C (Plus later), D, E, G anonymous guest. Room R1: A, B, C, G. Room R2: A, B, C, D.

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
  return sqlstate || ':' || sqlerrm;
end;
$$;
create function tests.val(p_sql text) returns text language plpgsql as $$
declare v text;
begin
  execute p_sql into v;
  return v;
end;
$$;
grant execute on all functions in schema tests to authenticated;

insert into auth.users (instance_id, id, aud, role, email, is_anonymous, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'c4200000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', 'cn-a@test.invalid', false, '{"display_name":"Ann"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c4200000-0000-4000-8000-00000000000b', 'authenticated', 'authenticated', 'cn-b@test.invalid', false, '{"display_name":"Ben"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c4200000-0000-4000-8000-00000000000c', 'authenticated', 'authenticated', 'cn-c@test.invalid', false, '{"display_name":"Cal"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c4200000-0000-4000-8000-00000000000d', 'authenticated', 'authenticated', 'cn-d@test.invalid', false, '{"display_name":"Dee"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c4200000-0000-4000-8000-00000000000e', 'authenticated', 'authenticated', 'cn-e@test.invalid', false, '{"display_name":"Eve"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c4200000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', null, true, '{}', now(), now());

select set_config('t.a', 'c4200000-0000-4000-8000-00000000000a', true);
select set_config('t.b', 'c4200000-0000-4000-8000-00000000000b', true);
select set_config('t.c', 'c4200000-0000-4000-8000-00000000000c', true);
select set_config('t.d', 'c4200000-0000-4000-8000-00000000000d', true);
select set_config('t.e', 'c4200000-0000-4000-8000-00000000000e', true);
select set_config('t.g', 'c4200000-0000-4000-8000-000000000006', true);

-- Rooms R1 and R2, hosted by A.
select tests.login(current_setting('t.a')::uuid, false);
set local role authenticated;
do $$
declare r public.rooms;
begin
  r := public.create_room('Connect one', 'general', now() + interval '1 day', false);
  perform set_config('t.r1', r.id::text, true);
  perform set_config('t.k1', r.invite_token, true);
  r := public.create_room('Connect two', 'general', now() + interval '1 day', false);
  perform set_config('t.r2', r.id::text, true);
  perform set_config('t.k2', r.invite_token, true);
end $$;
reset role;

create function tests.join(p_uid text, p_anon boolean, p_token text) returns void language plpgsql as $$
begin
  perform tests.login(p_uid::uuid, p_anon);
  set local role authenticated;
  perform public.join_room(null, p_token);
  reset role;
end;
$$;
select tests.join(current_setting('t.b'), false, current_setting('t.k1'));
select tests.join(current_setting('t.c'), false, current_setting('t.k1'));
select tests.join(current_setting('t.g'), true, current_setting('t.k1'));
select tests.join(current_setting('t.b'), false, current_setting('t.k2'));
select tests.join(current_setting('t.c'), false, current_setting('t.k2'));
select tests.join(current_setting('t.d'), false, current_setting('t.k2'));

-- as(uid, sql): run one statement as that user and return 'ok' or 'SQLSTATE:message'.
create function tests.as_code(p_uid text, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  perform tests.login(p_uid::uuid, p_uid = current_setting('t.g'));
  set local role authenticated;
  v := tests.code(p_sql);
  reset role;
  return v;
end;
$$;
create function tests.as_val(p_uid text, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  perform tests.login(p_uid::uuid, p_uid = current_setting('t.g'));
  set local role authenticated;
  v := tests.val(p_sql);
  reset role;
  return v;
end;
$$;
-- Upload an object into connect-qr as that user, then save it as their code for p_app.
create function tests.add_code(p_uid text, p_app text, p_link text) returns text language plpgsql as $$
declare v_path text := p_uid || '/' || gen_random_uuid()::text || '.jpg'; v text;
begin
  v := tests.as_code(p_uid, format(
    'insert into storage.objects (bucket_id, name, owner_id) values (''connect-qr'', %L, %L)', v_path, p_uid));
  if v <> 'ok' then return v; end if;
  v := tests.as_code(p_uid, format('select public.upsert_qr_code(%L, %L, %L)', p_app, v_path, p_link));
  if v <> 'ok' then return v; end if;
  return v_path;
end;
$$;
create function tests.code_count(p_viewer text, p_owner text) returns int language sql as $$
  select tests.as_val(p_viewer, format('select count(*) from public.qr_codes where owner_id = %L', p_owner))::int
$$;
create function tests.object_count(p_viewer text, p_owner text) returns int language sql as $$
  select tests.as_val(p_viewer, format(
    'select count(*) from storage.objects where bucket_id = ''connect-qr'' and name like %L', p_owner || '/%'))::int
$$;

-- 1. Uploads and codes.
select set_config('t.a_line', tests.add_code(current_setting('t.a'), 'line', 'https://line.me/ti/p/abc123'), true);
select tests.expect(current_setting('t.a_line') like current_setting('t.a') || '/%', 'A adds LINE: ' || current_setting('t.a_line'));
select tests.expect(tests.add_code(current_setting('t.a'), 'kakaotalk', null) like current_setting('t.a') || '/%',
                    'A adds KakaoTalk with no link (host not on the list → client stores null)');
select tests.expect(tests.add_code(current_setting('t.a'), 'whatsapp', 'https://line.me/ti/p/x') like '22023:%',
                    'a LINE link on the WhatsApp slot: 22023');
select tests.expect(tests.add_code(current_setting('t.a'), 'wechat', 'http://u.wechat.com/x') like '22023:%',
                    'plain http link: 22023');
select tests.expect(tests.add_code(current_setting('t.a'), 'myspace', null) like '22023:%', 'unknown app: 22023');
select tests.expect(tests.as_code(current_setting('t.a'),
  format('select public.upsert_qr_code(''wechat'', %L, null)', current_setting('t.a') || '/' || gen_random_uuid() || '.jpg')) like '22023:%',
  'no uploaded object: 22023');
select tests.expect(tests.as_code(current_setting('t.a'), format(
  'insert into storage.objects (bucket_id, name, owner_id) values (''connect-qr'', %L, %L)',
  current_setting('t.b') || '/' || gen_random_uuid() || '.jpg', current_setting('t.a'))) like '42501:%',
  'upload into another user''s folder: 42501');
select tests.expect(tests.as_code(current_setting('t.g'), format(
  'insert into storage.objects (bucket_id, name, owner_id) values (''connect-qr'', %L, %L)',
  current_setting('t.g') || '/' || gen_random_uuid() || '.jpg', current_setting('t.g'))) like '42501:%',
  'guest upload: 42501');
select set_config('t.b_wa', tests.add_code(current_setting('t.b'), 'whatsapp', 'https://wa.me/qr/ABCDEF'), true);
select tests.expect(current_setting('t.b_wa') like current_setting('t.b') || '/%', 'B adds WhatsApp');
select tests.expect(tests.as_val(current_setting('t.a'), 'select string_agg(app, '','') from public.my_qr_codes()') = 'kakaotalk,line',
                    'my_qr_codes in app order');

-- 2. Not connected: nobody else sees codes or objects (a bad path in the bucket does not throw).
insert into storage.objects (bucket_id, name, owner_id) values ('connect-qr', 'not-a-uuid/x.jpg', null);
select tests.expect(tests.code_count(current_setting('t.b'), current_setting('t.a')) = 0, 'B cannot see A''s codes');
select tests.expect(tests.object_count(current_setting('t.b'), current_setting('t.a')) = 0, 'B cannot see A''s objects');
select tests.expect(tests.code_count(current_setting('t.d'), current_setting('t.a')) = 0, 'D cannot see A''s codes');
select tests.expect(tests.as_val(current_setting('t.b'), 'select count(*) from storage.objects where bucket_id = ''connect-qr''') = '1',
                    'B sees only its own object; the bad path row does not throw');
select tests.expect(tests.code_count(current_setting('t.a'), current_setting('t.a')) = 2, 'A sees its own codes');
select tests.expect(tests.as_code(current_setting('t.b'), 'select reported_by from public.qr_codes') like '42501:%',
                    'reported_by is not readable from the table');

-- 3. Requests in a live room.
select tests.expect(tests.as_val(current_setting('t.b'),
  format('select public.request_connection(%L, %L)', current_setting('t.r1'), current_setting('t.a'))) = 'requested', 'B → A requested');
select tests.expect(tests.as_val(current_setting('t.b'),
  format('select public.request_connection(%L, %L)', current_setting('t.r1'), current_setting('t.a'))) = 'requested', 'B → A again: requested, no second row');
select tests.expect((select count(*) from public.connect_requests) = 1, 'one request row');
select tests.expect(tests.as_val(current_setting('t.a'),
  format('select state from public.room_connect_people(%L) where user_id = %L', current_setting('t.r1'), current_setting('t.b'))) = 'incoming',
  'A sees B as incoming');
select tests.expect(tests.as_val(current_setting('t.a'),
  format('select array_to_string(apps, '','') from public.room_connect_people(%L) where user_id = %L', current_setting('t.r1'), current_setting('t.b'))) = 'whatsapp',
  'A sees which apps B added');
select tests.expect(tests.as_val(current_setting('t.b'),
  format('select state from public.room_connect_people(%L) where user_id = %L', current_setting('t.r1'), current_setting('t.a'))) = 'requested',
  'B sees A as requested');
select tests.expect(tests.as_val(current_setting('t.a'), 'select pending_incoming from public.my_connection_quota()') = '1', 'A badge 1');
select tests.expect(tests.as_val(current_setting('t.b'), 'select pending_incoming from public.my_connection_quota()') = '0', 'B badge 0');
select tests.expect(tests.as_val(current_setting('t.d'),
  format('select count(*) from public.room_connect_people(%L)', current_setting('t.r1'))) = '0', 'outsider gets no people');

select tests.expect(tests.as_code(current_setting('t.g'),
  format('select public.request_connection(%L, %L)', current_setting('t.r1'), current_setting('t.a'))) like '42501:%', 'guest request: 42501');
select tests.expect(tests.as_code(current_setting('t.a'),
  format('select public.request_connection(%L, %L)', current_setting('t.r1'), current_setting('t.g'))) like '42501:%', 'request to a guest: 42501');
select tests.expect(tests.as_code(current_setting('t.d'),
  format('select public.request_connection(%L, %L)', current_setting('t.r1'), current_setting('t.a'))) like '42501:%', 'non-member: 42501');
select tests.expect(tests.as_code(current_setting('t.a'),
  format('select public.request_connection(%L, %L)', current_setting('t.r1'), current_setting('t.d'))) like '42501:%', 'other not in this room: 42501');
select tests.expect(tests.as_code(current_setting('t.a'),
  format('select public.request_connection(%L, %L)', current_setting('t.r1'), current_setting('t.a'))) like '22023:%', 'self: 22023');
select tests.expect(tests.as_code(current_setting('t.c'),
  format('select public.request_connection(%L, %L)', current_setting('t.r1'), current_setting('t.a'))) = 'PT422:no_codes', 'C has no codes');
select tests.expect(tests.as_code(current_setting('t.a'),
  format('select public.request_connection(%L, %L)', current_setting('t.r1'), current_setting('t.c'))) = 'PT422:they_have_no_codes', 'C has none to share');

-- 4. Expired room: no new requests. Deleted room: the pending request can still be accepted.
select set_config('t.c_li', tests.add_code(current_setting('t.c'), 'linkedin', 'https://www.linkedin.com/in/cal'), true);
update public.rooms set created_at = now() - interval '2 hours', expires_at = now() - interval '1 second'
where id = current_setting('t.r1')::uuid;
select tests.expect(tests.as_code(current_setting('t.c'),
  format('select public.request_connection(%L, %L)', current_setting('t.r1'), current_setting('t.a'))) like '42501:%', 'expired room: 42501');
delete from public.rooms where id = current_setting('t.r1')::uuid;
select tests.expect((select room_id is null from public.connect_requests), 'request survives room deletion (room_id null)');
select tests.expect(tests.as_val(current_setting('t.a'), 'select count(*) from public.my_connect_requests() where direction = ''incoming'' and room_name is null') = '1',
                    'inbox row has no room name after deletion');
select tests.expect(tests.as_val(current_setting('t.a'),
  format('select public.respond_connection(%L, true)', (select id from public.connect_requests))) = 'connected', 'A accepts after room deletion');
select tests.expect((select count(*) from public.connect_requests) = 0, 'accepted request row is gone');
select tests.expect(tests.as_val(current_setting('t.b'), 'select count(*) from public.my_connections() where room_name is null') = '1', 'B: 1 connection, no room name');

-- 5. Connected: each sees the other's codes and objects.
select tests.expect(tests.code_count(current_setting('t.b'), current_setting('t.a')) = 2, 'B sees A''s 2 codes');
select tests.expect(tests.object_count(current_setting('t.b'), current_setting('t.a')) = 2, 'B sees A''s 2 objects');
select tests.expect(tests.code_count(current_setting('t.a'), current_setting('t.b')) = 1, 'A sees B''s code');
select tests.expect(tests.as_val(current_setting('t.b'),
  format('select string_agg(app, '','') from public.connection_qr_codes(%L)', current_setting('t.a'))) = 'kakaotalk,line', 'connection_qr_codes');
select tests.expect(tests.code_count(current_setting('t.c'), current_setting('t.a')) = 0, 'C still sees nothing');

-- 6. Free cap (A and B are Free with 1 connection). Checked before insert and at accept.
select set_config('t.d_wc', tests.add_code(current_setting('t.d'), 'wechat', 'https://u.wechat.com/xyz'), true);
select tests.expect(tests.as_val(current_setting('t.a'), 'select can_add from public.my_connection_quota()') = 'false', 'A quota: cannot add');
select tests.expect(tests.as_code(current_setting('t.a'),
  format('select public.request_connection(%L, %L)', current_setting('t.r2'), current_setting('t.d'))) = 'PT402:connection_limit', 'A at limit: request blocked');
select tests.expect((select count(*) from public.connect_requests) = 0, 'no row inserted when blocked');
select tests.expect(tests.as_val(current_setting('t.d'),
  format('select public.request_connection(%L, %L)', current_setting('t.r2'), current_setting('t.a'))) = 'requested', 'D → A requested');
select tests.expect(tests.as_code(current_setting('t.a'),
  format('select public.respond_connection(%L, true)', (select id from public.connect_requests where from_user = current_setting('t.d')::uuid))) = 'PT402:connection_limit',
  'A at limit: accept blocked');
select tests.expect(tests.as_code(current_setting('t.a'),
  format('select public.request_connection(%L, %L)', current_setting('t.r2'), current_setting('t.d'))) = 'PT402:connection_limit',
  'A at limit: asking back is blocked too');
-- C (Plus) → D; then D fills its slot elsewhere: C's accept path must say other_connection_limit.
insert into public.user_plans (user_id, plan) values (current_setting('t.c')::uuid, 'plus');
select tests.expect(tests.as_val(current_setting('t.d'),
  format('select public.request_connection(%L, %L)', current_setting('t.r2'), current_setting('t.c'))) = 'requested', 'D → C requested');
insert into public.connections (user_a, user_b) values (least(current_setting('t.d')::uuid, current_setting('t.e')::uuid), greatest(current_setting('t.d')::uuid, current_setting('t.e')::uuid));
select tests.expect(tests.as_code(current_setting('t.c'),
  format('select public.respond_connection(%L, true)', (select id from public.connect_requests where to_user = current_setting('t.c')::uuid))) = 'PT402:other_connection_limit',
  'C accepts but D is now at the limit');
delete from public.connections where user_a = least(current_setting('t.d')::uuid, current_setting('t.e')::uuid);
select tests.expect(tests.as_val(current_setting('t.c'),
  format('select public.respond_connection(%L, true)', (select id from public.connect_requests where to_user = current_setting('t.c')::uuid))) = 'connected',
  'C accepts D');
-- Plus is unlimited: A and D (each with 1 connection) upgrade, then A accepts D's pending request.
insert into public.user_plans (user_id, plan) values (current_setting('t.a')::uuid, 'plus'), (current_setting('t.d')::uuid, 'plus');
select tests.expect(tests.as_val(current_setting('t.a'),
  format('select public.respond_connection(%L, true)', (select id from public.connect_requests where to_user = current_setting('t.a')::uuid))) = 'connected',
  'A on Plus accepts D (2nd connection)');
select tests.expect(tests.as_val(current_setting('t.c'),
  format('select public.request_connection(%L, %L)', current_setting('t.r2'), current_setting('t.a'))) = 'requested', 'C → A requested');
select tests.expect(tests.as_val(current_setting('t.a'),
  format('select public.request_connection(%L, %L)', current_setting('t.r2'), current_setting('t.c'))) = 'connected',
  'A asks C back: mutual → connected (3rd)');
-- Downgrade keeps old connections and blocks new ones.
update public.user_plans set plan = 'free' where user_id = current_setting('t.a')::uuid;
select tests.expect(tests.as_val(current_setting('t.a'), 'select used from public.my_connection_quota()') = '3', 'downgrade keeps 3');
select tests.expect(tests.as_val(current_setting('t.a'), 'select can_add from public.my_connection_quota()') = 'false', 'downgrade blocks new');

-- 7. Silent decline (E joins R2 with a code; B is Free at its limit, so E → B, B declines).
select tests.join(current_setting('t.e'), false, current_setting('t.k2'));
select set_config('t.e_line', tests.add_code(current_setting('t.e'), 'line', 'https://line.me/ti/p/eve'), true);
select tests.expect(tests.as_val(current_setting('t.e'),
  format('select public.request_connection(%L, %L)', current_setting('t.r2'), current_setting('t.b'))) = 'requested', 'E → B requested');
select tests.expect(tests.as_val(current_setting('t.b'),
  format('select public.respond_connection(%L, false)', (select id from public.connect_requests where from_user = current_setting('t.e')::uuid))) = 'declined', 'B declines');
select tests.expect(tests.as_val(current_setting('t.e'),
  format('select state from public.room_connect_people(%L) where user_id = %L', current_setting('t.r2'), current_setting('t.b'))) = 'requested',
  'E still sees requested');
select tests.expect(tests.as_val(current_setting('t.e'), 'select count(*) from public.my_connect_requests() where direction = ''sent''') = '1', 'E still has the sent row');
select tests.expect(tests.as_val(current_setting('t.b'), 'select count(*) from public.my_connect_requests()') = '0', 'B no longer sees it');
select tests.expect(tests.as_val(current_setting('t.b'), 'select pending_incoming from public.my_connection_quota()') = '0', 'B badge 0');
select tests.expect(tests.as_val(current_setting('t.e'),
  format('select public.request_connection(%L, %L)', current_setting('t.r2'), current_setting('t.b'))) = 'requested', 'E asks again: still requested');
select tests.expect((select count(*) from public.connect_requests where from_user = current_setting('t.e')::uuid) = 1, 'still one row');
select tests.expect(tests.as_code(current_setting('t.b'),
  format('select public.respond_connection(%L, true)', (select id from public.connect_requests where from_user = current_setting('t.e')::uuid))) like 'P0002:%',
  'declined request cannot be accepted later');
-- F-CN1: cancel or remove_connection cannot reset a decline.
select tests.expect(tests.as_code(current_setting('t.e'),
  format('select public.cancel_connect_request(%L)', (select id from public.connect_requests where from_user = current_setting('t.e')::uuid))) = 'ok', 'E cancels the declined row: no error');
select tests.expect(tests.as_code(current_setting('t.e'), format('select public.remove_connection(%L)', current_setting('t.b'))) = 'ok', 'E removes B (no connection): no error');
select tests.expect((select status from public.connect_requests where from_user = current_setting('t.e')::uuid) = 'declined', 'declined row survives cancel + remove');
select tests.expect(tests.as_val(current_setting('t.e'),
  format('select public.request_connection(%L, %L)', current_setting('t.r2'), current_setting('t.b'))) = 'requested', 'E re-requests: still requested');
select tests.expect(tests.as_val(current_setting('t.b'), 'select count(*) from public.my_connect_requests()') = '0', 'B gets no new incoming row');
select tests.expect(tests.as_val(current_setting('t.b'), 'select pending_incoming from public.my_connection_quota()') = '0', 'B badge still 0');
-- F-CN1: request/cancel cycles cannot reset the 30/hour limit (E → C, C is Plus).
do $$
declare i int; c text; n int := 0;
begin
  for i in 1..40 loop
    c := tests.as_code(current_setting('t.e'), format('select public.request_connection(%L, %L)', current_setting('t.r2'), current_setting('t.c')));
    exit when c <> 'ok';
    n := n + 1;
    perform tests.as_code(current_setting('t.e'), format('select public.cancel_connect_request(%L)',
      (select id from public.connect_requests where from_user = current_setting('t.e')::uuid and to_user = current_setting('t.c')::uuid)));
  end loop;
  perform tests.expect(c like 'PT429:%', 'request/cancel cycles hit PT429 (got ' || c || ')');
  perform tests.expect((select count(*) from private.connect_request_log where user_id = current_setting('t.e')::uuid) = 30, '30 logged requests in the hour');
  perform tests.expect(n = 29, '29 cycles before the limit (1 earlier request to B), got ' || n);
  perform tests.expect(not exists (select 1 from public.connect_requests where from_user = current_setting('t.e')::uuid and to_user = current_setting('t.c')::uuid), 'no E → C row left');
end $$;

-- 8. Expiry after 14 days.
update public.connect_requests set created_at = now() - interval '15 days' where from_user = current_setting('t.e')::uuid;
select tests.expect(tests.as_val(current_setting('t.e'), 'select count(*) from public.my_connect_requests()') = '0', 'expired: gone for the sender');
select tests.expect(tests.as_val(current_setting('t.e'),
  format('select state from public.room_connect_people(%L) where user_id = %L', current_setting('t.r2'), current_setting('t.b'))) = 'none',
  'expired: state none');
select tests.expect(private.prune_connect_requests() = 1, 'prune removes the expired row');

-- 9. Report, replace, remove a code.
select tests.expect(tests.as_code(current_setting('t.a'),
  format('select public.report_qr_code(%L, ''wechat'')', current_setting('t.d'))) = 'ok', 'A reports D''s WeChat code');
select tests.expect(tests.as_val(current_setting('t.d'), 'select reported_by_name from public.my_qr_codes() where app = ''wechat''') = 'Ann',
                    'D sees who reported it');
select tests.expect(tests.as_val(current_setting('t.a'),
  format('select reported_by_me from public.connection_qr_codes(%L) where app = ''wechat''', current_setting('t.d'))) = 'true', 'A sees reported_by_me');
select tests.expect(tests.as_code(current_setting('t.b'),
  format('select public.report_qr_code(%L, ''wechat'')', current_setting('t.d'))) like '42501:%', 'B is not connected to D: 42501');
select set_config('t.d_wc2', tests.add_code(current_setting('t.d'), 'wechat', null), true);
select tests.expect(tests.as_val(current_setting('t.d'), 'select reported_at is null from public.my_qr_codes() where app = ''wechat''') = 'true',
                    'replace clears the report');
select tests.expect(exists (select 1 from public.cleanup_jobs where bucket = 'connect-qr' and prefix = current_setting('t.d_wc')),
                    'old image queued for cleanup');
select tests.expect(tests.as_code(current_setting('t.d'), 'select public.delete_qr_code(''wechat'')') = 'ok', 'D removes WeChat');
select tests.expect(exists (select 1 from public.cleanup_jobs where bucket = 'connect-qr' and prefix = current_setting('t.d_wc2')),
                    'removed image queued for cleanup');
select tests.expect(tests.code_count(current_setting('t.a'), current_setting('t.d')) = 0, 'A no longer sees D''s removed code');

-- 10. remove_connection ends access at once, for both sides.
select tests.expect(tests.as_code(current_setting('t.a'), format('select public.remove_connection(%L)', current_setting('t.b'))) = 'ok', 'A removes B');
select tests.expect(tests.code_count(current_setting('t.b'), current_setting('t.a')) = 0, 'B no longer sees A''s codes');
select tests.expect(tests.object_count(current_setting('t.b'), current_setting('t.a')) = 0, 'B no longer sees A''s objects');
select tests.expect(tests.code_count(current_setting('t.a'), current_setting('t.b')) = 0, 'A no longer sees B''s codes');
select tests.expect(tests.as_val(current_setting('t.b'), 'select count(*) from public.my_connections()') = '0', 'B: no connections');
select tests.expect(tests.as_val(current_setting('t.b'), 'select can_add from public.my_connection_quota()') = 'true', 'B''s slot is free again');

-- 11. Account deletion cascades and queues the images.
delete from auth.users where id = current_setting('t.e')::uuid;
select tests.expect(not exists (select 1 from public.qr_codes where owner_id = current_setting('t.e')::uuid), 'E''s codes gone');
select tests.expect(exists (select 1 from public.cleanup_jobs where bucket = 'connect-qr' and prefix = current_setting('t.e_line')),
                    'E''s image queued');

-- 12. Grants.
select tests.expect(tests.as_code(current_setting('t.a'), 'select count(*) from public.connect_requests') like '42501:%', 'no direct read of requests');
select tests.expect(tests.as_code(current_setting('t.a'), format(
  'insert into public.connections (user_a, user_b) values (%L, %L)', least(current_setting('t.a'), current_setting('t.e')), greatest(current_setting('t.a'), current_setting('t.e')))) like '42501:%',
  'no direct insert into connections');
select tests.expect(tests.as_code(current_setting('t.a'), format(
  'insert into public.qr_codes (owner_id, app, image_path) values (%L, ''wechat'', ''x'')', current_setting('t.a'))) like '42501:%',
  'no direct insert into qr_codes');
select tests.expect(not has_function_privilege('anon', 'public.request_connection(uuid, uuid)', 'execute'), 'anon: no execute');
select tests.expect(not has_function_privilege('authenticated', 'private.prune_connect_requests()', 'execute'), 'prune is not callable');
select tests.expect(not has_table_privilege('anon', 'public.qr_codes', 'select'), 'anon: no select on qr_codes');

select 'CONNECT TESTS PASSED';

rollback;
