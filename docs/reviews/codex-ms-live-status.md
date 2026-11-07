# MS QA live status (supervisor-owned; Codex reads this)

Room 94673 (b03236a9) expires at 21:31:42Z. Plan shortened at 21:15Z: Case 1 (short) + Case 2 only.
Case 3a/3b are NOT run today (no time before expiry); they need a later run in a valid room.

| Stage | Who | Command / action | Status |
|---|---|---|---|
| Pre-A (21:16Z) | developer | `simctl openurl` moment://room/b03236a9-7092-4348-951d-99aa8937dc33/map on both sims (Codex can't reach the Map header by AX) | DONE 21:16:05Z: host shows "Start activity", guest shows "Share my live location" OFF. Codex: do Part A now. |
| Part A | Codex | Host Start activity; guest Share ON (AX taps) | DONE (Codex report): host "Activity running", guest share ON. Route start ordered. |
| Case 1 short move | developer | `xcrun simctl location 20541309-C36F-4864-94CA-D8A341F70EEB start --speed=5 37.7694,-122.4862 37.7694,-122.4845` (about 150 m, about 30 s); route end = STOP time | not started |
| Case 1 observe | Codex | Host pin and row text within 20 s of the start; ms-1-moving.png | — |
| Case 2 stationary | Codex | Guest stays in the foreground. Host text at STOP+15 s, +45 s, +75 s, +130 s; ms-2-*.png | — |
| Part C cleanup | Codex, then developer | Guest Share OFF, host End activity; then `simctl location … clear`. START NO LATER THAN 21:25Z even if Case 2 is unfinished | — |

START: 21:17:26Z (developer, simctl exit 0).
Case 1: PASS. Codex saw "Test joiner · 18.0 km/h" and "18.0 km/h · Updated just now"; the supervisor checked ms-1-moving.png. Server at 21:17:37Z and 21:18:00Z: speed_mps 5, lng moving east (-122.48586, then -122.48483).
STOP time (route end): 21:17:57Z (supervisor estimate: 149.7 m at 5 m/s from 21:17:26Z; at 21:17:51Z the guest was about 30 m from the end). No extra simulated fix is applied: the simulator stays at the last waypoint, and the app must obtain fresh readings itself. That is what this case tests.
Agreed with Codex: the natural stop is tested first. Any extra simctl set would be a separate, labelled condition, and the natural-stop evidence is kept.
Server, natural stop: 21:18:09Z and 21:18:13Z: still lng -122.484833, speed_mps 5, updated_at 21:17:51Z (the last moving write). The fresh-fix heartbeat is expected at 30–45 s after 21:17:51Z, so between 21:18:21Z and 21:18:36Z.
Server, natural stop (supervisor reads): new writes at 21:18:22.13Z and 21:18:57.20Z, both at the end point lng -122.4845, both speed_mps 5.
- MS2 (not stale while still): writes keep coming about every 35 s at the parked point. So far PASS on the server; the host should not go stale.
- MS1 (old speed hidden): NOT PASSED. Codex saw 18.0 km/h at about +21 s and +45 s, and the server stores 5 in the fresh post-stop writes.
- Supervisor reading: the new code has no carried-forward speed (lastFix was removed), so the 5 most likely comes from the simulator's own readings at the parked end of a `location start` route. That is UNPROVEN: the raw reading's speed was not logged.
- Next, as a SEPARATE labelled condition after the +130 s observation (21:20:06Z): the developer runs `simctl location <guest> set 37.7694,-122.4845` (a fixed point at the same spot). Then check whether the next heartbeat write has speed null and the host hides the speed. The natural-stop evidence is kept as is.
Natural stop, full server record: post-stop heartbeat writes at 21:18:22Z, 21:18:57Z and 21:19:32Z, all at lng -122.4845, speed 5, heading null (developer reads; the supervisor saw the first two).
Codex capture times: ms-2-15s 21:18:18Z, ms-2-45s 21:18:49Z, ms-2-75s 21:19:18Z, all showing "18.0 km/h · Updated just now". Never stale.
Fixed-point condition: the developer ran `simctl location set 37.7694,-122.4845` at 21:19:59Z, 11 s earlier than planned. The row was still unchanged at 21:20:00Z, but ms-2-130s counts as AFTER the set. The supervisor read at 21:20:20Z: updated_at 21:20:07.22Z, speed_mps NULL, heading null. The next heartbeat (35 s after 21:19:32Z), on the same code path, now carries no speed.

Classification (supervisor):
- MS2: PASS on the server and in the UI on the simulator. 4 post-stop writes, 35 s apart; the host never went stale in about 130 s.
- MS1 natural stop: SIMULATOR ARTIFACT, likely but not proven. The same heartbeat path reported 5 while the simulator was parked at the end of a `location start` route, and null right after a `location set`. The app's reported speed follows the reading. The raw native speed was not logged, so this remains an inference.
- MS1 fixed point: server PASS (speed null at 21:20:07Z). Host UI PASS (Codex, about 21:20:09Z): the marker reads "Test joiner" with no speed, and the row says "Updated just now", not stale; see ms-2-130s.png, which is classified as fixed-point evidence.
- MS1 on a real device after a real stop: UNVERIFIED.
- Case 3 (fresh-fix loss): NOT RUN (time).
Case 2 observation times: 21:18:11Z (+15 s), 21:18:41Z (+45 s), 21:19:11Z (+75 s), 21:20:06Z (+130 s).
Cleanup (Part C) right after 21:20:06Z, no later than 21:25Z.

ANSWER TO CODEX (21:21Z): the exact command was `xcrun simctl location 20541309-C36F-4864-94CA-D8A341F70EEB set 37.7694,-122.4845` at 21:19:59Z (exit 0). Your ~21:20:09Z sample counts as the FIXED-POINT condition, not a natural-stop pass. Codex: do Part C cleanup NOW. After it, the developer runs `simctl location clear`.

## 21:22Z: supervisor reply to Codex
- Part C received. Developer ordered to run `simctl location clear` and read room b03236a9 (activity, both share flags, live_presence count). Cleanup verification: PENDING; it will be recorded here.
- Next tasks assigned to the developer (already authorized, 48H scope), in order: (1) commit the MS QA evidence and CURRENT_STATE classification only; (2) time-boxed proof of the simulator coords.speed at a parked route end vs after a fixed set; (3) START the host status-editing UI (existing set_status_definitions RPC, no server change); (4) then face-match gallery wiring behind the disabled switch, with a consent/UI plan reviewed by the supervisor before code.
- Human drafts (uncommitted planning/ and docs/ edits) are preserved; the developer commits only its own files.
- Cleanup VERIFIED: the developer ran simctl clear at 21:22:30Z. Supervisor read at 21:22:40Z for room b03236a9: activity ended (seq 3), live_presence 0, no member sharing. The room setting location_allowed is left unchanged. MS QA run CLOSED; Case 3 and real-device MS1 remain unverified.
