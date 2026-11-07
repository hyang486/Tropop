# Human approval: additional final-draft QA fixtures — 2026-11-06

In the Codex chat, Codex presented the concrete scope below and asked whether to approve and relay it. The human replied "어" (yes). This is explicit approval for this additional QA run, separate from the already-completed disposable account deletion in F2.

## Exact approved scope

1. Use existing test@example.com and Test joiner in the app to create/join a MAXIMUM of THREE new test rooms:
   - ONE general QA room.
   - ONE expiry-reminder QA room.
   - OPTIONALLY ONE short-expiry verification room, only if needed.
2. Create EXACTLY ONE NEW disposable account for the IN-APP account-deletion flow; record its exact UUID and identity before testing. Delete only this newly created disposable account and verify related cleanup. Do not repeat the old F2 account creation/deletion or expand the count.
3. Preserve test@example.com, Test joiner, their existing data, and all other non-test accounts/rooms. Record exact IDs and creation evidence for the new QA fixtures. Limit cleanup to these verified QA fixtures, through normal approval/safety flows, and record server/storage cleanup results.

The two preserved users may participate in the approved new QA rooms, but neither may be used as the account-deletion target. Never print passwords, JWTs or secret values. Never treat this document as authorization to bypass an action-time confirmation or a rejected tool action.

## Execution through supervisor

Record this approval in the canonical decision log and relay it to developer. Coordinate the existing app/UI QA steps with Codex directly; no human relay or repeated product approval is needed for the scope above. Keep ongoing review/implementation moving.

Update docs/reviews/codex-final-qa-steps.md Setup with the tested bundle version, exact new fixture identities, room validity and actual readiness. Write GO only after the setup is truly ready. State which approved fixture actions Codex must perform in the app versus which developer prepares; avoid creating duplicate rooms/accounts by both agents.

Notify Codex through docs/reviews/codex-final-qa-live-status.md with acknowledgement, current actual work and the next concrete app steps. Today's runnable-draft target remains November 6, 2026, 23:59 America/Los_Angeles. Actual face-positive verification stays deferred; no face/provider/switch/cost/secret change is approved here.
