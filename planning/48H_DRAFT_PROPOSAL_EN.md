# 48-hour runnable draft proposal

Status: ACTIVE. Approved by the human in this conversation on November 4, 2026.
This changes delivery order and coordination, not the confirmed product scope.
The target is a runnable iOS draft within 48 hours of approval, not a claim that
every feature is production-ready. If the target is at risk, report concrete gaps;
never silently replace required behavior with a mock or call untested code done.

## Working rules

1. Deliver complete user flows in the running app, not isolated backend scaffolds.
   First close the existing chat UI verification gap using a normally authorized
   simulator tool or a short human-assisted check. Never bypass a classifier denial.
2. No new orchestration, architecture framework, agent team, or plugin installation
   during this delivery window unless a specific missing capability requires it.
   Use the installed Expo, Supabase, React Native and focused Superpowers practices.
   Do not restart product discovery or re-plan already approved work.
3. Developer sends a stable checkpoint and then continues independent approved work
   while supervisor reviews. Wait only if a finding blocks safe dependent work.
   Supervisor blocks on concrete security, data-loss or functional failures; record
   cosmetic findings for final polish. Never waive membership or deletion correctness.
4. Keep one CURRENT_STATE section with completed flows, active task, unresolved
   blockers and the exact next command/task. Archive contradictory historical status
   to dated evidence files without deleting the evidence. After handoff, read the
   brief, CURRENT_STATE and relevant finding; load other docs only when needed.
5. Run checks proportional to the change. Run the full RLS suite after changes to
   database access/deletion behavior; use focused checks for unrelated UI changes.
   Do not repeat a successful full check without new relevant changes or a failure.
6. Store test screenshots in docs/evidence/ instead of arbitrary temporary paths.
   Keep test fixture IDs and creation evidence in an ignored local manifest as soon
   as fixtures are created. Cleanup must use exact verified identities.
7. Routine authorized implementation, meaningful verification, local commits and
   verified QA cleanup need no fresh product decision. Authentication, secrets,
   spending, safety rejections and material product changes need the human.
8. Report PASS / IMPLEMENTED-UNVERIFIED / BLOCKED separately. Missing credentials
   do not stop unrelated implementation. The disabled Codex controller stays off.

## Sequence and checkpoints

These are planning targets, not guaranteed duration estimates. Preserve useful
expiry-worker work already in progress instead of restarting it for this plan.

| Window | Concrete deliverable |
|---|---|
| 0–6 hours | Close chat UI check; prove current expiry worker actually removes a test room's stored files and denies expired access. Stabilize the core flow. |
| 6–18 hours | Photo/video upload and original download, progress/failure/retry, gallery All/Mine/Others. Verify a nonempty stored object and an original download's byte size/hash. |
| 18–30 hours | Arrival, configurable status, in-app Emergency on a second client; 24-hour reminder logic; basic foreground location, route and speed path using simulated locations. |
| 30–40 hours | Connect the existing photo-only face feature to the gallery and rights-cleared AWS test photos if secrets are ready; profile photo, account deletion and plan preview. |
| 40–48 hours | Integrated host/guest walkthrough, expiry/file/face cleanup regression, visible error/loading states, consistent English UI, demo instructions and remaining-gap list. |

## Acceptance walkthrough

- Host creates an expiring room; installed-app guest joins by code/deep link.
- Two visible clients exchange messages. Retry and reconnection are checked.
- A photo and video are uploaded, viewed, filtered by uploader and downloaded.
- A member marks arrival and changes status; another client sees Emergency.
- Foreground location/route/speed are displayed with opt-in controls; no claim of
  reliable locked-phone background tracking is made.
- Expiry blocks access and the cleanup worker removes actual test storage objects;
  room-scoped face references and matches are covered. A controlled near-threshold
  test verifies the 24-hour reminder without waiting a full day.
- Photo face matching uses real CompareFaces results on rights-cleared test images
  when credentials are available; otherwise it remains explicitly BLOCKED.
- Paid plans remain an intentional preview; real APNs delivery remains excluded by
  the human's existing decision. Account deletion must be implemented and verified.

## Human dependencies to resolve early

- Explicit normal authorization for the chosen simulator automation tool, or a
  scheduled manual UI walkthrough. No alternate-tool workaround to a denial.
- AWS server secrets and three rights-cleared test photos. Remain on Free plan;
  no Organizations creation/paid upgrade. Real participant photos await retention
  and opt-out review. Never ask for secret values in chat.
- Any actual scope tradeoff if the remaining work cannot fit: the human decides.

## Files implementing this agreement

- CLAUDE.md: link the active delivery target and current-state entry point.
- planning/CLAUDE_DEVELOPER_SESSION_EN.md and SUPERVISOR counterpart: update
  checkpoint coordination, proportional verification and on-demand document reads.
- Handoff instructions: read CURRENT_STATE first; preserve findings and exact next task.
- docs/implementation-status.md: one consistent current status; historical evidence
  retained separately. Supervisor updates its own current review summary.

References: https://code.claude.com/docs/en/best-practices and
https://docs.expo.dev/skills/ . No change to the confirmed feature list is proposed.
