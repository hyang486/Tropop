-- B3 / 0043 rollback test: precheck section A at 0042, apply 0043, add B3 data, the revert refuses without force,
-- then with force returns the catalog to the exact 0042 shape and keeps the Got-it rows as 0038 checks.
-- One transaction, ends with ROLLBACK. Run on a database at 0042 (PGlite):
-- node run.mjs supabase/migrations 20261104000042 supabase/tests/b3_0043_rollback_test.sql
-- Success ends with the row 'B3 0043 ROLLBACK TESTS PASSED'. The precheck prints its rows; all ok must be true.

begin;

create schema tests;
grant usage on schema tests to authenticated;
create function tests.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', false)::text, true);
$$;
create function tests.expect(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'FAIL: %', p_label; end if;
end;
$$;
create function tests.code(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql; return 'ok';
exception when others then return sqlstate || ' ' || sqlerrm;
end;
$$;
grant execute on all functions in schema tests to authenticated;

-- What 0043 and its revert touch, as text, so before/after can be compared exactly.
create view tests.shape as
  select 'con ' || conrelid::regclass || ' ' || conname || ' ' || pg_get_constraintdef(oid) as item
    from pg_constraint where conrelid in ('public.messages'::regclass, 'public.message_reactions'::regclass, 'public.profiles'::regclass)
  union all
  select 'col ' || table_name || '.' || column_name || ' ' || data_type || ' ' || is_nullable
    from information_schema.columns where table_schema = 'public' and table_name in ('messages', 'message_reactions', 'profiles')
  union all
  select 'pol ' || tablename || ' ' || policyname || ' ' || cmd || ' ' || coalesce(qual, '') || ' ' || coalesce(with_check, '')
    from pg_policies where schemaname = 'public' and tablename in ('messages', 'message_reactions', 'profiles')
  union all
  select 'fn ' || p.oid::regprocedure || ' ' || md5(pg_get_functiondef(p.oid))
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'toggle_message_%'
  union all
  select 'acl ' || p.oid::regprocedure || ' ' || coalesce(p.proacl::text, '')
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'toggle_message_%';
create table tests.before as select item from tests.shape;

-- @@MIGRATION supabase/rollback/20261104000043_b3_precheck.sql@@

insert into auth.users (instance_id, id, aud, role, email, is_anonymous, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'c4310000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'b3rb-host@test.invalid', false, '{"display_name":"Host"}', now(), now());
select tests.login('c4310000-0000-4000-8000-000000000001');
set local role authenticated;
do $$
declare r public.rooms;
begin
  r := public.create_room('B3 rollback', 'sports', now() + interval '1 day', false, array['Resting']);
  perform set_config('t.r', r.id::text, true);
end $$;
reset role;
select set_config('t.m', gen_random_uuid()::text, true);
insert into public.messages (id, room_id, sender_id, kind, body)
values (current_setting('t.m')::uuid, current_setting('t.r')::uuid, 'c4310000-0000-4000-8000-000000000001', 'text', 'hi');
select tests.login('c4310000-0000-4000-8000-000000000001');
set local role authenticated;
select public.toggle_message_check(current_setting('t.m')::uuid);
reset role;

-- @@MIGRATION supabase/migrations/20261104000043_b3_reactions_stickers_characters.sql@@

-- B3 data: Love on t.m, a sticker with a reaction, a character.
select tests.login('c4310000-0000-4000-8000-000000000001');
set local role authenticated;
select public.toggle_message_reaction(current_setting('t.m')::uuid, 1::smallint);
insert into public.messages (room_id, sender_id, kind, body)
values (current_setting('t.r')::uuid, 'c4310000-0000-4000-8000-000000000001', 'sticker', 'meetup-01');
select public.toggle_message_reaction((select id from public.messages where kind = 'sticker'), 3::smallint);
reset role;
insert into public.profiles (id, display_name) values ('c4310000-0000-4000-8000-000000000001', 'Host') on conflict (id) do nothing;
update public.profiles set avatar_character = 4 where id = 'c4310000-0000-4000-8000-000000000001';
select tests.expect((select count(*) from public.message_reactions) = 3, 'three reactions before revert');

-- 1. Without force the revert refuses and changes nothing.
create function tests.revert_text() returns text language sql as $f$ select $rev$
-- @@MIGRATION supabase/rollback/20261104000043_b3_reactions_stickers_characters_revert.sql@@
$rev$ $f$;
select tests.expect(tests.code(tests.revert_text()) like 'P0001 b3_data_present: 1 sticker messages, 2 non-Got-it reactions, 1 avatar characters',
                    'refuses without force: ' || tests.code(tests.revert_text()));
select tests.expect((select count(*) from public.message_reactions) = 3, 'refusal changed nothing');

-- 2. With force: the catalog matches 0042 exactly.
select set_config('b3.rollback_force', 'on', true);
select tests.expect(tests.code(tests.revert_text()) = 'ok', 'forced revert runs');
select tests.expect(not exists (select item from tests.shape except select item from tests.before)
                and not exists (select item from tests.before except select item from tests.shape),
                    'catalog back to 0042: ' || coalesce((select string_agg(item, ' | ') from
                      ((select item from tests.shape except select item from tests.before)
                       union all (select item from tests.before except select item from tests.shape)) d), ''));

-- 3. Data: the Got-it check survives as a 0038 row; the sticker and other reactions are gone; 0038 behaviour works.
select tests.expect((select count(*) from public.message_reactions) = 1, 'one check kept');
select tests.expect((select count(*) from public.messages where kind = 'sticker') = 0, 'stickers removed');
select tests.login('c4310000-0000-4000-8000-000000000001');
set local role authenticated;
select tests.expect(not public.toggle_message_check(current_setting('t.m')::uuid), '0038 toggle: off');
select tests.expect(public.toggle_message_check(current_setting('t.m')::uuid), '0038 toggle: on');
select tests.expect(tests.code(format(
  'insert into public.messages (room_id, sender_id, kind, body) values (%L, %L, %L, %L)',
  current_setting('t.r'), 'c4310000-0000-4000-8000-000000000001', 'sticker', 'meetup-01')) like '23514%'
  or tests.code(format(
  'insert into public.messages (room_id, sender_id, kind, body) values (%L, %L, %L, %L)',
  current_setting('t.r'), 'c4310000-0000-4000-8000-000000000001', 'sticker', 'meetup-01')) like '42501%', 'sticker kind refused again');
reset role;

select 'B3 0043 ROLLBACK TESTS PASSED';

rollback;
