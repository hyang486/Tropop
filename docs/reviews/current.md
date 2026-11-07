# Supervisor review record

Owner: supervisor session. Developer does not edit this file.
Target: November 8, 2026, America/Los_Angeles (iOS first).

## Baseline (2026-11-04)

- Human authorized actual development and supervision on 2026-11-04.
- Requirements: planning/APP_CONCEPT_KO.md (Nov 4 decisions), planning/CLAUDE_BOOTSTRAP_EN.md, role files in planning/.
- Project state at start: no Git repository, no mobile/, no docs/ other than this file, no root CLAUDE.md. Existing files: planning/, output/pdf/, scripts/, tmp/, .claude/, .gitignore, skills-lock.json, `Start Claude Team.command`.

## Checkpoint 1 — foundation: PASSED (commit b1759ce)

Reviewed 2026-11-04 against the files in the commit.

- Single repo on main. Tracked files contain no .git, .env, settings.local.json or runtime config. planning/, output/pdf, scripts/, .claude/settings.json and the vendored skill are preserved. tmp/ and .DS_Store are ignored.
- Root CLAUDE.md is concise English. Unverified commands are marked pending.
- mobile/: Expo SDK 58.0.23, RN 0.88.1, React 19.3.0, TS ~6.0.3, Expo Router (src/app), expo-dev-client. Bundle id com.iyaproject.moment, scheme `moment`. CNG with mobile/ios ignored.
- Evidence: the reported tsc/lint exit 0; `expo run:ios` Build Succeeded on iPhone 17 Pro 20541309-C36F-4864-94CA-D8A341F70EEB; Metro bundled 1285 modules; screenshot docs/evidence/checkpoint1-devclient-sim.png shows the reset template index screen. The supervisor did not rerun the build, because the shared simulator and Metro are in developer's use.
- docs/implementation-status.md and docs/plan/implementation-plan.md exist.

Non-blocking notes:
- N1: the two Xcode warnings are not itemized. List them once in the status doc.
- N2: `web.output: "server"` in app.json is template leftover. Harmless for iOS.

## Plan review notes (docs/plan/implementation-plan.md) — carried into later checkpoints

- P1 (checkpoint 2): RLS/permission tests must be committed as re-runnable SQL (e.g. supabase/tests/*.sql or a script). Ad hoc execute_sql output alone is not enough. Cover host, guest (anonymous), non-member, left member, and expired room, for read and write on every table and on storage.objects.
- P2 (checkpoint 7): the spec's Arrival is keyed to an activity. `mark_arrived(room_id)` dedup per room blocks a second activity in the same room. Key dedup by (activity_id or room, member).
- P3 (checkpoint 6): the janitor must also cover the face-refs bucket and leave-triggered face cleanup. Prove deletion through the Storage API by an object count before and after.
- P4 (checkpoint 9, CORRECTED 2026-11-04): CompareFaces creates no collection, but that does NOT mean AWS retains no input images. AWS may store and use submitted images unless an AI-services opt-out policy applies. Before real participant images are sent, check the effective opt-out and retention, and do not claim provider-side deletion from statelessness alone. Room-scoped cleanup and the enrollment_id late-result guard are still required. Source: planning/USER_DECISIONS_2026-11-04_NOTIFICATIONS_EN.md.
- P5 (checkpoint 5): large video uploads should show progress, retry and a failure state. Confirm the signed-upload approach works for files of 100 MB or more, or document the size limit.

## Checkpoint 2 — schema v1 + auth: PASSED WITH ONE REQUIRED FIX (commits fc0f1c2, b8101b6)

Reviewed 2026-11-04: migrations 0001-0004, supabase/tests/rls_test.sql, and the mobile/src auth files list.

Verified in code:
- RLS is enabled on all 18 public tables. Helpers live in the unexposed `private` schema with `search_path = ''`. Execute is revoked from public/anon and re-granted narrowly. cleanup_jobs, expiry_reminders and join_attempts are closed to clients.
- Access helpers deny on `expires_at > now()` and `deleted_at is null` at read time, independent of the janitor.
- P2 is resolved: the arrivals PK is (room_id, user_id, activity_seq), with idempotent mark_arrived.
- Late-result guard: face_matches and face_jobs FK to face_enrollments with ON DELETE CASCADE, so a late write after deletion fails on the FK. Enrollment deletion enqueues face-refs prefix cleanup, and member deletion cascades to the enrollment.
- report_location re-checks member, share, location_allowed, activity active and room open, and deletes presence when any check fails.
- Storage: both buckets are private. room-media write requires a matching media row by the uploader plus active membership. face-refs is owner-only, so the host cannot read it. Clients cannot delete objects; the janitor does.
- The client uses EXPO_PUBLIC publishable key only; no service key in mobile/src.
- Simulator auth flows reported with screenshots (guest, upgrade with the same uid, sign-in/out, session restore, sign-up). Not independently re-driven by the supervisor.

### Open findings

- F1 (required, security): `join_room` inserts the failed join_attempts row and then RAISEs, so the insert is rolled back. Failed joins are never counted, and the 10-per-10-minutes limit never triggers on the join path, which leaves the 100,000-code space brute-forceable through join_room. Fix: persist the failure without aborting (return null or a status, or check via preview first), or record attempts in an autonomous way. Add an rls_test case: 11 bad join_room calls produce the "Too many attempts" error.
- F1 RESOLVED 2026-11-04 (migration 20261104000005, remote 20261104120758, uncommitted pending human commit approval): failure returns null and the row persists; the 11th call is throttled, including for valid codes. Developer reported the new rls_test cases passing with rollback and no leftovers. Code reviewed by supervisor. The client mapping of null is still untested (no rooms UI yet).
- N4: 'This room is full.' and the throttle share errcode 54000. The client must distinguish them by message, or a distinct code should be used.
- F1b (note): a per-user limit can be bypassed by minting new anonymous users. Record the Supabase anonymous sign-in rate limit (per IP) in the status doc, or add a global or per-code limit.
- F2 RESOLVED: private.set_updated_at trigger on profiles and face_jobs.
- Human-only: Auth leaked-password protection WARN (dashboard setting).
- F3 (developer-found, cosmetic): the back title shows "welcome"; the dev-client gear overlaps (dev build only).
- N3: register_push_token re-assigns an existing token to the caller on conflict. Acceptable for device handoff; leave it as is.
- Evidence screenshot docs/evidence/checkpoint2-guest-rooms.png is uncommitted.

## Checkpoint 3b — rooms + joining: PASSED WITH NOTES (uncommitted, reviewed 2026-11-04)

Reviewed in code: migration 20261104000006, mobile/src/lib/{rooms,pending-invite,use-now}.ts, app/{index,create-room,scan,preview}.tsx, join/{index,[token]}.tsx, room/[id]/{index,invite}.tsx, the _layout and ui diffs, i18n/en.ts. Screenshots checked: checkpoint3b-room-host.png, checkpoint3b-throttle.png.

Verified in code:
- N4 RESOLVED: throttle = PT429, full = PT409, and the client maps them in toRoomError. Full-room check runs under `for update` on the room row, so concurrent joins cannot exceed max_members.
- F1 client side: join_room null maps to the "invalid" copy, and the throttle copy shows in the screenshot. Failed previews also count toward the throttle; successful previews do not.
- The invite token is 18 random bytes as hex (36 chars), which matches TOKEN_RE. parseInvite accepts only `moment://join/<token>` or a 5-digit code.
- Pending invite: held in memory only and consumed once on the Rooms screen after guest start or host auth. This matches spec 165.
- Guests see no Create button, and the server rejects create_room (42501) anyway.
- Room screen: countdown, 24h banner using the spec copy (spec 65/67), client-clock fallback to the ended state, and Leave/End with confirmation.
- Developer reported tsc and lint exit 0, rls_test passing after migration 6 with zero leftovers, and the simulator flows listed in their message. The supervisor did not re-run these.

Findings:
- F5 (required before final, not blocking 3b): spec 234 requires the host to revoke and reissue the invite code and token. This does not exist: no RPC and no UI. Add a host-only `rotate_invite(room_id)` that issues a new code (unique among active rooms) and a new token, invalidating the old ones, plus an rls_test case and an Invite-screen action.
- N5 (copy): the room header says "Deleted at <time>" (en.room.endsAt). Data deletion is done by the cleanup job after expiry; access ends at that time. Use "Ends <time>" (as in preview) until the cleanup checkpoint proves deletion timing.
- N6 (minor): preview with neither code nor token calls preview_room with code '' and records a failed attempt. Guard on the client.
- N7 (tracked): the member list refreshes only on focus. It needs Realtime updates at the chat checkpoint.
- F1b still open: a per-user throttle can be bypassed with new anonymous users. Record Supabase's anonymous sign-in per-IP rate limit in the status doc, or add a per-code or global limit.

Not verified (must not be claimed): camera QR scan (no simulator camera), full-room UI message, share sheet contents, simultaneous two-device run, physical device.

Housekeeping:
- 2026-11-04: the human authorized deletion of the two QA users (97f3ae37…, 7ccf6fd9…). The supervisor deleted them by exact UUID+email. Recheck: auth.users 0, profiles 0.
- 2026-11-04: the human authorized deleting the 3b QA data, and the supervisor deleted it by exact id. Deleted: room 4078211f… ("QA Room 3b"); host 45518f1a… (matched by email); anonymous guests ce6f848f… ("QA Guest 3b") and a8569014… ("QA Guest Two"); and their join_attempts. Recheck: rooms, members, messages, users, profiles and join_attempts all 0.
- The F1/N4 migrations (0005, 0006) and all 3b files are uncommitted, pending the human's commit approval.

### 3b fix review (2026-11-04)

- F5 CODE REVIEWED, NOT YET VERIFIED. Migration 20261104000007_rotate_invite is applied remotely. Host-only (private.is_room_host, 42501 otherwise), security definer, search_path ''. It sets a new code (via private.generate_room_code, unique across all rooms) and a new 18-byte token, and refuses ended or expired rooms (P0002). Execute is revoked from anon. Test gap: rls_test checks that the old code no longer previews, but not that the old TOKEN is rejected or that the NEW code/token preview and join. The `invite_token <> 'x'` condition proves nothing. Add those cases. The full rls_test run after migration 7 and the simulator Reissue check are pending; the run needs the human's execute_sql approval.
- F5 test gap CLOSED in code (rls_test lines 269-285). The old code and token are captured before the rotate. Old code/token: preview 0 rows, and join_room returns null. New code/token: preview 1 row. Non-member Q joins with the new code. The run itself has NOT happened: the execute_sql confirmation expired, and the run waits on the human's approval in the developer session.
- N5 RESOLVED in code: the header copy is "Ends <time>".
- N6 RESOLVED in code: no RPC call without code or token.

### Human direction relayed 2026-11-04 (after 3b)

- Full rls_test re-run: the human reports RLS TESTS PASSED, which covers the extended F5 cases. The supervisor did not see the raw output; the developer should paste it into the status doc.
- Local commits after verification, and cleanup of exactly identified QA data, are within approved scope.
- AWS connection is deferred. Face matching itself stays in scope: keep the feature and its data flow, put the provider behind an interface, and make no AWS calls.
- F1b must be closed with a source-based and a global limit, worked out with the developer. Constraints: no per-code lockout, normal group code entry and QR entry must keep working during an attack, cover preview_room and join_room, and test concurrency and failure-row persistence (no rollback).

### Human decision 2026-11-04 (supersedes "AWS deferred" above)

- Go ahead with a Rekognition CompareFaces connection check, using only test photos the team has the right to use. Stay on the AWS free plan and the existing $100 credit.
- Real participant photos stay blocked until the AI-services opt-out and retention policy are confirmed (P4).
- Without separate human approval: no AWS Organizations creation, no paid-plan upgrade, no additional payment.
- Keys go only into server secrets (Supabase Edge Function secrets). They never go into chat, the repo, app.json, or EXPO_PUBLIC_ env.
- If the keys are not connected yet, continue the implementation that does not need them, and report the exact remaining human input steps.

Supervisor acceptance for the CompareFaces check:
- The Edge Function reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_REGION from secrets. It logs no keys and no image bytes.
- The IAM principal is least-privilege: only rekognition:CompareFaces.
- Evidence: one match pair and one non-match pair from rights-cleared test photos, with similarity scores and the call count. Stored test images are deleted afterwards, and the late-result guard (enrollment_id) still applies.
- Test photos are not committed to the repo, and their source and rights are noted in the status doc.

### F1b design agreed with developer (supervisor proposal, 2026-11-04)

Threat: per-user failure limit plus free anonymous accounts. A per-code limit cannot stop one guess per distinct code, and it would let an attacker lock real rooms. So there is no per-code lock.

1. Shared gate `private.join_gate(p_kind)`, called first in both preview_room and join_room. Code path and token path are counted separately. The token path (QR, 144-bit) skips the global gate and uses only per-user and per-IP limits with a higher budget.
2. Source key: the client IP from `request.headers` x-forwarded-for, per Supabase docs (first entry). Trust must be proven empirically: send a forged `X-Forwarded-For: 1.2.3.4` through the live API and record what the function sees. If the client can choose that value, use the hop the Supabase gateway appends (or another gateway-set header) instead, and document it. Store only a salted hash of the IP, kept 24h, never the raw IP.
3. Budgets, failures only (successes never count), 10-minute window:
   - per user: 10, as today;
   - per IP: e.g. 30, to allow shared venue Wi-Fi or carrier NAT, where typos are rare.
4. Global stress mode: when global code-path failures in the window exceed G (tuned to normal traffic, e.g. 200), the code-path per-user budget drops to 1 and the per-IP budget to 5. Each guess then needs a new anonymous account, and those are capped by Supabase's anonymous sign-in limit (30/h per IP). No code is locked. Members re-opening their own room, the QR path, and users with no failures in the window keep working.
5. Concurrency: before counting, take `pg_advisory_xact_lock` on the user key and the IP key, so parallel requests cannot all pass the check.
6. A failure row is written and the function returns normally (no RAISE after the insert). PT429 is raised only before any insert.
7. HTTP method: GET runs read-only, so a failure insert would error and leak whether a code is valid without recording it. Verify that GET /rpc/preview_room and GET /rpc/join_room are rejected (volatile functions need POST); if not, mark them explicitly VOLATILE and test.
8. Write a residual-risk number into the status doc: expected time to hit any active room at N active rooms under these budgets. Note host rotate_invite and CAPTCHA on anonymous sign-in as further mitigations; enabling CAPTCHA is a human decision.

Required tests:
- rls_test: per-IP limit with a simulated header (set_config request.headers); stress mode lowers budgets; token path unaffected by stress mode; the already-member re-open path works; failure rows persist.
- Live concurrency script (curl or node with test anon users): 20 parallel bad-code join_room and 20 parallel preview_room calls from one user. Expect at most 10 non-429 results and exactly as many failure rows as non-429 results.
- The GET method check.
- Cleanup of test users by exact id.

### Commit 2ae55f7 and F5 final review (2026-11-04, supervisor after handoff)

- Commit 2ae55f7 "Checkpoint 3: rooms, joining, throttle fixes, invite reissue" contains migrations 0005, 0006 and 0007, the rls_test additions, the 3b/3c rooms UI, and the 3b/3c evidence PNGs (39 files). Secret scan of the diff (service_role, sk_, JWT-like eyJ…, AKIA, sbp_, private keys, password assignments) found no hits, and no .env or key files are tracked. The working tree has only planning/scripts/review-doc edits, no app source changes.
- F5 PASSED. Screenshots checked: checkpoint3c-invite-before.png (code 67339), -invite-after.png (code 59444, different QR), -old-link-invalid.png (invalid-invite copy), -new-code-joined.png (host plus guest listed, "Ends <time>" header, N5 confirmed). This agrees with the developer's server-side notes (rooms.code 59444, token changed, 2 failed plus 1 successful join_attempts) and with the rls_test cases. The supervisor did not re-drive the simulator.
- Observation (dev build only, non-blocking): the dev-client gear covers the room header "Invite" button.
- 3c QA data deleted by the developer by exact id; developer recheck reports 0 rows. The supervisor did not re-query.

### Checkpoint 3d — F1b join gate: PASSED WITH ONE REQUIRED FIX (uncommitted, reviewed 2026-11-04)

Reviewed in code: supabase/migrations/20261104000008_join_gate.sql (remote join_gate 20261104223409) and the F1b additions to supabase/tests/rls_test.sql (+96 lines). Evidence as reported by the developer: full rls_test PASSED with zero leftovers; live REST concurrency, 20 parallel bad join_room = 10×200 + 10×PT429, and the same for preview_room, with exactly 10 failure rows per user; GET on both RPCs = 405 PT405 with no rows written; advisors show no ERROR; the 3 probe users were deleted by exact UUID. The supervisor did not re-run these.

Verified in code:
- Shared private.join_gate (security definer, search_path '', execute revoked) runs first in both RPCs. The code and token paths are counted separately. No per-code lockout.
- Read-only transaction check raises PT405 before any lookup, which closes the unrecorded GET probe.
- Advisory xact locks, per user then per IP, in a fixed order, so there is no lock cycle. A failure row is inserted and the function returns normally, with no raise after the insert.
- PT429 is raised regardless of whether the code is valid, so there is no validity oracle while blocked. Members can still re-open their own room.
- IP trust order: cf-connecting-ip, then the last hop of sb-forwarded-for, then the last hop of x-forwarded-for, from the developer's live forged-header probe. rls_test covers a forged first XFF hop. Only an HMAC with a private salt is stored, and rows older than 24h are pruned in batches.
- Tests cover: per-IP 30 blocks a fresh user; preview is covered; the token path works on a blocked IP; another IP is unaffected; PT405 for both RPCs; 64-hex hashes only; stress mode (1 code attempt, then PT429); token path and member re-open in stress mode.

Findings:
- F6 (required, small): the per-IP key is the full address. On IPv6, one subscriber usually holds a /64 (2^64 addresses), so per-IP budgets and stress mode's per-IP 5 are bypassed by rotating source addresses. Fix: normalize IPv6 to its /64 prefix (IPv4 unchanged; handle IPv4-mapped ::ffff:a.b.c.d as IPv4) before the HMAC. Apply as a new migration (0009), since 0008 is already applied remotely. Add rls_test cases: two addresses in the same /64 share a budget, and different /64s do not.
- N8 (residual risk note): Supabase's anonymous sign-up limit is per IP, probably per full address, so the "30 guesses/h per IP" bound in the residual-risk estimate may not hold for IPv6 attackers. Mark it as unverified in the status doc. CAPTCHA on anonymous sign-in stays the real backstop (a human decision).
- N9 (product tradeoff, for the human): about 7 IPs (20 accounts × 10 failures) can push global code failures over 200 and force stress mode. Legitimate users then get 1 code try per 10 minutes. QR and members are unaffected. Suggest PT429 copy that points to QR scanning. Non-blocking.
- Not tested (accepted for now): threshold tuning under real traffic, cellular CGNAT behavior.

Commit: committing 0008 and the rls_test changes now is within the pre-approved "local commit after verification". F6 follows as migration 0009 with its own rls_test run.

- Commit 0f867a5 (2026-11-04) checked: 3 files only (migration 0008, rls_test, status doc). No secret hits. No planning/ or scripts/ files.
- N9 human decision (2026-11-04): accept the stress-mode tradeoff, and make the PT429 copy point users to QR scanning. This is now required. CAPTCHA is not decided.

- F6 PASSED (commit 5f8a0f3, migration 20261104000009_join_gate_ipv6_prefix, remote 20261104224145; reviewed 2026-11-04). private.normalize_ip: IPv6 maps to network(set_masklen(v,64)); ::ffff:0:0/96 maps to plain IPv4; IPv4 maps to host(); an unparseable value falls back to the trimmed raw string through an exception block; empty input maps to null. request_ip returns the normalized key, and execute is revoked. Commit: 3 files, no secret hits. Developer-reported: full rls_test PASSED, including the same-/64 shared budget, a different /64 not blocked, IPv4-mapped equal to IPv4, and garbage passing; zero leftovers; advisors unchanged. Not tested: a real IPv6 client through the gateway (accepted).
- N9 QR copy: NOT DONE as of 5f8a0f3. en.ts throttled is still "Too many attempts. Try again in a few minutes." The earlier relay was likely lost in the developer's handoff, so it was re-sent.

- N9 QR copy PASSED (uncommitted, reviewed 2026-11-04): the en.ts diff is the one throttled string. Screenshot docs/evidence/checkpoint3d-throttle-copy-qr.png shows the new copy on the Join room screen. Developer-reported: raw API attempt 21 returned 429 PT429; tsc/lint exit 0; temp user c3daec5e-… and its rows were deleted by exact id. The screenshot came from the token path, where "scan the QR code" is a slightly odd hint; this is acceptable because the token path is rarely throttled. The code-path UI was not separately shot; it uses the same mapping. A local commit is approved.
- N8: recorded in the status doc residual-risk section (developer-reported).

- Commit 7ad06cf (copy, status doc, evidence PNG; 3 files) checked.

## Checkpoint 4 — realtime text chat: BACKEND REVIEWED, ONE REQUIRED FIX, UI EVIDENCE PENDING (uncommitted, 2026-11-04)

Reviewed in code: migration 20261104000010_chat_text_body (check: text needs a non-blank body), mobile/src/lib/chat.ts, and the existing messages policies (0002/0003: select requires is_room_member; insert requires sender = uid, kind in text/media, membership, and own same-room media). messages is in the supabase_realtime publication.
Developer-reported, not re-run by the supervisor: full rls_test PASSED (blank, null and >4000 bodies and edits denied; F1b IP-hash asserts scoped to test users); a 3-client live supabase-js check passed 14/14 (guest→host 855 ms; outsider gets 0 realtime events, 0 REST rows, and its insert is rejected; a member who left gets 0 new events); tsc/lint 0.

Client review: client UUID for echo de-dup; INSERT subscription filtered by room_id with RLS applied per event; refetch on SUBSCRIBED and on foreground fills gaps; lte paging with id de-dup; failed sends get Retry/Discard. Acceptable.

Findings:
- F7 (required, small): messages.created_at is client-settable. The insert policy does not constrain it, and there is no trigger or column grant. A member can insert a far-future created_at that pins a message as newest forever, or backdate messages, which also breaks lte paging order. Fix: a BEFORE INSERT trigger setting new.created_at := now() (security invoker, search_path ''), or revoke insert on the column. rls_test: an insert with created_at '2099-01-01' stores now().
- N10: paging over more than 50 messages is untested. Test it at the simulator step or with a seeded script.
- Simulator UI evidence (two-sided send/receive, retry, reconnect, keyboard) is pending. agent-device was blocked by the auto-mode classifier, and the human must decide whether to allow it. The developer must not work around it.
- Fixture cleanup is pending the human's confirmation (exact ids in the status doc). The anonymous users 5eac392e… "QA Guest N9" and dfa92ecf… (40 failed join_attempts) are NOT the supervisor's. They most likely come from an earlier developer session's N9 throttle check. Developer: confirm the origin from your status doc and evidence before proposing deletion.

## Unresolved findings

- F5, F1b, F6, N9: PASSED. Checkpoint 3 is closed.
- F7 PASSED (uncommitted; migration 20261104000011_messages_server_created_at, remote 20261104232854; reviewed 2026-11-04). The BEFORE INSERT trigger runs private.set_created_at_now() (search_path '', execute revoked; trigger EXECUTE is checked at CREATE TRIGGER, not at fire time) and overwrites created_at with now(). rls_test: a 2099 created_at is stored as now(), and no future rows exist. The full run PASSED as developer-reported.
- Unknown anonymous users 5eac392e-aede-4d97-bacc-0682a94bd3e6 ("QA Guest N9", 30 failures) and dfa92ecf-71fc-4f71-aec5-9128d6d29f6a (10 failures): by timing they match the earlier developer N9 throttle-copy check (22:50–23:02 UTC, before commit 7ad06cf at 23:05). Treated as QA data, deletion pending the human.
- N10 PASSED (developer-reported): supabase/tests/chat_paging_test.sql, rolled back, seeds 130 texts with tie groups at both page boundaries and replays chat.ts paging. Every row is seen once, in order, over 3 pages; the F7 trigger is restored ('O'); residue 0. The JS merge code and UI scrolling are not covered.
- Human decisions 2026-11-04: (1) agent-device: HOLD OFF for now; the chat UI simulator evidence stays pending, and the developer must not work around the classifier denial. (2) QA cleanup: approved, all.
- Cleanup done by the supervisor 2026-11-04 (execute_sql, single transaction): rooms 799e442f-5e7c-4f7f-8999-76d6bfc1c8b3 and 4e547baf-d960-49e3-b825-68f035b9cfec; join_attempts for the 8 users; auth.users by exact id (hosts also by email moment-qa-chat-1793833906582@example.com and moment-qa-chat-1793834304149@example.com; anonymous users also by is_anonymous and null email): da0bdfb8…, 458c588b…, 53404022…, 63c579d2…, 54f82441…, 9e565893…, 5eac392e…, dfa92ecf…. A pre-check showed exactly these 8 users and 2 rooms in the database. Recheck: users, profiles, rooms, room_members, messages and join_attempts all 0. cleanup_jobs went from 4 to 8 rows (storage prefixes for the deleted rooms), waiting for the expiry worker.
- AWS human-steps doc reviewed (docs/aws-rekognition-human-steps.md): region us-east-2; IAM user without console access, inline policy with only rekognition:CompareFaces (Resource * is required, since the action has no resource-level control); keys only in Edge Function secrets; zero-spend budget alert; 3 rights-cleared photos kept outside the repo; opt-out via Organizations flagged as a separate human approval. Accepted. Relayed to the human.
- Checkpoint 4 status: backend PASSED (F7, N10); UI unverified (on hold). Committed as 4e57099 "Chat backend (UI unverified)", developer-reported to exclude planning/ and scripts/.

## Face-match scaffolding (commit 8e7e900, not deployed, no AWS calls): REVIEWED, FIXES REQUIRED BEFORE ANY DEPLOY (2026-11-04)

Reviewed: supabase/functions/face-match/index.ts (handler), the core.ts guard points, and mobile/src/lib/face.ts. Developer-reported: 11/11 offline node tests (SigV4 AWS doc vector, guard before the call and at save, secret not in the request); tsc/lint 0. Deno was not run.

OK: POST only; 503 without all three secrets; caller authenticated with getUser and limited to their own enrollments; optimistic per-row claim on attempts; FK 23503 on save treated as stale; logs carry job id and error kind only; photo-kind and ready-status check; preview image preferred.

Findings:
- F8 (required): the pre-call guard checks only that the enrollment exists. After a room expires or ends, the enrollment and jobs remain until the janitor runs, so a member's call would still send that room's photos to AWS. Before each provider call, require that the room is open (deleted_at is null and expires_at > now()), the member is still in the room, and the media is not deleted. Add a test.
- F9 (required): P4 enforcement. Once the secrets exist, the function processes any enrolled photo, including real participants'. Add a server-side switch, FACE_MATCH_ENABLED (must be 'true', otherwise 503), turn it on only for the rights-cleared test, and turn it off afterwards until the human decides on the opt-out. Record this in the status doc.
- F10 (required, verify): face.ts uploads `await (await fetch(uri)).blob()`. Supabase's React Native upload guidance uses an ArrayBuffer (base64-decoded), because RN Blob uploads can store empty or invalid bodies. Also, face.ts uses global `crypto.randomUUID()`, while chat.ts uses expo-crypto randomUUID; Hermes may not provide the global. Use expo-crypto and an ArrayBuffer, and verify the stored object size is greater than 0 when there is a UI path.
- N11: jobs are processed only when the enrolled member calls the function, so results appear when that member's app triggers it. Acceptable for this milestone; state it in the status doc and the UI copy.
- N12: an object uploaded before enroll_face fails is orphaned. The janitor should sweep face-refs objects with no enrollment that are older than about 1 hour.
- Unverified: real Rekognition responses, the Deno runtime, the similarity threshold of 90.

Design ruling, re-enroll cleanup (developer question): the trigger must queue the EXACT old ref_path on re-enroll, never the whole prefix. Prefix jobs (leave, room end) must delete only objects created before the job's created_at, so a re-joined member's new reference survives. Implement this with the janitor checkpoint. No live data is at risk until the janitor exists, since there is no worker. Add a test: re-enroll, then run the janitor; the new ref survives and the old one is gone. Open human decisions: CAPTCHA on anonymous sign-in, invite code length.
- N5, N6, N7: non-blocking.

### F8-F10 fix review (commit afaa085, 2026-11-04): PASSED (offline)

Supervisor re-ran `node --test supabase/functions/face-match/face-match.test.ts`: 14/14 pass (3 new F8 tests). Read core.ts, index.ts, face.ts and the schema.
- F8 PASSED: `enrollmentAccess` runs right before `provider.compare` and returns `room_closed` when the room is deleted or `expires_at <= now()`, `not_member` when the member row is gone. `not_member` leaves the job in place, which is consistent: face_enrollments cascades from room_members (schema comment in on_member_removed), so the job goes with it. Deleted media is a row delete (no soft delete column), so `getPhotoPath` returns null and the call is skipped.
- F9 PASSED: `FACE_MATCH_ENABLED !== 'true'` returns 503 before the secrets are read or any other work. Switch procedure is in docs/aws-rekognition-human-steps.md.
- F10 PASSED in code: ArrayBuffer body, 0-byte refusal, expo-crypto randomUUID. Stored object size > 0 remains unverified until a UI path exists.
- N13 (non-blocking): the access check runs after both Storage downloads, so a closed room still costs two downloads per job. Moving `enrollmentAccess` before the downloads (and keeping a check right before the call) would avoid that. No privacy effect: nothing leaves Supabase.
- Still not deployed, no AWS call made. Deno runtime and real Rekognition responses remain unverified.

## Human decisions recorded (planning/USER_DECISIONS_2026-11-04_NOTIFICATIONS_EN.md)

- No paid Apple Developer Program this milestone. Real APNs remote push is not a completion requirement. Room events, realtime in-app alerts with sound/haptics, arrival/status/Emergency, the 24h reminder logic and server deletion all remain required. Local notifications are allowed where verified. Any remote-delivery demo must be labeled as a demo.
- EAS login no longer blocks local development.
- Anonymous sign-ins are enabled. Developer verified this live: an anonymous session saw no rooms, and create_room returned 42501 "Host account required".
- Confirm email: the decisions file says the human switched it OFF (03:23 screenshot), and the endpoint reports mailer_autoconfirm=true, which is consistent. Developer's message calling it "not decided" understates the file.
- Face API: the decisions file records that the human accepted AWS Rekognition and is preparing credentials. Developer's message calling it "only proposed" understates the file. There is no spending authorization beyond that. Secrets must not go in chat or in the bundle.

## Human-only items (tracked)

1. AWS credentials for Rekognition (human preparing), plus a review of the AI-services opt-out before real participant images are used.
2. Physical iPhone for device checks (optional; remote push no longer required).

## Next check

Checkpoint 3b reviewed (see above). Next: the developer's next checkpoint, plus F5/F1b/N5/N6 fixes. Historical note follows. Reported, not yet reviewed: migrations core_schema, access_and_rpcs, policy_perf_and_fk_indexes applied remotely; supabase/tests/rls_test.sql reported as passing with a clean rollback. Still pending: advisors, storage buckets/RLS, commit, app auth screens. When reviewing, check the private helper functions (security definer, search_path, not exposed), arrival dedup per P2, and RLS coverage for left and expired members.

## Checkpoint 6 — janitor (migrations 0012, 0013, room-janitor function): CODE REVIEWED, LIVE EVIDENCE PENDING (2026-11-04)

Process note: 0012 and 0013 were applied remotely and room-janitor was deployed (verify_jwt=false) by a cleared developer session before any report. The developer flagged this. Applying migrations to the dev project was already established practice, so the supervisor accepts the applied state after checking it. From now on, report before any remote write that deletes data or adds a schedule.

Supervisor read-only check of the remote project: 0 cron jobs; 0 rooms; 0 room-media and 0 face-refs objects; 0 enrollments; 8 unverified cleanup_jobs (left from earlier test deletions); anon and authenticated cannot execute janitor_secret_ok; room-janitor ACTIVE v1, verify_jwt=false; face-match not deployed. A janitor run now cannot delete any room or object that is not test data.

Reviewed code: 0012 (exact old ref_path on re-enroll through the transaction-local app.face_reenroll flag; created_at refreshed on conflict), 0013 (secret in private.janitor_config, pg_net invocation, no schedule), core.ts `deletable` (exact-path jobs delete one object; face-refs prefix jobs delete only objects created at or before the job's created_at; room-media prefix jobs delete everything, since the room is gone), and index.ts (401 unless the secret matches; recursive listing; verification by a second Storage API listing).

Findings:
- J1 (required before a cron schedule): failing cleanup jobs retry forever, and claimCleanupJobs takes the 50 oldest unverified jobs. 50 permanently failing jobs would block every newer job. Order by attempts and then created_at (or add backoff), and make repeated failures visible.
- J2 (required before a cron schedule): invoke_janitor does not check the response. State how a failed run is detected (for example net._http_response status) and record it in the status doc.
- N14: the remote migration versions (20261105034706, 20261105034837, ...) do not match the local file names. Record the mapping in the status doc.
- N15: the orphan sweep lists the whole face-refs bucket on every run. Acceptable at this scale.
- Pending evidence: items 1-4 (re-enroll test, cutoff rule, Storage API object counts before and after a real run for both buckets, orphan sweep), from a rolled-back SQL test plus one manual invocation on test data. Clean up the test data by exact ID.

### Janitor first live run (2026-11-05 03:55 UTC, developer-reported, supervisor spot-checked)

Developer-reported: cleanup_enqueue_test.sql ran remotely and ended in ROLLBACK with all tests passed. Then one manual pg_net invocation on 2 test rooms: roomsDeleted 1, jobsVerified 13, jobsRetrying 0, objectsRemoved 6, orphansRemoved 1. Storage API per-job counts: room-media 3→0, face-refs (expired room) 1→0, live-room user prefix 5→3 (the old ref and an object older than the cutoff were removed; ref-new and newer objects were kept). Orphan sweep removed the >1 h orphan and kept the recent one. Test users and rooms were removed by exact ID.

Supervisor read-only check afterwards: net._http_response id 1 status 200; 0 users, rooms, media, enrollments, cron jobs; 2 face-refs test objects left (ref-new, orphan-recent, created 03:53:57-58) under the deleted test room; 3 unverified jobs for that room (room_deleted x2, face_enrollment_deleted), attempts 0. This matches the report.

Verdict: items 1-4 PASSED for the prefix cutoff, the room-media deletion, the orphan sweep and the re-enroll enqueue (SQL). N16: the live exact-path deletion was not exercised (the prefix job removed the file first); it is covered only by the offline unit test. Re-check it when the face enrollment UI exists. A second invocation is approved to clear the leftovers (deleting storage.objects by SQL is not allowed). J1 and J2 are still required before a cron schedule.

### Janitor run 2, J1/J2 review (commit f83deae, 2026-11-05)

Run 2 (developer-reported: response id 2, HTTP 200, jobsVerified 3, objectsRemoved 2; 0 objects in both buckets, 0 unverified jobs, 0 cron). Leftovers cleared. Janitor live evidence: PASSED.
- J1 PASSED in code: claims ordered by attempts, then created_at; jobsStuck counted at 5 or more failures, logged with the job id only; unit test shows a stuck job does not block a newer one (developer-reported 6/6). Not deployed yet.
- J2 (0014, not applied): it records the request id and reports ok/failed/pending/missing_response with no client access. Finding J2a (fix before applying, cheap): pg_net deletes net._http_response rows after about 6 hours by default, so any older successful run would show as missing_response, a false alarm. Either copy status_code/error into janitor_runs once a response is seen, or report only runs from the last few hours. The health check must not turn old successful runs into failures.
- Approved, in order: fix J2a; apply 0014; run janitor_health_test.sql (ROLLBACK); redeploy room-janitor v2; one manual v2 run that janitor_health reports as 'ok'. Then the cron schedule (every 15 minutes, calling private.invoke_janitor()) may be created without another round-trip. Report the job definition and the first scheduled run's health row.
- Workflow: planning/48H_DRAFT_PROPOSAL_EN.md (marked human-approved 2026-11-04) is noted. The supervisor blocks only on security, data-loss or functional failures, and never waives membership or deletion correctness.

### J2a, 0014 apply, v2 deploy (commit 1c37c9b, 2026-11-05): PASSED; cron BLOCKED on the human

Developer-reported: janitor_health_test.sql passed with ROLLBACK (ok/failed/missing_response/pending/unknown_expired; a captured run still reads ok after the pg_net TTL; authenticated denied). Supervisor read-only check: room-janitor is version 2, ACTIVE; janitor_health shows request 3 as ok, HTTP 200, stuck_jobs 0; cron.job is empty.
J1 and J2 are closed. The cron.schedule call was denied by the Claude Code auto-mode classifier ("Account & Standing-Rule Changes"). The supervisor will not run it in its place. It needs the human: approve it for the developer, or run it in the Supabase SQL editor:
  select cron.schedule('room-janitor', '*/15 * * * *', 'select private.invoke_janitor()');
Until a schedule exists, expired rooms are denied at read time but their data is not deleted automatically. This is a functional gap for the expiry requirement.

## Human evidence, cron and chat UI (2026-11-05, relayed by the Codex coordinator with the human's approval)

- Cron: the human ran cron.schedule in the Supabase SQL Editor. Supervisor read-only check: cron.job jobid 1 'room-janitor', '*/15 * * * *', 'select private.invoke_janitor()', active. Runs at 04:30 and 04:45 UTC succeeded; janitor_health requests 4 and 5 are ok, HTTP 200, stuck_jobs 0. Expiry deletion: PASSED (scheduled).
- Chat UI, human-verified on iPhone 17 (host) and iPhone 17 Pro (guest): messages were delivered in both directions. This is PARTIAL. It does not mean the whole docs/evidence/chat-ui-checklist.md passed; the other items are still unverified.
- U1 (functional, required): on both devices, the "Ends in" strip and the expiry banner render behind the status bar and the native header. Room index.tsx puts the strip at the top of the content with title '' and no header inset handling. Fix the layout so the content starts below the header (for example, use the header height or the iOS 26 scroll-edge behavior properly), and confirm with a screenshot in docs/evidence/.
- U2 (functional copy, required): the banner title is the fixed string 'Room ends in 24 hours' (en.room.reminderTitle). The banner shows whenever less than REMINDER_WINDOW_MS (24 h) remains, so with 2 h left the title is wrong. Use the actual remaining time, or a time-neutral title.
- U3 (required, session correctness): a guest join failed with room_members_user_id_fkey. The likely cause: the app restored a cached session for an auth user that no longer exists (test accounts were deleted). auth.tsx trusts getSession() at startup without checking with the server. On startup, confirm the user with getUser(). If the user no longer exists, sign out locally and return to welcome. Also map a 23503 from join to a "sign in again" message instead of a raw error. The human worked around it by signing out and creating a new guest.
- Codex reverted its own temporary edits (paddingTop/headerTransparent, reminderTitle) and committed nothing. The uncommitted developer changes in mobile/ are kept.

### U1-U3 checkpoint (uncommitted, developer-reported 2026-11-05)

- U1 PASSED on iPhone 17 Pro (keyboard closed): docs/evidence/chat-banner-fixed-17pro.png shows "Ends in 2h 15m" and the banner below the native header. The fix measures where the root actually starts and pads by the overlap. Still unverified: keyboard open with the input bar, and the iPhone 17 screen.
- U2 PASSED: the title is now 'Room ends soon'; the body uses the real remaining time.
- U3 IMPLEMENTED-UNVERIFIED: verifyAccount() runs getUser() after the session restores; join maps 23503 to an 'account' error with a sign-in-again message. Valid sessions on both simulators stayed signed in after a reload. The deleted-account path was not exercised.
- U3a (required, irreversible-loss risk): isAccountGone treats ANY AuthApiError with status 401/403/404, and bad_jwt, as "account gone" and signs out locally. A guest is an anonymous user with no way to sign back in, so a false positive permanently loses the guest's identity and room memberships. Expired or skewed JWTs (for example after a failed refresh) return 401/403 bad_jwt for an account that still exists. Sign out only on user_not_found (or on a 403 that persists after one successful refreshSession()); treat everything else as 'unknown'. Add a unit test for the classifier.
- Metro root cause (CI=1 disables file watching) noted.
- U3a PASSED in code (2026-11-05): mobile/src/lib/account-check.ts signs out only on user_not_found, or on refresh_token_not_found/session_not_found/user_not_found after one refresh. Everything else keeps the session. Supervisor re-ran node --test tests/account-check.test.mjs: 10/10. Live "gone" path: BLOCKED on the human, who must approve deleting throwaway anonymous user cabb68d7-5c56-4f47-a1ac-1a1a519ceeda by exact ID. Until then that user remains in auth.users. The supervisor will not run the delete for the developer.

## Media checkpoint (commit 7f3a453, media scaffolding + U1-U3, 2026-11-05): CODE REVIEWED, DEVICE FLOW UNVERIFIED

Reviewed: migration 0015 media_integrity (supervisor confirmed it is applied remotely: content_sha256 column, media_integrity trigger, room-media file_size_limit 52428800) and mobile/src/lib/media.ts (upload and download paths).
OK: 'ready' requires a nonzero original object in Storage, and the server copies size_bytes from Storage, which closes F10's server side. Paths are confined to {room}/{media}/. Ready rows and their originals are frozen (can_write_room_media requires status <> 'ready'). Originals are not recompressed (passthrough picker, quality 1, native file upload); only the preview is a 0.7 JPEG. Download goes through the authenticated Storage endpoint (RLS on membership and open room) and checks size + SHA-256, deleting a mismatched file.
Findings:
- M1 (product gap, human decision): the per-file limit is 50 MB, the Supabase Free plan's global cap. Many iPhone original videos are larger, so "original media sharing" is limited for video. Options: Pro plan (higher limit, paid) or document the limit in the UI. The client rejects oversize files before upload with a clear message; confirm the copy.
- M2 (non-blocking): downloaded originals live in a per-room cache folder. Clear that folder when the room ends or the user leaves, so other members' originals do not stay on the device after expiry (except what the user saved).
- Not verified: the whole device flow (pick → upload → gallery → download → save), the stored object size on a real upload, and denial for a non-member, a member who left, and an expired room through the app. The picker needs human taps (blocked on the same human UI step).
- Follow-up (commit 9a3e13b, 2026-11-05): U3 live server check PASSED. The fixture was deleted by exact ID after the human approved; the stored session got 403 user_not_found → gone. Supervisor confirmed the fixture count is 0, 2 users remain, cron is active and the last janitor run is ok. The on-device welcome notice is code-only. M1 copy accepted ("Too large to share", list of files left out; the files that fit still upload); the plan decision stays with the human. M2 PASSED in code (pruneRoomCaches after a successful room list, plus per-room clears and a full clear on sign-out or account gone). Server-side denial for an outsider, a member who left, expired and ended rooms, and a 0-byte 'ready' row is covered by media_integrity_test.sql (developer-reported PASS; supervisor read lines 150-190). Storage RLS is what the download endpoint enforces, so no HTTP-level script is required. Remaining: the device flow, waiting on human taps.

## Activity checkpoint (useRoomActivity, uncommitted, 2026-11-05)

Developer-reported: mobile/src/lib/activity.ts is complete; tsc, lint and 10/10 tests pass; it is not wired into a screen yet and has no live test. Gap: emergency_acks is not in the supabase_realtime publication. Ruling: adding it is in scope, since Emergency acknowledgement is a confirmed requirement. Approved: apply `alter publication supabase_realtime add table public.emergency_acks` as a numbered migration. The supervisor checked that the RLS select policy emergency_acks_select requires private.is_room_member on the event's room, so Realtime delivers INSERT/UPDATE rows only to members. Notes: emergency_acks has no room_id, so the client cannot filter by room in the subscription; refetch scoped to the room's open events (as the hook does). Realtime DELETE events are not RLS-filtered (they carry the primary key only), so do not rely on them for content.
Acceptance for the screen wiring: a two-session live check in which Arrived, a status change, an Emergency raised, and an acknowledgement all show on the other session; and a non-member session receives none of them.
- Follow-up (commit 1ea3928, 2026-11-05): migration 0016 adds emergency_acks to the publication and is applied live. Activity UI is wired (Arrived chip, status sheet, Emergency confirm with the copy "does not contact emergency services or turn on location", "Seen by N of M", "I see it" / "I'm OK"). Gates: tsc, lint, 10/10. Device UI and the Realtime two-session check are BLOCKED: they need new test accounts (1 email host + 2 anonymous), and the human said "no new accounts". The supervisor does not override that; it goes to the human.
- S1 (privacy, required before any external tester or TestFlight; not blocking the local draft): Postgres Changes DELETE events are not RLS-filtered and carry the primary key. room_members and member_status have PK (room_id, user_id), so any authenticated client (anonymous sign-in is open to anyone with the app) subscribed without a filter learns which user ids leave which rooms, and correlates one user across rooms. Room ids alone do not grant joining, so it is a metadata leak. Fix: move room-scoped change events off Postgres Changes onto private Broadcast channels (`room:<id>`, authorized by RLS on realtime.messages, fed by realtime.broadcast_changes triggers), at least for room_members, member_status, live_presence and arrivals. Turning status-clear into an UPDATE does not cover leave or janitor cascade deletes.
- N17: activity_seq is re-read only on focus. rooms is already published, so refetch on the room row's UPDATE.

## S1 / N17 review (commit fc55010, 2026-11-05)

Reviewed: migration 20261104000017_room_broadcast.sql, mobile/src/lib/room-channel.ts, and the chat/media/activity/room-screen diffs. Supervisor read-only live check: supabase_realtime publication has 0 tables, 10 broadcast_room_change triggers exist, and realtime.messages has only the SELECT policy room_topic_receive (no INSERT, so clients cannot publish or forge).
- S1: ACCEPTED (code + live schema). Payload is {table, op, id} only; room_members/member_status deletes carry no user_id. Receive authorization uses private.is_room_member, which also checks expires_at and deleted_at, so expired rooms stop authorizing. The client keeps one shared channel per room and refetches through RLS. The two-session live check (outsider CHANNEL_ERROR, 0 events) is developer-reported; the supervisor did not rerun it.
- N17: ACCEPTED in code. The room screen reloads on rooms/room_members notices, which updates activitySeq. Device behavior is unverified.
- N18 (low, non-blocking): when the janitor deletes an expired room, the cascade fires one realtime.send per child row (messages, media, and so on) to a topic nobody can receive any more, since is_room_member is already false. That is wasted realtime.messages inserts on large rooms. Suggested fix: in broadcast_room_change, skip when the room is missing, expired or deleted.
- N19 (accepted risk): Realtime caches the channel authorization until rejoin or token refresh, so a member who just left can still get id-only notices for a short time. Refetches are denied by RLS, so this is accepted.
- Pending: exact-ID cleanup of the S1 QA fixtures (tmp/qa-s1-ids.tsv; room 88aecc77 is still present, 5 auth users in total). This needs the human's confirmation.
- N18 follow-up (commit a3f0ff6, migration 0018 applied live): ACCEPTED. Child-table events are sent only while the parent room is live; rooms DELETE is never sent; a rooms UPDATE is sent only if the room was live before it, so the end_room and expiry transitions still reach members. Supervisor read-only live check: the function body contains the live-room guard, it is SECURITY DEFINER, 10 triggers, publication 0 tables. The extended room_broadcast_test.sql is developer-reported PASS (forced rollback); not rerun by the supervisor.
- Cleanup scope correction (developer, 2026-11-05): the S1 fixtures are exactly 3 auth users (39785f4d host, 08ed7282 guest, 3515d17a outsider) plus room 88aecc77, matching tmp/qa-s1-ids.tsv. The other 2 recent users (test@example.com at 04:25Z, "Test joiner" at 04:33Z) predate S1 and are excluded from the S1 cleanup. Their origin and status are a separate question for the human.

## Confirmed human decisions received (2026-11-05)

Source of record: planning/USER_DECISIONS_2026-11-04_OPERATIONS_EN.md (linked from planning/CLAUDE_SUPERVISOR_SESSION_EN.md and planning/handoff/supervisor-instructions.md). The supervisor read it and checked that its IDs match tmp/qa-s1-ids.tsv exactly.
1. S1 cleanup approved, limited to exact IDs: users 39785f4d…, 08ed7282…, 3515d17a… and room 88aecc77…. No other deletion.
2. The pre-existing test@example.com and "Test joiner" accounts and their room are kept. Their creator is not inferred.
3. Free plan with the 50 MB per-file limit is final. M1 is closed and no paid upgrade will be asked about again.
Relayed to the developer on 2026-11-05 with a request to acknowledge, to run and verify the cleanup, and to rewrite CURRENT_STATE.md (remove the stale no-cron, cleanup-pending and no-new-accounts lines). Developer acknowledgement: pending.
- Developer acknowledgement received (2026-11-05). (a) Read the decisions file. (b) S1 cleanup executed by exact IDs in one transaction. Supervisor's independent read-only check: S1 room 0, S1 users 0, S1 room_members 0, total auth users 2, the kept room 031bc8aa is present, and the room-janitor cron is active. VERIFIED. (c) Commit 19a2659 rewrote CURRENT_STATE.md and links the decisions file at the top; the stale no-cron, denied, needs-confirmation and no-new-accounts lines are gone. One leftover: the "Known: room activity_seq is read on screen focus only" line under "Not yet verified" is out of date since N17 (fc55010); the developer was asked to drop it.
- Media device flow, iPhone 17 Pro gallery crash (2026-11-05): the developer's diagnosis is confirmed. The installed dev builds came from a stale ios/ prebuild that was missing the picker/media-library/camera permission keys (a TCC SIGABRT). After a fresh prebuild, mobile/ios/Moment/Info.plist has NSPhotoLibraryUsageDescription, NSPhotoLibraryAddUsageDescription and NSCameraUsageDescription (supervisor read with PlistBuddy). A rebuild is in progress; the device flow is still unverified. Notes (low): (1) NSCameraUsageDescription comes from expo-camera's QR-only string, so if image-picker camera capture is ever used, merge the copy. (2) Set expo-secure-store faceIDPermission to false before TestFlight, so the plist does not declare unused Face ID access. Lesson: after any config-plugin change, prebuild again before building (CNG).
- Media run 1 (commit 80eb439, 2026-11-05): REAL errors in the human's run ("Cannot convert 0.97 to BigInt" on guest upload, "Cannot convert 100 to BigInt" on host download). Fix reviewed and ACCEPTED in code: progressFraction() converts with Number() before any arithmetic, and the File.size reads are wrapped in Number(). Supervisor grep: no other unconverted Int64 byte fields remain in src. Supervisor read-only server check for room 031bc8aa: 1 media row, status ready, size_bytes 2604768, Storage object size 2604768, content_sha256 de54fee9…2904a (matches the developer's local hashes). The bytes made it through end to end despite the progress exception. NOT yet a device pass: the human must re-run upload → live gallery → Download original with no error shown, and see the gallery tabs below the header. Note: the source was the simulator sample IMG_0002.JPG, not the 5.9 MB fixture. Room expires 07:26Z.
- Media run 2 (human re-run after 80eb439, 2026-11-05): the human reports upload, gallery and Download original all finished with no errors.
  Supervisor-verified (read-only):
  - Server: media 3afb3048-cf85-4c71-a543-f40a9117c250 in room 031bc8aa, created 06:23:43Z (after the 80eb439 commit at 06:22:57Z), status ready, size_bytes 5927272, content_sha256 f50c71d6…2b43d72e, Storage object original.jpeg size 5927272, ETag (MD5) 7f84bd7e74abe23539c5d164d3ddf00d.
  - 17 Pro (guest, source): Photos IMG_0009.JPG (5927272 B, sha f50c71d6…d72e, md5 7f84bd7e…) and the picker copy in Caches/ImagePicker (same hashes) match.
  - 17 (host): room-media cache 3afb3048….jpeg (5927272 B, same SHA-256 and MD5, written 06:23:52Z) and Photos IMG_0009.JPEG (same hashes, 06:23:52Z, which looks like the saved download).
  - The local MD5 equals the server ETag, so the stored object's bytes match.
  RESULT: byte-exact original round trip, picker → Storage → host cache → host Photos: PASS.
  Not verified (no human confirmation, no evidence): that the gallery filter tabs are clear of the header on device; that the item appeared live without a manual refresh; preview rendering; video; the oversize path on a device. The earlier row 04d2152b (IMG_0002 sample, run 1) is kept as is.

## Expiry reminder checkpoint (migration 0019, uncommitted, dry run only, 2026-11-05)

Reviewed: supabase/migrations/20261104000019_expiry_reminders.sql. Developer-reported: the dry run passed with ROLLBACK, and a read-only check found no leftovers. The supervisor did not rerun it.
Matches APP_CONCEPT_KO §"방 만료 1일 전 알림": host plus current members only, leavers excluded by having no room_members row, deleted/expired rooms skipped, per-(room, user, expiry_version) dedupe via PK, and update_room_expiry bumps expiry_version so a changed time gets one new reminder. Delivery is honestly labelled in-app/'no_token' (no APNs, per USER_DECISIONS NOTIFICATIONS). The client SELECT is limited to the user's own rows in rooms they still belong to; still no client write.
Findings:
- R1 (low): the broadcast payload carries user_ids, which goes beyond S1's minimal {table, op, id} rule. Members can already see the member list, so this is not a leak, but {table, op, expiry_version} with clients reading their own row through RLS would be cleaner. Optional.
- R2 (low, product note): a room created with less than 24 h of life gets its reminder on the first run after creation. This matches the late-joiner proposal (§68), so it is accepted; the client copy should read naturally in that case.
- R3: the client side (local notification scheduling, the in-app reminder on the broadcast, the tap-after-expiry screen in §72) was not reported. Please confirm what exists.
Ruling on the live apply: the expiry reminder is a confirmed requirement and in scope, like 0016–0018. The supervisor has no objection to applying 0019 after commit; any tool permission prompt goes to the human through the normal approval. Scheduling: a pure-SQL pg_cron job (no pg_net), e.g. `expiry-reminders` every 5 minutes calling private.send_expiry_reminders(). The human registers it, as with room-janitor; it is not re-registered and is not bundled into the janitor.
- Media gallery device observation (Codex, by the human's request, 2026-11-05): on both the host iPhone 17 and the guest iPhone 17 Pro, the All/Mine/Others tabs in the "test chat" gallery sit below the notch, status bar and navigation header with no overlap. Both screens list qa-media-photo.jpeg and IMG_0002.jpeg. Header overlap (80eb439): PASS on both devices.
  Still UNVERIFIED: live appearance without a refresh. The host gallery was opened fresh, so the items were loaded on open. A new guest upload was attempted, but Device Hub exposed no accessibility elements and the click failed with windowNotFoundAtPosition. The existing UI permission refusals are not to be bypassed.
  Migration 0019 apply and the expiry-reminders cron: NOT done or claimed by the supervisor or Codex. Their status must be confirmed separately.
- 0019 status (developer, 2026-11-05): NOT applied, NOT committed, no cron. R1 is done locally (payload {table, op, expiry_version}; realtime.send adds its own "id" key, so the test compares payload - 'id'). The R1 dry run has NOT passed yet: the first run failed only on that assertion, and the rerun's execute_sql confirmation expired without a human response. R2 accepted (the copy uses the real remaining time). R3: no client side exists. expo-notifications is not installed; there is no local scheduling, no handler for the expiry_reminders event, and no reminder-tap-after-expiry flow (the room "gone" state exists). The existing "Room ends soon" banner (U2) partly covers §67. Supervisor note: the client reminder is part of the confirmed requirement (local notifications are allowed where supported, per USER_DECISIONS NOTIFICATIONS), so the feature is not done until it exists and has been seen on a device. Cron SQL is prepared, for the human to run only after 0019 is applied: select cron.schedule('expiry-reminders', '*/5 * * * *', $$select private.send_expiry_reminders()$$);
- No-refresh live media check: the method is agreed (a new room, the host leaves Gallery > All open, the human uploads on the 17 Pro, then a host screenshot is matched to the row's created_at; no server insert, no automation bypass). "test chat" has expired, so a new room is needed.
- 0019 applied (commit 981398b, 2026-11-05). The R1 dry run (developer-reported) PASSED. Supervisor read-only check: send_expiry_reminders present, policy expiry_reminders_select_own present, 0 reminder rows, no 'expiry-reminders' cron yet, room-janitor cron active. ACCEPTED (server side). Cron registration is waiting on the human (SQL as above).
- V1 (low, process): remote migration versions are apply-time timestamps (e.g. 20261105064738 expiry_reminders), not the local filenames (20261104000019). This holds for 0014–0019. `supabase db push` or `migration list` would show them as unapplied or out of sync. Before using the CLI, align the history with `supabase migration repair` or rename the local files, and record the mapping. Not blocking now.
- expiry-reminders cron registered by the human (SQL Editor returned 4, 2026-11-05). Supervisor read-only check at 06:50:11Z: jobid 4, 'expiry-reminders', '*/5 * * * *', `select private.send_expiry_reminders()`, active, the only job with that name (not re-registered). First scheduled run: runid 11 at 06:50:00Z, succeeded. It created 2 rows for room 031bc8aa "test chat" (expires 07:26:12Z, expiry_version 1, status no_token, channel in_app): the 2 current members. Server reminder path live: PASS. Dedupe across later runs is not yet observed (expect still 2 rows after 06:55). The client display is still not built (R3). Correction: "test chat" had NOT expired at 06:50Z (it ends at 07:26Z).
- R3 client (uncommitted, 2026-11-05; developer-reported npm test 22/22, tsc and lint clean, installed on both sims). Reviewed expiry-plan.ts and expiry-reminders.ts. expo-notifications is configured with enableRemoteNotifications false; the regenerated plist has no UIBackgroundModes and the entitlements have no aps-environment, so no APNs is claimed. The design is sound: one local notification per room at expires_at - 24h; it reschedules when the expiry_version or time changes; other rooms are cancelled on the complete home sync; all are cancelled on sign-out. The in-room server broadcast is shown once per version, checked against the user's own row through RLS, with copy that uses the real remaining time. A reminder tapped before sign-in is held in memory until sign-in. The developer documents the limits honestly: a device that never opens the app gets no reminder without real push.
  Notes (low): C1, the immediate in-app notice reuses the scheduled reminder's identifier and replaces it, which is fine because it is already inside 24 h. C2, a member who is not in the room at the moment of the one-time broadcast gets no in-app notice; the U2 banner covers that. Accepted.
  Dedupe check at 06:53:47Z: only 1 cron run so far (2 rows, 0 failures), so it is not yet observable.
  NOT verified: a local notification firing on a device, the in-app notice, the tap → room/expired screen (§72). Commit is pending.
  Suggested device test: create a room whose expiry is about 24 h + 3 min away. The local reminder should fire about 3 min later on both sims, and tapping it should open the room. For §72, tap a reminder for an ended room to see the gone state.
- R3 client committed as fa7ff6d (mobile only, 14 files, including tests/expiry-plan.test.mjs); status commit 20a357a. Committed, NOT a feature pass. The device test is waiting for the human. The dedupe check is still pending: at 06:54:38Z, 1 cron run and 2 rows.

## Coordination: continue unimplemented scope (human instruction via Codex, 2026-11-05)

The human asked for development to continue independently with one day left; device checks stay IMPLEMENTED-UNVERIFIED and should not halt work. Cost changes, new product decisions and real-data risk still wait for the human. Relayed the following order to the developer:
1. Sports flow: host location toggle and Start/End activity, member opt-in foreground location with the §82 six conditions enforced server-side, Apple Maps (no key, no cost), markers with speed and a stale label, host pen route stored in rooms.route. Verified with simulated locations and RLS tests. Rejoin-consent default OFF, listed as open for the human.
2. Video gaps.
3. Profile photo, account deletion, plan preview.
4. Face stays BLOCKED.
5. Walkthrough, demo instructions, gap list.
Review gates: a checkpoint after the sports migration and tests (before the live apply), and another after the client.
Open device checks (unchanged): media no-refresh live gallery; reminder local notification / in-app notice / tap → room / §72 gone screen; activity UI; chat keyboard-open. The expiry-reminders dedupe is still to be observed.

## Sports location checkpoint review (migration 0020 + supabase/tests/sports_location_test.sql, uncommitted, 2026-11-05)

Reviewed by reading only; the supervisor did not run the test and has not seen a developer-reported result for it. Not applied, not committed.
Sound: host-only set_location_allowed / set_activity_state / set_route (is_room_host also checks deleted/expired); turning location off ends the activity, deletes positions and clears opt-ins; ending the activity does the same; opt-in is refused where the host has not allowed location; set_route validates each point type and range and keeps only {lat, lng}; presence_select now also needs the activity to be running with location allowed; leaving deletes the position (trigger on_member_removed); expired rooms are refused by report_location and hidden by is_room_member. New function grants: anon revoked. Rejoin/restart consent default OFF stays OPEN for the human (§92).
Findings:
- L1 (medium, needed before the sports feature can pass): the §82 "logout" and "device permission revoked" stop conditions have no server path. After sign-out or permission loss the member's live_presence row stays visible to others until the activity ends (only the stale label distinguishes it). Fix: on sign-out (before auth.signOut) and on permission loss, the client clears its own sharing, e.g. a new `public.stop_my_location()` that sets share_location = false and deletes live_presence for auth.uid() in all rooms (or set_share_location(false) per room). Add a test. Sign-out without network is then covered only by the stale label; say so in the status doc.
- L2 (low, cheap, before apply): a report_location that runs concurrently with set_activity_state('ended') can insert after the delete (no lock), leaving a row that becomes readable again when the activity restarts. Delete the room's live_presence rows in set_activity_state('active') as well.
- L3 (low): report_location does not sanitize speed/accuracy/heading (NaN/Infinity, heading outside 0–360 are stored); invalid lat/lng raise a check-constraint error rather than a clear 22023. Nullify non-finite values and validate coordinates explicitly.
- L4 (note): every report fires a live_presence broadcast and each member refetches, about N² reads per interval. Fine for the draft; keep the client report interval at 5 s or more with a distance filter and debounce the refetch.
- L5 (doc): the header says report_location "checks all six conditions"; device permission and logout are client-side. Keep that distinction in the status doc.
Ruling: no objection to the live apply once L2 (and preferably L3) is folded in and the ROLLBACK test passes again with its result reported. L1 may land with the client, but the sports flow is not a pass without it. Device checks stay IMPLEMENTED-UNVERIFIED.
- 0020 rework (developer checkpoint, 2026-11-05; still uncommitted and not live). Supervisor re-read the file. L2: set_activity_state('active') deletes the room's live_presence after a successful start (the idempotent already-active return skips it, which is correct). L3: report_location raises 22023 for null, NaN/±Infinity or out-of-range lat/lng, and nullifies non-finite or negative speed/accuracy and a heading outside [0,360). L1 (server side): public.stop_my_location() clears share_location in all of the caller's rooms and deletes the caller's live_presence; it is a no-op without auth.uid(); anon has no execute; report_location is also revoked from anon. The design is ACCEPTED. The ROLLBACK test has NOT passed yet (the execute_sql confirmation expired), so the live apply still waits for that PASS. L1 client wiring (before signOut and on permission loss) is still to be reviewed with the client.
- QA room "QA verification" b03236a9 (code 94673, expires 2026-11-06 21:31:42Z): the guest join preview was opened by simctl openurl (open + snapshot only). The five device checks are blocked on human taps; no other tap driver is to be used. UX note U4 (low): an expired room stays in the guest list with the subtitle "Ends in Ended" until a refresh. Filter or relabel it.
- 0020 dry run (developer-reported, 2026-11-05): 0020 with L1–L3 and sports_location_test.sql ran in one transaction on wuhkyjksiiqzoxvonfuy and returned "SPORTS LOCATION TESTS PASSED", then rolled back. The supervisor did not rerun it. ACCEPTED: commit and live apply are authorized from the review side (tool prompts still go to the human). After the apply, record the remote version mapping (V1) and run a read-only check that stop_my_location exists and anon cannot execute it. Next: the sports client, where the L1 client wiring and L4 throttling are review items.

## Device QA: room 94673 "QA verification" (Codex real CUA taps authorized by the human, 2026-11-05 13:41–13:49 PST)

Source: Codex report relayed by the human, plus the screenshots /tmp/iya-qa-{guest,host}-20261105.png (supervisor viewed them; developer copies are in docs/evidence/2026-11-05-qa-94673-activity-{guest,host}.png). Developer read-only server cross-check: join at 21:41:29Z; exactly one arrival row (21:42:21Z); the "Resting" notice at 21:42:49Z; emergency 5d365acc at 21:43:28Z; a single host ack at 21:45:59Z; no member_status row left after "I'm OK".
PASS on device (UI and server agree):
- The guest joined from the invite preview.
- Arrived: the button shows "Arrived 1:42 PM" and is disabled, so a second tap does nothing. There is one server row.
- Status "Resting": the notice appears in both chats.
- Emergency: the confirmation copy covers "not emergency services" and "location is not shared". The host sees "Test joiner needs help" and "Seen by 0 of 1", which becomes 1 of 1 after "I see it", and the guest also shows 1 of 1. After "I am OK" the banner clears and the status resets on both devices.
- Notification permission: Allow was granted on both sims.
- Chat with the keyboard open (17 Pro, software keyboard): the input and Send sit above the keyboard and do not overlap the header or the "Room ends soon" banner (the screenshot confirms it).
NOT verified:
- Actually typing and sending with the keyboard (an OS key-mapping problem; the stray draft was deleted).
- Live photo appearance without a refresh (the CUA click on the host's native-header "Photos" did not register; this is a tooling problem, not an app finding yet).
- The local reminder firing and its tap, and the duplicate-notification check.
Note: the gear overlay over "Info" in the host screenshot appears to be the CUA/simulator tool overlay, not app UI. Not recorded as a finding.
- 0020 committed as 72663d5. NOT live yet: the apply prompt expired before the human approved it, and it will be retried. Then V1 and the stop_my_location/anon check follow.
- The sports client is in progress (developer-reported): the foreground-only expo-location plugin with no UIBackgroundModes, and location-plan.ts throttling (≥5 s, 10 m, a 30 s heartbeat, stale at 60 s) with tests; npm test 33/33. It will be reviewed at its checkpoint.

## Sports client lib checkpoint (uncommitted, 2026-11-05)

Developer-reported: 0020 is live (21:51:52Z), V1 is mapped in CURRENT_STATE line 37, all 7 functions are SECURITY DEFINER with search_path '', and anon has no execute. npm test 33/33, tsc and lint clean. The supervisor did not rerun these.
Reviewed: app.json (expo-location When-In-Use only, background flags false, expo-maps), package.json (expo-location ~58.0.20, expo-maps ~58.0.11), location-plan.ts, location.ts, and the auth.tsx signOut change.
Sound:
- L1: signOut calls stopMyLocation first (best effort). Permission loss is detected at start, on a watch error, and after returning to the foreground, then calls stopMyLocation.
- L4: shouldReport waits ≥5 s, sends on a 10 m move or a 30 s heartbeat; presence refetch is debounced 1.5 s.
- Reporting runs only while the app is active.
- Consent lives in memory per run, so a server `true` not set during this run is turned off (§92 default OFF).
- The presence view is hidden while disabled.
- Apple Maps through expo-maps on iOS (no key).
Notes for the UI checkpoint (non-blocking for the lib commit):
- C1: the UI must ask for When In Use permission BEFORE setShareLocation(true). Otherwise the reporter's start check sees no permission, calls stopMyLocation, and undoes the new opt-in (and clears all rooms).
- C2: after prebuild, confirm in the generated Info.plist that NSLocationWhenInUseUsageDescription is present and there is no NSLocationAlways*, and that UIBackgroundModes has no `location`.
- C3: send() has no catch. A thrown rpc rejection becomes an unhandled promise rejection. Catch it and set 'error'.
- C4: the UI must never show a speed for a stale row (formatSpeedKmh's comment says so) and must show "Location stale" with the age.
- C5 (note): the heartbeat re-sends the last fix, so a member whose GPS stops delivering looks fresh while the position is old. This is acceptable for the draft. Optionally skip the heartbeat when the last fix is older than STALE_AFTER_MS.
- C6 (note): expo-maps on Android needs a Google Maps key. Android is follow-up; record it in the gap list.
Ruling: the lib layer is ACCEPTED for commit. The feature is not a pass until the UI exists and the device QA (permission prompt, live reporting, map markers and stale label, route, the sign-out stop) is done.
- Lib committed as 220e8c6, including the C3 catch and the C5 stale-fix heartbeat skip (developer-reported; the code was not re-read). C2 confirmed independently by a read-only grep: mobile/ios/Moment/Info.plist has NSLocationWhenInUseUsageDescription and no NSLocationAlways*, NSMotion or UIBackgroundModes key. A dev client rebuild for the "Cannot find native module ExpoLocation" device blocker is in progress (the developer owns the build). The launch is NOT verified yet.
- The rebuild launches on both sims (developer, 13:59 PST): "Cannot find native module ExpoLocation" is fixed. The supervisor viewed docs/evidence/2026-11-05-rebuild-location-launch-17pro.png: the Rooms screen shows "Test joiner (Guest)" with "QA verification · Ends in 23h 32m", no error, and the expired "test chat" is no longer listed after a cold start (U4 seen only before a refresh). Launch PASS. CUA device QA can resume on this build. C6 is in the gap list. Next is the room map screen (C1 and C4 are review items).

## Map UI checkpoint (map.tsx, room header link, en.map; uncommitted, 2026-11-05)

Developer-reported: tsc and lint are clean. Render-only evidence is the idle host map (docs/evidence/2026-11-05-map-host-17-idle.png). Read map.tsx in full and the room header diff.
Sound:
- C1: the permission is asked before setShareLocation(true).
- C4: a stale row shows no speed and "Location stale · age", and its marker is gray with a clock.
- Host-only allow toggle, Start/End with a confirmation, and route draft with Undo/Clear/Cancel/Save through set_route. Others see the saved route.
- The Map link is shown only when location is allowed or to the host.
Findings:
- M1 (medium, spec gap, APP_CONCEPT §44 "지도 표시"): markers should be the member's profile photo and show each member's speed. Today they are a generic figure.run symbol with only the name; speed appears only in the list below. Draft fix: put the speed in the marker subtitle/title (only for non-stale rows) and use initials until profile photos (scope item 3) exist. Then switch to the photo. Keep it in the gap list until done.
- M2 (medium): useLocationReporter is mounted only in map.tsx. Going back to chat stops reporting, and other members see "Location stale" after 60 s even though the app is in the foreground and the member consented. Hoist the reporter to the room level (or an app-level provider keyed by the active room) so sharing continues while the app is in the foreground.
- M3 (medium, §82 permission revoked / restart): iOS usually terminates an app when its location permission is lowered in Settings. On relaunch nothing runs stopMyLocation unless the map is opened, so the server keeps share_location=true and an old position (stale until the activity ends). Fix: call stopMyLocation() once per cold start after the session is restored. This matches the §92 OFF-after-restart default and also covers an app that is killed while sharing.
- M4 (low): APP_CONCEPT §42/§98 describe pen (freehand) input. Tap-to-add points is a simplification; label it in the gap list or add drag sampling.
- M5 (low): permissionDenied stays true after the user grants access in Settings. Re-check on returning to the foreground.
- M6 (low): with no points the map opens zoomed out to the whole world. Center on the user's own position when it is known.
CUA plan: fine. Fix M2 and M3 first; they are small. Then for step 4, expect iOS to possibly terminate the app. After relaunch the guest's row should DISAPPEAR on the host (M3) rather than only turning stale. Add a step: the guest goes back to chat during the activity, and the host row must stay fresh (M2).
- M1–M6 fixes (uncommitted; developer-reported tsc and lint clean, npm test 33/33; nothing on a device). Read location-reporters.tsx, the location.ts store diff, auth.tsx and _layout.tsx.
  Fixed: M2 (the app-level LocationReporters runs one RoomReporter per opted-in room; the map only reads the store). M3 (stopMyLocationOnLaunch is memoized after the session is restored, and an opt-in awaits it). M1 interim (initials monogram and "Name · N km/h"; a stale marker is a clock with no speed). M5 and M6. M4 stays on the gap list.
  - M7 (medium-high, must fix before commit/QA): an opt-in race. setShareLocation calls setConsent(room, true) and sends the RPC. The new consent immediately mounts a RoomReporter, and its useMyShare reload fetches room_members at once. If that read is served before the set_share_location update commits (two separate HTTP requests, so the order is not guaranteed), it sees false and runs `if (!server) setConsent(roomId, false)`. That unmounts the reporter and drops consent. The next reload (from the RPC's realtime notice) then sees server true without consent and switches sharing OFF on the server. The map's own useMyShare can do the same. The map switch would show ON while nothing is shared. Fix: keep a pending-opt-in set (added before the RPC, removed after it resolves), and never clear consent from a server `false` read while the room's opt-in is pending or the read began before it resolved. Then add a pure test for the reconcile rule.
  Otherwise the design is sound. After M7, OK to commit and run the device QA plan (start, permission prompt, live markers on both sims, leave the map while sharing, End, cold restart clears the share). Add one more QA step: toggle the share on and off quickly 3 times and confirm the final server share_location matches the switch.
- M7 fixed. The map is committed as 5288abf (developer-reported: npm test 36/36, tsc and lint clean). The supervisor re-read reconcileShare: it returns 'ignore' while a call is pending or when the consent generation changed during the read. The pending counter is per room, the generation is bumped on change and on settle (finally), stopMyLocation bumps a global generation, and useMyShare reloads when the generation changes. ACCEPTED.
  Device: both sims render the 94673 map after a cold restart (developer, 14:08 PST, no red box). Server baseline: allowed, idle, both shares false, 0 presence rows. The sports device QA has NOT run; it is waiting on human/Codex taps (start, permission prompt, live markers, leave the map while sharing, quick 3x toggle, revoke permission and relaunch, route save, End). The feature is IMPLEMENTED-UNVERIFIED until then.

## Video/upload queue checkpoint (P5; uncommitted, 2026-11-05)

Developer-reported: tsc and lint clean, npm test 43/43 (not rerun by the supervisor). Read upload-plan.ts, tests/upload-plan.test.mjs, and the media.ts, gallery.tsx, room index.tsx, auth.tsx and en.ts diffs. Checked node_modules/expo-file-system NetworkTasks.types.d.ts: UploadOptions has `signal` (abort rejects with AbortError) and `sessionType` defaulting to 'background' on iOS, so the code comment is accurate.
Sound:
- App-wide store (useSyncExternalStore), one upload at a time, FIFO; the gallery shows the room's jobs newest first; the room header shows "Photos ↑N" / red "Photos !" with an a11y label.
- applyProgress ignores late callbacks for non-uploading or removed jobs, clamps, and never moves backwards; requeue only from failed with progress reset. Tests cover these.
- Cancel: queued → removed; running → AbortController aborts the native task; abort during digest creates no row; abort after insert marks the row failed (never listed). Retry reuses id and paths (rowCreated); the 0015 trigger only locks rows already 'ready', so failed → ready is allowed.
- Sign-out and account-gone call cancelAllUploads before the session ends.
- The 50 MB limit is the final Free-plan decision (USER_DECISIONS operations), so P5's "100 MB or more" is answered by the pre-upload notice.
Notes (non-blocking):
- V1 (low): on sign-out the aborted job's `status: 'failed'` update runs asynchronously and probably after auth.signOut, so RLS rejects it silently and the row stays 'uploading'. Same end state as app termination (never listed, removed at expiry). Acceptable.
- V2 (low, gap list): with the background URLSession, if the app is terminated mid-upload iOS may still finish the transfer, leaving a full object under a non-ready row until expiry (counts toward Storage). Record next to the existing "no resume" gap.
Ruling: ACCEPTED for commit. Video is NOT a pass until device QA: pick a video → progress → leave the gallery (header shows Photos ↑1) → return; cancel mid-upload (row gone; server row 'failed'); a forced failure → Retry → same media id becomes ready; playback on the other device; Download original byte check (size + SHA-256 against content_sha256).

## 0021 profile photo + account deletion: design review (uncommitted, NOT applied, 2026-11-05)

The dry run is NOT done: the execute_sql approval expired twice while the human was away. This is design review only, and nothing here is a pass. Read 0021 in full and grepped the test, plus FKs, triggers and helpers in 0001/0002/0012.
Sound:
- The avatars bucket is private, JPEG only, 2 MB. Insert/update are owner-only through is_own_avatar_path ({uid}/{uuid}.jpg, uid = auth.uid()). Select is owner OR shares_open_room, the same as the profiles read rule. There is no client delete policy. The profile trigger rejects foreign or malformed paths (22023) and queues the replaced path by exact name. It is a display photo only and not a face reference (excluded scope respected).
- prepare_account_deletion: service_role only (the test checks authenticated and anon get 42501, and an unknown user gets 22023). It ends hosted rooms through deleted_at, so the N18 end notice is sent. It queues room-media/{room}/{media}/ for media in others' rooms (media rows have no delete trigger, so this is needed) and avatars/{uid}/. It also turns share_location off and deletes live_presence. It is idempotent on re-run (enqueue upserts).
- The cascade checks out against the FKs: rooms.host_id cascade → room_deleted trigger queues the room folders; memberships → face_enrollments trigger queues face-refs; messages.sender_id set null. The test covers the hosted-room folder queue after deleting from auth.users and checks that the sender is null.
Findings (none block a dry run):
- A1 (low): a media upload into another room between prepare and deleteUser is not queued. It is still purged with that room's folder at expiry. The Edge Function should call deleteUser right after prepare. On failure it should return an error the client can retry (prepare is idempotent).
- A2 (low, gap list): an avatar uploaded but never written to profiles.avatar_path (a crash between the two steps) stays in the folder until account deletion. Acceptable for the draft.
- A3 (test): also assert share_location=false and no live_presence row after prepare, and that the user's media row in r2 is gone after the cascade.
- A4 (Edge Function requirements): take the uid only from the verified caller JWT, never from the body. Keep the service-role key server-side only. Require an explicit in-app confirmation. After success the client clears uploads, caches, location and reminders, then signs out locally. Other devices of the same account fall into the existing account-gone path.
Ruling: the design is ACCEPTED. Commit and live apply wait until the dry run (0021 + test in one begin…rollback) PASSES with the human's approval. The supervisor will not run it on the developer's behalf.
- 0021 client + delete-account Edge Function checkpoint (uncommitted, not deployed; developer-reported tsc/lint clean, npm test 43/43). Read delete-account/index.ts, avatar.ts, the auth.tsx diff, the en.ts copy and the profile.tsx deletion wiring.
  Sound: A4 is met (POST only; the uid comes from the caller JWT via getUser and nothing from the body; the service key stays server-side; prepare is followed directly by deleteUser; prepare_failed/delete_failed are retryable). A3 test additions (developer-reported). A2 is in the gap list. The avatar is a square crop re-encoded to a 512 px JPEG with exif:false (no GPS), a new uuid path, upsert false, then the path update; Remove nulls the path so the trigger queues the old object. The confirmation copy is accurate and has a host variant. On failure the session is kept.
  - D1 (low-medium): deleteAccount skips the local location reset that signOut gets through stopMyLocation (clearConsent). The server row is cleared by prepare, but the in-memory consent survives into the next sign-in during the same run, and the M3 launch stop is memoized once per cold start. Fix: export a local-only reset (clearConsent + stop the reporters) and call it in deleteAccount and in the verifyAccount 'gone' path.
  - E1 (verify on deploy): the function reads SUPABASE_ANON_KEY, as face-match does. Neither is verified live. Confirm the env var exists for this project (the client uses a publishable key) and pick the verify_jwt setting deliberately, since the function does its own getUser.
  Ruling: ACCEPTED pending the 0021 dry run PASS (human approval), then commit, apply, deploy. Device QA with a disposable recorded account only: set/change/remove the photo (a co-member sees it, an outsider does not); delete a guest account (the room stays for others, its messages show no name, its media are gone after the janitor runs); delete a host account (its room ends for the other member). M1 avatar markers remain open.
  - D1 fixed (uncommitted). Read the diff: resetLocalLocation() bumps globalGen, clears pending and emits empty rooms and states. It is called after a successful deleteAccount and in the verifyAccount 'gone' path. ACCEPTED.
  - E1 plan accepted: before deploying, confirm SUPABASE_ANON_KEY (or fall back to getUser(jwt)) and report it. Note: if the project uses the new asymmetric JWT signing keys, gateway verify_jwt=true may reject valid tokens. In that case deploy with verify_jwt=false, which is safe because the function calls getUser itself and has no body input. Smoke test after deploy: no token → 401, and test it only with a disposable account.
  - 0021 dry run PASS: migration 0021 + account_deletion_test.sql in one begin…rollback on wuhkyjksiiqzoxvonfuy, 2026-11-05 23:17:41Z, "ACCOUNT DELETION TESTS PASSED". Codex independently checked that the SQL as run matches the local files (normalized), saw BEGIN/ROLLBACK, and read the PASS line in the tool response. The first run failed on tests-schema grants; the only change was the test's temporary-schema grant to anon, which the supervisor confirmed at test line 11 and which the anon 42501 assertion needs. The developer's post-rollback read-only check found no residue. Hashes: migration e3df77d0…1fde, test ad800326…c005.
  Ruling: 0021, the test, the client and delete-account are OK to commit. Live apply and deploy are separate steps under their own tool approval: V1 migration mapping, E1 env/verify_jwt report, and a 401 smoke test. Device QA uses disposable accounts only.
  - Committed as c6e2f73 (supervisor confirmed in git log; developer-reported tsc/lint clean, npm test 43/43). The live apply is BLOCKED: the auto-mode classifier denied apply_migration on wuhkyjksiiqzoxvonfuy as a production deploy. The developer correctly did not retry it through execute_sql and did not deploy delete-account. The supervisor will not run either. The human must decide: an allow rule for apply_migration/deploy_edge_function, or apply it themselves. Until then 0021 is NOT live and delete-account is NOT deployed, and profile photo/account deletion are NOT usable in the app.
  - M1 update: the developer reports expo-maps markers take only a monogram or an SF Symbol, so photo markers stay a gap. The avatar is shown in the member lists instead (pending review).
- Avatar member-list checkpoint (uncommitted; developer-reported tsc/lint clean, npm test 43/43, not on a device). Read components/avatar.tsx and the map.tsx diff.
  Sound: authenticated URL with the session headers; falls back to the initial when there is no path, no session or a load error (which covers the pre-0021 state and a denied read); listMembers adds only avatar_path (a 0001 column); stale/speed rules unchanged; failure handling of the photo and delete actions confirmed as reported.
  - AV1 (medium, must fix before commit): the Avatar <Image> uses expo-image's default cachePolicy ('disk'), so other members' photos persist on the device after the room ends and after sign-out. The gallery and media viewer use cachePolicy="memory" for the same reason (real deletion, room-scoped access). Set cachePolicy="memory" here too, or clear expo-image's disk cache on sign-out and room end.
  Otherwise ACCEPTED. M1 markers stay a gap.
  - AV1 fixed and committed as cd24d44 (the supervisor confirmed cachePolicy="memory" in avatar.tsx and profile.tsx in the commit). ACCEPTED.
- Coordination 2026-11-05: the developer reported no authorized independent work while 0021 apply is blocked. That is incorrect: the plan preview (48H 30–40 h row; APP_CONCEPT §48/§198/§236/§256) is not implemented; upgrade.tsx is only the guest→host account form. The developer was directed to it: a demo-only Plus plan screen (extra emoji, larger room capacity, longer expiry; price, capacity and duration shown as TBD/example), clearly labeled "Preview: no payment", with no StoreKit/IAP and no server entitlement. After that, the 40–48 h items that do not need the apply: visible error/loading states, consistent English UI, demo instructions and the remaining-gap list.
- Plus plan preview checkpoint (uncommitted; developer-reported tsc/lint clean, npm test 43/43). The supervisor viewed docs/evidence/2026-11-05-plan-preview-17pro.png and read the en.planPreview copy. The Free column matches the real limits: max_members default 30 (0001), and the expiry options top out at 7 days, the same as the server check in 0002 (5 min to 7 days). Plus values are TBD and the price is "Not set yet", so no invented numbers. The "Preview — no payment" badge, the placeholder note, and a "Get Plus" button that opens only an explanatory alert. No IAP, entitlement, server change or dependency. Matches APP_CONCEPT §48/§236/§256 (demo only, not presented as a real payment). ACCEPTED for commit. Not verified: the alert and both entry links (they need taps).
- 40–48 h polish checkpoint (uncommitted; developer-reported tsc/lint clean, npm test 43/43). Plan preview committed as 74a8a8f. Read the index.tsx, media/auth/face lib diffs and docs/DEMO.md.
  Code: the home loading indicator and the en.errors moves are fine (strings unchanged except the two noted wording edits). ACCEPTED.
  DEMO.md corrections required before commit (accuracy of verified vs unverified):
  - DM1: the Chat row says the keyboard-open layout is not verified. It WAS verified on the device (2026-11-05 13:41–13:49 run, 17 Pro screenshot). Only typing and sending with the keyboard open, and checklist steps 5–10, are unverified.
  - DM2: missing unverified items: the duplicate-notification check; gallery All/Mine/Others clear of the header (not re-seen); preview rendering; the >50 MB oversize notice on a device; sports quick 3× toggle and revoke-permission + relaunch (M3) steps.
  - DM3: add to known limits: raw Supabase/Storage error.message text still appears verbatim in some failure hints; the guest Rooms list can show an ended room as "Ends in Ended" until refresh (U4, cleared on relaunch).
  - DM1–DM3 re-checked in docs/DEMO.md (supervisor grep, 2026-11-05 after handoff): line 26 says the keyboard-open layout is verified and only typing/sending + steps 5–10 are not; lines 48/53–54 list the duplicate-notification, gallery header/preview/>50 MB and sports 3x/revoke items as unverified; lines 67–68 add raw error text and U4. ACCEPTED for commit. Commit scope: exactly mobile/src/app/index.tsx, mobile/src/i18n/en.ts, mobile/src/lib/auth.tsx, mobile/src/lib/face.ts, mobile/src/lib/media.ts, docs/DEMO.md, docs/CURRENT_STATE.md. Not yet committed at this note (HEAD 74a8a8f). 0021 live apply / delete-account deploy remain BLOCKED on the human's decision.
  - Committed as 2db6398 (supervisor confirmed: exactly the seven accepted files; developer-reported tsc/lint clean, npm test 43/43). 0021 apply/deploy still BLOCKED on the human's decision.

## M1 profile-photo map markers: assignment (2026-11-05, human request via Codex)
Assigned by the supervisor to the developer. The earlier duplicated Codex instruction was withdrawn by the human. Status: ASSIGNED, not implemented, not reviewed.
Pre-check (supervisor, installed packages): expo-maps 58.0.11 AppleMapsAnnotation has icon: SharedRefType<'image'>, text and anchor (AppleMaps.types.d.ts:290-320). So the earlier "markers take only monogram/SF Symbol" gap applies to Marker, not Annotation. expo-image 58.0.18: useImage takes an ImageSource with headers, but ImageLoadOptions has no cachePolicy, and ios/ImageLoader.swift:27-29 uses cachePolicy .disk on SDImageCache.shared.
- MK1 (blocking for commit): photos loaded by useImage persist on disk, which conflicts with AV1 (memory-only). Required: proof of a non-disk path, or Image.clearDiskCache() on room leave/end/expiry, sign-out, account deletion and the verifyAccount 'gone' path.
Other acceptance points: authenticated private-bucket load; initials fallback on no photo, error or denial; stale keeps no speed; no hooks in loops; tap parity; the gap list updated. Photo display on a device is blocked until 0021 is live (human decision). Do not bypass the classifier.
- M1 checkpoint review (uncommitted; developer-reported tsc clean, lint 0, npm test 48/48). Read marker-icons.ts, image-cache.ts, the map.tsx/location-plan.ts/media.ts/auth.tsx diffs.
  Natives the supervisor confirmed in the installed packages: AppleMapsViewiOS18.swift:171-174 draws the icon as Image(uiImage:).resizable().frame(50,50) with no clip, so square pins are a real limit. ImageModule.swift clearDiskCache = SDImageCache.shared.clearDisk. All four <Image> uses (profile, gallery, media viewer, avatar) have cachePolicy="memory", and loadAsync is used only in marker-icons, so clearing the whole disk cache is safe.
  Sound: MK1 handled by clearing the disk cache on map unmount, clearRoomCache (leave/end/isGone), clearAllRoomCaches (signOut/deleteAccount/'gone') and app launch. Auth headers are used; a failed load goes into a per-screen failed set with an initials fallback and no retry loop. Stale pins always show the grey clock with no speed and do not hold the photo. Refs come only for wanted paths of current, fresh members. There is one hook and no hooks in a loop. The title callout matches the old one. Pure logic moved to location-plan with 5 tests.
  - MK2 (low, fix before commit): a loadAsync that resolves after the map unmounts writes its disk copy after the unmount clear (and calls setLoaded on an unmounted hook). Track unmount; in then/catch after unmount skip the state update and call clearImageDiskCache() again.
  - MK3 (low, gap list): an expiry seen only through pruneRoomCaches does not clear the disk cache directly. It is covered by the map unmount and the next launch. Record it in DEMO.md.
  - Note: a transient network failure keeps initials until the map is reopened (failed set). Acceptable.
  Ruling: ACCEPTED for commit after MK2. NOT verified on a device: photo pins (0021 not live), initials/stale pins after the change, the tap callout, and whether the cache clear actually empties the disk. Evidence so far: idle map render only (2026-11-05-m1-map-17pro-idle.png, 0 presence rows).
  - MK2 fixed and MK3 recorded (DEMO.md:64); committed as e289505 with the 10 listed files (supervisor confirmed git show --stat and the unmounted guard in then/catch/cleanup; developer-reported tsc clean, lint 0, npm test 48/48). ACCEPTED. Device QA still open: photo pins (needs 0021 live), initials/stale pins, the tap callout, and the disk-cache clear.

## delete-account deploy only (human direct instruction via Codex, 2026-11-05)
Scope: deploy_edge_function for delete-account on wuhkyjksiiqzoxvonfuy through the normal approval. 0021: read-only applied/precondition check only; no apply_migration and no execute_sql writes. Assigned to the developer. Status: ASSIGNED, not run.
Supervisor pre-check: delete-account/index.ts is unchanged since the reviewed c6e2f73 (no working-tree change under supabase/). The function fails closed without 0021: the prepare_account_deletion rpc error returns 500 prepare_failed before deleteUser. Deployment does not approve any deletion; account-deletion QA is not authorized. On a denial: report the exact reason, with no bypass. On success: version/status/verify_jwt plus one no-token POST → 401.
- Result (developer report): deploy_edge_function was DENIED by the auto-mode classifier: "Reason: [Production Deploy] ... the user can add a permission rule for mcp__plugin_supabase_supabase__deploy_edge_function to their settings." The developer did not retry and sent no smoke request. Read-only: 0021 is NOT applied (the last migration is 20261105215152 sports_location). Live functions: room-janitor only (v2, ACTIVE, verify_jwt false); delete-account is absent.
  - Default secrets per the Supabase docs (existence only, no values). The JWKS shows ES256/EC (asymmetric), so the planned verify_jwt=false is accepted (the function does getUser itself; room-janitor is false too).
  - FM1 (new, medium): face-match is NOT deployed live either, so room-scoped face matching cannot work on the live project, whatever the client shows. It needs the same human deploy decision (same E1 env/verify_jwt reasoning). Any face-match "done/verified" claim must be re-checked against this.
  Status: delete-account NOT deployed, 0021 NOT applied; account deletion and profile photos are unusable. Waiting on the human: an allow rule or a manual deploy.
- 2026-11-05 human authorization (via Codex): apply 0021 + deploy delete-account, recorded in planning/USER_DECISIONS_2026-11-04_OPERATIONS_EN.md. The local 0021 sha256 still equals the dry-run hash (e3df77d0…1fde); supabase/ is unchanged since c6e2f73. Assigned to the developer. Status: ASSIGNED, not run.
- EXECUTED (2026-11-05, developer; supervisor-verified read-only at 23:49Z):
  - list_migrations ends with 20261105234900 profile_photo_and_account_deletion, a single entry. V1 mapping: local 20261104000021 → remote 20261105234900.
  - get_edge_function delete-account: id ad3d353f…, v1, ACTIVE, verify_jwt=false. The deployed index.ts equals the c6e2f73 source: getUser → 401; uid only from the JWT; prepare then deleteUser.
  - get_advisors security: prepare_account_deletion is NOT in the authenticated-executable SECURITY DEFINER list (consistent with service_role only). avatars_select/update are in the existing anonymous-sign-in lint group, the same pattern as room_media/face_refs and expected for anonymous guests. No new 0021-specific advisor issue.
  - Developer-reported only: POST without a token → 401 and GET → 405; the bucket is private, 2 MB, jpeg; policies, the trigger, and SECURITY DEFINER with search_path "". Developer also reported a first apply_migration ERROR that left no residue (the migration list confirms one entry).
  - DA1 (cosmetic): the deployed header comment still says "NOT DEPLOYED". Fix it in the next source commit; no redeploy needed for this alone.
  Status: 0021 LIVE, delete-account DEPLOYED. Device QA NOT run: profile photo set/replace/remove and co-member/outsider visibility, M1 photo pins, account deletion (guest/host). Account-deletion QA needs a human decision on disposable accounts with exact recorded IDs. face-match is still not deployed (FM1).

## Profile-photo device QA: assignment (human request via Codex, 2026-11-05)
The developer drives the devices (the human asked not to be asked for taps; Codex may also operate, coordinated through the supervisor). Seen: iPhone 17 Pro and iPhone 17 booted; Metro on 8081. Accounts: existing test@example.com and Test joiner only. Images: synthetic, non-identifying. Steps: set → co-member sees → replace (cleanup queued) → M1 photo pin and callout → remove → initials. The outsider device check is BLOCKED: both accounts share the test room, and new accounts are not approved. A rollback-only RLS simulation with a random non-member claim was planned, to run only under normal approval. Not approved: new account create/delete, face-match deploy. Status: ASSIGNED, not run.
- QA update: the developer cannot tap. Simulator.app is headless, there is no idb or cliclick, no expo-mcp, and PHPicker is unreachable. Nothing was touched. Baseline: host edeaea51 and joiner 97ed7d32 avatar_path null; 0 avatars objects; screenshots avatar-0-baseline-*. Synthetic images QA-A (f26e9168…4f61) and QA-B (53058e95…8e24) are in docs/evidence/avatar-qa/. Supervisor chose option A (Codex taps, per the human's instruction). B (expo-mcp plus a Metro restart) and C (installing idb) were rejected as out of scope. The developer does addmedia, the SELECT checks, screenshots and the rollback-only step 6.
- media added: QA-A/QA-B are in the photo library on 17 F11BA960 (host) and 17 Pro 20541309 (guest), simctl addmedia exit 0 (developer-reported). The developer has stopped device input. Codex taps steps 1–5; the developer does the checks per step.
- Codex device QA result (docs/evidence/codex-avatar-qa-progress.md, about 00:10 PT on 2026-11-06; UI observation only):
  - PASS: set QA-A → the co-member's Info shows it after reopening; replace with QA-B → the co-member sees it after reopening; M1 photo pin of the host on the guest map with the name label; stale clock pin observed; remove → initials on both. Sharing OFF and the activity ended; nothing deleted.
  - NOT PASSED: tapping a photo pin showed no callout, and no speed was observed (MK4, under investigation; a static simulated location may report no speed).
  - NOT TESTED: live avatar refresh without navigation.
  - PENDING (developer): server SELECTs plus the cleanup queue, a rollback-only outsider RLS check, a read-only disk-cache inspection of the app container, and MK4 code analysis.
- Developer checks (docs/evidence/2026-11-05-avatar-qa-developer-checks.md). ACCEPTED.
  - Server: avatar_path null. 4 avatar cleanup jobs, all purged (QA-A gone 08:00:03Z, QA-B gone 08:15:03Z). 0 objects at 08:15:29Z.
  - Outsider RLS: OBJECT variant, rollback-only, 08:14:52Z. Random sub → 0 rows; joiner → 1 row. PASS.
  - Guest disk cache: SDImageCache/default holds 0 files. PASS.
  - MK4 reclassified (supervisor checked AppleMapsViewiOS18 :135/:184/:340, map.tsx, 0020:181): SwiftUI Map has no callout and map.tsx registers no click handlers, so no tap detail is by design. "Test" with no speed is correct for a static simulated location (speed -1 → null).
  - Fix (a) assigned: comment/DEMO wording and DA1 comment. (b) tap-to-highlight is deferred to a product decision.
  - Gaps: replaced or removed objects stay readable by co-members until purge (≤15 min); remove is logged as reason 'avatar_replaced'; pin speed and live refresh without navigation are NOT verified.
- Fix (a) + DA1 committed as f34ffcc (supervisor confirmed the stat and the one-line delete-account comment diff; developer-reported tsc clean, lint 0, npm test 48/48). ACCEPTED. Live delete-account v1 differs from the repo only in that header comment. Profile-photo QA closed except pin speed and live refresh without navigation (not verified). Untracked '.claude/settings.local 2.json' (Nov 5 15:48; the older apply_migration-only variant) is left for the human; the agents don't touch permissions files.

## 2026-11-06: four approved follow-ups assigned (supervisor)

- Scope source: planning/CODEX_USER_APPROVAL_2026-11-06.md, recorded in USER_DECISIONS_2026-11-04_OPERATIONS_EN.md under "November 6".
- F1 map speed: verify that the speed text under the existing pin and in the list renders with a moving simulated location. Codex taps through the supervisor. No new highlight or callout feature. Status: ASSIGNED.
- F2 delete-account E2E: one disposable account with its exact ID recorded, then verify that auth, profile, memberships, storage avatar, and related rows are removed. Preserve the existing accounts. Status: ASSIGNED.
- F3 face-match deploy: first review authentication and secret handling (secrets must be names only, never values), then deploy with deploy_edge_function and check auth (401 or 405). QA-A/QA-B cannot prove a positive match. Name the missing face fixture. Status: ASSIGNED.
- F4 settings duplicate: the supervisor diffed it as a strict subset of the active settings.local.json, and nothing loads it. Back it up and remove it. Active files untouched. Status: ASSIGNED.
- F4 ACCEPTED (2026-11-06, supervisor checked): `.claude/settings.local 2.json` is gone from .claude/. The backup at tmp/backup/ (gitignored) is 199 B with sha256 a3e72d51…3356d. Active settings.local.json is unchanged: sha256 d5b500ec…a39d, mtime Nov 5 15:48. settings.json is unchanged (Nov 4).
- F3 review (2026-11-06): the developer's read-only review was received. The earlier "SQL error" was the handoff guard blocking the call, not a DB fault. All 3 face tables have RLS on and 0 rows, and face-refs has 0 objects. face-match is NOT deployed.
  - FM1 auth order: the switch and AWS 503 checks (index.ts:21-25) run before getUser (:30) and leak state to unauthenticated callers. Supervisor confirmed. Fix approved.
  - FM2 unbounded paid retries: stale-running retake (index.ts:47) has no attempts cap; MAX_ATTEMPTS is applied only at core.ts:116. Supervisor confirmed. Fix approved.
  - FM3: enroll_face has no throttle. Known gap, bounded by the kill switch.
  - Other gaps: no client invokes face-match; Deno test not run; no authorized face-bearing fixtures, so a positive match can't be proven.
  - Secret names can't be checked through MCP; presence of the AWS names is unverified. Deploy waits on supervisor ACK of the fix diff.
- F1 plan ACK (2026-11-06): room 94673; the guest sim moves at 5 m/s, so expect "Test joiner · 18.0 km/h" under the pin and "18.0 km/h · Updated <age>" in the row (supervisor checked location-plan.ts:71-74 and map.tsx:428-435). Queued after F3/F2. Codex does steps 1, 2 and 6 through the supervisor. NOT yet run.
- F3 fix 4d5f92f ACCEPTED (supervisor read the diff): auth now runs before the switch, and the attempts cap is a top-level AND. Nuance: the saveMatch at core.ts:110 (bad_image path, inside catch) can throw out and leave the job running; the cap bounds it to 3 claims, so it goes on the known-gap list. Deploy ACK given (switch unset, no secrets set). Mobile checks are developer-reported; the Deno test was not run. Deploy NOT yet confirmed.
- F3 deploy CONFIRMED by supervisor (list_edge_functions): face-match v1 ACTIVE, verify_jwt=false, id 2114cb00…; face tables and face-refs at 0/0/0/0 after deploy. Developer-reported smoke: no token → 401, GET → 405. The valid-JWT → 503 check moves to F2 with the disposable account (no sim session extraction). Switch and secrets untouched. Positive match is UNPROVEN: no authorized face fixtures.
- FA1 (2026-11-06, developer found it during F2): face-match v1 AND delete-account v1 rejected valid user JWTs with 401, because a lowercase global.headers authorization lost to the supabase-js API-key Authorization header. Every real account deletion would have failed. The fix is getUser(token) on the Bearer-parsed header. Supervisor reviewed the uncommitted diff: asUser is used only for getUser, and the order is unchanged. ACK for commit and v2 redeploy of both. The earlier "no token 401" smoke had masked this. Disposable F2 account: 6ff53e9a-d08d-43c1-82a0-fcc164597a0e.
- FA1 deployed in be82fd1 (developer-reported): delete-account v2 and face-match v2; smoke 401/405, and the disposable JWT gets 503 from face-match. F2 delete-account returned 200 at 08:37:40Z. Supervisor checked at 08:38Z: 6ff53e9a auth, profile and room e73a39c6 are gone; both kept auth users are present; the avatar object (1) and room-prefix jobs are queued, unverified. F2 is OPEN until the janitor confirms the avatar removal.
- F2 CLOSED, PASS (server side; supervisor checked after the 08:45Z janitor run): avatar objects under 6ff53e9a/ are 0; open cleanup_jobs are 0; a5c1dda7, c9d365df and 1c2476a9 have verified_empty_at 08:45:02-03Z. The kept accounts are present. The developer reports their per-table counts unchanged (supervisor did not count each table). Job 1a572253 was the Codex QA replace of the host avatar (edeaea51), not from F2. face-match v2 and delete-account v2 served sources were read against the repo (no byte hash). Not tested: the in-app delete-account UI flow (the call was a direct POST).
- F1: Codex steps written to docs/reviews/codex-f1-map-speed-steps.md and handed to the human for relay. The developer runs simctl only after Codex reports "Part A done".
- F1 moving: PASS (UI and server). In 2026-11-06-f1-host-moving-pin-and-row.png the supervisor saw the pin "Test joiner · 18.0 km/h" and the row "18.0 km/h · Updated just now". Server speed_mps 5 at 19:34:10Z. The route started 19:32:59Z and reached its end at about 19:37:40Z.
- F1 stationary: the server row stayed at speed_mps 5. One heartbeat at 19:38:10.89Z re-sent the cached moving fix; after that no writes, and the row was 66 s old at 19:39:17Z. Stale UI observation is pending from Codex.
  - MS1 (finding, product decision): a stopped member keeps showing the last moving speed for up to about 90 s, because the heartbeat re-sends the cached speed.
  - MS2 (finding, product decision): a stationary but still-sharing member always goes stale after about 90 s. location.ts:438 says the heartbeat exists to prevent this, but iOS (distanceInterval 10 m) sends no fixes to a still device, and the C5 guard at :373 then blocks the heartbeat. The developer calls this C4/C5 design; the supervisor sees it as contradicting the heartbeat's stated intent. Not an F1 failure. No change without a human decision.
- F1 stale: PASS. Supervisor saw 2026-11-06-f1-host-stationary-stale.png: grey clock pin, no speed, row "Location stale · 1 min ago" at 19:39:30Z. Cleanup: Codex Part C at about 19:40Z, and the supervisor read live_presence for room b03236a9 as 0 rows at 19:40:53Z. F1 ACCEPTED, pending the developer simctl clear confirmation. Timing caveat: no exact stale cutoff claimed (old speed at about 67 s, stale by about 110 s). MS1/MS2 go to the human.
- F1 CLOSED (2026-11-06): the developer ran simctl clear at 19:40:54Z. At 19:40:59Z, room b03236a9 had activity_state ended, share_location false for both members, and live_presence 0. All Nov 6 items F1-F4 are done. Open: MS1/MS2 (human decision); face-match positive match (blocked on authorized face fixtures).
- bd0cc80 (F1 close-out) checked: 10 files, CURRENT_STATE plus 8 f1 PNGs plus codex-f1-map-speed-qa.md; no code. The developer is idle. Waiting for the human on MS1/MS2 and the face fixtures.

## 2026-11-06: completion estimates and MS1/MS2 review (supervisor)

- Completion estimates for both roles are recorded in docs/reviews/codex-overall-completion-2026-11-06.md. Supervisor: implemented ~85%, verified ~55%. Developer: implemented ~89%, verified ~57%. The two largest gaps are the face-match client UI and the integrated walkthrough. M4 (freehand route vs tap points) is with the human.
- MS1/MS2 diff reviewed (uncommitted; developer reports tsc and lint clean, npm test 60/60): ACCEPTED, with MS-R1 required before commit. The fix sends no cached re-dating. Speed comes from each reading; -1 becomes null. A failed read sends nothing. The bound is 30 + 5 + 10 s, under the 60 s stale cutoff. Residual: the old speed can show for up to about 45 s after a stop.
- MS-R1: after a failed fresh read, heartbeatDue stays true, so a new getCurrentPositionAsync starts on every 5 s tick and native requests stack up. Fix: throttle attempts by the time of the last attempt.
- QA plan approved, with additions: a Case 2 timing table, an honest label if Case 3a loss is not simulated, the toggle state in Case 3b, and a room-validity and bundle check first. Not run on a device.
- MS-R1 fixed in 559233d (supervisor read the diff): freshFixAttemptDue allows at most one read start per HEARTBEAT_MS. Developer-reported: tsc and lint clean, npm test 61/61. ACCEPTED. Codex steps: docs/reviews/codex-ms-fix-steps.md. Developer is cleared for read-only setup checks only. Device QA NOT run.
- MS QA run, 21:16–21:22Z, room b03236a9 (record: docs/reviews/codex-ms-live-status.md, docs/evidence/codex-ms-fix-qa.md).
  - Case 1 (moving): PASS.
  - MS2 (stationary stays fresh): PASS. 4 post-stop writes, 35 s apart; the host never went stale.
  - MS1 (old speed hidden), natural route stop: NOT PASSED on the simulator. Speed 5 stayed in fresh writes. Supervisor reading: a likely simulator artifact, not proven yet.
  - MS1 at a fixed point: PASS on the server (null speed) and in the UI (no speed shown).
  - Case 3 (fresh-fix loss): NOT RUN.
  - MS1 on a real device: unverified.
  - Cleanup: the supervisor verified it at 21:22:40Z.
  - Next tasks assigned to the developer: the evidence commit, the speed proof, the host status-editing UI, then a face-match UI plan for review.
- c97c375 + f450b7e checked (supervisor, after handoff): docs/evidence only plus CURRENT_STATE; no code. Proof log 2026-11-06-ms-sim-speed-locationd.txt read: at the parked end of a `simctl location start` route ("No more pending locations"), locationd hands clients "speed 5.0, course -1.0" every 1 s; right after `simctl location set` the fixes read "speed -1.0". MS1 natural-stop result RECLASSIFIED: simulator artifact, PROVEN at the CoreLocation client-fix level. The app forwards the reading's own speed, as reviewed in 559233d. Still UNVERIFIED: MS1 after a real stop on a physical device; Case 3 (fresh-fix loss). Next developer task: host status-list edit UI (existing set_status_definitions RPC, no server change).

## 2026-11-06 ~13:29 PST: status editor (task 1) review
- Uncommitted diff read: status-plan.ts, status-editor.tsx, info.tsx, ui.tsx, en.ts, and the tests. Checked against set_status_definitions (0002:518, the only definition).
  - Host check, delete with `label <> all`, the char_length 1–30 rule and the lower 'emergency' skip all match the client rules. Code-point counting matches char_length.
  - The client is stricter on case-insensitive duplicates. A case rename shows as remove plus add, which the server does too; the confirm wording is correct.
  - member_status.status_id ON DELETE CASCADE (0001:85) confirms that the removal Alert is warranted.
  - ui.tsx automaticallyAdjustKeyboardInsets: chat's KeyboardAvoidingView is outside Screen (index.tsx:224), so there is no double inset.
- ACCEPTED for commit. Developer-reported: npm test 68/68, tsc and lint clean (not re-run).
- Known limits accepted for the draft: no reorder; no live refresh while Info is open; no row count cap.
- NOT verified on a device: host edit/save/remove-confirm, member read-only view, and the picker refresh in chat. These are on the final QA list.
- d512dad (status editor) committed; developer-reported: CURRENT_STATE says not on device.

## 2026-11-06 ~13:31 PST: face gallery plan (task 2) review
- Plan (10 items, client only, switch unset) checked against APP_CONCEPT_KO §40, §108–116, §272.
  - Per-room first-use enrollment with no reuse, consent before any upload, the reference kept out of the shared gallery, "Likely you" shown as an estimate, Not-me exclude, stop/remove, photos only, and server-cascade deletion all match.
  - face_matches own-select and update(excluded) grants exist (0003:43/47, 0002:162).
- ACCEPTED with these required items:
  - FG-1: the consent copy must also say that photos are compared by an external face-matching service (§115 scope).
  - FG-2: invoke face-match only while my enrollment has queued/running jobs, or right after enroll. No invoke on every chip open when nothing is pending.
  - FG-3: the disabled state must not imply a match result. Show no "Likely you" badge and no count, and keep the copy truthful ("off in this draft").
  - FG-4: after "Stop and remove", the server must verify that the face-refs object and the enrollment row are gone. The client clearing its state is not enough.
- Device QA reference image (plan item 10): allowed only as a GENERATED non-photographic pattern image added with `simctl addmedia`. No camera capture, no sample photos that may contain people, and no personal images. It applies the earlier synthetic QA-A/B rule. It runs in a human-approved new room. Withdraw must leave the face-refs objects for the room/user at 0 (supervisor reads storage).

## 2026-11-06 ~13:36 PST: face gallery diff (task 2) review
- Read face-plan.ts, face.ts, face.tsx, photos-of-me.tsx, and the gallery, media viewer and en.ts diffs. Checked against face-match index.ts:35 (503 `face_match_disabled` before any AWS work) and enroll_face (0012, which replaces the old enrollment).
- FG-1 met: the consent copy names the external service, and nothing uploads before "Agree and save".
- FG-2 met: one run right after enroll; then only when pending > 0, with a ref guard and no polling.
- FG-3 met: the disabled view shows only the notice and Manage, with no tiles, badge or count.
- FG-4: the row is deleted at once and the janitor removes the object, so the server check comes after a janitor run.
- Also met: "Not me" updates only `excluded`; the reference re-encode drops EXIF; photos only.
- ACCEPTED with one small required fix:
  - FG-R1: enrollFace leaves an orphan face-refs object if `enroll_face` fails after the upload (for example the room expired, or the user is no longer a member). Fix: best-effort `storage.remove([path])` on RPC error. If the storage policy denies owner delete, keep it as a known gap; the room-expiry janitor removes the prefix.
- Known limits accepted for the draft:
  - The run result is cached per room (lastRuns). A 'disabled' result stays until a run happens, which needs pending jobs.
  - Photos of me only sees the first 300 media (media.ts:461).
  - The camera Info.plist string is unchanged.
  - No live refresh of face tables.
- Developer-reported: tsc and lint clean, npm test 74/74 (not re-run). NOT on a device.
