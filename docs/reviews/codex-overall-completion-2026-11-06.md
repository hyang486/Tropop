# Overall completion estimate — 2026-11-06

Requested in planning/CODEX_DIRECTIVE_AND_PROGRESS_2026-11-06.md. Supervisor owns this file. Each role's
assessment is its own; the numbers are ESTIMATES, not measurements. The state is as of 2026-11-06 ~20:00Z,
BEFORE the MS1/MS2 map fix.

F1–F4 (Nov 6) were a checkpoint, not overall completion.

## Supervisor assessment

Denominator: the 12 deliverables of planning/48H_DRAFT_PROPOSAL_EN.md (sequence table + acceptance walkthrough),
equal weight (1 each). Excluded as deferred by the human: real payments (plan is a preview by decision), real
APNs delivery, Android, background/locked-phone tracking, account-global face references.

Credit rules. Implemented: code committed and (where needed) live on the server = 1; partial = fraction.
Verified: independently observed on a simulator or server with evidence that the supervisor checked = 1;
partly verified = fraction; build, tsc, unit tests or mock data alone = 0.

| # | Deliverable | Impl. | Verified | Basis / what is missing |
|---|---|---|---|---|
| 1 | Auth, room create/invite/join/leave/end | 1 | 1 | Simulator evidence (implementation-status.md). |
| 2 | Chat between two clients, retry/reconnect | 1 | 0.75 | Two-way PASS; retry and reconnect not explicitly checked on a device. |
| 3 | Photo/video upload, original download, progress/failure/retry, gallery All/Mine/Others | 1 | 0.5 | Photo byte-exact PASS. Video, progress, cancel, forced failure + Retry, filters under the header, live appearance: unverified. |
| 4 | Arrival, status, Emergency on a second client | 1 | 1 | Codex device QA 2026-11-05 + server cross-check. |
| 5 | 24-hour reminder (controlled near-threshold test) | 1 | 0.3 | Server 0019 live with cron. Local reminder firing, tap to room, tap on an ended room: unverified. |
| 6 | Foreground location, route, speed with opt-in | 0.85 | 0.5 | Opt-in, pins and speed (F1) PASS; stale PASS. MS1/MS2 defect open (fix in progress). Route edit/sync and sign-out stop: unverified. |
| 7 | Expiry blocks access, cleanup removes real objects | 1 | 0.75 | Janitor live PASS with verified-empty jobs. Expired-room UI (gone screen) on a device: unverified. |
| 8 | Face matching in the gallery | 0.5 | 0.1 | face-match v2 deployed, auth checked, switch unset. NO client wiring to the gallery. Positive match DEFERRED by the human (no consented fixtures). |
| 9 | Profile photo, account deletion | 1 | 0.75 | Avatar set/replace/remove PASS; deletion server PASS (F2). In-app Delete account UI flow untested. |
| 10 | Plus plan preview | 1 | 0.6 | Render PASS; Get Plus alert and entry links not tapped. |
| 11 | Error/loading states, English UI, DEMO.md, gap list | 0.9 | 0.3 | Committed; raw Storage error text still shown in some hints; little seen on device. |
| 12 | Integrated host/guest walkthrough + cleanup regression | 0 | 0 | Not run yet. |
| | Total (of 12) | 10.25 | 6.55 | |

Supervisor estimate: implemented about 85% (range 80–90%); independently verified about 55% (range 50–60%).
The range reflects the equal weights; weighting media and location more heavily would lower the verified share.

### Remaining work, separated

- Mandatory draft work: MS1/MS2 fix (approved, in progress); face-match client wiring in the gallery (photo-only,
  room-scoped), or a human decision to drop it from the draft; integrated walkthrough (#12).
- Bugs/known gaps: MS1/MS2; core.ts bad_image saveMatch outside try (bounded by the 3-attempt cap); FM3 enroll
  throttle; raw error text in some hints; V1/V2 upload leftovers until expiry (accepted).
- Device checks still needed (Codex taps): video upload/progress/cancel/retry/playback; gallery tabs and live
  appearance; reminder firing and both tap flows; route editing; in-app account deletion; plan-preview taps;
  MS1/MS2 moving/stationary/fresh-fix-loss.
- Blocked/deferred by the human: face-match positive match and accuracy (no consented face photos).
- Release-only (outside the draft): real payments, APNs delivery, Android (needs Google Maps key), EAS credentials,
  secure-store faceIDPermission before TestFlight.

### Top 3 steps to the draft finish

1. Land MS1/MS2 and run its three-case device QA (developer + Codex via a supervisor plan).
2. Wire face matching into the gallery behind the existing switch (still unverified for positive match), or get
   the human's decision to leave it as backend-only for the draft.
3. One integrated Codex walkthrough that also covers the unverified device checks above, then an expiry/cleanup
   regression on a short-lived room.

Human dependencies: authorization for Codex device taps (existing), the face-match UI scope decision if step 2 is
contested, and consented face fixtures only if the positive match is ever required. Fresh device QA is needed.

## Developer assessment

Received 2026-11-06 ~20:00Z (developer's own message, as of ~19:55Z, before the MS1/MS2 fix). Estimates with
judgement-based weights, not measurements.

Headline: implemented about 89% (range 85–91); independently or device-verified about 57% (range 50–62).
Without the human-deferred face positive-match share (4 of 100 points), verified is about 59%.
Done means: implemented = in the app or on the server, reachable from the UI, tsc/lint/tests passing;
verified = a recorded server or device run accepted by the supervisor; partial credit by sub-steps covered.
F1–F4 were a Nov 6 checkpoint, not overall completion.

| # | Item (weight) | Impl. % | Verified % | Developer note |
|---|---|---|---|---|
| 1 | Auth incl. guest→host upgrade (6) | 100 | 85 | Sign-out and upgrade taps not re-verified. |
| 2 | Rooms create/invite/join/leave/end (8) | 100 | 80 | QR camera scan impossible on a simulator. |
| 3 | Chat incl. retry/reconnect (8) | 100 | 75 | Keyboard-open send, retry, reconnect unverified. |
| 4 | Photo original up/download, preview, filters (10) | 100 | 70 | Tabs after header fix, preview, live appearance unverified. |
| 5 | Video and general file (8) | 95 | 10 | No device run. |
| 6 | Arrival, status, Emergency + ack (8) | 90 | 90 | No host UI to edit statuses; set_status_definitions never called by the client. |
| 7 | 24 h reminder, banner, taps (7) | 95 | 35 | Firing and both taps unverified. |
| 8 | Expiry denial + janitor deletion (8) | 100 | 95 | Live janitor PASS + F2 cascade. |
| 9 | Location: allow, opt-in, activity, markers, speed, stale (10) | 85 | 60 | MS1/MS2 open; permission prompt, revoke+relaunch, sign-out stop unverified. |
| 10 | Route drawing and sync (4) | 75 | 10 | Tap points only, no freehand pen (M4). |
| 11 | Face matching (12) | 45 | 15 | Server deployed and auth-checked; lib/face.ts unused by any screen: consent, reference capture, "Photos of me" filter, labels, exclude, stop/remove, client trigger all missing. Positive match deferred. |
| 12 | Profile photo, account deletion, settings (6) | 100 | 75 | In-app Delete account flow not run on device. |
| 13 | Plus plan preview (2) | 100 | 60 | Taps not done. |
| 14 | Walkthrough, English, error/loading, demo doc (3) | 80 | 20 | Raw Supabase errors in some hints; no full walkthrough. |

Developer's remaining work: mandatory = MS1/MS2, face-match UI wiring (largest gap), host status editing UI,
freehand route (M4) unless the human accepts tap points. Bugs = MS1, MS2, bad_image saveMatch outside try,
raw error text, FM3. Device checks = video/file, reminder taps, location edge cases, route sync, in-app deletion
(guest and host, disposable accounts), chat keyboard/retry/reconnect, gallery, Plus taps, walkthrough.
Hard-blocked: none. Accepted/deferred: face positive match, APNs, background location, payments, M1/MK4,
avatar purge window, MK3, V1/V2, N19.
Stale entries the developer reconciles: 0021/delete-account "not applied/deployed" (live since 11-05, v2 now);
"Map UI uncommitted" (5288abf); "Video gaps uncommitted" (9c098dd); "face-match not deployed" (v2);
DEMO.md "speed not verified" (F1) and "deletion QA not approved" (F2 PASS).
Top 3: (1) MS1/MS2 fix + Codex QA; (2) face-match client wiring, verified up to the disabled 503 state;
(3) one device pass (video, reminders, in-app deletion, location edges) then the walkthrough, plus host status editing.
Human dependencies: device taps; accept or reject tap-point routes (M4); face fixtures and the switch only when chosen.

## Supervisor reconciliation

- The two assessments agree within range: implemented 85% vs 89%, verified 55% vs 57%.
- The developer's checklist is finer and names two gaps the supervisor table under-weighted: the host status-editing
  UI (a configurable-status requirement in the 48H plan) and freehand route drawing (M4). The supervisor accepts both
  as real gaps. M4 tap-points vs freehand is a product decision for the human.
- Face matching is the largest single gap in both views. Its client UI is mandatory draft work, not deferred; only
  the positive-match test is deferred.
- Supervisor did not independently re-check the developer's per-item percentages; the stale-entry reconciliation
  matches the supervisor's review log (current.md).
