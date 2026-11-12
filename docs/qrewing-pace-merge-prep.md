# qrewing-pace merge prep

Pace branch `qrewing-pace` at 376a10d. This follows the event plan in `qrewing-event` `docs/qrewing-event-merge-prep.md` (6b, section "Pace"): event's strings go in first, then pace's. Nothing here has been applied. `en.ts` is a shared file and changes only at the merge step.

## 1. `features/pace/strings.ts` → `en.pace`

- Target: a new top-level section `en.pace`, with the keys unchanged. `en` has no `pace` key today (sections: welcome … planPreview, auth, errors).
- Keys (28, flat): title, switchHint, needsSharing, needsActivity, target, targetUsual(), targetPace, targetTime, pacePlaceholder, distancePlaceholder, distanceLabel, timePlaceholder, timeLabel, perKm, save, saved, invalidPace, invalidTime, noTarget, recap(), stats(), cueKm(), cueSlow(), cueFast(), cueGap(), cueDismiss, stationaryTitle, dismiss.
- Do not flatten into `en.qrewing`, because pace's `recap()`, `save`/`saved` and `dismiss` would collide in meaning with `en.qrewing.recap` and other event keys.
- `km()` (meters → "2.40") is a module helper used by `recap()` and `stats()`. Keep it as a local function in `en.ts` next to `pace`, or inline `(m / 1000).toFixed(2)` in those two functions.
- Importers to switch (4). Each one does `import { paceStrings as t } from './strings'`. Change it to `import { en } from '@/i18n/en'` and `const t = en.pace` so the call sites stay the same.
  - `features/pace/engine.ts` (cue text)
  - `features/pace/pace-card.tsx`
  - `features/pace/pace-layer.tsx`
  - `features/pace/summary.ts` (`recap()`)
- Then delete `features/pace/strings.ts`. No test imports it (the tests import `pace-core.ts` only).

## 2. Recap join (spec 3.3; after event is on main)

- `features/recap/recap-store.ts` (event) returns `pace: null`, with a comment that marks the join.
- Join: `pace: paceRecapLine(await getActivitySummary(roomId))`, both from `features/pace/summary.ts`. `getActivitySummary` never rejects. `paceRecapLine(null)` is `null`, so the recap card (`me.pace`, a `string | null`) needs no change.
- History is on-device only (AsyncStorage). The line shows only on the phone that ran.

## 3. File overlap with event and backend

- Pace touches `features/pace/*`, `app/room/[id]/map.tsx`, `components/status-picker.tsx` and `tests/pace-*.test.mjs`. The event plan's trial stack (event + pace ff64b2c + backend 8544792) had 0 textual conflicts. Pace commits since then (67bb2ac, 376a10d and this note) touch only `features/pace/{engine,pace-core}.ts`, `pace-layer.tsx`, `tests/pace-{edge,scenarios}.test.mjs` and `docs/`.
- After the merge, check that `npm test` still picks up `tests/pace-*.test.mjs`. Backend changes `mobile/package.json`.

## 4. Copy and theme pass (code level)

- Colors: the pace UI uses only `colors` tokens from `components/ui` (`tint`/`onTint` are DynamicColorIOS, labels are PlatformColor). The one literal is the banner shadow `rgba(0,0,0,0.18)`. Dark mode on device is a qa item after the rebuild.
- Copy is unchanged. Open item for voice: cue text shares the banner string, so pace reads as "5:00 per km". Speech engines may read "5:00" as a clock time. Check this when `expo-speech` is in a build (not in this branch's `package.json`). If it misreads, add a spoken variant (for example "5 minutes per kilometer") in `voice.ts` instead of changing the banner copy.
