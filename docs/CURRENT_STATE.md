# Current state — short resume point

Confirmed human decisions: planning/USER_DECISIONS_2026-11-04_OPERATIONS_EN.md (check it before asking
the human anything again). Delivery agreement: planning/48H_DRAFT_PROPOSAL_EN.md (approved November 4;
full requirements in scope). The developer owns this file. History: docs/implementation-status.md;
reviews: docs/reviews/current.md (supervisor-owned). Read them on demand.

## Verified
- Host auth, guest entry, room create/invite/join/leave/end: simulator evidence (implementation-status.md).
- Chat: backend, realtime, access and paging verified. On simulators: two-way messages PASS (human-confirmed);
  U1 header/banner fix PASS on the 17 Pro with the keyboard closed. U3 stale-session check: npm test PASS, and
  the deleted-account path is live PASS.
- Expiry worker room-janitor v2: live runs PASS. pg_cron job `room-janitor` is active (*/15); its last run
  (2026-11-05 06:00Z) succeeded.
- Room events (S1, migration 0017, live): private Broadcast `room:<id>`, members only, payload {table, op, id},
  clients refetch through RLS; no postgres_changes in mobile/src. DB test PASS. Live two-session check PASS
  (host and guest received all events; the outsider was Unauthorized, with 0 events and 0 rows). Supervisor accepted
  S1/N17. N19 (a member who just left gets id-only notices until channel auth refreshes) is an accepted risk.
- N18 (migration 0018, live): broadcast only while the room is live; a janitor cascade sends nothing; the
  end_room/expiry transition is still sent. Test dry run PASS. Supervisor accepted it.
- Arrival/status/Emergency (0016, activity.ts, room-activity.tsx): server path live PASS through S1.

## Not yet verified
- Media on a device: photo upload → download → save is a byte-exact PASS (run 2); the remaining items are in Active task. DB tests and full RLS PASS.
- Activity UI (Arrived, status sheet, Emergency banner/ack) on the simulator; chat keyboard-open layout
  and checklist steps 5–10.
- Face matching: scaffolding plus F8–F10 committed; no live AWS CompareFaces result (needs rights-cleared photos).
  AWS secrets are already in Supabase Secrets; do NOT ask for them again.
- Expiry reminders (R3): server 0019 live (981398b, cron active); client committed fa7ff6d (supervisor accepted
  the design; npm test 22/22, tsc and lint clean; built on both sims). NOT verified on device: the local reminder
  firing, the tap opening the room, the tap on an ended room showing the gone screen (§72). Test: a room expiring in
  about 24 h + 3 min, so the reminder fires about 3 min later on both sims.
- Map/route/speed, final account/plan flows: not accepted as working features.
- Sports/location client lib committed 220e8c6 (supervisor accepted; npm test 33/33, tsc/lint clean). Map/room UI
  not written yet. 2026-11-05 device blocker "Cannot find native module ExpoLocation" (old dev client + new JS):
  fixed by `expo prebuild --platform ios --clean` (removed stray "Moment 2"/"Podfile 2" duplicates; pods now include
  ExpoLocation 58.0.20, ExpoMaps 58.0.11) and one `expo run:ios --no-bundler` build (0 errors) on the 17 Pro, the same
  .app installed over the existing app on the 17 (data kept). Launch PASS on both at 13:59 PST: Rooms screen, no
  red box, sessions kept (17 Pro guest "Test joiner", 17 host "Test", room "QA verification" listed). Evidence:
  docs/evidence/2026-11-05-rebuild-location-launch-{17pro,17}.png. C2 Info.plist: NSLocationWhenInUseUsageDescription
  present; no NSLocationAlways*/NSMotion keys; no UIBackgroundModes key. Gap: expo-maps on Android needs a Google
  Maps API key (Android is follow-up, C6).
- Map UI (uncommitted, awaiting review): room/[id]/map.tsx (Apple map, presence markers, route polyline, host allow
  toggle + Start/End activity + tap-point route editor, own share toggle with permission first (C1), member list where
  stale rows show "Location stale · age" and no speed (C4)); "Map" header link when location is allowed or for the host.
  tsc/lint clean. Render only: host 17 opened via moment://room/<94673 id>/map shows the idle screen
  (docs/evidence/2026-11-05-map-host-17-idle.png). Simulated locations set: 17 Pro 37.7694,-122.4862; 17 37.7700,-122.4848.
  NOT verified: Start activity, permission prompt, opt-in, live markers on the other device, stale label, route
  save/sync, End activity clearing positions, sign-out stop.
  Supervisor map findings, 2026-11-05 (uncommitted, tsc/lint clean, npm test 33/33, NOT on device yet):
  M2 sharing store in lib/location.ts + components/location-reporters.tsx mounted in _layout (one reporter per
  opted-in room, keeps running outside the map; map reads useSharingState). M3 stopMyLocationOnLaunch() after
  session restore in AuthProvider; setShareLocation awaits it. M1 markers: initials monogram + "Name · speed"
  title (no speed when stale), profile photos still a gap. M5 permission re-read on foreground. M6 no points →
  centers on own position (no prompt). M4 freehand drawing: gap list (tap points only).
  M7 opt-in race (supervisor, 2026-11-05): share reads that overlap a set_share_location call, or began before
  consent last changed, are ignored (pending count + per-room generation; pure rule reconcileShare in
  location-plan.ts, npm test 36/36); a settled call triggers a fresh read. Supervisor accepted M1–M6 with M7 required. Committed 5288abf. 14:08 PST cold restart of both sims + deep link to the 94673
  map: renders on both (guest 17 Pro idle + share switch; host 17 allow ON + Start activity), no red box. Server
  before QA: allowed, idle, both share false, presence 0. Evidence: docs/evidence/2026-11-05-map-5288abf-*.png.
  Taps not automated (expo-mcp tunnel not connected): QA steps wait on human taps.
- Sports/location server (0020, uncommitted, NOT applied live): fixes L1–L3 included. 2026-11-05 dry run (0020 +
  supabase/tests/sports_location_test.sql in one begin…rollback) PASS. Waiting on supervisor review before
  commit/apply and before the client (activity start/end, opt-in, map, route). Supervisor ACCEPTED 0020; committed
  72663d5. LIVE since 2026-11-05 21:51:52Z. V1 mapping: local 20261104000020_sports_location.sql → remote
  20261105215152 sports_location (file sha256 9c1284f4…6d1e, identical to 72663d5). Read-only check PASS:
  stop_my_location, set_location_allowed, report_location, set_activity_state, set_share_location, set_route and
  private.room_location_live exist, are SECURITY DEFINER with search_path '', authenticated execute yes, anon no.
- 2026-11-05 13:41–13:49 PST device QA in room 94673 "QA verification" (b03236a9-7092-4348-951d-99aa8937dc33), done by a
  Codex CUA run that the human authorized: guest join, Arrived (once; button disabled after), status Resting, Emergency → host
  "needs help" + Seen by 0 of 1 → host "I see it" → 1 of 1 on both, guest "I'm OK" clears the banners, notification permission
  Allow on both, and the 17 Pro soft keyboard keeps the composer above the keys (typing/sending not verified).
  Developer read-only server cross-check MATCHES: guest 97ed7d32 joined 21:41:29Z; one arrival (seq 0) at 21:42:21Z; status notice
  "Resting" at 21:42:49Z; emergency 5d365acc at 21:43:28Z; host edeaea51 ack at 21:45:59Z; no member_status row now
  (cleared). Evidence: docs/evidence/2026-11-05-qa-94673-activity-{guest,host}.png.
  Still NOT verified: live photo appearance, local reminder firing/tap, duplicate-notification check (CUA could not tap the
  host header "Photos").

## Video gaps (P5), uncommitted, awaiting supervisor review (2026-11-05)
- Already present before this change (code, earlier commits): per-file progress bar, failure state with the error text, Retry
  (same media id/paths; the row is updated, not re-inserted), Remove. Size limit: 50 MB per file (Free plan, final; M1 closed),
  so the "100 MB or more" part of P5 is answered by the documented limit and the pre-upload "Too large to share" alert.
- New: the upload queue moved out of the gallery screen into an app-wide store (lib/media.ts; pure rules in
  lib/upload-plan.ts, tests/upload-plan.test.mjs). Uploads keep running and their progress/failure stay visible after leaving
  the gallery; one upload at a time across the app; "Waiting to upload" for queued items; file size shown per row.
  Cancel (x, with confirmation) aborts the native upload through AbortSignal; the partial row is marked failed (never listed,
  deleted with the room). Late progress callbacks cannot revive a cancelled or failed job. The room header "Photos" link shows
  "Photos ↑N" while uploads are pending and "Photos !" (red) when one failed. Sign-out and account-gone cancel and clear the queue.
  iOS upload tasks use the default background URLSession, so a short suspension does not stop a long video; if the app is
  terminated the JS job is lost and the row stays 'uploading' (never listed, removed at expiry).
- Checks: tsc clean, expo lint clean, npm test 43/43. NOT verified on device: a large video upload with progress, leaving and
  returning to the gallery mid-upload, cancel, a forced failure + Retry, video playback/download (needs human taps in the picker).
- Gaps kept: no resume of a partially uploaded file (a retry re-sends the whole original); a dismissed failed row and any partial
  object stay in Storage until the room ends.
- V2 gap: with the background URLSession, a terminated app may still finish the native transfer, leaving a full object under a
  non-ready row until expiry (counts toward Storage). V1 (accepted): on sign-out the aborted job's 'failed' update may run after
  signOut and be rejected by RLS, leaving the row 'uploading' (same end state as app termination).
- Supervisor ACCEPTED; committed 9c098dd (npm test 43/43, tsc/lint clean). Device QA still required: progress, "Photos ↑1" after leaving, cancel (row removed,
  server row 'failed'), forced failure + Retry (same media id becomes ready), playback on the other device, Download original
  size + SHA-256 = content_sha256.

## Profile photo + account deletion (0021), uncommitted, NOT applied (2026-11-05)
- Scope: 48H plan hours 30-40 ("profile photo, account deletion"; deletion must be implemented and verified).
- supabase/migrations/20261104000021_profile_photo_and_account_deletion.sql: private `avatars` bucket ({uid}/{uuid}.jpg,
  JPEG only, 2 MB), owner-only writes, read by owner or co-members of an open room; profiles.avatar_path trigger
  (own folder + pattern, 22023; replaced path queued for the janitor by exact path); public.prepare_account_deletion
  (service_role only): ends hosted rooms, queues the user's media folders in other rooms and the avatar folder, stops
  location. Step 2 = auth.admin.deleteUser cascade (Edge Function supabase/functions/delete-account/index.ts drafted: caller JWT only, step 1 then deleteUser, safe to repeat
  because enqueue_cleanup upserts; NOT deployed). Janitor needs no
  change (bucket-generic, exact-path jobs supported).
- supabase/tests/account_deletion_test.sql: placeholder line replaced by a real check (co-member cannot clear another
  user's photo or write into their folder). Dry run (0021 + test in one begin...rollback): PASS 2026-11-05 23:17:41Z
  ("ACCOUNT DELETION TESTS PASSED"; test grants include anon). Files at that run: migration sha256 e3df77d0…1fde,
  test sha256 ad800326…c005 (both last edited before the run). Post-rollback read-only check PASS (23:2xZ): no avatars
  bucket/objects/policies, no prepare_account_deletion, no is_own_avatar_path, no profile_avatar trigger, no tests
  schema, no 0021 migration row (profiles.avatar_path predates 0021, from 0001).
- Supervisor ACCEPTED the 0021 design (A1-A4). A3 asserts added to the test (share_location off, no live_presence after
  prepare; media row gone after cascade already asserted). A2 gap: an uploaded avatar never written to avatar_path stays until
  account deletion.
- Client (uncommitted): lib/avatar.ts (square crop, 512 px JPEG re-encode drops EXIF, new {uid}/{uuid}.jpg each change, then
  profiles.avatar_path; remove = set null); profile.tsx photo row (Add/Change/Remove, initial fallback) and "Delete account"
  with an explicit confirmation (host copy says hosted rooms end for everyone); lib/auth.ts deleteAccount(): cancel uploads ->
  invoke delete-account -> clear caches + reminders -> local sign-out; on error the session is kept and "not deleted, try
  again" is shown. tsc/lint clean, npm test 43/43. NOT verified on device; avatar not yet shown on markers/member lists.
- Supervisor ACCEPTED client + Edge Function. D1 fixed: location.ts resetLocalLocation() (drops all opt-ins -> reporters
  unmount, clears states and pending) called in deleteAccount and the verifyAccount 'gone' path. tsc/lint clean, 43/43.
  E1 (at deploy): confirm SUPABASE_ANON_KEY exists in the function env (or switch to the publishable key); deploy with
  verify_jwt true (guests have valid JWTs; the function still calls getUser); if the project uses asymmetric JWT
  signing keys, deploy verify_jwt false instead (supervisor OK). After deploy: a no-token request must return 401. D1 ACCEPTED. No supabase/config.toml in the repo.
  QA plan (disposable accounts only, exact IDs recorded): photo set/change/remove seen by co-member not outsider; guest
  deletion (room stays, messages nameless, media gone after janitor); host deletion (room ends for the other member).
- Supervisor ACKED the dry run; committed c6e2f73 (tsc/lint clean, npm test 43/43). Live apply 2026-11-05: the
  apply_migration call was DENIED by the Claude Code auto-mode classifier ("Production Deploy"). 0021 is NOT live and
  delete-account is NOT deployed. Waiting on the human (an allow rule for apply_migration/deploy_edge_function, or
  their own apply). Do not route it through execute_sql or a peer session.
- Avatar in member lists (supervisor ACCEPTED with AV1 fixed: cachePolicy="memory" on Avatar and on the profile
  screen's own photo, so no photo stays on disk): components/avatar.tsx (photo through the
  authenticated Storage URL, initial fallback, also on a load error); listMembers returns avatar_path (column exists
  live since 0001); used in room info members and map member rows. Map markers stay monogram (expo-maps markers take
  only a monogram or SF Symbol; M1 gap kept). tsc/lint clean, npm test 43/43. Not on device.
  Before 0021 is live: photo upload shows the Storage error text and Delete account shows deleteFailed with the session kept
  (both caught; neither is done).
- Next (after the human unblocks): apply 0021 -> deploy delete-account -> device QA (photo set/replace/remove seen
  by a co-member, delete guest + host accounts with server and Storage checks).

- 2026-11-05 (supervisor/human instruction: deploy delete-account only, no 0021): read-only checks: 0021 not in
  list_migrations; only room-janitor deployed (face-match not deployed); project JWKS is ES256 (asymmetric), so
  verify_jwt=false chosen. deploy_edge_function was DENIED by the auto-mode classifier ("Production Deploy"); not retried.
  delete-account NOT deployed, 0021 NOT applied; account deletion and profile photos unusable in the app.
- 2026-11-05 ~23:49Z (human authorization recorded in USER_DECISIONS_2026-11-04_OPERATIONS_EN.md, "0021 apply and
  delete-account deploy authorized"): file sha256 e3df77d0…1fde re-checked, then apply_migration SUCCESS. The previous
  attempt's ERROR had left nothing behind (0021 absent before the retry). V1 mapping: local 20261104000021 → remote
  20261105234900 profile_photo_and_account_deletion. delete-account deployed v1 (id ad3d353f, ACTIVE, verify_jwt=false,
  source identical to c6e2f73). Smoke: POST without a token → 401; GET → 405. Read-only check PASS: avatars bucket
  private, 2 MB, image/jpeg; policies avatars_select/insert/update; trigger profile_avatar; prepare_account_deletion and
  on_profile_avatar SECURITY DEFINER with search_path ""; prepare_account_deletion execute: service_role only (anon and
  authenticated no). No account was deleted. NOT verified: photo set/replace/remove on a device and account-deletion QA
  (not authorized yet; disposable accounts only, exact IDs).
- Avatar device QA (supervisor assignment, option A, 2026-11-05 ~23:55Z): Codex drives the taps on both sims; the
  developer does only SELECT checks, simctl io screenshots and evidence (no input, no package/Metro change, no installs).
  Baseline: host edeaea51 and Test joiner 97ed7d32 avatar_path null, 0 avatars objects; evidence
  docs/evidence/2026-11-05-avatar-0-baseline-{host-17,guest-17pro}.png. Synthetic images (no person) added to both sims:
  docs/evidence/avatar-qa/QA-A.jpg sha256 f26e9168…4f61, QA-B.jpg sha256 53058e95…8e24. Waiting on step results from Codex.
  Step 6 (rollback-only outsider select; positive control 97ed7d32 → 1, random sub → 0) runs after step 1. End state:
  host avatar null.
  RESULT (2026-11-06 ~08:15Z): Codex UI PASS for set QA-A, guest sees it, replace QA-B, guest sees it, photo pin plus
  stale clock pin on the guest map, sharing off and activity ended, remove → T on both. Developer checks PASS: every
  replaced or removed path was queued and the janitor verified it gone (bucket at 0 objects 08:15:29Z); outsider RLS
  object variant gave random sub 0 and joiner 1; guest SDImageCache had 0 files. NOT passed: tapping the pin opens no
  callout (expo-maps SwiftUI has no callout; map.tsx passes no onAnnotationClick; comment at map.tsx:251 is wrong);
  speed not seen (static sim location gives speed -1 → null). Live refresh without navigation not tested. Fix proposal
  waiting on supervisor review. Evidence: docs/evidence/2026-11-05-avatar-qa-developer-checks.md,
  codex-avatar-qa-progress.md, 2026-11-05-avatar-{0,5}-*.png.
  Supervisor ACCEPTED the checks; MK4 reclassified (no callout by design, not a defect). Fix (a) done: map.tsx comment
  and DEMO.md wording and gaps (purge window, 'avatar_replaced' reason on remove, no pin tap action; (b) deferred to a
  product decision). DA1: delete-account header comment now says deployed v1; comment-only change, NOT redeployed
  (live v1 differs from the repo file only in that comment line). tsc/lint clean, npm test 48/48.

## Plus plan preview (48H 30-40 h item 3), supervisor ACCEPTED, committed (2026-11-05)
- app/plan-preview.tsx ("Plus preview"): "Preview — no payment" badge, Free vs Plus table (Free = current limits: 30
  members, up to 7 days, standard emoji; Plus = Larger/Longer/Extra set "(TBD)", price "Not set yet"), TBD note,
  "Get Plus" opens an explanation alert only. No StoreKit/IAP, no entitlement, no server change. Entry points: Profile
  "Plus plan preview" button; create-room link under the expiry hint. Strings in en.planPreview.
- tsc/lint clean, npm test 43/43. Render PASS on the 17 Pro via moment:///plan-preview after an app relaunch (a new route
  file needed a full reload; Fast Refresh alone showed Unmatched Route): docs/evidence/2026-11-05-plan-preview-17pro.png.
  NOT verified: the Get Plus alert tap, the profile and create-room links (human taps).

## 40-48 h polish, supervisor ACCEPTED (DM1-DM3 applied), committed (2026-11-05)
- Home: spinner while the room list loads (before: blank until loaded). en.home.loading.
- English/copy pass: no hard-coded JSX text found; user-facing Error strings in lib/media.ts, lib/auth.tsx and
  lib/face.ts moved to en.errors (notSignedIn reworded to "You are signed out. Sign in and try again.").
  Raw Supabase/Storage error text is still shown as-is in some failure hints (gap).
- docs/DEMO.md: run steps, walkthrough with verified/unverified state per step, remaining-gap list.
- tsc/lint clean, npm test 43/43. Not seen on device.

## M1 profile-photo map pins, supervisor ACCEPTED (MK2 fixed, MK3 in DEMO gaps), committed (2026-11-05)
- Assigned by the supervisor (route Codex→supervisor→developer). map.tsx: fresh member with a loaded photo → AppleMaps
  annotation with `icon` (ImageRef) and the same title (name · speed); no photo / loading / failed → initials marker;
  stale → grey clock marker, no speed (C4). Pure planPins/wantedIconPaths/initials in location-plan.ts (+5 tests).
- lib/marker-icons.ts useMarkerIcons: one hook, Image.loadAsync with the session headers (authenticated avatars URL),
  maxWidth/maxHeight 96; only fresh pins of current members (listMembers) are loaded and returned; a failed path is
  not retried while the screen is open (initials stay).
- Cache: expo-image 58 ios/ImageLoader.swift:27-29 always loads ImageRefs with cachePolicy .disk (SDImageCache.shared);
  no option avoids it. lib/image-cache.ts clearImageDiskCache() (Image.clearDiskCache → SDImageCache.shared.clearDisk,
  ImageModule.swift:248) runs on map unmount, clearRoomCache (leave/end, room gone), clearAllRoomCaches (sign-out,
  deleteAccount, verifyAccount 'gone') and app launch (crash/kill). Every <Image> in the app is cachePolicy="memory",
  so nothing else is lost.
- Not rounded: expo-maps AppleMapsViewiOS18.swift draws the icon as a 50x50 resizable Image with no clip.
- tsc/lint clean, npm test 48/48. Device: the map screen renders in the idle room 94673 on the 17 Pro
  (docs/evidence/2026-11-05-m1-map-17pro-idle.png); no presence rows, so no pins seen. NOT verified: photo pins
  (0021 not live), initials/stale pins after this change, tap callout, the cache clear on a device.
- MK2: loads settling after unmount skip state and clear the disk cache again (unmounted ref).

## Active task: media device flow
- Taps are not automated: the human taps and the developer verifies on the server. Test photo is in both
  sims' Photos (5927272 bytes, sha256 f50c71d63bba1093392deaab6e344f7d80181e2c880a8a0bbc97b4202b43d72e;
  source in the session scratchpad). Room "test chat" 031bc8aa-17c0-402c-bc52-bb2ba36fa54f, baseline
  media 0 / objects 0. iPhone 17 Pro = guest "Test joiner", iPhone 17 = host "Test".
- 2026-11-05 photo-picker crash (TCC SIGABRT, Moment-2026-11-04-220930.ips): the dev builds came from a stale ios/
  (prebuilt Nov 4 02:56, before the image-picker/media-library/camera plugins), so the Info.plist had no photo or camera
  keys. Fix: `expo prebuild --platform ios` + one `expo run:ios` build (succeeded, 0 errors), installed on the 17 Pro
  and then `simctl install`ed on the 17. Both installed Info.plists now have NSPhotoLibraryUsageDescription,
  NSPhotoLibraryAddUsageDescription and NSCameraUsageDescription; both sims kept their session and the "test chat" room.
  Gallery access after the fix: waiting on the human's taps. Later: expo-secure-store faceIDPermission false (before TestFlight);
  merge the camera copy if camera capture is added.
- 2026-11-05 human run (guest upload IMG_0002.jpeg → host gallery → host Download original) showed real errors:
  "Cannot convert 0.97 to BigInt" (guest) and "Cannot convert 100 to BigInt" (host). Cause (from source, no JS stack
  captured): expo-modules-core encodes Swift Int64 as a JS BigInt (CHANGELOG #46939); expo-file-system's native
  upload/download progress events send Int64 bytesSent/bytesWritten/totalBytes (TS types say number), so
  `bytes/total` was a BigInt and `f * 0.97` / `f * 100` threw. Fix: src/lib/progress.ts progressFraction() (Number(),
  clamped) used by both handlers; File.size reads wrapped in Number(). tests/progress.test.mjs; npm test 14/14,
  tsc and lint clean. Delivered by Metro Fast Refresh; NOT yet re-run by the human.
- Same run, byte check (read-only): the guest's source is the simulator sample photo DCIM IMG_0002.JPG (not the 5.9 MB
  fixture). Guest library file, picker copy, DB content_sha256, server object (size 2604768, MD5 = ETag 2dc1a2fc…),
  host cache file and host Photos IMG_0008.JPEG all have SHA-256 de54fee9…2904a. Media 04d2152b… status ready.
- Gallery All/Mine/Others under the translucent iOS 26 header: fixed with the shared useHeaderOverlap hook (also used
  by the chat screen; chat still lays out right, docs/evidence/2026-11-05-media-fix-17-host.png). Gallery not re-seen yet.
- 2026-11-05 re-run after 80eb439 (human-reported: upload on the 17 Pro, seen in the 17 gallery, Download original on
  the 17, all with NO errors). Server: media 3afb3048-cf85-4c71-a543-f40a9117c250 "qa-media-photo.jpeg" ready, 5927272 B,
  content_sha256 f50c71d6…43d72e, created 06:23:43Z; object original.jpeg 5927272 B, ETag/MD5 7f84bd7e…f00d. Devices
  (read-only): guest DCIM IMG_0009.JPG (the 5.9 MB fixture), guest ImagePicker cache copy, host room-media cache
  3afb3048….jpeg and host Photos IMG_0009.JPEG (22:23:53 local) all 5927272 B, same SHA-256 and MD5. PASS for
  upload → download → save byte integrity on simulators.
  Supervisor independently re-read the files and accepted media run 2 as a byte-exact PASS.
- NOT verified: gallery tabs clear of the header; live appearance without a refresh; preview rendering; video;
  the oversize (>50 MB) path on a device. Keep media 04d2152b and all existing data.

## face-match F3 review (Nov 6 item 3), FM1+FM2 applied, NOT deployed (2026-11-06)
- Read-only review sent to the supervisor. Live: face tables have RLS (policies 1/1/2), 0 rows each; face-refs bucket has
  0 objects; face-match was not deployed (live functions: room-janitor v2, delete-account v1). The earlier "SQL error" was
  an auto-handoff block, so the query never ran. It ran now.
- FM1 (supervisor approved): index.ts order is now 405 -> getUser 401 -> FACE_MATCH_ENABLED 503 -> AWS config 503.
- FM2 (supervisor approved): claimJobs filters attempts < MAX_ATTEMPTS (imported from core.ts) for both queued and
  stale-running jobs. The claim sets attempts+1 before each paid call, so a job that crashes the worker every time
  costs at most MAX_ATTEMPTS (3) calls and then stays 'running'. It is never retaken and is removed by the
  enrollment/media cascade when the room ends. saveMatch errors are thrown inside core's try block, so they are
  caught as 'transient' (requeued or failed by attempts) and do not leave a job 'running'.
- Known gaps (no fix now): FM3 enroll_face has no throttle (each re-enroll re-queues every ready photo; bounded by
  the kill switch and 10 calls per invocation). No client code calls face-match (testing needs a manual POST with a
  test user's JWT). getPhotoPath falls back to original_path (an original over 5 MB is downloaded, then marked
  bad_image). The secret names cannot be listed through MCP, so the developer has not verified them. The Deno test
  face-match.test.ts was not run (no Deno).
- Missing input for a positive match: authorized face-bearing fixtures (reference plus target of one consenting
  person, and a non-match). QA-A/QA-B contain no face.
- Supervisor correction (known gap, no fix now): the saveMatch in core.ts's bad_image catch branch is outside the try,
  so a DB throw there escapes processBatch (500) and leaves the job 'running'. The FM2 cap bounds it to 3 claims.
- DEPLOYED 2026-11-06 after the supervisor ACK on 4d5f92f: face-match v1 (id 2114cb00, ACTIVE, verify_jwt=false; files
  index/core/provider/rekognition/sigv4; get_edge_function source matches the repo files). FACE_MATCH_ENABLED and all
  other secrets were left untouched. Smoke: POST with no token -> 401 {"error":"unauthorized"}; GET -> 405
  {"error":"method_not_allowed"}. Valid-JWT -> 503 check: PENDING (no password or token for the existing test
  accounts is available to the developer). After the deploy: face tables 0/0/0 rows, face-refs 0 objects.
  The index.ts header still says "NOT DEPLOYED" (a comment-only fix belongs in the next commit, no redeploy needed).

## QA data
- S1 fixtures (tmp/qa-s1-ids.tsv) are deleted; see the cleanup row in implementation-status.md.
- Keep the pre-existing test@example.com and "Test joiner" accounts and their room (human decision).

## Operating rules
- Supabase stays on the Free plan, 50 MB per file (FINAL; do not raise an upgrade again).
- agent-device: only the open+snapshot action is approved. If a new rejection occurs, stop; do not bypass.
- Screenshots go in docs/evidence/. Record QA IDs when created; clean up by exact ID only.
- Ordinary verified local commits are authorized. Push only on request.
- Focused checks for focused changes; full RLS after access/deletion changes.
- Metro must not run with CI=1 (no file watching, stale bundle).
- No new skills/frameworks/orchestration. The Codex controller and heartbeat are OFF.
