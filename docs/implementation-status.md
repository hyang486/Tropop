# Implementation status

Updated: 2026-11-04 (America/Los_Angeles). Plan: `docs/plan/implementation-plan.md`.

## Current checkpoint

Checkpoint 1, foundation: PASSED supervisor review (commit b1759ce; see `docs/reviews/current.md`).

Checkpoint 2, schema v1 plus auth: in progress (resumed 2026-11-04 after the maintenance boundary).

- Remote migrations (`list_migrations`, 2026-11-04): `core_schema` (20261104110026), `access_and_rpcs` (20261104111238), `policy_perf_and_fk_indexes` (20261104111915). All three files are in `supabase/migrations/`.
- `access_and_rpcs`: SECURITY DEFINER helpers and trigger functions live in schema `private` (not exposed by the Data API). EXECUTE revoked from `public`/`anon`; public RPCs granted to `authenticated` only. Arrivals dedupe per activity (`activity_seq`), addressing supervisor note P2.
- `policy_perf_and_fk_indexes`: written after the security/performance advisors; policies evaluate `(select auth.uid())` once per statement, foreign-key indexes added, `join_attempts` given a primary key. Apply result `success: true`.
- `supabase/tests/rls_test.sql` (supervisor P1): passed on the remote database (see verification log). Storage tests come with the buckets.
- Human decisions 2026-11-04 (`planning/USER_DECISIONS_2026-11-04_NOTIFICATIONS_EN.md`): real APNs remote push is out of this milestone (demonstration, labeled); AWS Rekognition selected and credentials being prepared by the human (no paid-plan or open-ended spending authorization); Confirm email off for development; stateless CompareFaces does not imply no AWS-retained input images.

### Exact next steps (resume here)

1. Done: advisors re-run after migration 4 (see verification log).
2. Done: migration 4 `storage_buckets` (20261104113431) applied; 10 storage cases added to `supabase/tests/rls_test.sql`.
3. Commit `supabase/`, the plan and this status doc.
4. App auth: `@supabase/supabase-js`, secure session store, host sign up/in/out, guest anonymous start. Then `npx tsc --noEmit` and `npx expo lint`, simulator sign-in evidence, and report checkpoint 2 to supervisor.

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
| Metro connection | `CI=1 npx expo start --dev-client --port 8081`, then `xcrun simctl openurl <udid> 'exp+moment://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'` | "iOS Bundled 1556ms node_modules/expo-router/entry.js (1285 modules)"; screenshot `docs/evidence/checkpoint1-devclient-sim.png` |

## Feature status

| Feature | Status |
|---|---|
| Host accounts / guest entry | backend verified (anonymous sign-in live, RLS test); app screens not started |
| Rooms, QR/code join | not started |
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
