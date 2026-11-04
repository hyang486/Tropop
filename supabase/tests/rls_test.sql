-- Re-runnable RLS / RPC permission test (supervisor note P1).
-- Runs entirely inside one transaction and ends with ROLLBACK, so it leaves no data behind.
-- Requires all migrations through storage_buckets.
-- Run as the database owner (postgres), e.g. Supabase MCP `execute_sql` with this file's contents,
-- or `psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql`.
-- Any failed expectation raises `FAIL: <label>` and aborts. Success ends with the row 'RLS TESTS PASSED'.
--
-- Actors: H host account, G anonymous guest, O anonymous outsider (never joins),
--         L anonymous guest who joins then leaves, plus the anon (signed-out) role.
-- Rooms:  R open sports room, X room that expires, Y room the host ends early.

begin;

create schema tests;
grant usage on schema tests to authenticated, anon;

create function tests.login(p_uid uuid, p_anon boolean) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
$$;

create function tests.expect_error(p_sql text, p_label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    return;
  end;
  raise exception 'FAIL: % (statement succeeded but should have failed)', p_label;
end;
$$;

create function tests.expect_ok(p_sql text, p_label text) returns void language plpgsql as $$
begin
  execute p_sql;
exception when others then
  raise exception 'FAIL: % (% %)', p_label, sqlstate, sqlerrm;
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

create function tests.expect_affected(p_sql text, p_n bigint, p_label text) returns void language plpgsql as $$
declare v bigint;
begin
  execute p_sql;
  get diagnostics v = row_count;
  if v is distinct from p_n then
    raise exception 'FAIL: % (expected % rows affected, got %)', p_label, p_n, v;
  end if;
end;
$$;

grant execute on all functions in schema tests to authenticated, anon;

-- Fixed test identities (rolled back at the end).
insert into auth.users (instance_id, id, aud, role, email, is_anonymous, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls-host@test.invalid', false, '{"display_name":"Host"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', null, true, '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', null, true, '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', null, true, '{}', now(), now());

do $$ begin
  if (select count(*) from public.profiles where id::text like 'a0000000-0000-4000-8000-00000000000%') <> 4 then
    raise exception 'FAIL: sign-up trigger did not create 4 profiles';
  end if;
end $$;

-- H creates rooms ------------------------------------------------------------
select tests.login('a0000000-0000-4000-8000-000000000001', false);
set local role authenticated;
do $$
declare r public.rooms;
begin
  r := public.create_room('Sunset Run', 'sports', now() + interval '2 days', true, array['Resting', 'Need water', 'emergency']);
  perform set_config('t.r', r.id::text, true);
  perform set_config('t.r_code', r.code, true);
  perform set_config('t.r_token', r.invite_token, true);
  r := public.create_room('Expiring', 'event', now() + interval '1 hour', false, null);
  perform set_config('t.x', r.id::text, true);
  perform set_config('t.x_code', r.code, true);
  r := public.create_room('Ended early', 'general', now() + interval '1 hour', false, null);
  perform set_config('t.y', r.id::text, true);
  perform set_config('t.y_code', r.code, true);
end $$;
select tests.expect_count($q$ select 1 from public.status_definitions where room_id = current_setting('t.r')::uuid $q$, 3,
  'create_room adds Emergency + 2 custom statuses (duplicate Emergency label ignored)');
select tests.expect_count($q$ select 1 from public.status_definitions where room_id = current_setting('t.r')::uuid and is_emergency $q$, 1,
  'exactly one built-in Emergency status');
select tests.expect_error($q$ insert into public.rooms (host_id, name, expires_at, code) values (auth.uid(), 'direct', now() + interval '1 day', '00001') $q$,
  'rooms cannot be inserted directly, only through create_room');
select tests.expect_error($q$ select public.create_room('Too long', 'general', now() + interval '30 days', false) $q$,
  'expiration beyond 7 days is rejected');
select tests.expect_error($q$ select public.create_room('Bad type', 'party', now() + interval '1 day', false) $q$,
  'unknown room type is rejected');
reset role;

-- G (anonymous guest) --------------------------------------------------------
select tests.login('a0000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select tests.expect_error($q$ select public.create_room('Guest room', 'general', now() + interval '1 day', false) $q$,
  'anonymous guest cannot create a room');
select tests.expect_count($q$ select 1 from public.rooms $q$, 0, 'guest sees no rooms before joining');
select tests.expect_count($q$ select * from public.preview_room(current_setting('t.r_code'), null) where not already_member $q$, 1,
  'guest can preview room by code');
select tests.expect_ok($q$ select public.join_room(null, current_setting('t.r_token')) $q$, 'guest joins R by QR token');
select tests.expect_ok($q$ select public.join_room(current_setting('t.r_code'), null) $q$, 'joining twice is idempotent');
select tests.expect_ok($q$ select public.join_room(current_setting('t.x_code'), null) $q$, 'guest joins X by code');
select tests.expect_ok($q$ select public.join_room(current_setting('t.y_code'), null) $q$, 'guest joins Y by code');
select tests.expect_count($q$ select 1 from public.rooms $q$, 3, 'guest sees the 3 joined rooms');
select tests.expect_count($q$ select 1 from public.room_members where room_id = current_setting('t.r')::uuid $q$, 2,
  'guest sees R members (host + self)');
select tests.expect_count($q$ select 1 from public.room_members where room_id = current_setting('t.r')::uuid and user_id = auth.uid() $q$, 1,
  'joining twice created one membership');
select tests.expect_ok($q$ insert into public.messages (room_id, sender_id, body) values (current_setting('t.r')::uuid, auth.uid(), 'hello') $q$,
  'member can send a text message');
select tests.expect_error($q$ insert into public.messages (room_id, sender_id, body) values (current_setting('t.r')::uuid, 'a0000000-0000-4000-8000-000000000001', 'spoof') $q$,
  'member cannot send as someone else');
select tests.expect_error($q$ insert into public.messages (room_id, sender_id, kind, body) values (current_setting('t.r')::uuid, auth.uid(), 'system', 'fake system') $q$,
  'member cannot send system messages');
select tests.expect_error($q$ insert into public.messages (room_id, sender_id, kind, body) values (current_setting('t.r')::uuid, auth.uid(), 'emergency', 'fake') $q$,
  'member cannot forge emergency messages directly');
select tests.expect_affected($q$ update public.rooms set name = 'hijack' where id = current_setting('t.r')::uuid $q$, 0,
  'member cannot update the room row');
select tests.expect_affected($q$ delete from public.messages where room_id = current_setting('t.r')::uuid $q$, 0,
  'member cannot delete messages');
select tests.expect_error($q$ select public.set_activity_state(current_setting('t.r')::uuid, 'active') $q$,
  'guest cannot start the activity');
select tests.expect_error($q$ select public.set_route(current_setting('t.r')::uuid, '[]'::jsonb) $q$,
  'guest cannot edit the route');
select tests.expect_error($q$ select public.end_room(current_setting('t.r')::uuid) $q$, 'guest cannot end the room');
select tests.expect_error($q$ select public.set_status_definitions(current_setting('t.r')::uuid, array['x']) $q$,
  'guest cannot edit statuses');
select tests.expect_error($q$ select 1 from public.cleanup_jobs $q$, 'cleanup_jobs is not readable by clients');
select tests.expect_error($q$ select 1 from public.join_attempts $q$, 'join_attempts is not readable by clients');
select tests.expect_error($q$ select 1 from public.expiry_reminders $q$, 'expiry_reminders is not readable by clients');
select tests.expect_error($q$ insert into public.live_presence (room_id, user_id, lat, lng) values (current_setting('t.r')::uuid, auth.uid(), 1, 1) $q$,
  'live_presence cannot be written directly');
select tests.expect_error($q$ insert into public.arrivals (room_id, user_id) values (current_setting('t.r')::uuid, auth.uid()) $q$,
  'arrivals cannot be written directly');
-- Arrival dedup before any activity (activity_seq 0).
select tests.expect_ok($q$ select public.mark_arrived(current_setting('t.r')::uuid) $q$, 'guest marks arrived');
select tests.expect_ok($q$ select public.mark_arrived(current_setting('t.r')::uuid) $q$, 'repeat arrival tap is accepted');
select tests.expect_count($q$ select 1 from public.arrivals where room_id = current_setting('t.r')::uuid $q$, 1, 'repeat tap does not duplicate arrival');
select tests.expect_count($q$ select 1 from public.messages where room_id = current_setting('t.r')::uuid and kind = 'arrival' $q$, 1,
  'repeat tap does not duplicate the arrival notice');
-- Location is refused until the host starts the activity and the member opts in.
select tests.expect_count($q$ select 1 where public.report_location(current_setting('t.r')::uuid, 37.0, -122.0, 3.0) $q$, 0,
  'location refused: not opted in, activity not started');
select tests.expect_ok($q$ select public.set_share_location(current_setting('t.r')::uuid, true) $q$, 'guest opts in to location');
select tests.expect_count($q$ select 1 where public.report_location(current_setting('t.r')::uuid, 37.0, -122.0, 3.0) $q$, 0,
  'location refused: activity not started');
reset role;

-- H starts the activity --------------------------------------------------------
select tests.login('a0000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect_ok($q$ select public.set_activity_state(current_setting('t.r')::uuid, 'active') $q$, 'host starts activity');
select tests.expect_ok($q$ select public.set_route(current_setting('t.r')::uuid, '[{"latitude":37,"longitude":-122}]'::jsonb) $q$, 'host sets route');
select tests.expect_error($q$ select public.set_activity_state(current_setting('t.x')::uuid, 'active') $q$,
  'activity cannot start in a room without location permission');
select tests.expect_count($q$ select 1 from public.profiles where id = 'a0000000-0000-4000-8000-000000000002' $q$, 1,
  'host can see a co-member profile');
select tests.expect_affected($q$ update public.profiles set display_name = 'pwned' where id = 'a0000000-0000-4000-8000-000000000002' $q$, 0,
  'host cannot edit another profile');
select tests.expect_error($q$ select public.leave_room(current_setting('t.r')::uuid) $q$, 'host cannot leave (must end the room)');
reset role;

-- G during the activity --------------------------------------------------------
select tests.login('a0000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select tests.expect_count($q$ select 1 where public.report_location(current_setting('t.r')::uuid, 37.0, -122.0, 3.0) $q$, 1,
  'location accepted when all server conditions hold');
select tests.expect_count($q$ select 1 from public.live_presence where room_id = current_setting('t.r')::uuid $q$, 1, 'presence row stored');
select tests.expect_count($q$ select 1 where public.report_location(current_setting('t.x')::uuid, 37.0, -122.0, 3.0) $q$, 0,
  'location refused in a room without location permission');
select tests.expect_ok($q$ select public.mark_arrived(current_setting('t.r')::uuid) $q$, 'guest marks arrived for the new activity');
select tests.expect_count($q$ select 1 from public.arrivals where room_id = current_setting('t.r')::uuid and user_id = auth.uid() $q$, 2,
  'a new activity allows a new arrival (P2)');
select tests.expect_ok($q$ select public.set_my_status(current_setting('t.r')::uuid,
  (select id from public.status_definitions where room_id = current_setting('t.r')::uuid and is_emergency)) $q$, 'guest raises Emergency');
select tests.expect_count($q$ select 1 from public.emergency_events where room_id = current_setting('t.r')::uuid $q$, 1, 'emergency event recorded');
select tests.expect_error($q$ select public.set_my_status(current_setting('t.r')::uuid,
  (select id from public.status_definitions where room_id = current_setting('t.x')::uuid and is_emergency)) $q$,
  'status from another room is rejected');
select tests.expect_ok($q$ select public.set_share_location(current_setting('t.r')::uuid, false) $q$, 'guest opts out');
select tests.expect_count($q$ select 1 from public.live_presence where room_id = current_setting('t.r')::uuid and user_id = auth.uid() $q$, 0,
  'opting out deletes the stored position');
select tests.expect_ok($q$ select public.set_share_location(current_setting('t.r')::uuid, true) $q$, 'guest opts in again');
select tests.expect_ok($q$ select public.report_location(current_setting('t.r')::uuid, 37.0, -122.0, 3.0) $q$, 'guest reports again');
-- Face enrollment is per room and per member.
select tests.expect_error($q$ select public.enroll_face(current_setting('t.r')::uuid, 'other/path.jpg') $q$,
  'face reference path must be under room/user');
select tests.expect_ok($q$ select public.enroll_face(current_setting('t.r')::uuid,
  current_setting('t.r') || '/' || auth.uid() || '/ref.jpg') $q$, 'guest enrolls a face reference in R');
select tests.expect_count($q$ select 1 from public.face_enrollments $q$, 1, 'guest sees own enrollment');
reset role;

-- H cannot see the guest's face data; host ends the activity -------------------
select tests.login('a0000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect_count($q$ select 1 from public.face_enrollments $q$, 0, 'host cannot see guest face enrollment');
select tests.expect_count($q$ select 1 from public.emergency_events where room_id = current_setting('t.r')::uuid $q$, 1, 'host sees the emergency');
select tests.expect_ok($q$ select public.ack_emergency((select id from public.emergency_events where room_id = current_setting('t.r')::uuid)) $q$,
  'host acknowledges the emergency');
select tests.expect_ok($q$ select public.set_activity_state(current_setting('t.r')::uuid, 'ended') $q$, 'host ends the activity');
select tests.expect_count($q$ select 1 from public.live_presence where room_id = current_setting('t.r')::uuid $q$, 0,
  'ending the activity clears all positions');
select tests.expect_ok($q$ select public.end_room(current_setting('t.y')::uuid) $q$, 'host ends room Y early');
reset role;

-- O (outsider who never joined) ----------------------------------------------
select tests.login('a0000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select tests.expect_count($q$ select 1 from public.rooms $q$, 0, 'outsider sees no rooms');
select tests.expect_count($q$ select 1 from public.messages $q$, 0, 'outsider sees no messages');
select tests.expect_count($q$ select 1 from public.room_members $q$, 0, 'outsider sees no members');
select tests.expect_count($q$ select 1 from public.status_definitions $q$, 0, 'outsider sees no statuses');
select tests.expect_count($q$ select 1 from public.arrivals $q$, 0, 'outsider sees no arrivals');
select tests.expect_count($q$ select 1 from public.live_presence $q$, 0, 'outsider sees no positions');
select tests.expect_count($q$ select 1 from public.emergency_events $q$, 0, 'outsider sees no emergencies');
select tests.expect_count($q$ select 1 from public.emergency_acks $q$, 0, 'outsider sees no acknowledgements');
select tests.expect_count($q$ select 1 from public.media $q$, 0, 'outsider sees no media');
select tests.expect_count($q$ select 1 from public.face_enrollments $q$, 0, 'outsider sees no face data');
select tests.expect_count($q$ select 1 from public.profiles $q$, 1, 'outsider sees only own profile');
select tests.expect_error($q$ insert into public.messages (room_id, sender_id, body) values (current_setting('t.r')::uuid, auth.uid(), 'x') $q$,
  'outsider cannot post');
select tests.expect_error($q$ insert into public.media (room_id, uploader_id, kind, original_path, file_name, mime_type)
  values (current_setting('t.r')::uuid, auth.uid(), 'photo', current_setting('t.r') || '/m/original.jpg', 'a.jpg', 'image/jpeg') $q$,
  'outsider cannot add media');
select tests.expect_error($q$ select public.mark_arrived(current_setting('t.r')::uuid) $q$, 'outsider cannot mark arrival');
select tests.expect_count($q$ select 1 where public.report_location(current_setting('t.r')::uuid, 1, 1) $q$, 0, 'outsider location refused');
select tests.expect_error($q$ select public.ack_emergency((select id from public.emergency_events limit 1)) $q$, 'outsider cannot acknowledge');
select tests.expect_count($q$ select * from public.preview_room('99999x', null) $q$, 0, 'invalid code previews nothing');
select tests.expect_error($q$ select public.join_room(null, 'not-a-token') $q$, 'invalid token cannot join');
select tests.expect_error($q$ select public.join_room(current_setting('t.y_code'), null) $q$, 'cannot join a room the host ended');
reset role;

-- Storage RLS (room-media, face-refs) ----------------------------------------
-- R is open with H (host) and G (member); O never joined. Requires migration storage_buckets.
select tests.login('a0000000-0000-4000-8000-000000000002', true);
set local role authenticated;
do $$
declare m uuid;
begin
  insert into public.media (room_id, uploader_id, kind, original_path, file_name, mime_type)
  values (current_setting('t.r')::uuid, auth.uid(), 'photo', current_setting('t.r') || '/pending/original.jpg', 'a.jpg', 'image/jpeg')
  returning id into m;
  perform set_config('t.m', m::text, true);
end $$;
select tests.expect_ok($q$ insert into storage.objects (bucket_id, name, owner_id) values ('room-media',
  current_setting('t.r') || '/' || current_setting('t.m') || '/original.jpg', auth.uid()::text) $q$, 'uploader writes the original for own media row');
select tests.expect_error($q$ insert into storage.objects (bucket_id, name, owner_id) values ('room-media',
  current_setting('t.r') || '/' || gen_random_uuid() || '/original.jpg', auth.uid()::text) $q$, 'cannot upload without a matching media row');
select tests.expect_error($q$ insert into storage.objects (bucket_id, name, owner_id) values ('room-media',
  'not-a-uuid/x/original.jpg', auth.uid()::text) $q$, 'malformed path is rejected');
select tests.expect_ok($q$ insert into storage.objects (bucket_id, name, owner_id) values ('face-refs',
  current_setting('t.r') || '/' || auth.uid() || '/ref.jpg', auth.uid()::text) $q$, 'member writes own face reference');
select tests.expect_error($q$ insert into storage.objects (bucket_id, name, owner_id) values ('face-refs',
  current_setting('t.r') || '/a0000000-0000-4000-8000-000000000001/ref.jpg', auth.uid()::text) $q$, 'cannot write another user''s face reference');
select tests.expect_count($q$ select 1 from storage.objects where bucket_id = 'face-refs' $q$, 1, 'member sees own face reference');
-- Direct deletes are refused (by the storage delete guard or by the absence of a delete policy).
do $$ begin
  begin delete from storage.objects where bucket_id in ('room-media', 'face-refs'); exception when others then null; end;
end $$;
select tests.expect_count($q$ select 1 from storage.objects where bucket_id = 'room-media' $q$, 1, 'client cannot delete room media objects');
select tests.expect_count($q$ select 1 from storage.objects where bucket_id = 'face-refs' $q$, 1, 'client cannot delete face reference objects');
reset role;

select tests.login('a0000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect_count($q$ select 1 from storage.objects where bucket_id = 'room-media' $q$, 1, 'host (member) sees room media');
select tests.expect_count($q$ select 1 from storage.objects where bucket_id = 'face-refs' $q$, 0, 'host cannot see guest face reference');
select tests.expect_error($q$ insert into storage.objects (bucket_id, name, owner_id) values ('room-media',
  current_setting('t.r') || '/' || current_setting('t.m') || '/preview.jpg', auth.uid()::text) $q$, 'host cannot write into another member''s media folder');
reset role;

select tests.login('a0000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select tests.expect_count($q$ select 1 from storage.objects where bucket_id in ('room-media', 'face-refs') $q$, 0, 'outsider sees no objects');
reset role;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select tests.expect_count($q$ select 1 from storage.objects where bucket_id in ('room-media', 'face-refs') $q$, 0, 'anon sees no objects');
reset role;

-- L joins then leaves --------------------------------------------------------
select tests.login('a0000000-0000-4000-8000-000000000004', true);
set local role authenticated;
select tests.expect_ok($q$ select public.join_room(current_setting('t.r_code'), null) $q$, 'L joins R');
select tests.expect_ok($q$ select public.enroll_face(current_setting('t.r')::uuid, current_setting('t.r') || '/' || auth.uid() || '/ref.jpg') $q$,
  'L enrolls a face reference');
select tests.expect_ok($q$ select public.leave_room(current_setting('t.r')::uuid) $q$, 'L leaves R');
select tests.expect_count($q$ select 1 from public.rooms $q$, 0, 'left member sees no rooms');
select tests.expect_count($q$ select 1 from public.messages $q$, 0, 'left member sees no messages');
select tests.expect_count($q$ select 1 from public.face_enrollments $q$, 0, 'left member face enrollment is gone');
select tests.expect_error($q$ insert into public.messages (room_id, sender_id, body) values (current_setting('t.r')::uuid, auth.uid(), 'x') $q$,
  'left member cannot post');
reset role;

do $$ begin
  if not exists (select 1 from public.cleanup_jobs
                 where bucket = 'face-refs'
                   and prefix = current_setting('t.r') || '/a0000000-0000-4000-8000-000000000004/') then
    raise exception 'FAIL: leaving did not queue face reference cleanup';
  end if;
end $$;

-- X expires (server time passes expires_at) ------------------------------------
update public.rooms set created_at = now() - interval '2 hours', expires_at = now() - interval '1 second'
 where id = current_setting('t.x')::uuid;

select tests.login('a0000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select tests.expect_count($q$ select 1 from public.rooms where id = current_setting('t.x')::uuid $q$, 0, 'expired room is hidden before cleanup');
select tests.expect_count($q$ select 1 from public.messages where room_id = current_setting('t.x')::uuid $q$, 0, 'expired room messages hidden');
select tests.expect_count($q$ select 1 from public.status_definitions where room_id = current_setting('t.x')::uuid $q$, 0, 'expired room statuses hidden');
select tests.expect_error($q$ insert into public.messages (room_id, sender_id, body) values (current_setting('t.x')::uuid, auth.uid(), 'late') $q$,
  'cannot post into an expired room');
select tests.expect_error($q$ select public.mark_arrived(current_setting('t.x')::uuid) $q$, 'cannot mark arrival in an expired room');
select tests.expect_count($q$ select 1 from public.rooms where id = current_setting('t.y')::uuid $q$, 0, 'room ended by host is hidden');
select tests.expect_count($q$ select 1 from public.profiles where id = 'a0000000-0000-4000-8000-000000000001' $q$, 1,
  'profile visible while sharing open room R');
select tests.expect_error($q$ select public.join_room(current_setting('t.x_code'), null) $q$, 'cannot join an expired room');
reset role;

select tests.login('a0000000-0000-4000-8000-000000000001', false);
set local role authenticated;
select tests.expect_error($q$ select public.update_room_expiry(current_setting('t.x')::uuid, now() + interval '1 day') $q$,
  'an expired room cannot be revived');
select tests.expect_ok($q$ select public.update_room_expiry(current_setting('t.r')::uuid, now() + interval '3 days') $q$, 'host extends open room');
select tests.expect_count($q$ select 1 from public.rooms where id = current_setting('t.r')::uuid and expiry_version = 2 $q$, 1,
  'expiry change bumps expiry_version');
reset role;

-- Signed-out (anon role) -----------------------------------------------------
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select tests.expect_count($q$ select 1 from public.rooms $q$, 0, 'anon sees no rooms');
select tests.expect_count($q$ select 1 from public.profiles $q$, 0, 'anon sees no profiles');
select tests.expect_error($q$ select public.join_room(current_setting('t.r_code'), null) $q$, 'anon cannot call join_room');
select tests.expect_error($q$ select * from public.preview_room(current_setting('t.r_code'), null) $q$, 'anon cannot preview rooms');
select tests.expect_error($q$ select private.is_room_member(current_setting('t.r')::uuid) $q$, 'anon cannot call private helpers');
reset role;

-- Room deletion queues storage cleanup for both buckets ------------------------
delete from public.rooms where id = current_setting('t.x')::uuid;
do $$ begin
  if (select count(*) from public.cleanup_jobs where prefix = current_setting('t.x') || '/' and bucket in ('room-media', 'face-refs')) <> 2 then
    raise exception 'FAIL: deleting a room did not queue both storage prefixes';
  end if;
end $$;

select 'RLS TESTS PASSED' as result;
rollback;
