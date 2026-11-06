# F1 map speed QA — Codex, 2026-11-06

Scope: room 94673 `QA verification` (b03236a9-7092-4348-951d-99aa8937dc33), existing host and guest only. Simulated positions only. No application code changes.

## Direct device observations

- Around 19:32Z: host iPhone 17 showed `Activity running` and `End activity` after Codex tapped `Start activity`. Guest iPhone 17 Pro showed `Share my live location` value 1, then `Sharing your position` after Codex enabled sharing. Host own sharing remained OFF.
- Around 19:33–19:35Z: host marker accessibility label and visible caption both read `Test joiner · 18.0 km/h`. Host member row read `18.0 km/h · Updated just now`, through accessibility and then visibly after bringing that row into view. No marker callout was opened.
- Evidence: `2026-11-06-f1-host-moving-pin-visible.png` shows the full marker and caption. `2026-11-06-f1-host-moving-pin-and-row.png` shows BOTH the marker caption and the member row. The earlier `moving-initial.png` and `moving-pin.png` were captured before the marker was fully within the viewport and are not the primary marker evidence.

## Coordination and server evidence (reported, not Codex SQL)

- Supervisor's `docs/reviews/codex-f1-live-status.md` records developer route start 19:32:59Z, simulated eastbound 5 m/s.
- Developer's reported server sample at 19:34:10Z: guest `speed_mps = 5`, heading 90, longitude -122.482215. Supervisor reviewed the visible marker screenshot independently.
- Route expected to end around 19:37:40Z. Stationary UI observation and cleanup pending.

## UI automation recovery

Detached Device Hub simulator window supported accessibility actions but coordinate input failed (`noWindowsAvailable`). Restarting only host simulator preserved its account and data but did not fix detached coordinate input. Selecting `Show in Device Hub` opened the integrated window, in which coordinate clicks worked. Native app search launched Moment without Safari or clipboard paste. Map was zoomed out using the simulator's option-modified two-finger double tap; no product behavior changed. Accessibility click on the offscreen member text brought the lower list into view. Window-menu indices required a fresh full accessibility tree to select the correct device.

## Stationary observation and cleanup taps

- At 19:39:30–34Z: host marker changed to grey clock, caption/accessibility `Test joiner` with NO speed; member row visibly and via accessibility `Location stale · 1 min ago`. Evidence: `2026-11-06-f1-host-stationary-stale.png`.
- Timing limitation: this sample was about 110 seconds after the reported 19:37:40Z route endpoint, not exactly 60–90 seconds. At about 19:38:47Z (~67 seconds after endpoint) speed was still visible. Supervisor explains the cached-fix heartbeat at 19:38:10.89Z, followed by a 60-second stale cutoff; their independent server read at 19:39:17Z had the same timestamp (age 66 seconds). Thus this validates eventual stale treatment with a grey clock and hidden speed; it does not establish a strict 90-second stop-to-stale maximum. Both times are preserved rather than relabeling the sample.
- Around 19:40Z: Codex switched guest sharing OFF (value 0), then tapped host `End activity` and confirmed `End activity` in the alert. Host showed `Start activity`, `No activity running`, own share 0, and no member pin. Guest independently showed `No activity running` and share 0. Evidence: `2026-11-06-f1-host-clean.png`, `2026-11-06-f1-guest-clean.png`.
- No room or account created/deleted. Existing room and both existing users preserved. Developer simulator-location clear and final server cleanup check requested via supervisor; pending confirmation.
