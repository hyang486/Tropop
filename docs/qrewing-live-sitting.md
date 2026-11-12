# Qrewing AI live sitting (one batched human session)

Owner: developer. For qa and the human. Spec: `planning/QREWING_AI_SPEC_EN.md` sections 1, 2.4, 5, 7.1 and 8 (item 5).
Project: `wuhkyjksiiqzoxvonfuy`. Branch: `qrewing-backend`. Everything below needs the human's go-ahead for the sitting
(USER_DECISIONS 2026-11-12: live apply/deploy is held for the human). No step needs `ANTHROPIC_API_KEY`. Without it the
function returns 503 for every AI call, so nothing here makes a model call or costs anything.

Stop rule: if any step fails or shows something unexpected, stop. Make no further live change, and report the step and its
output to the developer and qa. If a confirm prompt that should appear does not, ask the human through qa first.

## 0. Pre-checks (read-only)

1. `list_migrations`: the newest remote migration is `room_place_and_time` (0026, remote 20261109230223), and nothing named `qrewing_ai` exists.
2. Drift check. The live bodies that 0027 replaces must equal the repo bodies (0002 `end_room`, 0018 `broadcast_room_change`):
   ```sql
   select p.proname, md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where (n.nspname, p.proname) in (('public', 'end_room'), ('private', 'broadcast_room_change'));
   ```
   Compare the result with `md5` of the `$$ … $$` bodies in the two repo files. The developer computes these on request.
   On a mismatch, stop.
3. Cron before:
   `select jobid, jobname, schedule, command, active from cron.job where jobname = 'room-janitor';`
   Expected: one row, `*/15 * * * *`, `select private.invoke_janitor()`.
4. Baseline security advisors (`get_advisors` security). Save the counts for step 6.

## 1. Dry run (rollback test, lock_timeout first)

- Build the SQL: `node scripts/qrewing-dry-run.mjs > <scratch>/qrewing_dry_run.sql`. This is the test file with migration
  0027 pasted right after `set local lock_timeout = '3s'`, so the DDL rolls back together with the test data.
- Run it with `execute_sql`. Pass means the row `QREWING AI TESTS PASSED`, and the statement after the ROLLBACK returns
  `leftovers = 0`.
- Section 7b checks the grace behavior, the recap-only broadcast and receive, and that the cron job reads `*/5 * * * *`
  inside the transaction.
- A failure inside the test (`FAIL: …`) rolls everything back. Fix it on the branch, have it reviewed, then rerun. Do not
  apply.
- Known risk: the 7b broadcast check needs `realtime.send` to be able to write today's `realtime.messages` partition. If
  only that check fails, report it. Do not work around it live.

## 2. Apply 0027

- `apply_migration` with name `qrewing_ai` and the exact contents of `supabase/migrations/20261104000027_qrewing_ai.sql`.
- Then run the test file alone (`supabase/tests/qrewing_ai_test.sql`, no migration pasted). It must pass again and end
  with leftovers 0.
- Then run step 0.3 again. Expected: the same jobid, `*/5 * * * *`, the same command, active, and one row only.

## 3. Deploy the Edge Functions (verify_jwt = false; the JWT check is inside the function)

- Before deploying, run `node --test supabase/functions/qrewing/qrewing.test.ts supabase/functions/room-janitor/janitor.test.ts`.
  All must pass.
- `qrewing` (new): deploy `index.ts`, `core.ts` and `prompts.ts`, not the test file. verify_jwt false.
- `room-janitor` (update): deploy `index.ts`, `core.ts` and `../_shared/detect.ts` (the same layout as the FM-Q ②
  deploy). verify_jwt false.
- `list_edge_functions`: both must be ACTIVE with verify_jwt false. room-janitor's version goes up by one.

## 4. Smoke calls without a key (no model call possible)

- `GET  /functions/v1/qrewing` → 405.
- `POST /functions/v1/qrewing` with no Authorization header → 401 `unauthorized`.
- Optional: `POST {action:'probe'}` with a signed-in simulator user's JWT → 503 `ai_not_configured`. Do not create a new
  account for this (human rule: ask before creating any live account). Skip it if no existing session token is at hand.
- Wait for the next `*/5` run, then check room-janitor:
  ```sql
  select * from private.janitor_health() limit 3;
  ```
  The newest run must be `ok` (HTTP 200). `get_logs` for edge-function room-janitor must show no error line.

## 5. Cron check

- `select jobname, schedule from cron.job where jobname = 'room-janitor';` → `*/5 * * * *`, one row.
- `select status, start_time from cron.job_run_details where jobid = <jobid> order by start_time desc limit 3;`
  The runs must be about 5 minutes apart and `succeeded`.

## 6. After

- Run the security advisors again. The counts must match step 0.4, apart from the definer WARN entries for the new
  security-definer functions `private.is_grace_member` and the four `public` RPCs. List any difference.
- Regenerate the types (pasteable step):
  1. `generate_typescript_types` for project `wuhkyjksiiqzoxvonfuy`.
  2. Write the result to `mobile/src/lib/database.types.ts`, keeping the file's existing header and hand-kept parts. Last
     time the `preview_room` place fields were kept (see `docs/implementation-status.md`). Check that the diff adds
     `rooms.grace_until`, the six `qrewing`/`entry`/`triage`/`recap`/`match` tables with `room_recaps.refreshed_at`, and
     the RPCs `set_qrewing_room`, `set_qrewing_member` and `upsert_entry_profile`. Nothing else should change.
  3. In `mobile/`, `npx tsc --noEmit` and `npx expo lint` must both be clean. Commit on `qrewing-backend`, then hand the
     file to developer-event and developer-pace (queue item 6).
- Record every step's time and output in `docs/implementation-status.md` (developer).

## Rollback (only if 0027 must be undone after apply; human decision)

There is no automatic down migration. It would mean the following: restore `end_room` (0002 body) and
`broadcast_room_change` (0018 body); drop the seven grace policies and `room_topic_receive_grace`; drop
`private.is_grace_member`; drop the Qrewing tables, functions and trigger; drop `rooms.grace_until`; and run
`cron.schedule('room-janitor', '*/15 * * * *', 'select private.invoke_janitor()')`. The developer writes it as its own
reviewed file if it is ever needed.
