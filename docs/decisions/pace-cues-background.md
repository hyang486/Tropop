# Decision prep: pace voice cues with the Map closed or the screen locked

Status: OPEN, waiting for a human decision. Author: developer-pace, 2026-11-14, from local main `0ceda26`. No spike was built; no app.json, app config or Info.plist change was made.

## Question

Should pace voice cues keep playing (1) when the room's Map tab is not in front but the app is open, and (2) when the app is in the background or the screen is locked?

## Current behavior (code at 0ceda26)

- Cues run only while `live = running && focused` (`mobile/src/features/pace/pace-layer.tsx:85-90`): activity active, pace on, my sharing on, plan allows it, and the Map tab focused.
- Pace is fed from my own `live_presence` row (`pace-layer.tsx:106-130`), which the foreground reporter writes. The reporter uses `watchPositionAsync` and stops when `AppState` is not `active` (`mobile/src/lib/location.ts:415-430, 545`).
- Speech is `expo-speech` (`AVSpeechSynthesizer`), with no audio session setup of our own.
- The generated Info.plist has no `UIBackgroundModes` and no "Always" location string (checked on the 0ceda26 prebuild). app.json sets `isIosBackgroundLocationEnabled: false` and the location string promises "only while you share it during an activity and the app is open"; the in-app hint `shareMineHint` says "Only while the app is open."

## Product constraints already decided

- `planning/USER_DECISIONS_2026-11-04_OPERATIONS_EN.md:43`: "No background tracking and no paid services."
- `planning/APP_CONCEPT_KO.md:79, 272`: continuous background sharing with the screen locked or the phone in a pocket is follow-up work, and unverified lock-screen behavior must not be shown as done.

Background cues (case 2) need background location, so they would reverse the first decision. That reversal is the human's call; this doc only lays out the cost.

## What iOS needs (Expo SDK 58 docs, checked 2026-11-14)

| Need | SDK 58 mechanism | Change |
|---|---|---|
| Location while backgrounded | `watchPositionAsync` "Updates will only occur while the application is in the foreground." Background requires `Location.startLocationUpdatesAsync` with a task defined by `TaskManager.defineTask` at top level, "Always" permission via `requestBackgroundPermissionsAsync`, and `location` in `UIBackgroundModes`. | `expo-location` plugin `isIosBackgroundLocationEnabled: true` (prebuild adds the mode) and `locationAlwaysAndWhenInUsePermission` string; add `expo-task-manager` (not installed now, native dependency, so a new build). |
| Speech while backgrounded | `expo-speech` docs say nothing about background playback. It sets only `usesApplicationAudioSession` (`node_modules/expo-speech/ios/SpeechModule.swift:57`). Playing audio from the background needs the `audio` background mode and an active playback-category audio session. | `audio` in `UIBackgroundModes`: either `expo-audio` (not installed; its plugin `enableBackgroundPlayback` adds `audio`, and `setAudioModeAsync({ shouldPlayInBackground: true, interruptionMode: 'duckOthers' })` sets the session) or an `ios.infoPlist.UIBackgroundModes` entry plus session setup. |
| Silent switch | `expo-speech`: no sound in silent mode. `expo-audio` `playsInSilentMode` (default true) controls this when we own the session. | Comes with the audio session work above. |

The `audio` mode alone does not keep the JS running, because iOS suspends an app that is not playing. The `location` mode is what keeps the app alive between cues. Using silent audio to stay alive is a known App Store rejection reason, so this doc does not offer it as an option.

## Options

### A. Map closed, app open: keep cues on any room tab (recommended now)

- Change: let the pace layer run while the room screen is open and the app is active, not only while the Map tab is focused. Keep the presence read (needed for the gap to the lead group) subscribed while pace is running on any room tab.
- Effort: about half a day in `features/pace` plus tests; simulator QA (switch to Chat or Photos during an active run and hear cues).
- Risk: low. No config, Info.plist, permission or consent copy change; fits "No background tracking." Cost: the presence subscription stays open on other tabs during an active run (more realtime refetches while the run is on).
- Locking the screen still stops cues; they resume when the user returns. The pace card should keep saying so.

### B. Screen locked: full background cues (follow-up, needs the human to reverse "No background tracking")

- Change: `isIosBackgroundLocationEnabled: true`; "Always" permission flow and strings; `expo-task-manager`; a background location task that feeds the pace engine from local fixes (the presence row is not refreshed in the background today); the background `audio` mode and audio session setup for speech; `showsBackgroundLocationIndicator: true`, `activityType: Fitness`.
- Decide separately: does the background task also keep writing my position to the room (`live_presence`)? If yes, room members see me while my phone is locked, which is new data sharing; if no, pace works only for me.
- Effort: about 2–3 days plus a native rebuild, and real-iPhone QA. The simulator cannot show real battery use, suspension timing or GPS in a pocket.
- App Store risk: medium. Apple reviews background location and the "Always" request against a visible user benefit (Guidelines 2.5.4 and 5.1.1). A fitness pace cue is a recognised use, but the purpose strings and in-app explanation must match. No App Store submission is planned now (no paid Developer Program), so this risk applies later.
- Battery: continuous high-accuracy GPS plus speech for the whole run. Expect a clear drain per hour of running; not measured here. Deferred updates would cut it but delay cues, so they do not suit pace.
- Privacy and consent copy: the location purpose string, `shareMineHint` ("Only while the app is open."), the share toggle wording and any privacy text must change to say location continues while locked during an active run, and how to stop it. iOS also asks again later ("continue allowing Always?"), which needs a fallback when the user downgrades.

### C. Keep today's behavior (Map in front only)

- Effort: none. Risk: none. Weakness: a runner who opens Chat mid-run loses cues with no warning other than the card state.

## Recommendation

Do A now. It removes the most common gap (switching tabs mid-run) with no permission, config or consent change and stays inside the approved "No background tracking" decision. Keep B as the follow-up already listed in `APP_CONCEPT_KO.md:272`. Start it only if the human reverses the 11-04 decision, and decide first whether background fixes are shared with the room or kept local.

## Human decision needed

1. Approve A (cues on any room tab while the app is open)? Yes / no.
2. For B: reverse "No background tracking" now, later, or not at all? If yes, are locked-screen fixes shared with the room or kept local to pace?
