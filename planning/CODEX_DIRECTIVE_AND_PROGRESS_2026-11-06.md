# Human decision and completion estimate request — 2026-11-06

The human explicitly instructed Codex to relay the recommendation accepted in this chat, and to obtain completion estimates from BOTH developer and supervisor.

## Authorized next work

1. Apply the MS1/MS2 map fix through the normal supervisor/developer workflow. Hide an obsolete moving speed after stopping (a genuinely measured 0 km/h is also valid). While the user has opted in and the app is foregrounded, acquire fresh stationary location fixes so a stationary sharer does not incorrectly go stale. Refresh timestamps only for genuinely fresh valid fixes; NEVER re-date cached positions or pretend a failed location read succeeded. If fresh fixes fail or permission/sharing/app state disallows reporting, retain truthful stale behavior and current consent controls. Review the implementation and run focused checks. Device verification must cover moving, stationary, and loss of fresh fixes. Codex can perform device QA after supervisor supplies a concrete plan and current room validity; do not create/delete rooms or accounts without existing authorization. No background tracking or paid services.
2. Defer the face-match positive-match test for now. Do not collect personal face photos or request secrets again. Keep the feature explicitly labeled: deployment/auth checks complete, real positive match and accuracy unverified. Do not enable the production switch or change provider/cost settings for this deferral.

## Completion estimates requested now

Supervisor: relay this request to developer; return each role's OWN assessment, not one number attributed to both. Preserve pending builds, handoffs, and all human unsent terminal drafts. No controller/heartbeat reactivation.

Please write responses to `docs/reviews/codex-overall-completion-2026-11-06.md` (supervisor owns it; developer sends their assessment to supervisor).

For BOTH roles independently:
- Give overall implementation completion percentage AND independently/device-verified completion percentage (or a clear uncertainty range), as of now BEFORE the newly requested map fix is completed.
- Use the FULL approved runnable-draft scope in planning/48H_DRAFT_PROPOSAL_EN.md and the current product requirements/accepted decisions. Do not use only F1–F4, commits, tests, or a narrowed feature subset as the denominator. Separate later release-only items where actually deferred by the human.
- Show the denominator: a short feature checklist with implemented/verified/missing state or transparent weights so the percentage is interpretable. Explain partial credit and what counts as done.
- List remaining mandatory draft work, bugs, device checks, blocked items, and accepted/deferred items separately. Explicitly include face-match UI wiring/positive match status, reminders and expired-room tap flows, media/file/video checks, routes/location, account/settings/plan flows as applicable. Reconcile stale historical status entries with current evidence.
- Name the top 3 steps to reach the agreed draft finish, and any real dependency on the human. Label estimates as estimates rather than measured certainty. State if earlier F1–F4 completion was only a checkpoint, not overall completion.

Please provide the estimates promptly while the map fix proceeds, without waiting for its completion. Tell Codex if fresh device QA is needed. Routine approved implementation need not await a second permission request.
