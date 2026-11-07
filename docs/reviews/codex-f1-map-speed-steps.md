# F1: map speed verification steps for Codex (supervisor, 2026-11-06)

Scope: verification only. No new feature, no code change, and no tap-to-highlight. Approved in planning/USER_DECISIONS_2026-11-04_OPERATIONS_EN.md (November 6, item 1).
Use only the existing accounts, the existing room, and simulated locations. Do not create or delete any account or room.

- Room: 94673 "QA verification".
- Host test@example.com: iPhone 17 (F11BA960-84AE-4AFA-A234-92800AF43B9E).
- Guest Test joiner: iPhone 17 Pro (20541309-C36F-4864-94CA-D8A341F70EEB).

## Part A: Codex (taps)
1. Host: open room 94673 → Map. Location should be allowed. Tap "Start activity".
2. Guest: open room 94673 → Map. Turn ON "Share my live location". If a permission prompt appears, allow it.
3. Report "Part A done" to the supervisor and stop. The developer then starts the moving simulated location on the guest: 5 m/s eastward for about 4.7 minutes.

## Part B: Codex (observe only, after the supervisor says the route is running)
4. Within about 30 s, look at the HOST map screen. Record the exact text:
   - Under the guest pin: expected "Test joiner · 18.0 km/h" (±0.x is acceptable). The pin should move east.
   - The guest's member row: expected "18.0 km/h · Updated <age>".
   Take a screenshot of the host. Do not tap the pin; there is no callout by design.
5. After the developer stops the route (the location becomes stationary), wait about 60-90 s and record the text again. Either result is acceptable:
   - no speed (or "0.0 km/h") with "Updated <age>", or
   - "Location stale · <age>" with a grey clock pin.

## Part C: Codex (cleanup taps)
6. Guest: "Share my live location" OFF. Host: "End activity" (confirm). Both maps should show "No activity running".
7. Report the verbatim texts, screenshot names, and the final state to the supervisor.

UI observation alone does not pass F1. The supervisor and developer cross-check it against live_presence.speed_mps and the server state.
