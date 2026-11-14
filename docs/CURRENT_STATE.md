# Current state — short resume point

Confirmed human decisions: planning/USER_DECISIONS_2026-11-04_OPERATIONS_EN.md (check it before asking
the human anything again). Delivery agreement: planning/48H_DRAFT_PROPOSAL_EN.md (approved November 4;
full requirements in scope). The developer owns this file. History: docs/implementation-status.md;
reviews: docs/reviews/current.md (supervisor-owned). Read them on demand.

## 2026-11-14: local main e2b16e7 (resume here); UX2 audit fixes through UX2-139
- UX2-129 to UX2-139 merged; details: docs/implementation-status.md "2026-11-14: UX2-129 to UX2-139". 1001/1001 tests.
- Device: UX2-133 and UX2-135 PASS (qa). UX2-136 and UX2-139 not device-checked yet.
- Open: ADR 0036 (Emergency guard checklist) waits on the human. Push snapshot 4 still not pushed.

## 2026-11-13: local main 0978eb7; qrewing v6 live; push snapshot 4 built, not pushed
- Latency fix d528797 (USER_DECISIONS 2026-11-12 FINAL item 1, line 255): node tests 53/53, deployed as qrewing v6
  (verify_jwt false). Deployed index.ts and prompts.ts match d528797 byte for byte. core.ts differs only at line 603, where
  the MCP deploy turned the EMOJI_RE \u200d\ufe0f\u20e3 escapes into literal characters (same regex).
- qa live retest on 56FB44E7: PASS, no rollback. Siri cold: auth 965 / context 597 / model 1524 / total 3090 ms (edge
  4221). In-app warm: 576 / 601 / 1247 / 2425 (edge 2650). The same ask on v5: 3911 ms. No Q/A text in logs.
- Supervisor merged into main 0978eb7 = 77219fd + 421dd3a (ExpoApplication patch) + 6bd7b7a (web.output single) + d528797.
- Push (item 3): branch qrew-push-snapshot-4 = 45a1ad9 (tree d23cec0, parent qrew/main 8147215, human author, no
  trailer, 303 files, mobile/supabase = 0978eb7; tree checks PASS by supervisor). NOT pushed yet.
- Next: push on supervisor GO; then the human's real-iPhone Siri test (item 4); then qa deletes Siri Test 08936e50 (item 6).

## 2026-11-12 afternoon: local main 340366c (resume here)
- Spec 9, spec 10 (bot + 10.5 Siri) and a11y/dark merged on local main. Details: docs/implementation-status.md
  "2026-11-12 (afternoon)".
- Live: 0029 qrewing_ask_usage (20261112183834); qrewing v5 from ea1f217.
- Siri 10.5 PASS on iOS 27.2 simulator, signed-out and live paths (qa: guest 'Siri Test' 08936e50-13ed-428e-ac6e-3506ab28a87d in AI Meetup QA, 'This room ends tomorrow at 3:17 AM.', usage ask/haiku 1145/27). Real iPhone: runs, but the server takes 4.0-4.2 s (latency work in progress: branch qrewing-latency d528797, not deployed). Test Siri on iOS 27.2 sims (26.5 has FB23504349).
- Open: ExpoApplication crash in the Release build (developer-event is fixing it). Guest 08936e50 is a live test
  account (accounts table in docs/implementation-status.md); delete only with approval of that exact id.
- Open: app.json web.output "server" breaks Release/EAS export:embed (decision pending, unchanged). Push held (no human go).

## 2026-11-12: Qrewing bot `ask` (spec 10.2/10.3) — superseded: 0029 applied and qrewing deployed (see top)
- Branch qrewing-bot-backend. e054308 (draft ask) was sent to supervisor; the follow-up commit aligns it with spec 10.2/10.3:
  request {question 1..300, history ≤4 turns, me {elapsedSec, distanceM, paceSecPerKm, activity}, tz IANA default UTC};
  caps 30/user and 300/room per 24 h → 429 ask_limit; 200 {answer, usage}; times given to the model in the asker's tz;
  chat = last 60 consenting lines, about 6,000 chars.
- Migration 0029 (ask action, usage.user_id, log_qrewing_usage p_user_id, qrewing_usage_count) + supabase/tests/qrewing_ask_usage_test.sql.
- Verified locally: unit 49/49; strict tsc (core, prompts, tests); PGlite test PASSED, leftovers 0; negative control
  (count ignores user) fails as expected. Not verified: index.ts (Deno), live DB, deploy.
- Was blocked on human approval; the human approved (USER_DECISIONS 2026-11-12 FINAL), and 0029 was applied and deployed.

## 2026-11-12: Entry questions (spec 9) LIVE — 0028 applied, qrewing v3 deployed
- Authority: USER_DECISIONS ~10:20 PST FINAL "Go ahead" (apply 31a482f once, deploy 4c8a83a; no push).
- Live check 18:11Z: migrations end at 20261112180712 entry_questions; public.entry_questions exists with RLS on and 1 policy.
- qrewing v3 ACTIVE, verify_jwt false. Deployed index.ts and prompts.ts are byte-identical to 4c8a83a. In core.ts, EMOJI_RE
  stores raw U+200D/U+FE0F/U+20E3 where the source has \u escapes (an MCP upload artifact); the code points are the same, so it behaves the same.
- Smoke: GET 405, POST without auth 401. Unit: qrewing + janitor 52/52.
- Security advisor: no new kind of finding. The new RPCs set_entry_questions and upsert_entry_answers follow the existing
  SECURITY DEFINER pattern, and entry_questions has the same anonymous-auth policy WARN as the other room tables.
- Client against live 0028: qa sim PASS ~11:30 PST on 90b1f45 (docs/reviews/codex-final-qa-live-status.md, 2026-11-12-entry-q-*.jpg);
  not checked: server-side lock after the first answer (unit-tested only). Not pushed.

## 2026-11-12: Qrewing on main eeeafd9 — qa PASS on simulators
- main eeeafd9 (local): tsc 0, 449/449, lint 0. Push snapshot 9975963 (qrew-push-snapshot-2) reviewed, NOT pushed (qa's go).
- qa PASS (LS ~04:00-04:12): real match/triage/recap calls, People to meet, Mute small talk, entry F1/E2.6d/E2.5k, pace stop,
  early end → grace → recap, Photos of me + Save in grace, "Shared by Host". Details: implementation-status.md Qrewing section.
- Not verified: audible voice, a stop cutting speech, the silent switch, a real iPhone, the recap refresh.
- Open for the human: account deletion and the 30-min grace; the biometric category declaration.
- qa is recording the demo on :8093: do not touch the sims or Metro until qa says done.

## 2026-11-12: Qrewing on main b9d031c — QA in progress (superseded by the entry above)
- Full status: docs/implementation-status.md "2026-11-12: Qrewing AI on main b9d031c" and Feature status (Qrewing rows).
- main b9d031c = 55948fd + event-ux-polish 8ae6c98 (58e6ada) + pace-demo-replay 9a7c18f; tsc 0, 446/446, lint 0. Local, not pushed.
- Live: 0027 applied, qrewing v2 d30438f, room-janitor v10 */5. Sims: signed rebuild 55948fd on all 5 (groups kept).
- Metro :8093 (qrewing-merge) is the ONLY Metro while qa tests (shared metro-cache; .env.local copied into the worktree).
- qa PARTIAL: first real AI calls OK (match sonnet 667/67, triage haiku 587/42), People to meet, Mute small talk, F1, E2.6d.
- Pending: qa pace stop scenario and early end → grace → recap. After qa's pass, merge (supervisor's go): 70f850d
  (keyboard header, then device check E2.5k), copy-grace 40fd48f, pace-privacy-notes 9859293.
- Not verified: spoken audio, the silent switch on a physical device, a network drop, recap/grace end to end.

## 2026-11-12: Qrewing merged to main (local, no push) — worktree .claude/worktrees/qrewing-merge
- main ed5a281 ← backend 08823fc (5ae3f10) ← event cf19e4d (b206b54) ← pace 8edef43 (44e758f) ← event 84a97b6 (2272da1)
  ← pace 0a1854b (81c6da1), all --no-ff, no conflicts. Types = event bdb86d3 (incl. preview_room | null). tsc 0,
  npm test 438/438, lint 0, Deno node tests 47/47. NOT rebuilt (expo-speech native) and not on a device yet.
- Post-merge: abee9f5 ← event-post-merge 03320df, 55948fd ← pace-postmerge c982ebf; tsc 0, 438/438, lint 0.
- Signed sim rebuild from 55948fd (prebuild + pod install with LANG=en_US.UTF-8; xcodebuild DEVELOPMENT_TEAM 9K6BKSS4U6 /
  FAKETEAMID). Installed over the existing app on all 5 sims, app-id unchanged (host/spare 9K6, guests FAKETEAMID).
  Metro :8093 --clear (33 routes from qrewing-merge). Host and guest F11BA960 on :8093, still signed in. Device QA: qa.

## 2026-11-12: Qrewing backend (branch qrewing-backend); nothing applied or deployed
- 00dd3b7 Edge Function qrewing (spec 2, 7.2): node tests 21/21. ddfe985 migration 0027 tables/RPCs.
- d2fad59 0027 grace (7.1) plus the supervisor's broadcast fix: grace_until, end_room with 30 min grace, is_grace_member,
  7 select-only grace policies plus a recap-only realtime receive, recap-only broadcast in grace, refreshed_at, cron */5.
  room-janitor isRoomDue/dueRoomFilters (janitor tests 11/11). SQL test section 7b. Parsed only; NOT run against a DB.
  Review request sent to supervisor with the policy list and janitor bounds.
- 107d7b8 expo-speech installed (7.5). No rebuild: one rebuild after all three branches merge.
- Live sitting script: docs/qrewing-live-sitting.md; dry-run SQL builder scripts/qrewing-dry-run.mjs. Held for the human.
- 9a4cdb6 triage prefilter (8.8, supervisor PASS), de19608 janitor single or-tree, 71978d0 compact match input (8.9).
  Rerun: janitor 11/11, qrewing 26/26. Live read-only check: migrations end at 0026; cron = expiry-reminders, room-janitor only.
  Supervisor PASS on de19608 and 71978d0.
- 68132d6 review fixes: F1 recap max 2 attempts/room (refreshed_at = retry spent on a failed row), F2 refresh 2048,
  F3 match in-flight guard (input_hash 'pending:<uuid>' CAS, 2 min TTL; loser gets stale list or 202 = contract change
  for developer-event), qa Q1-Q3 prefilter (no @name rule, no bare everyone/important, rules for every sender). No SQL.
  qrewing 32/32, janitor 11/11. Review requested.
  0027 apply HOLD: waiting for qa on the approval scope (USER_DECISIONS line 219); then rollback test, apply, janitor deploy.
- Supervisor PASS on 68132d6, plus S1/S2 required before the qrewing deploy. 23e1423: S1 SDK pinned to 1.3.0 (2026-10-23;
  npm pack typings have output_config.effort and format json_schema; the adapter tsc-checks against them, negative
  control fails as expected). S2 a stale pending recap is retaken only while refreshed_at is null and sets it; a spent
  stale pending returns 502 with no call (test added). qrewing 33/33, janitor 11/11, tsc strict clean. No SQL.
  Deploy order (supervisor): 0027 rollback test → apply → janitor deploy → qrewing deploy → probe smoke (200, no content logged).
  Still held on qa's approval-scope answer.
- Sitting (authority: USER_DECISIONS 2026-11-12 FINAL (2) "해도 돼"). Pre-checks passed (0026 last, no drift in end_room /
  broadcast_room_change, cron */15, advisor baseline saved). Step 1 dry run RAN (human approved the prompt) and FAILED:
  22023 from private.media_integrity (0015) "original file is missing or empty" — test 7b inserted a ready media row before
  its Storage object. Rolled back. Test-only fix 32ac0c7. Rerun (qa accepted 10:47Z) FAILED at "grace: A cannot add
  media" (got 22023): the media_integrity BEFORE trigger fires before RLS and rejected the path '{room}/x/original.jpg'.
  Test-only fix: explicit id, path under {room}/{id}/, default status. Scan: no other trap (only media has a raising
  BEFORE trigger live; every RPC under a 42501 test checks host/member first). 0027 byte-identical to 9a4cdb6.
  Recheck: still 0026, no qrewing tables, no grace_until, janitor */15, no idle transaction. Rerun on supervisor PASS
  (qa answers the prompts). Steps 2-5 not run.
- Step 1 rerun on 686a69e: PASS (no FAIL, leftovers 0, still 0026). Step 2 apply: PASS (supervisor f841c2e).
  0027 IS APPLIED LIVE. Version mapping: MCP apply_migration stored 20261112105302 "qrewing_ai" for the local file
  supabase/migrations/20261104000027_qrewing_ai.sql (same content). A later CLI db push must treat these as one
  migration (e.g. `supabase migration repair`), not as drift. Post-apply: 6 public tables + private.qrewing_usage,
  rooms.grace_until, room-janitor job */5 active.
- Test file alone (686a69e, verbatim minus comments) on the applied DB: no FAIL raised (every assert raises on
  failure), ROLLBACK, leftovers 0; after: no tests schema, no QA rooms, 0 idle in transaction. Reported to supervisor.
  Next (on supervisor PASS): room-janitor deploy → qrewing deploy 23e1423 → smoke (runbook sections 3-4).
- Supervisor PASS bebc57c. room-janitor v10 ACTIVE (verify_jwt false, source = local). qrewing 23e1423 DEPLOYED
  (id 8befc29d, v1, ACTIVE, verify_jwt false) ~11:05Z; the supervisor's hold (qa-proxy cost safety, M1/M2) arrived after
  the call had completed. Reported. No probe/smoke made. Next: M1/M2/L4 (+L5/L8) fix on qrewing-backend → review → redeploy → smoke.
- d30438f cost fixes (functions/qrewing only, no SQL): M1 match failed:<n> marker, cooldown 2 min/10 min/24 h, old list kept;
  M2 triage model failures end skipped reason 'model_failed' (final, counted in the cap); L4 esc quotes; L5 recapLine;
  L7 TTL 3 min; L8 setup inside try. qrewing 36/36, janitor 11/11, tsc strict clean (SDK 1.3.0). Supervisor decided to leave
  v1 live (option b). Review requested. Next on PASS: deploy d30438f as v2, verify source, probe/smoke (runbook §4).
- Supervisor PASS d30438f. qrewing v2 DEPLOYED (id 8befc29d, ACTIVE, verify_jwt false, ~11:12Z). Deployed source: index.ts
  and prompts.ts byte-identical; core.ts differs only in EMOJI_RE, where the deploy encoding wrote U+200D/U+FE0F/U+20E3
  as literal characters instead of \u escapes (same code points; the deployed files pass qrewing.test.ts 36/36).
  Smoke (runbook §4): GET 405, POST without auth 401, non-user bearer 401, janitor or-filter 200 []. Janitor runs
  11:00/11:05/11:10 ok 200, stuck 0. Usage 0 rows (no model call yet), no qrewing rows. Logs: no qrewing request
  between the v1 deploy and the smoke. Probe with a user JWT NOT run: no session token at hand, and no new account without
  the human (rule). Real model call still unverified (SDK 1.3.0 output_config acceptance, match max_tokens headroom).

## 2026-11-09: U6 G-U6-1 — 33264a7 on qrew-u6 (from main e89cf85); local, no push, no rebuild
- Place and time (0026) closed: qa PASS on qrew-pt 62d8fdd and 28bd04f, merged --no-ff → main e89cf85 (dev: tsc 0, lint 0, 303/303).
  U5 closed earlier: qa PASS, merged --no-ff → main 1d96367 (LS). The U5 and U4 "NOT on a simulator yet" lines below are superseded.
- G-U6-1: Photos & files, Map, Info, Face, media detail, Camera access is off and Invite switch to Room ended when the room ends
  while open (one-shot timer at expires_at, re-armed on extend; deleted_at immediately via rooms / room_members notices; empty room
  read). Opened after the room is gone they show Room ended. Preview shows Invite unavailable once the end time passes.
  No packages, no server change. tsc 0, lint 0, 308/308 (5 new). Metro :8089 --clear: 28/28 src/app from qrew-u6.
- Supervisor code review PASS. NOT on a simulator yet: qa full regression (rows 1-25 incl. G-U6-1 a-e) pending.
- Final per-feature status list: docs/implementation-status.md "Feature status" (refreshed 2026-11-09; stale notes below
  annotated: J-1 closed, FACE_MATCH_ENABLED ON, Pen chip moved by P-1).

## 2026-11-09: Qrew unit 5 — 1c217d4 on qrew-u5 (from main 8cfd12e); local, no push, no rebuild; Metro :8087 --clear
- Supervisor released U5 (human accepted U4). Client only, no RPC/migration/RLS. Built by 3 agents in qrew-u5-media
  (f26449f), qrew-u5-face (3d2b1e2), qrew-u5-profile (e5249b7); merged --no-ff on qrew-u5 with dev commits 6649ba8, 79efc01.
- Art 6649ba8: Q 06.01 reference, Q 06.04 ended (gate with clock), Q 07.04 camera extracted from the PDF
  (scripts/ink-art-extract.mjs; pdfimages page 6 img 0/2, page 7 img 2) → assets/art/{reference,ended,camera}.png.
- Photos & files (Q 05.01-04, 06.03): HandTitle + room name, filter pills, upload rows under filters, "+" and pinned
  "Add photos or files" → Add to the room sheet (camera/library/file), "Originals available until T", "Room closes in N min"
  card in the last hour (expiry-plan closesSoonMinutes), Original saved card, detail title Video/Photo/file name,
  "Shared by X · age", Save original + new Share (same checked download). Approved originals notice text unchanged.
- Camera denied (Q 07.04): route room/[id]/camera-off (Open Settings / Choose from library) replaces the alert. Real device only
  (simulator reports camera unavailable before asking).
- Photos of me (Q 06.01-02): Me intro with art; Review your reference with all five consent points (en.ts list untouched)
  scrolling above pinned Agree and save; Manage top right → Replace / Stop and remove (logic unchanged).
- Room ended (Q 06.04): shared components/room-ended.tsx (chat, map, end confirm, info gone state); "closed at" only when
  known (lib/room-ended.ts + tests).
- Profile (Q 07.01) + new profile-edit route; Room info (Q 03.03): N people · M arrived (listArrivedIds = plain read under
  the existing arrivals_select policy, no server change), View participants, Edit status options, red End room/Leave room;
  Share invite (Q 02.04): Reissue as text button. NOT built: Copy code (expo-clipboard not installed; needs approval).
- Not in Q style yet: plan-preview.tsx (only its link is placed). tsc/lint clean, 290/290. Bundle :8087: 28/28 src/app from qrew-u5.
  NOT on a simulator yet (qa).
- Supervisor review of 1c217d4: no blockers. N5 fixed in c1af50a: downloadOriginal writes Paths.cache/room-media/<room>/<media>/;
  Save and Share now delete that folder in finally (discardDownload), also on error or cancel. N6 was already handled:
  arrivedMemberCount counts only arrivals of current members (M ≤ N). Copy code goes to the human (native rebuild); not installed.
  tsc/lint clean, 290/290; :8087 bundle has the change (no /reload endpoint: the app needs a reload).

## 2026-11-09: Qrew unit 4 MERGED → local main 8cfd12e (--no-ff qrew-u4 3fac672; no push, no rebuild)
- Hashes rewritten (message only, trees identical): Claude co-author trailers removed per the human rule. Old → new:
  27ab8d4→b092b00, 702d549→29f577e, 20338f1→3fac672, 8508bed→8cfd12e. qa/supervisor evidence citing old ids = same trees.
- Supervisor GO after qa PASS on 20338f1 (editor layout, stroke placement corners/center/after pan, behavior, F3, cards,
  G4/G8 quick set, Allow sharing switch). main: tsc/lint clean, 277/277. Metro :8087 stopped. U5 waits for the supervisor.
  Carried: N4 Draw/Undo/Clear truncate at largest type; editor map lacks Recenter/Show my location/3D (human); location-off Alert stays.
- Supervisor released U4 (human accepted U3, USER_DECISIONS:175). Scope: Map / route (Q 04.01-02, 08.03), End activity /
  end room (Q 03.04). Client only. Worktree .claude/worktrees/qrew-u4.
- Map: nav title empty, HandTitle "Map" + gray room name at the top of the scroll content; nothing else changed.
- End activity (host, Map button): pushed screen room/[id]/end-activity instead of the alert. End room (host, Info):
  room/[id]/end-room. Guest Leave keeps its alert. Shared components/end-confirm.tsx; lib/end-plan.ts (endGate,
  runOnce) + tests/end-plan.test.mjs. Back/swipe/Keep = no change; swipe off while ending; errors on screen.
- Copy claims ↔ code: "Live location sharing stops for everyone" = set_activity_state ended deletes live_presence and
  sets share_location false for all (000024); photos untouched; room end time = rooms.expires_at (unchanged).
  "closes now for everyone" = end_room sets deleted_at; private.room_is_open/is_room_member/is_room_host require
  deleted_at is null (0002). "deleted from the server" = room-janitor deletes rooms with deleted_at (FK cascade) and
  storage via cleanup_jobs. No time stated: the */15 cron lives in the DB, not in code.
- Supervisor review: no blockers. "Allow location sharing" off alert stays (outside U4; later-unit candidate). tsc/lint clean, 277/277.
  Bundle :8087: 26/26 src/app files from worktrees/qrew-u4. NOT on a simulator yet (qa).
- F1 702d549: qa largest-text Map shot (2026-11-09-qrew-u4-map-largest.png) showed "Show my location" (2 lines) under
  "Recenter" (there before U4). Map overlay texts now one line, maxFontSizeMultiplier 1.3. tsc/lint clean, 277/277. Sent to supervisor; qa recheck pending.
- F2 20338f1 (supervisor NO-GO on the editor): RouteEditor laid out as Q 04.01 (chevron = Cancel, HandTitle "Edit route" + room
  name, map card + dark length chip "5.2 km", equal Draw/Undo/Clear pills, hint, pinned Save route = Done). Same Modal, same
  pen/undo/save logic; strokes now converted without safe-area insets (map is a card inside the safe area). Map host:
  Start/End activity is a card row; on-map Pen chip reads Edit route / Draw route. tsc/lint clean, 277/277. Metro :8087 (cwd
  qrew-u4, no new files). NOT on a simulator yet: drawing accuracy in the card must be rechecked by qa.

## 2026-11-08 ~05:55Z: running-crew — local main 40a5535 (no push); 000023 + 000024 LIVE, R1C deleted
- Human approval ~21:40 PST (USER_DECISIONS line 153): apply 000023/000024, delete the R1C QA host by exact id+email.
- Local main: 9037a59 G1 merge → e52e5d5 (rc-emergency-resolved f70d432) → f303e68 (rc-activity-lines 88da4a2)
  → 40a5535 G2 merge (rc-status-map 5bef85f, qa (a)-(e) PASS). Migration/test blobs identical to the accepted commits.
- Drift check before apply: md5(prosrc) of clear_my_status, set_my_status (0002) and set_activity_state,
  set_location_allowed (0020) equal to the repo; grants authenticated yes / anon no.
- 000023 APPLIED (schema_migrations version 20261108053456, name "20261104000023_emergency_resolved_line");
  both functions contain the resolved line; proacl unchanged.
- ~05:46Z human at the screen (via qa): 000024 APPLIED as "activity_chat_lines" (version 20261108054618; both
  functions have the lines; authenticated exec yes, anon no). R1C DELETED (exact id + email, 1 row, 0 left).
  activity_chat_lines_test.sql PASSED (ROLLBACK, 0 c24… leftovers). Advisors: same known kinds, nothing new.
- G6 #9 rc-expiry-banner 2ad8138 (one-line banner → Info; last 1 h for rooms < 24 h, 10 min margin; hidden while
  keyboard open), mobile 194/194. G7 #11 rc-create-defaults 8a790a9 (Sports 3 h default, deleted-at every 5 s, no
  seconds), mobile 192/192. Both from main 40a5535, tsc/lint clean; sent for supervisor review.
- emergency_resolved_test.sql RUN on live (human approved, USER_DECISIONS line 154): 'EMERGENCY RESOLVED TESTS PASSED',
  ROLLBACK; 0 leftovers (auth.users c23…, rooms, messages, room_members, member_status, tests schema).
- G4 rc-pill-route 2d4e06e: supervisor REVIEWED, no blockers (optional perf: bbox cull/decimate route if jank).
- Human: Sports default 3 h (+ refresh deleted-at while open, #11); rooms < 24 h ends-soon banner last hour only (#9).
- Re-checked ~06:00Z after a handoff (read-only): newest schema_migrations = 000023; set_activity_state/
  set_location_allowed have no activity lines, so 000024 is not applied (not partly either).
- 000024 NOT applied: apply_migration raised the destructive-SQL confirmation (DELETE in the body), which expired
  after 2 min. Live functions still equal 0020. Retry only with the human at the prompt (asked qa to signal).
- R1C delete: pre-check returned exactly 1 row (id c2d629c2-… + r1c-qa-host-11070111@example.com); delete waits
  for the same human Accept. Advisors run after 000024. SQL tests NOT run (supervisor confirming with the human).
- Metro :8082 serves rc-chat-events 5061910 (G3 #8) for qa; :8081 = main checkout.
- G4 (#5) on branch rc-pill-route 2d4e06e (from 9037a59): the projected route is an obstacle in pill placement.
  tsc/lint clean, mobile 195/195. Sent for supervisor review.

## 2026-11-08: running-crew G1 client part (#1, #12) MERGED to local main 9037a59 (qa (a)-(f) PASS, supervisor GO; no push)
- Branch rc-emergency (worktree .claude/worktrees/rc-emergency): fef059e + 7720a57 on main 49304f1, merged --no-ff as 9037a59.
  tsc/lint clean, mobile 188/188. Supervisor review: no blocking findings.
- Deviation from the plan (accepted by the supervisor): for the #12 header, the plan said ellipsis plus a smaller
  font. Below 400 pt window width (17e = 390), the branch replaces the four header text links with SF Symbol
  icons instead, keeping the a11y labels. The four text links were the real cause. qa check (e) covers it.
- 7720a57 (supervisor note 2): "Seen by" names only current members, so the names match the "x of N" count.
- #4: migration 000023 on branch rc-emergency-resolved (692e2d8, 0a6fa8e, f70d432; worktree
  .claude/worktrees/rc-emergency-resolved) has been ACCEPTED by the supervisor. It replaces clear_my_status (I'm OK → "<name> is OK
  (Emergency resolved)", only while is_room_member) and set_my_status (Emergency → other status: one line
  "<name> is OK (Emergency resolved) · <label>"). Test: supabase/tests/emergency_resolved_test.sql (10 cases,
  ROLLBACK). NOT APPLIED, NOT RUN: the human must sign off on both (the test inserts temporary auth.users rows).
- G2 (#2) on branch rc-status-map 5bef85f (stacked on rc-emergency): status on the pill line and in Sharing now rows.
  mobile 190/190. Sent for supervisor review; qa checks a-e pending.
- G2 review: no findings. G3 #8 on branch rc-chat-events (95bb46b + 5061910 note 1: no media_id on the line,
  stacked on rc-status-map), mobile 192/192, supervisor: no blockers.
- G3 #3: migration 000024 on branch rc-activity-lines 3d9b53b + 88da4a2 (from main; review fix: set_location_allowed(false) ending an active activity also posts the ended line). set_activity_state now posts system
  lines "Activity started. Open Map to share your location." / "Activity ended. Location sharing is off." only on
  a real state change. Test: supabase/tests/activity_chat_lines_test.sql (ROLLBACK). NOT APPLIED, NOT RUN, needs
  human sign-off. Supervisor: ACCEPTED at 88da4a2 (no findings), for human sign-off only.
- G3 #8 MERGED → main a491535 (--no-ff rc-chat-events 5061910; local, no push). tsc/lint ok, mobile 192/192.
  qa PASS (a)-(c) + #3/#4 device lines (supervisor GO). NOT VERIFIED: (d)/(e) video share line, failure path,
  deleting a shared photo keeps its line.
- G4 #5: main merged into rc-pill-route → 371bda6 (tsc/lint ok, 199/199). Metro :8082 serves it for the G4 qa run.
  Merge order after qa: G4 → G6 → G7 → G5+G9 → G8 (G8 last; one map.tsx hunk: keep planLabels(..., shownRoute) + photoPins).
- G6: main merged into rc-expiry-banner → b7dad23 (196/196), served on :8082 for qa (last-hour banner check
  after 22:55 PST). G6 stays unmerged until G6b passes.
- G4 qa (a) FAILED on 371bda6 (F1 pills on pins, F2 route covered, F3 floating/clipped pill, F4 crowded fit).
  Fix on rc-pill-route 55a169e + 6b2f1df (review notes): pins/pills/edges weigh 100x route, more candidates
  (slides, beside, 0/8/16 pt stand-off, wrapped lone pill), no pill for off-map groups, marker 36 pt, side
  padding fixed 64, grid-indexed route cost. Repro test tests/map-labels-g4-repro.test.mjs (qa room loop).
  Supervisor: no blocking findings; ruling: a pill may cover the route only with no clear candidate within
  MAX_PILL_GAP, max 120 pt. 203/203. Served on :8083 for qa re-run of (a) and the (b) perf check.
- G6b (human: reminder follows the banner rule): branch rc-expiry-reminder 56835c4 (from b7dad23). Migration
  20261104000025 (1 h window for rooms under 24 h - 10 min), DB test supabase/tests/short_room_reminder_test.sql,
  client planReminders/presentServerReminder guard, last-hour local copy. 201/201.
  APPLIED 2026-11-08 ~06:13Z as version 20261108061319 (human "둘 다 진행" via qa, Accept in the developer pane).
  Live body md5 = file body; grants postgres only. expiry_reminders_test.sql PASS, short_room_reminder_test.sql
  PASS (60b6b59: counts scoped to test rooms; live 4-day room 03424 enters its window at a simulated time).
  0 leftover test users/rooms/rows, no tests schema; advisors: no new lint types.
  G6 qa (a)-(d) PASS (3 h room "Ends in 57m" shows the one-line banner). rc-expiry-banner fast-forwarded
  b7dad23 → 60b6b59 (tsc/lint ok, 201/201), served on :8082 for qa's G6b reminder re-test. Merge to main after
  qa passes G6b and supervisor GO.
- G7 MERGED → main 79051e0 (--no-ff rc-create-defaults 1eb330d; local, no push), tsc/lint ok, 216/216.
  qa (a)-(d) PASS on 1eb330d; supervisor GO. (qa side note on per-type status defaults: out of scope.)
- G5+G9: main → rc-photo-access 7a1e622, → rc-take-photo cee2c23 (both 216/216, no conflicts; +90/-20 in
  4 files vs main). Served on :8083 for qa. G8 rc-route-distance untouched (merges last; map.tsx hunk).
  qa: G5 (a)-(c) PASS (5,539,741-byte video uploaded untranscoded). #7 notice wording APPROVED by the human
  (2026-11-07, via qa). G9 NO-GO at cee2c23: F1 sim crash 'Source type 1 not available' (uncatchable ObjC),
  F2 "Upload failed" title for camera errors → fixed in 92782f6 (cameraStep(Device.isDevice) before any native
  call; CameraError titled "Can't take photo"), 218/218, on :8083. Real capture still NOT VERIFIED (device).
  Installed builds: only 17 Pro 91F3BFB3 (Nov 7 17:17) has the new camera string; 17 Pro Max, 17 (Nov 5) and
  17e (Nov 6) have the old one; iPhone 16 Pro unavailable to devicectl. Supervisor: 92782f6 no blocking
  findings; qa retests (d)/(e) and the "Can't take photo" title. No rebuild (supervisor raises it if needed).
- G8 MERGED → main e10ca26 (--no-ff rc-route-distance e268be6; local, no push), tsc/lint ok, 225/225. qa (a)-(e)
  PASS; supervisor GO. Unverified: 3-digit km, editor photo pins (qa photos lack GPS), own dot with Share on,
  no-route as a guest. ALL running-crew items G1-G9 are now on main.
## 2026-11-09: Qrew unit 3 — MERGED 356c820 (qrew-u3 790baab), local only, no push
- Released by supervisor after the human accepted U2. Branch qrew-u3 from main f0c7f54, worktree .claude/worktrees/qrew-u3.
  Client only (no RPC/migration/RLS). Q 03.01/08.04 chat head (title, Ends line, tab row; hidden with keyboard open),
  Q 03.02 status sheet (icon+text grid, keyword icons, generic tag for custom, Clear/Cancel, Arrived inline),
  Q 04.03/04.04 red Emergency card (requester, seen, last-location age or neutral none, Open last shared location →
  Map focus param). lib/chat-plan.ts + tests. tsc/lint clean, 272/272.
- Metro :8087 --clear from qrew-u3; entry bundle: all 27 src/app paths under worktrees/qrew-u3.
- Keyboard: chat keeps KeyboardAvoidingView padding (not QScreen); useKeyboardOpen is iOS-only (Android follow-up).
- Review: no blockers (N1 answered: one shared room channel). qa: all PASS except F1 (tab row: Link asChild Slot
  dropped the Pressable function style → no pills, Chat stretched). Fix 790baab: router.push Pressable tabs, equal
  pills, label shrink-to-fit (max multiplier 1.6). Nav "Chat" title kept (Q 03.01 has it). tsc/lint ok, 272/272.
  :8087 restarted --clear (27 paths qrew-u3). Waiting for qa F1 re-check.
- qa F1 PASS (17/17e, largest type, 4 pills w/o Map); supervisor GO. MERGED: 356c820 = --no-ff merge of qrew-u3
  (790baab) into main, local only. On main: tsc ok (no stale types), lint ok, 272/272. U4 waits for supervisor.
  Carried: N3 Arrived/Set status chips truncate at largest type; nav title alignment (human side-by-side);
  Android keyboard follow-up.

## 2026-11-09: Qrew unit 2 — 595f1cf (:8084) + item 10 1b8b940 (:8085), both local, no push
- 595f1cf on qrew-u2 (from 7eab203, worktree .claude/worktrees/qrew-u2): Q 02.01, 02.03, 07.02, 07.03, 08.01
  (QScreen subtitle/keyboard/bottomAlign/QField/QLink; gate + paper art; host form, guest, home, create-room 4/7 day
  chips no Custom, join code boxes, scan, invite-unavailable). 17 files +483/-252, tsc/lint ok, 241/241.
  Supervisor review: no blockers (N1 folded into item 10). 02.02 place/time: separate gated unit.
- Item 10 (USER_DECISIONS:172 option A, client only): 1b8b940 on branch qrew-u2-i10 (parent 595f1cf, worktree
  .claude/worktrees/qrew-u2-i10). Signed out: Welcome Join → start/code | start/scan → /guest (name) → Rooms
  resumes the held invite once → preview → Join. Link join/[token] signed out: hold, dismissTo welcome, push guest.
  lib/invite.ts = pure helpers + pending invite (pending-invite.ts removed). N1: unavailable → dismissTo('/join').
  15 files +416/-246, tsc/lint ok, 251/251 (+10 tests/pending-invite.test.mjs). Sent for review; NOT on a simulator.
- QA K1/K2 keyboard (qa at 595f1cf, evidence 2026-11-09-qrew-u2-{create,upgrade}-keyboard.png): e8db927 on branch
  qrew-u2-k (parent 1b8b940, worktree .claude/worktrees/qrew-u2-k). QScreen: no KeyboardAvoidingView; pads by the
  keyboard-covered part measured at each keyboard move, scrolls the focused field into view; host form keeps the
  submit button visible. lib/keyboard-plan.ts + tests. tsc/lint ok, 261/261. Supervisor review: no blockers.
  qa on e8db927 (:8086): item 10 sim-runnable cases PASS, K1 PASS, K2 FAIL (upgrade sheet, Email focused:
  button half under the keyboard; 2026-11-09-qrew-u2-k-upgrade-email.png). Logged on the 17e (dev, :8087): in
  the sheet measureInWindow gave root y 0/h 797 (sheet space) vs keyboard screenY 536 on 844 → pad 261 (47 short)
  and reveal saw the button as visible. Fix 094492f: pad = window height - keyboard top, capped at its height;
  17e after: pad 308, body scrolled 25, button above the keyboard; Password (Strong Password panel) pad 415 OK;
  pushed Join code screen OK (evidence 2026-11-09-qrew-u2-k2fix-*-17e.png). tsc/lint ok, 261/261.
  :8086 restarted --clear at 094492f (routes all under worktrees/qrew-u2-k). :8085 stopped (stale
  pending-invite red screen). Stack 595f1cf → 1b8b940 → e8db927 → 094492f; U2 merges as one unit after qa passes.
  qa K2 retest on :8086 PASS (17 Pro Email: button y 471-523, AutoFill bar at 539; Password, K1 Create, Guest
  name regressions PASS). Supervisor GO.
- MERGED: f0c7f54 = --no-ff merge of qrew-u2-k (094492f) into main, local only (no push, no rebuild). On main:
  tsc ok (after Metro :8081 regenerated the ignored .expo/types/router.d.ts with /start/*), lint ok, 261/261.
  U3 waits for the human.
  ANDROID FOLLOW-UP: QScreen listens only to iOS keyboardWillChangeFrame/WillHide, so Android gets no keyboard
  padding/reveal. Add keyboardDidShow/DidHide handling (or adjustResize) when Android starts.
- METRO CACHE TRAP: worktrees share mobile/node_modules (symlink); a Metro started without --clear reused
  expo-router's app-root ctx from another worktree (:8084 served qrew-u1 routes until ~19:40Z; qa told to re-run).
  Start worktree Metros with --clear and check the bundle's `worktrees/<name>/mobile/src/app` paths.
- Metro: :8081 main checkout, :8083 old qrew-u1 (not mine to stop now), :8084 qrew-u2 595f1cf, :8085 qrew-u2-i10.

## 2026-11-09: Qrew redesign unit 1 (human-directed, USER_DECISIONS:163-166; work list planning/QREW_REDESIGN_WORKLIST_EN.md)
- Branch qrew-u1 (from e96c755, worktree .claude/worktrees/qrew-u1) 795e268, served on :8083 for qa. Client only.
  6ba9010 HandTitle + bundled OFL fonts (Patrick Hand 0.21 MB, Gaegu Light 3.21 MB, licenses in assets/fonts),
  expo-font at runtime, splash waits for fonts. 91a3ecf roomTheme(name) (R1) + one art map (lib/ink-art.ts) +
  InkArt: run/gathering extracted from Qrew_heytea_UI.pdf (scripts/ink-art-extract.mjs, transparent), hike/
  bike/motorcycle/meetup DRAWN BY DEV (SVG, placeholder). 795e268 invite preview new order (place/time slots
  empty until the migration unit), app name Qrew (R2; home-screen name + plist strings NOT YET VISIBLE without
  a native rebuild). 18 files +633/-36, tsc/lint ok, 238/238. NOT VERIFIED on a device yet (qa: five themes).
  Supervisor review: no blocking findings; Latin-script split accepted; gathering stays Q 01.01, meetup for unit 2.
  F1 fixed in 1e118f9 (머신러닝/딥러닝/이러닝/e러닝, 부산행, 리사이클 → gathering), 240/240, on :8083.
  Title font (Patrick Hand vs Q's Noteworthy) goes to the human via qa screenshots; unchanged until then.
  qa run (docs/evidence/2026-11-09-qrew-u1-a-*.png) → supervisor NO-GO at 1e118f9: A1 art, A2 palette, A3 time.
  a3ec1f7 fixes all three (13 files +395/-88, tsc/lint ok, 241/241, :8083 bundle 200), NOT YET re-verified by qa:
  A1 hike/bike/motorcycle redrawn as a person doing the activity (scripts/ink-drawings.mjs, paper-filled body
  shapes, DRAWN_BY_DEV), ~175x145-155 pt at width 180 vs runner ~169x156 (was hike 166x102, motorcycle 149x78).
  A2 components/ui palette (white ground, ink #181817 tint, cards #F6F6F2, onTint, outlined secondary/red
  destructive Button, radius.pill chips; dark inverts). A3 preview "Ends" via formatDeletedAt (no seconds).
  9c2b87d close-out (5 files +101/-39, tsc/lint ok, 241/241, :8083 bundle has QScreen): components/q-screen
  QScreen (hand title top, scroll body 24 pt sides/12 pt gaps, actions pinned bottom) + QCaption; preview on it
  per Q 01.04 (USER_DECISIONS:168; "Join the room" pinned, count/end time in caption); Button 52 pt regular;
  Info "Ends" to the minute. qa b-run (docs/evidence/2026-11-09-qrew-u1-b-*.png): items 1-4 PASS; one gap (art
  right under the title, empty space above Join). 1ab2fd1: QScreen `bottom` slot, preview art + note anchored
  directly above Join (tsc/lint ok, 241/241, on :8083). qa c-run FAIL: art cut behind Join on open (automatic
  content inset added header height to the flexGrow body). Fix: QScreen pads useHeaderOverlap, inset "never"
  3a976c5 (tsc/lint ok, 241/241). qa d-run PASS (d-*.png). Supervisor GO (code+QA) 795e268..3a976c5; human accepted the drawn art (USER_DECISIONS:169). MERGED → main 7eab203 (--no-ff, local, no push, no rebuild); main tsc/lint ok, 241/241. Title font approved (USER_DECISIONS:167). Unit 2 and place/time NOT started.
- Follow-ups MERGED → main e96c755 (--no-ff rc-followups 4bad94c; local, no push), tsc/lint ok, 228/228. qa
  (a)(b)(c) PASS on :8083 (face Take photo inline unavailable text, no new .ips; library pick works; one
  "Route 18.5 km" a11y heading); supervisor GO. Metro: only :8081 (main checkout) runs; :8082/:8083 stopped.
  OPEN: real-device Take photo capture (human iPhone check); G3 (d)/(e) and G8 unverified items above.
- Follow-ups on rc-followups (from e10ca26): e88666c editor heading a11y label "Route x.x km"; c47b8db face
  reference camera simulator guard (CameraError, inline unavailable text); 4bad94c hides the duplicate km line
  from VoiceOver (supervisor minor). Supervisor: no blocking findings. 228/228, served on :8083 for qa.
- G5+G9 MERGED → main a31f904 (--no-ff rc-take-photo 92782f6; local, no push), tsc/lint ok, 218/218. qa G9 (d)
  v2 PASS (no crash, "Can't take photo"), regression PASS; supervisor GO. Real-device capture NOT VERIFIED.
  :8081 (main checkout, PID 2345, not --clear) sees a31f904 on the iPhone's next reload; not restarted.
- G8: main a31f904 merged into rc-route-distance → e268be6 (one map.tsx hunk resolved as planned), 225/225,
  +160/-16 in 5 files vs main. Served on :8082 for qa (a)-(e); supervisor accepted it for qa. :8083 stopped.
  :8081 left alone (human's iPhone Take photo check).
- QUEUED after G5+G9 and G8 merge (supervisor): face.ts pickFaceReference('camera') gets the same cameraStep
  guard + test, small branch from main. Do not start before then.
- G8 dry run vs main 79051e0 (merge-tree): still one map.tsx hunk (keep planLabels(..., shownRoute) + photoPins).
- G6+G6b MERGED → main 2d5a98a (--no-ff rc-expiry-banner 60b6b59; local, no push), tsc/lint ok, 214/214.
  qa on 60b6b59 with 0025 live: 3 h room 77126 no alert at creation (23:06-23:12) PASS; 1-day room 33289 server
  alert "disappears in 23h 55m" ~23:05 PASS; Saturday Run Crew no new alert (dedupe), as expected. Supervisor GO.
- G7: main 2d5a98a merged into rc-create-defaults → 1eb330d (216/216), served on :8083 for qa's G7 run.
  Then G5+G9 → G8.
- G4 MERGED → main 3a1e49b (--no-ff rc-pill-route 356cf19; local, no push), tsc/lint ok, 205/205. qa v3 PASS
  (a) Recenter, (b) dense 126-point route responsive (frame rate not measured), (c) zoom; supervisor GO.
- G7: main merged into rc-create-defaults → 4d6fdb3 (207/207), served on :8083 for qa after G6/G6b.
  Merge order: G6+G6b → G7 → G5+G9 → G8.
- G4 v2 qa: (a) no pill on a pin, (c) zoom PASS; F5 pill under MapKit's 3D button → 356cf19 (right control
  column hard area), 205/205, served on :8083. (b) perf pending.
- G9 #13 on branch rc-take-photo 3b8c6f7 (stacked on rc-photo-access b3f34fc): "Take photo" first in the Photos
  Add sheet (camera permission, then launchCameraAsync, images, quality 1; one-time originals notice; denied and
  unavailable alerts). tsc/lint ok, mobile 190/190. Real capture NOT VERIFIED (needs a device).
- G8 #10 on branch rc-route-distance 4fed903 (from main): "Route x.x km" chip next to Pen on the Map, a live km line
  in the editor, and member pins plus own dot (same gate as the Map, no new prompt) in the editor. tsc/lint ok,
  mobile 197/197. Both sent to supervisor for review on 2026-11-08 ~05:55Z. No sim run yet.

## 2026-11-08 04:03Z: R1-C QA host cleanup — room purged, account delete PENDING (human)
- Room 82192 / host c2d629c2-cf2e-49b4-9598-5f6618d7b273: 0 room rows, 0 storage objects (04:03Z check).
- The account delete (exact id + r1c-qa-host-11070111@example.com) stopped at the Supabase destructive-SQL
  confirmation; qa declined it because the human is away. Do not retry; it waits for the human. auth user still exists.
- Next: 13 running-crew fixes (human ~21:15 PST; docs/evidence/2026-11-07-running-crew-findings.md). Plan sent to
  supervisor: G1 #1/#4/#12 … G9 #13. Migrations 000023 (Emergency resolved line) and 000024 (activity start/end lines)
  are written on branches but NOT applied without explicit sign-off.

## 2026-11-07 late night: pushed e8b5d47 to QRew main (supervisor PUSH GO after qa main spot check A/C PASS)
- `git push qrew qrew-push:main`: fast-forward 099c511..e8b5d47, no force. `git ls-remote qrew main` = e8b5d47.
- e8b5d47 (parent 099c511, author Hyeonmin Yang, no co-author line): qrew's root .gitignore/README.md, plus mobile/ and
  supabase/ from main 835fb40 minus mobile/.claude/settings.json and mobile/AGENTS.md. 36 files, +3474/−214.
  Supervisor reviewed the file list and the secret scan before the push.
- Metro :8082 (P-2 worktree) stopped; :8081 still runs. Local branch qrew-push = e8b5d47. Next QRew push: build it the
  same way (commit-tree on qrew/main, same two exclusions).

## 2026-11-07 late night: P-2 redone → main 3be4858 (supervisor GO after qa A–G PASS on :8082; local, no push)
- 24037f0 reapplies db2e86d (reverts revert 7e71cf8), then --no-ff merge of 45cde50 (pill flip) + 03e8ee7.
- Rule: complete-link groups (every two members within 48 pt on screen); pill contact solved by placement
  (6 candidates: below/above x centred/reaching left/right; first clear, up to 2 bounded revision passes);
  with no clear spot a pill may overlap (human decision (a), USER_DECISIONS). Replays (B) pinch/pan, C2, rotated
  E: 0 overlaps; (B) pan G3 pill 3.7 pt into the bottom band. viewportFromRegion verified on a 261° log (~1 pt).
- tsc/lint clean, mobile 182/182, no P2DBG/P3-DEBUG. Next: qa spot-check on main via :8081; push to QRew waits
  for supervisor file-list/secret scan.

## 2026-11-07 night: polish P-1..P-3 (human request via qa ~18:00 PST; supervisor GO each, local, no push)
- P-1 p1-pen-compass → main 063e0ba: host Pen chip moved top right → top left (expo-maps 58 cannot move MapKit's
  compass). tsc/lint ok, mobile 139/139. qa PASS, supervisor ACCEPTED (rotated-compass screenshot).
- P-2 p2-member-labels (text-annotation labels) merged as ad61dfd, FAILED qa check (b): with 4 members ~40-90 pt
  apart the 17 pt pills overlap and are drawn under neighbouring pins (docs/evidence/2026-11-07-p2-cluster-*.png).
  Reverted on main: c3f34a0. Redesign proposed to supervisor (recommended: one grouped label per tight cluster,
  recomputed after each camera stop); it changes what the human sees, so it waits for the human's choice. No code yet.
- P-3 p3-deeplink-modal → main 1b311e9: a warm moment:/// or join link while Invite/Upgrade is open closes the
  modal first (C-3 path). Typed-route tsc fix 57ef2cc on the branch before the merge. tsc/lint ok, mobile 148/148.
  NOT VERIFIED on a sim yet (qa checks 1-5 plus a C-3 reminder-tap regression).

## 2026-11-07 evening: gap fixes (human "fix the small gaps", via qa; supervisor GO, one merge at a time, local, no push)
Order: camera → N-1 → C-3 → F5-5b → FG-L1 → FG-R1. Each merge is re-checked on main, then qa checks from the main checkout.
- 1/6 camera-plist-face → main b509d9f. tsc/lint ok, mobile 124/124. qa native rebuild (91F3BFB3): the string in the
  build is verified (docs/evidence/2026-11-07-gap-camera-plist-installed.txt); app launches. The system prompt was
  NOT seen (sim signed out after reinstall). Build note: pod install needs LANG/LC_ALL=en_US.UTF-8.
- 2/6 n1-deeplink-root → main 28ef2f7. tsc/lint ok, mobile 128/128. qa (Guest 1, 17 F11BA960, Metro 8081),
  supervisor ACCEPTED for the warm signed-in path: (a) PASS, a warm moment:/// from a deep stack lands on Rooms as root
  with no in-app Back. (b) route-only: a fake-token join link opens Join room (no real token). (c) NOT TESTABLE
  in the dev client (cold start opens the dev launcher): on the preview/release-build checklist. (d) known minor
  gap, signed out: a transient empty Rooms with Back, then the welcome screen; not proven pre-existing.
  Evidence: docs/evidence/2026-11-07-gap-n1-*.png.
- 3/6 c3-modal-nav → main b65f9f9 (_layout.tsx import conflict resolved, both handlers kept). tsc/lint ok,
  mobile 130/130. qa PASS, supervisor ACCEPTED (Guest 1, 17 F11BA960): with the Invite modal open, and again with the
  "Become a host" upgrade modal open, a reminder tap closes the modal and opens the room full screen; Back goes to
  Rooms. The test used a simctl remote-push payload (data under "body") through the shared response handler; the
  real local-reminder tap is NOT VERIFIED. Evidence: docs/evidence/2026-11-07-gap-c3-*.png. Known remaining gap:
  a warm OS deep link while a modal is open is unchanged.
- 4/6 f5b-recenter-padding → main 6fdd7a5. tsc/lint ok, mobile 136/136. Supervisor: unit-tested; on the sim the
  camera stays put after a pan and Recenter with no points was verified (docs/evidence/2026-11-07-gap-f5b-*.png);
  edge margins, single pin and the editor are NOT VERIFIED (no host session). Kept on main: local-only,
  presentation-only, easy to revert.
- 5/6 fg-live-refresh → main b25f1bf. tsc/lint ok, mobile 139/139. qa (Guest 1, not enrolled): face consent view
  pull PASS (spinner shows and stops, view unchanged). Photos of me in the not-enrolled state has no pull by design
  (static "Set up" card; it reloads on focus) and nothing started. Enrolled-state pull and the offline pull NOT
  VERIFIED. Evidence: docs/evidence/2026-11-07-gap-fgl1-*.png. The cross-account matching upload is deferred.
- 6/6 fg-ref-cleanup → main 33bc98c (2 files: mobile/src/lib/face.ts, janitor.test.ts comment). tsc/lint ok,
  mobile 139/139, functions 37/37. No device-visible change (it removes a no-op client remove()). Live evidence:
  deployed room-janitor v8 has the orphan sweep.
- Host-session checks (qa, Simulator_host on 17 Pro + Guest 1/3, supervisor-accepted; live-status log ~1126-1136):
  - Done (sim): F5-5b Recenter clearance with route and pins; camera system prompt shows the full new string
    (docs/evidence/2026-11-07-host-camera-prompt.png); live location two-way and the 3-member movement/speed test
    (simctl location, not a real-device walk).
  - PARTIAL: FG-L1 enrolled pull (no error; spinner not captured).
  - Still NOT VERIFIED: FG-L1 offline pull; cross-account matching upload; C-3 real local reminder tap; N-1 cold
    start (needs a preview/release build); F5-5b single pin and editor map.
  - Known polish: the Pen chip covers the compass. (Fixed by P-1 063e0ba: chip moved top left.)
- Simulator_host (17 Pro 91F3BFB3, created by the human) is a standing test host (human FINAL ~17:50 PST): not in
  any delete or cleanup plan. Only the disposable R1-C host (c2d629c2…, r1c-qa-host-11070111@example.com, room
  82192) is still scheduled for deletion after the 04:03Z check.
- FG-R1 (no migration): a face reference uploaded before a failed enroll_face stays up to about 75 minutes, until
  the room-janitor orphan sweep (1 h age, cron */15) removes it. Deployed room-janitor v8 contains that sweep
  (get_edge_function == repo core.ts:90-97).

## 2026-11-07: J-1 and R-1 (human request: each on its own branch, review, then main; no push)
- J-1 (Join-room keyboard pushed the "5-DIGIT CODE" field under the translucent header on the 17 Pro): fixed in
  6f2a512 (components/ui.tsx Screen: no automatic keyboard inset adjustment on the ScrollView). Supervisor GO;
  main fast-forwarded to 6f2a512. tsc/lint clean, npm test 104/104. [J-1 CLOSED later 2026-11-07, see LS] NOT verified on any device or other model yet
  (human iPhone / qa). Evidence of the bug: docs/evidence/2026-11-06-bug-join-17pro-shifted.png.
- R-1 freehand route (branch r1-freehand-route, replaces tap-to-plot and so F5-2 inside route editing): host
  "Pen" button on the map (or Draw route / Edit route) → the map is locked by a touch layer (no pan, zoom,
  rotate, or building/place selection) → draw with a finger (react-native-svg live stroke) → Done saves through
  set_route (no server change; 2000-point cap) → "Edit route" reopens it with the saved route as the first
  stroke. Pen off unlocks the map to reposition; Pen on locks again. Undo removes the last stroke drawn in this
  edit (never the saved route); Clear empties; Cancel discards. Screen points become coordinates with
  Web Mercator from the region in onCameraMove (lib/route-draw.ts, tests/route-draw.test.mjs); a rotated or
  tilted map is first snapped flat and north-up. tsc/lint clean, npm test 114/114, iOS bundle from Metro 8083
  compiles. NOT verified on a device (no taps available to the developer).
  Supervisor review of 2a1acee: acceptable on code with R1-A/R1-B required; both fixed in the follow-up commit.
  R1-A: a Pen press that must move the camera waits only for that move's report (or 2 s); a report that is
  still rotated/tilted, a timeout or a rejected move clears the wait and shows "Turn the map flat with north up"
  (never a later surprise pen-on). R1-B: a tap (under 2 points) is dropped. N1: with no region yet, Pen moves
  the camera to the screen's own camera to get one ("Move the map a little" only if that fails).
  Open (device check): whether setCameraPosition({coordinates, zoom}) really resets bearing/tilt; a Pen press
  during map deceleration may use the previous region (N3); strokes join end to start as one line; Android
  not covered. Device acceptance list: supervisor message 2026-11-07 (lock, line placement at 2 zooms and after
  a pan, rotate → snap or note, Done → guest sees it live, Edit/Undo/Clear/Cancel, first Pen without a move).

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

## Open work, 2026-11-07 (branches not merged)
- FM-Q A′-2 temporary detection copies (human GO 2026-11-07): commit 2a4249d on branch fmq-detect-copy (parent
  d0ec958). Supervisor review ACK, no blockers; do not merge yet. functions 37/37, mobile 112/112, tsc/lint clean.
  NOT applied/deployed: migration 20261104000022_face_detect_copies.sql, DB test supabase/tests/face_detect_test.sql,
  face-match + room-janitor deploy. Order: migration → DB test → functions → client. Each step waits for the human's OK via qa.
  - (0) EXIF/GPS check PASS (01:43 PST, spare sim, local only, no upload): GPS1.HEIC (consented; GPS 34.015,-118.291,
    Make Apple / iPhone 16 Pro) → the same steps as uploadDetectCopy (manipulate → resize(detectResize) → JPEG 0.85)
    → 1920x2560, 1,260,148 B. Byte-level JPEG walk: no GPS IFD (0x8825), no Make/Model/DateTime, no XMP; EXIF keeps
    only Orientation=1, X/YResolution, ResolutionUnit, PixelX/YDimension; APP13 = empty IPTC + empty-MD5 digest.
    Harness route, sim copies, the ImageManipulator cache file and the scratch copy were deleted. Note (not verified):
    the harness passed raw 5712x4284, so the long edge became 2560; real uploads pass picker dimensions (expected
    upright 4284x5712 → 1440x1920).
  - EXIF verdict (2026-11-07; developer source reading + supervisor fixture/evidence check; no app change): the 2560
    above is the harness input size only; a real detect copy is expected at 1440x1920 (computed, not measured).
    The sideways tile in 2026-11-07-fmq3-guest1-me-tab.png is A2 (bench), not A1 (statue, upright landscape,
    no tag). A2.jpg stores 2000x1500 pixels with Orientation=6; the full APP1 strip during fixture prep dropped that
    tag. Fixture rule: strip GPS only, or rotate the pixels before removing APP1. App path (code reading, not device
    evidence): the manipulator fixes orientation before resize; picker sizes are upright, so preview, detect copy
    and face reference come out upright.
    Known limitation (supervisor: no fix now): face-match/index.ts:112 falls back to the original when no preview
    exists; that original may be HEIC/EXIF, so Rekognition fails that job instead of matching (fails closed, no
    privacy impact). NOT VERIFIED until the human checks on iPhone: portrait HEIC upright as tile and in the viewer;
    a portrait reference saved upright.
  - Was: local EXIF/GPS check of the saved detection JPEG on the spare sim (uncommitted
    keep-file flag, one human-consented GPS-tagged test image, exiftool/sips). Needs that image from the human.
  - Re-check pass criteria: 0 detect_fallback for the 3 jobs, CompareFaces ≤ approved count (expected 3, worst
    case 9), detect/ empty afterwards, DB test PASS right after the migration.
  - Known: (1) a transient failure re-queues the job but the copy is already deleted, so a later run without a new
    copy falls back to the preview (logged as detect_fallback); (2) an enrolled member can upload any image at their
    own detect path and get a false match in their own Photos of me only (low risk); (3) open item: runFaceMatch
    downloads each full original (up to 50 MB) on any network.
- R1-C full-screen route editor: commit bd54600 on branch r1c-fullscreen-pen (based on r1-freehand-route 4fc75b5,
  not on main). The repro (qa, spare sim 91F3BFB3) showed the stack back-swipe taking left-to-right strokes and the
  locked page hiding the route controls. Fix: Modal editor (outside the stack) with its own map, top bar
  Cancel/Done, bottom Pen/Undo/Clear, and strokes through an rngh v3 Pan (native module present in the installed
  dev build). tsc/lint clean, npm test 114/114. Metro 8086 = wt-r1c; 8087 = repro tree. qa spare-sim (a)–(e) +
  Undo PASS (evidence 2026-11-07-r1c-fix-*.png). Not on a real iPhone yet.
- R1-D (strokes ~13 pt low in the editor): fixed in commit 7c5ade6 on r1c-fullscreen-pen. Measured cause: gesture
  points were exact (touch 100,300 → e.x/y 100,300, layer at window 0,0, Modal insets top 62/bottom 34), but
  MapKit's reported region spans exactly 778 pt (= 874 − 62 − 34), i.e. the safe area, centered at y 451 while
  the conversion used 437 → 14 pt low. Fix: regionPoint() moves points into the safe-area frame; unit tests with
  the sim numbers. npm test 116/116, tsc/lint clean. Spare sim: y=300 stroke now at 300.0 pt (was ~311.7)
  (evidence 2026-11-07-r1d-before-offset.png / -after-fix.png). Supervisor ACK. qa re-check on 8086 PASS (touch y300 →
  line y299.6, y650 → 649.7, x matches; evidence 2026-11-07-r1d-qa-recheck.png). Remaining: the human's iPhone check
  (different insets = the real test). Not merged.

## Face matching live test, 2026-11-06 (PASS, supervisor-verified)
- Run plan v2: docs/face-match-connection-test-plan.md. Details and exact IDs: docs/implementation-status.md.
- One `face-match` request at 05:40:25Z made 3 AWS CompareFaces calls (attempts sum 3, no retries):
  - A1↔A2 (same person): similarity 99.998, matched.
  - A1↔B1 (different person): no match ≥ 80, not matched.
  - The existing R2 QA photo (no face): `bad_image`.
- Photos were sent as GPS/EXIF-stripped copies. All subjects consented. Nothing was committed.
- Cleanup by exact ID: users, enrollment, jobs, matches and test media are 0. The 3 storage objects are 0 (janitor
  verified 05:45:03Z). The state file and copies are deleted.
- R5 log check: no keys, image data or tokens in the function logs (developer-run 05:47Z; the supervisor did not
  re-query the logs).
- FACE_MATCH_ENABLED is now OFF: set false by the human at 21:41:34 PST; probe 503 at 05:41:51Z.
  SUPERSEDED: it is ON by the human's final decision (USER_DECISIONS 2026-11-07).
- AWS is on the Free plan; AI-services opt-out not done. AWS-side retention is not claimed.
  SUPERSEDED 2026-11-07 ~17:50 PST: demo/presentation scope only, no real participant photos; the AWS paid plan + opt-out item is out of scope (planning/USER_DECISIONS_2026-11-04_OPERATIONS_EN.md).
- R2 (016c49bf…) ended early by human decision (21:47 PST): expires_at = now() at 05:46:51.861Z (1 row); purged 06:00Z
  (room-janitor cron run succeeded), supervisor zero-count PASS (read 06:00:04Z: rooms/members/messages/media/
  reminders 0, R2 objects 0, face rows 0, room_deleted cleanup job verified_empty 06:00:03Z).
- R1 3514615f… (code 03424) is still live until 2026-11-10T21:43Z (developer read 06:00Z).
- Step 9 (D1 account deletion): PASS, supervisor-verified on the server (live log 20:17 PST), reported by qa.
- F5-1b (iOS location permission string) goes into the next build.

## Final draft QA setup (2026-11-06 ~13:40 PST)
- Approval: planning/CODEX_QA_ADDITIONAL_APPROVAL_2026-11-06.md (at most 3 rooms, exactly 1 disposable account). Steps are in
  docs/reviews/codex-final-qa-steps.md (supervisor-owned). Developer setup notes and generated fixtures:
  docs/evidence/final-qa/SETUP.md. D1 sim: iPhone 17e 6E0F2097-…1773, booted, app installed.
- The LAN IP changed to 172.16.227.159. Dev clients must use http://127.0.0.1:8081, because the old 192.168.1.131 entry is dead.
  Host and guest are waiting on an "Open in Moment?" tap (Codex). The developer has created no rooms or accounts.

## Final draft QA results so far (2026-11-06, sims host 17 / guest 17 Pro, room R1)
- Step 1 status editor (d512dad): host edit/save, alert, guest picker and read-only list PASS on sim; the server matches.
  SE-2 (rename = remove + add; clears holders, the alert says so) accepted as designed.
- SE-1 fixed in 7092911 (Room info and status list refresh live on broadcast notices; host draft guard by code
  review only). Codex re-check PASS: the open guest Info showed "On a break" without a reopen.
- Step 2 Activity UI PASS on sim: Arrived, status, Emergency → host banner → ack → guest "I'm OK" clear; the supervisor
  cross-checked the server rows.
- Step 3a: two-way chat with the keyboard open PASS on the guest. Host FAILED (C-1): the chat was trapped in the Invite modal sheet,
  so the composer was under the keyboard. Fix e5fd2e0 (Invite "Done" → dismiss; C-2 native clear() after Send),
  on main 14:10 PST. C-1 PASS on sim (pushed screen, composer above the keyboard; Invite Done PASS).
- C-2 root cause (trace, 14:21): ~1 ms after Send, iOS inserts the composed word into the input, refilling it after
  any programmatic clear. Fix: remount the composer after Send (lib/composer.ts, key-tagged changes) in f93f7d2;
  trace removed in 2aada21. PASS on sim (empty composer, keyboard stays up, autocorrect works).
- Step 4 media PASS (video + file; server and saved copies sha256 = fixtures). M-1 (saved file named by uuid)
  fixed in cb1d4df (lib/file-name.ts); device re-check pending. main = cb1d4df at 14:24 PST, npm test 87/87.
- Step 3b: the guest app process was frozen 60 s (kill -STOP/-CONT pid 6156, 14:08:54–14:09:55). The app survived, and the host's
  message sent during the freeze appeared on its own (gap-fill PASS). Lifecycle evidence only; failed-send Retry
  is UNVERIFIED on sim (no guest-only network cut exists without admin rights or a Mac-wide change).
- Step 5 map/route accepted. Step 6a: guest location cleared 16:20:35, host showed "Location stale" within ~32–70 s;
  restored 16:22:09.
- F5-3 (world-scale route centered on open water at fixed zoom 15) + F5-4 (setCameraPosition before the native
  view existed): fixed in 57e5ce4 (branch f5-map-camera; cameraFor fit + cameraPosition prop), ACCEPTED on review,
  merge waits for a gap after Steps 6 and 12a. N-3: the fit ignores Mercator/aspect (accepted).
- F5-1 "Show my location" (human decision ADD, 18:16 PST): branch f5-1-show-my-location @ 80eb8b1, supervisor
  ACCEPTED on code review (18:19 PST). Tap-only When-In-Use request, one-shot foreground position, no network
  writes; works with Share off. qa device check PASS on host 17 (simctl location 37.7955,-122.3937); supervisor
  read live_presence = 0 at 02:19:43Z / 02:19:48Z after the tap. main fast-forwarded to 80eb8b1 on supervisor GO.
  Known gap F5-1b: the iOS location permission string in app.json does not mention local-only use ("show my
  location"); unchanged pending a separate decision. N-6 (accepted): if Share was already ON and the permission had been revoked, granting it
  through this button resumes that earlier opt-in.
- Known gap F5-2: a Draw-route tap on a map label opens Apple's place card. Candidate: properties.selectionEnabled
  = !draft (unverified whether the tap then adds a point).
- F7-1 (face reference ≤1280 px failed: resize({}) gave a 0x0 image) fixed in cc97c7f, device PASS (guest enrolled
  16:57:21). F7-2 (gallery missed the cached 'disabled' run; empty copy instead of "off in this draft") fixed in
  5147847, on main 17:01 PST; device PASS in Step 10 (~18:00, final-10-f72-face-off.png), supervisor CLOSED
  F7-2 18:02 PST. Face matching was OFF then (503). The later live test is in the section above.
- Step 7 cleanup PASS (supervisor read: cleanup_jobs verified_empty 01:00:02Z, R1 guest face-refs 0, enrollments 0).
  Step 12 R3 expiry PASS (all R3 rows/objects 0; cleanup jobs verified 01:00:03Z).
- Step 8 Plus preview PASS (alert only, no payment). Step 11 PASS on both sims: R2 016c49bf… expires_at moved
  to now+24h3m with expiry_version 2 (exact-ID, supervisor ACK, 17:49:32 PST); "Room ends in 24 hours" local
  notification at ~17:53 on host and guest; server expiry_reminders = 2 rows v2 (no_token, in_app). Rooms used:
  3 of 3 (R1, R2, R3; R3 purged, R2 purged 06:00Z, R1 live until 2026-11-10T21:43Z); no more rooms. Step 11
  "tap → room opens" UNVERIFIED (sim lock-screen taps read as swipes); [SUPERSEDED: R2 was ended early 05:46:51Z
  and purged 06:00Z, so this natural-expiry check will not run] "gone screen after end" DEFERRED to R2's natural
  expiry 2026-11-08 01:52:32Z (no early end, supervisor).
- Step 10 integrated walkthrough PASS on R2 (supervisor ACCEPTED 18:02 PST): create, code join, chat, arrival,
  status, media save (original verified, 44 KB), map activity start/end, face disabled path (F7-2), leave.
  QR-scan join NOT RUN (no simulator camera; code join used). After leave: R2 members = host only, enrollments 0;
  1 R2/guest face-ref object + its cleanup job still pending at 02:05:37Z (janitor */15), supervisor re-reads.
- FINAL QA REPORT (qa, 18:03 PST, main 5147847): Steps 4, 5, 6, 7, 8, 10, 12 PASS; 11 PASS for fire (sub-items
  above); 9 DEFERRED (human). F7-1, F7-2 CLOSED. Still UNVERIFIED by design: physical-device GPS/background
  stop, face positive match, APNs remote push, Android, host self-location on the sim. Minor findings: Recenter
  clips route/pin edges slightly (5b); map-label tap opens Apple's place card (F5-2). Follow-ups: (1) Step 9 with
  the human; (2) supervisor re-read of the R2 face-ref after a janitor run; [SUPERSEDED: R2 purged 06:00Z, supervisor
  zero-count PASS] (3) post-expiry read of R2 after 2026-11-08 01:52:32Z. Nothing pushed or released.
- Step 9 (D1 account deletion): was DEFERRED; now PASS, supervisor-verified on the server (see the live test section
  above).
  D1 account count 0 of 1.
- D1 (Step 9): sign-up needs no email confirmation (mailer_autoconfirm true); test-only account d1-final-qa@example.com
  (password not in the repo). 17e ready on 127.0.0.1:8081.
- Known gap N-1 (minor, not tonight): the moment:/// deep link pushes Rooms on top of the stack instead of resetting to the root.
- Known gap C-3 (out of scope tonight): a push while any modal is open (reminder notification tap, Upgrade) is
  shown inside that modal.

## Not yet verified
- Host status-list editor (Room info → Statuses; set_status_definitions, no server change): supervisor ACCEPTED
  2026-11-06; npm test 68/68, tsc and lint clean. NOT on a device: no render or edit/save yet, because room 94673 expired
  13:31 PST and new QA rooms wait on human approval.
- Media on a device: photo upload → download → save is a byte-exact PASS (run 2); the remaining items are in Active task. DB tests and full RLS PASS.
- Activity UI (Arrived, status sheet, Emergency banner/ack) on the simulator; chat keyboard-open layout
  and checklist steps 5–10.
- Face matching: server pipeline live PASS on 2026-11-06 (section above). Not yet seen on a device: the in-app
  positive match ("Photos of me" showing a match).
- Face gallery UI (IMPLEMENTED-UNVERIFIED, supervisor ACCEPTED 2026-11-06, FG-1..4 + FG-R1): gallery "Me" segment →
  Photos of me; room/[id]/face.tsx consent (names the external service) → reference (camera/library, JPEG, EXIF dropped)
  → enroll_face; Replace; Stop and remove (remove_face_enrollment; the object is deleted by the next room-janitor run);
  media viewer "Not me" (face_matches.excluded). face-match is invoked only after enroll or while jobs are pending.
  Switch OFF → the UI shows only the "off in this draft" notice. npm test 74/74, tsc/lint clean. NOT on a device.
  Known gaps (updated 2026-11-07 gap fixes): a reference uploaded before a failed enroll_face stays up to about
  75 minutes (room-janitor orphan sweep, FG-R1 33bc98c); camera string fixed (b509d9f); focus/pull refresh added
  (FG-L1 b25f1bf; no pull on the not-enrolled "Set up" card, which refreshes on focus); Photos of me only covers
  the media list the gallery loaded.
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
- AUTH BUG FA1 (2026-11-06, found in F2 setup; FIXED be82fd1, redeployed after supervisor ACK): a valid user JWT (ES256, accepted by
  /auth/v1/user with 200) got 401 from face-match. Cause, reproduced locally with supabase-js 2.118: createClient(...,
  { global: { headers: { authorization } } }) with a lowercase key still sends supabase-js's own Authorization (the API
  key), so auth.getUser() fails with "This endpoint requires a valid Bearer token". delete-account v1 has the SAME code,
  so every signed-in account deletion would have returned 401 (F2 blocked). Fix in both index.ts files: parse
  "Bearer <token>" (missing -> 401) and call auth.getUser(token) on a client without custom headers. Local check of the
  new pattern: valid token ok; missing, garbage, and API-key-as-token -> 401. Needs supervisor ACK, then redeploy of
  face-match (v2) and delete-account (v2), then smoke: no token 401, GET 405, valid JWT -> face-match 503.
  F2 disposable account: 6ff53e9a-d08d-43c1-82a0-fcc164597a0e (tmp/qa-delete-ids.tsv) with avatar, room
  e73a39c6-ba54-46a0-b440-0ad496bddf0d (code 00046, expires 09:32Z) and one message; delete-account not called yet.

- FA1 deploy (2026-11-06 08:35Z): delete-account v2 (get_edge_function source == repo) and face-match v2 (5 files, same
  args), both verify_jwt=false; secrets and FACE_MATCH_ENABLED untouched. Smoke, both functions: no token -> 401, GET -> 405;
  face-match with a valid user JWT -> 503 {"error":"face_match_disabled"} (FM1 path now confirmed live). Same-pattern grep:
  no other function uses global.headers authorization (room-janitor is service role only; sigv4's header is AWS signing).
- F2 account deletion (2026-11-06): POST delete-account as 6ff53e9a (token subject checked first) -> 200
  {"deleted":true,"rooms_ended":1,"media_folders_queued":0} at 08:37:40Z; the old token then gets 403 at /auth/v1/user.
  By exact id, before -> after: auth.users 1->0, profiles 1->0, rooms hosted 1->0 (room e73a39c6 row removed),
  memberships 1->0, messages 1->0, expiry_reminders 1->0; other tables were 0. avatars objects under 6ff53e9a/: 1 -> 1, queued
  as cleanup_jobs a5c1dda7 (avatars, account_deleted, 08:37:40Z), plus room-media and face-refs prefixes for e73a39c6
  (room_deleted). Kept accounts unchanged before/after: test@example.com (edeaea51) auth 1, profile 1, rooms 1 live,
  memberships 1, acks 1, reminders 1; Test joiner (97ed7d32) auth 1, profile 1, memberships 1, messages 4, arrivals 1,
  emergency 1, reminders 1, join_attempts 2. CLOSED after the room-janitor cron run 08:45:00Z (succeeded): avatars under
  6ff53e9a/ 1 -> 0; room-media and face-refs under e73a39c6/ 0; verified_empty_at set on a5c1dda7 (08:45:02Z),
  c9d365df and 1c2476a9 (08:45:03Z), attempts 0, no errors; open cleanup jobs total 0. F2 PASS (server side; no app UI).
  Unrelated job 1a572253 (avatars, avatar_replaced, 08:10Z, verified 08:15Z) covered the test@example.com host (edeaea51)
  old avatar file: the Codex avatar QA replacing the host photo with QA-B around 00:10 PST, before this account existed.
  face-match v2 served source checked against the repo by reading all 5 files (no byte hash): matches.

## F1 moving-speed check (2026-11-06), accepted by the supervisor (MS1/MS2 open for the human)
- Guest 17 Pro (Test joiner 97ed7d32) in room b03236a9 is simulated driving east at 5 m/s from 37.7694,-122.4862.
  The route started at 19:32:59Z, covers about 1.4 km, and ends near 19:37:40Z. Host-side evidence so far:
  docs/evidence/2026-11-06-f1-host-moving-{initial,pin}.png.
- live_presence read at about 40 s: failed, and the error text was lost in a context handoff. The retry
  (db_now 19:34:13.51Z) returned lat 37.7694, lng -122.482215, speed_mps 5, accuracy_m 5, heading 90,
  updated_at 19:34:10.46Z. So the server stores the moving speed.
- Supervisor confirmed the route was cleared to run (Part A done before 19:32:59Z).
- Host map at about 19:34Z (Codex, supervisor checked the screenshot): the pin reads "Test joiner · 18.0 km/h" and the
  row's accessibility text is "18.0 km/h · Updated just now". That matches 5 m/s.
- Stationary read (db_now 19:38:34.68Z, after the route end at about 19:37:40Z): lng -122.470259 (the route end,
  about 1.41 km east of the start), speed_mps 5, heading 90, updated_at 19:38:10.89Z. No later update with a lower speed
  was written, so the last moving speed stays on the row while the guest is stopped. Cause, checked in the code: the
  watch uses distanceInterval 10 m (location.ts:419), so a stopped sim produces no new fixes, and send() skips a fix
  older than 60 s (location.ts:373). The host marks a row stale 60 s after updated_at and shows no speed
  (location-plan.ts:13,57, map.tsx:428). Expected host view: 18.0 km/h until about 19:39:11Z, then the stale clock
  pin. The supervisor confirmed at 19:39:17Z: updated_at still 19:38:10.89Z (age 66 s), no more heartbeats. Correction:
  stale-with-no-speed follows C4, but going stale while still sharing contradicts the heartbeat's purpose
  (location.ts:438); see MS2. Neither is an F1 failure.
- Supervisor findings, both pending confirmation (no code change, fix decision goes to the human): MS1, a stopped
  member keeps showing the last moving speed for about 60-90 s. The heartbeat (location.ts:439, setInterval(send, 5 s))
  re-sends the cached lastFix with speed 5, which wrote the 19:38:10Z row. MS2, a member who is still sharing but
  standing still always goes stale after about 90 s, because iOS sends no fixes with distanceInterval 10 and
  send() stops once lastFix is more than 60 s old (:373). That defeats the heartbeat's stated purpose.
- Timing caveat: no exact stale cutoff is claimed. On the host, the old speed was seen at about 67 s and the pin was
  stale by about 110 s (host-stationary-stale.png). The 19:39:11Z figure above is the code's expected value, not a
  measured one.
- Part C (Codex, about 19:40Z): guest sharing OFF, host ended the activity, both maps show "No activity running".
- Cleanup: `xcrun simctl location 20541309-C36F-4864-94CA-D8A341F70EEB clear` exit 0 at 19:40:54Z. Server at
  db_now 19:40:59.29Z, room b03236a9: live_presence 0 rows; activity_state ended, activity_seq 2, started
  19:32:13.69Z, ended 19:40:07.54Z; location_allowed true (room setting, left as is); share_location false for both
  97ed7d32 (guest) and edeaea51 (host).
- Evidence: docs/evidence/2026-11-06-f1-{host-moving-initial,host-moving-pin,host-moving-pin-visible,
  host-moving-pin-and-row,host-moving-later,host-stationary-stale,host-clean,guest-clean}.png; Codex record
  docs/evidence/codex-f1-map-speed-qa.md.

## MS1/MS2 fresh-fix fix (human-approved 2026-11-06 afternoon), supervisor-accepted with MS-R1, committed 559233d; short QA done
- App code only (mobile/src/lib/location.ts, location-plan.ts, tests); no server change. report_location already writes
  the given speed (null when omitted), so a stationary report clears the old speed on the server.
- Pure helpers (location-plan.ts): reportedSpeed (iOS -1 and non-finite -> null, measured 0 kept); isFreshReading
  (valid coords, device timestamp newer than the last reported reading, at most FRESH_FIX_MAX_AGE_MS 15 s old);
  heartbeatDue (nothing sent yet, or HEARTBEAT_MS 30 s since the last report); planHeartbeat (failure, timeout,
  cached or old reading -> nothing; otherwise the reading with its own speed); withTimeout.
- Reporter: no cached fix is ever re-sent. Watch readings pass isFreshReading + shouldReport (L4) and carry their own
  speed. Every 5 s a tick checks heartbeatDue; if due, getCurrentPositionAsync (High; SDK 58 has no timeout/maxAge
  option, iOS uses CLLocationManager.requestLocation) under a 10 s JS timeout. Failure: permission re-read (lost ->
  existing permissionLost path), otherwise nothing is sent. heartbeatDue is re-checked after the read (L4).
- MS-R1 (supervisor): a failed read did not update lastSent, so a new getCurrentPositionAsync started every 5 s tick
  and timed-out native requests stacked. freshFixAttemptDue now also requires HEARTBEAT_MS since the last attempt
  start, so at most one fresh-fix request per 30 s. Staleness bounds unchanged.
- Accepted residual: after a stop the old speed can still show up to about 45 s (30 s heartbeat + 5 s tick + 10 s
  timeout), until the first heartbeat report replaces it.
- tsc clean, expo lint clean, npm test 61/61 (13 new). NOT verified on device. Device QA (room 94673, cases 1, 2, 3a,
  3b, cleanup, with supervisor additions a-d) waits for the supervisor's go; taps go through Codex.
- Device QA (2026-11-06, simulators, room 94673 b03236a9, shortened for room expiry; supervisor record
  docs/reviews/codex-ms-live-status.md, Codex record docs/evidence/codex-ms-fix-qa.md, screenshots
  docs/evidence/2026-11-06-ms-*.png). Route 5 m/s east 37.7694,-122.4862 -> -122.4845 started 21:17:26Z, ended ~21:17:57Z.
  - Case 1 moving: PASS (host "18.0 km/h · Updated just now"; server speed 5, lng moving east).
  - MS2 (not stale while still): PASS on server and simulator UI. Post-stop heartbeat writes 21:18:22, 21:18:57,
    21:19:32, 21:20:07Z (35 s apart); host never stale in about 130 s.
  - MS1 natural stop (parked end of a `simctl location start` route): heartbeats carried speed 5 (heading null), host
    showed 18.0 km/h at +15/+45/+75 s. Supervisor classification: SIMULATOR ARTIFACT, likely, unproven at the time.
    Follow-up proof (21:23-21:24Z, guest sim, share off, no server writes): locationd's client fixes
    (docs/evidence/2026-11-06-ms-sim-speed-locationd.txt) keep "speed 5.0, course -1.0" every 1 s at the parked
    end of a `simctl location start` route ("No more pending locations"), and switch to "speed -1.0, course -1.0"
    right after `simctl location set`. So the simulator itself reports 5 m/s when parked; the app forwards the
    reading's own speed (-1 -> null). PROVEN at the CoreLocation level for the simulator.
  - MS1 fixed point (`simctl location set 37.7694,-122.4845` at 21:19:59Z, 11 s earlier than planned by a developer
    script error; ms-2-130s.png counts as after the set): next heartbeat 21:20:07Z speed null; host shows no speed,
    "Updated just now". Server PASS, host UI PASS.
  - MS1 on a real device after a real stop: UNVERIFIED. Case 3 (fresh-fix loss, permission revoke): NOT RUN (time).
  - Cleanup: Codex Part C ~21:21Z (guest share off, host End activity); `simctl location clear` exit 0 at 21:22:30Z;
    server 21:22:30Z: activity ended (seq 3), share false for both, live_presence 0.

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

## Pause point, 2026-11-07 (Mac restart)
- FM-Q ①: DONE 2026-11-07 ~19:29Z. Migration 0022 `face_detect_copies` applied (remote 20261107192806);
  face_detect_test PASSED before (dry run) and after; leftovers 0; advisors unchanged. Test fix bfc76ac on branch
  fmq-detect-copy (must be in the main merge). Worktree: session scratchpad `wt-fmq` (recreated after the restart).
  FM-Q ②: face-match v8 + room-janitor v8 deployed 19:33–19:34Z (supervisor GO; verify_jwt=false kept). Smoke (a) probe 200,
  (b) no JWT 401 PASS; (c) 19:45Z cron run detectRemoved 0, no detect_sweep_error PASS. Supervisor ② ACK + ③ GO.
  FM-Q ③ (19:49–19:51Z, room 14479): server-side PASS. CompareFaces 3, A1 100 / A2 99.9986 matched, B1 not matched,
  0 detect_fallback, 0 detect objects left; UI PASS (Me tab A1+A2 only). Supervisor ACK. MERGED: main = bfc76ac.
  Caveat: detect size NOT VERIFIED; real-iPhone HEIC long edge open. Cleanup: test media/enrollment deleted, 4 cleanup jobs
  queued. OPEN: sim photo copies (qa UI), room 14479 expiry 22:37Z → zero-count check, Guest 4 user 49f93ead delete
  (classifier-blocked, human decides).
- R1-C/R1-D: sim PASS (qa), awaiting the human's iPhone check. Not merged.
- R-1 iPhone check (human via qa, 2026-11-07): drawing works, but tapping a store/POI opens the Apple place card.
  Fix c4058f9 on r1c-fullscreen-pen: `selectionEnabled: false` on the route editor and room map (SDK 58 sets
  mapFeatureSelectionAccessory nil). tsc/lint clean, 116/116. Waiting for qa sim check, then the human's iPhone re-check.
  qa sim FAIL on c4058f9: the room-map City Hall POI still opened the place card, because accessory nil is not
  'off' (evidence 2026-11-07-r1-poi-card-still-shows-c4058f9.png). v2 a025558: pointsOfInterest { including: [] } on both maps
  was meant to hide all POIs, but qa sim FAIL: POIs still rendered (evidence 2026-11-07-r1-poi-still-visible-a025558.png).
  v3 cf8af60: NO_POIS (src/lib/map-pois.ts) = excluding all 74 AppleMaps.PointOfInterestCategory values; supervisor code
  ACK. Caveat: categories added in later SDKs are not covered. Option B (editor only) = 405c760 on r1c-poi-editor-only,
  stale (based on a025558). If v3 fails: canary (mapType HYBRID, uncommitted) plus full reload to prove properties reach
  native before any native patch. Trade-off for the human: no store/landmark labels.
  20:5xZ qa found its sim runs of c4058f9 and a025558 had served MAIN (worktree node_modules symlink to main), so those
  two FAILs are not evidence about those commits. Metro 8086 fixed to bundle wt-r1c. qa sim on cf8af60: canary HYBRID
  showed on the room map (props reach native); categorized POIs gone on both maps; some civic POIs (City Hall East,
  Roybal Courthouse, LA Mission, Dept of Public Health) still render, tap highlights the pin but opens NO place card
  (room map, editor pen off); pen on: tap does nothing. Evidence 2026-11-07-r1-canary-*.png, -r1-cf8af60-*.png.
  Canary reverted (never committed). Member marker tap not tested. Next: supervisor review, then the human's iPhone
  re-check (their earlier check also ran main). Not merged.
  Human iPhone check on 8086 = cf8af60 (relayed by qa, 2026-11-07 ~23Z): line lands right under the finger (R1-D PASS),
  no place card. Human chose option B. 85b413c on r1c-fullscreen-pen: room map.tsx restored to c4058f9~1 (diff empty),
  route editor keeps selectionEnabled:false + NO_POIS. tsc/lint clean, 116/116. Waiting: qa sim check on 8086, human
  iPhone look, supervisor merge GO. Local only. 405c760 (r1c-poi-editor-only) is obsolete.
  qa sim PASS of B; human iPhone "B 확인했어" (via qa). Supervisor merge GO → MERGED: main 52df5dd (merge commit of
  r1c-fullscreen-pen @85b413c; base 6f2a512; no conflicts; not pushed). On main: tsc clean, lint clean, mobile 124/124,
  functions 37/37. qa to verify main.
  Polish (non-blocking, supervisor): on the room map the Pen chip overlaps the map compass/location button (top right). [Fixed by P-1 063e0ba.]
- FM-Q ③ caveat resolved (21:0xZ, from logs, no re-run): the ③ sim client DID run the detect-copy code. API logs show the
  app's detect query (media select id,room_id,original_path,width,height for the 3 jobs, 19:50:34Z), then 3 client
  POSTs (Moment/1 CFNetwork) to room-media/<room>/<media>/detect/53d00236….jpg at 19:50:35.355/35.432/36.768Z. face-match
  GET each detect copy (19:50:39.9/43.8/47.1Z) and deleted all 3 (19:50:43–49Z). No detect_fallback in function_logs.
  So the wt-fmq symlink did not affect that run. Still NOT VERIFIED: detect copy size/dimensions; real-iPhone HEIC.
- Room 14479 (e14cb754-f287-43ec-8fe5-3b9811228094) after expiry 22:37Z and the 22:45Z janitor: read 22:48:07Z → rooms 0,
  members 0, media 0, messages 0, storage objects (room-media + face-refs prefix) 0. DONE.
- Guest 4 user 49f93ead-65ae-468b-84be-a273edcec5e3: human ordered deletion directly; 2 execute_sql prompts expired
  unanswered. DELETED 2026-11-07 ~23Z on the human's go (relayed by qa; the human had ordered it directly earlier):
  pre-check anonymous, no email, 0 memberships, 0 objects; delete by exact id; after: users/identities/sessions 0.
