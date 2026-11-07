# Face-match AWS connection test: plan (for supervisor review; nothing has been run)

Decision: human, 2026-11-06 20:25 PST ("proceed now"). Step 6 (AI-services opt-out): decided 20:47 PST, option (b). There is no opt-out tonight, because AWS Organizations needs a paid upgrade on the Free plan. Only the 3 rights-cleared test photos (A1, A2, B1) are ever sent. Their subjects consented, including to AWS possibly retaining them (20:51). Real participant photos stay BLOCKED until the pre-launch upgrade and opt-out. Script: `scripts/face-match-check.mjs` (supervisor ACCEPTED the script, sha 018ad87c…). Modes:
- `prepare <ROOM_CODE> <PHOTO_DIR>`: switch must be OFF. Creates anonymous users A and B, joins the room, uploads A2 and B1, enrolls A1, then probes as A (must be `503 face_match_disabled`).
- `match`: switch ON (set by the human at T1). One `face-match` call as A (one retry only on a 503 right after T1), then reads results and job attempts.
- `probe`: post-T2 check as A. Must return 503; exits non-zero (STOP) on 200.
- `list`: prints every user ID created, for exact-ID cleanup (no sign-in).

State file: OS temp dir, mode 0600, outside the repo. It holds A's and B's refresh tokens (anonymous session credentials, needed by `match`/`probe`), plus user, enrollment and media IDs. It is deleted at R6 step 12.

## Gate
Nothing below the line "Before the switch" starts until (a) supervisor ACCEPT of this plan and (b) the human says steps 1–5 are done. The developer never flips the switch without the human's explicit OK for this run (R3).

## R1 Preconditions (names only)
1. `supabase secrets list --project-ref wuhkyjksiiqzoxvonfuy | awk -F'|' 'NR>2{gsub(/ /,"",$1);print $1}'` prints names only (the CLI table also has a digest column, which is dropped by awk and never shown). Needs `supabase login`; if the CLI is not logged in, the human confirms the three names in Dashboard → Edge Functions → Secrets instead. Expected: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`; `FACE_MATCH_ENABLED` absent.
2. Region = the one the human names (default us-east-2). The value is not read; the human states it. IAM `CompareFacesOnly` and the budget alert are the human's confirmations (I cannot see AWS).

## R2 Inputs and fixtures
3. Photos: the folder the human names (outside the repo, e.g. `~/Desktop/moment-face-test/`), files `A1.jpg A2.jpg B1.jpg`, each 1 byte–5 MB. Read from disk only; never copied into the repo or docs.
4. Entry path: the real pipeline. User A (anonymous) uploads A2 as a room photo and enrolls A1 (`face-refs` + `enroll_face`); user B (anonymous) uploads B1. The function then compares A1↔A2 and A1↔B1.
5. Fixture budget: the 3 approved rooms and 1 account are used. **Needs the human's OK, one of:** (a) reuse live room R2 (code 19455, expires 2026-11-07 17:52 PST; it holds host + 1 QA photo `2df2d468…`, which `enroll_face` also queues, so it adds one extra CompareFaces call on a photo with no face: expected calls = 3, not 2), or (b) one new throwaway room. Either way 2 new anonymous (non-email) users A and B are created; their exact IDs are recorded at creation (script prints them, and writes an IDs-only state file outside the repo).

## Before the switch
6. `prepare` ends with the pre-switch probe as A: no token → 401; anonymous token → `503 face_match_disabled`. Record time T0. Count `face_enrollments` and `face_jobs` (expect 0/0 now; supervisor can read too).

## R3 Switch
7. Human sets `FACE_MATCH_ENABLED=true` (or says "OK" and I set it with `supabase secrets set` using a literal `true`; no key values involved). Record time T1. No other enrollment may exist: nobody else uses the app's face feature during the window (qa idle on Photos → Me).
8. `match` (after `prepare` from step 6): call `face-match` once as A. Record call count, per-photo similarity, matched flag; threshold = `DEFAULT_SIMILARITY_THRESHOLD` (90, from `core.ts`), AWS floor 80. Expected: A2 matched, B1 not. If a job fails with `transient`/`throttled`, a retry is a further call and is listed. Maximum calls is bounded by `MAX_ATTEMPTS` per job.
9. Immediately after: human (or I, with OK) unsets the secret; Record time T2. `probe` again → `503 face_match_disabled`. Count `face_enrollments`/`face_jobs` before/after: only rows for user A / the test media may exist.

## R4/R5 Results and no leakage
10. Log the scores. Read function logs (`get_logs`/dashboard) for the window: only `event` + job id + error kind are logged by the code; confirm no keys, base64 or URLs. The script prints no tokens or bytes.

## R6 Cleanup by exact ID (supervisor-approved SQL, like earlier QA cleanups)
11. Delete: `face_enrollments` (cascades `face_jobs`, `face_matches`) for A's enrollment ID; the two test `media` rows (A2, B1) by ID; users A and B by exact UUID (anonymous, email null). Storage objects (face-refs ref, room-media A2/B1) are removed by the cleanup jobs the triggers queue (janitor */15); verify 0 rows, 0 objects and `cleanup_jobs.verified_empty_at`. If room R2 is reused it keeps its own expiry deletion. I do not claim AWS-side deletion (no opt-out tonight, step 6 option (b)).
12. After users A and B are deleted, delete the state file (`FACE_TEST_STATE` or the default temp-dir path) and verify it is gone (`test ! -e <path>` succeeds). The file holds A's and B's refresh tokens, so it must not outlive the test.

## R7 Evidence
13. `docs/implementation-status.md`: T0/T1/T2, scores, matched flags, call count, cleanup reads. Any screenshot goes in `docs/evidence/`.

## Run plan v2 (2026-11-06 ~20:55 PST, for supervisor review; NOT run, no AWS call)
Status inputs (qa relay of the human, not a human decision record):
- R1 done: dashboard shows `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (registered 11/04); IAM policy CompareFaces only; AWS Free plan (no charges possible, $100 credit). Human steps 1–3 done (20:33).
- Switch: the human controls it in the dashboard (D-c answered). The human set `FACE_MATCH_ENABLED=true` at 20:38 PST, so **the switch is ON now**.
- Photos: `~/Desktop/moment-face-test/A1.jpg A2.jpg B1.jpg` (A1/A2 same person, B1 different). Developer checked metadata only: each JPEG 2000×1500, 0.58–1.77 MB, outside the repo. The folder also holds `.HEIC` originals; the script reads only the three `.jpg` names. Nothing is copied into the repo, docs or evidence; no photo is committed.
- The human's consent for sending the photos is still being confirmed (qa, 20:5x). **No AWS call until it is confirmed.**

Findings that change the run:
- **V2-1 Switch order.** `prepare` must run with the switch OFF. Its final probe as A expects 503. With the switch ON, that probe would claim A's queued jobs and call CompareFaces outside `match`, breaking the call count. Required order: human OFF → `prepare` (T0, 503) → human ON (T1) → `match` → human OFF (T2) → `probe` (503). The accepted script stays unchanged.
- **V2-2 GPS in EXIF.** All three JPEGs carry GPS coordinates. The script uploads raw bytes, so the location would reach Supabase Storage and AWS. (The app's enrollment path re-encodes the reference and drops EXIF; the room-photo path keeps originals by design.) Proposal: before `prepare`, the developer writes metadata-stripped copies to a new 0700 temp folder outside the repo, verifies no GPS remains, passes that folder to `prepare`, and deletes it at R6. The human's files are not changed. **Needs the human's OK** (or the human supplies stripped files).

Execution path (real pipeline, unchanged): A joins and uploads A2 as a room photo; B joins and uploads B1; A uploads A1 to `face-refs` and calls `enroll_face`, which queues one job per ready photo in the room; `match` = exactly one `face-match` request as A, which processes the jobs, one CompareFaces call per job.

Call count:
- **New room (D-a b): 2 CompareFaces calls** (A1↔A2, A1↔B1). This matches the "2 calls" asked for, but all 3 approved rooms are used, so a 4th room needs the human's OK.
- **Reuse R2 19455 (D-a a): 3 calls.** The extra call is on the existing QA photo (`2df2d468…`, no face).
- Retries: a `transient`/`throttled` job is retried only inside the same request and is counted. The cap is `MAX_ATTEMPTS` per job. One retry of the request itself is allowed only on a 503 right after T1. The count is read from `face_jobs.attempts` after `match`.

Score recording: `match` prints per photo (A2, B1, other) the similarity and the matched flag. Threshold 90 (`DEFAULT_SIMILARITY_THRESHOLD`), AWS floor 80. Expected: A2 matched, B1 not. Logged in `docs/implementation-status.md` with T0/T1/T2 and the call count. No image bytes, tokens or URLs are printed or logged.

Deletion check (R6 as above, exact IDs from `list`): enrollment (cascades jobs and matches), media A2/B1, users A and B; then 0 rows for those IDs, 0 objects under A's `face-refs` path and the A2/B1 `room-media` paths after the janitor run, `cleanup_jobs.verified_empty_at` set; state file and stripped-copy temp folder deleted and verified gone. AWS-side retention or deletion is not claimed. Tonight there is no opt-out (step 6 option (b), 20:47), so AWS may retain the 3 test photos, as their subjects were told.

## Open questions for the human (via supervisor)
- D-a: new room (2 calls, a 4th room beyond the approved 3) or reuse R2 19455 (3 calls)?
- D-b: may the 2 anonymous users A and B be created (beyond the "1 account" budget; anonymous, not email)?
- V2-1: set the switch OFF now, until `prepare` finishes?
- V2-2: OK to strip GPS/EXIF into temp copies before upload?
- Consent for sending A1/A2/B1 to AWS confirmed?
