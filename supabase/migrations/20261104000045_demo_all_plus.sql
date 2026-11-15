-- Demo: every account is Plus (human order 2026-11-15 ~10:30 via qa/supervisor: judges try all AI features on the
-- deployed demo without a paywall). public.user_plans stays the single source of truth, so every existing gate
-- (private.user_plan in 0032/0033/0035/0042, qrewing index.ts store.plan, the client calendar-store read) sees
-- 'plus' with no code change. One transaction, in this order:
-- (a) Trigger first: an after-insert trigger on auth.users adds a 'plus' row for every new user (email, anonymous and
--     guest sign-ins all insert into auth.users), so no user created during the backfill is left without a row.
-- (b) Backfill: every existing auth user gets plan 'plus'. Updates/inserts only; nothing is deleted.
-- (c) DEMO-ONLY set_my_plan: p_plan 'free' is a no-op that keeps 'plus' (the plan-preview / info switch and
--     calendar-store.ts could otherwise flip a judge back to Free). REVERT after the demo by restoring the 0032 body
--     (insert ... values (auth.uid(), p_plan) on conflict do update set plan = excluded.plan).
-- (d) Open (not yet expired) rooms: max_members raised to 30 (the Plus cap). expires_at and the room AI flag are NOT
--     changed; those stay the host's choice. Expired rooms are untouched.
-- Baseline before apply: see the review message (plus/free/no-row counts, open rooms with caps).
-- Revert: drop trigger on_auth_user_created_plus on auth.users; drop function private.handle_new_user_plan();
-- restore set_my_plan from 0032; backfilled rows and raised caps can be set back with an update.

create function private.handle_new_user_plan()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.user_plans (user_id, plan) values (new.id, 'plus')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke execute on function private.handle_new_user_plan() from public, anon, authenticated;

create trigger on_auth_user_created_plus
  after insert on auth.users
  for each row execute function private.handle_new_user_plan();

insert into public.user_plans (user_id, plan)
select u.id, 'plus' from auth.users u
on conflict (user_id) do update set plan = 'plus', updated_at = now()
  where public.user_plans.plan <> 'plus';

create or replace function public.set_my_plan(p_plan text)
returns text
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if p_plan is null or p_plan not in ('free', 'plus') then
    raise exception 'Plan must be free or plus' using errcode = '22023';
  end if;
  -- DEMO-ONLY (0045): always 'plus'; a 'free' request is a no-op. Revert to p_plan after the demo.
  insert into public.user_plans (user_id, plan) values (auth.uid(), 'plus')
  on conflict (user_id) do update set plan = 'plus', updated_at = now()
    where public.user_plans.plan <> 'plus';
  return 'plus';
end;
$$;
revoke execute on function public.set_my_plan(text) from public, anon;
grant execute on function public.set_my_plan(text) to authenticated;

update public.rooms set max_members = 30
where expires_at > now() and max_members < 30;
