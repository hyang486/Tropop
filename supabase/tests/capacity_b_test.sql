-- Capacity option B test (migration 0033 room storage cap; join cap from 0008/0031 with 0032 plan caps).
-- One transaction, ends with ROLLBACK. Run as postgres on a database at 0032. The "@@MIGRATION" line below is
-- replaced by the migration text by supabase/tests/local/run.mjs (PGlite) or by the dry-run builder.
-- Success ends with the row 'CAPACITY B TESTS PASSED'.
-- Actors: F Free host, P Plus host, J1..J6 anonymous guests.

begin;
set local lock_timeout = '3s';

-- @@MIGRATION supabase/migrations/20261104000033_room_storage_cap.sql@@

insert into auth.users (instance_id, id, aud, role, email, is_anonymous, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, u.anon, '{"display_name":"T"}', now(), now()
from (values
  ('c3300000-0000-4000-8000-000000000001'::uuid, 'capb-free@test.invalid', false),
  ('c3300000-0000-4000-8000-000000000002'::uuid, 'capb-plus@test.invalid', false),
  ('c3300000-0000-4000-8000-000000000011'::uuid, null, true),
  ('c3300000-0000-4000-8000-000000000012'::uuid, null, true),
  ('c3300000-0000-4000-8000-000000000013'::uuid, null, true),
  ('c3300000-0000-4000-8000-000000000014'::uuid, null, true),
  ('c3300000-0000-4000-8000-000000000015'::uuid, null, true),
  ('c3300000-0000-4000-8000-000000000016'::uuid, null, true)) u(id, email, anon);

create schema ctests;
grant usage on schema ctests to authenticated, anon;
create function ctests.login(p_uid uuid, p_anon boolean) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
$$;
create function ctests.expect_ok(p_sql text, p_label text) returns void language plpgsql as $$
begin
  execute p_sql;
exception when others then
  raise exception 'FAIL: % (% %)', p_label, sqlstate, sqlerrm;
end;
$$;
create function ctests.expect_state(p_sql text, p_state text, p_label text) returns void language plpgsql as $$
declare v_state text; v_msg text; v_detail text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text, v_detail = pg_exception_detail;
  end;
  if v_state is distinct from p_state then
    raise exception 'FAIL: % (expected SQLSTATE %, got % %)', p_label, p_state, coalesce(v_state, 'success'), v_msg;
  end if;
  if p_state = 'PT507' and (v_msg is distinct from 'room_storage_full' or v_detail is distinct from 'This room is out of space.') then
    raise exception 'FAIL: % (PT507 message % detail %)', p_label, v_msg, v_detail;
  end if;
end;
$$;
create function ctests.expect_true(p_sql text, p_label text) returns void language plpgsql as $$
declare v boolean;
begin
  execute 'select (' || p_sql || ')' into v;
  if v is not true then
    raise exception 'FAIL: % (got %)', p_label, v;
  end if;
end;
$$;
grant execute on all functions in schema ctests to authenticated, anon;
create table ctests.made (label text primary key, room_id uuid, code text);
grant all on ctests.made to authenticated;

-- Owner-side upload: the stored original (size from the storage API) and an 'uploading' row.
create function ctests.register(p_room uuid, p_media uuid, p_mib bigint) returns void language plpgsql as $$
declare v_path text := p_room::text || '/' || p_media::text || '/original.jpg';
begin
  insert into storage.objects (bucket_id, name, metadata)
  values ('room-media', v_path, jsonb_build_object('size', p_mib * 1048576));
  insert into public.media (id, room_id, uploader_id, kind, original_path, file_name, mime_type, content_sha256)
  values (p_media, p_room, (select host_id from public.rooms where id = p_room), 'photo', v_path, 'a.jpg', 'image/jpeg', repeat('ab', 32));
end;
$$;
create function ctests.declare(p_room uuid, p_media uuid, p_bytes bigint) returns void language sql as $$
  insert into public.media (id, room_id, uploader_id, kind, original_path, file_name, mime_type, size_bytes)
  values (p_media, p_room, (select host_id from public.rooms where id = p_room), 'photo',
          p_room::text || '/' || p_media::text || '/original.jpg', 'a.jpg', 'image/jpeg', p_bytes);
$$;
create function ctests.ready(p_media uuid) returns void language sql as $$
  update public.media set status = 'ready' where id = p_media;
$$;
create function ctests.used_mib(p_room uuid) returns bigint language sql as $$
  select coalesce(sum(size_bytes), 0) / 1048576 from public.media where room_id = p_room and status = 'ready';
$$;

-- 0. Helpers are private.
select ctests.expect_true($$ not has_function_privilege('authenticated', 'private.room_storage_cap(uuid)', 'execute') $$, 'cap helper private');
select ctests.expect_true($$ not has_function_privilege('authenticated', 'private.room_storage_used(uuid, uuid)', 'execute') $$, 'used helper private');

-- 1. Rooms: F (Free) default capacity; P (Plus).
set local role authenticated;
select ctests.login('c3300000-0000-4000-8000-000000000001', false);
select ctests.expect_ok($$ insert into ctests.made select 'rf', r.id, r.code from public.create_room('CapB F', 'general', now() + interval '3 hours', false) r $$, 'F creates a room');
select ctests.login('c3300000-0000-4000-8000-000000000002', false);
select ctests.expect_ok($$ select public.set_my_plan('plus') $$, 'P is plus');
select ctests.expect_ok($$ insert into ctests.made select 'rp', r.id, r.code from public.create_room('CapB P', 'general', now() + interval '3 hours', false, array[]::text[], null, null, null, null, 30) r $$, 'P creates a 30 room');

-- 2. Join cap: Free host's room holds 6 including the host; the 7th is PT409; a member's rejoin still works.
reset role;
select ctests.expect_true($$ (select max_members = 6 from public.rooms where id = (select room_id from ctests.made where label = 'rf')) $$, 'Free room stored 6');
set local role authenticated;
select ctests.login('c3300000-0000-4000-8000-000000000011', true);
select ctests.expect_ok($$ select public.join_room(p_code => (select code from ctests.made where label = 'rf')) $$, 'J1 joins');
select ctests.login('c3300000-0000-4000-8000-000000000012', true);
select ctests.expect_ok($$ select public.join_room(p_code => (select code from ctests.made where label = 'rf')) $$, 'J2 joins');
select ctests.login('c3300000-0000-4000-8000-000000000013', true);
select ctests.expect_ok($$ select public.join_room(p_code => (select code from ctests.made where label = 'rf')) $$, 'J3 joins');
select ctests.login('c3300000-0000-4000-8000-000000000014', true);
select ctests.expect_ok($$ select public.join_room(p_code => (select code from ctests.made where label = 'rf')) $$, 'J4 joins');
select ctests.login('c3300000-0000-4000-8000-000000000015', true);
select ctests.expect_ok($$ select public.join_room(p_code => (select code from ctests.made where label = 'rf')) $$, 'J5 joins (6 with host)');
select ctests.login('c3300000-0000-4000-8000-000000000016', true);
select ctests.expect_state($$ select public.join_room(p_code => (select code from ctests.made where label = 'rf')) $$, 'PT409', '7th join refused');
select ctests.login('c3300000-0000-4000-8000-000000000011', true);
select ctests.expect_true($$ public.join_room(p_code => (select code from ctests.made where label = 'rf')) = (select room_id from ctests.made where label = 'rf') $$, 'J1 rejoin returns the room');
select ctests.login('c3300000-0000-4000-8000-000000000016', true);
select ctests.expect_ok($$ select public.join_room(p_code => (select code from ctests.made where label = 'rp')) $$, 'J6 joins the Plus room');
reset role;
select ctests.expect_true($$ (select count(*) = 6 from public.room_members where room_id = (select room_id from ctests.made where label = 'rf')) $$, 'Free room has 6 members');

-- 3. Storage cap, Free room 1024 MiB: equal to the cap fits, one byte more does not.
select ctests.expect_true($$ private.room_storage_cap((select room_id from ctests.made where label = 'rf')) = 1073741824 $$, 'Free cap 1 GiB');
select ctests.expect_true($$ private.room_storage_cap((select room_id from ctests.made where label = 'rp')) = 5368709120 $$, 'Plus cap 5 GiB');
select ctests.register((select room_id from ctests.made where label = 'rf'), 'c3310000-0000-4000-8000-000000000001', 600);
select ctests.register((select room_id from ctests.made where label = 'rf'), 'c3310000-0000-4000-8000-000000000002', 400);
select ctests.register((select room_id from ctests.made where label = 'rf'), 'c3310000-0000-4000-8000-000000000003', 25);
select ctests.register((select room_id from ctests.made where label = 'rf'), 'c3310000-0000-4000-8000-000000000004', 24);
select ctests.expect_ok($$ select ctests.ready('c3310000-0000-4000-8000-000000000001') $$, 'F 600 MiB ready');
select ctests.expect_ok($$ select ctests.ready('c3310000-0000-4000-8000-000000000002') $$, 'F +400 MiB ready');
-- 3a. Pre-upload check on INSERT with the declared size (1000 MiB ready, cap 1024 MiB).
select ctests.expect_state($$ select ctests.declare((select room_id from ctests.made where label = 'rf'), 'c3320000-0000-4000-8000-000000000001', 30 * 1048576) $$, 'PT507', 'declared 30 MiB over cap refused at insert');
select ctests.expect_ok($$ select ctests.declare((select room_id from ctests.made where label = 'rf'), 'c3320000-0000-4000-8000-000000000002', 20 * 1048576) $$, 'declared 20 MiB fits');
select ctests.expect_state($$ select ctests.declare((select room_id from ctests.made where label = 'rf'), 'c3320000-0000-4000-8000-000000000003', 20 * 1048576) $$, 'PT507', 'live pending 20 MiB counted: second 20 MiB refused');
update public.media set created_at = now() - interval '2 hours' where id = 'c3320000-0000-4000-8000-000000000002';
select ctests.expect_ok($$ select ctests.declare((select room_id from ctests.made where label = 'rf'), 'c3320000-0000-4000-8000-000000000003', 20 * 1048576) $$, 'abandoned pending (> 1 h) not counted');
update public.media set status = 'failed' where id in ('c3320000-0000-4000-8000-000000000002', 'c3320000-0000-4000-8000-000000000003');
select ctests.expect_state($$ select ctests.declare((select room_id from ctests.made where label = 'rf'), 'c3320000-0000-4000-8000-000000000004', 52428801) $$, '22023', 'declared over 50 MB refused');
select ctests.expect_state($$ select ctests.declare((select room_id from ctests.made where label = 'rf'), 'c3320000-0000-4000-8000-000000000004', 0) $$, '22023', 'declared 0 refused');
select ctests.expect_true($$ (select file_size_limit = 52428800 from storage.buckets where id = 'room-media') $$, '50 MB per-file bucket limit unchanged');
select ctests.expect_state($$ select ctests.ready('c3310000-0000-4000-8000-000000000003') $$, 'PT507', 'F +25 MiB over 1 GiB refused');
select ctests.expect_true($$ (select status <> 'ready' from public.media where id = 'c3310000-0000-4000-8000-000000000003') $$, 'refused row not ready');
select ctests.expect_ok($$ select ctests.ready('c3310000-0000-4000-8000-000000000004') $$, 'F +24 MiB to exactly 1 GiB');
select ctests.expect_true($$ ctests.used_mib((select room_id from ctests.made where label = 'rf')) = 1024 $$, 'F used 1024 MiB');
select ctests.expect_state($$ select ctests.ready('c3310000-0000-4000-8000-000000000003') $$, 'PT507', 'full room: pending row cannot become ready');
-- A full room refuses a new registration before any bytes, under RLS too.
select ctests.login('c3300000-0000-4000-8000-000000000001', false);
set local role authenticated;
select ctests.expect_state($q$ insert into public.media (id, room_id, uploader_id, kind, original_path, file_name, mime_type)
  select 'c3310000-0000-4000-8000-000000000005', r.room_id, auth.uid(), 'photo',
         r.room_id || '/c3310000-0000-4000-8000-000000000005/original.jpg', 'a.jpg', 'image/jpeg'
  from ctests.made r where r.label = 'rf' $q$, 'PT507', 'full room: host registration refused (RLS)');
reset role;
-- Ready media in a full room stay readable and are not changed.
select ctests.expect_true($$ (select count(*) = 3 from public.media where room_id = (select room_id from ctests.made where label = 'rf') and status = 'ready') $$, 'F ready media kept');

-- 4. Plus room 5 GiB: 1100 MiB fits.
select ctests.register((select room_id from ctests.made where label = 'rp'), 'c3310000-0000-4000-8000-000000000011', 1100);
select ctests.expect_ok($$ select ctests.ready('c3310000-0000-4000-8000-000000000011') $$, 'P 1100 MiB ready');
select ctests.register((select room_id from ctests.made where label = 'rp'), 'c3310000-0000-4000-8000-000000000012', 4020);
select ctests.register((select room_id from ctests.made where label = 'rp'), 'c3310000-0000-4000-8000-000000000013', 5);
select ctests.expect_ok($$ select ctests.ready('c3310000-0000-4000-8000-000000000012') $$, 'P to exactly 5 GiB');
select ctests.expect_state($$ select ctests.ready('c3310000-0000-4000-8000-000000000013') $$, 'PT507', 'P +5 MiB over 5 GiB refused');

-- 5. Plan change: the cap follows the host's current plan; existing media stay.
select ctests.login('c3300000-0000-4000-8000-000000000002', false);
set local role authenticated;
select ctests.expect_ok($$ select public.set_my_plan('free') $$, 'P back to free');
reset role;
select ctests.expect_true($$ private.room_storage_cap((select room_id from ctests.made where label = 'rp')) = 1073741824 $$, 'P room cap now 1 GiB');
select ctests.expect_true($$ ctests.used_mib((select room_id from ctests.made where label = 'rp')) = 5120 $$, 'P media kept (grandfathered)');
select ctests.expect_state($$ select ctests.register((select room_id from ctests.made where label = 'rp'), 'c3310000-0000-4000-8000-000000000014', 1) $$, 'PT507', 'downgraded room over cap refuses new uploads');
select ctests.login('c3300000-0000-4000-8000-000000000001', false);
set local role authenticated;
select ctests.expect_ok($$ select public.set_my_plan('plus') $$, 'F upgrades');
reset role;
select ctests.expect_ok($$ select ctests.ready('c3310000-0000-4000-8000-000000000003') $$, 'upgraded room accepts the pending 25 MiB');

-- 6. 0015 behavior unchanged: a ready row stays immutable; a missing original is still refused.
reset role;
select ctests.expect_state($$ update public.media set original_path = original_path || 'x' where id = 'c3310000-0000-4000-8000-000000000001' $$, '42501', 'ready row immutable');
-- No Storage object for this row (live Storage refuses direct deletes, so none is created).
select ctests.declare((select room_id from ctests.made where label = 'rf'), 'c3310000-0000-4000-8000-000000000006', null);
select ctests.expect_state($$ select ctests.ready('c3310000-0000-4000-8000-000000000006') $$, '22023', 'missing original still refused');

select 'CAPACITY B TESTS PASSED' as result;
rollback;
