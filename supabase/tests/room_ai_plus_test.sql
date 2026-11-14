-- Room AI Plus test (migration 0035: set_qrewing_room refuses a Free host turning Qrewing AI on).
-- One transaction, ends with ROLLBACK. Run as postgres on a database at 0033. The "@@MIGRATION" line below is
-- replaced by the migration text by supabase/tests/local/run.mjs (PGlite) or by the dry-run builder.
-- Success ends with the row 'ROOM AI PLUS TESTS PASSED'.
-- Actors: F Free host, P Plus host, M member of F's room. Room A turned AI on before 0035 (grandfathered).

begin;
set local lock_timeout = '3s';

insert into auth.users (instance_id, id, aud, role, email, is_anonymous, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'c3500000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'ai-free@test.invalid', false, '{"display_name":"F"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3500000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'ai-plus@test.invalid', false, '{"display_name":"P"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3500000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'ai-member@test.invalid', false, '{"display_name":"M"}', now(), now());

create table made (label text primary key, room_id uuid);
grant all on made to authenticated;

-- Before 0035: Free host F makes room A and turns AI on.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c3500000-0000-4000-8000-000000000011","role":"authenticated","is_anonymous":false}', true);
insert into made select 'A', r.id from public.create_room('AI old', 'general', now() + interval '1 day', false) r;
select public.set_qrewing_room((select room_id from made where label = 'A'), true, false);
reset role;

-- @@MIGRATION supabase/migrations/20261104000035_room_ai_plus.sql@@
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
create function tests.expect_state(p_sql text, p_state text, p_label text) returns void language plpgsql as $$
declare v_state text; v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    v_state := sqlstate; v_msg := sqlerrm;
  end;
  if v_state is distinct from p_state then
    raise exception 'FAIL: % (expected SQLSTATE %, got % %)', p_label, p_state, coalesce(v_state, 'success'), v_msg;
  end if;
  if p_state = 'PT402' and v_msg is distinct from 'plan_limit' then
    raise exception 'FAIL: % (PT402 message %)', p_label, v_msg;
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
grant execute on all functions in schema tests to authenticated, anon;

-- 0. One set_qrewing_room; grants unchanged.
select tests.expect_true($$ (select count(*) from pg_proc where proname = 'set_qrewing_room' and pronamespace = 'public'::regnamespace) = 1 $$, 'one set_qrewing_room');
select tests.expect_true($$ has_function_privilege('authenticated', 'public.set_qrewing_room(uuid, boolean, boolean)', 'execute') $$, 'authenticated may call');
select tests.expect_true($$ not has_function_privilege('anon', 'public.set_qrewing_room(uuid, boolean, boolean)', 'execute') $$, 'anon may not call');

set local role authenticated;

-- 1. Free host F.
select tests.login('c3500000-0000-4000-8000-000000000011', false);
insert into made select 'B', r.id from public.create_room('AI new', 'general', now() + interval '1 day', false) r;
select tests.expect_state($$ select public.set_qrewing_room((select room_id from made where label = 'B'), true, false) $$, 'PT402', 'Free on, no row');
select tests.expect_true($$ not exists (select 1 from public.qrewing_rooms where room_id = (select room_id from made where label = 'B')) $$, 'refused call wrote nothing');
select tests.expect_ok($$ select public.set_qrewing_room((select room_id from made where label = 'B'), false, false) $$, 'Free off, no row');
select tests.expect_state($$ select public.set_qrewing_room((select room_id from made where label = 'B'), true, false) $$, 'PT402', 'Free on, stored off');
select tests.expect_true($$ (select not ai_enabled from public.qrewing_rooms where room_id = (select room_id from made where label = 'B')) $$, 'B stays off');
select tests.expect_state($$ select public.set_qrewing_room((select room_id from made where label = 'B'), null, false) $$, null, 'Free null (= off) ok');
-- Grandfathered room A: keeping AI on is not turning it on.
select tests.expect_true($$ (select ai_enabled from public.qrewing_rooms where room_id = (select room_id from made where label = 'A')) $$, 'A on from before 0035');
select tests.expect_ok($$ select public.set_qrewing_room((select room_id from made where label = 'A'), true, false) $$, 'Free keeps A on');
select tests.expect_ok($$ select public.set_qrewing_room((select room_id from made where label = 'A'), false, false) $$, 'Free turns A off');
select tests.expect_state($$ select public.set_qrewing_room((select room_id from made where label = 'A'), true, false) $$, 'PT402', 'Free turns A on again');

-- 2. Not the host: still 42501, before the plan check.
select tests.login('c3500000-0000-4000-8000-000000000013', false);
select tests.expect_state($$ select public.set_qrewing_room((select room_id from made where label = 'B'), true, false) $$, '42501', 'non-host on');

-- 3. Plus host P.
select tests.login('c3500000-0000-4000-8000-000000000012', false);
select tests.expect_ok($$ select public.set_my_plan('plus') $$, 'P sets plus');
insert into made select 'C', r.id from public.create_room('AI plus', 'general', now() + interval '1 day', false) r;
select tests.expect_ok($$ select public.set_qrewing_room((select room_id from made where label = 'C'), true, false) $$, 'Plus on');
select tests.expect_ok($$ select public.set_qrewing_room((select room_id from made where label = 'C'), false, false) $$, 'Plus off');
select tests.expect_ok($$ select public.set_qrewing_room((select room_id from made where label = 'C'), true, false) $$, 'Plus on again');

-- 4. F upgrades to Plus: B turns on; F back to Free: C-style keep-on of B allowed, off then on refused.
select tests.login('c3500000-0000-4000-8000-000000000011', false);
select tests.expect_ok($$ select public.set_my_plan('plus') $$, 'F sets plus');
select tests.expect_ok($$ select public.set_qrewing_room((select room_id from made where label = 'B'), true, false) $$, 'F (Plus) on');
select tests.expect_ok($$ select public.set_my_plan('free') $$, 'F back to free');
select tests.expect_ok($$ select public.set_qrewing_room((select room_id from made where label = 'B'), true, false) $$, 'F (Free) keeps B on');
select tests.expect_ok($$ select public.set_qrewing_room((select room_id from made where label = 'B'), false, false) $$, 'F (Free) turns B off');
select tests.expect_state($$ select public.set_qrewing_room((select room_id from made where label = 'B'), true, false) $$, 'PT402', 'F (Free) on again');

reset role;
select 'ROOM AI PLUS TESTS PASSED' as result;
rollback;
