import { requireOptionalNativeModule } from 'expo';
import { Vibration } from 'react-native';

/**
 * Spoken cues through expo-speech's native module when the app was built with it; null otherwise. The JS
 * package is not imported (it is not installed: adding it needs a native rebuild the human has not approved,
 * spec 5a), so this build always takes the fallback below. The module name and call match expo-speech 14
 * (`ExpoSpeech.speak(id, text, options)`); unverified until a build includes it.
 */
type SpeechModule = { speak(id: string, text: string, options: Record<string, unknown>): void };
const speech = requireOptionalNativeModule<SpeechModule>('ExpoSpeech');
let nextId = 0;

/** Whether cues are spoken on this build. */
export const canSpeak = speech != null;

type Listener = (text: string) => void;
const listeners = new Set<Listener>();

/** The on-screen cue banner subscribes here; every cue is also shown, spoken or not. */
export function onCue(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Speaks a cue when possible, otherwise vibrates; the banner shows it either way. */
export function speak(text: string) {
  let spoken = false;
  if (speech) {
    try {
      speech.speak(String(++nextId), text, { language: 'en-US' });
      spoken = true;
    } catch {
      spoken = false;
    }
  }
  if (!spoken) Vibration.vibrate([0, 250, 150, 250]);
  for (const l of listeners) l(text);
}
