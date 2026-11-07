# Final QA direct observations — Codex, 2026-11-06

Bundle 27d7717. Scope approved in planning/CODEX_QA_ADDITIONAL_APPROVAL_2026-11-06.md. Supervisor Step 0 released ~13:40 PST.

## Fixture ledger (no duplicate creation)

- R1: created ONCE in host app ~13:44 PST. Name `Final QA R1 2026-11-06`, General, 4 days, Allow location sharing ON, default statuses. Invite screen code `03424` (leading zero preserved). UUID pending developer server read. Guest join pending.
- R3: NOT CREATED yet.
- R2: NOT CREATED yet.
- D1 disposable account: NOT CREATED yet.

No preserved account logged out or deleted. Creation succeeded; do not create R1 again.
- R1 guest joined successfully ~13:44 PST. Preview said `1 of 30 members`, expiry `11/10/2026, 1:43:43 PM`; after Join room, guest chat showed `Test joiner joined · 1:44 PM` and `Ends in 3d 23h`. Server member count and Info list pending.
- S2 complete ~13:46 PST: selected iPhone 17e in Device Hub sidebar, entered and verified `http://127.0.0.1:8081`, tapped Connect, dismissed first-run developer menu, confirmed Open. Welcome screen directly showed Moment, Continue as guest, Host: Log in, Host: Sign up; no red error screen. NO account created.
- R1 UUID independently confirmed by supervisor: `3514615f-dbc6-4d52-9513-f5f67a86bd78`, members 2, expires 2026-11-10 21:43:43Z.
- R3 created ONCE in host app ~13:46 PST: `Final QA R3 expiry 2026-11-06`, General, 3 hours, code `04693` (leading zero preserved). Expiry preview Nov 6 16:45:56 PST. Guest join and UUID pending. Total rooms created by Codex: 2/3; disposable accounts: 0/1.
- R1 guest gallery directly showed All / Mine / Others / Me; selected All and empty-state Nothing shared yet. Codex did NOT tap Me/Set up. New bundle chip visually and AX confirmed ~13:46 PST.
- R3 guest joined ONCE successfully ~13:47 PST via code04693; preview said 1 of30 members and expiry Nov6 16:46:12PST. Chat then showed Test joiner joined ·1:47PM and room-end banner Ends in2h58m. R3 UUID from supervisor server read `5098a0ec-3ecd-4d4b-b3ea-e35988708d40`. No duplicate R3 created. Step0 device work DONE: R1+R3 created and guest joined; R1 Me chip verified; S2 third Welcome ready. Server verification/member lists pending. Counts remain rooms2/3, accounts0/1.

## Step 1 status editor — direct device observations

- Guest R1 picked Resting, chat showed Status: Resting and event Test joiner: Resting (13:49 PST), screenshot final-1-guest-before.png.
- Both Info screens showed MEMBERS(2), Test host and Test joiner. Guest read-only initial statuses: Emergency(always included), Resting, Giving up, Need water, Need help. No edit controls.
- Host renamed Giving up → Taking a break, removed Resting, added Running late. Save showed Remove statuses? and explicit warning that Resting,Giving up will be removed and members lose those statuses. Confirmed Save. Host showed Statuses saved. and saved four labels Taking a break / Need water / Need help / Running late; Emergency stayed fixed. Evidence final-1-host.png.
- Guest Info, kept open during host save, still showed old labels. Do NOT claim automatic live refresh of this screen. Guest backed to chat: button now Status (no Resting). Status picker immediately showed Taking a break / Need water / Need help / Running late / Emergency / Clear status. Evidence final-1-guest-picker.png. This confirms removed current status cleared in chat and new picker list reached guest. Guest Info reopen check pending.
- Guest Info reopened ~13:52 PST: NEW read-only labels Taking a break / Need water / Need help / Running late plus locked Emergency. No Add/Remove/Save controls. MEMBERS(2) unchanged. Evidence final-1-guest.png. Step1 direct UI checks DONE (with open-screen auto-refresh limitation recorded).

## Step 2 activity flow — direct device observations

In R1 only, around 13:53–13:58 PST:
- Guest Arrived disabled after tap (Arrived1:53PM); host chat showed Test joiner arrived ·1:53PM. final-2-host-arrival.png.
- Guest selected newly added Running late; guest Status:Running late and host chat event Test joiner:Running late ·1:53PM. final-2-host-status.png.
- Guest chose Emergency, read/confirmed Send Emergency? warning (room-only alert, no emergency-service contact/location activation). Guest Your Emergency is active, Seen by0of1; host Test joiner needs help and I see it. final-2-host-emergency.png.
- Host I see it → host You saw this and Seen by1of1; guest Seen by1of1 directly verified. final-2-guest-ack.png.
- After the human said reset/continue, actual state still showed the active acknowledged emergency; no duplicate alert sent. Guest I'm OK tapped ~13:57PST; both banners disappeared and guest status reset to Status. Host historical Emergency message remained (expected history). final-2-host-cleared.png.
- Step2 UI DONE, server cross-check pending. R1/R3 retained; room/account counts unchanged2/3 and0/1.

## SE-1 recheck on 7092911

Both Info screens were opened by developer after code update. Codex first directly observed guest Info with Taking a break and left that iOS screen OPEN. Host renamed Taking a break → On a break, Save statuses → removal warning → Save, Statuses saved. Codex selected the guest simulator window (no iOS navigation, no reopen or refresh) and directly observed On a break in the same read-only Info list. Screenshot final-se1-guest.png. Automatic update PASS; exact two-second latency was not instrumented (window selection needed a fresh accessibility snapshot).

## Step 3a chat — partial direct results and input-tool limitations

- On guest, accessibility Group Message is not settable until actual text focus. AX click alone did not focus. Coordinate click on integrated Device Hub did focus; native setValue changed visible input but did not replace the React message state. CUA typeText produced option-style glyphs instead of ASCII; one test-only glyph message was sent. No clipboard paste was used, no private content transmitted. This is not claimed as successful exact-text input.
- Switched to actual on-screen keyboard button taps: typed Guest, verified before Send, sent at14:03PST. Host directly received Guest at14:03.
- Host typed Host using actual on-screen keys, verified before Send, sent14:06PST. Guest directly received Test / Host /14:06. Thus two-way delivery is directly observed. Generated test-only glyph message is retained as evidence, not silently deleted.
- Software keyboard explicitly enabled through Device > Keyboard > Toggle Software Keyboard on each device. Screenshots final-3-guest-keyboard.png and final-3-host-keyboard.png.
- Potential layout failure: host screenshot with software keyboard shows the message list but the composer/Send row appears hidden behind keyboard. Needs supervisor/developer visual review; do NOT mark keyboard-open layout PASS from send success alone. Guest initial keyboard layout showed composer above keyboard.
- After each on-screen-word send, a lowercase duplicate of that same word briefly remained in the native input; Codex cleared only its own leftover test characters with on-screen Delete. No human drafts touched.
- Device Hub had two manager windows plus a detached host window. Show in Device Hub on detached host, then File > Close on only the old manager window removed the duplicate UI target; coordinate clicks could then focus host input. No device shut down, account changed or app data reset.
- Step3b lifecycle/gap-fill test NOT STARTED yet; no guest pause command requested yet. Failed-send Retry remains UNVERIFIED.
- Step3b started once: developer revalidated guest process6156 and STOPped at14:08:54PST, scheduled automaticCONT14:09:54. Codex verified host unsent Gap and clickedSend duringpause, ~14:09:10 (capture14:09:12), final-3b-host-gap-sent.png. Host then showed Gap14:09 with no Sending indicator. Codex cleared only its own native input leftover gap with onscreenDelete. Guest resume observation pending; no reload or manual refresh requested.
- Step3b resumed: developer CONT at14:09:55PST (same process6156 per developer). Codex selected guest simulator window, with no iOS navigation/manual refresh/reload; R1 chat directly contained Gap14:09. Evidence final-3b-guest-gap-received.png. No Reconnecting banner was observed at sampling time; do not claim it was seen. Lifecycle/gap-fill reception PASS in this run, not a network-outage or failed-send retry test.

## C-1/C-2 recheck on e5fd2e0 (current code only)

Developer had merged e5fd2e0 at14:10:57 BEFORE the proposed old-code normal-nav repro; no rollback done and no old-code-normal-nav pass claimed. After failed sheet-dismiss gesture, developer opened HOST Rooms root; Codex visually confirmed Rooms and tapped R1 from the room list (not via room deep link). R1 now visibly had Back. Focused composer and enabled software keyboard. Message field AND Send visibly ABOVE keyboard: current-code normal navigation PASS, final-3-host-keyboard-fixed.png.

C-2 remains reproducible: actual on-screen O then k → visible Ok before Send; Send produced Ok14:13 bubble, but lowercase ok remained selected in input >5s later, Send still active. No AX setValue or CUA typeText was used for this message. Screenshot final-3-c2-residual.png. Do NOT mark C-2 native clear() fix accepted on device. Own residual test text will be cleared without sending a duplicate. Invite Done check pending.
- Invite Done path PASS on e5fd2e0: opened existing R1 Invite by header tap (no new room), directly saw Done and same code03424, screenshot final-3-host-invite-done.png. Tapped Done and returned to R1 chat with Back, keyboard still open and composer/Send visibly above it. C-2 residual was manually cleared before opening Invite; no duplicate message sent.

## Step 4 media — upload observations on e5fd2e0

Guest R1 gallery: + → Photos and videos → selected ONLY generated 0:07 home-screen video thumbnail → confirm1Video. Direct progress QA-video.mp4 ·5.3MB, Uploading17% then80%; final Video tile. Evidence final-4-video-upload-progress.png. No cancellation/retry exercised or claimed.

Then + → File → Files Browse → On My iPhone → selected ONLY QA-file (91bytes,13:37). App showed QA-file.txt ·91B, Uploading99%, then File tile labelled QA-file.txt alongside Video. Evidence final-4-guest-uploaded.png. Both uploads completed ~14:16PST; server hash/size verification and host download/play/save pending.
- Host R1 gallery showed File and Video from guest. Video detail QA-video.mp4, Shared by Test joiner ·5.3MB,14:15:58PST. Playback controls showed Pause and0:00/-0:07, frames changed from home icons to a public example web page from the fixture; final-4-host-video-playing.png. Download original showed Downloading76%, then Saved to Photos. Original verified(5.3MB). final-4-host-video-saved.png. This is direct UI evidence; source/server/disk-byte equality remains for developer/supervisor, not inferred solely from the UI claim.
- Host file detail QA-file.txt, Shared by Test joiner ·91B ·14:16:52PST. Download original → iOS share sheet Text Document91bytes → Save to Files → On My iPhone → Save. App returned Original saved. Original verified(91B). final-4-host-file-saved.png.
- Actual Files app opened the saved TXT: content visibly `Moment final QA test file` and `Generated 2026-11-06 by the developer session. No personal data.`; matches generated source text. final-4-host-file-opened.png. Saved filename was UUID `7ce082f9-9beb-426c-8427-918802fb9b64.txt`, NOT original QA-file.txt (minor filename-preservation finding, not masked by manual rename).
- Step4 UI upload/progress/video playback/video Photos-save/file Files-save+open DONE. No failed upload, cancellation or Retry exercised. Host currently Files Quick Look; guest Moment R1 gallery. Byte/hash server/source and actual saved artifacts checks pending supervisor/developer.
