-- Plan test (migration 0032: server Free/Plus plan, user_plans, caps on create_room and update_room_expiry).
-- One transaction, ends with ROLLBACK. Run as postgres on a database at 0031. The "@@MIGRATION" line below is
-- replaced by the migration text by supabase/tests/local/run.mjs (PGlite) or by the dry-run builder.
-- Success ends with the row 'PLAN TESTS PASSED'.
-- Actors: F Free host, P Plus host, G anonymous guest. A room made before 0032 checks the grandfathering.

begin;
set local lock_timeout = '3s';

insert into auth.users (instance_id, id, aud, role, email, is_anonymous, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'c3200000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'plan-free@test.invalid', false, '{"display_name":"F"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3200000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'plan-plus@test.invalid', false, '{"display_name":"P"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3200000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', null, true, '{"display_name":"G"}', now(), now());

-- A room from before 0032 (0031 create_room: no plan, capacity 30, 5 days).
select set_config('request.jwt.claims',
  '{"sub":"c3200000-0000-4000-8000-000000000011","role":"authenticated","is_anonymous":false}', true);
create temp table old_room on commit drop as
  select r.id, r.max_members, r.expires_at
  from public.create_room(p_name => 'Plan old', p_type => 'general', p_expires_at => now() + interval '5 days',
                          p_location_allowed => false) r;
grant select on old_room to authenticated;

-- @@MIGRATION supabase/migrations/20261104000032_user_plans.sql@@

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
create table tests.made (label text primary key, room_id uuid);
grant all on tests.made to authenticated;

-- 0. Schema and grants.
select tests.expect_true($$ (select relrowsecurity from pg_class where oid = 'public.user_plans'::regclass) $$, 'user_plans has RLS');
select tests.expect_true($$ (select count(*) from pg_policies where schemaname = 'public' and tablename = 'user_plans') = 1 $$, 'one policy (select own)');
select tests.expect_true($$ not has_table_privilege('authenticated', 'public.user_plans', 'insert') and not has_table_privilege('authenticated', 'public.user_plans', 'update') and not has_table_privilege('authenticated', 'public.user_plans', 'delete') $$, 'no write grants');
select tests.expect_true($$ not has_table_privilege('anon', 'public.user_plans', 'select') $$, 'anon cannot read plans');
select tests.expect_true($$ not has_function_privilege('anon', 'public.set_my_plan(text)', 'execute') $$, 'anon role cannot set_my_plan');
select tests.expect_true($$ not has_function_privilege('authenticated', 'private.user_plan(uuid)', 'execute') $$, 'user_plan helper is private');
select tests.expect_true($$ (select count(*) from pg_proc where proname = 'create_room' and pronamespace = 'public'::regnamespace) = 1 $$, 'one create_room');
select tests.expect_true($$ (select count(*) from public.user_plans) = 0 $$, 'no backfill');

set local role authenticated;

-- 1. Writes: only set_my_plan; bad value 22023; direct writes denied; own row only.
select tests.login('c3200000-0000-4000-8000-000000000011', false);
select tests.expect_true($$ public.get_my_plan() = 'free' $$, 'no row = free');
select tests.expect_state($$ select public.set_my_plan('gold') $$, '22023', 'bad plan value');
select tests.expect_state($$ select public.set_my_plan(null) $$, '22023', 'null plan value');
select tests.expect_state($$ insert into public.user_plans (user_id, plan) values ('c3200000-0000-4000-8000-000000000011', 'plus') $$, '42501', 'direct insert denied');
select tests.login('c3200000-0000-4000-8000-000000000012', false);
select tests.expect_true($$ public.set_my_plan('plus') = 'plus' $$, 'P sets plus');
select tests.expect_true($$ public.get_my_plan() = 'plus' $$, 'P reads plus');
select tests.expect_state($$ update public.user_plans set plan = 'free' $$, '42501', 'direct update denied');
select tests.expect_state($$ delete from public.user_plans $$, '42501', 'direct delete denied');
select tests.login('c3200000-0000-4000-8000-000000000011', false);
select tests.expect_true($$ (select count(*) from public.user_plans) = 0 $$, 'F cannot read P''s row');

-- 2. Anonymous: the Plus preview row is on guest profiles too, so guests may set their plan.
select tests.login('c3200000-0000-4000-8000-000000000013', true);
select tests.expect_true($$ public.set_my_plan('plus') = 'plus' $$, 'guest sets plus');
select tests.expect_true($$ public.get_my_plan() = 'plus' $$, 'guest reads plus');
select tests.expect_true($$ (select count(*) from public.user_plans) = 1 $$, 'guest reads own row');
select tests.expect_true($$ public.set_my_plan('free') = 'free' $$, 'guest back to free');
select tests.expect_state($$ select public.create_room('G room', 'general', now() + interval '3 hours', false) $$, '42501', 'guest still cannot create');

-- 3. Free caps on create_room.
select tests.login('c3200000-0000-4000-8000-000000000011', false);
select tests.expect_state($$ select public.create_room('F7', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 7) $$, 'PT402', 'Free 7 people');
select tests.expect_state($$ select public.create_room('F3d', 'general', now() + interval '3 days', false) $$, 'PT402', 'Free 3 days');
select tests.expect_state($$ select public.create_room('F31', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 31) $$, '22023', 'Free 31 is out of range');
select tests.expect_state($$ select public.create_room('F8d', 'general', now() + interval '8 days', false) $$, '22023', 'Free 8 days is out of range');
select tests.expect_ok($$ insert into tests.made select 'f6', r.id from public.create_room('F6', 'general', now() + interval '2 days', false, array[]::text[], null, null, null, null, 6) r $$, 'Free 6 people, 2 days');
select tests.expect_ok($$ insert into tests.made select 'fdflt', r.id from public.create_room('Fd', 'general', now() + interval '3 hours', false) r $$, 'Free default');
select tests.expect_ok($$ insert into tests.made select 'fnl', r.id from public.create_room('Fnl', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 30, true) r $$, 'Free No limit');
select tests.expect_true($$ (select max_members from public.rooms where id = (select room_id from tests.made where label = 'fdflt')) = 6 $$, 'Free default capacity 6');
select tests.expect_true($$ (select no_limit and max_members = 6 from public.rooms where id = (select room_id from tests.made where label = 'fnl')) $$, 'Free No limit stored as 6');

-- 4. Plus caps on create_room.
select tests.login('c3200000-0000-4000-8000-000000000012', false);
select tests.expect_ok($$ insert into tests.made select 'p30', r.id from public.create_room('P30', 'general', now() + interval '7 days', false, array[]::text[], null, null, null, null, 30) r $$, 'Plus 30 people, 7 days');
select tests.expect_ok($$ insert into tests.made select 'pnl', r.id from public.create_room('Pnl', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, null, true) r $$, 'Plus No limit');
select tests.expect_true($$ (select no_limit and max_members = 30 from public.rooms where id = (select room_id from tests.made where label = 'pnl')) $$, 'Plus No limit stored as 30');
select tests.expect_state($$ select public.create_room('P31', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 31) $$, '22023', 'Plus 31 is out of range');

-- 5. update_room_expiry (the only edit/extend RPC for these fields).
select tests.expect_ok($$ select public.update_room_expiry((select room_id from tests.made where label = 'pnl'), now() + interval '6 days') $$, 'Plus extends to 6 days');
select tests.login('c3200000-0000-4000-8000-000000000011', false);
select tests.expect_state($$ select public.update_room_expiry((select room_id from tests.made where label = 'f6'), now() + interval '3 days') $$, 'PT402', 'Free extend to 3 days');
select tests.expect_ok($$ select public.update_room_expiry((select room_id from tests.made where label = 'f6'), now() + interval '1 day') $$, 'Free extend within 2 days');
select tests.expect_state($$ select public.update_room_expiry((select room_id from tests.made where label = 'f6'), now() + interval '8 days') $$, '22023', 'Free 8 days is out of range');
-- R1: the Free cap counts from created_at, so a 1-day-old room can only reach created_at + 2 days.
reset role;
update public.rooms set created_at = now() - interval '1 day' where id = (select room_id from tests.made where label = 'f6');
set local role authenticated;
select tests.expect_state($$ select public.update_room_expiry((select room_id from tests.made where label = 'f6'), now() + interval '36 hours') $$, 'PT402', 'Free extend past created_at + 2 days');
select tests.expect_ok($$ select public.update_room_expiry((select room_id from tests.made where label = 'f6'), now() + interval '23 hours') $$, 'Free extend within created_at + 2 days');

-- 6. Grandfathered: the room from before 0032 is unchanged; a Plus host going back to Free keeps their rooms.
select tests.expect_true($$ (select r.max_members = o.max_members and r.expires_at = o.expires_at and o.max_members = 30
  from public.rooms r join old_room o on o.id = r.id) $$, 'pre-0032 room unchanged');
select tests.login('c3200000-0000-4000-8000-000000000012', false);
select tests.expect_ok($$ select public.set_my_plan('free') $$, 'P back to free');
select tests.expect_true($$ (select max_members = 30 from public.rooms where id = (select room_id from tests.made where label = 'p30')) $$, 'P''s 30-room keeps its cap');
select tests.expect_state($$ select public.create_room('P7', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 7) $$, 'PT402', 'P now Free: 7 refused');

reset role;
select 'PLAN TESTS PASSED' as result;
rollback;
