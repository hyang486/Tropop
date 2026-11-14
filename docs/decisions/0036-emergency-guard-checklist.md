# Decision checklist: migration 0036 (Emergency status guard)

Status: **NOT APPLIED.** Waiting for the human. Nothing in this page has been run against live project
`wuhkyjksiiqzoxvonfuy`: no pre-check, no dry run, no apply.
Source branch: `ux2-52-emergency-guard` at `cc07110` (supervisor PASS `226dbc9`). It is not on main yet.

## 1. What changes, and why

The migration changes only one function, `public.set_my_status`. It has the same name, arguments and return
type, so the grants from 0002 still apply. It stays `security definer` with `search_path ''`.

| Case | Today (0023) | After 0036 |
|---|---|---|
| Ordinary status while in Emergency | Replaces Emergency and posts "<name> is OK (Emergency resolved) · <label>" | Raises `emergency_active` (PT409). Nothing changes. |
| Emergency while already in Emergency | Opens a second `emergency_events` row and posts a second needs-help line (second alert and push) | No-op. Returns the latest event id. |
| "I'm OK" (`clear_my_status`) | Ends Emergency and posts the resolved line | Unchanged. This is now the only way out. |
| Anything else | n/a | Unchanged. |

Why (UX2-52): Emergency should end only through an explicit "I'm OK". A stray status tap or a double tap
should not silently end the Emergency or send a duplicate alert.

## 2. Apply steps (for the sitting; each step stops on a mismatch)

The SQL comes from `node scripts/emergency-guard-sitting.mjs <step>` on `cc07110`. The script only prints
SQL; it runs nothing.

1. **Pre-check (read-only):**
   - `list_migrations`: the newest entry is `room_ai_plus` (0035, remote `20261114094947`), or `face_index`
     if 0034 was applied since. No entry is named `emergency_status_guard`.
   - Run `pre-check` SQL and confirm:
     - `set_my_status` body is `'0023'`, i.e. md5 `9a4e601ada92eb98a2ba1444e632b830`
     - `prosecdef` is true and `proconfig` is `{search_path=""}`
     - no `tests` schema exists
     - `idle_in_tx` is 0
2. **Dry run:** run `dry-run` SQL. It sets `lock_timeout 3s`, then `BEGIN`, then 0036, then the
   `supabase/tests/emergency_guard_test.sql` assertions, then `ROLLBACK`.
   - Pass means the row `EMERGENCY GUARD TESTS PASSED` appears, then `tests_schema = 0` and body `'0023'`.
   - Any `FAIL: …` means stop.
3. **Apply:** run `apply_migration` with name `emergency_status_guard` and the exact contents of
   `supabase/migrations/20261104000036_emergency_status_guard.sql`. Then run `emergency_guard_test.sql` once
   more on its own; it ends with `ROLLBACK`.
4. Merge `ux2-52-emergency-guard` into main so the repo matches live.

## 3. Post-apply verification

Run `post-check` SQL and confirm:

- body `'0036'`, i.e. md5 `b5dd158d9b7ae0b379c92658367917d8`
- `prosecdef` true and `proconfig` `{search_path=""}`
- `has_function_privilege` on `set_my_status(uuid, uuid)` execute:
  - `authenticated`: true
  - `anon`: false
  - `public`: false
- `tests_schema` is 0
- `get_advisors` (security) shows nothing new compared with the pre-apply baseline
- `list_migrations` now ends with `emergency_status_guard`

Optional device check by qa, on an existing test room only and with no new accounts:

- in Emergency, an ordinary status shows "You're still in Emergency. Tap I'm OK now first."
- "I'm OK now" still posts the resolved line
- a second Emergency tap sends no second alert

## 4. Rollback

Use `supabase/rollback/20261104000036_emergency_status_guard_revert.sql`, on a rollback decision only. It is
not a migration.

- It restores `set_my_status` exactly as written in 0023 (lines 48-94). Its body md5 is
  `9a4e601ada92eb98a2ba1444e632b830`, identical to 0023.
- 0035 does not touch this function.
- It changes no tables or rows, and the grants carry over.
- After rollback, the `pre-check` SQL should read body `'0023'` again.

## 5. Known limits

- **Concurrent first Emergency (unchanged from 0023, accepted):** if the user has no `member_status` row in
  that room yet, `for update` locks nothing. Two Emergency taps at the same instant can then both insert,
  giving two events and two alert lines. After the first row exists, the lock serialises taps.
- The guard covers `set_my_status` only. `clear_my_status` is unchanged.

## 6. Client

Nothing is needed at apply time. Main (`5202692`) already handles the new server behaviour:

- `isEmergencyActiveError` (`mobile/src/lib/emergency-plan.ts`) recognises PT409 + `emergency_active`.
- `setStatus` (`mobile/src/lib/activity.ts`) reloads and shows `en.activity.emergencyActiveError`, so the
  PT409 is not read as "room full".
- The status picker reopens in its Emergency layout.

Before apply, and after a rollback, the server never raises this error, so that code path stays idle. No app
build or update is tied to this decision.
