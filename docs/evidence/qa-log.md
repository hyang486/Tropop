# qa log (human proxy; planning/CLAUDE_QA_SESSION_EN.md)

| Time (PST) | Request from | Device | Result | Evidence |
|---|---|---|---|---|
| 2026-11-06 16:10 | human (setup) | host iPhone 17 | Simulator tool reachable (screenshot only, no taps): Rooms, "Signed in as Test (Host)", R3 ends in 35m, R1 ends in 3d 21h | none (read-only check) |
| 2026-11-06 16:12 | supervisor (M-1) | host iPhone 17 | PASS: saved as QA-file.txt, sha256 = fixture; stopped before Step 5 | 2026-11-06-final-4-m1-{filename,sharesheet,saved}.png |
| 2026-11-06 16:19 | supervisor (Step 5) | host 17 + guest 17 Pro | Items 2–5 PASS (item 3 = on first open, no reopen; guest's own pin not checked); 6 NOT RUN; findings F5-1..F5-4 | 2026-11-06-final-5-*.png |
| 2026-11-06 16:26 | supervisor (Step 6) | host 17 + guest 17 Pro | 6a PASS (stale between +32 s and +70 s, row text only); 6b PASS (Never → access-off message, host pin removed); restored While Using + fresh pin; activity ended 16:25:23 | 2026-11-06-final-6*.png |
| 2026-11-06 16:48 | supervisor (Step 12a) | host 17 + guest 17 Pro | PASS: R3 gone from both lists; rejoin 04693 → "This invite is invalid or the room has ended." | 2026-11-06-final-12a-*.png |
| 2026-11-06 16:52 | supervisor (5b/6c on 6e97015) | host 17 + guest 17 Pro | (a)(b)(c) PASS; stale grey clock by +82 s, fresh ≤6 s after restore; F5b-1 Recenter edge clipping (minor) | 2026-11-06-final-5b-*, final-6c-*.png |
| 2026-11-06 16:54 | supervisor (Step 7) | guest 17 Pro | consent PASS; pick pattern → saveAsync "Cannot create image data for given image format" FAIL; 3 not run | final-7-consent.png, final-7-pick-error.png |
| 2026-11-06 16:58 | supervisor (Step 7 retry, cc97c7f) | guest 17 Pro | save PASS (F7-1 fixed on device), no "off in this draft" text; Stop and remove PASS (UI back to Set up) | 2026-11-06-final-7-*.png |
| 17:48 | supervisor | iPhone 17 | Step 8 PASS | final-8-plan-preview.png, final-8-cta-alert.png |
| 17:57 | supervisor | 17 + 17 Pro | Step 11 reminder PASS both | final-11-*-notification.png |
| 18:01 | supervisor | 17 + 17 Pro | Step 10 walkthrough PASS; F7-2 device PASS | final-10-*.png |
| 18:03 | supervisor | — | FINAL REPORT posted (Step 9 deferred) | live-status 18:03 |
| 19:20 | — | — | Closing status posted | live-status 19:20 |
| 20:20 | supervisor | 17e | Step 9 PASS; all steps done | final-9-*.png |
