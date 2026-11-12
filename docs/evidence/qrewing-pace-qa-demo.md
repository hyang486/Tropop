# Pace maker QA demo script

For qa on the simulators. The event demo script is developer-event's separate file in this folder. Driver: `scripts/pace-gps-demo.mjs` (README `scripts/pace-gps-demo.md`). It only calls `xcrun simctl location` and does not touch the app, the database or any account.

**Voice:** this branch's `package.json` has no `expo-speech`. On the current builds a cue is a vibration plus the banner. The "Spoken" column applies only to a build that includes `expo-speech` (unverified until then). The spoken wording is `spokenCue` in `features/pace/pace-core.ts`, tested in `tests/pace-spoken.test.mjs`.

## Devices

| Role | Simulator | UDID |
|---|---|---|
| Host | iPhone 17 Pro | `91F3BFB3-…` (script default; override with `--host`) |
| Guest | iPhone 17 | `F11BA960-…` (script default; override with `--guest`) |

Check the installed app id on each simulator before installing (see the simulator keychain notes).

## Setup (before each scenario)

1. Both devices are in the same sports room with location allowed, and the host has started the activity.
2. On each driven device: Map → Pace maker switch on, Share my location on.
3. On each driven device: Target → Target pace → `5:00` → Save target.
4. Dry run first: `node scripts/pace-gps-demo.mjs <scenario> --dry-run`.
5. After the scenario: `node scripts/pace-gps-demo.mjs clear`.

Times are from the scenario start. Smoothing and the reporter cadence (every 5 s or 10 m) move them by several seconds, and splits by a few seconds. No cue comes within 20 s of the previous one.

## steady (host only, about 18 min)

`node scripts/pace-gps-demo.mjs steady`

| When | Banner | Spoken |
|---|---|---|
| ~5:00 | `Kilometer 1: 5:00 per km, target 5:00.` | `1 kilometer, split 5 minutes, target 5 minutes.` |
| ~10:00 | `Kilometer 2: 5:00 per km, target 5:00.` | `2 kilometers, split 5 minutes, target 5 minutes.` |
| ~15:00 | `Kilometer 3: 5:00 per km, target 5:00.` | `3 kilometers, split 5 minutes, target 5 minutes.` |

Also check:
- No "Pick it up" or "Ease off" cue, and no stationary sheet.
- The live card at the end reads about `3.58 km · 17:56 · 5:00 per km`.

## gap (host and guest, about 18 min)

`node scripts/pace-gps-demo.mjs gap`

Guest:

| When | Banner | Spoken |
|---|---|---|
| early, slow part | `Pick it up: 6:40 per km, target 5:00.` (pace may read a little faster while it settles) | `Pick it up: 6 minutes 40 seconds per kilometer, target 5 minutes.` |
| ~3:00, then at most every 2 min while >150 m behind (~5:00, ~7:00) | `Lead group N meters ahead. Run m:ss per km to catch them in 3 minutes.` | `Lead group N meters ahead. Run M minutes S seconds per kilometer to catch them in 3 minutes.` (`1.2 kilometers` style at 1000 m or more) |
| after ~8:10 (back within 150 m), up to ~10:17 | maybe `Ease off: 3:42 per km, target 5:00.` | `Ease off: 3 minutes 42 seconds per kilometer, target 5 minutes.` |
| km crossings | `Kilometer n: m:ss per km, target 5:00.` | `n kilometers, split M minutes S seconds, target 5 minutes.` |

- While the gap cue applies, it replaces "Pick it up" and "Ease off".
- With voice: one cue at a time. A cue that arrives during speech is said after it, and only the newest waiting cue is kept.

Host: km cues as in `steady`, and no gap cue (the host is the lead group).

## stop (host only, about 10.5 min)

`node scripts/pace-gps-demo.mjs stop`

| When | Banner or sheet | Spoken |
|---|---|---|
| ~6:00 (3 min into the stop) | Sheet: `You've stopped for 3 minutes. Everything okay?` | the same sentence |
| ~9:00 (5:00 of moving time) | `Kilometer 1: 5:00 per km, target 5:00.` | `1 kilometer, split 5 minutes, target 5 minutes.` |

- Dismiss closes the sheet. Emergency goes only through its confirm (do not send it in this demo).
- The live card's time does not grow while standing, and the stop adds no distance.
- Recap line (after the event branch's recap wiring, still pending): about `Pace maker: 1.30 km, moving 6:30, total 10:30, 5:00 per km`.

## Switch off mid-run (manual, host)

Run `steady`. Near 4:00, turn the Pace maker switch off with the Map screen open, wait 2 min, then turn it on again.

- The distance while off is not counted. The card resumes from the value it showed at switch-off.
- Leaving the screen with the switch still on does count the gap as a straight line (expected).

## Evidence

Save screenshots here as `YYYY-MM-DD-pace-<scenario>-<what>.png`, and note the banner text and time for each cue.
