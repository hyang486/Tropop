// Ask Qrewing (spec 10.1, UX P0-2): a floating button in chat, a header icon on map, info and photos; only when the
// room has Qrewing AI on and the probe answers ok. Before the asker agrees to Qrewing AI here, a tap shows consent.
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/components/ui';
import { en } from '@/i18n/en';

import { askFabVisible } from './ask-plan';
import { DisclosureSheet } from './disclosure-sheet';
import { probeQrewing, useQrewingRoom } from './qrewing-api';
import { QREWING_FAB_MARGIN, QREWING_FAB_SIZE } from './qrewing-fab-size';

const s = en.qrewing.ask;
const ART = require('../../../assets/images/icon.png');
export { QREWING_FAB_CLEARANCE, QREWING_FAB_MARGIN, QREWING_FAB_SIZE } from './qrewing-fab-size';

/** The room's Qrewing switch plus a probe ok (no plan check), and my consent. `available` is false until both answer. */
export function useQrewingAsk(roomId: string) {
  const q = useQrewingRoom(roomId);
  const [probe, setProbe] = useState<{ roomId: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!q.aiEnabled) return;
    let alive = true;
    probeQrewing(roomId).then((r) => alive && setProbe({ roomId, ok: !('error' in r) }));
    return () => {
      alive = false;
    };
  }, [roomId, q.aiEnabled]);
  const available = askFabVisible(q.aiEnabled, probe, roomId);
  return { available, agreed: !!q.me?.aiOk, reload: q.reload };
}

/**
 * The Ask Qrewing tap with its consent step, for a floating button or a header icon. `open` pushes the ask
 * screen, or shows the consent sheet first; render `sheet` once in the screen body. Use it only on a live room
 * (never in grace or on Room ended).
 */
export function useQrewingAskButton(roomId: string) {
  const router = useRouter();
  const { available, agreed, reload } = useQrewingAsk(roomId);
  const [consent, setConsent] = useState(false);
  // Set when the consent sheet saved an answer: the ask screen opens once the reload shows I agreed.
  const openAfterConsent = useRef(false);

  useEffect(() => {
    if (!openAfterConsent.current || !agreed) return;
    openAfterConsent.current = false;
    router.push({ pathname: '/room/[id]/ask', params: { id: roomId } });
  }, [agreed, roomId, router]);

  const open = () => (agreed ? router.push({ pathname: '/room/[id]/ask', params: { id: roomId } }) : setConsent(true));
  const sheet = available ? (
    <DisclosureSheet
      roomId={roomId}
      visible={consent}
      onDone={() => {
        setConsent(false);
        openAfterConsent.current = true;
        reload();
      }}
      onClose={() => setConsent(false)}
    />
  ) : null;
  return { available, open, sheet };
}

/**
 * UX P0-2: the floating Q, only in chat (calendar has its own). Mount it as the last child of the area that ends
 * at the top of the composer: 12 pt above it, 16 pt from the trailing edge. The list under it pads its bottom by
 * QREWING_FAB_CLEARANCE (composer + 64 pt in all). Other room screens use QrewingHeaderButton instead.
 */
export function QrewingFab({ roomId }: { roomId: string }) {
  const insets = useSafeAreaInsets();
  const { available, open, sheet } = useQrewingAskButton(roomId);
  if (!available) return null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={s.fabLabel}
        onPress={open}
        hitSlop={6}
        style={({ pressed }) => [styles.fab, { bottom: QREWING_FAB_MARGIN, right: insets.right + 16 }, pressed && styles.pressed]}
      >
        <Image source={ART} style={styles.art} contentFit="cover" accessibilityIgnoresInvertColors />
        <View style={styles.ring} pointerEvents="none" />
      </Pressable>
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
  // A thin ink ring, so the cream art stays visible on the cream screen (themed, no hard-coded shadow color).
  ring: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: QREWING_FAB_SIZE / 2, borderWidth: 1.5, borderColor: colors.label },
  art: { width: '100%', height: '100%', borderRadius: 999 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 22, height: 22 },
  markRing: { borderRadius: 11, borderWidth: 1 },
  pressed: { opacity: 0.7 },
});
