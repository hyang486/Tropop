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
- Next concrete step: chat UI check. agent-device stays denied; give the human the
  two-client manual checklist (docs/evidence/chat-ui-checklist.md, awaiting the human), then media upload/download
  as a complete screen flow (6–18h window).
- Supervisor reviews stable checkpoints; independent approved implementation continues.

## Blockers and gaps
- agent-device was rejected by Claude auto-mode as external code. Do not bypass.
  Obtain normal authorization or provide a short human-assisted UI test checklist.
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
