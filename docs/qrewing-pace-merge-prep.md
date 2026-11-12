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
- Copy is unchanged. Speech has its own wording since 3c0466b: `spokenCue` in pace-core gives "5 minutes per kilometer" instead of "5:00 per km". The banner keeps the display copy. Speech itself is unverified until a build includes `expo-speech` (section 5).

## 5. Ready diff: `voice.ts` → expo-speech JS API (apply after the backend and event merge; not committed to code)

Checked against https://docs.expo.dev/versions/v58.0.0/sdk/speech/ (2026-11-12):
- Install: `npx expo install expo-speech`. Import: `import * as Speech from 'expo-speech'`.
- `Speech.speak(text, options?)` returns void. Options used here: `language`, `onDone`, `onStopped` (after `Speech.stop()`), `onError(error)`. Also available: `onStart`, `onBoundary`, `rate`, `pitch`, `volume`, `voice`, and iOS-only `useApplicationAudioSession`.
- `Speech.stop(): Promise<void>` "interrupts current speech and deletes all in queue". There is also `Speech.isSpeakingAsync()` and `Speech.maxSpeechInputLength`.
- No config plugin. iOS physical devices make no sound in silent mode. The simulator is fine; note it for device QA.
- Needs a native rebuild (new native module). The JS entry requires the native module, so the build must include it before this lands.

What changes:
- Drop `requireOptionalNativeModule('ExpoSpeech')`, the raw `speak(id, text, opts)` call and the `Exponent.speaking*` listeners. Per-utterance callbacks replace them, and each one calls `ended(id)`.
- `speech-queue.ts` is unchanged. It still sets one cue at a time and keeps only the newest waiting cue. The budget timer stays as a backstop if no callback comes. `finish()` ignores an unknown id, so a late `onStopped` after `stopSpeech()` is a no-op.
- `onError` vibrates, so the cue still registers, and moves on to the waiting cue.
- New `stopSpeech()`: resets the queue and calls `Speech.stop()`. pace-layer calls it when `running` ends (switch off, sharing off, activity ended) or the runner unmounts.
- Not changed: `useApplicationAudioSession` stays at its default. Ducking music while speaking is a device QA question for later.

```diff
--- a/mobile/src/features/pace/voice.ts
+++ b/mobile/src/features/pace/voice.ts
@@
-import { requireOptionalNativeModule } from 'expo';
+import * as Speech from 'expo-speech';
 import { Vibration } from 'react-native';
 
 import { enqueue, finish, newSpeechQueue, speechBudgetMs, type Utterance } from './speech-queue';
 
-/**
- * Spoken cues through expo-speech's native module when the app was built with it; null otherwise. ...
- */
-type Subscription = { remove(): void };
-type SpeechModule = {
-  speak(id: string, text: string, options: Record<string, unknown>): void;
-  addListener?(event: string, listener: (e: { id?: string }) => void): Subscription;
-};
-const speech = requireOptionalNativeModule<SpeechModule>('ExpoSpeech');
 let nextId = 0;
 
-/** Whether cues are spoken on this build. */
-export const canSpeak = speech != null;
+const VIBRATE = [0, 250, 150, 250];
 
 // One cue at a time: a cue that arrives while another is spoken waits for its end (only the newest waits).
 let queue = newSpeechQueue();
 let budgetTimer: ReturnType<typeof setTimeout> | null = null;
 
 function say(u: Utterance | null) {
-  if (!u || !speech) return;
+  if (!u) return;
   if (budgetTimer) clearTimeout(budgetTimer);
-  // If the end event never comes, the cue's time budget ends it.
+  // If no callback comes, the cue's time budget ends it.
   budgetTimer = setTimeout(() => ended(u.id), speechBudgetMs(u.text));
   try {
-    speech.speak(u.id, u.text, { language: 'en-US' });
+    Speech.speak(u.text, {
+      language: 'en-US',
+      onDone: () => ended(u.id),
+      onStopped: () => ended(u.id),
+      onError: () => {
+        Vibration.vibrate(VIBRATE);
+        ended(u.id);
+      },
+    });
   } catch {
-    Vibration.vibrate([0, 250, 150, 250]);
+    Vibration.vibrate(VIBRATE);
     ended(u.id);
   }
 }
@@
-if (speech?.addListener) {
-  for (const event of ['Exponent.speakingDone', 'Exponent.speakingStopped', 'Exponent.speakingError']) {
-    try {
-      speech.addListener(event, (e) => {
-        if (e?.id != null) ended(String(e.id));
-      });
-    } catch {
-      // No events: the time budget ends each cue.
-    }
-  }
-}
+/** Stops the cue being spoken and drops the waiting one (switch or sharing off, activity ended, screen left). */
+export function stopSpeech() {
+  queue = newSpeechQueue();
+  if (budgetTimer) {
+    clearTimeout(budgetTimer);
+    budgetTimer = null;
+  }
+  Speech.stop().catch(() => {});
+}
@@
 export function speak(text: string, spoken?: string) {
-  if (speech) {
-    const r = enqueue(queue, { id: String(++nextId), text: spoken ?? text }, Date.now());
-    queue = r.queue;
-    say(r.say);
-  } else {
-    Vibration.vibrate([0, 250, 150, 250]);
-  }
+  const r = enqueue(queue, { id: String(++nextId), text: spoken ?? text }, Date.now());
+  queue = r.queue;
+  say(r.say);
   for (const l of listeners) l(text);
 }
--- a/mobile/src/features/pace/pace-layer.tsx
+++ b/mobile/src/features/pace/pace-layer.tsx
@@
-import { onCue } from './voice';
+import { onCue, stopSpeech } from './voice';
@@ function PaceRunner
+  // Speech ends with the run on this screen: switch or sharing off, activity ended, or the runner unmounts.
+  useEffect(() => {
+    if (!running) return;
+    return stopSpeech;
+  }, [running]);
```

Before applying:
- `grep -rn canSpeak mobile/src`. It is exported today, so remove or replace any use. At 7d8eb4e it has no importer outside voice.ts; check again after the merge.
- Chat and Map can both mount the layer. Popping Map back to chat unmounts one runner, and `stopSpeech` cuts a cue in progress. This is acceptable because only the focused screen gives cues.

Device QA (physical iPhone): with the silent switch off, each cue is spoken with the `Spoken` wording and the banner shows. With the silent switch on, check what happens and record it. With this diff, vibration comes only from `onError` or a thrown `speak`. If iOS stays silent and reports `onDone`, the cue is banner-only with no vibration. If that happens, a follow-up should vibrate on every cue (or check the ringer state) so a silent phone still signals the cue.

After applying: `npx tsc --noEmit`, `npm test` (speech-queue tests unchanged), lint. Then rebuild both simulators and run `docs/evidence/qrewing-pace-qa-demo.md` steady to check speech. Without sound, check the banner and the `Spoken` column timing.

Stop on run stop (do this when applying the diff): add `export function stopSpeech()` to `voice.ts`. It calls `speech?.stop()`, drops the queued utterances (reset the queue, clear `budgetTimer`), and makes no vibration. Call it from PaceRunner's flush-on-stop cleanup in `pace-layer.tsx` (the `if (!running) return; return () => { flushRun(key); reloadHistory(); }` effect). That way End activity, switch off, sharing off and leaving the screen stop any cue that is still playing or queued. Device QA: end the activity right after a km cue starts; the cue stops and nothing plays after it. Until then, at most one queued cue can still play after End activity, because cues are at least 20 s apart.

## 6. Merge rehearsal (2026-11-12; throwaway worktree and branch, both deleted)

- Order: `main` (ed5a281), then qrewing-event `73b532d` (fast-forward), then qrewing-pace (`ort`, merged cleanly).
- Conflicts: none. No file is changed by both branches (`comm` of the two `main` diffs is empty).
- M2 `en.ts`: neither branch edits it yet, so it has no conflict. The string move stays a post-merge step: `en.qrewing` first, then `en.pace` (§1).
- M3 `features/recap/recap-store.ts`: rehearsed by importing `getActivitySummary` and `paceRecapLine` from `@/features/pace/summary` and replacing `pace: null` with `paceRecapLine(await getActivitySummary(roomId))`. It was not committed; it is to be applied by whoever owns recap at merge. `getActivitySummary` never rejects, and it counts a live run (2ba6451).
- After the merge plus M3: `npx tsc --noEmit` exit 0; `npm test` 436/436; `npx expo lint` exit 0.
- Not done in the rehearsal: `expo-speech` in package.json (needs a native rebuild), the `en.pace` move, and any device run.
