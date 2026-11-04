# Implementation status

Updated: 2026-11-04 (America/Los_Angeles). Plan: `docs/plan/implementation-plan.md`.

## Current checkpoint

Checkpoint 1, foundation: PASSED supervisor review (commit b1759ce; see `docs/reviews/current.md`).

Checkpoint 2, schema v1 plus auth: PASSED supervisor review with one required security fix (F1), addressed in checkpoint 3 below. Commits fc0f1c2, b8101b6, 06e9552.

Checkpoint 3a, review fixes (2026-11-04): PASSED supervisor re-review (F1, F2). Uncommitted until the human approves a commit.
Supervisor note N4 (for the rooms client): "This room is full." and the throttle both use errcode 54000; distinguish them (distinct codes or message mapping) and map `null` to the invalid-invite copy.
Next: checkpoint 3b, rooms UI. Review evidence wanted: host creates a room; a guest on a second simulator joins by code and by QR/deep link; both see the room; remaining-time header and leave work; client handling of an invalid code and of the throttle.

Checkpoint 3b, rooms and joining (in progress, 2026-11-04):

- Supervisor N4 addressed server-side: migration `supabase/migrations/20261104000006_distinct_join_errcodes.sql`, remote `distinct_join_errcodes` (20261104121316). Throttle raises `PT429` (HTTP 429), full room `PT409` (HTTP 409); invalid/ended/expired invite still returns `null` (join) or no row (preview). `rls_test.sql` adds `expect_sqlstate` cases for both codes.
- Full `rls_test.sql` run after migration 6: NOT RUN. The `execute_sql` confirmation expired twice without an answer; waiting on the human. Leftover-state check before it (read-only): `tests` schema 0, `a0000000-…` users 0, rooms 0, join_attempts 0, storage.objects 0, auth.users 2 (the pending QA accounts).
- Client (code written; tsc and lint exit 0; simulator evidence pending): `mobile/src/lib/rooms.ts` (RPC wrappers, `PT429`/`PT409`/`null` mapped to fixed copy, invite parsing), `src/lib/pending-invite.ts` (QR invite kept through guest start/host auth), screens `index` (room list, remaining time, Join/Create), `create-room` (name, type, expiry presets up to 7 days, location allowed, statuses), `join/index` (5-digit code), `scan` (`expo-camera` QR scanner), `join/[token]` (deep link `moment://join/<token>`, unguarded), `preview` (room preview and confirm join), `room/[id]/index` (remaining-time header, 24h banner, members, Leave / End room), `room/[id]/invite` (QR via `qrcode` 1.5.4 core encoder + `react-native-svg`, code, share sheet). `expo-camera` ~58.0.14 config plugin: camera permission text, microphone off.

- 2026-11-04 resume: two stray Expo-template copies (`src/app/_layout 2.tsx`, `src/app/index 2.tsx`, untracked, 02:54, likely a Finder/iCloud duplicate) broke `tsc` (TS2307) and would register as routes. Moved out of the repo to the session scratchpad (not deleted). After: `npx tsc --noEmit` exit 0, `npx expo lint` exit 0. Simulator shows the welcome screen with Metro on 8081.
- Simulator UI driving unblocked 2026-11-04 (human re-allowed `agent-device@0.21.36`). Evidence below.
- F1 (`join_room` throttle never triggered): the failed attempt was inserted and then the function raised, which rolled the insert back. `join_room` now records the failure and returns `null` for an invalid/ended/expired invite; the 11th failure in 10 minutes raises "Too many attempts. Try again in a few minutes." (54000), and the block also applies to valid codes. The room client must map `null` to "This invite is invalid or the room has ended." (no client caller exists yet; rooms UI is next).
- `profiles.updated_at` (and `face_jobs.updated_at`) are bumped by a `before update` trigger (`private.set_updated_at`, EXECUTE revoked).
- Migration `supabase/migrations/20261104000005_join_throttle_and_updated_at.sql`, remote `join_throttle_and_updated_at` (20261104120758).
- `supabase/tests/rls_test.sql`: invalid joins now expect `null`; new cases for 10 persisted failures, 11th throttled, valid code blocked while throttled, per-user isolation of the throttle, and `updated_at` bump.
- Back button label: `welcome` now has `title: en.appName` (tsc/lint pass; simulator check pending). Still open: dev-client gear overlaps the Profile header button (dev build only).

Earlier checkpoint 2 notes:

- Remote migrations (`list_migrations`, 2026-11-04): `core_schema` (20261104110026), `access_and_rpcs` (20261104111238), `policy_perf_and_fk_indexes` (20261104111915). All three files are in `supabase/migrations/`.
- `access_and_rpcs`: SECURITY DEFINER helpers and trigger functions live in schema `private` (not exposed by the Data API). EXECUTE revoked from `public`/`anon`; public RPCs granted to `authenticated` only. Arrivals dedupe per activity (`activity_seq`), addressing supervisor note P2.
- `policy_perf_and_fk_indexes`: written after the security/performance advisors; policies evaluate `(select auth.uid())` once per statement, foreign-key indexes added, `join_attempts` given a primary key. Apply result `success: true`.
- `supabase/tests/rls_test.sql` (supervisor P1): passed on the remote database (see verification log). Storage tests come with the buckets.
- Human decisions 2026-11-04 (`planning/USER_DECISIONS_2026-11-04_NOTIFICATIONS_EN.md`): real APNs remote push is out of this milestone (demonstration, labeled); AWS Rekognition selected and credentials being prepared by the human (no paid-plan or open-ended spending authorization); Confirm email off for development; stateless CompareFaces does not imply no AWS-retained input images.

Checkpoint 3c, supervisor findings F5/N5/N6 (2026-11-04): VERIFIED.
- F5: migration `20261104000007_rotate_invite.sql`, remote `rotate_invite` applied (`success: true`). Host-only `rotate_invite(room_id)` issues a new unique code and token. Invite screen has "Reissue invite" with confirmation. `rls_test.sql` adds guest-denied, host-ok, and captured old code/token compared against the new ones: old code and token preview 0 rows and `join_room` returns null; new code and new token each preview 1 row; a non-member (Q) joins with the new code.
  - Full `rls_test.sql` after migration 7: PASSED (`RLS TESTS PASSED`, 2026-11-04, run by the developer session via `execute_sql`; the human also re-ran it with the same result). Afterwards: `tests` schema 0.
  - Simulator (iPhone 17 Pro, live Supabase, `agent-device@0.21.36`): host "QA Host 3c" created room "QA Reissue 3c", code 67339 (`docs/evidence/checkpoint3c-invite-before.png`) → Reissue invite → confirm dialog (`-reissue-confirm.png`) → screen shows code 59444 (`-invite-after.png`); server `rooms.code` 59444 and `invite_token` changed. Guest "QA Guest 3c": old code 67339 → "This invite is invalid or the room has ended." (`-old-code-invalid.png`); old link `moment://join/<old token>` → same message (`-old-link-invalid.png`); new link → preview "1 of 30 members" (`-new-link-preview.png`); new code 59444 → preview → Join → room lists host + guest (`-new-code-joined.png`). Server: 2 members; join_attempts for the guest = 2 failed + 1 succeeded (matches the two rejected old-invite tries).
  - Note: the running Metro served stale JS (the app showed the pre-N5 "Deleted at" copy and no Reissue button although the files and a fresh `curl` of the bundle were current). Restarting Metro with `--clear` fixed it. If the UI looks older than the source, restart Metro before debugging.
- N5: room header "Ends <time>" seen on the simulator (`docs/evidence/checkpoint3c-room-ends.png`). N6: `preview` with neither code nor token shows the invalid-invite copy without an RPC call (code review only; no UI route reaches it with both empty). `tsc` and `expo lint` exit 0.
- QA cleanup (exact id/email): 3b fixtures deleted by the supervisor session with human authorization (room 4078211f-…, host 45518f1a-… / moment-qa-rooms-20261104@example.com, guests ce6f848f-…, a8569014-…). 3c fixtures deleted by the developer: room 0e199b2f-587b-43d7-97b6-8b393cb0eed2, host 4a3ac246-c3d2-425b-b53c-41e2f853fd67 / moment-qa-reissue-20261104@example.com, anonymous guest 6cf42bbe-f964-446f-8d3a-83bbbccdb951, and their 3 join_attempts. Recheck: rooms, room_members, auth.users, profiles, join_attempts all 0. `cleanup_jobs` has 4 rows (room-media and face-refs prefixes for the two deleted rooms); they wait for the cleanup worker (expiry checkpoint).
- Still open: dev-client gear button covers the room header "Invite" button (dev build only); the guest simulator session now points at a deleted user.
- F1b (anonymous throttle bypass): next, per the supervisor's F1b design in `docs/reviews/current.md`.

### Exact next steps (resume here)

1. Done: advisors re-run after migration 4 (see verification log).
2. Done: migration 4 `storage_buckets` (20261104113431) applied; 10 storage cases added to `supabase/tests/rls_test.sql`.
3. Done: committed as fc0f1c2.
4. App auth (code written, simulator evidence pending): `@supabase/supabase-js` 2.118.0 (pinned) with an encrypted session store (`mobile/src/lib/supabase.ts`: AES key in SecureStore, ciphertext in AsyncStorage, per the Supabase Expo guide), `AuthProvider` (`mobile/src/lib/auth.tsx`), protected routes in `mobile/src/app/_layout.tsx`, screens `welcome`, `guest`, `sign-in`, `sign-up`, `upgrade` (guest to host, same user id), `index` (Rooms placeholder), `profile` (name edit, account type, log out). UI copy in `mobile/src/i18n/en.ts`. DB types generated to `mobile/src/lib/database.types.ts`. Client env in ignored `mobile/.env.local`; template `mobile/.env.example`.
   Remaining: simulator evidence for guest start, host sign-up/in/out, guest upgrade; then report checkpoint 2 to supervisor.
   Deferred to later checkpoints: profile photo (needs an avatar storage path), account deletion (step 10, needs a server-side function), invite-preserving return after host auth (checkpoint 3).

## Environment facts (verified)

- Node v24.22.2, npm 11.19.1, Xcode 27.2 (27B52), CocoaPods 1.17.0 (installed via Homebrew 2026-11-04), iOS 26.5 simulators.
- Expo SDK 58.0.23 (npm `latest` tag, matching the SDK 58 template), React Native 0.88.1, React 19.3.0, TypeScript ~6.0.3, Expo Router ~58.0.30, expo-dev-client ~58.0.18.
- Bundle ID / Android package: `com.iyaproject.moment`. URL scheme: `moment`. Display name "Moment" (working name).
- Supabase: one project, `wuhkyjksiiqzoxvonfuy` ("hyang486's Project", us-east-2, Postgres 17). It was empty at inspection (no public tables, no migrations, no buckets).
- Supabase auth settings (from `/auth/v1/settings`, re-checked 2026-11-04 after the human's report): `external.anonymous_users: true`, `mailer_autoconfirm: true` (Confirm email off, the development setting the human selected).
- EAS CLI: `npx eas-cli@latest whoami` prints "Not logged in". No EAS project is linked.
- The `supabase` CLI binary at /opt/homebrew/bin/supabase exits with 137 in this session. Use the Supabase MCP tools instead.
- No physical iOS device is connected (`xcrun devicectl list devices` shows simulators only).

## Verification log

| Check | Command | Result |
|---|---|---|
| No nested repo | `find . -name .git -not -path ./.git` | none |
| Typecheck | `cd mobile && npx tsc --noEmit` | exit 0 |
| Lint | `cd mobile && npx expo lint` | exit 0 (eslint 9, eslint-config-expo 58) |
| iOS dev build | `cd mobile && CI=1 npx expo run:ios --device 20541309-C36F-4864-94CA-D8A341F70EEB --no-bundler` | exit 0; "Build Succeeded, 0 error(s), 2 warning(s)"; installed and opened on iPhone 17 Pro (iOS 26.5) |
| RLS/RPC permission test | Supabase MCP `execute_sql` with `supabase/tests/rls_test.sql` (one transaction, ends in ROLLBACK) | `RLS TESTS PASSED`; follow-up query: `tests` schema 0, test users 0, rooms 0, cleanup_jobs 0 (rollback clean) |
| Guest anonymous sign-in (live) | `POST /auth/v1/signup` with `{}` and the publishable key, then REST as that user | session issued, `is_anonymous: true`; `preview_room('00000')` → `[]`; `GET rooms` → `[]`; `rpc/create_room` → 42501 "Host account required". The 2 test users were deleted afterwards |
| RLS test incl. storage (after migration 4) | `execute_sql` with full `supabase/tests/rls_test.sql` (ROLLBACK) | `RLS TESTS PASSED` |
| Leftover state (2026-11-04 after migration 4) | `execute_sql` counts | `tests` schema 0, auth.users 0, rooms 0, storage.objects 0; buckets `room-media` (private, no limit) and `face-refs` (private, 10 MB, jpeg/png/heic/heif/webp) |
| Advisors after migration 4 | `get_advisors` security + performance | No ERROR. WARN `authenticated_security_definer_function_executable` x19 (intended public RPCs, each checks membership/role inside); WARN `auth_allow_anonymous_sign_ins` on member-scoped tables and storage (intended: guests are anonymous users, policies require membership); INFO `rls_enabled_no_policy` on `cleanup_jobs`, `expiry_reminders`, `join_attempts` (service-only, deny by default); INFO 4 unused indexes (empty database) |
| Guest to host upgrade (live probe, 2026-11-04) | `POST /auth/v1/signup` `{}` then `PUT /auth/v1/user` with email+password, refresh, password sign-in | update returned `is_anonymous: false` with `email_confirmed_at` set; refreshed JWT `is_anonymous: false`; password sign-in ok. Probe user deleted by exact UUID+email afterwards (count 0) |
| Typecheck + lint after auth code | `npx tsc --noEmit`; `npx expo lint` | exit 0; no lint problems |
| Dev build with auth modules | `CI=1 npx expo run:ios --device 20541309-C36F-4864-94CA-D8A341F70EEB --no-bundler` | "Build Succeeded"; installed and opened; Metro "iOS Bundled 631ms (1356 modules)"; signed-out launch redirected to `/welcome` (screenshot `docs/evidence/checkpoint2-welcome-sim.png`) |
| Simulator auth flows (2026-11-04, human approved `agent-device@0.21.36`) | `npx -y agent-device@0.21.36` open/fill/press on iPhone 17 Pro sim, live Supabase; server checks via `execute_sql` | All passed. Guest start "QA Guest" → Rooms "Signed in as QA Guest (Guest)" (`docs/evidence/checkpoint2-guest-rooms.png`). Profile rename → button "Saved", name persisted. Upgrade with `moment-qa-upgrade-20261104@example.com` → Profile "Host · <email>" (`checkpoint2-upgraded-profile.png`); server: same user id `97f3ae37-…`, `is_anonymous=false`, confirmed, display_name "QA Guest Renamed". Log out → welcome. Log in with wrong password → "Invalid login credentials"; empty password → "Enter an email and password."; correct password → Rooms "(Host)". Cold relaunch (`open --relaunch`) → still signed in (session store restore). Sign-up `moment-qa-signup-20261104@example.com` "QA Host" → Rooms "Signed in as QA Host (Host)" (`checkpoint2-host-signup-rooms.png`); server: `7ccf6fd9-…`, not anonymous, confirmed. Final log out → welcome |
| QA user cleanup | `delete from auth.users ... returning` by exact UUID+email, run by the supervisor session with human authorization, for `97f3ae37-75cc-4107-92b0-09d97a5c29fe` / `moment-qa-upgrade-20261104@example.com` and `7ccf6fd9-f017-4435-a89f-3c91a1c4cd1d` / `moment-qa-signup-20261104@example.com` | done: both rows returned; supervisor recheck auth.users 0, profiles 0; developer re-check (select from auth.users) showed neither id present |
| RLS test after migration 5 (checkpoint 3) | `execute_sql` with full `supabase/tests/rls_test.sql` (ROLLBACK) | `RLS TESTS PASSED`, including throttle and `updated_at` cases |
| RLS test after migration 6 (checkpoint 3b, human approved 2026-11-04) | `execute_sql` with full `supabase/tests/rls_test.sql` (ROLLBACK) | `RLS TESTS PASSED` incl. PT429/PT409 cases; follow-up counts: `tests` schema 0, `a0000000-…` users 0, rooms 0, join_attempts 0, storage.objects 0 |
| Leftover state after checkpoint 3 run | `execute_sql` counts | `tests` schema 0, `a0000000-…` users 0, rooms/members/messages/join_attempts/storage.objects 0; both `*_set_updated_at` triggers present; auth.users 2 (the two pending QA accounts) |
| Security advisors after migration 5 | `get_advisors` security | No ERROR, no new finding from migration 5. Same intended WARN/INFO as after migration 4, plus WARN `auth_leaked_password_protection` (Auth dashboard setting; human decision) |
| Rooms 3b simulator flows (2026-11-04, one iPhone 17 Pro sim, sequential accounts, live Supabase) | `agent-device@0.21.36` + `xcrun simctl openurl`; server checks via `execute_sql` | PASSED: host sign-up "QA Host 3b" → Create room (1 day) → Invite screen QR + code 71878 matching `rooms.code`, 1 member (`checkpoint3b-invite-host.png`, `-room-host.png`: countdown, 24h banner, member list). Guest (anonymous) sees no Create button. Invalid code 00000 → "This invite is invalid or the room has ended." (`-invalid-code.png`). Valid code → preview "1 of 30 members" (`-preview-guest.png`) → Join → room lists host + guest (`-room-guest.png`); server shows 2 members. Leave (confirm dialog) → Rooms empty; rejoin via deep link `moment://join/<token>` → preview shows 1 of 30 (leave took effect) → Join ok. Signed-out deep link → welcome; Continue as guest → preview of the invited room (pending invite kept). Host log in → room lists 2 members; End room for everyone (confirm) → room gone from list; `rooms.deleted_at` set; invite link and code now show the invalid-invite message. Throttle: repeated invalid codes → "Too many attempts. Try again in a few minutes." from the 10th failure on (the earlier failures of this user count; `-throttle.png`) |
| Metro connection | `CI=1 npx expo start --dev-client --port 8081`, then `xcrun simctl openurl <udid> 'exp+moment://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'` | "iOS Bundled 1556ms node_modules/expo-router/entry.js (1285 modules)"; screenshot `docs/evidence/checkpoint1-devclient-sim.png` |

## Feature status

| Feature | Status |
|---|---|
| Host accounts / guest entry | verified on simulator against live backend: guest start, host sign-up/log-in/log-out, guest→host upgrade (same user id), profile rename, session restore after relaunch. Open findings: (1) fixed in checkpoint 3: `profiles.updated_at` trigger; (2) stack back button on guest/sign-in/sign-up shows the route name "welcome" — set a proper back title; (3) dev-client floating gear button overlaps the Rooms "Profile" header button after a cold relaunch (dev build only; not in release). iOS "Use Strong Password?" sheet on new-password fields is expected system behavior |
| Rooms, QR/code join | verified on simulator against live backend (code, deep link, pending invite, leave, end room, invalid/ended/throttle messages); two accounts used sequentially on one simulator (no second simulator running at once). NOT verified: camera QR scan (no camera in simulator; token path covered by deep link), full-room message in the UI (PT409 covered by RLS test only), share sheet contents, physical device. Open UX notes: Invite sheet has no Done button (swipe down only); end room only sets `deleted_at`, actual storage/data deletion belongs to the expiry cleanup checkpoint |
| Chat | not started |
| Media upload/download, filters | not started |
| Expiry deletion, 24h reminder | not started |
| Arrival, statuses, Emergency | not started |
| Notifications | in-app alerts + local notifications planned; real APNs remote push out of this milestone (human decision 2026-11-04, demonstration only) |
| Location, route, speed | not started |
| Face matching | AWS Rekognition selected; live results wait for the human's credentials and the AI-services opt-out/retention review before real participant images |
| Plan preview | not started |

## Human-only blockers

1. Face API: AWS credentials with `rekognition:CompareFaces` (human is preparing them; set as Edge Function secrets, never in chat or the app), and the effective AI-services opt-out/retention confirmed before real participant images.
2. Anonymous sign-ins (enabled) and Confirm email (off) are resolved and verified; no longer blockers.
3. A physical iPhone for device checks (optional). Apple Developer Program, APNs and EAS login are not needed for this milestone (human decision 2026-11-04).

## Not yet tested

Multi-user behavior, push, physical device, and all product features.
