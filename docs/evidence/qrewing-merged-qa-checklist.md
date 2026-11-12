# Qrewing merged build: QA checklist (qa, in order)

This is a single ordered checklist for qa after the merge. It combines:

- the backend live-sitting smoke (`qrewing-backend:docs/qrewing-live-sitting.md` §4–5)
- the event QA script (`qrewing-event:docs/evidence/qrewing-event-qa-script.md`)
- the pace QA demo (`docs/evidence/qrewing-pace-qa-demo.md`)
- pace runbook §7 step 8 (`docs/qrewing-pace-merge-prep.md`)

The source scripts keep the full copy text; this list gives order, simulator, expected result and evidence file.

**Gate:** start only after the 0027 apply, the Edge Function deploys and the probe pass. Then the local merge (`main` ← `qrewing-backend` ← `qrewing-event` ← `qrewing-pace`, each `--no-ff`, local only, no push), runbook §7 steps 2–7 (M3, string moves, voice + `stopSpeech`, tsc/test/lint, signed rebuild, Metro `--clear`).

Evidence goes in `docs/evidence/`, named `<YYYY-MM-DD>-merged-<id>.png` (or `.txt` for logs and SQL output). `<id>` is the step id below, for example `2026-11-13-merged-E2.7.png`.

## Simulators and accounts

| Label | Simulator | Keychain group | Account |
|---|---|---|---|
| Host | 17 Pro `91F3BFB3` | `9K6BKSS4U6` | Simulator_host (standing host; never delete) |
| Guest A | 17 `F11BA960` | `FAKETEAMID` | existing guest |
| Guest B | 17e `6E0F2097` | `FAKETEAMID` | existing guest |
| Spare | 17 Pro `20541309` | `9K6BKSS4U6` | only if a step needs a fresh joiner |

- Before every install, check that `strings <App>.app/Qrew | grep -A1 application-identifier` matches the group above.
- Install over the existing app; never uninstall.
- Use only existing accounts; creating any new live account needs the human's approval.
- Do not check the largest Dynamic Type size (human decision).

## 0. Backend smoke (confirm, do not repeat model calls)

The qrewing function is deployed only after the M1/M2/L4 fix (qa cost-safety decision). Run the qrewing probes B0.1–B0.2 after that fixed deploy, not from the earlier sitting log.

| Id | Where | Expected | Evidence |
|---|---|---|---|
| B0.1 | after the fixed deploy | `GET /functions/v1/qrewing` → 405. `POST` with no auth → 401 `unauthorized`. | `merged-B0.1.txt` (copied from the sitting record) |
| B0.2 | after the fixed deploy | Probe with an existing session → 200 (503 `ai_not_configured` means the secret is missing). | `merged-B0.2.txt` |
| B0.3 | sitting log | Janitor filter GET → 200 `[]`. `private.janitor_health()` newest run is `ok`. The cron runs `*/5` and they `succeeded`. | `merged-B0.3.txt` |
| B0.4 | Mac | The merged checkout: `npx tsc --noEmit`, `npm test` (≥ 437 pass; event daf5b26 added a test), `npx expo lint`, all exit 0. | `merged-B0.4.txt` |
| B0.5 | every sim | The app ID matches the table, the app opens signed in, and Metro has no red box. | `merged-B0.5-<sim>.png` |

## 1. Event room: create (Host)

| Id | Sim | Expected | Evidence |
|---|---|---|---|
| E1.1–1.3 | Host | Create room, 3 hours, **Qrewing AI** on, **Ask attendees for entry info** on, and the hints are shown. | `merged-E1.3.png` |
| E1.4 | Host | The room opens with no "Qrewing AI could not be turned on" error. This is the first live client call to `set_qrewing_room`. | `merged-E1.4.png` |
| E1.5 | Host | Disclosure "Qrewing AI is on in this room" → Agree. | `merged-E1.5.png` |

## 2. Entry form (Guest A, then Guest B)

| Id | Sim | Expected | Evidence |
|---|---|---|---|
| E2.1–2.2 | A, B | Join by code, then the disclosure (Agree), then the "Introduce yourself" gate. | `merged-E2.2.png` |
| E2.3–2.4 | A | An empty headline shows "Add a headline.". `http://x.com` shows the https rule error. | `merged-E2.4.png` |
| E2.5 | A, B | Save valid entries (different topics), and chat opens. | `merged-E2.5-A.png`, `-B.png` |
| E2.6 | A | Room info shows "Your messages are included" and **Edit my entry info**. | `merged-E2.6.png` |
| E2.7 | Spare (fresh joiner) | **B1:** swipe the disclosure down without answering. The entry gate shows, there is no message list or composer, and no Mute bar. The gate button opens "Introduce yourself". FAIL if chat is usable before Save. | `merged-E2.7.png` |

## 3. Mute small talk and important messages

| Id | Sim | Expected | Evidence |
|---|---|---|---|
| E3.1 | A | Mute on shows "Showing important messages". | `merged-E3.1.png` |
| E3.2 | B → A | B: "hi", "lol", "coffee?". A sees "3 messages hidden · Show", and Show reveals them. | `merged-E3.2.png` |
| E3.3 | Host → A | The host's line is shown, with an "Important: …" banner and ✕. | `merged-E3.3.png` |
| E3.4 | B → A | "@everyone doors open in 5" is shown, with an Important banner. | `merged-E3.4.png` |
| E3.5 | B → A, Host | "@<A name> meet at the stage": A gets "You were mentioned"; the host (Mute on) does not. | `merged-E3.5-A.png`, `-host.png` |
| E3.6 | optional | Not now, then Mute, opens the disclosure first. | `merged-E3.6.png` |
| E3.7 | if AI down | "Qrewing is not available right now. All messages are shown." This is recorded, not a fail. | `merged-E3.7.png` |
| E3.8 | — | **B2 device check: NOT VERIFIED.** There is no guest-only network cut, and the Mac's network must not be cut. Record "B2 device: NOT VERIFIED (no guest-only network cut); covered by nextLoadedOnce unit tests (tests/event-plan.test.mjs)". | `merged-E3.8.txt` |

## 4. People to meet (Guest A)

| Id | Sim | Expected | Evidence |
|---|---|---|---|
| E4.1–4.2 | A | "Qrewing is reading entry info…", then the pending copy, then the "Tap Refresh" copy after polling stops. | `merged-E4.2.png` |
| E4.3 | A | Refresh shows a list with Guest B (name as a header), headline, reason, and a link that opens Safari. | `merged-E4.3.png` |
| E4.4 | A | An immediate second Refresh shows the last list plus "Showing the last list. A new one is available in a few minutes." | `merged-E4.4.png` |

## 5. Pace maker (sports room; Host + Guest A; `docs/evidence/qrewing-pace-qa-demo.md`)

- **Setup:** the host creates a sports room, Guest A joins, and the host starts the activity.
- On each sim: Map → Pace maker on, Share my location on, Target pace `5:00` → Save target.
- Each scenario: first `node scripts/pace-gps-demo.mjs <scenario> --dry-run`, then the real run, then `clear`.
- The replayed times are from `mobile/tests/pace-demo-replay.test.mjs`. A device run can be several seconds off.

| Id | Sim | Expected | Evidence |
|---|---|---|---|
| P5.1 steady | Host | Km cues at about 5:10, 10:00 and 15:10. Banner: `Kilometer n: 5:00 per km, target 5:00.` Spoken: `n kilometers, split 5 minutes, target 5 minutes.` (never "5:00" read as a time). No other cue. | `merged-P5.1.png` + note of the spoken words |
| P5.2 gap | Guest A (+ Host leads) | Pick it up at about 0:15 and 2:15; gap cues at about 3:05, 5:05 and 7:05 ("Lead group N meters ahead…"); Ease off at about 8:30; no slow or fast cue while behind. Host: km cues only. | `merged-P5.2.png` |
| P5.3 stop | Host | Sheet "You've stopped for 3 minutes. Everything okay?" at about 5:55, spoken the same. Km 1 at about 9:10. | `merged-P5.3.png` |
| P5.4 stop speech | Host | End the activity (or turn the switch off) just after a km cue starts. The cue stops, and nothing plays after it (`stopSpeech`). | `merged-P5.4.txt` |
| P5.5 dark | Host | Dark mode: the Pace card, cue banner and stationary sheet are readable. | `merged-P5.5.png` |
| P5.6 silent switch | physical iPhone | **NOT VERIFIED (human / physical device).** Switch off: cues are spoken. Switch on: record the behavior (with this build, vibration only on a speech error). | `merged-P5.6.txt` |

## 6. Recap and host's early end (event room from step 1, plus the pace line)

Before E6.1, in the event room: Guest A turns on the pace maker on the Map (only if the event room's type allows it). Otherwise run E6.1–6.2 in the sports room from step 5 as well. Guest A runs at least 100 m (`steady` for about 1 minute) and leaves the Map open.

| Id | Sim | Expected | Evidence |
|---|---|---|---|
| E6.1 | Host | End room. The copy reads "Chat closes now. The recap and photos stay available for 30 minutes, …" and "Closes now · Deleted after 30 min". | `merged-E6.1.png` |
| E6.2 | all | "This room has ended" with Photos of me, Photos & files, Back to rooms. The Recap card shows "Qrewing is still writing the recap." and then the recap. | `merged-E6.2-<sim>.png` |
| E6.2p | Guest A | The recap's "You in this room" has `Pace maker: X km, moving m:ss, total m:ss, m:ss per km` even though the Map was open at End (M3 + 2ba6451). Guest B (no pace maker) has no pace line. | `merged-E6.2p-A.png`, `-B.png` |
| E6.3 | A | Rooms row: "Ended · recap and photos until <time>", and tapping it opens the ended screen. | `merged-E6.3.png` |
| E6.4 | A | Photos & files: view and download work; any write shows "This room has ended. Only viewing and downloads still work." | `merged-E6.4.png` |
| E6.5 | A | Photos of me without enrollment: "Photos of me was not set up before the room ended." | `merged-E6.5.png` |
| E6.6 | Guest A (sports room) | With the pace maker running and voice cues on, the host ends the room. Within a few seconds the Map shows "This room has ended" and the voice stops. FAIL if the voice keeps playing. | `merged-E6.6.png` |
| E5 | — | The recap content is checked in E6.2. The 60/10-minute triggers are covered by unit tests (`tests/recap-plan.test.mjs`). Optional (a) only if time allows. | — |

## 7. Grace

| Id | Sim | Expected | Evidence |
|---|---|---|---|
| E7 | A | R7: staying on the ended screen while the recap is pending, the card switches to the recap without Try again. No realtime `CHANNEL_ERROR` in Metro. Record "R7 FAIL: no live notice" if it changes only after Try again. | `merged-E7.png` + Metro log `merged-E7.txt` |
| E8 | A | After end + 30 min, the screen goes plain by itself (Back to rooms only) and the Rooms row is gone. Opening by code shows "This room has ended." The saved recap stays. Then check that room-janitor's next run is `ok`. | `merged-E8.png`, `merged-E8.txt` |

## 8. Dark mode and VoiceOver spot checks

| Id | Sim | Expected | Evidence |
|---|---|---|---|
| E9.1 | Host, A | Dark mode on screens E1.2, E2.2, E3.3, E4.3, E6.2 and the Recap card, plus P5.5: no black-on-black or white-on-white. | `merged-E9.1-<screen>.png` |
| E9.2 | A | VoiceOver (Accessibility Inspector): entry field labels, "Mute small talk", the banner ✕ reads "Dismiss", people and recap title read as headers, highlights do not read "bullet", and the pending recap is announced. | `merged-E9.2.txt` |

## Results

Record PASS, FAIL or NOT VERIFIED per id in `docs/evidence/qa-log.md`, with the evidence file. Items that stay NOT VERIFIED until the human or a physical device is available: **E3.8** (B2 device) and **P5.6** (silent switch).
