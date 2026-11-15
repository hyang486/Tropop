/**
 * Voice answers (Spec 11 C): after a question card is read aloud while I am moving, Trok listens once and keeps
 * the transcript as that card's draft. Nothing is sent by voice: the Questions screen shows the draft and I tap Send.
 * Recognition runs on the device when it can; audio is never saved or logged. Typing stays the fallback (no
 * permission, no recognizer, an error, or not moving). Module store read through useSyncExternalStore.
 */
import { requireOptionalNativeModule } from 'expo';
import { useSyncExternalStore } from 'react';

import { voiceTranscript } from './question-plan';

type Recognition = typeof import('expo-speech-recognition');
// The JS entry calls requireNativeModule, which throws on a build made before the module was added.
const recognition: Recognition | null =
  requireOptionalNativeModule('ExpoSpeechRecognition') != null
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('expo-speech-recognition') as Recognition)
    : null;

/** Hard stop for one listen, in case no end event comes. */
const LISTEN_MS = 15_000;

const drafts = new Map<string, string>();
const listeners = new Set<() => void>();
let listening = false;

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** The spoken draft for a card, if one was heard. */
export function useVoiceDraft(cardId: string): string | undefined {
  return useSyncExternalStore(subscribe, () => drafts.get(cardId));
}

export function clearVoiceDraft(cardId: string) {
  if (drafts.delete(cardId)) emit();
}

/** Drops all drafts (another account signed in). */
export function clearVoiceDrafts() {
  if (drafts.size === 0) return;
  drafts.clear();
  emit();
}

/**
 * Listens once for an answer to `cardId`. Asks for the microphone and speech permissions on first use. Resolves the
 * transcript (also kept as the card's draft), or null when nothing usable was heard or voice is unavailable.
 */
export async function listenForAnswer(cardId: string): Promise<string | null> {
  if (!recognition || listening) return null;
  const mod = recognition.ExpoSpeechRecognitionModule;
  listening = true;
  try {
    if (!mod.isRecognitionAvailable()) return null;
    const perm = await mod.requestPermissionsAsync();
    if (!perm.granted) return null;
    const text = await new Promise<string | null>((resolve) => {
      let best: string | null = null;
      const subs: { remove(): void }[] = [];
      const done = (t: string | null) => {
        clearTimeout(timer);
        for (const s of subs) s.remove();
        resolve(t);
      };
      const timer = setTimeout(() => {
        mod.abort();
        done(best);
      }, LISTEN_MS);
      subs.push(
        mod.addListener('result', (e) => {
          best = voiceTranscript(e.results) ?? best;
        }),
        mod.addListener('error', () => done(null)),
        mod.addListener('end', () => done(best)),
      );
      try {
        mod.start({
          lang: 'en-US',
          interimResults: false,
          continuous: false,
          maxAlternatives: 1,
          addsPunctuation: true,
          requiresOnDeviceRecognition: mod.supportsOnDeviceRecognition(),
          iosTaskHint: 'dictation',
          recordingOptions: { persist: false },
        });
      } catch {
        done(null);
      }
    });
    if (text) {
      drafts.set(cardId, text);
      emit();
    }
    return text;
  } catch {
    return null;
  } finally {
    listening = false;
  }
}
