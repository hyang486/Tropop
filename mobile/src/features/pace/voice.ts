import { requireOptionalNativeModule } from 'expo';
import { Vibration } from 'react-native';

import { enqueue, finish, newSpeechQueue, speechBudgetMs, type Utterance } from './speech-queue';

/**
 * Spoken cues through expo-speech's native module when the app was built with it; null otherwise. The JS
 * package is not imported: its entry calls requireNativeModule, which throws on a build without the module, and
 * this keeps the fallback below for such a build. The module name, call and events match expo-speech 58
 * (`ExpoSpeech.speak(id, text, options)`, `Exponent.speakingDone` and friends with `{ id }`); unverified until a
 * build includes it.
 */
type Subscription = { remove(): void };
type SpeechModule = {
  speak(id: string, text: string, options: Record<string, unknown>): void;
  addListener?(event: string, listener: (e: { id?: string }) => void): Subscription;
};
const speech = requireOptionalNativeModule<SpeechModule>('ExpoSpeech');
let nextId = 0;

/** Whether cues are spoken on this build. */
export const canSpeak = speech != null;

// One cue at a time: a cue that arrives while another is spoken waits for its end (only the newest waits).
let queue = newSpeechQueue();
let budgetTimer: ReturnType<typeof setTimeout> | null = null;

function say(u: Utterance | null) {
  if (!u || !speech) return;
  if (budgetTimer) clearTimeout(budgetTimer);
  // If the end event never comes, the cue's time budget ends it.
  budgetTimer = setTimeout(() => ended(u.id), speechBudgetMs(u.text));
  try {
    speech.speak(u.id, u.text, { language: 'en-US' });
  } catch {
    Vibration.vibrate([0, 250, 150, 250]);
    ended(u.id);
  }
}

function ended(id: string) {
  const r = finish(queue, id, Date.now());
  queue = r.queue;
  if (!queue.speaking && budgetTimer) {
    clearTimeout(budgetTimer);
    budgetTimer = null;
  }
  say(r.say);
}

if (speech?.addListener) {
  for (const event of ['Exponent.speakingDone', 'Exponent.speakingStopped', 'Exponent.speakingError']) {
    try {
      speech.addListener(event, (e) => {
        if (e?.id != null) ended(String(e.id));
      });
    } catch {
      // No events: the time budget ends each cue.
    }
  }
}

type Listener = (text: string) => void;
const listeners = new Set<Listener>();

/** The on-screen cue banner subscribes here; every cue is also shown, spoken or not. */
export function onCue(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Speaks a cue when possible (after the one being spoken), otherwise vibrates; the banner shows it either way. */
export function speak(text: string) {
  if (speech) {
    const r = enqueue(queue, { id: String(++nextId), text }, Date.now());
    queue = r.queue;
    say(r.say);
  } else {
    Vibration.vibrate([0, 250, 150, 250]);
  }
  for (const l of listeners) l(text);
}
