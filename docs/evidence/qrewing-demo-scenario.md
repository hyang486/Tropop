# Qrewing AI demo video: scenario (3 acts, 3–4 min cut)

Story: one person, Guest, uses Qrewing twice in a day. In the morning they join a crew run, fall behind, and catch up. In the evening they go to an event, meet the right people, and keep the recap and their photos after the host closes the room.

Sources: `qrewing-pace-qa-demo.md` (pace timings), `qrewing-event-qa-script.md` on qrewing-event (event copy), `qrewing-merged-qa-checklist.md`. Run this on the **merged build** only.

## Devices and rules

| Role | Simulator | Account |
|---|---|---|
| Host | iPhone 17 Pro `91F3BFB3` | Simulator_host |
| Guest | iPhone 17 `F11BA960` | existing guest account |
| Guest 3 (Act 2 only) | iPhone 17e `6E0F2097` | existing guest account |

- Use existing accounts only. Check the app id and keychain group before any install.
- Real time is longer than the cut. The pace legs run 10–18 min, so record each act in full and cut to the times below (qa confirmed).
- **AI** marks a step that makes a live Qrewing model call. Run AI steps only after the fixed qrewing deploy (M1/M2/L4). Pace makes no server or model calls.
- **Face** marks the face-match step. Use only demo images already used in QA, never real people's photos.
- With no `expo-speech` in the build, a cue is a vibration plus a banner. Any captions about voice apply only to a build that has it.
- Run `node scripts/pace-gps-demo.mjs clear` after each pace leg.

## Act 1: running crew (cut ≈ 75 s)

Setup (not filmed): Host creates a **Sports** room. Guest joins by code. On both: **Map** tab → **Pace maker** on, **Share my location** on, **Target** → **Target pace** `5:00` → **Save target** ("Target saved."). Host: **Start activity**. Dry run first: `node scripts/pace-gps-demo.mjs gap --dry-run`.

| # | Sim | Action | Expected on screen | Caption |
|---|---|---|---|---|
| 1.1 | both | Show the Map tab with the Pace maker card. | Live card `0.00 km · 0:00` | "Qrewing coaches each runner from their own phone." |
| 1.2 | Mac | `node scripts/pace-gps-demo.mjs gap` | Both markers start moving; Guest moves slower. | — |
| 1.3 | Guest | Film ~0:15. | `Pick it up: 6:40 per km, target 5:00.` (may read a little faster while it settles) | "Running behind your target? You'll know." |
| 1.4 | Guest | Film ~3:00. | `Lead group N meters ahead. Run m:ss per km to catch them in 3 minutes.` | "It tells you how fast to go to rejoin the group." |
| 1.5 | Guest | Film ~8:30 (back within 150 m at ~8:10). | `Ease off: 3:42 per km, target 5:00.` | "Caught up. Now settle back in." |
| 1.6 | Host | Film ~5:00. | `Kilometer 1: 5:00 per km, target 5:00.` | "Splits every kilometer." |
| 1.7 | Mac | Stop the leg and `clear`. Then start both together in two terminals: `node scripts/pace-gps-demo.mjs stop` (Host) and `node scripts/pace-gps-demo.mjs steady --host F11BA960-…` (Guest keeps running at 5:00 per km). Each process clears and drives only its own device. | — | — |
| 1.8 | Host | Film ~6:00 (3 min standing). | Sheet `You've stopped for 3 minutes. Everything okay?` | "Stopped for 3 minutes? Qrewing checks on you." |
| 1.9 | Host | Tap **Dismiss**. Do **not** send Emergency. | The sheet closes; the card's time does not grow while standing. | — |

Because the Guest has its own moving leg in 1.7, only the Host gets the 3-minute sheet. After filming, stop both and run `clear` (it clears the Host and Guest).

## Act 2: event (cut ≈ 100 s)

| # | Sim | Action | Expected on screen | Caption |
|---|---|---|---|---|
| 2.1 | Host | Rooms → Create room → **Event**, **3 hours**, **Qrewing AI** on, **Ask attendees for entry info** on → Create. **Agree** on "Qrewing AI is on in this room". | The room opens with no "could not be turned on" error. | "One switch turns on Qrewing for the room." |
| 2.2 | Guest | Join by code → **Agree**. | "Introduce yourself" gate | "Everyone chooses whether their messages are included." |
| 2.3 | Guest | Fill Headline, Interests, Looking for, one `https://` link → **Save**. | Chat opens. | "A short intro instead of awkward small talk." |
| 2.4 | Host | Fill the host's own entry (the gate, or Room info → **Edit my entry info**). People to meet lists only members who have an entry. | — | — |
| 2.5 | Guest | Room info → **People to meet**. **AI** | "Qrewing is reading entry info…", then the Host's name, headline and a reason (tap **Refresh** if "still finding"). | "Qrewing suggests who to meet, and why." |
| 2.6 | Guest | Turn on **Mute small talk**. | "Showing important messages" | "Too much chat? Mute the small talk." |
| 2.7 | Guest 3 | Post "hi", "lol", "coffee?". **AI** (the rule prefilter may decide some with no call) | Guest: "3 messages hidden · Show" | — |
| 2.8 | Guest 3 | Post "@everyone doors open in 5". | Guest: the message plus an "Important: …" banner | "Important messages still get through." |

Guest 3 is the third member (not filmed until 2.7). Before 2.5 it joins by code, taps **Agree** and saves its own entry, the same as 2.2–2.3. Host lines always show, which is why Guest 3, not the Host, posts the small talk.

## Act 3: host ends early (cut ≈ 50 s)

Before filming: the Guest enrolled for Photos of me in this room before the end, and a demo photo that matches was uploaded. **Face** If it was not set up, the screen says "Photos of me was not set up before the room ended." In that case drop 3.4 from the cut.

| # | Sim | Action | Expected on screen | Caption |
|---|---|---|---|---|
| 3.1 | Host | Room info → **End room** → confirm. | "Chat closes now. The recap and photos stay available for 30 minutes, then messages, photos and files are deleted from the server. …" | "When it's over, the host closes the room." |
| 3.2 | both | — | "This room has ended", buttons **Photos of me**, **Photos & files**, **Back to rooms**; Recap card "Qrewing is still writing the recap." **AI** | "30 minutes to grab what matters." |
| 3.3 | Guest | Wait without tapping. | The card changes to the recap: title, summary, highlights, "You in this room", "Saved on this phone only." | "A recap of the evening, kept on your phone." |
| 3.4 | Guest | **Photos of me** → open a photo → save. **Face** | The photo saves to the phone. | "Your photos, found for you." |
| 3.5 | Guest | **Back to rooms**. | Row "Ended · recap and photos until <time>" | "Then the server deletes everything." |

## Recorder setup for the presentation video (scenes 5, 9, 11 of presentation-video-plan.md)

Checked read-only against the pace code on qrewing-pace (0a1854b). The script drives one device per process, so 2-2-1 is five `steady` runs (5:00 per km, the same JFK Drive route) started at staggered times. Equal speed keeps the gaps fixed.

- **Before Start activity:** on every sim, turn on **Share my location**, run `xcrun simctl location <udid> set 37.77226,-122.45495` (the route start), and turn on **Pace maker** on Dani. Give the room no place pin, or put the pin at the route start. Without a room route, progress is the straight-line distance from the pin, or from Dani's first fix. A pin off the route skews the gap.
- **Scene 5 (Dani target):** the field is prefilled only if Dani's phone has a saved session with an average pace. A fresh install shows the empty "e.g. 5:30" state. The plan accepts either state.
- **Scene 9 (2-2-1), one terminal per sim:** `node scripts/pace-gps-demo.mjs steady --host <udid>`. Get the UDIDs from `xcrun simctl list devices booted`.
  - t = 0: Mina and Jun, within 5 s of each other. They must stay within 50 m (`LEAD_GROUP_SPAN_M`), which is 15 s at this speed.
  - t ≈ 25 s: Sora and Leo, about 80 m back. They must be more than 50 m behind Jun, or they join the lead group.
  - t ≈ 60–75 s: Dani, 200–250 m back. The cue needs more than 150 m (`BEHIND_GAP_M`) to Jun, the rear of the lead group. Use extra margin, because location reports are throttled to every 5 s or 10 m.
  - Dani's first gap cue comes on Dani's first fix after the gap passes 150 m, as long as no cue played in the last 20 s. It then repeats every 2 min. The banner shows for 12 s. Expected at 200 m: `Lead group 200 meters ahead. Run 3:45 per km to catch them in 3 minutes.` The gap number varies with timing.
  - Members whose location is older than 60 s drop out of the lead group. Keep all five processes running.
  - Map pills: pins within 48 px on screen share one pill. Zoom to about 1 km so that "Mina · Jun" and "Sora · Leo" (80 m apart) get separate pills.
- **Scene 11 (Dani still running):** keep Dani's `steady` process running through the Ask, so Dani reads as moving.
- **Cleanup:** stop each process with Ctrl-C, which clears its own device. Do not run `clear --host <udid>` for the other sims, because `clear` also clears the default guest (iPhone 17, Jun). Use `xcrun simctl location <udid> clear` per sim instead.

## Not covered by this video

- The recap pace line (`Pace maker: … km, moving …`) needs the post-merge recap wiring (runbook M3). Add it to Act 3 only if Act 1 and Act 3 are in the same Sports room with AI on.
- Spoken cues need the expo-speech step (runbook step 4).
- Real-device GPS and audio.
