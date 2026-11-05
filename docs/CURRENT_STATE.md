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
- Media upload/download on a device: IN PROGRESS (see Active task). DB tests and full RLS PASS.
- Activity UI (Arrived, status sheet, Emergency banner/ack) on the simulator; chat keyboard-open layout
  and checklist steps 5–10.
- Face matching: scaffolding plus F8–F10 committed; no live AWS CompareFaces result (needs rights-cleared photos).
  AWS secrets are already in Supabase Secrets; do NOT ask for them again.
- Reminders, map/route/speed, final account/plan flows: not accepted as working features.

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
- Steps asked of the human: guest uploads → host gallery updates live → host downloads the original.
  Then: check the media row, object size/hash, and the downloaded file hash in the sim container.

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
