-- Demo: every account is Plus (human order 2026-11-15 ~10:30 via qa/supervisor: judges try all AI features on the
-- deployed demo without a paywall). public.user_plans stays the single source of truth, so every existing gate
-- (private.user_plan in 0032/0033/0035/0042, qrewing index.ts store.plan, the client calendar-store read) sees
-- 'plus' with no code change.
-- (a) Backfill: every existing auth user gets plan 'plus'. Updates/inserts only; nothing is deleted.
-- (b) New users: an after-insert trigger on auth.users adds a 'plus' row (judges who sign up or start as guests).
-- set_my_plan is unchanged, so the Plus preview switch can still turn an account back to 'free'.
-- Baseline before apply (2026-11-15): 13 users, 2 plus, 1 free, 10 without a row.
-- Revert: drop trigger on_auth_user_created_plus on auth.users; drop function private.handle_new_user_plan();
-- the backfilled rows can be set back with set_my_plan or an update.

insert into public.user_plans (user_id, plan)
select u.id, 'plus' from auth.users u
on conflict (user_id) do update set plan = 'plus', updated_at = now()
  where public.user_plans.plan <> 'plus';

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
