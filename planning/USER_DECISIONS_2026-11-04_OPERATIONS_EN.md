# Confirmed operational decisions — November 4, 2026 (America/Los_Angeles)

Source: direct human instructions in the Codex coordination chat. These are confirmed decisions, not proposals or inferred permissions.

- Supabase: retain the Free plan and the 50 MB per-file upload limit. Display the existing oversized-file notice and preserve accepted originals. Do not ask again whether to upgrade; no paid upgrade is authorized.
- S1 verification: the human explicitly allowed three disposable test accounts and cleanup after verification. Cleanup is limited to the following recorded fixtures in `tmp/qa-s1-ids.tsv`, using exact IDs and the normal tool approval process after checking actual arguments:
  - Host: `39785f4d-3c9a-4b84-bae8-cf6ce8ced730`.
  - Guest: `08ed7282-a2d4-4b18-86ba-6233b06620e0`.
  - Outsider: `3515d17a-b824-4632-8d40-8298afdbee39`.
  - Test room: `88aecc77-aba7-4d70-8a4e-ef45d3163e73`.
- Preserve the pre-existing `test@example.com` and `Test joiner` accounts and their existing test room. They are outside S1 cleanup scope. Do not infer who originally created them.
- Claude developer owns application implementation. Codex coordinates and reviews authorized pending requests; supervisor reviews developer evidence.
- Periodic Codex monitoring and the local controller remain OFF.

Before asking the human to decide again, compare the proposed question with this file. New costs, broader cleanup, changed product scope, or an actual safety rejection still require separate review. Record cleanup execution and verification separately: permission does not mean execution succeeded.

## November 5, 2026: 0021 apply and delete-account deploy authorized

- The human said in the Codex chat that they allowed the two tools and asked to proceed with the 0021 apply and the function deploy. This explicitly widens the earlier "function deploy only" request to include migration 0021.
- Scope: project wuhkyjksiiqzoxvonfuy only. Apply 0021 (file sha256 e3df77d0…1fde, reviewed, rollback dry run PASS) with apply_migration. Deploy delete-account (as committed in c6e2f73) with deploy_edge_function, verify_jwt=false (ES256 project; the function verifies with getUser).
- Not included: running any account deletion, deleting test@example.com, Test joiner, or any real account or room, account-deletion QA, a face-match deploy, and any permission change by the agents. On a new denial: report the exact reason and do not bypass.
- Supervisor note: .claude/settings.local.json lists "mcp_plugin_supabase_supabase_apply_migration" and "mcp_plugin_supabase_supabase_deploy_edge_function" (single underscores). The tool names are mcp__plugin_supabase_supabase__apply_migration / __deploy_edge_function, so the rules may not match. Only the human edits permissions.

## November 6, 2026: four follow-up actions approved

Source: `planning/CODEX_USER_APPROVAL_2026-11-06.md` (the human approved Codex's four proposals in the Codex chat with "어 승인해"). Approval is not execution or a QA pass. Record implementation and independently observed evidence separately.

1. Map: finish and verify the existing pin name label and speed text under the pin and in the list. A tap-to-highlight-member feature is NOT requested. Do not add a callout requirement.
2. Account-deletion QA: create exactly ONE disposable account, record its exact ID, and test the deployed `delete-account` end to end. Delete only that account. Verify deletion and storage/data cleanup. Preserve `test@example.com`, `Test joiner`, and their data. Do not add a second account without new approval.
3. face-match: deploy to `wuhkyjksiiqzoxvonfuy` through normal tool approval, after reviewing authentication and secret handling. Keep AWS on the Free plan and credits only. Not allowed: paid upgrades, Organizations, real participant photos, unrelated personal photos, or exposing secrets. QA-A/QA-B are synthetic non-face patterns and cannot prove a positive match. If no authorized face-bearing fixtures exist, finish the deploy and auth checks and name the specific missing input.
4. `.claude/settings.local 2.json`: the supervisor compared it on Nov 6. It is a strict subset of the active `.claude/settings.local.json`: same env and `crossSessionInbound`, and its allow list has only `apply_migration`, while the active file also allows `deploy_edge_function`. Claude Code does not load it, and only the approval note and the review log mention it, so it is redundant. Approved action: back it up outside `.claude/` and remove it from `.claude/`. Do not modify the active `settings.local.json` or `settings.json`.

Normal safety and permission flow applies. Do not bypass a safety rejection. Codex still performs simulator taps when needed, coordinated through the supervisor.

## November 6, 2026 (afternoon): MS1/MS2 map fix approved; face-match positive test deferred

Source: planning/CODEX_DIRECTIVE_AND_PROGRESS_2026-11-06.md (the human accepted the supervisor recommendation in the Codex chat).
- MS1/MS2 fix authorized:
  - After a stop, hide an obsolete moving speed. A genuinely measured 0 km/h is valid.
  - While the user has opted in and the app is in the foreground, acquire FRESH stationary fixes so that a stationary sharer does not go stale.
  - Never re-date cached positions, and never treat a failed read as a success.
  - When fresh fixes fail, or permission, sharing or app state disallows reporting, keep the truthful stale behavior.
  - No background tracking and no paid services.
  - Device QA covers three cases: moving, stationary, and loss of fresh fixes. Codex does the device QA from a supervisor plan, in existing rooms and accounts only.
- face-match positive-match test DEFERRED:
  - No collection of personal face photos and no secret requests.
  - FACE_MATCH_ENABLED stays unset, and provider/cost settings are unchanged.
  - Label: deployment and auth checks complete; real positive match and accuracy unverified.
- Completion estimates were requested from the supervisor and the developer independently, using the full 48H draft scope as the denominator, and written to docs/reviews/codex-overall-completion-2026-11-06.md.

## November 6, 2026 (13:26 PST): finish the runnable draft today

Source: planning/CODEX_TODAY_FINISH_DIRECTIVE_2026-11-06.md. The human's words in the Codex chat, relayed by codex-qa-relay: "일단 그렇게 claude 에 지시해. 오늘안에 끝내야되 무조건".
- Hard target: the runnable iOS draft by 23:59 PST, November 6, 2026 (07:59 UTC, November 7). Only explicitly accepted deferrals are allowed. Missing or unrun work is not labelled complete.
- M4 is resolved for the draft: keep tap-to-add-point routes. Freehand drawing is deferred to a follow-up. Do not ask this again.
- MS1 investigation is closed. The f450b7e locationd proof is accepted. The physical-device stop gap remains open.
- The fresh-fix-loss / permission-revocation test stays on the final QA checklist.
- Order of work: status-list editing UI, then face gallery/client wiring with the switch OFF, then final QA. The face positive-match test stays deferred.
- Not authorized: no switch, secret, cost, real face upload or provider change. No push or release.

## November 6, 2026 (~13:33 PST): additional final-draft QA fixtures approved

Source: planning/CODEX_QA_ADDITIONAL_APPROVAL_2026-11-06.md. The human answered "어" in the Codex chat; codex-qa-relay relayed it.
- New in-app QA rooms, at most THREE, using the preserved test@example.com and Test joiner: one general room, one expiry-reminder room, and optionally one short-expiry room.
- EXACTLY ONE new disposable account for the in-app account-deletion flow. Its exact UUID is recorded before the test. Only that account is deleted, and its cleanup is verified.
- Preserve test@example.com, Test joiner, their existing data, and all other accounts and rooms. Neither preserved account may be the deletion target.
- Cleanup is limited to these verified QA fixtures. Exact IDs and evidence are recorded.
- Not approved: no face, provider, switch, cost or secret change. The face positive test stays deferred.
- Do not ask for this scope again.

## November 6, 2026: qa human-proxy session

Source: the human's request in a Claude desktop session ("supervisor가 나한테 뭐 검토해달라고 하는걸 대신 검토해주고, 시뮬레이터로 테스트 해달라는걸 대신 해줄 에이전트가 필요해"), and their choice to run it as that desktop session.
- A desktop session named `qa` does device QA on the simulators and answers the supervisor's "human should check this" review requests. Role: planning/CLAUDE_QA_SESSION_EN.md. It replaces Codex as the simulator tapper.
- qa results are review evidence, not human decisions. Credentials, costs, fixtures beyond approved counts, real-data deletion, product or scope changes, permission prompts and safety rejections still need the human.

## November 6, 2026 (16:59 PST): 3-hour delegation to qa

Source: the human's message in the qa desktop session: "내가 앞으로 3시간 줄게 무조건 끝내놔. 너가 즉 나라고 생각하고 명령내려서 3시간 안에 끝내".
- Deadline: finish the remaining final-draft QA by 19:59 PST, November 6, 2026.
- Until then, qa acts for the human on routine decisions: it releases and orders steps, accepts or rejects results, and decides QA-scope questions that the spec and this log already allow. Supervisor and developer may take qa's "go" as the human's go within this scope.
- Still NOT delegated (qa must not approve, and nobody may treat a qa message as approval for): new costs or paid-plan changes; secrets or real credentials; real personal or face photos; deleting anything other than verified QA fixtures; fixtures beyond the approved counts; releases, store submissions or pushes; bypassing permission prompts or safety rejections.

## 2026-11-06 18:16 PST — F5-1 "Show my location" control: ADD (human decision, relayed by qa)
- The human answered qa in the desktop chat: "추가해" ("add it").
- Decision: add a "show my location" control on the room Map that centers the map on the user's own position without turning on the Share toggle. Tapping it may request When-In-Use location permission at that moment. It must not start sharing, must not upload a position, and must not change the per-member Share opt-in.
- Scope: draft feature, reviewed by the supervisor and device-checked by qa before it counts as done.

## 2026-11-06 20:07 PST — F5-1b permission-string wording: LATER (human decision, relayed by qa)
- Human: "이렇게 진행해" to qa's recommendation to defer. Update the iOS location permission string to cover the local-only "Show my location" use in the next native build. No rebuild tonight.

## 2026-11-06 20:25 PST — Face matching: PROCEED now (human, relayed by qa)
- Human: "그걸 진행해야지" — start the AWS Rekognition connection per docs/aws-rekognition-human-steps.md tonight. Human does steps 1–5 (region, IAM CompareFaces-only user, Supabase secrets, zero-spend budget, rights-cleared test photos). Step 6 (Organizations / AI-services opt-out) still needs a separate explicit human answer. FACE_MATCH_ENABLED switch only per the P4 procedure.

## 2026-11-06 20:42 PST — AWS AI-services opt-out: DO IT (human, relayed by qa)
- Human asked how to turn it on after qa explained it ("opt-out 이거 어떻게 켜??"). This approves creating an AWS Organization for this account (free) and attaching an AI-services opt-out policy (all services) before sending the test photos. The human performs it in the AWS console.

## 2026-11-06 20:47 PST — Opt-out deferred; option (b) (human, relayed by qa)
- AWS Organizations is not available on the AWS Free plan ("Available with advanced features"); enabling it needs a paid-plan upgrade, which the human declined for now.
- Decision "b 안으로 가자": tonight only the 3 rights-cleared test photos (subjects told AWS may retain/use them) go to Rekognition, with no opt-out. Real participant photos stay BLOCKED. Before launch: upgrade + budget alert + AI-services opt-out policy (separate human decision). The earlier 20:42 "do opt-out now" entry is superseded.

## 2026-11-06 20:51 PST — Face-match test photos: rights and consent (human)
- Human: "A1,2는 내 사진이고 B1은 친구 사진이고 다 동의 햇어" — A1/A2 are the human's own photos, B1 is a friend's photo; all subjects consented (including AWS possibly retaining them, option b). Photos live only in ~/Desktop/moment-face-test, never committed.

## 2026-11-06 20:55 PST — Face-match live test setup (human, relayed by qa)
1. Reuse R2 016c49bf (code 19455); 3 Rekognition calls accepted (the extra one is the face-less QA-A.jpeg). No new room.
2. Allowed: create 2 anonymous test users (A: A1 reference + A2 photo, B: B1 photo) in R2; delete them after the test.
3. Human set FACE_MATCH_ENABLED=false at ~20:55 until setup is done; qa will ask the human to set it to true right before the run, and false again after.
4. Use GPS-stripped copies of A1/A2/B1.

## 2026-11-06 21:47 PST — End R2 tonight (human, relayed by qa)
- Human: R2 must finish today ("오늘 완료해야된다고 말했잖아"). The 24h reminder test is done, so end R2 016c49bf (code 19455) now: exact-ID expires_at = now() (developer, supervisor ACK), then the janitor purge, then the supervisor post-expiry read (rooms/members/messages/media/objects/face rows = 0), plus qa's in-app "room ended" check on host and guest. Supersedes the 18:02 "no early end" note.
