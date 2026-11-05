# Current state — short resume point

Human approved the 48-hour runnable-draft delivery agreement on November 4:
planning/48H_DRAFT_PROPOSAL_EN.md. Full requirements remain in scope.
Developer owns updates to this short current state. Historical evidence remains
in docs/implementation-status.md and docs/reviews/current.md; read it on demand.

## Working / implemented
- Host auth, installed-app guest entry, room creation, invites, leave/end: basic simulator evidence exists.
- Text chat: implemented; backend/realtime/access/paging verified. Chat UI is NOT verified.
- Face scaffolding and F8–F10 fixes committed (afaa085). No verified live AWS match yet.

- Expiry worker (room-janitor v1): PASS on live test data, 2 supervised runs
  (rooms deleted, Storage objects removed and verified, orphan sweep). No cron yet.

## Active task
- J1/J2 done: 0014 janitor_health applied + tested, room-janitor v2 deployed, manual
  run health = ok. Cron schedule (supervisor-approved) was DENIED by the auto-mode
  classifier: needs the human (permission rule or run it themselves). Not scheduled.
- Media (migration 15 applied, gallery/viewer/upload code): DB tests + full RLS PASS,
  tsc/lint 0. Device upload/download NOT verified. Uncommitted.
- Chat UI (2026-11-05): two-way messages PASS (human-confirmed). U1 header/banner overlap fix
  PASS on 17 Pro with the keyboard closed (docs/evidence/chat-banner-fixed-17pro.png); keyboard-open
  and the iPhone 17 screen are unverified. U3 stale-session check (src/lib/account-check.ts, npm test
  10/10) PASS in code; the deleted-account path is live-unverified, waiting on the human to approve
  the exact-ID delete of throwaway cabb68d7-… (tmp/qa-fixtures.md). Metro must not run with CI=1
  (no file watching, stale bundle).
- U3 deleted-account path: live PASS (fixture deleted, `user_not_found` -> gone, cleanup 0 rows).
  M1/M2 committed (9a3e13b).
- Arrival/status/Emergency (2026-11-05, supervisor-approved): migration 0016 adds emergency_acks to
  supabase_realtime (applied live). src/lib/activity.ts + src/components/room-activity.tsx wired into
  the room screen (Arrived, status sheet, Emergency confirm, banner with "Seen by N of M", ack, I'm OK).
  tsc/lint/npm test PASS. Non-member RLS already covered by supabase/tests/rls_test.sql.
  Two-session Realtime check NOT done: needs a host account plus guest/outsider sessions, which means
  new test accounts (human said no new accounts; asked). Device UI unverified (taps blocked).
  Known: room activity_seq is read on screen focus only, so a host restart needs a refocus.
- Next concrete step: two-session Realtime check once accounts are approved; media device flow.
- Supervisor reviews stable checkpoints; independent approved implementation continues.

## Blockers and gaps
- agent-device: human approved the open+snapshot action again (2026-11-05) through
  /permissions. Not blanket permission: if a new rejection occurs, stop; do not bypass.
- Human screenshot confirms AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_REGION
  are already saved in Supabase Secrets (November 4). Do NOT ask to enter them
  again. Key validity/permissions and an actual CompareFaces result remain unverified.
  Live test still needs rights-cleared photos. No keys in chat.
  Keep Free plan; no Organizations creation or paid upgrade. Actual participant
  photos await retention/opt-out review. Other features continue meanwhile.
- Media, sports/status/emergency, reminders, map/route/speed and final account/plan
  flows are not yet accepted as working app features.

## Operating rules
- Screenshots: docs/evidence/. Record QA IDs when created.
- Report changed flow, verification, blocker, next step; avoid full recaps.
- Focused checks for focused changes; full RLS after relevant access/deletion changes.
- No new skills/frameworks/orchestration. Codex controller and heartbeat are OFF.
- Ordinary verified local commits and exact verified QA cleanup are authorized.
- Human decisions are not inferred from stale summaries. Preserve truthful evidence.
