# Final draft QA: device steps for Codex (supervisor, 2026-11-06)

STATUS: SETUP IN PROGRESS. Codex must not start until the supervisor writes "GO <time>" at the bottom of this file.
Fixture approval: planning/CODEX_QA_ADDITIONAL_APPROVAL_2026-11-06.md, recorded in planning/USER_DECISIONS_2026-11-04_OPERATIONS_EN.md.
The approval allows at most 3 new rooms and EXACTLY 1 disposable account. Live status: docs/reviews/codex-final-qa-live-status.md.

## Setup
- Host test@example.com: iPhone 17 (F11BA960-84AE-4AFA-A234-92800AF43B9E).
- Guest Test joiner: iPhone 17 Pro (20541309-C36F-4864-94CA-D8A341F70EEB).
- Bundle: commit 27d7717 (it includes d512dad), served by Metro on http://127.0.0.1:8081. The native build is unchanged.
  - The old dev-client URL http://192.168.1.131:8081 is DEAD because the LAN IP changed. Never use it.
  - The "Me" chip is checked at step 0 inside R1.
- D1 sim: iPhone 17e (6E0F2097-4840-413D-92CA-D266BDA71773), with the same Moment.app. Nobody is signed up on it yet.
- Generated fixtures (no person; hashes in docs/evidence/final-qa/SETUP.md):
  - QA-pattern.jpg in Photos on the guest 17 Pro and on the 17e.
  - QA-video.mp4 (5.5 MB) in Photos on the guest.
  - QA-file.txt in guest Files → On My iPhone.
- Do NOT reuse the expired room 94673.

## Fixture ownership (one creator per fixture; never create one again if it already exists)
| Fixture | Created by | How | Recorded ID |
|---|---|---|---|
| R1 general room | Codex | Host app: Create room, "4 days", location allowed ON. Guest joins by code | code ____, id ____ |
| R3 short-expiry room (optional) | Codex | Host app: Create room, "3 hours" (expires about 3 h later; the janitor runs */15). Created right after R1 so it expires tonight | code ____, id ____ |
| R2 reminder room | Codex creates it in the app ("1 day"); the developer then proposes an exact-ID `expires_at` adjustment to about now + 24 h + 3 min, and the supervisor ACKs before the developer runs it | see step 11 | code ____, id ____ |
| D1 disposable account | Codex signs it up IN THE APP on a THIRD simulator, which the developer boots and installs the same build on. The preserved accounts are never signed out | developer records the UUID from auth right after sign-up | uuid ____ |
| Test media (video, file, generated face-pattern image) | developer | `simctl addmedia` with generated, non-personal files only | names ____ |

- Before creating anything, the creator re-reads this table. If an ID is already filled in, do not create the fixture again.
- If a creation fails partway, STOP and report it. Do not retry the creation until the supervisor has read the server.
- Rules:
  - Codex taps and takes screenshots. The developer runs simctl and reads the server. The supervisor verifies the server state.
  - Evidence goes to docs/evidence/2026-11-06-final-<step>.png.
  - Report verbatim on-screen text, and STOP at each STOP.
  - Never delete a preserved account. Never use a camera photo or a picture of any person.

## Step S: load the bundle (Codex)
S1. Host 17 and guest 17 Pro each show the iOS prompt 'Open in "Moment"?'. Tap Open on both. If the prompt is gone, use the dev-client launcher → "Enter URL manually" → http://127.0.0.1:8081.
S2. iPhone 17e: open Moment → dev-client launcher → "Enter URL manually" → http://127.0.0.1:8081. Do not sign up yet.
S3. Report on each device: the Rooms screen (or the welcome screen on the 17e), whether a red box appears, and the signed-in name. STOP. The developer takes screenshots and confirms that the bundle is fresh.

## Batch A
0. Rooms (only after the supervisor writes "S OK" in the live status): host creates R1 ("4 days") and then R3 ("3 hours"). Guest joins both by 5-digit code. Record codes and the member lists on both devices, then fill in the table. Also open the R1 Gallery on the guest and confirm the 4th chip "Me" exists (do not tap Set up yet). R2 is created later, at step 11 timing. STOP.
1. Status editor (d512dad): host opens Room info → Statuses → renames one status, adds "Running late", removes one status that the guest picked earlier → Save → confirm the Alert. Guest: Room info shows the new list read-only. Guest chat Status picker shows the new list. Screenshots: final-1-host.png, final-1-guest.png. STOP.
2. Activity UI: guest taps Arrived. Then the guest sets a status. Then the guest triggers Emergency. Host: record the arrival notice, the status, the Emergency banner, and the acknowledgement. Then the host acknowledges. Screenshots for each. STOP.
3. Chat: host and guest exchange 2 messages with the keyboard OPEN (layout screenshot). Retry/reconnect: the developer turns the guest network off (method in the Setup note), the guest sends 1 message (failed state + Retry visible), then the network goes back on → Retry → delivered on the host. STOP.
4. Media:
   - The guest uploads 1 short video and 1 file (a generated test file via `simctl addmedia` or the Files fixture named by the developer).
   - The host downloads, plays and saves the video, and opens and saves the file.
   - Record progress, success, and any error and Retry.
   - Supervisor: compare the byte size on the server with the original. STOP.
5. Map route + activity:
   - Host: allow location → add 3 tap points → save the route. The guest map shows the same route.
   - Host: Start activity. Guest: share ON. Then End activity: guest pins and rows disappear (supervisor: live_presence 0).
   - Guest: sign out while sharing (on R1 only after step 9 is done; otherwise skip and mark NOT RUN).
   - STOP.
6. Case 3 (required):
   - 3a: the developer runs `simctl location clear` on the guest with share ON. About 75 s later, the host shows "Location stale" and a grey pin, or Codex reports exactly what is shown.
   - 3b: guest iOS Settings → Moment Location → Never. Record the guest UI and the host UI.
   - Restore the permission afterwards. STOP.

## Batch B (after the face gallery diff is accepted)
7. Face gallery, disabled path:
   - Guest: Gallery → "Photos of me" → the consent text must include room-only, estimate, private reference, external service, and removal.
   - Choose from gallery → GENERATED pattern image only (the developer adds it with `simctl addmedia`) → Agree and save.
   - Expected: the "off in this draft" copy, no "Likely you" badge, no count.
   - Then "Stop and remove" → confirm. Supervisor: the enrollment row is gone and face-refs objects for R1/guest = 0. STOP.
8. Plan preview: open the plan/upgrade preview. It must be labelled as a demo; no real payment. Screenshot. STOP.
9. Account-deletion UI (D1, approved): on the THIRD sim, D1 signs up in the app (developer records the UUID) → joins R1 by code → sends 1 message and sets an avatar (generated image) → Profile → Delete account → confirm. Record each screen. Supervisor checks the server cleanup for that exact UUID after the janitor run. Preserved accounts are untouched.

## Walkthrough and expiry (evening)
10. Integrated host/guest walkthrough:
    - create → QR or code join → chat → arrival/status → media save → map → face disabled path → leave.
    - Record each screen.
11. Reminder (R2, approved): the local notification fires on both sims. Tap → the room opens. After R2 has ended, tap → the gone screen (§72).
12. Expiry/cleanup regression: on R3, after expiry, access is denied in the app, and the janitor run leaves storage and rows at 0 (supervisor reads).

## Not covered on simulators (stays UNVERIFIED in the draft)
- MS1 after a real stop on a physical device.
- Face positive match and accuracy.
- APNs remote push.
- Android.

GO: ~13:40 PST: Step S done for host and guest (S OK); Step 0 RELEASED. S2 (17e) runs in parallel. Later steps follow per-step go-aheads in docs/reviews/codex-final-qa-live-status.md.
