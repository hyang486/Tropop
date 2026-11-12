# Pace maker GPS demo (simulators)

`scripts/pace-gps-demo.mjs` moves the simulated location of one or two iOS simulators so qa can see the pace maker (spec 3) without running outside. It only calls `xcrun simctl location`, and it does not touch the app, the database or any account.

**Demo route:** JFK Drive in Golden Gate Park, from the Stanyan entrance west to Spreckels Lake, about 3.6 km. This is a demo route picked for the script. It is not a spec requirement, and the app has no route data.

```sh
node scripts/pace-gps-demo.mjs <steady|gap|stop|clear> [--host <udid>] [--guest <udid>] [--dry-run]
```

- The default devices are the host on iPhone 17 Pro (`91F3BFB3-…`) and the guest on iPhone 17 (`F11BA960-…`). Override them with `--host` and `--guest`.
- `--dry-run` prints the legs and the `simctl` commands and moves nothing.
- Ctrl-C clears the location on the devices it was driving. Run `clear` after every scenario.
- Updates come every 2 s. The app's location reporter still sends at most every 5 s or 10 m.

## Setup before each scenario

1. Both devices are in the same room, with an activity started by the host.
2. On each device that is driven, Map → Pace maker switch on, and Share my location on.
3. Target: set **Target pace 5:00** on each driven device, so that the cues below are predictable. "My usual pace" depends on the saved history on that phone.

Times below come from the scenario's start. GPS smoothing and the reporter's cadence move them by several seconds.

## steady (host only)

The host runs the whole route at 5:00 per km, which takes about 18 minutes.

What to look for:

- A km cue near 5:00, 10:00 and 15:00 (`Kilometer 1: 5:00 per km, target 5:00.`). It is spoken when voice is available. Without voice you get a vibration and the banner.
- No "Pick it up" or "Ease off" cue, because the pace stays within 5% of the target.
- The live card shows about 3.58 km, about 17:56 and 5:00 per km at the end.
- No stationary sheet.

## gap (host and guest)

The host leads at 5:00 per km. The guest runs 6:40 per km for 6 minutes, falling about 300 m behind, then 3:42 per km for about 4 minutes to catch up, then 5:00 per km with the host.

What to look for on the guest:

- A "Pick it up" cue early in the slow part, before the guest is 150 m behind.
- A gap cue (`Lead group … meters ahead. Run … per km to catch them in 3 minutes.`) once the guest is more than 150 m behind, near 3:00. It repeats at most every 2 minutes (near 5:00 and 7:00) while the guest is still more than 150 m behind. While the gap cue applies, it replaces the "Pick it up" and "Ease off" cues.
- Gap cues stop once the guest is back within 150 m, near 8:10. An "Ease off" cue can follow during the rest of the fast part, up to about 10:17.
- Pace and gap cues come at least 20 s after the previous cue. Km cues are not held back yet. The voice-cue cadence item (no overlapping speech) is still open, so treat an overlap at a km mark as known.
- The host gets km cues as in `steady`, and no gap cue, because the host is the lead group.

## stop (host only)

The host runs 600 m at 5:00 per km (3:00), stands still for 4 minutes, then runs another 700 m (3:30).

What to look for:

- The stationary sheet ("You've stopped for 3 minutes. Everything okay?") near 6:00, about 3 minutes into the stop. Dismiss closes it. Emergency goes only through its confirm.
- The stop adds no distance or time. The live card's time does not grow while standing.
- The km 1 cue comes after 5:00 of moving time (near 9:00 on the clock), with a split of about 5:00.
- At the recap, the pace line reads about `Pace maker: 1.30 km, moving 6:30, total 10:30, 5:00 per km`. This needs the event branch's recap wiring, which is still pending.

## clear

```sh
node scripts/pace-gps-demo.mjs clear
```

Clears the simulated location on both devices.
