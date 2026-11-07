# Final draft QA: live status (supervisor-owned; Codex reads it, and Codex reports through the human chat)

## ~13:34 PST: supervisor acknowledgement
- RECEIVED: the human's approval in planning/CODEX_QA_ADDITIONAL_APPROVAL_2026-11-06.md (≤3 new rooms, exactly 1 disposable account). It is recorded in the decision log and is being relayed to the developer.
- Current work:
  - Status editor: committed (d512dad).
  - Face gallery diff: reviewed and ACCEPTED, pending one small fix (FG-R1, orphan reference cleanup on enroll error). The developer is committing it.
- Steps: docs/reviews/codex-final-qa-steps.md. The fixture ownership table there decides who creates what; nobody creates a fixture twice.
- Next concrete Codex action, after "GO" appears in the steps file:
  - Step 0: on the host iPhone 17, create R1 ("4 days", location allowed) and then R3 ("3 hours").
  - Guest iPhone 17 Pro joins both by code.
  - Report the codes and member lists, then STOP.
- GO prerequisites, on the developer side:
  - The face gallery commit is in.
  - Both sims cold-launch on that bundle, and the "Me" chip is visible.
  - The third sim is booted with the same build installed, for D1.
  - The generated test media have been added.

## ~13:36 PST: setup checkpoint (supervisor)
- Supervisor read: 27d7717 (face gallery + FG-R1) and d512dad are committed locally. FG-R1's remove call is best effort; face-refs has no owner delete policy, so an orphan is removed only by the room-expiry janitor (known gap, accepted).
- Developer-prepared: Metro on 127.0.0.1:8081; the 17e D1 sim (6E0F2097) booted with the same app; generated fixtures added (QA-pattern.jpg, QA-video.mp4, QA-file.txt). No rooms or accounts created.
- GO for Step S (Codex): tap "Open" on the 'Open in "Moment"?' prompt on host 17 and guest 17 Pro; on the 17e, enter the URL http://127.0.0.1:8081 manually. Report each screen, then STOP.
- Step 0 starts only after the supervisor writes "S OK" here.

## ~13:40 PST: S OK (host and guest); Step 0 GO
- Codex reported: "Open" tapped on host 17 and guest 17 Pro. Both are on Rooms ("No rooms yet"), still signed in as Test Host and Test joiner, HEAD 27d7717. The developer had already confirmed that the 127.0.0.1:8081 bundle contains the new face strings. The "Me" chip itself is verified inside R1 at step 0.
- S OK for host and guest. GO for Step 0 NOW (Codex): create R1 ("4 days", location allowed ON) and then R3 ("3 hours") on the host. The guest joins both by code. Open the R1 Gallery on the guest and confirm the 4th chip "Me" (do not tap Set up). Record codes and member lists in the ownership table of codex-final-qa-steps.md (or report them), then STOP.
- 17e (D1 sim): Codex does S2 in parallel (dev-client "Enter URL manually" → http://127.0.0.1:8081; welcome screen; no sign-up). The developer confirms readiness. The human does not need to tap anything.
- After Step 0: the developer reads both rooms on the server (IDs, expires_at, members = 2). The supervisor verifies them and then releases step 1.
- The human has nothing to do right now. All fixture actions are covered by the approval.

## ~13:41 PST: supervisor handoff check (no state change)
- Step S evidence is on disk: docs/evidence/2026-11-06-final-S-{host-17,guest-17pro,d1-17e}.png and the cold-launch shots 2026-11-06-final-setup-coldlaunch-{host-17,guest-17pro}.png (referenced in docs/evidence/final-qa/SETUP.md). The earlier failed append is superseded by this entry.
- Still waiting on Step 0 (R1 4d + location allowed, R3 3h, guest joined to both, "Me" chip seen) and on the developer's server read (IDs, codes, expires_at, member count = 2). Step 1 is not released until the supervisor verifies both rooms.

## ~13:46 PST: R1 verified on the server (supervisor, read-only SQL)
- R1 "Final QA R1 2026-11-06": id 3514615f-dbc6-4d52-9513-f5f67a86bd78, code 03424, created 2026-11-06 21:43:44Z, expires_at 2026-11-10 21:43:43Z (= 13:43:43 PST Nov 10, 4 days). room_members = 2. It is the only room created in the last 30 minutes, so there is no duplicate.
- Not yet: R3, the "Me" chip check on the guest, S2 on the 17e. The developer was asked to do the navigation only (moment:// links via simctl after checking the real route paths: host → Rooms, guest → R1 gallery) and to bring up the 17e dev link. No room or account is created by developer or supervisor.
- Fixture count: 1/3 rooms, 0/1 accounts.

## ~13:49 PST: S2 OK (17e)
- Codex: the 17e is connected to 127.0.0.1:8081 through the manual URL and shows the Welcome screen with no errors; no signup was done. Evidence: docs/evidence/2026-11-06-final-S2-17e-ready.png (file present). The supervisor accepts S2.
- The developer's 17e dev-link request is CANCELLED. Leave the 17e untouched until the D1 step is released.
- Remaining developer navigation: host → Rooms, guest → R1 gallery. Codex then creates R3 and does the "Me" chip check.

## ~13:52 PST: Step 0 navigation done (developer report)
- Host 17: moment:/// → Rooms, with R1 listed. Guest 17 Pro: moment:///room/3514615f-…/gallery → chips All | Mine | Others | Me. The "Me" chip is visible (developer-observed; Codex's own screenshot is still welcome for the ledger). The 17e also reached Welcome. That message probably crossed the supervisor's cancel. Leave the 17e untouched now.
- R1 members (developer server read): host edeaea51-e4b5-464f-82be-44e0277b2d91 "Test", member 97ed7d32-d88b-4e0a-9ddd-03477f1d64be "Test joiner"; both share_location = false (expected until the map step opts in).
- Next for Codex: create R3 (3 h) once on the host; the guest joins by code; report the code, then STOP. The developer reads R3 on the server; the supervisor verifies it before Step 1.

## ~13:54 PST: FOR CODEX (the relay session is unreachable, so this file is the channel)
- Navigation is done. HOST 17: Rooms, "Signed in as Test (Host)", R1 listed ("Ends in 3d 23h"). GUEST 17 Pro: R1 gallery, chips All | Mine | Others | Me, "Nothing shared yet"; Set up was not tapped. Evidence: docs/evidence/2026-11-06-final-0-nav-{host-17,guest-17pro}.png (present). The "Me" chip check is DONE; no Codex repeat is needed.
- The 17e received one dev-client URL at ~13:45, before the cancel. It is still on Welcome with no signup. Leave it untouched.
- Deep-link routes, if a header tap fails: moment:///  moment:///room/<id>  /room/<id>/{info,invite,map,gallery,face}  /create-room  /join  /profile  /plan-preview. Ask the developer to open them; Codex does not run simctl.
- GO (Codex): create R3 ("3 hours") ONCE on the host. The guest joins by code. Report the code here or through the relay, then STOP. Fixtures used: 1/3 rooms, 0/1 accounts.

## ~13:56 PST: CORRECTION. R3 ALREADY EXISTS. DO NOT CREATE R3 AGAIN.
- The ~13:54 "create R3" GO is WITHDRAWN. The supervisor's server read confirms R3 was already created at 21:46:12Z: id 5098a0ec-3ecd-4d4b-b3ea-e35988708d40, code 04693, "Final QA R3 expiry 2026-11-06", expires_at 2026-11-07 00:46:12Z (16:46 PST, 3 h), members = 1 (host only).
- Fixtures used: 2/3 rooms (R1, R3), 0/1 accounts. Only R2 (the reminder room) is left.
- GO (Codex), remaining Step 0 item: the GUEST joins R3 with code 04693, once. Report the result, then STOP. The supervisor will verify members = 2.

## ~13:58 PST: Step 0 almost done
- Codex reports R3 created ONCE (code 04693), which matches the server. The R1 "Me" chip is confirmed visually and through AX (docs/evidence/2026-11-06-final-0-r1-me-chip.png). The supervisor accepts both.
- COUNT NOTE: a guest join creates nothing. After the R3 join: rooms 2/3, accounts 0/1 (Codex proposed 2→3 / 0→1; corrected).
- The developer puts the guest at moment:/// so Codex can join 04693 once. Step 1 (R1 → Room info on both sims) is released after the supervisor verifies R3 members = 2.

## ~14:00 PST: FOR CODEX: guest is ready for the R3 join
- The developer opened moment:/// on the guest 17 Pro: Rooms, "Signed in as Test joiner (Guest)", Join a room, R1 listed (docs/evidence/2026-11-06-final-0-nav-guest-rooms.png).
- GO (Codex): on the GUEST, Join a room → 04693, ONCE. Report, then STOP. Counts stay rooms 2/3, accounts 0/1.

## ~14:03 PST: STEP 0 OK; STEP 1 GO
- Supervisor server read: R3 5098a0ec… (04693) members = 2 (host edeaea51 21:46:12Z; Test joiner 97ed7d32 joined 21:47:36Z). R1 03424 members = 2. Evidence: docs/evidence/2026-11-06-final-0-r3-guest-joined.png. Counts: rooms 2/3, accounts 0/1. Step 0 ACCEPTED.
- STEP 1 GO (status editor, d512dad), in R1 only:
  a. GUEST: in the R1 chat, pick a default status (e.g. "Resting"). Screenshot.
  b. DEVELOPER: open moment:///room/3514615f-dbc6-4d52-9513-f5f67a86bd78/info on HOST 17 and GUEST 17 Pro. Do not touch the 17e.
  c. HOST: Room info → Statuses → rename one status, add "Running late", remove the status the guest picked in (a) → Save → confirm the Alert. Screenshot final-1-host.png.
  d. GUEST: Room info shows the new list read-only (no edit controls). Then the R1 chat Status picker shows the new list. Also record what the guest's own current status shows after its picked status was removed. Screenshot final-1-guest.png.
  e. STOP and report. The supervisor reads rooms.status_definitions on the server afterwards.

## 13:49 PST (real clock, from date): clock note + Step 1 navigation order
- CLOCK: supervisor entries labelled ~13:46 to ~14:03 were estimated and run AHEAD of the real clock. Read them as an ordered sequence, not as exact times. From now on, entries use the system date.
- Step 1 navigation order (from Codex): (1) the developer opens moment:///room/3514615f-dbc6-4d52-9513-f5f67a86bd78 on the GUEST only, and the guest picks "Resting". (2) Only after Codex reports that, the developer opens R1 /info on BOTH sims.

## 13:49 PST: FOR CODEX: guest is in R1 chat, step 1a GO
- The developer opened R1 on the GUEST at 13:49:18 PST. The R1 chat shows the Arrived and Status buttons (docs/evidence/2026-11-06-final-1-nav-guest-r1chat.png).
- GO (Codex): GUEST taps Status → "Resting". Report it. Then the developer opens R1 /info on both sims (step 1b).

## 13:50 PST: step 1a OK; developer opening R1 /info on both
- Guest status "Resting" set at 13:49 (docs/evidence/2026-11-06-final-1-guest-before.png). The developer was asked to open R1 /info on host and guest.
- GO (Codex) after the developer reports: on the host, rename "Giving up", add "Running late", remove "Resting" → Save → Alert. Check the guest read-only view, the guest picker list, and the guest's own current status after "Resting" was removed. STOP.

## 13:50 PST: step 1b OK (first device render of the d512dad editor); step 1c GO
- At 13:50:18 the developer opened R1 /info on both sims (docs/evidence/2026-11-06-final-1-nav-info-{host-17,guest-17pro}.png).
- HOST: an editable list (Emergency locked "Always included"; Resting, Giving up, Need water, Need help with minus buttons; Add status; Save disabled while unchanged).
- GUEST: the same list read-only, with no edit controls, plus the hint "The host sets these…". The render and the role gating are seen on the device. Editing is not yet tested.
- GO (Codex) step 1c: on the HOST, rename "Giving up", add "Running late", remove "Resting" → Save statuses → confirm the Alert → screenshot final-1-host.png. Then on the GUEST, reopen or refresh Room info (new list, read-only) and the R1 chat Status picker (new list). Record what the guest's own status shows now that "Resting" is gone. Screenshot final-1-guest.png. STOP.

## 13:52 PST: step 1c host save PASS (server cross-checked)
- Codex: the host renamed "Giving up" to "Taking a break", removed "Resting", added "Running late". The save Alert listed the cleared statuses → "Statuses saved". Guest chat: the Status button shows "Status" (cleared), and the picker shows the new labels.
- Supervisor server read, R1 status_definitions: Emergency(sort 0, is_emergency) / Taking a break(1) / Need water(2) / Need help(3) / Running late(4). member_status for R1: 0 rows. MATCHES the device.
- Observations (minor, open): SE-1, a guest Room info screen left open during the save kept the OLD list (no live refresh; a reopen is needed). SE-2, a rename is applied as delete+add, which clears members holding the renamed status (the Alert says so). The developer will confirm both from the code.
- NEXT: the developer reopens R1 /info on the GUEST only, and Codex checks the new read-only list. Then the developer opens the R1 chat on both, and Step 2 is released.

## 13:52 PST: SE-1 / SE-2 decisions (supervisor)
- SE-2: accepted as designed. set_status_definitions (0002) matches statuses by label, so a rename is remove + add, and the save warning says so truthfully. To be documented; no code change.
- SE-1: info.tsx loads only on focus and doesn't use useRoomEvents (the server already broadcasts status_definitions and room_members, from 0017). Fix APPROVED (client-only, small: debounced reload; host skips the status-list reload while unsaved edits exist). It lands only in a gap between Codex steps, to avoid fast refresh mid-step. After it is committed, Codex re-checks once.

## 13:52 PST: STEP 1 PASS; STEP 2 GO
- The guest Info reopened at 13:52:25 shows the new list read-only (docs/evidence/2026-11-06-final-1-nav-info-guest-reopen.png), which matches the server. Codex does not need to repeat this check.
- Step 1 (status editor d512dad) PASS on simulators: host edit/save, alert, server definitions, guest picker, cleared guest status, guest read-only view. Open: SE-1 (fix approved, between steps). SE-2 accepted as designed.
- STEP 2 GO (Activity UI, R1). The developer opens the R1 chat on BOTH sims first. Then:
  1. GUEST taps Arrived.
  2. GUEST sets a status (e.g. "Running late").
  3. GUEST triggers Emergency.
  4. HOST records the arrival notice, the status, and the Emergency banner, then acknowledges.
  5. GUEST records the acknowledgement.
  Take a screenshot at each step, then STOP.

## 13:53 PST: FOR CODEX: Step 1 accepted; Step 2 order
- Step 1 is ACCEPTED (see the PASS entry above; the server matches; final-1-guest.png noted).
- Navigation: the developer opens the R1 chat on the HOST only; Codex moves the guest itself.
- Step 2 must also cover Arrived and a normal status, not only Emergency. Order:
  1. GUEST Arrived → HOST sees the arrival notice.
  2. GUEST picks a status (e.g. "Running late") → HOST sees it.
  3. GUEST Emergency → HOST banner → HOST acknowledges → GUEST sees the ack.
  4. GUEST "I'm OK" clears Emergency.
  Take a screenshot at each step. Keep R1. STOP and report. The supervisor then reads member_status and the arrival/emergency rows.

## 13:53 PST: Step 2 navigation ready
- At 13:53:32 the developer opened the R1 chat on the HOST only (docs/evidence/2026-11-06-final-2-nav-host-17-r1chat.png). It shows the history line "Test joiner: Resting · 1:49 PM" and no banner. Codex moves the guest itself. GO Step 2 per the order above.
- SE-1 is being built in a separate worktree; there is no hot reload on the live sims until the supervisor names a gap.

## 13:54 PST: SE-1 commit reviewed
- 7092911 (branch se1-info-refresh, +37/-1, client only) ACCEPTED on code review. It fast-forwards main after Step 2, when the supervisor names the gap. Codex re-check afterwards: guest Info open, host edits and saves, the guest list updates without a reopen.

## 13:58 PST: STEP 2 PASS (server cross-checked); SE-1 GAP OPEN
- Server, R1: arrivals has guest 97ed7d32 at 21:53:36Z (13:53). emergency_events has guest at 21:54:29Z; push_requested_at is null (push is not configured in this draft, EAS pending; expected). emergency_acks has host edeaea51 at 21:54:47Z. member_status: 0 rows after "I'm OK" (clear_my_status). This matches the device evidence final-2-{host-arrival,host-status,host-emergency,guest-ack,host-cleared}.png. Step 2 PASS on simulators. Remote push for Emergency is NOT tested (no push credentials).
- SE-1 GAP: the developer fast-forwards main to 7092911 and runs npm test. Metro hot-reloads both sims. Codex waits for the developer's "SE-1 live" note.
- SE-1 RECHECK (Codex), after "SE-1 live":
  1. The developer opens R1 /info on BOTH sims.
  2. GUEST leaves Info OPEN, with no navigation.
  3. HOST: in Statuses, rename "Taking a break" to "On a break" → Save → confirm the Alert.
  4. Within ~2 s, and WITHOUT reopening, the GUEST list shows "On a break". Screenshot final-se1-guest.png.
  5. Draft guard: on the HOST, type an unsaved new row "Test draft" (do not save). Then the developer has the GUEST… (skip; a member cannot edit). Instead, just confirm that the host's unsaved "Test draft" row is still there after ~5 s, then remove it without saving.
  6. STOP.
- STEP 3 (chat) is NOT yet released. The network-off method is unresolved. Turning off the Mac's network is NOT allowed, because it would cut every agent session and the human's machine. The developer is asked for a guest-only method. Without one, the offline Retry part is labelled UNVERIFIED on simulators, and only the keyboard-open exchange runs.

## 13:58 PST: SE-1 recheck amendment
- DROP step 5 (the draft guard) of the SE-1 recheck. Only the host can edit, so no second status_definitions notice can arrive while the host has unsaved edits. The guard is covered by code review only. The SE-1 recheck is steps 1–4 and then STOP.

## 13:59 PST: SE-1 LIVE; recheck GO; Step 3 plan
- Developer: main fast-forwarded to 7092911, npm test 74/74 (developer-reported). Metro Fast Refresh delivered the change to host and guest; no forced reload. At 13:59:13 R1 /info was opened on both (docs/evidence/2026-11-06-final-SE1-nav-info-{host-17,guest-17pro}.png).
- GO (Codex) SE-1 recheck steps 1–4: GUEST keeps Info open. HOST renames "Taking a break" to "On a break" → Save → confirm. The GUEST list updates without a reopen (screenshot final-se1-guest.png). STOP. If it does not update, report it; do NOT reopen first.
- STEP 3 plan (released after the SE-1 recheck report):
  a. The developer opens the R1 chat on both sims. Host and guest exchange 2 messages with the keyboard OPEN; screenshot the layout on both.
  b. Reconnect (partial, approved): the developer runs kill -STOP <guest app pid> → HOST sends 1 message → ~60 s → kill -CONT. On the GUEST, record any "Reconnecting…" banner and whether the host's message appears without manual action (gap-fill). Screenshots. If the guest app crashes or restarts, report it; don't retry.
  c. A failed send and "Not sent. Tap to retry" are UNVERIFIED on simulators: no guest-only network cut exists without admin or Mac-wide changes. Label it as such.
  STOP after (b).

## 14:01 PST: SE-1 PASS; STEP 3 GO
- Server: R1 status_definitions are Emergency / On a break / Need water / Need help / Running late, which matches. The open guest Info updated live without navigation (final-se1-guest.png). SE-1 is CLOSED (simulator PASS; latency was not measured). The host draft guard is covered by code review only.
- STEP 3 GO: the developer opens the R1 chat on both sims. Then run (a) and (b) as in the plan above. (c) Failed-send Retry stays UNVERIFIED. The (b) paused-process test is lifecycle/gap-fill evidence only and does not prove behavior during a network outage. STOP after (b).

## 14:01 PST: FOR CODEX: Step 3a GO
- The R1 chat is open on both sims (14:01:26; docs/evidence/2026-11-06-final-3-nav-{host-17,guest-17pro}.png). Do the keyboard-open 2-message exchange now. When it's done, report "ready for freeze". The supervisor then relays to the developer, who runs kill -STOP (guest pid re-checked), and Codex has the HOST send 1 message during the freeze.

## 14:07 PST: Step 3a review (supervisor looked at both screenshots)
- Two-way delivery PASS: guest "Guest" 14:03 → host; host "Host" 14:06 → guest (final-3-{guest,host}-keyboard.png).
- Guest layout PASS: the composer and Send sit directly above the keyboard; the room is a pushed screen with a back button.
- Host layout FAIL as observed (finding C-1): the composer is hidden behind the keyboard (only a blurred shape shows through the keyboard top). The host screen is presented differently: as a SHEET with a card behind it, no back button, and the title lower. It was likely opened by the moment:/// deep link while the Info sheet context was active. So C-1 may be a deep-link/sheet presentation artifact OR a real KeyboardAvoiding bug in sheet presentation. It is not a PASS until reproduced through normal navigation.
- C-2 (minor, unconfirmed): after Send, a lowercase word stayed in the composer. This possibly comes from iOS predictive text committing after the controlled clear, or from AX input. To be reproduced with a real keyboard tap sequence.
- Input-tool notes: CUA typeText gives option-key glyphs, and AX setValue doesn't update React state. Use on-screen key taps. One glyph test message is in R1, harmless, and is deleted at expiry.
- ORDER NOW:
  1. Step 3b (freeze) runs first, with no code reload. Codex says "ready for freeze" when its gap text is prepared.
  2. C-1 repro (the developer reads code only now): Codex dismisses the host sheet/stack back to Rooms and opens R1 from the Rooms list by tapping it (normal flow), then focuses the composer. Screenshot final-3-host-keyboard-normalnav.png. If it is hidden there too, the developer stages a fix on a branch (no live reload until a gap).
  3. Then STEP 4 (media) per the steps file:
     - GUEST uploads QA-video.mp4 (Photos) and QA-file.txt (Files → On My iPhone) in R1.
     - HOST downloads, plays and saves the video, and opens and saves the file.
     - Record progress, success, and any error or Retry.
     - The supervisor compares the server size_bytes and content_sha256 with the SETUP.md hashes. STOP.

## 14:08:26 PST: Step 3b freeze GO sent to the developer
- The developer re-validates the guest pid, STOPs it, and appends a "## FREEZE: … STOP at … auto-CONT at …" line here (one-time ownership exception). Codex clicks Send on the host after it sees that line. C-1 is reviewed (see the Step 3a review entry above); its recheck through normal navigation comes after 3b.

## FREEZE: guest pid 6156 STOP at 14:08:54, auto-CONT at 14:09:54 (developer)

## 14:09:00 PST: C-1 root cause (developer code read, accepted) and fix plan
- C-1 cause: create-room does replace(room) and then pushes Invite as a modal. Invite has no Done/dismiss (swipe only). Later pushes then render inside that modal sheet. This affects every host after creating a room, not only deep links. The keyboard offset inside the sheet comes up short by about the sheet's top inset (hypothesis).
- Fix (a) is approved and staged on a branch with no merge: Invite gets a Done/Close button that dismisses it, and the room is never inside a modal. Fix (b) (keyboard math) only if needed. C-2: native clear() next to setDraft(''). The supervisor reviews; the merge happens only in a named gap. Re-check afterwards: on the host, dismiss Invite, then R1 → composer focus.
- No new room is used for this (1 room left, reserved for R2).
## CONT: guest pid 6156 CONT executed at 14:09:55 (developer)

## 14:10:14 PST: C-1/C-2 fix e5fd2e0 ACCEPTED (code review); merge after the 3b result
- e5fd2e0 (branch c1-sheet-fix, parent 7092911): Invite gets a header "Done" button (router.dismiss, a11y label "Done"); the chat composer gets a native clear() after send. tsc/lint/npm test 74/74 are developer-reported.
- Known gap C-3 (out of scope tonight): a push while any modal is open (reminder notification tap, Upgrade) still nests inside that modal.
- Merge: after the 3b report, the developer fast-forwards main and posts "C-1 fix live".
- Then the CODEX C-1 RE-CHECK: on the HOST, close the sheet/Invite (Done or swipe down) until the Rooms list is full-screen → tap R1 → focus the composer → screenshot final-3-host-keyboard-fixed.png. PASS = composer and Send visible above the keyboard.
## 14:10:57: C-1 fix live, HEAD e5fd2e0 (developer)
- main fast-forwarded to e5fd2e0; npm test: ℹ tests 74 ℹ pass 74 ℹ fail 0 . Metro Fast Refresh delivers it to both sims. GO Codex C-1 re-check on HOST.

## 14:11 PST: Step 3b PASS (supervisor, scoped); C-1 order
- Step 3b PASS, lifecycle/gap-fill only (NOT a network-outage test). Guest pid 6156 STOP 14:08:54 → CONT 14:09:55. Host "Gap" was sent inside the window (final-3b-host-gap-sent.png shows the host bubble 2:09 PM). After CONT, with no navigation or reload, the guest showed "Gap 2:09 PM" in R1 (final-3b-guest-gap-received.png; the supervisor looked at both). No Reconnecting banner was seen at the sample, but the banner was not tested.
- Supervisor note: final-3b-host-gap-sent.png also shows the host chat as a sheet (card behind, no back button) with the composer hidden behind the keyboard, which is the same C-1 symptom.
- C-1 order (adopting the Codex request): (1) The developer opens the HOST at moment:/// to the Rooms list ONLY, with no room auto-open and no code reload. (2) Codex confirms that Rooms is full-screen; if a sheet/card is still behind, it swipes it down. Then it taps R1, focuses the composer, and takes final-3-host-keyboard-normalnav.png (the repro on the old code 7092911). (3) The developer fast-forwards main to e5fd2e0 and posts "C-1 fix live" (the Metro reload happens here). (4) Codex re-checks: Rooms → R1 → composer → final-3-host-keyboard-fixed.png. For the Done path, also create-room is NOT re-run (no spare room); the Invite Done button is checked by opening Invite from R1 if it presents modally. (5) Then Step 4.

## 14:12 PST: C-1 order SUPERSEDED: fix already live
- The developer reports that main was fast-forwarded to e5fd2e0 at 14:10:57 (the supervisor verified with git log), with npm test 74/74 (developer-reported). The old-code normal-nav repro is therefore dropped. The C-1 "before" evidence is final-3-host-keyboard.png plus final-3b-host-gap-sent.png.
- CODEX C-1 RE-CHECK NOW, on the HOST: swipe down the sheet (or tap Done if Invite shows) until the Rooms list is full-screen with no card behind it. If it can't be dismissed, ask through the supervisor, and the developer opens moment:/// to Rooms only. Then tap R1 → focus the composer → final-3-host-keyboard-fixed.png. PASS = a pushed screen with a back button, with the composer and Send visible above the keyboard. Also tap Invite in R1: if it presents as a sheet, it must show Done, and Done must return to the chat (final-3-host-invite-done.png). C-2: send one short message by key taps and confirm that the composer is empty afterwards.
- Then STOP and report. Step 4 is released by the supervisor after the review.

## 14:12 PST: HOST ROOT fallback sent to the developer (supervisor)
- Codex could not dismiss the host sheet. The developer will put the HOST on the Rooms root with no room auto-open (or a clean host-only relaunch, no reinstall/data reset) and then post "## HOST ROOT: … (developer)". Codex: start the R1 tap → keyboard / Invite Done / C-2 checks when that line appears. The codex-qa-relay socket was unreachable, so this ledger line is the delivery confirmation.
## HOST ROOT: simctl openurl moment:/// on host 17 at 14:12:53, full-screen Rooms (no sheet), no relaunch (developer)

## 14:13 PST: HOST ROOT accepted (supervisor looked at final-3-host-rooms-root.png)
- Full-screen Rooms with no sheet card behind it, and R1 and R3 listed. This is sufficient for the C-1 KAV re-check. Codex: GO. Tap R1 → composer → final-3-host-keyboard-fixed.png; then Invite Done (final-3-host-invite-done.png); then C-2 key-tap send with an empty composer after. STOP and report.
- Minor finding N-1 (not blocking, out of scope tonight): moment:/// pushes a Rooms screen with a back chevron on top of earlier stack entries instead of resetting to the root. Record it as a known gap.

## 14:14 PST: C-1 PASS; C-2 REPRODUCED, still open (supervisor looked at both screenshots)
- C-1 PASS (fixed code e5fd2e0): R1 was opened from the full-screen Rooms list and is a pushed screen with Back. With the keyboard up, the composer and Send sit directly above it (final-3-host-keyboard-fixed.png). Invite Done is still pending (Codex next).
- C-2 OPEN (confirmed with real on-screen key taps O, k): after Send, "Ok" 2:13 PM was delivered, but the composer then shows a lowercase "ok" with iOS marked/autocorrect-style highlight, and Send is enabled (final-3-c2-residual.png). Hypothesis (unverified): the iOS keyboard re-commits pending autocorrect/marked text after the JS/native clear. The e5fd2e0 native clear() is not sufficient. Risk: an accidental duplicate send.
- C-2 fix: the developer investigates the root cause first, then stages the fix on a branch (no merge or hot reload until the supervisor names a gap). Candidates to evaluate, not prescribed: clear after the commit settles, a key-based remount of the input, or a controlled value with the input's own change event. The fix must keep autocorrect usable for normal typing.
- Codex: clear the residual "ok" WITHOUT sending. Then Invite Done from R1 (final-3-host-invite-done.png). Then STEP 4 GO as written in the 14:07 order (guest uploads QA-video.mp4 + QA-file.txt in R1; host downloads, plays and saves, and opens and saves; record progress, errors and any Retry). STOP after Step 4. The supervisor compares server size_bytes/content_sha256 with SETUP.md.

## 14:15 PST: STEP 4 GO (supervisor)
- C-1 Invite Done accepted (final-3-host-invite-done.png; Done → R1 with Back, composer above keyboard). C-1 CLOSED on simulator. C-2 stays OPEN; the developer fixes it on a branch, with no reload until a gap.
- Fixtures (re-verified by the supervisor with shasum at this time):
  - QA-video.mp4: 5,539,741 bytes, sha256 ffa9893995127ccf0fe8f9594319162ff0635cbb1be6cc24f4022a3d682d6109. In guest 17 Pro Photos.
  - QA-file.txt: 91 bytes, sha256 4c8c9108c4029963d9fadce7e8aabb1ee7d34af5bc745e3e7e22f88cd8531f75. In guest 17 Pro Files → On My iPhone.
- In R1, GUEST uploads QA-video.mp4 (pick it from Photos, keeping the original if offered) and QA-file.txt (from Files). HOST downloads, plays and saves the video, and opens and saves the file. Record verbatim progress/success/error/Retry text and the times. Screenshots final-4-*.png. STOP and report. The supervisor then reads the server size_bytes/content_sha256.

## 14:16 PST: C-2 plan (supervisor decision)
- Developer hypothesis (unproven): RN 0.88 Fabric clears by assigning attributedText directly without unmarkText or input-delegate notifications. So the iOS keyboard re-applies its marked/predictive composition ("ok") to the emptied field and fires a real onChange. Diagnostic trace c133024 (branch c2-diagnose, dev-only logging) is staged.
- Decision: ONE gap. The developer stages the likely fix (e.g. blur→clear→focus) on top of the trace. Supervisor review comes before the merge. After Step 4, Codex does one repro (on-screen O, k → Send). The trace confirms the cause either way. The trace is removed in the final C-2 commit. Keyboard flicker must be reported and weighed.

## 14:18 PST: C-2 candidate f93f7d2 ACCEPTED for one gap (supervisor code review)
- Branch c2-diagnose: f93f7d2 (remount fix) on c133024 (dev-only [C2] trace) on e5fd2e0. It fast-forwards main. I reviewed the diff (3 files, +97/-9). tsc/lint/npm test 81/81 are developer-reported and were not re-run by me.
- Review: the Send path remounts the TextInput (key+1) instead of clearing in place. Change events are tagged with the producing input's key, so a late old-input event is ignored (unit-tested). autoFocus is only on replacement inputs. The trace is __DEV__-only and logs lengths/eventCount/selection/key type and no message text. The trace must be removed in the final C-2 commit.
- Note N-2 (minor, accept): with keyboardDismissMode=interactive, a user who drags the keyboard away and then taps Send gets the keyboard back (autoFocus on the new input). Acceptable chat behavior; record only.
- Gap plan (AFTER Codex reports Step 4): the developer fast-forwards main to f93f7d2 and Metro reloads. Codex on the HOST in R1: on-screen O,k → Send, twice, then type one more word with autocorrect and send. Watch for a visible keyboard drop/return or a layout blip on each Send. Screenshots final-3-c2-fixed-*.png. The developer reads the [C2] Metro lines. PASS = composer empty, Send disabled after each send, no duplicate message, keyboard stays up.
## C-2 candidate live at 14:20:35 (developer)
- main fast-forwarded to f93f7d2 (remount composer + dev-only [C2] trace); npm test 81/81 on the branch. Metro Fast Refresh delivers it. GO Codex: host R1 composer, on-screen O,k -> Send x2, then one autocorrected word -> Send; watch for a keyboard drop on Send.

## 14:22 PST: STEP 4 PASS (supervisor, independent server + device check)
- Server (media table + storage.objects, read-only SQL), R1:
  - video 26aa9be6…42c3: QA-video.mp4, video/mp4, size_bytes 5539741 = storage object size, sha256 ffa98939…6109 = fixture, status ready, duration 6952 ms.
  - file 7ce082f9…9b64: QA-file.txt, text/plain, size_bytes 91 = object size, sha256 4c8c9108…1f75 = fixture, status ready.
- Host device (shasum on the sim data dir, read-only): Photos DCIM/100APPLE/IMG_0012.MP4 is 5539741 bytes with sha256 = fixture. Files "On My iPhone" 7ce082f9-….txt has sha256 = fixture. The original bytes are preserved end to end.
- Finding M-1 (minor, fix allowed in a later gap if cheap): the exported file is named <media-uuid>.txt instead of the server file_name "QA-file.txt". Expected: save under the original name (sanitized). Video in Photos gets an iOS IMG_ name; that is normal.
- Not tested: failed upload, cancel, Retry.
- NEXT: the C-2 repro (candidate live at 14:20:35), then Steps 5–6 per docs/reviews/codex-final-qa-step5-6-plan.md. The developer sets the simulated host and guest locations before Step 5.

## 14:27 PST: 2aada21 (C-2 trace removal) and cb1d4df (M-1 file name) ACCEPTED on code review (supervisor)
- 2aada21: removes only the [C2] trace. The remount and the key-tagged onChange stay. Clean.
- cb1d4df (branch m1-filename, linear on 2aada21 → f93f7d2 = main): downloadOriginal saves to room-media/<room>/<media-id>/<exportFileName(file_name)>. Separators/control chars are sanitized, leading dots stripped, the name is capped at 120 with the extension kept, and the id is the fallback. Cache cleanup stays recursive at the room level (pruneRoomCaches/clearRoomCache are unaffected). The SHA/size verification is unchanged. tsc/lint/test 87/87 are developer-reported.
- Gap plan: AFTER the C-2 repro result and BEFORE Step 5, the developer fast-forwards main to cb1d4df (Metro reload). Codex then on the HOST: R1 → Photos/gallery → QA-file → Download → Save to Files → the saved name must be "QA-file.txt" (final-4-m1-filename.png). Then Step 5.

## 14:30 PST: C-2 PASS on f93f7d2 (supervisor); GAP: merge cb1d4df
- Visual (final-3-c2-fixed-2.png, which I looked at): two "Ok" sends at 2:22 PM, no duplicate, an empty composer with the placeholder, Send disabled, and the keyboard up afterwards.
- Trace (developer-read Metro log): ~1 ms after submit, iOS inserts the composed word "ok" as a multi-char key event plus change into the OLD input (key 0/1). The reducer ignores it (stale key), and the new empty input focuses about 72–76 ms later. The ROOT CAUSE is CONFIRMED: keyboard composition re-insertion after a programmatic clear. Send 3 (autocorrect "the" + space) works normally in a remounted input.
- Residual (not proven): a transient keyboard drop or padding blip during the 72–76 ms handoff was not observed in the post-send screenshot, but a single still cannot exclude it. Label: "no persistent drop observed".
- GAP NOW: the developer fast-forwards main to cb1d4df (2aada21 trace removal + M-1) and posts "## main = cb1d4df live at <time>". Then Codex on the HOST re-saves QA-file → Save to Files → name must be "QA-file.txt" (final-4-m1-filename.png). The developer sets the Step 5 locations, then Step 5 per docs/reviews/codex-final-qa-step5-6-plan.md.
## main = cb1d4df live at 14:24:10 (developer)
- C-2 final (trace removed) + M-1 file names; npm test on main: ℹ pass 87 ℹ fail 0 . Metro Fast Refresh delivers it.
## STEP 5 LOCATIONS set at 14:24:10 (developer): host 17 37.7793,-122.4193; guest 17 Pro 37.7810,-122.4170 (simctl location set)

## 14:24:29 PST: supervisor correction and confirmation
- Correction: the supervisor headings stamped "14:22", "14:27" and "14:30" were estimated, not read from the clock. Their real times fall between 14:19 and 14:24. Their order is correct.
- Verified: main = cb1d4df (git log). Step 5 locations were set at 14:24:10 (developer). Codex: GO for the M-1 file-name check, then Step 5 per docs/reviews/codex-final-qa-step5-6-plan.md.

## 16:11:13 PST: QA tapper is now the `qa` session (supervisor)
- Verified the human records: planning/CLAUDE_QA_SESSION_EN.md, the USER_DECISIONS Nov 6 "qa human-proxy" entry, CLAUDE.md Roles, and the supervisor "QA proxy" section. From here, read "qa" where steps say "Codex". Codex did no steps after 14:24, so the M-1 check and Steps 5+ are NOT RUN.
- Timing: R3 (5098a0ec…8d40, code 04693) expires_at 00:46:12Z = 16:46:12 PST. The janitor runs */15, so the first cleanup is at 17:00. Plan: M-1 now → Step 5 → at about 16:47 Step 12a (R3 access denied in the app, both devices) → Step 6 → after 17:00, the supervisor reads R3 rows/storage = 0.
- Released to qa: M-1 device check.

## 16:11:53 PST: M-1 release re-sent to qa (supervisor)
- The earlier release send was unconfirmed, so it was re-sent once via the session name "qa". Step 5 waits for supervisor review of the M-1 result.

## 16:12 PST: M-1 result (qa)
- PASS on host iPhone 17 (F11BA960), R1 → Photos → QA-file.txt ("Shared by Test joiner · 91 B · 11/6/2026, 2:16:52 PM").
- Download original → share sheet header "QA-file · Text Document · 91 bytes" → Save to Files → On My iPhone, "Save as QA-file" (iOS hides the extension) → Save. In-app text after save: "Original saved. Original verified (91 B)."
- On-disk check (read-only, sim File Provider Storage): new file `QA-file.txt`, 91 bytes, 16:12; sha256 4c8c9108…1f75 = the fixture hash in docs/evidence/final-qa/SETUP.md. The older `7ce082f9-9beb-426c-8427-918802fb9b64.txt` (14:18) in the same folder is the pre-fix save; it was left untouched.
- Evidence: docs/evidence/2026-11-06-final-4-m1-filename.png (Save-as sheet), -m1-sharesheet.png, -m1-saved.png.
- STOPPED. Step 5 not started.

## 16:13:28 PST: M-1 PASS (supervisor verified); STEP 5 GO to qa
- I opened final-4-m1-saved.png: "QA-file.txt … Original saved. Original verified (91 B)." On the host sim, I read File Provider Storage/QA-file.txt (16:12:24): 91 B, sha256 4c8c9108…1f75 = fixture. M-1 CLOSED on the simulator.
- qa: run STEP 5 as written in docs/reviews/codex-final-qa-step5-6-plan.md (R1 only; locations host 37.7793,-122.4193 / guest 37.7810,-122.4170 were set at 14:24:10). Sub-step 6 (sign-out while sharing) is NOT RUN. STOP after Step 5. Leave both apps outside R3 so Step 12a at about 16:47 starts clean.

## 16:19 PST: Step 5 result (qa)
R1 only; navigation Rooms → R1 → Map. Items 1–5 run, item 6 NOT RUN. STOPPED after item 5.
1. Host Map opened (no location prompt; "Allow location sharing" already ON). Host map stayed on a world view: the locate button spun >10 s and never produced a host fix, so no host pin appeared anywhere. No pin in a wrong place.
2. PASS. Draw route → 3 points (mid-Atlantic → central Africa → South Atlantic, a "<" shape; drawn at world scale because the host map could not center on SF) → Save route. After zoom-out the saved route shows in blue. final-5-host-route.png.
3. PASS: the guest showed the same 3-point route the FIRST time it opened Map (16:16), with no reopen. The guest Map was not open during the save, so a live redraw while the screen is open was not exercised. final-5-guest-route.png.
4. PASS on the host. Start activity → guest switched to "Activity running" live. Guest toggle → iOS "Allow "Moment" to use your location?" → Allow While Using App → guest "Sharing your position", "You · Updated just now". Host list "Test joiner · Updated just now"; host map red "TJ / Test joiner" pin on the SF Bay coast (matches 37.7810,-122.4170). The guest's own map pin was NOT checked (off-screen). final-5-{host,guest}-sharing.png, final-5-host-sharing-pin.png, final-5-guest-location-prompt.png.
5. PASS. End activity → confirm "End the activity? Everyone stops sharing and all positions are removed." → End activity at 16:18:30. By 16:18:35 the host pin and the "Sharing now" row were gone and the host showed "No activity running". Guest: "No activity running", toggle OFF, location arrow gone from the status bar. final-5-{host,guest}-ended.png. Ready for the live_presence = 0 check.
6. NOT RUN.
Findings (none blocking, as far as I can judge):
- F5-1 (host location): the host sim never got a location fix (locate spinner). Host self-sharing was not part of this step, so this is UNVERIFIED rather than failed.
- F5-2 (minor UX): in Draw route mode, tapping a map label ("AFRICA") opens the Apple Maps place card instead of adding a point. final-5-host-label-placecard.png.
- F5-3 (minor): right after Save route the host map jumped to a max-zoom plain-water view; Recenter did nothing and a manual pinch-out was needed. final-5-host-after-save-zoom.png.
- F5-4 (dev console error): opening Map on the guest showed "Uncaught (in promise, id: 0) Error: Unable to find the 'AppleMapsViewWrapper' view with tag '298'". Dismissed. final-5-guest-console-error.png.
- Tooling note: the first tap on the guest sharing toggle had no effect; the second showed the iOS prompt. One earlier host tap was also dropped, so I do not count this as an app bug.

## 16:19:35 PST: STEP 5 ACCEPTED with findings (supervisor, server read + screenshot)
- Server R1 (read-only SQL): live_presence = 0. Both room_members share_location = false. rooms.activity_state = ended, seq 1, started 00:16:33Z, ended 00:18:31Z (= qa's 16:18:30). route = 3 points (-16.19,-31.99 / 4.68,17.23 / -44.76,-3.87), which matches qa's Atlantic/Africa "<" shape.
- final-5-host-sharing-pin.png (which I looked at): "TJ / Test joiner" pin on the SF coast, the "Sharing now" row "Test joiner · Updated just now", "Activity running".
- PASS: 2 route save, 3 guest sees route (first open; a live redraw on an already-open Map is NOT exercised), 4 start/share/pin, 5 end clears pin/row within 5 s and presence = 0. Item 6 NOT RUN.
- Findings (open, not blocking Step 6):
  - F5-1 (moderate): the host never got its own location fix; the Map would not center on SF. A route on a real device is drawn at world scale unless the user pans. Developer: diagnose read-only (sim location/permission state vs app code) and report. Do not change main during QA.
  - F5-3 (moderate, likely linked to F5-1): after Save route, the camera jumped to max-zoom water and Recenter did nothing.
  - F5-2 (minor): a Draw-route tap on a map label opens the Apple Maps place card instead of adding a point.
  - F5-4 (minor, dev-only): guest console "Unable to find the 'AppleMapsViewWrapper' view with tag '298'". Severity is unknown until checked against the release build.

## 16:20:32 PST: 6a READY (qa)
- R1 activity running again (host Start ~16:20). Guest sharing ON ("Sharing your position", "You · Updated just now"). Host: red "TJ / Test joiner" pin on the SF Bay coast and row "Test joiner · Updated just now". Evidence: final-6-pre-{host,guest}.png. Waiting for the developer's "6a CLEARED at <time>".
## 6a CLEARED at 16:20:35 (developer): simctl location clear on guest 17 Pro

## 16:21:36 PST: F5 diagnosis reviewed (supervisor)
- F5-3 ROOT CAUSE accepted: the camera centers on the route bbox middle at a fixed zoom 15, so a world-scale route centers on open ocean. Recenter repeats the same camera. F5-4 ROOT CAUSE accepted: the imperative setCameraPosition runs in the commit that mounts the map, before the native view registers. The promise is not caught. In a release build the first centering silently fails. The developer stages both on a branch (cameraFor + declarative first camera + .catch). No merge until supervisor review and a named gap.
- F5-1 ROOT CAUSE accepted: the host app has never been granted location (locationd entry has no Authorization). By design (M6) the Map does not prompt; only the Share toggle does. A "Show my location" control would be a new permission path, so this is a HUMAN product decision. Recorded as a known gap; not implemented.
- F5-2: the developer may check expo-maps v58 POI selection control read-only. Lowest priority.

## 16:22 PST: 6a result (qa)
- PASS (truthful stale). Clear at 16:20:35. Host at +7 s and +32 s: still "Test joiner · Updated just now". At the next check, +70 s (16:21:45), the host row read "Location stale · 1 min ago" in orange, so the change happened between +32 s and +70 s.
- Pin: still the same red "TJ / Test joiner" pin at the last position, with no visible stale styling on the pin at this zoom. Only the row text changed.
- Guest at 16:21:53: toggle ON, "Sharing your position", own row "You · Location stale · 1 min ago" (orange).
- Evidence: final-6a-host.png, final-6a-guest.png. Developer: please restore the guest location now.
## 6a RESTORED at 16:22:09 (developer): guest 17 Pro simctl location set 37.7810,-122.4170
## 16:23:12: F5-3/F5-4 staged (developer): 57e5ce4 on branch f5-map-camera (parent main cb1d4df), NOT merged; tsc/lint clean, npm test 95/95. Waits for supervisor review + gap.

## 16:23:28 PST: 57e5ce4 (branch f5-map-camera) ACCEPTED on code review for one gap (supervisor)
- Diff read (3 files): cameraFor replaces centerOf (bbox middle, zoom = clamp(log2(360/(span×1.4)), 1, 15), antimeridian-aware). The first centering is a one-time state snapshot passed as cameraPosition. The none→mine→points machine is unchanged. Recenter is the only imperative call and has .catch. expo-maps 58 iOS17/18 sources apply props.cameraPosition on appear and in .onChange (checked), so no mount-race call remains. tsc/lint/npm test 95/95 are developer-reported and were not re-run by me.
- Note N-3 (minor, accept): the fit treats the latitude span like longitude degrees and ignores Mercator stretch and the view aspect ratio. A tall, high-latitude route may be cropped at the edges, and the 1.4 padding mostly covers it. The device check decides.
- Gap plan: AFTER Step 12a (R3 expiry) and Step 6 are reported, the developer fast-forwards main to 57e5ce4 and reloads. qa then: the host opens R1 Map and sees the whole route (not water); Recenter gives the same fit; the guest opens R1 Map with no "AppleMapsViewWrapper" console box. Screenshots final-5b-*.png.

## 16:26 PST: Step 6 result (qa)
- 6a: PASS (truthful stale); details in the 16:22 entry. Restore by the developer at 16:22:09; by 16:22:25 the host row was back to "Updated just now" (≤16 s).
- 6b: PASS (truthful). Guest left the app at ~16:22:38 to open iOS Settings → Privacy & Security → Location Services → Moment, chose Never at 16:24:12, and returned at ~16:24:26.
  - Guest on return: toggle OFF, red "Location access is off for Moment. Turn it on in Settings to share.", an "Open Settings" button, and "Nobody is sharing yet."
  - Host at 16:24:34: no guest pin, "Nobody is sharing yet." The guest was backgrounded from ~16:22:38, so the exact moment the host pin cleared (backgrounding versus Never) was not observed.
  - Evidence: final-6b-guest.png, final-6b-host.png.
- Restore: the in-app "Open Settings" went straight to Moment's location page. I chose "While Using the App" at 16:24:52 and returned with the iOS "◀ Moment" breadcrumb.
  - Guest then showed "Location access was turned off, so sharing stopped." Sharing did NOT restart on its own.
  - I turned the toggle on: "Sharing your position". Host at 16:25: fresh red "TJ / Test joiner" pin and "Updated just now".
  - Evidence: final-6b-guest-return.png, final-6b-host-restored.png.
- End activity on the host at 16:25:23. Both devices show "No activity running"; guest toggle OFF. final-6-host-ended.png. Guest location permission = While Using (restored); simulated location = 37.7810,-122.4170 (developer).
- Notes: in 6a the pin kept its normal red look while the row said stale (row text only). As in Step 5, the first tap on the guest sharing toggle was ignored and the second worked (likely tooling). Settings search in the sim found neither "Moment" nor "Location Services"; I navigated manually.
- STOPPED. Ready for Step 12a on release.

## 16:26:14 PST: STEP 6 ACCEPTED with finding F6-1 (supervisor, server read + screenshot)
- Server R1: live_presence = 0, share_location false/false, activity ended (seq 2, 00:19:58Z–00:25:23Z).
- 6a: I looked at final-6a-host.png. The row reads "Location stale · 1 min ago" in orange; the stale label appeared at about +70 s after the clear (16:20:35). Fresh again 16 s after the restore. PASS for the row.
- F6-1 (moderate, spec): the map PIN keeps the normal red "TJ" look while stale. APP_CONCEPT §location: stale coordinates must not look like current ones. The row is truthful, but the map is not. Fix target: a stale pin is visibly different (e.g. grey/dimmed plus a "stale" label). The developer stages it on a branch; it goes with the 57e5ce4 gap if ready.
- 6b: PASS (truthful). Guest: "Location access is off for Moment…" + Open Settings. Host: no pin, "Nobody is sharing yet." After the restore: "Location access was turned off, so sharing stopped." and no auto-resume, which matches the spec. Caveat (qa): the guest was backgrounded from ~16:22:38, so the trigger (background vs Never) is not separated.
- NEXT: Step 12a at 16:46:30 (R3 expires 16:46:12). Then the merge gap (57e5ce4 ± F6-1) and the F5/F6 device re-check. After 17:00 the janitor runs, and I read R3 rows/storage.
## 16:27:15: F6-1 staged (developer): 6e97015 on branch f5-map-camera (parent 57e5ce4), NOT merged; tsc/lint clean, npm test 96/96. Waits for supervisor review; same gap as 57e5ce4.

## 16:27:41 PST: 6e97015 (F6-1, on f5-map-camera) ACCEPTED on code review (supervisor)
- Diff read (4 files): the stale pin gets marker id "<userId>:stale" and the title "<name> · stale". The marker map passes pin.id straight through, and no other code keys on the marker id. STALE_AFTER_MS = 60 s with a 15 s re-render, which is consistent with qa's +70 s. The hypothesis (SwiftUI ForEach keeps the same-id marker and does not swap monogram→systemImage) is plausible and UNPROVEN until the device check. tsc/lint/96/96 are developer-reported.
- MERGE GAP (after Step 12a is reported): the developer fast-forwards main to 6e97015 (contains 57e5ce4) and reloads. qa then:
  (a) host R1 Map: the whole saved route is visible (not water); Recenter gives the same fit. final-5b-host-fit.png
  (b) guest R1 Map: no "AppleMapsViewWrapper" console box. final-5b-guest-open.png
  (c) Start activity, guest shares, developer clears the guest location → within ~75 s the host pin becomes a grey clock titled "Test joiner · stale"; developer restores → TJ returns. End activity. final-6c-host-stale.png / final-6c-host-fresh.png

## 16:48 PST: Step 12a result (qa)
- PASS. Started after 16:46:30 (R3 expiry 16:46:12).
- 1. Host iPhone 17 Rooms (16:46:47): R3 is GONE from the list. Only "Final QA R1 2026-11-06 / General · Ends in 3d 20h" remains. Guest 17 Pro Rooms (16:47:03, via moment:///): the same, R3 gone, only R1.
- 2. N/A: no R3 entry on either device, so there was nothing to tap.
- 3. Guest Join a room → 04693 → Continue (16:47:30): "Join room" screen with the red text "This invite is invalid or the room has ended." and a "Back to rooms" button. Join refused.
- No rooms or accounts were created. Evidence: final-12a-host-rooms.png, final-12a-guest-rooms.png, final-12a-guest-rejoin.png. STOPPED.

## 16:48:01 PST: STEP 12a ACCEPTED (supervisor); MERGE GAP OPEN for 6e97015
- Server at 00:47:49Z: R3 5098a0ec…8d40 has expires_at 00:46:12Z, and its rows still exist (members 2, messages 1, media 0) because the janitor has not run yet. The app still hides R3 on both devices and rejects the 04693 rejoin ("This invite is invalid or the room has ended."). Access is denied at read time by expires_at, independent of cleanup. PASS.
- Pending: after the 17:00 janitor run, the supervisor reads R3 rows and storage (expected: 0).
- GAP: the developer fast-forwards main to 6e97015 and reloads, then posts "main = 6e97015 live". qa then runs the checks (a)(b)(c) from the 16:27 entry.
## main = 6e97015 live at 16:48:12 (developer)
- F5-3/F5-4 camera fit + cameraPosition prop, F6-1 stale pin identity/title. npm test on main: ℹ pass 96 ℹ fail 0 . Metro Fast Refresh delivered to host 17 and guest 17 Pro.

## 16:49:57 PST: 6c READY (qa)
- R1 activity running on 6e97015; guest sharing ON; host shows a fresh red "TJ / Test joiner" pin. Evidence: final-6c-host-pre.png.
## 6c CLEARED at 16:49:59 (developer): simctl location clear on guest 17 Pro
## 6c RESTORED at 16:51:34 (developer): guest 17 Pro simctl location set 37.7810,-122.4170

## 16:51:48 PST: interim supervisor read of the 6e97015 re-check
- main = 6e97015 (git log).
- I looked at final-5b-host-fit.png: the whole 3-point route is in view over the South Atlantic and Africa, not water at max zoom. The southern point is near the lower edge (N-3: tall fit margin) but visible.
- I looked at final-6c-host-stale.png: a grey clock pin titled "Test joiner · stale" at the SF coast. The developer reports it stale at +82 s, still red at +42 s. F6-1 fix CONFIRMED on the simulator.
- Waiting for qa's (b) guest console result, the Recenter result, the fresh TJ return, and End activity.

## 16:52 PST: 5b/6c result on 6e97015 (qa)
- (a) PASS. Host R1 → Map opened fitted to the whole 3-point route (no max-zoom water). After a pan to the Southern Ocean, Recenter returned to the identical fit. final-5b-host-fit.png.
- (b) PASS. Guest R1 → Map: no "AppleMapsViewWrapper" console box. The route was fitted on open. final-5b-guest-open.png.
- (c) PASS. 6c READY at 16:49:57; developer clear at 16:49:59.
  - Host pin still red "TJ" at +42 s (16:50:41). At the next check, 16:51:21 (+82 s), it was a grey clock pin titled "Test joiner · stale" (title visible without a tap). final-6c-host-stale.png.
  - Restore at 16:51:34 → red "TJ / Test joiner" pin back by 16:51:40 (≤6 s). final-6c-host-fresh.png.
  - End activity 16:51:54; host shows "No activity running".
- Minor new finding F5b-1: with an activity running, Recenter fits route + member pin, but both edges are clipped (the pin label is cut off at the left, the route at the right). It needs more padding. Not blocking.
- Tooling: the first guest toggle tap was dropped again; the second worked. STOPPED.

## 16:52:27 PST: F5/F6 re-check ACCEPTED on 6e97015 (supervisor); STEP 7 GO
- (a) route fit + Recenter PASS, (b) no guest console box PASS, (c) stale grey clock at ≤82 s and fresh TJ 6 s after the restore PASS. F5-3, F5-4 and F6-1 are CLOSED on the simulator. Activity ended at 16:51:54.
- F5b-1 (minor, same root as N-3): during an activity, the Recenter fit of route + pin clips the edges, and a pin label is cut. Known gap; the fix is a larger padding or a latitude/aspect-aware fit. Not tonight.
- Open known gaps from Steps 5–6: F5-1 (no own-location fix without the Share toggle; HUMAN product decision), F5-2 (a label tap opens the place card while drawing).
- STEP 7 (Batch B, face gallery, disabled path) GO: the developer first adds the GENERATED pattern image to the guest 17 Pro with simctl addmedia, then posts "## 7 IMAGE READY at <time>". qa then runs Step 7 as written in codex-final-qa-steps.md. The supervisor reads the enrollment rows and the face-refs objects for R1/guest after "Stop and remove".
## 7 IMAGE READY at 16:52:33 (developer): generated checkerboard docs/evidence/final-qa/QA-pattern.jpg (800x800, 13840 B, sha256 035274e07477dbf44539c719065b6f3b24ceffa8ae68ade35ce638f05cd8cb11, no person) added to guest 17 Pro Photos via simctl addmedia. Note: the same fixture was already added at setup, so Photos may show it twice.

## 16:54 PST: Step 7 BLOCKED at item 2 (qa)
- 1. PASS. Consent text, verbatim: "Find photos of you in this room" /
  • "You add one reference photo of your face. It is used only in this room and is never shown in the shared gallery."
  • "Photos in this room (not videos) are compared with it by an external face-matching service (Amazon Rekognition)."
  • "Results are estimates and can be wrong. You can hide any photo with "Not me"."
  • "Your reference and results are deleted from the server when you stop, leave the room, or the room ends."
  • "This is optional. Everything else in the room works without it."
  It covers room-only, estimate, private reference, external service and removal. final-7-consent.png.
- 2. FAIL. Choose from library → first checkerboard (QA-pattern.jpg). The app showed red text "Calling the 'saveAsync' function has failed → Caused by: Cannot create image data for given image format", and "Agree and save" stayed disabled. Nothing was saved, so there is no 7 SAVED. final-7-pick-error.png.
- 3. NOT RUN (nothing to remove). STOPPED; waiting for direction. I did not try other images.

## 16:53:59 PST: STEP 7 BLOCKED — finding F7-1 (supervisor)
- Item 1 (consent) PASS per qa: room-only, estimate/"Not me", private reference, external service (Amazon Rekognition), removal, optional.
- F7-1 (HIGH for the face feature): picking the generated pattern (QA-pattern.jpg, 800x800 JPEG, 13,840 B, sha256 035274e0…cb11, verified by me) fails with "Calling the 'saveAsync' function has failed → Caused by: Cannot create image data for given image format". "Agree and save" stays disabled, so nothing reaches the server. Until the root cause is known, ANY reference photo may fail the same way, which would block face enrollment entirely.
- The developer diagnoses the root cause first (which call, which format/options, and whether a normal camera-roll JPEG/HEIC also fails), with no code on main. The fix goes on a branch and is accepted only after supervisor review and a named gap. qa waits; item 3 is NOT RUN.
## 16:54:53: F7-1 staged (developer): cc97c7f on branch f7-face-resize (parent main 6e97015), NOT merged; tsc/lint clean, npm test 99/99. Waits for supervisor review + gap.

## 16:56 PST: F7-1 fix cc97c7f ACCEPTED on code review (supervisor); GAP
- Root cause: an empty resize transformer produced a 0x0 image for inputs ≤1280 px, so saveAsync failed. cc97c7f skips the resize when none is needed. Diff read by the supervisor; developer reports tsc/lint clean, npm test 99/99 (not rerun by supervisor).
- N-4 (minor, not blocking): the comment says "longest side" but the code handles only width or height.
- GAP: developer fast-forwards main to cc97c7f, reloads Metro on host 17 and guest 17 Pro, and posts "main = cc97c7f live". Then qa retries Step 7 on the guest in R1 with QA-pattern.jpg only (no other images, no camera). F7-1 stays OPEN until the device retry passes.
## main = cc97c7f live at 16:56:12 (developer)
- F7-1 face reference resize fix. npm test on main: ℹ pass 99 ℹ fail 0 . Metro Fast Refresh to host 17 and guest 17 Pro; guest left on Rooms (moment:///), docs/evidence/2026-11-06-final-7-guest-neutral.png.

## 16:57:21 PST: 7 SAVED (qa)
- On cc97c7f: Choose from library → checkerboard QA-pattern → preview shown, "Agree and save" enabled → tapped at ~16:57:17. The app returned to Photos & files / Me tab with "Manage" (top right), "No photos of you yet.", "New photos in this room are checked when you open this view."
- No "Likely you" badge, no count. NOTE: no "off in this draft" text is visible on this screen (expected per plan). final-7-picked.png, final-7-after-save.png. Pausing before Stop and remove until the supervisor reads the server.

## 16:58 PST: 7 READ, server state after save (supervisor)
- qa: 7 SAVED at 16:57:21. The pattern preview showed and "Agree and save" was enabled, so F7-1 is FIXED on the device (guest 17 Pro, main cc97c7f).
- Server, read by me: face_enrollments has 1 row, id 577da051-7c95-4ab9-96eb-5219c4246869, R1 (3514615f…, code 03424), user 97ed7d32-d88b-4e0a-9ddd-03477f1d64be, 00:57:18Z. face_jobs 0, face_matches 0. storage face-refs has 1 object: 3514615f…/97ed7d32…/ref-9eeda6ea-….jpg, 13,946 B, image/jpeg, owner = guest. These are the only face rows/objects.
- F7-2 (deviation, open): the Me tab shows "No photos of you yet." / "New photos in this room are checked when you open this view." The step's expected "off in this draft" copy is missing. The developer must say whether matching is really disabled in this draft (no Rekognition call possible) or live. If disabled, the UI must say so; if live, the step's expectation and the draft label must change. No "Likely you" badge and no count (matches the expectation).
- Next: qa runs "Stop and remove" → confirm. Supervisor checks enrollment 0 and face-refs objects for R1/guest = 0.

## 16:58 PST: 7 REMOVED (qa)
- Me tab → "Manage". The page shows "YOUR REFERENCE PHOTO" (the checkerboard), "Only you can see this. It is used only in this room.", and the buttons "Replace photo" and "Stop and remove". final-7-manage.png.
- Tapped "Stop and remove". The confirm dialog reads "Stop finding photos of you?" / "Your reference photo and all results for this room are deleted from the server." with the buttons "Stop and remove" and "Cancel". final-7-remove-confirm.png.
- Confirmed at ~16:58:35. The Me tab returned to the initial state: "Photos of me" / "Find the photos you appear in. Optional, and only for this room." / "Set up". final-7-removed.png.
- Step 7 summary: item 1 consent PASS; item 2 save PASS on cc97c7f (F7-1 fixed on the device), but the "off in this draft" text was not shown after save (deviation); item 3 removal PASS in the UI. Server deletion check is the supervisor's. STOPPED.

## 17:00 PST: Step 7 removal, server state + plan to 19:59 (supervisor)
- qa: 7 REMOVED at 16:58; the UI is back to "Set up". Read at 00:58:59Z: face_enrollments 0 (577da051 gone). face-refs has 1 object for R1/guest (the ref), with cleanup_jobs b790ce03 queued (reason face_enrollment_deleted, created 00:58:34Z, not yet verified empty). The janitor runs */5; I'm re-reading after the 01:00Z run.
- F7-2 diagnosis accepted: matching is disabled (the face-match edge call at 00:57:18Z returned 503, so Rekognition was not reached). On return from the face screen, the mounted PhotosOfMe never re-reads the cached 'disabled' run. The fix is staged on a branch for review; not on main.
- The 3-hour delegation to qa (until 19:59 PST) has been read. Released: Step 8 (plan preview, host). Prep in parallel: D1 disposable credentials (developer generates them; the password is not committed; STOP if email confirmation is required) and R2 creation, followed by the exact-ID expires_at change (needs my ACK).
## 16:59:58: F7-2 staged (developer): 5147847 on branch f7-2-run-sync (parent main cc97c7f), NOT merged; tsc/lint clean, npm test 103/103. Waits for supervisor review + gap.

## 17:01 PST: GO for qa (supervisor; posted here because the cross-session message to qa was held)
- Step 8 GO on HOST 17: open the plan/upgrade preview. It must be labelled demo, with no real payment path. Do NOT complete any purchase or sheet. Screenshot, then STOP.
- D1: sign-up needs an email and a password. The developer generates a disposable reserved-domain address and a random password and sends them to qa (never committed). If email confirmation is required, STOP. Step 9 waits for the credentials and the 17e being ready.
- R2: after Step 8, create R2 in the HOST app ("1 day"), have the guest join by code, and post the code. The developer proposes the exact-ID expires_at change, the supervisor ACKs, and the developer runs it.
- Step 10 and Step 12 after that; final report by 19:30.
## 17:01:07: FOR QA, D1 READY (developer)
- My direct message to qa is HELD by the qa session (permission-mode mismatch), so here is the non-secret part. 17e is on Welcome with a live Metro link (current main cc97c7f); sign-up needs no email confirmation (mailer_autoconfirm=true). D1 email: d1-final-qa@example.com. The test-only password is NOT in the repo: read it from /private/tmp/claude-501/-Users-hyeonminyang-Desktop-IYA-Project/5b1d7f4f-138e-4a62-aa8a-295cadc99a01/scratchpad/d1pw.txt (local, mode 600). After sign-up, the developer records the D1 UUID.
- Step 7 "off in this draft" missing: real bug (F7-2); matching is off (face-match 503 at 16:57:18, no Rekognition call). Fix 5147847 staged, awaiting supervisor review.

## 17:02 PST: Step 7 server PASS, Step 12 (R3) PASS, F7-2 accepted (supervisor)
- Step 7 (my read at 01:00:37Z): cleanup_jobs b790ce03 verified_empty_at 01:00:02Z. face-refs objects for R1/guest = 0, face_enrollments = 0. Step 7 PASS overall: consent, save (F7-1 fixed on cc97c7f), removal in the UI and on the server. F7-1 CLOSED.
- Step 12 (R3 5098a0ec…8d40, code 04693): rooms 0, members 0, messages 0, media 0, storage objects under the prefix 0. cleanup_jobs room_deleted for room-media (01:00:03.077Z) and face-refs (01:00:03.401Z) are verified, with no errors. With 12a (access denied in the app on both devices), Step 12 PASS.
- F7-2 fix 5147847 (branch f7-2-run-sync, parent cc97c7f) ACCEPTED on code review. On focus the view re-reads the per-room cached run; the cache is cleared on removal and on Retry, so rooms never share an entry. Developer reports tsc/lint 0 and tests 103/103 (not rerun by me). N-5 (minor): Retry with 0 pending falls back to 'ready', same as before. GAP: ff main → 5147847 and reload the sims. Device check in the Step 10 face-disabled path. F7-2 stays OPEN until then.
- D1 prep: the developer reports auth mailer_autoconfirm=true (no email confirmation). Credentials d1-final-qa@example.com + a random password went to qa by message only. The 17e is on Welcome with Metro live.
## main = 5147847 live at 17:01:32 (developer)
- F7-2 Photos of me run sync. npm test on main: ℹ pass 103 ℹ fail 0 . Metro Fast Refresh bundles served to the 3 sims (host 17, guest 17 Pro, 17e); no new errors.

## 17:48 PST: 8 PASS (qa)
- HOST 17, Plus preview (moment:///plan-preview): orange "Preview — no payment" badge; copy "Nothing can be bought yet"; price "Not set yet"; TBD values marked as placeholders. "Get Plus" opens only an alert "Preview only — Purchases are not available in this version. No payment is taken and your plan stays Free." No sheet, no StoreKit (code: Alert only). Evidence: 2026-11-06-final-8-plan-preview.png, final-8-cta-alert.png.
- Note: qa missed the 17:01 GO because cross-session messages were held; from now on qa reads this log and the tmux panes directly. Next: R2 create on HOST, guest join, then Step 9 D1 on 17e.

## 17:49 PST: R2 CREATED (qa) — code 19455
- HOST 17 created "QA R2 reminder" (Sports, 1 day, ends 11/7/2026 17:47:39 shown). Code 19455. Guest join next. Developer: propose the exact-ID expires_at change for R2; supervisor ACK.
## 17:49 PST: R2 GUEST JOINED (qa)
- Guest 17 Pro joined R2 by code 19455 ("Test joiner joined · 5:48 PM"). Room shows "Ends in 23h 59m" and the in-chat "Room ends soon" banner already (room ends within 24h). Evidence final-11-r2-created.png, final-11-r2-guest-joined.png.
- DEVELOPER: propose the exact-ID R2 expires_at change now; SUPERVISOR: ACK here. qa moves to Step 9 (D1 on 17e) meanwhile.
## 17:48:54: R2 expiry proposal sent to supervisor (developer)
- R2 = 016c49bf-17dc-4ab7-8a5c-3f4376f0c160 (code 19455), expires_at 2026-11-08 01:47:56.484Z, expiry_version 1, members 1. Proposed exact-ID update: expires_at = now()+24h3m AND expiry_version+1 (guarded by id+expires_at+version). Best run after the guest joins. Waiting for supervisor ACK; not run.

## 17:49 PST: R2 expires_at ACK (supervisor)
- My read at 01:49:04Z: R2 016c49bf-17dc-4ab7-8a5c-3f4376f0c160, "QA R2 reminder", code 19455, expires_at 2026-11-08 01:47:56.484Z, expiry_version 1, members 2, expiry_reminders 0. Total rooms 2 (R1 + R2).
- ACK: the developer's guarded update (id + current expires_at + version 1) sets expires_at = now() + 24 h 3 min and expiry_version = 2. That mirrors update_room_expiry. The local reminder should fire about 3 min after the update on both sims (Step 11).
- FIXTURE LIMIT (for qa): rooms created = R1, R3 (purged), R2 = 3 of 3 approved. Do NOT create another room. Step 10 "create → join" reuses R1/R2, or shows the create screen without submitting it.
## 17:51 PST: Step 9 WAITS ON HUMAN (qa)
- qa cannot open the 17e yet: the simulator access prompt for iPhone 17e needs the human's approval.
- qa will not type the D1 password: the sign-up goes to the hosted Supabase Auth, and qa's rules forbid entering passwords into a non-local identity service. qa did not read d1pw.txt. Proposal: the human types the D1 email/password on the 17e sign-up screen (about 1 minute); qa then does join R1, 1 message, avatar, Profile → Delete account. Alternative for the supervisor/developer: create D1 server-side and hand over a signed-in 17e.
- Meanwhile: R2 expires_at (developer propose, supervisor ACK), then Step 10 walkthrough on host/guest.
## 17:49:32 PST: R2 EXPIRY ADJUSTED (developer, supervisor ACK)
- RETURNING: id 016c49bf-17dc-4ab7-8a5c-3f4376f0c160, expires_at 2026-11-08 01:52:32.414Z, expiry_version 2, ran_at 2026-11-07 01:49:32.414Z (members 2 per supervisor read 01:49:04Z).
- Reminder due from 17:52:32 PST: the local reminder on each phone at about that time (after the rooms broadcast reschedules it); the server expiry-reminders job (*/5) records version 2 at its 17:55 PST run.
## FOR QA (relayed from supervisor): room fixtures are FULL, 3 of 3 (R1, R3 purged, R2). Do NOT create any more rooms. Step 10 "create -> join" must reuse R1 or R2, or show the create screen without submitting it.
- 17:53 UPDATE: human is away; Step 9 DEFERRED until the human returns (no workaround by other sessions). qa continues Step 10.

## 17:55 PST: Step 8 ACCEPTED, Step 9 DEFERRED (supervisor)
- Step 8 PASS. I looked at final-8-cta-alert.png: "Preview — no payment" badge, "Nothing can be bought yet", and the TBD values are called placeholders. "Get Plus" opens only the alert "Preview only — Purchases are not available in this version. No payment is taken and your plan stays Free."
- Step 9 (D1 account deletion) DEFERRED until the human is back, per qa's 17:53 note. Two things need the human: the 17e simulator access prompt and typing the D1 password into hosted Auth. No session creates D1 server-side or works around this. D1 fixture count is still 0 of 1. The developer's local password file stays uncommitted.
- The R2 ACK is above (17:49 PST); the update ran at 17:49:32. Next: Step 11 local reminder (due ~17:52:32) on both sims. qa continues Step 10. I read expiry_reminders v2 after the 01:55Z cron run.

## 17:57 PST: 11 GUEST REMINDER PASS (qa)
- Guest 17 Pro Notification Center: Moment "Room ends in 24 hours — QA R2 reminder disappears tomorrow. Download any photos and files you'd like to keep." delivered "3m ago" (≈17:53, matches due 17:52:32). In-room "Room ends soon" banner + "Ends in 23h 56m" also shown. Evidence final-11-guest-notification.png. Host check next.
- 17:57 HOST 17 too: same "Room ends in 24 hours — QA R2 reminder…" notification, "3m ago". Step 11 device side PASS on both phones (evidence final-11-host-notification.png). Server expiry_reminders v2 read = supervisor. qa → Step 10 walkthrough (no new rooms).

## 17:57 PST: Step 11 server side PASS (supervisor read 01:56:40Z)
- expiry_reminders for R2 016c49bf…c160: exactly 2 rows, both expiry_version 2, recorded by the 01:55:00Z cron run. Host edeaea51… and guest 97ed7d32…, status no_token, channel in_app, expires_at 2026-11-08 01:52:32.414Z. There are no v1 rows: at 01:50 the moved expiry was still more than 24 h away, as expected.
- no_token is expected: there is no APNs push token on the simulators, and remote push stays UNVERIFIED. The device half of Step 11 (the local notification on both sims, tap → room opens; after R2 ends, tap → gone screen) is qa's evidence.
- 17:59 Step 11 "tap → room opens": NOT VERIFIED. On both sims, injected taps on the lock-screen notification are read as a partial swipe (shows "Open" action, never launches). Simulator input limit, not an app finding. Leave as UNVERIFIED unless the human taps it later.

## 18:00 PST: 10 walkthrough progress on R2 (qa)
- create: R2 created on host at 17:47 (counts as the walkthrough's create; no new room). join: guest by code 19455 (17:48). PASS.
- chat: guest "Step 10 walkthrough hello from guest" 17:58 → host sees it live. PASS (final-10-guest-chat-arrived.png, final-10-host-chat-arrived.png).
- arrival/status: guest Arrived → "Test joiner arrived · 5:58 PM" on both; guest status Resting → host "Test joiner: Resting · 5:58 PM". PASS (final-10-host-status.png).
- media: guest uploaded generated QA-A.jpeg (44 KB) to R2; host sees it, Download original → "Saved to Photos. Original verified (44 KB)." PASS (final-10-host-media-saved.png). New R2 media object 1 (cleaned with R2).
- Next: map, face disabled path, leave.
## 18:01 PST: 10 map + face; F7-2 DEVICE PASS (qa)
- map: host R2 Map opens; Start activity → "Activity running"; End activity confirm → ended. PASS (final-10-host-map-activity.png). (Deep map checks were Step 5/6.)
- face disabled path + F7-2: guest R2 Photos → Me → Set up → consent → generated checkerboard (QA-pattern, no person) → Agree and save (~18:00:20) → returns to Me tab showing "Face matching is off in this draft. Your reference is saved; photos are sorted when face matching is turned on." + Manage. F7-2 fix 5147847 verified on device → F7-2 can CLOSE (final-10-f72-face-off.png).
- New fixture: 1 face_enrollment for guest in R2. Next: guest LEAVES R2 (Info → Leave), which must delete it; SUPERVISOR please read face_enrollments / face-refs for R2 after the leave.
## 18:01 PST: 10 LEAVE done — Step 10 device walkthrough PASS (qa)
- Guest R2 Info → Leave room → confirm "You will lose access…" → back on Rooms; R2 gone, only R1 listed (final-10-guest-left.png).
- Step 10 summary: create, code join, chat, arrival, status, media save (original verified), map activity start/end, face disabled path (F7-2 fixed), leave — all PASS on simulators. QR scan join not run (no camera on sim; code join used).
- SUPERVISOR: please read for R2 016c49bf…: room_members (guest gone), face_enrollments for guest = 0 and face-refs objects for R2/guest = 0 after leave (cleanup job), and close F7-2.
- qa next: Step 11 remaining part (R2 "gone screen" after end) is out of window (R2 ends 11/7 17:52) → DEFERRED unless developer ends R2 early with your ACK. Then final report.

## 18:02 PST: Step 10 + F7-2 ACCEPTED; R2 leave read (supervisor)
- F7-2 CLOSED: I looked at final-10-f72-face-off.png. After save, the Me tab immediately shows "Face matching is off in this draft. Your reference is saved; photos are sorted when face matching is turned on." + Manage, on main 5147847.
- Step 10 ACCEPTED as qa reported: create (R2), code join, chat, arrival, status, media save with original verified, map activity, face disabled path, leave. QR-scan join NOT RUN (no camera on the sim).
- Server read at 02:01:05Z, R2 016c49bf…:
  - room_members = host only, so the guest's membership is gone.
  - face_enrollments R2 = 0 (all rooms 0).
  - face-refs: 1 object remains (R2/guest ref-849cc6d8…jpg, 13,946 B), with cleanup_jobs face_enrollment_deleted queued for that prefix, not yet verified. Re-read after the 02:05Z janitor run.
  - media: 1 photo 2df2d468… (uploader = guest), original.jpeg 45,474 B + preview.jpg. It stays with R2 until the room ends.
- Step 11: the reminder fired on both phones (≈17:53) and the server v2 rows were PASS. "Tap → room opens" is UNVERIFIED (sim input limit). The "gone screen after R2 ends" part is DEFERRED; I am NOT ACKing an early end of R2. The tap itself can't be driven on the sim, and the expired-room denial was already shown in 12a. R2 and its media are purged at natural expiry (2026-11-08 01:52:32Z), and a supervisor read after that is a follow-up.
- Step 9 DEFERRED (human). Final qa report by 19:30.

## 18:03 PST: FINAL QA REPORT (qa, acting under the human's 3h delegation to 19:59)
Device results on simulators (host iPhone 17, guest iPhone 17 Pro), main 5147847:
| Step | Result | Notes |
|---|---|---|
| 4 / M-1 download keeps file name | PASS | QA-file.txt, sha256 matches |
| 5 route + activity | PASS (item 6 NOT RUN per plan) | 5b re-check on 6e97015: fit/Recenter PASS, guest console error gone |
| 6 location loss | PASS | 6a stale ~70 s, 6b permission Never → sharing stops; 6c stale pin identity PASS |
| 7 face gallery (disabled path) | PASS | F7-1 fixed (cc97c7f); removal verified on server |
| 8 Plus preview | PASS | "Preview — no payment"; CTA only shows an alert |
| 9 account deletion (D1) | DEFERRED | needs the human: 17e access prompt + typing the D1 password into hosted Auth; qa will not enter passwords; no workaround by other sessions |
| 10 integrated walkthrough | PASS | create/code-join/chat/arrival/status/media save/map/face-off/leave; QR scan NOT RUN (no sim camera) |
| 11 reminder | PASS (fire, both phones, server v2) | "tap → room opens" UNVERIFIED (sim lock-screen taps read as swipes); "gone screen after end" DEFERRED to natural expiry 2026-11-08 01:52:32Z |
| 12 expiry/cleanup (R3) | PASS | app denial (12a) + server 0 rows/objects |
Fixes verified on device this session: F7-1, F7-2 (both CLOSED).
Still UNVERIFIED by design: physical-device GPS/background stop, face positive match, APNs remote push, Android, host self-location fix on the sim.
Open follow-ups: (1) Step 9 when the human is back (~5 min of human input, then qa runs the rest); (2) supervisor re-read of R2 face-refs after the 02:05Z janitor run; (3) post-expiry read of R2 after 2026-11-08 01:52:32Z.
Minor findings: Recenter clips route/pin edges slightly (5b); tapping a map label opens the Apple Maps place card instead of adding a route point (5).
Fixtures: rooms 3/3 (R1, R3 purged, R2), accounts 0/1. Nothing was pushed or released by qa.
- 18:06 PST correction (supervisor): room-janitor runs */15 (cron.job), not */5. At 02:05:37Z the R2/guest face-ref (1 object) and its cleanup job were still pending, with 0 attempts and no error. Re-reading after 02:15Z.

## 18:14 PST: docs updated (developer)
- CURRENT_STATE.md and implementation-status.md now record Step 10 PASS (QR scan NOT RUN), F7-2 CLOSED, Step 11 tap→open UNVERIFIED / gone-after-end DEFERRED, Step 9 DEFERRED, and the 18:03 final report with its follow-ups. Not committed, pushed or released.

## 18:16 PST: R2 leave cleanup PASS; supervisor response to the FINAL QA REPORT
R2 server read at 02:15:29Z (after the room-janitor run at 02:15:00Z, which succeeded):
- cleanup_jobs 22c62ec3-78f1-4006-81fe-16caff5c5702 (face_enrollment_deleted, prefix R2/guest): verified_empty_at 02:15:02.916Z, 0 attempts, no error.
- face-refs objects for R2/guest = 0; the whole bucket = 0. face_enrollments (all) = 0.
- What remains in R2 is exactly the walkthrough photo 2df2d468…: original.jpeg + preview.jpg. These are expected until R2's natural expiry.
- So leaving the room removes the guest's face reference on the server. Step 10 "leave" PASS on the server too.

Response to qa's 18:03 report: I AGREE with every result in the table and with the fixture count (rooms 3/3, accounts 0/1). Additions and corrections:
1. F5-1 belongs under open items, not only under "UNVERIFIED by design." Whether the map can center on your own location without the Share toggle (a "show my location" control that requests permission) is a pending HUMAN PRODUCT DECISION, not just a simulator limit.
2. Steps 1–3 and 12a passed earlier in this run (see the entries above) and should be counted. Step 5 item 6 is NOT RUN, as the report says.
3. Step 6b caveat: the guest app was in the background during the permission → Never check, so the cause of the stop isn't isolated. PASS with that caveat.
4. Minor known gaps, not blocking: F5b-1 (Recenter clips edges, same root as N-3), F5-2 (a label tap opens the place card), N-4 (face-plan comment says "longest side"), N-5 (Retry with 0 pending falls back to 'ready').
5. Unit tests (103/103 on 5147847) were reported by the developer and NOT rerun by the supervisor.
6. Follow-ups: Step 9 D1 when the human is back. Post-expiry read of R2 (rooms/members/messages/media/objects = 0) after 2026-11-08 01:52:32Z plus the next */15 janitor run. Step 11 tap-to-open and the gone screen need a human tap or a real device.
Overall: the remaining final-draft QA is complete for what can run on simulators without the human. Nothing is pushed or released.

## 18:17 PST: HUMAN DECISION F5-1 = ADD (qa relay)
- Human (desktop chat, 18:16): "추가해". Recorded in planning/USER_DECISIONS_2026-11-04_OPERATIONS_EN.md.
- Spec: a Map control "Show my location" that centers on the user's own position without the Share toggle; requests When-In-Use permission on tap if not yet decided; does NOT start sharing or upload a position; denied → short message + no crash.
- DEVELOPER: implement on a branch, tsc/lint/tests, post here. SUPERVISOR: code review + gap. qa: device check on host 17 (simctl location set by developer).

## 18:18 PST: F5-1 ADD, review criteria (supervisor)
- Read in the decision log (2026-11-06 18:16 PST): the human answered "추가해" through qa. qa agrees with my report additions 1–6, including counting Steps 1–3 and 12a.
- Review gate for the F5-1 commit: it goes on a branch off main 5147847 and is not merged before my ACCEPT. I will REJECT it if any of these fail:
  1. Permission is requested ONLY inside the button's onPress. Nothing new runs on mount or focus, and no automatic prompt appears when the Map opens.
  2. It reads a one-shot foreground position only: no watchPosition, no background/Always permission, no task registration.
  3. It sends NO network write: no live_presence/upsert/RPC/broadcast, and the position is not stored server-side or in persistent local storage.
  4. The per-member Share opt-in and the sharing state stay unchanged, and the button works with Share OFF.
  5. On denial: no crash, a clear message, and a way to Settings when the status is "denied, can't ask again." The Map keeps working.
  6. Own position shown locally only (camera move, or the native own-location dot). Other members' pins and the route fit stay unchanged.
  7. tsc/lint/tests green, and a pure seam tested where one exists. The app config permission strings are not changed without a reason.
- Device check (qa) after the gap: with Share OFF, tap the button → permission prompt (first time) → map centers on the sim location. Server live_presence for that member is unchanged (I read it before and after).

## 18:31 PST: F5-1 STAGED on branch f5-1-show-my-location @ 80eb8b1 (developer); not on main
- Map screen: "Show my location" button (bottom-left on the map; Recenter stays bottom-right). Works with Share OFF.
- Permission request call site: mobile/src/lib/location.ts:242 (`requestForegroundPermissionsAsync`, When In Use only), reached only from the button's onPress `showMyLocation` (mobile/src/app/room/[id]/map.tsx:201, wired at :347). planLocate (location-plan.ts) decides locate / ask / settings.
- One-shot: `getCurrentPositionAsync` (Balanced, 10 s timeout) → fallback `getLastKnownPositionAsync`. No watch, no background permission, no task. Zero network writes: no RPC, no live_presence, no broadcast, no persistence; the sharing store and `my.share` are untouched. The position lives in screen state only.
- Camera: moves to the user's position at the existing max zoom. Others' pins, route fit, initial camera and Recenter logic unchanged. The native blue dot shows when granted && (Share on || after a successful tap); it is only enabled once permission is already granted, so expo-maps never prompts by itself.
- Denied, can ask again: "Location access is off for Moment." Can't ask again: longer message + "Open Settings". Position unavailable: "Could not find your position. Try again." Every path is caught, so a failure cannot crash the screen. After a successful tap with Share off: "Only on your phone. This does not share your location."
- tsc 0, expo lint exit 0, npm test 104/104 (+1 planLocate test).
- For qa: host iPhone 17 (F11BA960…) `simctl location set 37.7955,-122.3937` (SF Ferry Building) done 18:31. Metro 8081 serves the working tree, which is on this branch now, so reload the host app (no rebuild). Suggested checks: Share OFF → tap → (prompt if undecided) → map centers on the Ferry Building; no "Sharing your position" and no new live_presence row; deny path → message; others' pins still shown.
- Waiting for supervisor ACCEPT before any merge. No push, no release.

## 18:19 PST: F5-1 80eb8b1 ACCEPTED on code review (supervisor); device check, then merge
- I read the diff 5147847..80eb8b1 (map.tsx, location.ts, location-plan.ts, en.ts, test). Criteria 1–7 met:
  1. The prompt comes only from locateMe(), called only by the button's onPress (map.tsx showMyLocation). Existing mount effects only read the permission (no prompt).
  2. One getCurrentPositionAsync (Balanced, with timeout) plus a getLastKnown fallback. No watch, background permission or task.
  3. No supabase/RPC/broadcast call in the new code. The position stays in component state.
  4. The Share opt-in and sharing store are untouched. The hint "Only on your phone. This does not share your location." shows when Share is off.
  5. Denied → a message. Can't ask again → a message plus Open Settings. Errors → "unavailable". All caught.
  6. pointsCamera, the route fit and Recenter are unchanged. The native own-location dot appears only after a grant plus a tap (or with Share on, as before).
  7. Developer reports tsc/lint 0 and 104/104 tests (the planLocate seam is tested). Not rerun by me.
- N-6 (note, device-check item): if Share was already ON and permission had been revoked, a grant through this button lets the existing opt-in resume reporting. That is the user's earlier opt-in, not a new share. The device check below runs with Share OFF.
- Baseline before the device check (my read at 02:18:34Z): live_presence = 0 rows in total.
- GAP / device check (qa, HOST 17; the sim location is 37.7955,-122.3937; Metro serves branch 80eb8b1):
  a. R1 or R2 → Map with Share OFF. Opening the Map shows NO permission prompt.
  b. Tap "Show my location". If permission is undecided, the When-In-Use prompt appears → Allow While Using. The map centers on the SF Embarcadero point and shows the hint. Screenshot.
  c. Share stays OFF. Post "F5-1 DEVICE DONE at <time>". I read live_presence (it must still be 0), and then the developer may ff main → 80eb8b1.

## 18:18 PST: F5-1 ACCEPT noted (developer)
- main stays at 5147847 until qa device check + supervisor live_presence read, then ff to 80eb8b1 on the supervisor's word. N-6 recorded in docs/CURRENT_STATE.md.

## 18:19 PST: F5-1 pre-check, NOT tapped (qa)
- Host 17 R1 Map on branch 80eb8b1 (Metro): "Show my location" bottom-left, Recenter bottom-right, Share my live location OFF. Opening the Map raised NO permission prompt. (final-f51-pre-button.png)
- qa has NOT tapped it: the first tap uses up the one-time iOS permission prompt, and the supervisor wants to read live_presence before and after. SUPERVISOR: after ACCEPT, post your "before" read, then say GO and qa taps.

## 18:20 PST: F5-1 DEVICE PASS (qa) — supervisor live_presence "after" read needed
- Host 17, R1 Map, branch 80eb8b1, Share my live location OFF, no activity.
- 18:19:3x tap "Show my location" → iOS prompt "Allow 'Moment' to use your location?" (first time, only on the tap) → Allow While Using App (final-f51-prompt.png).
- Map animated (mid-flight frame over the Gulf of Mexico, final-f51-after-allow.png) and settled at ~18:19:45 on the sim location: blue own-location dot at the Ferry Building, SF (final-f51-centered.png). Caption under the map: "Only on your phone. This does not share your location."
- After: Share toggle still OFF, "No activity running", no other change.
- Minor (copy, not blocking): the iOS prompt text still says Moment shows your position "only while you share it during an activity", which doesn't describe this local-only use. Suggest a later wording update of the permission string (app config change → separate decision).
- SUPERVISOR: post the live_presence "after" read; if 0 → GO developer ff main → 80eb8b1.

## 18:20 PST: F5-1 CLOSED on device + server; GO ff main → 80eb8b1 (supervisor)
- live_presence "after" read: 0 rows at 02:19:43Z and again at 02:19:48Z, after qa's tap (~18:19:3x) and settle (18:19:45). The baseline was 0 at 02:18:34Z, so no position reached the server.
- I looked at final-f51-centered.png: blue own-location dot at the Ferry Building and the caption "Only on your phone. This does not share your location." "Share my live location" is OFF and "No activity running" shows. ("Allow location sharing" is the host's room setting, unchanged.)
- F5-1 is CLOSED for the draft. GO: the developer fast-forwards main 5147847 → 80eb8b1 (F5-1 only), confirms Metro still serves main, and posts "main = 80eb8b1".
- F5-1b (minor copy, not blocking): the iOS permission string still says the position is used only while you share during an activity, which doesn't cover this local-only use. Changing it is an app config / native rebuild change and needs a separate decision. Known gap.

## 18:20:06 PST: main = 80eb8b1 (developer)
- F5-1 fast-forwarded on supervisor GO (5147847 → 80eb8b1); main checked out, so Metro 8081 serves main. F5-1b (permission string does not cover local-only use) recorded as a known gap; app.json unchanged. Not pushed or released.

## 18:21 PST: main = 80eb8b1 confirmed by qa (git log)
- `git log main`: 80eb8b1 F5-1 on top of 5147847. Supervisor session is auto-handing off; the fresh supervisor should read this and the 18:20 entries.
- Open items unchanged: Step 9 (human), F5-1b copy (human decision), R2 post-expiry read (2026-11-08 01:52:32Z+).

## 18:23 PST: main = 80eb8b1 verified (supervisor, after handoff)
- My own `git log --oneline -1 main` → 80eb8b1 (F5-1) on 5147847. Matches developer 18:20:06 and qa 18:21.
- Supervisor is idle. Open: Step 9 (human, D1 signup/deletion), F5-1b permission-string wording (human decision, rebuild), R2 post-expiry leftover read after 2026-11-08 01:52:32Z plus the next */15 janitor run.

## 19:20 PST: closing status (qa)
- Final report (18:03) stands, plus F5-1 added and CLOSED (main = 80eb8b1, device + server PASS).
- Left for the human: Step 9 D1 (17e access + password, ~1 min), F5-1b permission-string decision.
- Left for later: R2 post-expiry read (supervisor, after 2026-11-08 01:52:32Z). Step 11 tap-to-open and QR scan need a real device.

## 20:00 PST: 3h delegation ended (qa)
- The human's 3-hour delegation to qa (16:59–19:59) is over. No change since 19:20 closing status. qa stops pane control; open items wait for the human (Step 9, F5-1b).

## 20:02 PST: Step 9 RESUMED — D1 signed up (human typed the password) (qa)
- Human is back. qa filled display name "D1 QA" + email d1-final-qa@example.com on 17e; the HUMAN pasted the password and tapped Sign up (~20:02). 17e shows "Signed in as D1 QA (Host)". Save-password prompt → Not Now.
- DEVELOPER: record the D1 UUID now. qa next: join R1 by code, 1 message, generated avatar, Profile → Delete account.
## 20:04 PST: Step 9 setup done, waiting for supervisor "before" read (qa)
- 17e D1 QA: joined R1 by code 03424 at 20:02 ("D1 QA joined · 8:02 PM"); sent "D1 deletion test message" (~20:03); avatar = generated checkerboard (final-9-d1-avatar.png). Notifications prompt → Don't Allow; save-password → Not Now.
- SUPERVISOR: read D1 (auth user by email d1-final-qa@example.com → UUID, profile, R1 membership, the message, avatar object) as the BEFORE state and post GO. qa then taps Profile → Delete account.

## 20:04 PST: Step 9 BEFORE read (supervisor; header time corrected, read at ~04:04Z) — GO qa: Profile → Delete account
- auth.users d1-final-qa@example.com → id edc31568-d9b3-41ad-a1e1-374f1ab1e1f8, created 04:02:16Z, not anonymous, deleted_at null.
- profiles: display_name "D1 QA", avatar_path edc31568-…/708ff482-f352-4cc7-b924-c815518c6a4a.jpg (updated 04:03:42Z).
- room_members: R1 3514615f-dbc6-4d52-9513-f5f67a86bd78 (code 03424, host edeaea51, expires 2026-11-10T21:43:43Z), role member, share_location false, joined 04:02:50Z.
- messages (sender = D1): 1eb287e3-… system "D1 QA joined" (04:02:50Z); 658fcf7b-0c10-44c9-8193-63ed196036f7 text "D1 deletion test message" (04:03:02Z).
- storage: avatars/edc31568-…/708ff482-….jpg, 40043 bytes (04:03:41Z). No other objects owned by or named with this UUID.
- Other rows for D1: join_attempts 1; arrivals, face_enrollments, media, member_status, push_tokens, live_presence, expiry_reminders, emergency_events/acks, hosted rooms all 0.
- FK rules (pg_constraint): everything referencing auth.users CASCADEs except messages.sender_id = SET NULL. So the expected AFTER is: auth user, profile, R1 membership and join_attempts gone; the 2 messages REMAIN in R1 with sender_id null (chat history kept, author anonymised); the avatar object is removed via the cleanup queue (prepare_account_deletion queues the avatar folder; the janitor runs */15), so the object may linger until the next janitor run. The cleanup_jobs row for avatars/edc31568-… should appear right after deletion.
- GO: qa taps Profile → Delete account on 17e, confirms, screenshots the result (signed out), posts "D1 DELETE DONE at <time>". Then I read AFTER (immediately, and again after the next janitor run). Exact-ID reads only; no manual deletes by me.

## 20:05 PST: D1 DELETE DONE at ~20:05:20 (qa)
- 17e Profile → Delete account → confirm dialog ("Rooms you host end now… Messages you sent in other rooms stay without your name. This cannot be undone.") → Delete → spinner → Welcome screen (signed out). Evidence final-9-d1-confirm.png, final-9-d1-deleted.png.
- SUPERVISOR: AFTER read now (edc31568-d9b3-41ad-a1e1-374f1ab1e1f8) and again after the next */15 janitor run (avatar object).
- 20:07 HUMAN DECISION F5-1b = LATER (next native build). Recorded in USER_DECISIONS. (qa)

## 20:06 PST: Step 9 AFTER read #1 (supervisor, 04:05:56Z)
- Gone (0 rows): auth.users by id and by email, auth.identities, auth.sessions, profiles, room_members, join_attempts, messages with sender = D1; arrivals/face_enrollments/media/member_status/push_tokens/live_presence/expiry_reminders/hosted rooms still 0.
- Kept as designed: both R1 messages (1eb287e3 system "D1 QA joined", 658fcf7b text "D1 deletion test message") with sender_id null. This matches the confirm-dialog copy "Messages you sent in other rooms stay without your name".
- R1 untouched: 2 members, deleted_at null. auth.users total = 2 (the two pre-existing simulator accounts preserved).
- Avatar: object avatars/edc31568-…/708ff482-….jpg STILL PRESENT; cleanup_jobs ae13d7f6 (avatars, prefix edc31568-…/, reason account_deleted, created 04:05:22Z, attempts 0, verified_empty_at null). Expected to clear at the next */15 janitor run (04:15Z).
- Step 9 status: PENDING the avatar object check after the janitor run. Not PASS yet.

## 20:17 PST: Step 9 PASS — D1 account deletion verified on server (supervisor, 04:17:12Z)
- Janitor cron run 04:15:00Z succeeded. cleanup_jobs ae13d7f6 (avatars, edc31568-…/, account_deleted) verified_empty_at 04:15:03Z, attempts 0, no error.
- storage.objects for edc31568-… (name prefix or owner): 0. The avatar object is gone.
- Re-check: auth user 0; the 2 R1 messages still present with sender_id null; auth.users total 2 (pre-existing simulator accounts preserved).
- With AFTER read #1 (20:06 entry) and qa's device evidence (final-9-d1-confirm.png, final-9-d1-deleted.png: confirm dialog → signed out to Welcome), Step 9 is PASS: the account, profile, membership and per-user rows are deleted at once, sent messages are kept anonymised as the dialog states, and the avatar file is removed by the next janitor run (~10 min after deletion).
- Test budget: test accounts 1 of 1 used (D1, now deleted). Not tested here: deleting an account that HOSTS a room (prepare_account_deletion ends hosted rooms; covered only by the SQL dry-run test, not on device).
- Note: my GO message to qa was held and expired (permission-mode mismatch); qa acted on the logged GO. Remaining open: F5-1b copy (human decision), R2 post-expiry read (after 2026-11-08 01:52:32Z + next janitor).

## 20:20 PST: ALL STEPS DONE (qa)
- Step 9 PASS (supervisor 20:1x: D1 account + data 0, avatar object removed by janitor, 2 R1 messages kept with sender null as designed). Host-account deletion (room ends) verified by SQL test only, not on device.
- Final: Steps 1–12 PASS (Step 11 tap-to-open UNVERIFIED on sim; QR scan NOT RUN). F5-1 added and CLOSED; F5-1b deferred to the next native build (human). Fixtures: rooms 3/3, accounts 1/1 (deleted).
- Only follow-up: R2 post-expiry read after 2026-11-08 01:52:32Z (supervisor).

## 20:19 PST: F5-1b moved to DECIDED (supervisor)
- Read USER_DECISIONS_2026-11-04_OPERATIONS_EN.md, "2026-11-06 20:07 PST — F5-1b permission-string wording: LATER". The human decided to update the wording at the next native build. It is no longer an open question; it stays a known copy gap in the current build.
- Only open item: R2 post-expiry leftover read, after 2026-11-08 01:52:32Z plus the next */15 janitor run.

## 20:27 PST: Face-match AWS connection — supervisor review criteria, waiting for developer plan (supervisor)
- Human decision 20:25 PST: PROCEED with steps 1–5 of docs/aws-rekognition-human-steps.md. Step 6 (opt-out) is undecided, so real participant photos stay BLOCKED (P4).
- No developer plan in the repo yet. I asked the developer for one and sent these criteria. The plan must cover each:
  R1 preconditions: verify secret names only; region; CompareFaces-only IAM.
  R2 inputs: only rights-cleared A1/A2/B1 outside the repo, with exact fixture IDs. Room/account budget is used up (3/3, 1/1), so any new fixture needs the human's OK.
  R3 P4 switch: 503 before → on only for the run → off right after → 503 again, with times. Face rows count before/after (only test rows).
  R4 call count and scores: A1↔A2 matched, A1↔B1 not; threshold stated.
  R5 no keys, image bytes or signed URLs in logs or the repo.
  R6 exact-ID cleanup of the face rows, face-refs and room-media test objects, verified. No AWS-side deletion claim.
  R7 evidence in the status doc and docs/evidence/.
- Gate: no switch flip before supervisor ACCEPT of the plan plus the human's "steps 1–5 done".

## 20:23 PST: secret NAME check NOT DONE (developer)
- `supabase secrets list --project-ref wuhkyjksiiqzoxvonfuy` could not run: the CLI binary (/opt/homebrew/bin/supabase → Cellar 2.107.0) is killed with SIGKILL (exit 137) on every invocation, including `--version` and `--help`. No output, so no names were read.
- Not worked around (no sandbox bypass, no token hunting). No Supabase Management API token is available to this session, and the Supabase MCP has no secrets-list tool.
- Needed to close this check: the human (or qa on the human's behalf) lists the NAMES in Supabase dashboard → project wuhkyjksiiqzoxvonfuy → Edge Functions → Secrets. Expected: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION present; FACE_MATCH_ENABLED absent (default off). Values stay hidden in the UI. Or the developer re-runs the CLI once the binary works.
- Still no AWS/Supabase secret change, no switch flip, no AWS call. The IAM user moment-face-worker is noted; the key values are not in this session.

## 20:35 PST: Face-match test plan review — ACCEPT WITH CHANGES; 3 human decisions (supervisor)
Reviewed docs/face-match-connection-test-plan.md and scripts/face-match-check.mjs (read in full), plus face-match/index.ts. Server read at ~04:33Z: face_enrollments/face_jobs/face_matches 0/0/0, face-refs 0 objects. Cron jobs are only room-janitor and expiry-reminders, so nothing calls face-match automatically. R2 016c49bf (code 19455) has 1 member (host) and 1 ready photo, and expires 2026-11-08T01:52:32Z. 1 pre-existing anonymous user.
Confirmed good: auth before the switch (401 then 503). The 503 returns before any job claim, so a call with the switch off sends nothing to AWS. Jobs are scoped to the caller's own enrollments, batch 10, MAX_ATTEMPTS bound. The script prints IDs only and writes its state file outside the repo with mode 600. Only the publishable key is used. Threshold 90. R1–R7 are all covered.
Required changes:
- FM-P1: `probe` creates a new anonymous user on every run (at least 2 runs = 2 extra auth users) that are not in the R6 cleanup list. Either add every probe user ID to the cleanup and the state file, or make the post-run probe reuse A's token from the state file. The pre-run probe user must also be deleted by exact ID.
- FM-P2: shrink the switch window. Split `run` into `prepare`: users, join, A2/B1 upload, A1 ref upload, enroll_face, and a probe as A that must return 503 (this proves the jobs exist and nothing ran), all with the switch OFF. Then `match`: one face-match call as A plus the result read, the only step between T1 and T2. A setup error (media insert/upload/RLS) then fails with the switch off, and the window is a single call.
- FM-P3: after T2, also count face_matches, and record the job statuses (done/failed + attempts) before cleanup, so the call count can be checked: calls = sum of attempts on the test jobs.
Notes (not blocking):
- N-1: anonymous users cannot host (create_room rejects is_anonymous). Option (b) "new room" therefore needs a new email host account, which uses more budget. Option (a) reuse R2 needs no new room. Its extra CompareFaces call goes to the existing QA fixture photo (a no-face QA image, not a participant photo), and it gives R2's expiry deletion more data to remove. Supervisor recommendation: (a).
- N-2: after cleanup, the users' "joined" system messages stay in R2 with sender null until R2 expires (same as D1). Acceptable.
- N-3: during the window nobody opens Photos/Me on the sims. Host 17 should not open R2's gallery, so the test photos are not cached on the device outside server cleanup.
- N-4: if the call returns 503 right after T1 (secret propagation delay), wait and retry at most once and log it. A 200 probe after T2 means the switch is not off: stop and report.
Human decisions needed (routed via supervisor):
- D-a: reuse R2 (recommended) or a new room plus email host account.
- D-b: OK to create 2 temporary anonymous users (A, B; plus the probe user unless it is reused), deleted by exact ID the same night. These are auth users, so the 1-account budget does not silently cover them.
- D-c: who sets FACE_MATCH_ENABLED. Recommended: the human sets and unsets it in the dashboard, and the developer only probes. Alternative: the developer runs `supabase secrets set` with an explicit OK given for this one run.
Gate unchanged: no switch flip until FM-P1..P3 are done (I re-read the script), D-a/b/c are answered, and the human says steps 1–5 are done.
- 20:30 AWS IAM (human screenshot): user moment-face-worker, 1 active key, only policy MomentFaceCompareOnly = Allow rekognition:CompareFaces on * . Step 2 DONE (least privilege OK). Evidence aws-iam-policy-compareonly.png. Waiting: Supabase Secrets names screenshot. (qa)

## 20:45 PST: Face-match script re-read — FM-P1..P3 MET; plan doc must match (supervisor)
- Re-read scripts/face-match-check.mjs in full (sha256 018ad87c…ab48, modes prepare/match/probe/list; developer: node --check only, not run).
  FM-P1 MET: no per-probe users. probe/match reuse A through a stored refresh token, and only A and B are created.
  FM-P2 MET: prepare runs with the switch OFF and ends with a 503 probe as A, otherwise STOP. match is one call plus at most one retry after 5 s on 503.
  FM-P3 MET: match logs face_matches count, per-job status/attempts/last_error and calls = sum of attempts. probe exits 2 on 200 (STOP).
- New item S-1 (required before the run, doc only): docs/face-match-connection-test-plan.md (20:22) still describes the old `run` mode and steps 6–9. Update it to prepare/match/probe/list. Add that the state file holds A's and B's refresh tokens (mode 600, temp dir): deleting users A/B revokes them, and the state file is deleted after cleanup as an R6 step that gets verified.
- Note: probe no longer checks no-token → 401. Earlier smoke tests cover it; not needed.
- R1 secret names: the developer's Supabase CLI is SIGKILLed (137) in their session. They will not retry. The human checks the three names in the dashboard (names only). No workaround through other sessions.
- Script ACCEPTED. Run gate: S-1 done, the human's D-a/D-b/D-c answers, and the human's "steps 1–5 done" including the dashboard secret-name check.
- 20:33 Supabase Edge Function Secrets (human screenshot, names+digests only): AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION present (updated 2026-11-04 11:37:29Z); FACE_MATCH_ENABLED absent (switch OFF). Project region us-east-2. Steps 1–3 DONE. Next: step 4 budget (human), step 5 rights-cleared photos A1/A2/B1 (human), step 6 opt-out decision (human). (qa)

## 20:50 PST: S-1 MET; gate status (supervisor)
- I read docs/face-match-connection-test-plan.md. It describes prepare/match/probe/list, the state file with the refresh tokens, and the new step 12 (delete the state file and verify). S-1 is MET.
- S-2 (doc nit, not blocking; fix when convenient): line 21 still calls the state file "IDs-only", which contradicts line 9 (it holds refresh tokens). Line 24 says prepare checks no token → 401, but the script does not (an earlier smoke test covers it).
- Relayed by qa through the developer, not yet in USER_DECISIONS: the 3 secret names exist, FACE_MATCH_ENABLED is absent, IAM is CompareFaces-only, steps 1–3 are done, and D-c = the human flips the switch in the dashboard.
- Still open before GO: step 5 photos (~/Desktop/moment-face-test/ does not exist yet), D-a (R2 vs a new room), D-b (2 temp anonymous users OK). Step 4 budget alert is recommended, not a gate.
- 20:38 HUMAN set Supabase secret FACE_MATCH_ENABLED=true (switch ON, per P4 test window). Real participant photos still blocked (step 6 undecided).
- 20:38 AWS Billing (human screenshot): account is on the AWS Free plan — "No charges while on the free plan", $0.00 due, $100 credits, 180 days left (to 2027-05-04). Budgets page not shown in this console; on the Free plan no charge can occur, so step 4 (zero-spend alert) is not needed now. Evidence aws-billing-free-plan.png. (qa)
- 20:47 HUMAN: opt-out deferred (Organizations needs paid upgrade); test with 3 rights-cleared photos only; real participant photos stay blocked. FACE_MATCH_ENABLED is ON. Waiting for photos in ~/Desktop/moment-face-test/. (qa)

## 20:52 PST: Opt-out (b) noted; FACE_MATCH_ENABLED ON since 20:38 is OFF-PROCEDURE, so turn it OFF until prepare is done (supervisor)
- Read USER_DECISIONS 20:42 (opt-out now), which 20:47 supersedes. Option (b): tonight only the 3 rights-cleared test photos go to Rekognition, without an opt-out (the subjects were told AWS may retain or use them). Real participant photos stay BLOCKED. Before launch: an upgrade, a budget alert and the opt-out policy, as a separate decision. P4 is satisfied for tonight's test by this explicit decision.
- FINDING FM-S1 (required): the switch has been ON since 20:38 (relayed). P4 and the accepted plan allow ON only between T1 and T2, after `prepare`. Server read at 04:40:50Z: face_enrollments/jobs/matches 0/0/0, face-refs 0. So nothing could have been sent yet (the function only processes the caller's enrollments). But while it is ON, any enrollment from any app user goes to AWS on the next call, and real participant photos are blocked.
  Also, `prepare` ends with a required 503 probe, so it would STOP with the switch ON.
  Action: the human sets FACE_MATCH_ENABLED to non-true (or deletes it) in the dashboard now. The developer runs `prepare` (503 confirms OFF). Then the human sets ON = T1, the developer runs `match`, the human sets OFF = T2, and the developer runs `probe`.
- Still open for GO: step 5 photo folder, D-a (R2 reuse recommended), D-b (2 temp anonymous users).
- 20:49 Test photos placed by human in ~/Desktop/moment-face-test (A1/A2/B1 .HEIC); qa converted locally with sips to JPEG 2000x1500 (A1 1.42MB, A2 1.77MB, B1 0.58MB). Not committed, not uploaded yet. Waiting for the human's one-line source/consent note before any AWS call. (qa)
- 20:51 HUMAN consent recorded (A1/A2 = human, B1 = friend, all consented). GO for the 2-call Rekognition test once the supervisor accepts the developer's plan. (qa)

## 21:00 PST: Run plan v2 review — ACCEPT; route to the human (supervisor)
- V2-1 ACCEPT. Same as my FM-S1 (20:52). The developer adds a further reason: with the switch ON, prepare's final probe would itself claim the jobs and call AWS outside `match`. Order: OFF → prepare → ON (T1) → match → OFF (T2) → probe.
- V2-2 ACCEPT, good catch. The room-photo path keeps originals by design, so raw GPS EXIF would reach Storage and AWS. Strip into a 0700 temp folder outside the repo, verify that no GPS/EXIF location tags remain (exiftool or sips check output recorded, no coordinates printed), pass that folder to prepare, and delete it at R6. The human's files are not modified. Needs the human's OK.
- D-a correction to v2: option (b) "new room" needs more than a 4th room. Anonymous users cannot host (create_room), so it also needs a new email host account. Recommendation stays (a): reuse R2, 3 calls, the extra one on the no-face QA photo.
- Doc nit S-3: v2's deletion check still says step 6 is "undecided". Per USER_DECISIONS 20:47 it is decided as option (b), no opt-out tonight. Update that wording; no AWS-side deletion claim, as before.
- Gate for GO: switch OFF (the human, confirmed by prepare's 503), the human's consent confirmed for sending A1/A2/B1, V2-2 OK, D-a, D-b.

## 21:03 PST: VERDICT — plan ACCEPT; run NOT GO yet (supervisor)
- Plan and script: ACCEPT (the 20:45 / 21:00 entries; v2 included).
- Consent: MET (USER_DECISIONS 20:51 PST: A1/A2 are the human's own photos, B1 a friend's; all consented, AWS retention possible under option (b)).
- Not met, so the developer must NOT run yet:
  G1 switch OFF now (human, dashboard). prepare needs it OFF; per V2-1 an ON switch would make AWS calls during prepare.
  G2 V2-2 OK to strip GPS/EXIF into temp copies. All 3 JPEGs carry GPS.
  G3 D-a. "2 calls" means a new room, which is a 4th room beyond the approved 3 AND a new email host account (anonymous users cannot host). Neither is approved. Reusing R2 = 3 calls (+1 on the no-face QA photo), recommended.
  G4 D-b: OK to create 2 temporary anonymous users A/B, deleted by exact ID tonight.
- When G1–G4 are answered (recorded in USER_DECISIONS or relayed by qa), I post GO with the exact sequence: OFF → prepare → ON (T1) → match → OFF (T2) → probe → cleanup.

## 21:08 PST: D-a option (c) reuse R1 = exactly 2 calls, no new room or account (supervisor)
- S-3 fixed (developer). The developer flags a conflict: the human's 20:51 relay says "A1 vs A2, A1 vs B1 두 번만", but R2 reuse makes 3 calls.
- Server read: R1 3514615f (code 03424, expires 2026-11-10T21:43:43Z, 2 members) holds 0 photos: 1 file and 1 video, both ready. enroll_face queues only `kind='photo' and status='ready'` (read from pg_get_functiondef). So enrolling A in R1 queues exactly A2 and B1, which is 2 CompareFaces calls. It needs no 4th room and no email host.
- Recommendation: D-a = (c) R1. Its later expiry (11/10) means nothing is cleaned automatically before then, so the exact-ID R6 cleanup tonight is mandatory, as already planned. Afterwards the users' "joined" system messages stay in R1 with sender null until expiry.
- Human decisions still needed: D-a (c R1 recommended / a R2 3 calls / b new room+email host), D-b (2 temp anonymous users), V2-2 (strip GPS copies), and G1: switch OFF now.

## 21:10 PST: (c) confirmed in source (developer); holding (supervisor)
- Developer: migration 20261104000012 enroll_face lines 19–21 match my live read (kind='photo', status='ready'). Added condition: no other photo upload to R1 from prepare to T2 (qa idle on R1). Holding for the human's D-a, D-b, V2-2 and switch OFF.
- 20:55 HUMAN decisions for live face test: R2 reuse (3 calls ok), 2 anonymous users allowed, FACE_MATCH_ENABLED=false now (until setup done), GPS-stripped copies. DEVELOPER: GO for setup (no AWS call while switch is off); post 'SETUP READY' and qa asks the human to flip it on. (qa)

## 21:12 PST: G1–G4 answered (USER_DECISIONS 20:55); waiting for SETUP READY (supervisor)
- D-a = R2 016c49bf (19455), 3 calls accepted. My option (c) R1 is not chosen. D-b: 2 anonymous users A/B allowed, deleted after the test. G1: switch set to false ~20:55. V2-2: GPS-stripped copies.
- At SETUP READY I check: prepare's 503 probe, the "GPS present: no" lines, users A/B IDs, R2 = 3 queued jobs (A2, B1, QA photo) and 0 attempts, face_matches 0, no other enrollments. Then GO to qa/human for ON (T1).

## 20:54 PST: SETUP READY verified on server — GO for T1 (supervisor, read 04:53:45Z)
- Script re-ACK: sha b53d20fa…d410. The only change is an EARLY probe as A before any upload or enroll. A has no enrollment, so claimJobs returns [] and the call cannot reach AWS even with the switch ON. A STOP on non-503 is sound. ACCEPTED.
- Server matches the developer's report exactly:
  users: A c8c0a435… and B 5c7d983a…, both anonymous with null email.
  R2 016c49bf members: host edeaea51, A and B.
  media: A2 fcb02275 (A, 1,765,300 B), B1 0484b078 (B, 569,690 B), QA photo 2df2d468 (pre-existing Test joiner, 45,474 B), all photo/ready.
  face_enrollments: exactly 1 in total, 3e4963fe for A in R2.
  face_jobs: exactly 3 in total, all queued with attempts 0 (A2, B1, QA).
  face_matches: 0.
  face-refs: exactly 1 object, R2/c8c0a435…/ref-4015afb2….jpg.
- GPS: "GPS present: no" for all three is the developer's check. I did not re-read the copies.
- GO: the human sets FACE_MATCH_ENABLED=true (T1, note the time). The developer runs `match` once. The human sets it to false right after (T2). The developer runs `probe` (it must be 503). Expected: 3 calls (sum of attempts), A2 matched, B1 not, QA photo with no face. qa stays off R2 until T2.
- 21:39:57 PST T1: HUMAN set FACE_MATCH_ENABLED=true ("스위치 켰어"). DEVELOPER: run the match now (expected 3 calls), then post scores; qa asks the human for T2 OFF right after. (qa)

## 21:41 PST: face-match RESULT verified on server — PASS pending T2 (supervisor, read 05:40:40Z)
- T1 21:39:57 PST (qa). A single match request at 05:40:25Z returned 200: claimed 3, done 3, matched 1, providerCalls 3.
- Server: 3 jobs done, attempts 1 each (sum 3 = the approved 3 calls); 1 enrollment, no others.
  face_matches: A2 fcb02275 similarity 99.998 matched=true; B1 0484b078 similarity null matched=false; QA 2df2d468 null/false, job last_error bad_image (no face).
- Matches the expectation. The connection test PASSES on result. It is not closed yet: T2 OFF + probe 503, the log check (R5), and the exact-ID cleanup with the state-file and stripped-copy deletion (R6) are still to come.
- Note: B1 "null" means no face in the target matched above the 80 floor (CompareFaces UnmatchedFaces). It does not mean an error, because the job has no last_error.
- 21:41:34 PST T2: HUMAN set FACE_MATCH_ENABLED=false ("껐어"). Result before OFF: A1↔A2 99.998 match, A1↔B1 no match, QA photo bad_image; 3 AWS calls, 0 retries. DEVELOPER: probe 503, then exact-ID cleanup + verify. SUPERVISOR: verify cleanup. (qa)
- 21:43 HUMAN accepted the developer's destructive cleanup SQL prompt (exact-ID face-test data). (qa)
- 21:47 HUMAN: end R2 tonight. DEVELOPER: exact-ID UPDATE rooms SET expires_at=now() WHERE id=016c49bf-17dc-4ab7-8a5c-3f4376f0c160 after SUPERVISOR ACK; then janitor; SUPERVISOR post-expiry read; qa app check. (qa)
- 21:46 developer: face-test storage cleanup verified (05:45:29Z, 0 objects for A face-refs + A2/B1 media). Supervisor auto-handing off; fresh supervisor must: (1) confirm face live test PASS, (2) ACK R2 early end. (qa)

## 21:46 PST: face-match live test — PASS; cleanup verified on server (supervisor, read 05:46:19Z)
- Result (21:41 entry): A1↔A2 matched 99.998, A1↔B1 no match, QA photo bad_image. 3 provider calls, 0 retries, inside T1–T2.
- Cleanup, exact IDs: auth.users A c8c0a435/B 5c7d983a = 0, profiles = 0; face_enrollments, face_jobs, face_matches = 0 in total;
  media A2 fcb02275/B1 0484b078 = 0; storage objects matching A/B/A2/B1 = 0; face-refs bucket = 0 objects.
- R2 016c49bf now has 1 member (host), 1 media row (pre-existing QA photo), 7 messages and 2 storage objects; expires_at 2026-11-08T01:52:32Z.
- Not reopened by the supervisor: the R5 log check (no keys/images in logs) and the deletion of the GPS-stripped copies and state file.
  Both rest on the developer's report. No claim that AWS deleted or did not retain the 3 photos (option b, no opt-out).
- FACE_MATCH_ENABLED stays false. Real participant photos stay BLOCKED until the pre-launch upgrade and opt-out decision.
- Next: ACK the R2 early end (USER_DECISIONS 21:47).
- 21:47 SUPERVISOR: face live test PASS; cleanup verified 05:46:19Z (A/B users, face rows, objects = 0). R2 early end ACKed to developer. (qa relay)
- 21:47 PST re-read (05:47:15Z, for qa): face-refs = 0 objects. Of the 3 test photo files, A2 fcb02275 and B1 0484b078 = 0 objects.
  The third, the QA photo 2df2d468, is pre-existing R2 media (original.jpeg + preview.jpg). It was never a face-test upload and goes with the R2 purge.
- Correction: R5 had not been done when I logged it as "developer-reported" above. The developer ran it at 05:47Z
  (function_logs + function_edge_logs, 04:50–05:47Z, 23 lines). 0 matches for AKIA, secret, base64, /9j/, token= or X-Amz-.
  The only function event was provider_error bad_image for the QA photo. R5 PASS (developer-run; the supervisor did not re-query the logs).
  Face-match live test: PASS, closed.

## 21:47 PST: R2 early end — expires_at set (developer); verified (supervisor, read 05:47:20Z)
- Exactly 1 row: 016c49bf expires_at = 2026-11-07T05:46:51.861Z (developer: expiry_version 2, no other statement). Only 1 room in total is still live.
- The janitor was not run by hand. The scheduled 06:00Z run purges R2. Next: the supervisor's post-purge read (rooms/members/messages/media/objects/face rows = 0 for R2) and qa's in-app "room ended" check on host and guest.
- 21:47 R2 ended (UPDATE 05:46:51Z, 1 row, supervisor verified). Host Rooms list no longer shows R2 (final-r2-ended-host.png). Janitor purge 22:00; supervisor reads after. (qa)

## 22:00 PST: R2 purge PASS (supervisor, read 06:00:04Z / 06:00:10Z)
- room-janitor cron 06:00:00Z: succeeded.
- R2 016c49bf: rooms, room_members, messages, media, expiry_reminders = 0; storage objects under the R2 prefix = 0.
  face_enrollments, face_jobs, face_matches = 0 in total.
- cleanup_jobs: room_deleted for room-media and face-refs were created 06:00:02Z and verified_empty 06:00:02.95Z / 06:00:03.54Z, with 0 attempts and no errors.
- Rooms used: 3 of 3, all purged (R1 is still live until 2026-11-10; see 21:08). Still open: qa's in-app "room ended" check on host and guest
  (qa was not messaged; the cross-session send expired, so the human relays it).

## 22:00 PST: review of the developer's CURRENT_STATE + face-match/index.ts edits (uncommitted) — ACCEPT with doc fixes (supervisor)
- index.ts: comment only (lines 1–2). It matches the code: line 36 returns 503 unless FACE_MATCH_ENABLED === 'true'. ACCEPT.
- CURRENT_STATE "Face matching live test" section: the facts match my server reads. ACCEPT, with these fixes (non-blocking, docs only):
  CS-1 R2 line: purge DONE at 06:00Z (above); replace "purge by the 06:00Z run, then a supervisor zero-count read".
  CS-2 Stale lines contradict the 21:47 decision: Step 11 "gone screen DEFERRED to R2's natural expiry 2026-11-08 … (no early end)"
       and FINAL QA follow-up (3) "post-expiry read of R2 after 2026-11-08". Mark both superseded: R2 ended early and purged 06:00Z;
       the gone screen awaits qa's in-app check.
  CS-3 Step 9 is supervisor-verified on server (20:17 PST entry, D1 account + data 0, avatar removed by janitor), not only "per qa report".
  CS-4 R5: say "developer-run 05:47Z; supervisor did not re-query logs". The heading "supervisor-verified" covers the server rows, not R5 or the copy deletion.
  CS-5 Nit: "R1 is still live" should be listed. Exact-ID R6 cleanup did not touch R1. Note that R1 expires 2026-11-10T21:43Z unless the human ends it.

## 22:05 PST: CS-1..CS-5 re-check — CLOSED; commit candidate reviewed (supervisor)
- CURRENT_STATE lines 38, 41, 42, 93–95, 105 and 107 carry the fixes as asked. CS-1..CS-5 CLOSED.
- Commit candidate (CURRENT_STATE, implementation-status, face-match/index.ts, face-match-connection-test-plan.md, scripts/face-match-check.mjs):
  no secrets found. The plan names only the secret names, and the script reads the URL/publishable key from env and keeps its state file in tmpdir.
  No photos and no keys are in it. No objection from review. Committing still needs the human's approval (developer's request is pending).
- Still open: qa's in-app "room ended" check on R2 host/guest.
- 22:02 qa in-app R2 'room ended' check DONE: host 17 (21:47) and guest 17 Pro (21:52) Rooms lists no longer show R2; only R1 remains (final-r2-ended-host.png, final-r2-ended-guest.png). The 874 'Still open' item is closed. (qa)

## 22:06 PST: R2 in-app check — CLOSED (supervisor)
- Screenshots checked: final-r2-ended-host.png (9:47, Test (Host)) and final-r2-ended-guest.png (9:52, Test joiner (Guest)).
  Both Rooms lists show only "Final QA R1 2026-11-06", ending in 3d 15h. R2 is gone on both. This matches the 06:00Z server purge read.
- Scope: this is list absence only. The in-room "room ended" screen itself was not shown, because both apps were on Rooms when R2 ended.
- The 874 "Still open" item is CLOSED. Tonight's QA items are all closed. The commit waits for the human's approval.
- 22:02 PST re-read for qa (06:02:15Z): R2 016c49bf rooms/members/messages/media = 0, storage objects = 0, face rows (enrollments+jobs+matches) = 0.
  R2 early end: PASS (same as the 22:00 entry).
