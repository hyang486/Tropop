# Qrewing demo video: shot list (filming order)

From `qrewing-demo-scenario.md`. Record each take in full and cut later (the human approved this). The **Cut** column marks where each clip starts and ends in the recording. Times are recording clock (m:ss from the take's start command), not the final cut.

- **Sims:** Host `91F3BFB3` (17 Pro, Simulator_host); Guest `F11BA960` (17, existing guest); Guest 3 `6E0F2097` (17e, existing guest, Act 2 only). Existing demo accounts only. Check the app id and keychain group before any install.
- **Copy:** text cites `mobile/src/i18n/en.ts` on main `b9d031c`. The 30-minute early-end copy is in `40fd48f` (branch copy-grace, not yet on main). Its lines are marked **[40fd48f]**, with the same line numbers there.
- **AI** = live model call (qrewing v2 deployed; qa verified match/triage on b9d031c). **Face** = demo images already used in QA only.
- Voice cues are spoken on these builds (the 55948fd rebuild on all 5 sims includes ExpoSpeech). The vibration-plus-banner fallback applies only to older builds.
- Run `node scripts/pace-gps-demo.mjs clear` after each pace take.

## Setup (not filmed)

Host creates a **Sports** room, and Guest joins by code. On both, open the **Map** tab:
- **Pace maker** on (`en.ts:415`);
- **Share my live location** on (`en.ts:462`; the scenario doc says "Share my location");
- Target pace `5:00` saved: "Target saved." (`en.ts:430`).

Then the Host taps **Start activity** (`en.ts:456`). Dry run first: `node scripts/pace-gps-demo.mjs gap --dry-run`.

## Take A: gap (Host + Guest, about 18 min)

Start recording both sims, then run `node scripts/pace-gps-demo.mjs gap`.

| Shot | Sim | Action | Expected on screen (en.ts) | ≈ Time | Cut |
|---|---|---|---|---|---|
| A1 (1.1) | both | Map tab with the Pace maker card before the run moves | Card "Pace maker" (`:415`), `0.00 km · 0:00` | 0:00 | In at 0:00, out at 0:05 |
| A2 (1.3) | Guest | Banner while running slow | `Pick it up: 6:40 per km, target 5:00.` (`:442`); the pace may read a little faster while it settles | 0:15 (again at ~2:15) | In 0:12, out after the banner, ~0:20 |
| A3 (1.4) | Guest | First lead-group gap cue | `Lead group N meters ahead. Run m:ss per km to catch them in 3 minutes.` (`:444-445`) | ~3:00–3:05 | In 2:58, out ~3:10 |
| A4 (1.6) | Host | Km 1 split | `Kilometer 1: 5:00 per km, target 5:00.` (`:440-441`) | ~5:00–5:10 | In 4:58, out ~5:15 |
| A5 (1.5) | Guest | Caught up (back within 150 m at ~8:10) | `Ease off: 3:42 per km, target 5:00.` (`:443`) | ~8:30 | In 8:25, out ~8:40 |

Stop recording, then run `clear`. The rest of take A (to ~18 min) is not used.

Already proven without a sim, by `mobile/tests/pace-demo-replay.test.mjs` and `pace-demo-engine.test.mjs`:
- the first gap cue at ~3:00, then every 2 min while more than 150 m behind;
- no slow or fast cue while behind;
- km cues at ~5:00, 10:00 and 15:00.

## Take B: Host stops, Guest runs on (about 10.5 min)

Start recording the Host. In two terminals at the same time:
- `node scripts/pace-gps-demo.mjs stop` (Host);
- `node scripts/pace-gps-demo.mjs steady --host F11BA960-…` (Guest).

| Shot | Sim | Action | Expected on screen (en.ts) | ≈ Time | Cut |
|---|---|---|---|---|---|
| B1 (1.8) | Host | Standing 3 min (the stop starts at ~3:00) | Sheet `You've stopped for 3 minutes. Everything okay?` (`:447`) | ~6:00 (5:55) | In 5:50, hold on the sheet |
| B2 (1.9) | Host | Tap **Dismiss** (`:448`). Do **not** send Emergency. | The sheet closes, and the card's time does not grow while standing | right after B1 | Out ~2 s after the sheet closes |

- **No gap cue while stopped.** Between ~3:00 and ~7:00 the Host gets no lead-group cue, even though the Guest pulls ahead, including while the sheet is open. Once the Host runs on (~7:00), gap cues resume ("Lead group 800 meters ahead…") alongside km 1 at ~9:00. `mobile/tests/pace-demo-engine.test.mjs` (act 1.7 test) checks this, so this stretch needs no filming. Do not cut a gap banner into the stop.
- Only the Host gets the sheet: the Guest is moving.
- After filming, stop both and run `clear`.

## Take C: event (new Event room; Host, Guest, Guest 3)

Before recording, Guest 3 joins by code, taps **Agree** and saves its own entry, the same as C2–C3, off camera. Record all three sims.

| Shot | Sim | Action | Expected on screen (en.ts) | ≈ Time | Cut |
|---|---|---|---|---|---|
| C1 (2.1) | Host | Create room → **Event**, **3 hours**, **Qrewing AI** on, **Ask attendees for entry info** on → Create → **Agree** | Disclosure title "Qrewing AI is on in this room" (`:644`), "Agree" (`:651`), and **no** "…Qrewing AI could not be turned on…" (`:641`); then the "Introduce yourself" gate (`:656`), since the entry gate applies to the Host too (`event-plan.ts:60`) | 0:00–0:40 | Keep the switches and the Agree; trim the typing |
| C2 (2.2) | Guest | Join by code → **Agree** | "Introduce yourself" gate (`:656`). The disclosure's deletion line is `:648` **[40fd48f]**: "…when the room ends, or 30 minutes after the host ends it early." | — | Keep the gate appearing |
| C3 (2.3) | Guest | Headline, Interests, Looking for, one `https://` link → **Save** | Chat opens. The entry intro line is `:657` **[40fd48f]** | — | Speed up the typing; keep the Save → chat |
| C4 (2.4) | Host | Fill own entry in the gate shown after C1's Agree | — | — | Not filmed / cut |
| C5 (2.5) **AI** | Guest | Room info → **People to meet** (`:689`) | "Qrewing is reading entry info…" (`:708`), then the Host's name, headline and reason. If "Qrewing is still finding people to meet." (`:712`/`:713`) shows, tap **Refresh**. Guest 3 may also appear next to the Host. | wait time varies | Cut the wait; keep loading → list |
| C6 (2.6) | Guest | **Mute small talk** on (`:695`) | "Showing important messages" (`:696`) | — | Short |
| C7 (2.7) **AI** | Guest 3 → Guest | Post "hi", "lol", "coffee?" | Guest: "3 messages hidden" (`:697`) · Show. Model-dependent: "lol" is hidden by rule with no model call (`fn/qrewing/core.ts:413`); "hi" and "coffee?" depend on the model, so the count can be lower | — | Film the Guest's screen |
| C8 (2.8) | Guest 3 → Guest | Post "@everyone doors open in 5" (rule path, no model call) | Guest: the message and `Important: …` (`:699`) | — | Out after the banner |

## Take D: host ends early (same Event room)

Before recording, the Guest enrolls for Photos of me and a matching demo photo is uploaded (**Face**). The face consent line is `:226` **[40fd48f]**. If this is skipped, the ended screen says "Photos of me was not set up before the room ended." (`:740`); drop D4 then.

| Shot | Sim | Action | Expected on screen (en.ts) | ≈ Time | Cut |
|---|---|---|---|---|---|
| D1 (3.1) | Host | Room info → **End room for everyone** (`:176`) → confirm (`:539`) | "Chat closes now. The recap and photos stay available for 30 minutes, then messages, photos and files are deleted from the server. Anything already saved to a phone stays there." (`:531-532`) | 0:00 | Keep the confirm text readable for ~3 s |
| D2 (3.2) **AI** | both | — | "This room has ended" (`:193`); "Recap and photos available until <time>" (`:733`); "Chat and the room are closed. After that time, everything is deleted from the server." (`:734`); buttons **Photos of me** (`:735`), **Photos & files** (`:736`), **Back to rooms** (`:191`); recap card "Qrewing is still writing the recap." (`:722`) | right after D1 | Keep |
| D3 (3.3) | Guest | Wait without tapping | The card becomes the recap: title, summary, highlights, "You in this room" (`:725`), "Saved on this phone only." (`:730`) | wait varies | Cut the wait; keep the change |
| D4 (3.4) **Face** | Guest | **Photos of me** → open a photo → save | The photo saves to the phone. ("The room has ended. View and download until <time>." (`:738`) shows only in **Photos & files** (`gallery.tsx:170`), not here; film it there if needed.) | — | Keep the save |
| D5 (3.5) | Guest | **Back to rooms** | Row "Ended · recap and photos until <time>" (`:737`) | — | End of video |

## Not in this video

- **Recap pace line:** "Pace maker: … km, moving …" is not shown. It would appear only if Take A/B and Take D used the same Sports room with AI on.
- **Spoken cues:** included in the 55948fd builds on all 5 sims.
- **Real-device GPS and audio:** not covered.
