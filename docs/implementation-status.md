# Implementation status

Updated: 2026-11-14 (America/Los_Angeles). Plan: `docs/plan/implementation-plan.md`.

## 2026-11-14: UX2-127 / UX2-128 reminder permission, branch ux2-127-128-reminders (local, from 188b89f, not pushed)

- UX2-127: `syncExpiryReminders(rooms, complete, options?: { ask?: boolean })`. The default still prompts. The Rooms list (`app/index.tsx`) passes `{ ask: false }`, so it schedules only when notifications are already allowed and never shows a cold prompt. The chat-screen call is unchanged. The rule is `permissionStep()` in `lib/reminders-plan.ts`.
- UX2-128: `RemindersOffNote` sits under Room info's Ends card. It reads `getPermissionsAsync()` (no prompt) on mount and whenever the app becomes active. Only when the status is denied does it show an ink2 line and Open Settings (`Linking.openSettings`, 44 pt).
- Verified: `npm test` 860/860, tsc 0, lint 0. Not verified: simulator (no device run).

## 2026-11-14: UX2-114 Emergency-open note, branch ux2-114-emergency-end-note (local, from 188b89f, not pushed)

- End room / End activity (`components/end-confirm.tsx`) and the guest footer in Room info (`app/room/[id]/info.tsx`) read open Emergencies through `useRoomActivity` (read-only) and show `EmergencyOpenNote` (red triangle 13 pt, errorText 15 pt) above the buttons. Copy: `en.emergencyOpen`; logic: `endEmergencyNote()` in `lib/emergency-plan.ts`. Buttons unchanged (UX2-72).
- The host's End room link opens End confirm, so the Leave note is guest-only. The Leave confirm itself is still the system Alert (no text line inside it).
- ux C36 follow-up: one open Emergency shows the nameless line at once and swaps in the name on load (a failed or missing name keeps the nameless line). If the activity read fails: red "Couldn't check for open Emergencies." + Try again (44 pt). If it is slow (> 3 s): ink2 "Checking for Emergencies…" + spinner. End/Leave stay enabled. The guest Leave Alert message is the "Your Emergency is still on…" line while mine is on.
- Try again shows a spinner and reads "Trying again" (busy, disabled) from the press until the reload settles.
- Verified: `npm test` 864/864, tsc 0, lint 0. Not verified: simulator (no device run).

## 2026-11-14: hidden-state sweep (pace, calendar), branch audit2-hidden-states (local, rebased on 0c486a3)

Sweep 8 (target 'Saved' clears on edit), sweep 1 + C14 (event editor waits for the doc, gone event, save/delete
failure lines), sweep 2 (late Ask answer dropped after Cancel), review nits (editor spinner label, no spinner when
signed out), C14 C/D/F on the pace card (finding GPS / still looking after 30 s / location off + Open Settings; Plus
gate only on a confirmed Free plan), C14 E/F on the calendar ('Nothing planned this month.', plan gates on
usePlanState). `tsc` (no errors in tracked files), lint, 800/800 pass. No simulator check yet.

Known gaps:
- Failed delete, month view: `update` puts the new doc in memory before the phone write. If the write fails, the
  editor keeps the event and says "Couldn't delete. Try again.", but the month view already hides the event until
  the next launch, when the stored doc brings it back.

## 2026-11-14: audit2 photos/map + a11y sweep, branch audit2-photos-map (local, not pushed)

Commits c0cd535 (UX2-35 upload row), 9752417 (map pin labels), 2299e2a (Photos tile labels), b8a1b40 (viewer
cross-fade under Reduce Motion), upload-row ink2 contrast, inline error text on errorText. Rebased on dfbf28d. `tsc`, lint, 790/790 pass.

Known gaps:
- Map recenter ignores Reduce Motion. expo-maps 58 wraps `setCameraPosition` in an unconditional `withAnimation`
  (`AppleMapsViewiOS17/18.swift`) and has no `animated` flag. Supervisor: accepted as a known gap, no patch.
- Upload row buttons use 8 pt padding, not the spec's 12 pt, so the labels do not overlap (ux informed).
- Not tested on device: VoiceOver reading of pins and tiles, Reduce Motion cross-fade, rendered upload row.

## 2026-11-14: UX2-03 server, migration 0035 room_ai_plus APPLIED live (human FINAL "적용해", OPERATIONS l.342)

- Pre-check: last applied 20261114081433 room_storage_cap (0033); live set_qrewing_room body md5 bc11be38… = 0028 body (= revert file); 0 idle transactions; 0 test leftovers.
- Live test `supabase/tests/room_ai_plus_test.sql` inside BEGIN…ROLLBACK: ROOM AI PLUS TESTS PASSED. After: 0 c3500000 users, 0 test rooms, no `tests` schema or `made` table, body still 0028.
- PGlite: 0001-0033 + 0035 without 0034 passes, so 0035 does not depend on G1 0034 (0034 touches neither set_qrewing_room nor user_plan); file order stays valid when G1 lands.
- Applied with apply_migration as 20261114094947 room_ai_plus. Post-check: body md5 ba47b172… = 0035 file; one function; security definer; authenticated execute yes, anon no.
- Rollback: `supabase/rollback/20261104000035_room_ai_plus_revert.sql` (restores the 0028 body, md5 bc11be38…; no data change).
- Device check pending (qa).

## 2026-11-13 summary for the human's morning review (nothing pushed)

**Qrewing Calendar (Plus): done.** Server: `recap` with `diary: true` and `calendar_add` (details in the next section), live since qrewing v8. App: calendar month/day views, header icon, Plus upsell, diary card, recap diary on every save path, VoiceOver and dark mode (local main, e.g. 62bf662, 8d8f503, 717036f, 941c08f, 572585b). Evidence: `docs/evidence/2026-11-13-calendar-*.png` (month light, month + day list dark, day list light, header icon, upsell). Edge logs on v8: 22 × 200, 1 × 502 (upstream model 503 on a recap, transient).

**qrewing Edge Function v8 → v11** (each deployed via MCP after supervisor PASS; ACTIVE, verify_jwt=false; deployed source = the commit except the accepted escape-only `EMOJI_RE` line; the test file passes on the deployed copies):

| Version | Commit | What changed | Tests | Rollback to |
|---|---|---|---|---|
| v8 | 288dbea | Calendar: `recap` diary (emoji + 1–3 lines, 3/user/room/24 h) and `calendar_add` (20/user/24 h) | 68/68 | v7 (9e697f9) |
| v9 | 48849f7 | E2E (b) lead group. Root cause: a room with no route and no place pin had no progress basis, so every member was sent `in_lead_group="false"` and the model said "none of them is in the lead group". Fix: optional `anchor` {lat,lng} on ask (the pace screen's start point, never sent to the model; invalid → 400); with no basis the lead flags are left out and `<lead_group known="false"/>` is sent. App side sends the anchor (4c62da2). | 71/71 | v8 (288dbea) |
| v10 | 96c053d | English times clock-first ("3:23 AM today", "9:00 AM on Fri, Nov 13"), fixing "at today at 3:23 AM"; recap, recap refresh, diary and ask prompts never guess gender (names or they/them; Korean: the name). | 73/73 | v9 (48849f7) |
| v11 | c373472 | `<group>` states the progress basis in plain words (`progress_means`); prompt mentions a route only when `progress_from="route"`, fixing "along the route" with no route. | 73/73 | v10 (96c053d) |

qa live check of v10 (supervisor relay): anchor lead group, time phrase and no gendered words PASS. qa retest of v11: PASS (Leo in the no-route room: start-point wording, Mina and Jun named as the leaders; evidence `docs/evidence/2026-11-13-v11-ask-noroute.png`, `docs/evidence/2026-11-13-s11-reshoot-leo-ask.png`). Known limit: progress from a start point or place pin is straight-line, so an out-and-back course can misorder people (same as the pace screen). Left as is by decision: "next Sunday" from Fri Nov 13 → Nov 22 (the editor lets the user correct it).

**Open items**
- Siri on a real iPhone: not yet verified end to end (simulator PASS on iOS 27.2).
- Push: pending the human's approval (the 2026-11-07 one-time approval is used up). Nothing is pushed.
- Video: s11 was re-shot (PASS, Leo asks) and the video recomposed at 12:07 as `output/video/Qrew_Presentation_2026-11-13.mp4`. Scenes s02 and s21 are not in the video (qa).

**App-side fixes merged today (local main):** calendar-lanes (F1 split a room at full days, F2 "+N", spoken labels; s11 ask anchor falls back to my first shared point, kept in memory only), form-a11y-sheet (the date label is read once), consent-sheet-entry e024b9f (a re-present guard; the retry never fired on the device, so it is unproven). Leo's Ask → Rooms kick during the re-shoot was a harness artifact (Metro reloads from merges), not an app bug.

## Simulator install rule: two keychain groups (2026-11-09, keep on every install)

The Supabase session is AES ciphertext in AsyncStorage (`sb-wuhkyjksiiqzoxvonfuy-auth-token`). Its key is
in SecureStore (keychain), see `mobile/src/lib/supabase.ts`. Simulator keychain items are scoped by the
build's `application-identifier` (in the binary's `__TEXT,__entitlements` section). Xcode signs with the
Personal Team `9K6BKSS4U6` when no team is set. Builds from before that team was in use got the
placeholder `FAKETEAMID`. Installing a build from the other group leaves the data in place but the app
can't read its key, so it opens on Welcome signed out (cause of the 891b759 guest sign-out).

| Simulator | Group | Build |
|---|---|---|
| 17 Pro host `91F3BFB3` | `9K6BKSS4U6.com.iyaproject.moment` | normal `expo run:ios` / `xcodebuild` |
| 17 Pro spare `20541309` | `9K6BKSS4U6.com.iyaproject.moment` | normal (since 2026-11-12: a Release build of 335f700, no Metro) |
| "Siri Test 27.2" 17 Pro `56FB44E7` (iOS 27.2) | `9K6BKSS4U6.com.iyaproject.moment` | Release 335f700 (qa, 2026-11-12), guest 'Siri Test' (see accounts below) |
| 17 guest `F11BA960` | `FAKETEAMID.com.iyaproject.moment` | `xcodebuild … -sdk iphonesimulator DEVELOPMENT_TEAM=FAKETEAMID build`, then `simctl install` |
| 17e guest `6E0F2097` | `FAKETEAMID.com.iyaproject.moment` | same as above |
| 17 Pro Max guest 4 `99A2323F` | `FAKETEAMID.com.iyaproject.moment` | same as above (Moment.app → Qrew.app ba7470d, 2026-11-09) |

Every future install keeps its simulator's group. Check it before installing:
`strings <app>/Qrew | grep -A1 application-identifier`. Install over the existing app only. Uninstalling
or erasing loses the session, and the guests are anonymous accounts. No repo config encodes this. The
team value is passed only on the command line.

Live test accounts added after the standing set (delete only with human approval of that exact id):

| Account | Id | Where | Approval |
|---|---|---|---|
| guest 'Siri Test' | `08936e50-13ed-428e-ac6e-3506ab28a87d` | sim 56FB44E7, room AI Meetup QA | human-approved (qa, 2026-11-12) |

## 2026-11-13: Qrewing Calendar (Plus), server side, branch calendar-qrewing (deployed as qrewing v8, not pushed)

Human decision: USER_DECISIONS_2026-11-04_OPERATIONS_EN.md (Qrewing Calendar). Supervisor approved the two design points.
- `recap` with `diary: true`: 200 body adds `emoji` (always present) and `diary` (string[1..3], each ≤ 90 chars, or null). Second Haiku call per member over the stored recap; caller named only if consented; nothing stored; logged as 'recap' with user_id; cap 3 per user per room per 24 h. Without `diary` the body is unchanged.
- `calendar_add` {text ≤ 300, today YYYY-MM-DD, tz IANA}: auth only, no room. 200 {event:{title ≤ 60, start, end (inclusive, ≥ start, ≤ start + 366 d), emoji}}; 422 unclear; 429 rate_limited (20/24 h); 502 ai_failed; 503 ai_not_configured. No Plus check on the server (no plan data).
- Verified: `node --test supabase/functions/qrewing/qrewing.test.ts` 68/68; tsc strict: only the pre-existing `npm:` import errors in index.ts. Deployed 2026-11-13 as qrewing v8 (ACTIVE, verify_jwt=false, via MCP) after supervisor PASS + qa OK; deployed source = 288dbea except an escape-only EMOJI_RE line (deployed copies 68/68). Rollback target v7 (9e697f9). Superseded by v9–v11 (see the summary above).
- **Known debt:** calendar_add usage is logged as action 'ask' with room_id = caller id (`calendarUsage` in core.ts), because 0029 allows only triage|recap|match|ask and counts by room. Counts only, no text. Replace with action 'calendar' and a per-user count in a future migration.

## 2026-11-12 (afternoon): spec 9, spec 10 and a11y on local main 78a9cfe (not pushed)

- Merged (--no-ff): spec 9 entry questions (83397b4, 863129f, 66bb53e, a30765a); spec 10 Qrewing bot (66b98f5,
  b21c94f); spec 10.5 Siri + friendly times (a3b4624, ea1f217); a11y/dark (335f700, 78a9cfe).
- Live: migrations 0028 entry_questions (20261112180712) and 0029 qrewing_ask_usage (20261112183834) in
  list_migrations. Edge Function qrewing v5 ACTIVE, verify_jwt false, deployed from ea1f217 (human 13:05 FINAL;
  supervisor confirmed). Byte check against git: index.ts and prompts.ts identical; core.ts differs only where EMOJI_RE's
  ‍️⃣ escapes were uploaded as literal characters (same match set).
- Siri 10.5: PASS on iOS 27.2 simulator, signed-out and live paths (qa: guest 'Siri Test' 08936e50-13ed-428e-ac6e-3506ab28a87d in AI Meetup QA, 'This room ends tomorrow at 3:17 AM.', usage ask/haiku 1145/27). Real iPhone: runs, but the server takes 4.0-4.2 s (latency work in progress: branch qrewing-latency d528797, not deployed). Test Siri on iOS 27.2 sims (26.5 has FB23504349).
  Signed-out run: qa ~18:32 on 56FB44E7, Release 335f700 (2026-11-12-siri-272-prompt.jpg, 2026-11-12-siri-272-signed-out.jpg).
- Open: ExpoApplication crash in the Release build (developer-event is fixing it).
  26.5 history: ea1f217 Debug rebuild (prebuild --clean) installed over the
  existing app on host 91F3BFB3 (9K6BKSS4U6) and guests F11BA960, 6E0F2097, 99A2323F (FAKETEAMID); app-id checked
  before and after. Each installed app has Metadata.appintents (AskQrewIntent, provider 4Qrew12AppShortcutsV) and
  INAlternativeAppNames[0] "Qrewing". The Shortcuts tile "Ask Qrewing" shows, but running it fails with "Couldn't find
  AppShortcutsProvider" (2026-11-12-siri-unable-to-run.jpg, 2026-11-12-siri-shortcut-fail-log.txt). A Release build
  (no debug dylib, provider in the main binary) on the spare fails the same way (2026-11-12-siri-release-spare-unable.jpg),
  matching Apple forum thread 836585 / FB23504349 (iOS Simulator 26.5 through 27.0 beta 2, Apple's sample too). No code
  change.
- A11y/dark: per qa, 44 pt targets and dark mode PASS. VoiceOver announcements are NOT verified.
- Open (not changed): app.json `web.output: "server"` turns on API-routes server export in `expo export:embed`, so any
  Release/EAS iOS build fails at "Exporting server" (PlatformColor is not a function, web eval in Node). The app has no
  +api routes. The spare's test build used `EXTRA_PACKAGER_ARGS=--skip-server`. Needs a decision: web.output "single"
  or --skip-server in the build profile.

## 2026-11-12: Qrewing AI on main b9d031c, now eeeafd9 (local, not pushed)

Authority: USER_DECISIONS 2026-11-12 FINAL entries (Qrewing AI build, API key set by the human, expo-speech + one
rebuild, grace (b), janitor */5, the 0027 sitting "해도 돼"; that file's 2026-11-12 lines are in the main checkout, not yet
committed) plus the qa-as-proxy entries of the same day. Requirements: planning/QREWING_AI_REQUIREMENTS_EN.md.

**What main b9d031c contains**
- Backend (qrewing-backend → 5ae3f10): migration 0027 qrewing_ai, APPLIED LIVE (remote version 20261112105302 for local
  file 20261104000027, content byte-identical to the reviewed 9a4cdb6; treat as one migration in a later CLI push).
  Before and after the apply its test file ran on the live DB in one transaction ending in ROLLBACK: no FAIL, 0 leftovers. Edge Function qrewing v2 = d30438f (deployed, id
  8befc29d, verify_jwt false; v1 = 23e1423 was live ~7 min and never called). room-janitor v10 (grace-aware, cron */5).
- event (cf19e4d, 84a97b6, post-merge 03320df, ux-polish 8ae6c98) and pace (8edef43, 0a1854b, post-merge c982ebf,
  demo-replay 9a7c18f), all --no-ff. Checks on b9d031c: tsc 0, npm test 446/446, expo lint 0; Deno node tests 47/47.
- After qa's pass: 61ba26e (keyboard 70f850d, copy-grace 40fd48f, pace-privacy-notes 004951d, status 323b873), 0266bc3
  (cost model, docs), eeeafd9 (grace host name 0a42742). Checks on eeeafd9: tsc 0, npm test 449/449, expo lint 0.
- GitHub push snapshot 9975963 (branch qrew-push-snapshot-2; parent qrew/main 8147215, fast-forward; mobile/ and
  supabase/ = eeeafd9; 272 files; secret scan clean; supervisor PASS). NOT pushed: waits for qa's explicit go.

**Simulator build**
- Signed rebuild from 55948fd (expo-speech is native; b9d031c added JS only), installed over the existing app on all
  5 sims with each keychain group kept (table above): app-id identical before and after, no account created.
- Metro :8093 from .claude/worktrees/qrewing-merge is the single Metro while qa tests. Bundle check: 33 route paths
  from qrewing-merge, 0 from any other tree.
- Lessons: (1) worktree Metros share node_modules AND $TMPDIR/metro-cache + metro-file-map-*, so a second Metro running
  (:8092) made :8093 serve another worktree's routes even after --clear. Run one Metro, delete those caches, start with
  --clear, recount routes before reporting. (2) a new worktree has no mobile/.env.local (gitignored); copy the main
  checkout's (public keys only), or a clean bundle throws "Missing EXPO_PUBLIC_SUPABASE_URL".

**qa results (simulators; LS "~04:00 PST qa: Qrewing AI pass on main b9d031c" and "~04:06 PST main 61ba26e rechecks")**
- First real AI calls (private.qrewing_usage): match claude-sonnet-5-5 667 in / 67 out; triage claude-haiku-5-5 587 in /
  42 out; recap claude-sonnet-5-5 493 in / 105 out (one recap call per room). The API key, SDK 1.3.0 output_config path
  and structured output are verified live.
- People to meet: the host listed with a sensible reason (2026-11-12-qrewing-first-ai-call-people-to-meet.jpg).
- Mute small talk: chit-chat hidden ("1 message hidden"), the room-change message shown as "Important: Announcement"
  (2026-11-12-qrewing-mute-important.jpg).
- Entry: consent sheet, F1 (header Save with the keyboard up, Return moves fields), https:// link validation, E2.6d
  Discard (2026-11-12-qrewing-e2-6d-discard-alert.jpg). E2.5k after 70f850d: Chat-gate path and Info path PASS, header
  stays (2026-11-12-qrewing-e2-5k-chat-gate-header-pass.jpg).
- Pace stop scenario: live card frozen during the stop, "You've stopped for 3 minutes. Everything okay?" sheet, then
  1.27 km · 6:22 · 5:01 per km with the stop excluded (2026-11-12-qrewing-pace-stationary-sheet.jpg). Sports rooms only.
- Early end → grace → recap: 30-minute copy on the confirm (2026-11-12-qrewing-end-room-30min-copy.jpg); guest sees
  "Recap and photos available until …", chat closed, recap card, Photos buttons (2026-11-12-qrewing-grace-recap.jpg);
  host recap with the pace line (2026-11-12-qrewing-host-recap-pace-line.jpg).
- Photos of me in grace: only the matching photo "Likely you"; Save original during grace verified 1.8 MB
  (2026-11-12-qrewing-photos-of-me-match.jpg, 2026-11-12-qrewing-grace-save-original.jpg).
- Grace host name (0a42742) on eeeafd9: "Shared by Host" on the host's photo (2026-11-12-qrewing-grace-shared-by-host.jpg).

**Open for the human**
- Account deletion: a host's account deletion ends their rooms at once, with no 30-minute grace (0021/0027 as built).
  Whether it should follow the grace is a human decision (decision (b) covers only a host's early end).
- The biometric (face data) category declaration for the store listing.
- The privacy and store notes draft docs/evidence/qrewing-privacy-and-store-notes.md: its UNVERIFIED items stay open.
- The GitHub push of snapshot 9975963: on qa's explicit go only.

**Not verified**
- Spoken pace cues: audible voice (the TTS engine loaded in the app, but nobody heard it on a simulator) and a stop
  cutting the speech; the silent switch; behaviour on a network drop.
- Anything on a real iPhone: every Qrewing result is from simulators (GPS by simctl, simulator audio).
- The recap refresh near the end; match/triage failure paths live (unit tests only: M1 cooldown 2 min/10 min/24 h,
  M2 model-failed rows final and counted in the 300/day cap).

## 2026-11-09: Place and time unit (migration 0026), pre-apply test
- Branch qrew-pt (c40ccd5, 68abdec). Human go-ahead typed in the developer session; the rollback run of
  0026 + supabase/tests/room_place_time_test.sql on project wuhkyjksiiqzoxvonfuy (execute_sql, one transaction
  ending in ROLLBACK) returned "ROOM PLACE TIME TESTS PASSED".
- Read-only check after it: 0 test users, no tests schema, 0 new rooms columns, one create_room with 5 args,
  preview_room with 7 output columns, 0 test rooms. The live database is unchanged.
- APPLIED live 2026-11-09 after a separate human go-ahead ("0026 적용"): apply_migration room_place_and_time,
  remote version 20261109230223 (file 20261104000026; remote versions are apply timestamps, as before).
  Read-only checks after it: rooms has the 4 nullable columns and the 5 rooms_place_* constraints; create_room
  has one signature with 9 args; preview_room returns 11 columns; anon cannot execute either RPC and
  authenticated can; 2 existing rooms, 0 with any new field set. Security advisors: no new lint type; the
  new create_room and preview_room show under the existing "authenticated SECURITY DEFINER" WARN like every
  other public RPC.
- App UI (2026-11-09, uncommitted → see commit "Place and time UI"): optional fields on Create room (place name,
  Find on map via expo-location geocodeAsync = Apple CLGeocoder with no permission, tap the map to move the pin,
  Remove pin, Add start time with the @expo/ui SwiftUI DatePicker limited to now..close−1 min); Invite preview
  (Q 01.04: map only with a pin → place card with Open in Maps sheet (Apple/Google) → date and time card; nothing
  added when unset); Room info (same cards under the Ends card); Rooms row (one extra line "place · start" when
  set; type and ends-in kept). Pure helper src/lib/place-time.ts with tests/place-time.test.mjs (10 tests).
  database.types.ts compared with generate_typescript_types (live): same fields; preview_room place fields kept
  `| null` (the generator cannot see nullability of a returns-table); update_room_expiry Returns gained the 4 fields.
  Checks: tsc 0, expo lint 0, mobile 300/300. NOT VERIFIED on a simulator (map card, DatePicker, Maps sheet,
  geocoding, create with/without place/time). Branch qrew-pt is not merged into main.
  Later the same day: qa PASS on qrew-pt 62d8fdd (fixes) and 28bd04f (moved note); merged --no-ff to main
  e89cf85 (see Feature status).

## 2026-11-07: J-1 and R-1 (human request: each on its own branch, review, then main; no push)
- J-1 (Join-room keyboard pushed the "5-DIGIT CODE" field under the translucent header on the 17 Pro): fixed in
  6f2a512 (components/ui.tsx Screen: no automatic keyboard inset adjustment on the ScrollView). Supervisor GO;
  main fast-forwarded to 6f2a512. tsc/lint clean, npm test 104/104. NOT verified on any device or other model yet
  (human iPhone / qa). [Closed 2026-11-07: sim screenshots 2026-11-07-j1-join-*.png plus the human's iPhone
  statement; J1-R1 stays open, minor.] Evidence of the bug: docs/evidence/2026-11-06-bug-join-17pro-shifted.png.
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

## Current checkpoint

Final draft QA, 2026-11-06 PST (simulators: host iPhone 17, guest iPhone 17 Pro; main 5147847; npm test 103/103, tsc and lint clean). Detail and evidence: `docs/CURRENT_STATE.md`, `docs/reviews/codex-final-qa-live-status.md`, `docs/evidence/2026-11-06-final-*`.

| Step | Result |
|---|---|
| 4 media, M-1 file name | PASS |
| 5 route + activity | PASS (item 6 not run per plan); F5-3/F5-4 fixed 57e5ce4 |
| 6 location loss | PASS (stale, permission Never, stale pin identity F6-1 6e97015) |
| 7 face gallery, disabled path | PASS; F7-1 fixed cc97c7f; server removal verified |
| 8 Plus preview | PASS (alert only, no payment) |
| 9 account deletion (D1) | DEFERRED: needs the human (17e access prompt, D1 password); accounts 0 of 1 |
| 10 integrated walkthrough (R2) | PASS, supervisor accepted 18:02 PST; QR-scan join NOT RUN (no sim camera) |
| 11 24 h reminder | PASS: local notification on both sims ~17:53, server 2 rows v2; tap → room opens UNVERIFIED (sim input); gone screen after end DEFERRED to 2026-11-08 01:52:32Z |
| 12 expiry/cleanup (R3) | PASS (app denial + server 0 rows/objects) |

Closed this session: F7-1, F7-2 (device-verified). Still UNVERIFIED: physical-device GPS/background stop, face positive match, APNs remote push, Android, host self-location on the sim. Minor open: Recenter clips route/pin edges (5b), map-label tap opens the Apple place card (F5-2). Follow-ups: Step 9 with the human; supervisor re-read of the R2/guest face-ref after a janitor run (pending at 02:05:37Z); post-expiry read of R2. Fixtures: rooms 3 of 3, accounts 0 of 1. Not pushed or released.

Earlier checkpoints:

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
Checkpoint 3d, F1b join gate (2026-11-04): implemented, verified, committed as 0f867a5. Supervisor review: passed with one required fix, F6.
- F6 (IPv6 /64 grouping), migration `supabase/migrations/20261104000009_join_gate_ipv6_prefix.sql`, remote `join_gate_ipv6_prefix` (20261104224145): new `private.normalize_ip(text)` maps IPv6 to its /64 network (`2001:db8:1:2::/64`), IPv4-mapped IPv6 to the plain IPv4 address, IPv4 to itself, an unparseable value to the trimmed raw string, and empty to null. `private.request_ip()` returns the normalized key, so only the HMAC of that key is stored. Budgets are unchanged. Verified by the RLS suite (see the verification log). Waiting for supervisor review of F6.
- Migration `supabase/migrations/20261104000008_join_gate.sql`, remote `join_gate` (20261104223409). Shared `private.join_gate(kind)` called first in `preview_room` and `join_room`. Failures only, 10-minute window. Code path: 10 per user, 30 per IP. Stress mode, entered when there are more than 200 global code-path failures: 1 per user, 5 per IP. Token (QR) path: 20 per user, 60 per IP, with no stress mode. Advisory transaction locks on the user key and then the IP key. The failure row is written and the function returns normally, and PT429 is raised only before any insert. A member over budget can still preview or join its own room. Read-only transactions (GET) are rejected with PT405 before any lookup. IP: `cf-connecting-ip`, then the last hop of `sb-forwarded-for`, then the last hop of `x-forwarded-for`. Only an HMAC-SHA256 with a server-side random salt (`private.join_gate_secret`) is stored. Attempts older than 24h are deleted in batches of 100 on each gate call (pg_cron is not installed).
- Header trust, live probe with forged headers through the API gateway (temporary function, dropped afterwards): a client `cf-connecting-ip` is rejected by Cloudflare (error 1000); a client `sb-forwarded-for` is overwritten by the gateway; a client `x-forwarded-for` is prepended ("1.2.3.4,<real ip>"), so only its last hop is trusted.
- Residual risk (100,000 possible codes, N active rooms; expected guesses to hit any room ≈ 100,000/N):
  - One IP, normal mode: 180 guesses/h. N=100 takes about 5.6 h; N=1,000 takes about 33 min.
  - A distributed attacker who triggers stress mode is limited to 5 per IP per 10 minutes, and each guess needs a new anonymous account (Supabase anonymous sign-in limit: 30/h per IP). That gives about 30 guesses/h per IP. Unverified for IPv6 (N8): Supabase's anonymous sign-up limit is probably keyed on the full address, so an attacker who rotates addresses inside one /64 may not be held to 30 accounts/h. The join gate itself now groups by /64 (F6). CAPTCHA on anonymous sign-in remains the backstop (human decision, undecided). With 10 IPs (300/h): N=100 takes about 3.3 h; N=1,000 takes about 20 min.
  - A hit exposes the room preview (name, type, member count). A join is visible in the member list, and the host can rotate the invite or end the room.
  - Further mitigations: CAPTCHA on anonymous sign-in (human decision), longer codes (product decision).
  - Side effect: during stress mode, a legitimate user who mistypes a code once is blocked on the code path for 10 minutes. QR entry and re-opening one's own rooms are unaffected.
- Throttle copy (human decision recorded in the review doc): `en.rooms.errors.throttled` is now "Too many attempts. Try again in a few minutes, or scan the room's QR code to join." (`mobile/src/i18n/en.ts`, uncommitted). Verified 2026-11-04 on the simulator against live Supabase. The guest exhausted the token budget with invalid `moment://join/<token>` links, and the preview screen shows the new copy (`docs/evidence/checkpoint3d-throttle-copy-qr.png`). Raw API check with a temporary anonymous user: attempt 21 returned HTTP 429 `{"code":"PT429",...}`. That user (c3daec5e-eaee-49a0-bfe2-329c4b2f9d69) and its 20 join_attempts were deleted by exact id, and the recheck count is 0. `tsc` and `expo lint` exit 0.
  - Earlier "old copy on device" was stale Metro again: it had been started with `CI=1` (no file watching) before the edit. Do not start Metro with `CI=1` during development.

Checkpoint 4, realtime text chat (2026-11-04). Backend verified, UI not verified. Committed locally as "Chat backend (UI unverified)".
- Server: migration `supabase/migrations/20261104000010_chat_text_body.sql`, remote `chat_text_body` (20261104230737). Check constraint `messages_text_body_present`: a `text` message needs a non-blank body (the 4000-character cap already existed). `messages` is in the `supabase_realtime` publication (verified via `pg_publication_tables`).
- Client: `mobile/src/lib/chat.ts` (`useChat`): latest 50 newest-first, older pages by `lte created_at` with de-duplication by id, Realtime `postgres_changes` INSERT on `room_id`, refetch of the latest page after every (re)subscribe and on return to foreground, client-generated UUID so the realtime echo replaces the optimistic row, failed sends kept with Retry/Delete. `room/[id]/index.tsx` is now the chat screen (inverted `FlatList`, `KeyboardAvoidingView` offset by header height, "Reconnecting…" while not subscribed, "Former member" for senders who left). Members and Leave/End moved to the new `room/[id]/info.tsx` screen. Copy in `en.chat`.
- `rls_test.sql`: new message cases (blank, null, over 4000 characters, edit denied). Test fix: the three F1b IP-hash assertions counted the whole live `join_attempts` table and failed on 40 real rows left by earlier QA. They are now scoped to the fixed test users (`a0000000-0000-4000-8000-%`).
- Verified 2026-11-04:
  - Full `rls_test.sql`: PASSED (`RLS TESTS PASSED`, developer session via `execute_sql`; afterwards the `tests` schema count is 0).
  - Three live clients (host account, anonymous guest member, anonymous outsider; Node + supabase-js 2.118.0 from `mobile/`, publishable key): 14/14 PASS. Guest→host delivered live in 855 ms; host→guest delivered live; sender gets its own echo with the client id; outsider got 0 realtime events, 0 REST rows, and its insert was rejected; blank body rejected; member REST read returned the join notice + 2 texts; after the guest left, the host stayed live and the guest received 0 new events. The script lives in the session scratchpad (`realtime_chat_check.mjs`) and is not part of the repo.
  - `npx tsc --noEmit` exit 0, `npx expo lint` exit 0.
- Supervisor F7 (client-settable `messages.created_at`): migration `supabase/migrations/20261104000011_messages_server_created_at.sql`, remote `messages_server_created_at` (20261104232854). BEFORE INSERT trigger `messages_set_created_at` runs `private.set_created_at_now()` (plpgsql, security invoker, `search_path = ''`, execute revoked from public/anon/authenticated) and overwrites any client value with `now()`. RPC inserts of system/arrival/emergency rows also get server time, which they already used. `rls_test.sql` adds: insert with `created_at '2099-01-01'` succeeds, the stored row has `created_at = now()`, and no visible message has a future `created_at`. Full suite re-run 2026-11-04 after the migration: `RLS TESTS PASSED`. Security advisors after the migration: no new finding (same known INFO/WARN set).
- Supervisor review: F7 PASSED (2026-11-04).
- N10 paging over 50 messages: `supabase/tests/chat_paging_test.sql` (new). It seeds 130 texts with tie groups at both page boundaries, then replays the client paging from `chat.ts` as a member: desc by (created_at, id), limit 50, `created_at <= oldest`, de-duplicate by id, stop under 50. It checks that every row arrives exactly once, in newest-first order, over at least 3 pages, and that the F7 trigger is active again after the seed. Run 2026-11-04 via `execute_sql`: `CHAT PAGING TESTS PASSED`, "131 rows over 3 pages" (130 + join notice). Rolled back. Residue check afterwards: users `b0000000-…` 0, rooms 0, messages 0, trigger `tgenabled = 'O'`. Known limit: more than 50 messages sharing one exact `created_at` would stall paging. Client inserts are separate transactions with microsecond timestamps, so this cannot happen in normal use. NOT covered: the client merge code itself (no JS unit test runner yet) and scrolling in the UI.
- AWS steps only the human can do: `docs/aws-rekognition-human-steps.md` (region, CompareFaces-only IAM user, Supabase secrets, budget alert, rights-cleared test photos, and the AI-services opt-out decision, which needs AWS Organizations and so separate human approval).
- NOT verified: chat UI on the simulator (two simulators, send/receive, retry, reconnect, keyboard). `agent-device` was blocked by the auto-mode classifier; the Expo MCP automation screenshot errored (no local expo-mcp tunnel). The human decided to HOLD OFF on UI automation; no substitute driver is used. Evidence stays pending.
- QA cleanup (2026-11-04, human-approved, done by the supervisor session by exact id in one transaction): both chat QA rooms (799e442f-…, 4e547baf-…) and all 8 users (hosts da0bdfb8-…, 458c588b-…; anonymous 53404022-…, 63c579d2-…, 54f82441-…, 9e565893-…; plus 5eac392e-… and dfa92ecf-…) with their join_attempts. Recheck by the supervisor: users, profiles, rooms, members, messages, join_attempts all 0. `cleanup_jobs` has 8 rows waiting for the expiry worker. No fixtures remain.
- Node v24.22.2, npm 11.19.1, Xcode 27.2 (27B52), CocoaPods 1.17.0 (installed via Homebrew 2026-11-04), iOS 26.5 simulators.
- Expo SDK 58.0.23 (npm `latest` tag, matching the SDK 58 template), React Native 0.88.1, React 19.3.0, TypeScript ~6.0.3, Expo Router ~58.0.30, expo-dev-client ~58.0.18.
- Bundle ID / Android package: `com.iyaproject.moment`. URL scheme: `moment`. Display name "Moment" (working name).
- Supabase: one project, `wuhkyjksiiqzoxvonfuy` ("hyang486's Project", us-east-2, Postgres 17). It was empty at inspection (no public tables, no migrations, no buckets).
- Supabase auth settings (from `/auth/v1/settings`, re-checked 2026-11-04 after the human's report): `external.anonymous_users: true`, `mailer_autoconfirm: true` (Confirm email off, the development setting the human selected).
- EAS CLI: `npx eas-cli@latest whoami` prints "Not logged in". No EAS project is linked.
- The `supabase` CLI binary at /opt/homebrew/bin/supabase exits with 137 in this session. Use the Supabase MCP tools instead.
- No physical iOS device is connected (`xcrun devicectl list devices` shows simulators only).


Face matching scaffolding (2026-11-04, no AWS calls made, nothing deployed):
- `supabase/functions/face-match/`: `provider.ts` (FaceProvider interface, error kinds), `sigv4.ts` (Web Crypto SigV4), `rekognition.ts` (CompareFaces over signed fetch; reads config passed in), `core.ts` (`processBatch`: late-result guard before the call and a conditional write after it, retries up to 3, auth error aborts the batch, logs job id + error kind only), `index.ts` (Deno handler: needs `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, returns 503 if any is missing; a signed-in member processes only their own enrollments; NOT deployed and not type-checked under Deno, since Deno is not installed).
- Tests: `node --test supabase/functions/face-match/face-match.test.ts` -> 11/11 pass, no network. They include the AWS documentation SigV4 vector, the late-result guard in both positions (enrollment gone before the call, deleted during the call), retry/fail rules, and a check that the secret never appears in the request.
- Client: `mobile/src/lib/face.ts` (`enrollFace`, `removeFaceEnrollment`): uploads to `face-refs/{room}/{user}/ref-{uuid}.jpg`, then `enroll_face`. No screen uses it yet. `tsc` and `expo lint` exit 0.
- NOT verified: any real Rekognition response (the response parsing follows the AWS docs only), the Edge Function under Deno, the reference-photo and target-photo size/format limits on real photos (Rekognition takes JPEG/PNG up to 5 MB inline; originals may be HEIC or larger, so the target is the preview image), the similarity threshold of 90 (a guess to tune on real photos).
- Review fixes F8-F10 (2026-11-04, offline): F8 `enrollmentAccess` is read immediately before each provider call (room deleted or expired, or member gone -> no call; room closed marks the job failed `room_closed`) and a deleted or not-ready photo skips the call; 3 new tests. F9 `FACE_MATCH_ENABLED` must be exactly `true` or the handler returns 503 before any other work; switch procedure is in `docs/aws-rekognition-human-steps.md` (on only during the rights-cleared test, off afterwards until the opt-out decision). F10 `face.ts` uploads an ArrayBuffer (refuses 0 bytes) and uses `expo-crypto` `randomUUID`; object size > 0 must still be checked once a UI path exists. N11: matching runs only when the enrolled member's app calls the function (no background worker); UI copy must say results can take until the member opens the room. N12 (janitor): sweep orphaned `face-refs` objects with no enrollment older than ~1 hour.
- Re-enroll cleanup ruling (supervisor): the trigger queues only the exact old `ref_path` on re-enroll; prefix jobs (leave, room end) delete only objects created before the job's `created_at`. To be implemented and tested in the janitor checkpoint (after a re-enroll and a janitor run, the new ref survives and the old one is gone).
- Previously open design issue, now ruled (above), found while writing the upload: `enroll_face` deletes the old enrollment on re-enroll, and `on_face_enrollment_deleted` queues cleanup of the whole prefix `face-refs/{room}/{user}/`. That prefix also holds the newly uploaded reference, so the future janitor would delete the new file. Needs a fix before the janitor exists (for example: the janitor skips a prefix while an enrollment for that room/user exists, or the trigger queues the old `ref_path` only).
- Janitor checkpoint (2026-11-05 UTC): migrations `20261104000012` and `20261104000013` and Edge Function `room-janitor` (v1) were applied/deployed by an earlier developer session before supervisor pre-review; supervisor accepted the applied state afterwards. Remote version ↔ local file (N14): `20261105034706 cleanup_reenroll_and_requeue` = `20261104000012_cleanup_reenroll_and_requeue.sql`; `20261105034837 janitor_invocation` = `20261104000013_janitor_invocation.sql` (the MCP apply assigns its own timestamp; earlier versions follow the same order by name). No cron schedule exists; it waits for supervisor review of J1/J2.
- J1 (local, not deployed): cleanup claim order is `attempts`, then `created_at`, so failing jobs cannot starve newer ones; `jobsStuck` in the run summary counts jobs at 5+ failed attempts and logs `cleanup_stuck` (job id only). J2 (migration `20261104000014_janitor_health.sql`, applied 2026-11-05 as remote `janitor_health`, with the J2a fix: each invoke copies visible pg_net responses into `private.janitor_runs` because pg_net drops `net._http_response` after ~6 h; uncaptured runs older than 6 h show `unknown_expired`): `invoke_janitor` records each pg_net request id in `private.janitor_runs`; `private.janitor_health()` reports each run as `ok` (HTTP 200, no error), `failed` (other status or transport error), `missing_response` (none after 5 minutes) or `pending`, plus the stuck-job count. Test: `supabase/tests/janitor_health_test.sql`. `room-janitor` v2 (J1) deployed. Cron: `cron.schedule('room-janitor', '*/15 * * * *', 'select private.invoke_janitor()')` was approved by the supervisor but the call was denied by the Claude Code auto-mode classifier; NOT scheduled, waiting for the human.
- N16: the live exact-path deletion (re-enroll job for the old ref) was not exercised live because the prefix job removed the file first; covered by the unit test only. Re-check when the face enrollment UI exists. N15: the orphan sweep lists the whole face-refs bucket each run (acceptable at current scale).

## Face-match AWS connection test — SETUP READY (2026-11-06 20:53 PST), no AWS call yet

Plan: docs/face-match-connection-test-plan.md (Run plan v2, supervisor ACCEPTED 21:00 PST entry). Human decisions
20:55 PST (relayed by qa): reuse R2 19455 (3 calls OK), anonymous A and B allowed, switch set false by the human,
GPS-stripped copies.
- Stripped copies: new 0700 folder in the developer scratchpad (outside the repo). APP1/APP13 removed; re-parse shows
  "GPS present: no" for A1, A2 and B1; each still decodes 2000×1500. Originals unchanged; nothing copied into the repo.
- Script change (after the supervisor accepted sha 018ad87c): an EARLY switch probe as A right after sign-in, before any upload or
  enroll (A has no enrollment then, so the call cannot reach AWS). New sha b53d20fa…, `node --check` OK.
- `prepare 19455` 04:53:08–04:53:13Z: users A c8c0a435-ae17-4754-8406-52a8daaece0b, B 5c7d983a-381c-4792-a2de-a52b742bff52
  (anonymous); EARLY probe 503 face_match_disabled; media A2 fcb02275-54ff-4f1a-9eba-ca2f0e82ab29, B1
  0484b078-e9d3-4a40-a5f3-6afd4b0d1667 in room 016c49bf-17dc-4ab7-8a5c-3f4376f0c160; enrollment
  3e4963fe-ee2a-4689-bb84-68df37b615e0 (1 face-refs object under A's folder); jobs queued 3, attempts 0; PRE-SWITCH
  probe (T0) 04:53:13Z 503 face_match_disabled.
- State file (A/B refresh tokens + IDs): OS temp dir, mode 0600. Deleted at R6.
- T1: human set FACE_MATCH_ENABLED=true at 21:39:57 PST (relayed by qa); supervisor GO.
- `match` (one request, 05:40:25Z): HTTP 200 {claimed 3, done 3, matched 1, retried 0, failed 0, stale 0,
  providerCalls 3}. **A2 similarity 99.998, matched=true; B1 similarity null (no match ≥ AWS floor 80), matched=false;**
  other (existing R2 QA photo 2df2d468…, no face) matched=false, job error `bad_image`. Calls = sum of attempts = 3, as
  expected. face_matches rows 3. First live CompareFaces positive and negative result.
- T2: human set FACE_MATCH_ENABLED=false at 21:41:34 PST (relayed by qa). `probe` 05:41:51Z → 503 face_match_disabled.
- Cleanup (R6, exact IDs, one transaction, ~05:42Z): delete enrollment 3e4963fe… (trigger queued A's face-refs folder;
  jobs/matches cascaded); queued room-media cleanup for the exact A2/B1 folders (media delete has no trigger); deleted
  media A2/B1, R2 memberships of A/B, and auth users A/B (`is_anonymous and email is null`). Read after commit: users 0,
  enrollments 0, jobs 0, matches 0, test media 0; R2 back to host only + its 1 original QA photo. 3 cleanup jobs
  queued (verified_empty_at null); 3 storage objects remain until the next room-janitor run.
- Local: state file and the stripped-copy folder deleted, `test ! -e` OK (05:42:58Z). No photo in the repo.
- Janitor 05:45Z: the 3 cleanup jobs have verified_empty_at 05:45:03Z; read at 05:45:29Z shows 0 objects under A's face-refs
  folder and the A2/B1 room-media folders. R6 complete.
- AWS-side retention is not claimed (step 6 option (b): no opt-out tonight).
- R5 log check (done 05:47Z, after the supervisor had already logged it as developer-reported): function_logs +
  function_edge_logs 04:50–05:47Z, 23 lines. 0 lines match AKIA/secret/base64/JPEG-base64/token=/X-Amz-. The only
  function event is `provider_error` {job c8a03c3c…, kind bad_image} (the no-face QA photo); edge logs show only
  method/status/URL.
- R2 early end (human 21:47 PST, supervisor ACK): `UPDATE public.rooms SET expires_at = now() WHERE id =
  '016c49bf-17dc-4ab7-8a5c-3f4376f0c160'` ran at 05:46:51.861Z, 1 row (expiry_version 2). Purge by the scheduled
  room-janitor run (06:00Z); supervisor reads R2 afterwards.
- Docs follow-up (qa instruction, 22:00 PST): (1) `docs/CURRENT_STATE.md` updated with today's result; (2) the
  "NOT DEPLOYED" header comment in `supabase/functions/face-match/index.ts` corrected (comment only, no redeploy).
  (3) Proposed commit, NOT committed, waiting for human approval (`git status` at 06:00Z confirms):
  `M docs/CURRENT_STATE.md`, `M docs/implementation-status.md`, `M supabase/functions/face-match/index.ts`,
  `?? docs/face-match-connection-test-plan.md`, `?? scripts/face-match-check.mjs`. Not included: the scratch
  GPS-strip script (scratchpad, outside the repo) and the other unrelated working-tree changes.
- R2 purge: room-janitor cron run 766 at 06:00:00Z succeeded; supervisor zero-count read 06:00:04Z PASS. CURRENT_STATE
  and the index.ts comment were ACCEPTED; doc fixes CS-1..CS-5 applied 06:01Z.

## Verification log

| Check | Command | Result |
|---|---|---|
| No nested repo | `find . -name .git -not -path ./.git` | none |
| 0033 room storage cap, live (2026-11-14, human approved, supervisor PASS c91ea47) | pre-check; `capacity_b_test.sql` on live in BEGIN…ROLLBACK; `apply_migration`; post-check | pre: last 0032, media_integrity md5 = 0015 body (11ab723e…), no helpers, 0 idle tx. Live test PASSED, 0 leftovers. Applied as `20261114081433 room_storage_cap`. Post: media_integrity md5 = 0033 body (f74e9854…), both helpers SECURITY DEFINER with EXECUTE revoked from public/anon/authenticated, trigger BEFORE INSERT OR UPDATE on public.media, security advisors unchanged vs baseline. Local PGlite run of the same test also PASSED. App upload flow against live not yet tested. |
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
| RLS test after migration 8 `join_gate` (2026-11-04) | `execute_sql` with full `supabase/tests/rls_test.sql` (ROLLBACK) | `RLS TESTS PASSED`. F1b cases: per-IP 30 blocks a fresh user on the same IP (join and preview), QR token still works on the blocked IP, forged first XFF hop ignored, other IP not blocked, read-only join/preview → PT405, 31 IP-tagged rows with 64-hex hashes and 2 distinct hashes, stress mode (1 attempt then PT429, QR joins, member re-opens own room by code), failure rows persist. Follow-up: `tests` schema 0, users 0, rooms 0, join_attempts 0, storage.objects 0 (cleanup_jobs 4 are the earlier 3b/3c rows) |
| F1b live concurrency + GET (2026-11-04) | node script with 3 fresh anonymous users via `/auth/v1/signup`, REST `/rpc/*` | User A, 20 parallel bad-code `join_room`: 10×200, 10×429 PT429. User B, 20 parallel bad-code `preview_room`: 10×200, 10×429. DB rows: exactly 10 failures each (match the non-429 count), one 64-hex `ip_hash`. User C: `GET /rpc/preview_room` and `GET /rpc/join_room` → HTTP 405 PT405, no rows. Users and 20 attempts deleted by exact UUID (anonymous, no email); recheck users/profiles/join_attempts/rooms 0 |
| Advisors after migration 8 | `get_advisors` security + performance | No ERROR. New: INFO `rls_enabled_no_policy` on `private.join_gate_secret` (intended, no client access); INFO unused index `join_attempts_ip_idx` (empty table). Otherwise as before (WARN security-definer RPCs x20, anonymous-access policies, INFO unused indexes) |
| RLS test after migration 9 `join_gate_ipv6_prefix` (F6, 2026-11-04) | `execute_sql` with full `supabase/tests/rls_test.sql` (ROLLBACK; remote `normalize_ip`/`request_ip` definitions checked first) | `RLS TESTS PASSED`. F6 cases: `normalize_ip` mapping (two /64 addresses incl. upper case, IPv4-mapped, IPv4, garbage, empty); U13–U15 fail 10 each from 3 different addresses in `2001:db8:1:2::/64`, then a fresh user from a 4th address in that /64 gets PT429; a different /64 (`2001:db8:1:3::d`) is not blocked; `::ffff:203.0.113.7` hits the IPv4 203.0.113.7 budget (PT429); an unparseable header still runs the gate (null, no error); 30 rows under one `ip_hash`. All earlier cases still pass. Follow-up: `tests` schema 0, `a0000000-…` users 0, profiles 0, join_attempts 0 |
| Advisors after migration 9 | `get_advisors` security + performance | No ERROR, no new finding. Same as after migration 8 (WARN security-definer RPCs x20 and anonymous-access policies, intended; INFO `rls_enabled_no_policy` x4 on service-only tables; INFO 4 unused indexes) |
| Metro connection | `CI=1 npx expo start --dev-client --port 8081`, then `xcrun simctl openurl <udid> 'exp+moment://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'` | "iOS Bundled 1556ms node_modules/expo-router/entry.js (1285 modules)"; screenshot `docs/evidence/checkpoint1-devclient-sim.png` |
| Cleanup enqueue SQL test (migration 12) | `execute_sql` with `supabase/tests/cleanup_enqueue_test.sql` (ROLLBACK) | `CLEANUP ENQUEUE TESTS PASSED` (exact old ref queued on re-enroll, no whole-prefix job, enrollment points at new ref, flag does not leak, re-queue refreshes `created_at`, room delete queues both prefixes) |
| Janitor live run 1 (2026-11-05, supervisor approved) | fixtures: anonymous users `55c40051-f81a-4542-9799-74a1cac2bf84`, `8e4d2b20-a227-4f19-92df-08173d19f216`; rooms `d0000000-…-000000000001` (expired) and `…0002` (live, active enrollment → `ref-new.jpg`); media `e0000000-…0001/0002`; real Storage API uploads as the member; `created_at` backdated by SQL; then `select private.invoke_janitor()` | precheck: only the test room expired. `net._http_response` id 1: HTTP 200, `roomsDeleted 1, jobsVerified 13, jobsRetrying 0, objectsRemoved 6, orphansRemoved 1`. room-media 3→0, face-refs 6→2. Prefix job queued 90 min ago removed `ref-old` (3h) and `orphan-old` (2h), kept `ref-new`, `orphan-recent` (newer than the job) and `orphan-sweep` (80 min); orphan sweep then removed `orphan-sweep` (>1h, no enrollment) and kept `orphan-recent` |
| Janitor cleanup + live run 2 | exact-ID deletes of media, room `…0002`, both anonymous users (is_anonymous, email null); member Storage delete returned `[]` (RLS), objects not deleted by SQL; second `invoke_janitor()` | id 2: HTTP 200, `jobsVerified 3, objectsRemoved 2`; afterwards storage.objects 0 in both buckets, unverified cleanup_jobs 0, users/profiles/rooms/media/enrollments 0, cron jobs 0 |
| Janitor unit tests | `node --test supabase/functions/room-janitor/janitor.test.ts` | 6/6 pass (incl. J1 stuck-job test) |
| Janitor health test (0014 + J2a) | `execute_sql` with `supabase/tests/janitor_health_test.sql` (ROLLBACK) | `JANITOR HEALTH TESTS PASSED` (ok, failed 500, failed transport error, missing_response, pending, unknown_expired, captured-then-expired = ok, stuck count, authenticated denied) |
| room-janitor v2 manual run | `select private.invoke_janitor()` → request 3; `private.janitor_health()` | v2 ACTIVE; health row `3 ok 200`, stuck_jobs 0; body includes `jobsStuck: 0` (v2 code), nothing to clean |
| Media integrity (migration 15, 2026-11-05) | `execute_sql` with `supabase/tests/media_integrity_test.sql` (ROLLBACK) | 22 expectations pass (`ready` only when the original object exists with size > 0; size copied from Storage; paths `{room_id}/{media_id}/`) |
| RLS test after migration 15 | `execute_sql` with full `supabase/tests/rls_test.sql` (ROLLBACK; media paths updated to `{room_id}/{media_id}/`) | `RLS TESTS PASSED`. Follow-up: `tests` schema 0, `a0000000-…` users 0, media 0, room-media objects 0 |
| Media client static checks | `npx tsc --noEmit`, `npx expo lint` in `mobile/` | both exit 0 (gallery, viewer, `lib/media.ts`; initial gallery fetch runs from the realtime subscribe callback). On-device upload/download NOT verified |
| S1 QA cleanup: execution (2026-11-05, human decision in planning/USER_DECISIONS_2026-11-04_OPERATIONS_EN.md) | `execute_sql`, one transaction: `delete from public.rooms where id = '88aecc77-aba7-4d70-8a4e-ef45d3163e73'`; `delete from auth.users where id in ('39785f4d-3c9a-4b84-bae8-cf6ce8ced730', '08ed7282-a2d4-4b18-86ba-6233b06620e0', '3515d17a-b824-4632-8d40-8298afdbee39')` (exact IDs, no wildcards) | committed without error |
| S1 QA cleanup: verification (read-only) | count by each exact ID | room 0, room_members 0, host 0, guest 0, outsider 0, profiles 0. Kept (out of scope): room 031bc8aa-… 1, the 2 pre-existing users 2 |
| FM-Q ① migration 0022 `face_detect_copies` (2026-11-07, human OK + supervisor GO/ACK; branch fmq-detect-copy 2a4249d, test fix bfc76ac) | Supabase MCP: advisors + `list_migrations` → `execute_sql` dry run (0022 body + `face_detect_test.sql`, ROLLBACK) → `apply_migration` → `face_detect_test.sql` again (ROLLBACK) → leftovers + advisors | Pending before: only 0022. Dry runs #1/#2 stopped in test setup (`storage.protect_delete` blocks direct SQL deletes; `rooms_check` on expiry), test fixed in bfc76ac; dry run #3 `FACE DETECT TESTS PASSED`. Applied as remote `face_detect_copies` (20261107192806); header comments shortened, SQL statements identical to the file. After apply: `FACE DETECT TESTS PASSED`. Leftovers 0 (fdtests schema, e0… users, rooms, media, enrollments, objects, detect objects); media_integrity trigger enabled; authenticated/anon cannot execute `janitor_detect_objects`. Security advisors identical to the 19:22Z baseline (INFO 5, definer WARN 22, anon-policy WARN 19, leaked-password WARN). Edge Functions (②) NOT deployed. |
| FM-Q ② Edge Function deploy (2026-11-07, human OK + supervisor ① ACK / ② GO) | `node --test supabase/functions/*/*.test.ts` on bfc76ac → MCP `deploy_edge_function` (bfc76ac files, `_shared/detect.ts` as `../_shared/detect.ts`) → `list_edge_functions` → smoke (no AWS) | Tests 37/37. Before: face-match v7, room-janitor v7, both verify_jwt=false. After: face-match v8 (19:33Z), room-janitor v8 (19:34Z), both ACTIVE, verify_jwt=false. RPC `janitor_detect_objects(integer)` exists, service_role only. Smoke: (b) POST without JWT 19:34:23Z → 401 unauthorized; (a) `{probe:true}` as a throwaway anonymous user with no enrollment (e2cacb5d-226e-47d1-a2f3-3004034458ac) 19:34:25Z → 200 {enabled:true}; that user was deleted by exact id (users/members/enrollments 0). (c) cron run 19:45:00Z (net._http_response 257): HTTP 200, `detectRemoved 0`, all other counts 0; function logs only `booted`, no `detect_sweep_error` (the 19:30Z v7 run had no detectRemoved field). Smoke PASS. No call with `{}` or jobIds. |
| FM-Q ③ simulator re-test (2026-11-07, supervisor ② ACK / ③ GO; qa ran the UI on Metro 8088 = wt-fmq bfc76ac) | qa: Host 17 Pro 91F3BFB3 uploaded stripped A1/A2/B1 (md5 c756e70f/104fa739/dfb08430) to room 14479 (e14cb754-f287-43ec-8fe5-3b9811228094) ~19:49:55Z; Guest 1 17 F11BA960 enrolled A1 ~19:50:32Z. Developer: `execute_sql` read of face_jobs/face_matches/media/storage.objects + `query_logs` from 19:49Z | 3 jobs done, attempts 1 each, last_error null → CompareFaces 3 (≤9). A1 f2af7ee8 similarity 100 matched; A2 f2fdeaa5 99.9986 matched (11-06: 99.998); B1 4dae7ec9 null, not matched (11-06: null). Function logs: 2 boots + 1 POST 200 (19:50:33Z), no event lines → 0 detect_fallback, 0 provider_error, 0 detect_delete_failed. Storage: 3 original + 3 preview + 1 face-refs ref, 0 detect objects. Detect JPEG size not measured directly (copies deleted after use); originals are 2000x1500, so the expected size is 1920x1440. Server-side PASS, supervisor ACK. UI PASS (qa, 19:52Z): Guest 1 Me tab shows exactly A1 + A2 as "Likely you", B1 absent (`docs/evidence/2026-11-07-fmq3-guest1-me-tab.png`); "Saving your reference..." ~1.5 min, first Me-tab load ~8 s. Caveats: detect size NOT VERIFIED (inferred only); real-iPhone HEIC/orientation case (long edge 2560 in the 01:43 harness run) is an open follow-up. Also (supervisor, from the Me-tab evidence): the A1 tile renders rotated 90°, most likely because the test-copy strip dropped APP1 and with it the EXIF Orientation tag. The real-device check must confirm that previews and detect copies come out upright. Client path (re-checked 2026-11-07 ~21:0xZ after the worktree node_modules symlink finding): the logs show the app's detect query (19:50:34Z), 3 client POSTs to room-media/e14cb754/<media>/detect/53d00236….jpg (19:50:35–36Z), and face-match GET + delete of each, so the A′-2 client ran in this test. Supervisor accepted; re-run cancelled. The real-iPhone HEIC/orientation check must also measure the detect copy's long edge, for example with a temporary uncommitted dev-console log of the resized dimensions. Merged: main fast-forwarded to bfc76ac (functions 37/37, mobile 112/112, tsc/lint clean on main). Cleanup (supervisor GO, exact ids, ~20:0xZ, one transaction): queued room-media cleanup for the 3 media folders, deleted enrollment 53d00236-8f2d-4bbb-80d5-60cc36c47a8a (trigger queued face-refs e14cb754…/6d56bc27…/) and media f2af7ee8/f2fdeaa5/4dae7ec9; read after: media 0, enrollments 0, jobs 0, matches 0, members 3 (kept), 4 cleanup jobs queued. Stripped local copies (bb71b23c scratchpad fmq3-photos) deleted, `test ! -e` OK. OPEN: sim photo-library copies on 17 Pro 91F3BFB3 / 17 F11BA960 (need UI deletion by qa); room 14479 left to expire 22:37:16Z, then zero-count check after the janitor; anonymous user 49f93ead-65ae-468b-84be-a273edcec5e3 ("Guest 4 QA ProMax", not e2cacb5d, no rooms/objects): deletion requested by the human via qa, blocked by the auto-mode classifier, waiting for the human. |

## Feature status

Refreshed 2026-11-12 (main b9d031c; Qrewing rows final from qa on b9d031c/61ba26e/eeeafd9). Qrewing AI rows added at the end of the non-deferred rows; the U6 and
Copy code / Qrew rows reconciled with their merges (a6702b1, 860e938). Earlier refresh: 2026-11-09 (main e89cf85). "verified" means a recorded qa/supervisor PASS on simulators or a live server check; nothing below was run
on Android, and only items marked "human iPhone" were seen on a physical device. CS = docs/CURRENT_STATE.md, IS = this file,
LS = docs/reviews/codex-final-qa-live-status.md (supervisor-owned). Evidence files are under docs/evidence/. Rows from
"Android" down are deferred items.

| Feature | Status | Evidence | Why / limits |
|---|---|---|---|
| Host accounts (sign-up, log in, log out, session restore) | verified | checkpoint2-host-signup-rooms.png, checkpoint2-welcome-sim.png; IS verification log "Simulator auth flows"; 2026-11-09-qrew-u2-login.png, 2026-11-09-qrew-u2-signup.png | Simulator against the live backend, plus the Q-style host forms in U2 (human accepted U2). |
| Guest entry (anonymous, name step, signed-out Join → code/link → name → preview) | verified with limits | checkpoint2-guest-rooms.png; 2026-11-09-qrew-u2-i10-case1-in-room.png, 2026-11-09-qrew-u2-i10-case3-warm-preview.png, 2026-11-09-qrew-u2-i10-malformed.png; LS 2026-11-09 qa U2 final head e8db927 | Warm link, code and malformed-link cases PASS. Not verified: a cold-start link (the dev build opens the dev launcher; needs a release build) and Scan → name. |
| Guest → host upgrade | verified with limits | checkpoint2-upgraded-profile.png; 2026-11-09-qrew-u2-k2-email.png, 2026-11-09-qrew-u2-k2-password.png | Same user id kept (live server check); upgrade sheet keyboard K2 PASS. Not verified: host login while an invite is held. |
| Account deletion | verified | 2026-11-06-final-9-d1-confirm.png, 2026-11-06-final-9-d1-deleted.png; CS line 437 and "F2 account deletion"; 2026-11-09-qrew-u5-delete-confirm.png | D1 in-app deletion PASS, server-verified (rows and storage gone after the janitor). The U5 Q-style confirm was checked with Cancel only. |
| Profile (rename, photo, Q 07.01 cards, Edit profile) | verified | checkpoint2-upgraded-profile.png; 2026-11-05-avatar-5-final-host-17.png, 2026-11-05-avatar-qa-developer-checks.md; 2026-11-09-qrew-u5-profile-host.png, 2026-11-09-qrew-u5-profile-guest.png, 2026-11-09-qrew-u5-edit-profile.png | Avatar set/replace/remove is seen by the co-member, and the janitor removes replaced files. Map pins have no tap callout (by design). |
| Create room (type, length, statuses, defaults) | verified | checkpoint3b-room-host.png; 2026-11-06-final-1-host.png (status editor); 2026-11-08-rc-g7-a-sports-default.png, 2026-11-08-rc-g7-b-event.png, 2026-11-08-rc-g7-d-after.png; 2026-11-09-qrew-u2-create.png | Sports 3 h and Event 4 d defaults, hint with no seconds, and the host status-list editor PASS. The status default list is the sports list for every type (out of scope, human may choose). |
| Join by 5-digit code (incl. invalid code, throttle, keyboard J-1) | verified | checkpoint3b-preview-guest.png, checkpoint3b-invalid-code.png, checkpoint3b-throttle.png; 2026-11-07-j1-join-17pro-keyboard.png, 2026-11-07-j1-join-17-keyboard.png; 2026-11-09-qrew-u2-code-typed.png | J-1 is closed: sim screenshots plus the human's iPhone statement (LS ~00:3x PST 2026-11-07). Code paste was not tested on the simulator. |
| Join by deep link / invite link (incl. N-1 root reset, warm link while a modal is open) | verified with limits | checkpoint3c-new-link-preview.png; 2026-11-07-gap-n1-warm-from-deep-stack.png; 2026-11-07-p3fix-2-invite-join.png, 2026-11-07-p3fix-4-upgrade-join.png; 2026-11-09-qrew-u2-i10-guest-link.png | The warm signed-in link PASSES. Not verified: a cold start (needs a release build). Known minor gap: when signed out, an empty Rooms screen shows briefly before Welcome (2026-11-07-gap-n1-signedout-transient-rooms.png). |
| Join by QR scan | not verified | 2026-11-09-qrew-u2-scan.png (Scan screen, denied → Open Settings PASS) | The simulator has no camera, so a live scan never ran. See the deferred row "Real QR scan". |
| Invite screen (QR, code, share, reissue) | verified with limits | checkpoint3b-invite-host.png; checkpoint3c-invite-before.png, checkpoint3c-reissue-confirm.png, checkpoint3c-invite-after.png, checkpoint3c-old-code-invalid.png; 2026-11-09-qrew-u5-invite.png, 2026-11-09-qrew-u5-reissue-confirm.png | QR rendering, code and reissue (old code and link rejected) PASS. Not verified: what the share sheet contains. Reissue in the Q style was checked with Cancel only. Copy code was deferred (see that row). |
| Invite preview (Q 01.04) and Invite unavailable (Q 07.03) | verified | 2026-11-09-qrew-u1-d-nonmember.png, 2026-11-09-qrew-u1-d-member.png, 2026-11-09-qrew-u1-d-largest-type.png; 2026-11-09-qrew-u2-unavailable.png; 2026-11-09-qrew-pt-7-expired-invite.png | Order, pinned Join, largest type and dark mode PASS; an expired code shows Invite unavailable. The U6 change (a preview that is already open flips to unavailable when the room ends) is in its own row. |
| Place and time (0026): Create, preview, Info, Rooms row, Open in Maps sheet | verified with limits | 2026-11-09-qrew-pt-3-preview-code.png, 2026-11-09-qrew-pt-3-info.png, 2026-11-09-qrew-pt-3-rooms-row.png, 2026-11-09-qrew-pt-f2-sheet-preview.png, 2026-11-09-qrew-pt-f2-sheet-info.png, 2026-11-09-qrew-pt-f1-xl-create-pickers-17pro.png, 2026-11-09-qrew-pt-f3-moved-note.png, 2026-11-09-qrew-pt-f4-pin-dropped.png, 2026-11-09-qrew-pt-f5-area-label.png, 2026-11-09-qrew-pt-note-xl.png; LS "15:42 PST" and "16:58 PST" qa entries; IS place-and-time section (live apply checks) | The 0026 rollback test and the live apply were checked read-only. qa PASS at 62d8fdd and 28bd04f; merged in e89cf85. Not verified: Create at largest type on the 17e itself (no host account there). Google Maps opens the web page on the simulator. |
| Chat: realtime, keyboard, gap-fill, Q 03.01 head and tabs | verified | 2026-11-06-final-3-host-keyboard-fixed.png, 2026-11-06-final-3-c2-fixed-3.png, 2026-11-06-final-3b-guest-gap-received.png; 2026-11-09-qrew-u3-keyboard.png, 2026-11-09-qrew-u3-f1-chat-17.png, 2026-11-09-qrew-u3-f1-chat-17e.png | Two-way realtime chat, composer above the keyboard (C-1/C-2), gap-fill after a 60 s freeze, and the U3 tabs PASS. At the largest type the Arrived/Set status chips truncate (N3). |
| Chat: failed-send Retry | not verified | IS Feature status (old) / CS "Final draft QA results" Step 3b | The simulator cannot cut the network for one app. See the deferred row "Network-off errors". |
| Media: upload, download, Save, Share, filters, chat share lines | verified with limits | 2026-11-06-final-4-guest-uploaded.png, 2026-11-06-final-4-host-video-saved.png, 2026-11-06-final-4-host-file-saved.png; 2026-11-08-rc-g5-a-uploaded.png, 2026-11-08-rc-g5-b-video-detail.png, 2026-11-08-rc-g3-host-chat.png; 2026-11-07-g1-mine-17pro.png; 2026-11-09-qrew-u5-grid.png, 2026-11-09-qrew-u5-media-detail.png, 2026-11-09-qrew-u5-original-saved.png, 2026-11-09-qrew-u5-c1af50a-save.png | Photo, video and file uploads; byte-exact originals (sha256); video not transcoded; Mine/Others filters; Save and Share PASS. Not verified: real-iPhone HEIC upload and orientation, the video/file detail screens in Q style, the video share line and the failure path (G3 d/e), and 3-digit-km style edge values. |
| Media: downloaded originals deleted from the app cache (N5) | not verified | LS supervisor review of c1af50a; 2026-11-09-qrew-u5-c1af50a-save.png (Save works) | The code was reviewed and Save/Share were re-run on c1af50a, but nobody checked the device cache folder after Save or Share. |
| Camera access is off screen (Q 07.04) | not verified | CS U5 section ("Real device only"); 2026-11-08-rc-g9-e-denied.png (older alert text) | The simulator reports the camera as unavailable before it asks, so this screen cannot appear there. See the deferred row "Camera denied on a real device". |
| Face matching: consent, enroll, Photos of me | verified with limits | 2026-11-07-fmq3-guest1-me-tab.png; IS verification log "FM-Q ③"; 2026-11-06-final-7-consent.png; 2026-11-09-qrew-u5-me-intro.png, 2026-11-09-qrew-u5-setup-face.png, 2026-11-09-qrew-u5-17e-xl-consent-end.png | Live AWS CompareFaces matched the same person and not the other person; the Me tab showed only the matching photos. U5 consent (all five points, incl. Rekognition) can be reached at the largest type; in U5 Agree was not pressed. Not verified: real-iPhone HEIC/orientation and the size of the detect copy. Demo scope only, no real participant photos. |
| Face matching: "Not me" | not verified | CS "Not yet verified" (face gallery list) | No QA record of tapping "Not me" (face_matches.excluded) was found in any source. |
| Location sharing, map markers, speed, stale | verified with limits | 2026-11-06-ms-1-moving.png, 2026-11-06-ms-2-130s.png, 2026-11-06-ms-2b-fixed.png; 2026-11-06-final-6c-host-stale.png; 2026-11-07-host-live-move-t2.png, 2026-11-07-host-live4-t1.png; 2026-11-08-rc-g2-a-host-map.png, 2026-11-08-rc-g2-e-stale-pill.png, 2026-11-08-rc-g4-a-recenter-v3.png | Opt-in sharing, name · speed, stale clock pin, status on pills, and grouped labels all PASS using `simctl location` (3 and 4 members). Not verified: GPS movement and stopping on a physical device, the background stop, and MS1 after a real stop. |
| Route pen / editor, km chip, Recenter | verified with limits | 2026-11-07-r1d-qa-recheck.png; 2026-11-08-rc-g8-a-host-chip.png, 2026-11-08-rc-g8-e-undo.png; 2026-11-09-qrew-u4-f2-strokes-corners.png, 2026-11-09-qrew-u4-f2-after-save-recenter.png; 2026-11-07-host-f5b-recenter-se-corner.png | Strokes land under the finger (sim, and the human's iPhone for R1-D), and Undo/Clear/Cancel/Save, the km chip and Recenter clearance PASS. Not verified: the editor on the 17e, Recenter with a single pin. At the largest type, Draw/Undo/Clear truncate (N4). |
| Arrival, statuses, Emergency (incl. resolved line, XL reachability) | verified | 2026-11-06-final-2-host-arrival.png, 2026-11-06-final-2-host-emergency.png, 2026-11-06-final-2-host-cleared.png; 2026-11-07-rc-g1-a-host-map.png, 2026-11-07-rc-g1-d-host-after-ok.png; 2026-11-08-rc-db-emergency-resolved.png; 2026-11-09-qrew-u3-emergency-viewer.png, 2026-11-09-qrew-u3-emergency-resolved.png, 2026-11-09-qrew-u3-status-sheet.png; 2026-11-09-qrew-u5-f2fix-sender-chat.png, 2026-11-09-qrew-u5-f2fix-two-emergencies.png | Arrived, the status sheet, Emergency → I see it → I'm OK, the 0023 resolved line, and U5 F2 (actions reachable at largest type on 17e) PASS. Not run: the viewer on Map/Info and "Open last shared location" at largest type. |
| Activity start / end | verified | 2026-11-06-final-5-host-end-confirm.png, 2026-11-06-final-5-host-ended.png; 2026-11-08-rc-db-activity-lines.png; 2026-11-09-qrew-u4-end-activity.png | Start/End, the 0024 chat lines, the U4 confirm screen (Keep, swipe, double tap) and the Allow-sharing switch PASS. The airplane-mode error path was not run. |
| Expiry deletion (room-janitor) | verified | IS verification log "Janitor live run 1/2"; CS lines 932-933 (room 14479 zero-count) and 433-435 (R2 purge) | The cron job (*/15) deletes rows and storage at expiry or end. This is a live server zero-count check, not a screenshot. |
| RLS read-time denial at expires_at | verified | IS verification log (RLS suite rows); IS checkpoint table Step 12 (R3); checkpoint3b-invalid-code.png | The RLS suite and an app-side denial after expiry PASS against live data. |
| 24 h / last-hour reminder | verified with limits | 2026-11-06-final-11-host-notification.png, 2026-11-06-final-11-guest-notification.png; 2026-11-08-rc-g6b-notifications.png, 2026-11-08-rc-g6b-1-host-nc-2312.png; 2026-11-07-gap-c3-after-tap-room.png | The local notification fires on both sims, and the 0025 short-room rule PASS. Tap → room was tested only with a simctl push payload; a real tap on the local reminder is not verified. |
| Room ended screens (Chat, end confirm, Info gone state) | verified with limits | 2026-11-09-qrew-u4-chat-after-end.png, 2026-11-09-qrew-u4-guest-after-end.png; 2026-11-09-qrew-u5-room-ended.png, 2026-11-09-qrew-u5-room-ended-guest-live.png | Chat flips to Room ended while open, with the closed-at line. On main, Photos left open at expiry keeps a stale grid (2026-11-09-qrew-u5-after-expiry-photos-stale.png); U6 fixes this (next row). |
| U6 G-U6-1: Photos & files, Map, Info, Face, media detail, Camera access is off and Invite switch to Room ended when the room ends while open; Preview shows Invite unavailable once its end time passes | verified with limits | LS 2026-11-09 "U6 final QA (qa) PASS rows 1-25" (e89cf85 + qrew-u6 044346d); docs/evidence/2026-11-09-qrew-u6-index.html; merged main a6702b1 | qa PASS (a)-(d): each screen switches at close, End room in 1-2 s, back-nav, preview → Invite unavailable. Not run: (e) a direct deep link into an ended room. |
| End room / leave | verified | checkpoint3b-room-guest.png (leave/rejoin); 2026-11-09-qrew-u4-end-room.png, 2026-11-09-qrew-u4-after-end-room.png, 2026-11-09-qrew-u4-guest-rooms-after-end.png, 2026-11-09-qrew-u4-guest-leave-alert.png | End room on a throwaway room (the guest sees it ended) and the Leave alert PASS. On shared rooms, the U5 confirms were checked with Keep/Cancel only. |
| Notifications (local only) | verified with limits | 2026-11-06-final-11-host-notification.png, 2026-11-06-final-11-guest-notification.png; 2026-11-08-rc-g6b-notifications.png | In-app and local notifications only (human decision 2026-11-04). Remote push is in the deferred row. |
| Plan preview | verified | 2026-11-06-final-8-plan-preview.png, 2026-11-06-final-8-cta-alert.png | The alert only, no payment. The screen is not in the Q style yet (CS U5 section). |
| Qrew redesign units 1-5 look | verified with limits | 2026-11-09-qrew-u2-side-by-side.html, 2026-11-09-qrew-u3-side-by-side.html, 2026-11-09-qrew-u4-side-by-side.html, 2026-11-09-qrew-u5-side-by-side.html, 2026-11-09-qrew-pt-side-by-side.html; USER_DECISIONS 2026-11-09 entries | The human accepted the U1 art and font and the U2-U5 screens. Q-only items the human chose not to build stay unbuilt. The app name still shows as "Moment" until a rebuild (see the Copy code / Qrew row). |
| Dynamic Type / largest text | verified with limits | 2026-11-09-qrew-u1-d-largest-type.png, 2026-11-09-qrew-u3-f1-largest-17e.png, 2026-11-09-qrew-u4-f2-map-largest.png, 2026-11-09-qrew-u5-f1-17e-xl-both-cards.png, 2026-11-09-qrew-pt-f1-xl-create-pickers-17pro.png | Layouts hold and actions stay reachable. Known truncations: Arrived/Set status chips (N3) and Draw/Undo/Clear (N4). Host-only screens at largest type were checked on the 17 Pro only. |
| Qrewing AI backend: 0027 tables/RPCs/RLS, grace, qrewing Edge Function, janitor */5 | verified with limits | CS 2026-11-12 sitting lines (rollback test, apply, test-file run, deploys, smoke); LS af39a5c (first real calls) | Live: 0027 test file ran with ROLLBACK and no FAIL; smoke 405/401; janitor runs ok. Real match, triage and recap calls succeeded (qa ~04:00). Not verified live: the recap refresh and the failure paths (unit tests only). |
| Qrewing event: entry gate, People to meet (match) | verified with limits | LS qa ~04:00 pass and ~04:06 rechecks; 2026-11-12-qrewing-first-ai-call-people-to-meet.jpg, 2026-11-12-qrewing-e2-6d-discard-alert.jpg, 2026-11-12-qrewing-e2-5k-chat-gate-header-pass.jpg | qa PASS: People to meet, consent sheet, F1, https:// links, E2.6d, E2.5k after 70f850d (Chat-gate and Info paths). Simulators only. |
| Qrewing Mute small talk (triage) | verified with limits | LS qa ~04:00 pass; 2026-11-12-qrewing-mute-important.jpg | qa PASS: chit-chat hidden, room-change message shown as "Important: Announcement". Daily cap and model-failure rows: unit tests only. |
| Qrewing recap and 30-min grace after an early end | verified with limits | LS qa ~04:00 pass and ~04:06/04:12 rechecks; 2026-11-12-qrewing-end-room-30min-copy.jpg, 2026-11-12-qrewing-grace-recap.jpg, 2026-11-12-qrewing-host-recap-pace-line.jpg, 2026-11-12-qrewing-grace-save-original.jpg, 2026-11-12-qrewing-grace-shared-by-host.jpg | qa PASS: 30-minute copy (40fd48f), guest recap card and closed chat in grace, Photos of me and Save original in grace, "Shared by Host" (0a42742). Not verified: the recap refresh; account deletion has no grace (open for the human). |
| Qrewing pace maker (moving time, km splits, spoken cues) | verified with limits | LS qa ~04:00 pass; 2026-11-12-qrewing-pace-stationary-sheet.jpg, 2026-11-12-qrewing-host-recap-pace-line.jpg | qa PASS: stop scenario (card frozen, stationary sheet, stop excluded: 1.27 km · 6:22 · 5:01 per km) and the recap pace line. Not verified: audible voice, a stop cutting speech, the silent switch, a real iPhone. |
| Android | not verified | CS U2 "ANDROID FOLLOW-UP" | iOS first; Android is follow-up work. The expo-maps Google key is missing and keyboard handling is iOS-only. |
| Copy code + app name "Qrew" | verified | LS 2026-11-09 rebuild 891b759 host QA and the FAKETEAMID recovery entry; merged main 860e938 | Name Qrew and the Q icon on all 5 sims, Copy code → paste → preview PASS (qa). The 55948fd rebuild keeps CFBundleDisplayName Qrew. |
| Android keyboard | not verified | CS U2 "ANDROID FOLLOW-UP", U3 "Keyboard" line | Deferred: QScreen and useKeyboardOpen listen only to the iOS keyboard events. |
| Camera denied on a real device | not verified | CS U5 "Camera denied (Q 07.04)"; LS U5 "NOT RUN" | Deferred: the simulator reports the camera as unavailable before asking. The real-iPhone Take photo check was postponed by the human (USER_DECISIONS 2026-11-09). |
| Face enrollment manage / replace / stop path | not verified | LS U5 "NOT RUN"; supervisor rule "no new enrollment" | Deferred: there is no enrollment to manage, and none may be created (demo rule). The old-UI Manage/remove was run on 2026-11-06 (2026-11-06-final-7-manage.png, 2026-11-06-final-7-removed.png) but not the Q 06.01-02 version. |
| Real QR scan | not verified | 2026-11-09-qrew-u2-scan.png; IS checkpoint Step 10 | Deferred: no simulator camera; needs a physical device. |
| Network-off errors (chat Retry, end-activity error, offline pull) | not verified | CS Step 3b; LS U4 "3 airplane error" not run; CS gap 5/6 (offline pull) | Deferred: the simulators share the Mac's network, so one app cannot be cut off. |
| Push / EAS | not verified | IS "Human-only blockers" 3; CLAUDE.md commands table | Deferred: APNs remote push is outside this milestone (human decision 2026-11-04), and the EAS CLI is not logged in. |

## Human-only blockers

1. Face API: AWS credentials are set as Edge Function secrets (done). The AI-services opt-out/retention item is superseded 2026-11-07 ~17:50 PST: demo/presentation scope only, no real participant photos; the AWS paid plan + opt-out item is out of scope (planning/USER_DECISIONS_2026-11-04_OPERATIONS_EN.md).
2. Anonymous sign-ins (enabled) and Confirm email (off) are resolved and verified; no longer blockers.
3. Anthropic API key: set by the human as the Edge Function secret ANTHROPIC_API_KEY (2026-11-12); verified only by
   qa's first real calls (LS af39a5c). Nobody has seen or logged the value.
4. A physical iPhone for device checks (optional). Apple Developer Program, APNs and EAS login are not needed for this milestone (human decision 2026-11-04).

## Not yet tested

See the "not verified" and "verified with limits" rows in Feature status above (refreshed 2026-11-12) and the
"Not verified" list in the 2026-11-12 Qrewing section.
