-- Room list summaries test (migration 0037: last_read_at, mark_room_read, room_list_summaries).
-- One transaction, ends with ROLLBACK. Run as postgres on a database at 0035. The "@@MIGRATION" line below is
-- replaced by the migration text by supabase/tests/local/run.mjs (PGlite) or by the dry-run builder.
-- Success ends with the row 'ROOM LIST SUMMARIES TESTS PASSED'.
-- Actors: H host, A and B members, O outsider. R1 open (H, A, B), R2 expired (H, A), R3 open (H, O), R4 open, empty (H, A).
begin;
set local lock_timeout = '3s';
insert into auth.users (instance_id, id, aud, role, email, is_anonymous, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'c3700000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls-h@test.invalid', false, '{"display_name":"Hana"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3700000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', null, true, '{"display_name":"Ari"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3700000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', null, true, '{"display_name":"Bo"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3700000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', null, true, '{"display_name":"Oz"}', now(), now());
insert into public.rooms (id, host_id, name, created_at, expires_at, code) values
  ('c3700000-0000-4000-8000-0000000000a1', 'c3700000-0000-4000-8000-000000000001', 'R1', now() - interval '2 hours', now() + interval '1 day', '93701'),
  ('c3700000-0000-4000-8000-0000000000a2', 'c3700000-0000-4000-8000-000000000001', 'R2', now() - interval '2 days', now() - interval '1 hour', '93702'),
  ('c3700000-0000-4000-8000-0000000000a3', 'c3700000-0000-4000-8000-000000000001', 'R3', now() - interval '2 hours', now() + interval '1 day', '93703'),
  ('c3700000-0000-4000-8000-0000000000a4', 'c3700000-0000-4000-8000-000000000001', 'R4', now() - interval '2 hours', now() + interval '1 day', '93704');
-- @@MIGRATION supabase/migrations/20261104000037_room_list_summaries.sql@@
insert into public.room_members (room_id, user_id, role) values
  ('c3700000-0000-4000-8000-0000000000a1', 'c3700000-0000-4000-8000-000000000001', 'host'),
  ('c3700000-0000-4000-8000-0000000000a1', 'c3700000-0000-4000-8000-000000000002', 'member'),
  ('c3700000-0000-4000-8000-0000000000a1', 'c3700000-0000-4000-8000-000000000003', 'member'),
  ('c3700000-0000-4000-8000-0000000000a2', 'c3700000-0000-4000-8000-000000000001', 'host'),
  ('c3700000-0000-4000-8000-0000000000a2', 'c3700000-0000-4000-8000-000000000002', 'member'),
  ('c3700000-0000-4000-8000-0000000000a3', 'c3700000-0000-4000-8000-000000000001', 'host'),
  ('c3700000-0000-4000-8000-0000000000a3', 'c3700000-0000-4000-8000-000000000004', 'member'),
  ('c3700000-0000-4000-8000-0000000000a4', 'c3700000-0000-4000-8000-000000000001', 'host'),
  ('c3700000-0000-4000-8000-0000000000a4', 'c3700000-0000-4000-8000-000000000002', 'member');
-- A last read R1 30 minutes ago; B and H use the default (now).
update public.room_members set last_read_at = now() - interval '30 minutes'
 where room_id = 'c3700000-0000-4000-8000-0000000000a1' and user_id = 'c3700000-0000-4000-8000-000000000002';
-- Seed with explicit times (the server created_at trigger would stamp them all with now()).
alter table public.messages disable trigger messages_set_created_at;
insert into public.messages (room_id, sender_id, kind, body, created_at) values
  ('c3700000-0000-4000-8000-0000000000a1', 'c3700000-0000-4000-8000-000000000003', 'text', 'before read', now() - interval '60 minutes'),
  ('c3700000-0000-4000-8000-0000000000a1', 'c3700000-0000-4000-8000-000000000003', 'system', 'Bo joined', now() - interval '20 minutes'),
  ('c3700000-0000-4000-8000-0000000000a1', 'c3700000-0000-4000-8000-000000000002', 'text', 'mine', now() - interval '15 minutes'),
  ('c3700000-0000-4000-8000-0000000000a1', 'c3700000-0000-4000-8000-000000000003', 'media', '3 photos', now() - interval '10 minutes'),
  ('c3700000-0000-4000-8000-0000000000a1', 'c3700000-0000-4000-8000-000000000001', 'system', 'Activity started. Open Map to share your location.', now() - interval '8 minutes'),
  ('c3700000-0000-4000-8000-0000000000a1', 'c3700000-0000-4000-8000-000000000001', 'arrival', 'Hana arrived', now() - interval '5 minutes'),
  ('c3700000-0000-4000-8000-0000000000a1', null, 'system', 'Someone left', now() - interval '2 minutes'),
  ('c3700000-0000-4000-8000-0000000000a2', 'c3700000-0000-4000-8000-000000000001', 'text', 'expired room', now() - interval '90 minutes'),
  ('c3700000-0000-4000-8000-0000000000a3', 'c3700000-0000-4000-8000-000000000001', 'text', 'not for A', now() - interval '5 minutes'),
  ('c3700000-0000-4000-8000-0000000000a4', 'c3700000-0000-4000-8000-000000000002', 'system', 'Ari joined', now() - interval '5 minutes');
alter table public.messages enable trigger messages_set_created_at;

create schema tests;
grant usage on schema tests to authenticated, anon;
create function tests.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
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

-- 0. Grants and the backfill default.
select tests.expect_true($$ has_function_privilege('authenticated', 'public.room_list_summaries(uuid[])', 'execute') $$, 'authenticated may list');
select tests.expect_true($$ not has_function_privilege('anon', 'public.room_list_summaries(uuid[])', 'execute') $$, 'anon may not list');
select tests.expect_true($$ not has_function_privilege('anon', 'public.mark_room_read(uuid)', 'execute') $$, 'anon may not mark');
select tests.expect_true($$ not exists (select 1 from public.room_members where last_read_at is null) $$, 'no null last_read_at');

set local role authenticated;
-- 1. A: R1 and R4 only (R2 expired, R3 not a member).
select tests.login('c3700000-0000-4000-8000-000000000002');
select tests.expect_true($$ (select array_agg(room_id order by room_id) from public.room_list_summaries())
  = array['c3700000-0000-4000-8000-0000000000a1', 'c3700000-0000-4000-8000-0000000000a4']::uuid[] $$, 'A sees R1, R4 only');
-- R1: last item skips the leave line; unread = media + activity + arrival (not own, not join, not before read).
select tests.expect_true($$ (select row(last_kind, last_body, last_sender_id, last_sender_name, unread)::text
  from public.room_list_summaries(array['c3700000-0000-4000-8000-0000000000a1']::uuid[]))
  = row('arrival', 'Hana arrived', 'c3700000-0000-4000-8000-000000000001'::uuid, 'Hana', 3)::text $$, 'R1 last item and unread');
-- R4: only a join line → empty.
select tests.expect_true($$ (select last_kind is null and last_at is null and unread = 0
  from public.room_list_summaries(array['c3700000-0000-4000-8000-0000000000a4']::uuid[])) $$, 'R4 empty');
-- Denied: expired and non-member ids give no row; mark_room_read refuses both.
select tests.expect_true($$ not exists (select 1 from public.room_list_summaries(array['c3700000-0000-4000-8000-0000000000a2']::uuid[])) $$, 'expired: no row');
select tests.expect_true($$ not exists (select 1 from public.room_list_summaries(array['c3700000-0000-4000-8000-0000000000a3']::uuid[])) $$, 'non-member: no row');
select tests.expect_state($$ select public.mark_room_read('c3700000-0000-4000-8000-0000000000a2') $$, '42501', 'mark expired');
select tests.expect_state($$ select public.mark_room_read('c3700000-0000-4000-8000-0000000000a3') $$, '42501', 'mark non-member');
select tests.expect_state($$ select public.mark_room_read('c3700000-0000-4000-8000-0000000000ff') $$, '42501', 'mark unknown room');
-- Mark read clears R1.
select tests.expect_state($$ select public.mark_room_read('c3700000-0000-4000-8000-0000000000a1') $$, null, 'mark R1');
select tests.expect_true($$ (select unread from public.room_list_summaries(array['c3700000-0000-4000-8000-0000000000a1']::uuid[])) = 0 $$, 'R1 read');
-- A cannot set last_read_at directly (no update policy).
update public.room_members set last_read_at = now() - interval '1 day'
 where room_id = 'c3700000-0000-4000-8000-0000000000a1' and user_id = 'c3700000-0000-4000-8000-000000000002';
select tests.expect_true($$ (select unread from public.room_list_summaries(array['c3700000-0000-4000-8000-0000000000a1']::uuid[])) = 0 $$, 'direct update has no effect');

-- 2. B (default last_read_at = now): nothing unread; own media is still the "last item" candidate order-wise.
select tests.login('c3700000-0000-4000-8000-000000000003');
select tests.expect_true($$ (select unread = 0 and last_kind = 'arrival'
  from public.room_list_summaries(array['c3700000-0000-4000-8000-0000000000a1']::uuid[])) $$, 'B R1 nothing unread');

-- 3. O: only R3; cannot mark R1.
select tests.login('c3700000-0000-4000-8000-000000000004');
select tests.expect_true($$ (select array_agg(room_id) from public.room_list_summaries()) = array['c3700000-0000-4000-8000-0000000000a3']::uuid[] $$, 'O sees R3 only');
select tests.expect_state($$ select public.mark_room_read('c3700000-0000-4000-8000-0000000000a1') $$, '42501', 'O mark R1');

reset role;
select 'ROOM LIST SUMMARIES TESTS PASSED' as result;
rollback;
