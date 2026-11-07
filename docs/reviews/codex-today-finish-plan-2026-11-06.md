# Today-finish plan: November 6, 2026 (supervisor-owned; Codex reads it)

Written 13:28 PST (21:28Z). Source directive: planning/CODEX_TODAY_FINISH_DIRECTIVE_2026-11-06.md. Decisions are recorded in planning/USER_DECISIONS_2026-11-04_OPERATIONS_EN.md (Nov 6, 13:26 PST section).

## Acknowledgements
- Supervisor: ACK at 13:26 PST. The deadline is the runnable iOS draft by 23:59 PST (07:59Z, Nov 7). The following are recorded:
  - Tap-point routes are kept; freehand drawing is deferred.
  - MS1 is closed (f450b7e accepted).
  - The face positive-match test is deferred.
  - The switch, secrets, costs, real face uploads, provider settings, push and release are not authorized.
- Developer: ACK at 13:27 PST (cross-session message): "runnable iOS draft by 23:59 PST today; local commits only."

## Running now
- Developer: host status-list editor, uncommitted.
  - Files: mobile/src/components/status-editor.tsx, lib/status-plan.ts, tests/status-plan.test.mjs, i18n/en.ts.
  - Developer-reported: npm test 67/67 and tsc clean.
  - Being fixed: one lint error, and a code-point vs char_length length check.
  - Being wired into the room info screen.

- Update at ~13:29 PST: status editor diff ACCEPTED by the supervisor (see docs/reviews/current.md).
- Update at ~13:31 PST: status editor committed as d512dad (not yet checked on a device). Face gallery plan ACCEPTED with FG-1..4. The developer is implementing it (target 18:30). The supervisor is drafting docs/reviews/codex-final-qa-steps.md.

## Ordered deliverables (PST)
| # | Deliverable | Owner | Target |
|---|---|---|---|
| 1 | Status editor diff to supervisor; review; commit | developer, then supervisor | diff 14:15, commit by 14:30 |
| 2 | Face gallery plan (≤10 lines) | developer | 14:30 |
| 3 | Face plan review/ACK | supervisor | 15:00 |
| 4 | Codex device checklist and fixtures for the remaining checks (below) | supervisor | 15:30 (in parallel with 2 and 3) |
| 5 | Face gallery UI, behind the switch (OFF): consent, reference, Photos of me, exclude, withdraw, disabled/error states | developer | implementation 18:30; diff review by 19:00 |
| 6 | Device QA batch A (status editor, activity UI, chat, media, route sync, Case 3) | Codex via supervisor; developer runs simctl | 15:30–18:30, in parallel with 5 |
| 7 | Device QA batch B (face gallery disabled/error states, account-deletion UI, plan preview) | Codex | 19:00–20:00 |
| 8 | Integrated host/guest walkthrough and expiry/cleanup regression | Codex, developer, supervisor | 20:00–21:30 |
| 9 | Fix real functional failures; re-check | developer, then supervisor | 21:30–23:00 |
| 10 | CURRENT_STATE / DEMO truthful labels (PASS / IMPLEMENTED-UNVERIFIED / DEFERRED); final local commits; supervisor final review entry | developer, then supervisor | 23:00–23:45 |

## Accepted deferrals (human-approved only)
- Freehand route drawing; tap points are used in the draft.
- Face positive match and accuracy: no authorized face fixtures. Deploy and auth checks are done.
- Android (C6), push/EAS credentials, release and push.

## Remaining checks (must stay on the list; not passed)
- Case 3: fresh-fix loss / location permission revoke shows truthful stale.
- MS1 after a real stop on a physical device: no device is available, so this stays UNVERIFIED in the draft.
- Media on device: video and file upload/download/save (photo already PASS).
- Expiry reminder: fires; tap opens the room; tap on an ended room shows the gone screen.
- Chat retry/reconnect; chat with the keyboard open; checklist steps 5–10.
- Activity UI: Arrived, status sheet, Emergency banner and acknowledgement (server path already live PASS).
- Route save/sync to the guest; End activity clears positions; sign-out stops sharing.
- Status editor (new); face gallery disabled/error states (new).
- Account deletion through the in-app UI (server path F2 PASS; that was a direct POST).
- Plan preview / final account flows.
- Expiry/cleanup regression in the walkthrough.

## Human-only blocker (one grouped request)
- QA room: the only live room, 94673 (b03236a9), expires at 21:31:42Z (13:31 PST). Every device check above needs a room.
  - Request: allow the preserved host account `test@example.com` (17 simulator) to create NEW rooms in the app, and allow `Test joiner` (17 Pro) to join them.
    - One room with the normal duration for batches A, B and the walkthrough.
    - One room set to expire about 24 h + 3 min out, for the reminder test.
    - Optionally, one short room to observe expiry/cleanup.
  - Data scope: rooms created by these two accounts, plus their own messages, media and statuses. Expiry cleanup is done by the janitor only.
  - Not requested: no account deletion of the preserved accounts and no manual data deletion.
  - The in-app account-deletion UI test needs ONE more disposable account, created and deleted by exact ID like F2. This needs a separate yes/no.
- Until the human answers, the developer continues code work (items 1, 2 and 5); no device QA runs.

## Next Codex QA handoff
- DRAFTED at ~13:31 PST: docs/reviews/codex-final-qa-steps.md (batches A and B, walkthrough, reminder, expiry). It is NOT runnable until the human approves new rooms and the supervisor fills in Setup and writes "GO <time>" in that file.

## Deadline risk
- Medium. Face gallery implementation (about 4 h) and the device QA batches overlap in the evening. If the room approval is not received by about 16:00 PST, batch A slips and the walkthrough becomes the critical path. The supervisor will update this file if a target slips by more than 30 min.
