// Ask Qrewing (spec 10.1, UX P0-2): a floating button in chat, a header icon on map, info and photos; only when the
// room has Qrewing AI on and the probe answers ok, or AI is off and the asker is on Plus (askMode). With AI on, a
// tap shows consent before the asker agrees to Qrewing AI here; the personal (AI off) mode needs no consent.
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EnterView } from '@/components/enter-view';
import { colors } from '@/components/ui';
import { plusIntroHref } from '@/features/calendar/plus-intro';
import { en } from '@/i18n/en';

import { type AskProbe, askMode } from './ask-plan';
import { DisclosureSheet } from './disclosure-sheet';
import { probeQrewing, useQrewingRoom } from './qrewing-api';
import { QREWING_OFFLINE_RETRY_MS } from './qrewing-plan';
import type { QrewingError } from './types';
import { QREWING_FAB_MARGIN, QREWING_FAB_SIZE } from './qrewing-fab-size';

const s = en.qrewing.ask;
const ART = require('../../../assets/images/icon.png');
export { QREWING_FAB_CLEARANCE, QREWING_FAB_MARGIN, QREWING_FAB_SIZE } from './qrewing-fab-size';

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
    reads: q.reads,
  };
}

/**
 * The Ask Qrewing tap with its consent step, for a floating button or a header icon. `open` pushes the ask
 * screen, or shows the consent sheet first; render `sheet` once in the screen body. Use it only on a live room
 * (never in grace or on Room ended).
 */
export function useQrewingAskButton(roomId: string) {
  const router = useRouter();
  const { available, mode, agreed, reload, reads } = useQrewingAsk(roomId);
  const [consent, setConsent] = useState(false);
  // Set when the consent sheet saved an answer: the ask screen opens once the reload shows I agreed.
  const openAfterConsent = useRef(false);
  // UX2-112: the read count when Agree saved. The sheet stays open (Agree busy) until a later read ends; if that
  // read failed or still shows no consent, the sheet says so and Agree is the retry.
  const [confirmFrom, setConfirmFrom] = useState<number | null>(null);
  const done = confirmFrom !== null && reads > confirmFrom;
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
        setConfirmFrom(reads);
        reload();
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

/**
 * UX P0-2: the floating Q, only in chat (calendar has its own). Mount it as the last child of the area that ends
 * at the top of the composer: 12 pt above it, 16 pt from the trailing edge. The list under it pads its bottom by
 * QREWING_FAB_CLEARANCE (composer + 64 pt in all). Other room screens use QrewingHeaderButton instead. `ask` is the
 * room screen's one useQrewingAskButton, shared with the "answered your question" notice (UX2-04).
 */
export function QrewingFab({ ask }: { ask: ReturnType<typeof useQrewingAskButton> }) {
  const insets = useSafeAreaInsets();
  const { available, open, sheet } = ask;
  if (!available) return null;
  return (
    <>
      <EnterView style={[styles.fab, { bottom: QREWING_FAB_MARGIN, right: insets.right + 16 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={s.fabLabel}
          onPress={open}
          hitSlop={6}
          style={({ pressed }) => [styles.fabHit, pressed && styles.pressed]}
        >
          <Image source={ART} style={styles.art} contentFit="cover" accessibilityIgnoresInvertColors />
          <View style={styles.ring} pointerEvents="none" />
        </Pressable>
      </EnterView>
      {sheet}
    </>
  );
}

/** UX P0-2: Ask Qrewing as a 44 pt header icon (the Qrewing mark at 22 pt) on map, info and photos. */
export function QrewingHeaderButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={s.fabLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
    >
      <View style={styles.mark}>
        <Image source={ART} style={styles.art} contentFit="cover" accessibilityIgnoresInvertColors />
        <View style={[styles.ring, styles.markRing]} pointerEvents="none" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: QREWING_FAB_SIZE,
    height: QREWING_FAB_SIZE,
    borderRadius: QREWING_FAB_SIZE / 2,
  },
  fabHit: { width: '100%', height: '100%', borderRadius: QREWING_FAB_SIZE / 2 },
  // A thin ink ring, so the cream art stays visible on the cream screen (themed, no hard-coded shadow color).
  ring: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: QREWING_FAB_SIZE / 2, borderWidth: 1.5, borderColor: colors.label },
  art: { width: '100%', height: '100%', borderRadius: 999 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 22, height: 22 },
  markRing: { borderRadius: 11, borderWidth: 1 },
  pressed: { opacity: 0.7 },
});
