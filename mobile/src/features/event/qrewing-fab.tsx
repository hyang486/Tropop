// Ask Qrewing (spec 10.1, UX3-B05): a 36 pt button in the chat composer while the field is empty; only when the
// room has Qrewing AI on and the probe answers ok, or AI is off and the asker is on Plus (askMode). With AI on, a
// tap shows consent before the asker agrees to Qrewing AI here; the personal (AI off) mode needs no consent.
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { colors } from '@/components/ui';
import { plusIntroHref } from '@/features/calendar/plus-intro';

import { type AskProbe, askMode } from './ask-plan';
import { DisclosureSheet } from './disclosure-sheet';
import { probeQrewing, useQrewingRoom } from './qrewing-api';
import { QREWING_OFFLINE_RETRY_MS } from './qrewing-plan';
import type { QrewingError } from './types';

const ART = require('../../../assets/images/icon.png');

/**
 * The room's Qrewing switch, the probe (room AI and my plan, no model call) and my consent. `available` is false
 * until the probe answers; it runs again when the switch changes. The personal mode counts as agreed (no consent).
 */
export function useQrewingAsk(roomId: string) {
  const q = useQrewingRoom(roomId);
  // Keyed by the switch it was taken under: right after the switch flips, the old answer counts as no answer.
  const [probe, setProbe] = useState<(AskProbe & { ai: boolean; error?: QrewingError }) | null>(null);
  const [probeTick, setProbeTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const ai = q.aiEnabled;
    probeQrewing(roomId).then(
      (r) => alive && setProbe('error' in r ? { roomId, ok: false, ai, error: r.error } : { roomId, ...r, ai }),
    );
    return () => {
      alive = false;
    };
  }, [roomId, q.aiEnabled, probeTick]);
  // UX2-111: after an offline probe the button would stay hidden; probe again on foreground and every 30 s, as
  // useQrewingChat does. No visible change until a probe answers ok.
  const offline = probe?.roomId === roomId && probe?.error === 'network';
  useEffect(() => {
    if (!offline) return;
    const t = setInterval(() => setProbeTick((n) => n + 1), QREWING_OFFLINE_RETRY_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setProbeTick((n) => n + 1);
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [offline]);
  const mode = askMode(q.aiEnabled, probe?.ai === q.aiEnabled ? probe : null, roomId);
  return {
    available: mode !== null,
    mode,
    agreed: mode === 'personal' || !!q.me?.aiOk,
    reload: q.reload,
    readDone: q.readDone,
  };
}

/**
 * The Ask Qrewing tap with its consent step, for the composer button. `open` pushes the ask
 * screen, or shows the consent sheet first; render `sheet` once in the screen body. Use it only on a live room
 * (never in grace or on Room ended).
 */
export function useQrewingAskButton(roomId: string) {
  const router = useRouter();
  const { available, mode, agreed, reload, readDone } = useQrewingAsk(roomId);
  const [consent, setConsent] = useState(false);
  // Set when the consent sheet saved an answer: the ask screen opens once the reload shows I agreed.
  const openAfterConsent = useRef(false);
  // UX2-112: the seq of the read started after Agree saved. The sheet stays open (Agree busy) until that read (or a
  // newer one) ends; if it failed or still shows no consent, the sheet says so and Agree is the retry.
  const [confirmFrom, setConfirmFrom] = useState<number | null>(null);
  const done = confirmFrom !== null && readDone >= confirmFrom;
  const confirmFailed = done && !agreed;

  useEffect(() => {
    if (!openAfterConsent.current || !agreed || !done) return;
    openAfterConsent.current = false;
    router.push({ pathname: '/room/[id]/ask', params: { id: roomId } });
  }, [agreed, done, roomId, router]);

  // A Free asker in an AI-on room goes straight to the Plus intro (Ask is Plus on the caller's own plan).
  const open = () => {
    setConfirmFrom(null);
    setConsent(false);
    if (mode === 'plus') router.push(plusIntroHref('ask'));
    else if (agreed) router.push({ pathname: '/room/[id]/ask', params: { id: roomId } });
    else setConsent(true);
  };
  const sheet = mode === 'room' ? (
    <DisclosureSheet
      roomId={roomId}
      visible={consent && !(done && agreed)}
      confirming={confirmFrom !== null && !done}
      confirmFailed={confirmFailed}
      onDone={(agree) => {
        if (!agree) {
          setConsent(false);
          reload();
          return;
        }
        openAfterConsent.current = true;
        // onDone runs after the save resolved, so this read starts after it.
        setConfirmFrom(reload());
      }}
      onClose={() => {
        setConsent(false);
        setConfirmFrom(null);
        openAfterConsent.current = false;
      }}
    />
  ) : null;
  return { available, open, sheet };
}

/** UX3-B05: the Qrewing mark for the composer slot, 36 pt round with a 1.5 pt ink outline (the Composer owns the tap). */
export function QrewingComposerMark() {
  return (
    <View style={styles.composerMark}>
      <Image source={ART} style={styles.art} contentFit="cover" accessibilityIgnoresInvertColors />
      <View style={styles.ring} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  composerMark: { width: 36, height: 36, borderRadius: 18 },
  // A thin ink ring, so the cream art stays visible on the cream field (themed, no hard-coded shadow color).
  ring: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 18, borderWidth: 1.5, borderColor: colors.label },
  art: { width: '100%', height: '100%', borderRadius: 999 },
});
