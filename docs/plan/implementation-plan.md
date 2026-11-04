# Implementation plan

Source of truth for product behavior: `planning/APP_CONCEPT_KO.md` (Nov 4 decisions). This file covers the technical design and the order of work. Target date: 2026-11-08 (America/Los_Angeles). Progress lives in `docs/implementation-status.md`.

## Architecture

| Concern | Choice |
|---|---|
| App | Expo SDK 58, React Native 0.88, TypeScript, Expo Router (`mobile/src/app`), CNG (no committed `ios/`), expo-dev-client |
| Backend | Supabase project `wuhkyjksiiqzoxvonfuy` ("hyang486's Project", us-east-2). SQL migrations in `supabase/migrations/` |
| Host identity | Supabase Auth email/password (non-anonymous user). Only hosts create rooms |
| Guest identity | Supabase anonymous sign-in. This gives a real `auth.uid()`, so RLS treats guests as authenticated. They are never public |
| Access control | RLS on every table. `is_active_member(room_id)` checks: membership not left, room not deleted, `now() < expires_at`. The check is enforced on read, not at cleanup time |
| Joining | RPC `join_room(code \| token)` (security definer). Uses a 5-digit code unique among active rooms plus a long QR token, with per-user attempt rate limiting |
| Chat | `messages` table plus Supabase Realtime `postgres_changes` (RLS-filtered) |
| Media | Private bucket `room-media`. Paths: `{room_id}/{media_id}/original.<ext>` and `.../preview.jpg`. Storage RLS uses the path's room id. Originals are uploaded with progress via `expo-file-system` upload to a signed upload URL. Previews are a client-generated JPEG (images: `expo-image-manipulator`; videos: `expo-video-thumbnails`). Downloads use short-lived signed URLs, then `expo-media-library` save / share sheet |
| Expiry and deletion | `pg_cron` runs Edge Function `room-janitor` every minute. It deletes Storage objects via the Storage API, records failures in `cleanup_jobs` and retries, then deletes rows. Access is already denied by `expires_at` |
| 24h reminder | `room-janitor` also sends reminders, keyed by `(room_id, user_id, expires_at_version)`. Changing expiry bumps the version. Members who left are excluded |
| Notifications | Human decision 2026-11-04 (`planning/USER_DECISIONS_2026-11-04_NOTIFICATIONS_EN.md`): no paid Apple Developer Program this milestone, so real iOS APNs remote delivery is out of the completion criteria. Real room events drive realtime in-app alerts (banner/full-screen, sound/haptics where supported) and `expo-notifications` local notifications where verified. Config plugin uses `enableRemoteNotifications: false` (verify against SDK 58 docs) so no APNs entitlement is added. Any remote-delivery demonstration is labeled as a demonstration and never claimed as background delivery. `push_tokens` and an Expo push sender stay as a follow-up path |
| Face matching | Edge Function `face-match` calls AWS Rekognition `CompareFaces` (no Rekognition face collection is created, so there is no collection record to delete). Statelessness does **not** mean AWS keeps no input images: AWS documents that submitted images may be stored and used for service improvement unless an AI-services opt-out policy applies. Before any real participant image is sent, confirm the effective opt-out and retention; do not claim provider-side deletion from statelessness alone. Provider selected by the human (AWS Rekognition); credentials are being prepared by the human and stored only as Edge Function secrets. No paid-plan/Organizations creation or open-ended spending is authorized. The reference image is stored in private bucket `face-refs/{room_id}/{user_id}/...`, separate from the gallery. `face_jobs` rows carry the `enrollment_id`; a result is written only if that enrollment still exists (late-result guard). Leave/expiry/delete removes the reference object, enrollment, matches and jobs |
| Location | `expo-location` foreground `watchPositionAsync` only while all six conditions hold (spec section 4). Stores latest position only in `live_presence`. Rejected server-side by RLS/trigger if any server-checkable condition fails. Map: `react-native-maps` (Apple Maps, no key). Route drawn by host pen gesture, stored as coordinate array |
| Arrival | RPC `mark_arrived(room_id)`, idempotent per member, plus a system chat message |
| Status / Emergency | `status_definitions` (Emergency is built in and cannot be deleted) and `member_status`. Emergency inserts `emergency_events`. In-app full-screen alert plus haptics for realtime subscribers; local notification where verified. No claim of locked/background delivery to other members without remote push |
| Plans | Static preview screens labeled "Preview — no purchase is made" |

## Sequence and completion checks

1. **Foundation**: git, `mobile/` scaffold, native iOS dev build on simulator, CLAUDE.md, status doc. Check: `expo run:ios` succeeds, app connects to Metro, tsc and lint pass.
2. **Schema v1 + auth**: migrations for rooms, members, invites, messages, media, statuses, arrivals, presence, reminders, face tables, cleanup jobs, and RLS. Host sign up/in/out/delete, guest anonymous start, profile name/photo. Check: SQL tests of RLS as host, guest, and non-member via `execute_sql` with `set role` and JWT claims. App sign-in on the simulator.
3. **Rooms + joining**: create room (name, type, expiry, location allowed, statuses), invite QR plus code, join by code or scan (`expo-camera`), deep link `moment://join/<token>`, room list, remaining-time header, leave room. Check: two simulator users (host and guest) join the same room.
4. **Chat (realtime)**. Check: messages appear on the second client without a refresh.
5. **Media**: photo, video and file pick, upload with progress, retry, preview grid, All/Mine/Others filter, viewer, video playback (`expo-video`), Download original. Check: object present in Storage, download byte size equals original.
6. **Expiry and deletion + 24h reminder** (`room-janitor`, `pg_cron`). Check: a short-expiry room is denied at `expires_at` and its Storage objects are gone after the job (verified with `storage.objects` count). Reminder rows are not duplicated, and re-versioned on expiry change.
7. **Arrival + statuses + Emergency + notifications**. Check: arrival dedup; in-app emergency alert on the second client; local notification shown where verified. Real APNs delivery is out of scope for this milestone (demonstration only, labeled).
8. **Location + route + speed**. Check: simulated location on simulator A appears on B. Stale marking. Transmission stops when any condition is dropped.
9. **Face matching**. Check: real Rekognition results on test photos, recorded. Cleanup on leave/expiry; the late-result guard is tested.
10. **Plan preview, account deletion, polish, docs.**

## Human-only dependencies (tracked in status doc)

- Supabase dashboard: Anonymous sign-ins enabled and Confirm email turned off for development (human decision 2026-11-04; both verified via `/auth/v1/settings`).
- Real remote push (EAS login, Apple Developer Program, APNs) is out of this milestone by human decision; it does not block local development.
- A physical iPhone for device checks (optional; simulator is the default).
- Face API: AWS Rekognition selected; the human is preparing credentials with Rekognition access (Edge Function secrets, never in git or the app bundle). Confirm the AI-services opt-out/retention before real participant images. No paid-plan or open-ended spending authorization.
