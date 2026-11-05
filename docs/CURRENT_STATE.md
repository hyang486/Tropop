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
