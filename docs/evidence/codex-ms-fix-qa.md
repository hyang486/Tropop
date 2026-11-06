# MS1/MS2 device QA — Codex, 2026-11-06

Scope: commit 559233d, existing room 94673 / b03236a9-7092-4348-951d-99aa8937dc33 and existing host/guest only. No app code edited by Codex. Supervisor plan/status: docs/reviews/codex-ms-fix-steps.md and codex-ms-live-status.md.

## Coordination delay and recovery

At ~21:14Z developer and supervisor were waiting for Codex Part A; developer status `busy` included an existing background shell and was not evidence of active implementation. Supervisor had requested human relay after setup OK at ~20:02Z. Codex resumed direct supervisor coordination after the human asked why both were stopped. Unsent drafts were not submitted or overwritten.

CUA accessibility clicks worked, but coordinate clicks failed `noWindowsAvailable` even after integrated Device Hub, Center and session reset. Developer opened the already-authorized room map deep link on both simulators via supervisor (21:16:05Z). Codex then tapped host Start activity and guest Share ON and directly verified both states; Part A report sent ~21:17:09Z. Guest app stayed on its map during observation; choosing another simulator window does not switch the guest's iOS app away from Moment.

## Evidence and actual capture times

The 15s/45s/75s/130s filenames are planned slots, NOT exact elapsed-time claims. STOP ~21:17:57Z is the supervisor's route-duration estimate, not a measured timestamp.

| File prefix 2026-11-06- | Exact UTC capture | Direct observation |
|---|---|---|
| ms-1-moving.png | 21:17:49Z | Pin `Test joiner · 18.0 km/h`; row `18.0 km/h · Updated just now`, both visible and AX. Initial AX observation was earlier, ~21:17:37Z. |
| ms-2-15s.png | 21:18:18Z (~STOP+21s) | Same speed 18.0 and Updated just now. |
| ms-2-45s.png | 21:18:49Z (~STOP+52s) | Same speed 18.0 and Updated just now. |
| ms-2-75s.png | 21:19:18Z (~STOP+81s) | Same speed 18.0 and Updated just now. |
| ms-2-130s.png | 21:20:20Z (~STOP+143s) | Pin `Test joiner` with NO speed, row `Updated just now`, no grey clock. AX/visual observation ~21:20:09Z. Whether this follows the separate fixed-point simulation MUST be resolved from developer exact command time before calling it natural-stop evidence. |

## Server evidence and limitations

Supervisor independently read fresh writes at 21:18:22.13Z and 21:18:57.20Z, endpoint longitude -122.4845, speed_mps 5. Thus no-stale behavior continued, but hiding old speed on natural route completion did NOT pass at +52/+81 seconds. Supervisor suspects simulator readings themselves retain speed 5; no raw native speed reading was logged, so that explanation is unproven.

Case 3a/3b (fresh-fix loss and permission revocation) were deferred by supervisor for the expiring-room timing; not run and not passed. Separate fixed-point condition and cleanup results pending below.

## Fixed-point classification and cleanup

Supervisor confirmed developer fixed-point `simctl location … set 37.7694,-122.4845` at 21:19:59Z, earlier than planned. Therefore the nominal +130s screenshot is AFTER that intervention and is fixed-point evidence only. Server updated_at 21:20:07.22Z had speed_mps NULL; host visibly hid the speed. Additional `2026-11-06-ms-2b-fixed.png` (~21:20:55Z) likewise showed `Test joiner` and `Updated just now`, no stale clock. Natural-stop MS1 remains unverified/failed in this simulation; simulator source-speed artifact is an inference, not proven by raw speed logging. MS2 fresh stationary reporting passed this simulator case. No real-device stop or fresh-fix-loss test was run.

Around 21:21Z Codex turned guest sharing OFF, then ended host activity and confirmed the dialog. Both devices directly showed `No activity running`, sharing value0, no participant presence. Screenshots `2026-11-06-ms-host-clean.png` and `2026-11-06-ms-guest-clean.png`. Developer location clear and final server read requested via supervisor.
