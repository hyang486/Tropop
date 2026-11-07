# MS1/MS2: map fresh-fix verification steps for Codex (supervisor, 2026-11-06)

Scope: verification of commit 559233d only. No new feature, no code change. Approved in
planning/USER_DECISIONS_2026-11-04_OPERATIONS_EN.md ("November 6 (afternoon)").
Use only the existing accounts, the existing room, and simulated locations. Do not create or delete any account or room.

- Room: 94673 "QA verification" (b03236a9).
- Host test@example.com: iPhone 17 (F11BA960-84AE-4AFA-A234-92800AF43B9E).
- Guest Test joiner: iPhone 17 Pro (20541309-C36F-4864-94CA-D8A341F70EEB).
- Before Part A, the developer confirms that the room has not expired and that both apps run the new JS bundle.
  Codex waits for "setup OK" from the supervisor.

Codex taps and takes screenshots. The developer runs simctl and reads the server. Evidence goes in
docs/evidence/2026-11-06-ms-*.png. Report each step's verbatim text to the supervisor and stop at each "STOP".

## Part A: start (Codex taps)
1. Host: room 94673 → Map → "Start activity".
2. Guest: room 94673 → Map → "Share my live location" ON. Allow any permission prompt. STOP and report "Part A done".

## Case 1: moving (after the supervisor says the route is running)
3. Within about 30 s, on the HOST map record the text under the guest pin (expected "Test joiner · 18.0 km/h") and the
   guest row (expected "18.0 km/h · Updated just now"). Screenshot: ms-1-moving.png. STOP.

## Case 2: stationary (after the supervisor says "stopped at HH:MM:SS")
Keep the GUEST app in the foreground on the map screen. Do not lock it or switch apps.
4. Record the host pin text and the guest row at about 15 s, 45 s, 75 s and 130 s after the stop time.
   Screenshots: ms-2-15s.png, ms-2-45s.png, ms-2-75s.png, ms-2-130s.png.
   Expected: from about 45 s on, no speed (or "0.0 km/h"); never "18.0 km/h" after that; the row shows
   "Updated just now" or "<1 min ago", and NEVER "Location stale" and no grey clock pin. STOP.

## Case 3a: fresh-fix loss (after the supervisor says "location cleared at HH:MM:SS")
5. Keep the guest app in the foreground. At about 75 s after the clear time, record the host view.
   Expected: "Location stale · 1 min ago" and a grey clock pin. The guest's share switch stays ON.
   If the host still shows fresh updates, report exactly that: it means the simulator did not simulate loss.
   Screenshots: ms-3a-host.png, ms-3a-guest.png. STOP.

## Case 3b: permission revoked (after the supervisor says the location is set again)
6. Guest: iOS Settings → Privacy & Security → Location Services → Moment → Never. Return to Moment.
   Record the guest map (share switch state and any message) and the host map (expected: no guest pin and no guest
   location row). Screenshots: ms-3b-guest.png, ms-3b-host.png.
7. Guest: set the permission back to "While Using the App", return to Moment, and turn "Share my live location"
   ON again if it is off. After about 40 s, record the host view (expected: guest pin back, "Updated just now").
   Screenshot: ms-3b-restored.png. STOP.

## Part C: cleanup (Codex taps)
8. Guest: "Share my live location" OFF. Host: "End activity" (confirm). Both maps should show "No activity running".
9. Report the verbatim texts, the screenshot names and the final state.

The UI alone does not pass this check. The supervisor and developer cross-check each step against
live_presence.updated_at and speed_mps. The pass rule for Case 2 is: updated_at is never older than 60 s, and
5 m/s never reappears after the first write after the stop.
