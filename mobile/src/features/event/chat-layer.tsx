// Qrewing pieces of the room chat screen (spec 3.2): availability probe, consent and entry gates, the Mute small
// talk bar, the important-message banner and the collapsed "N messages hidden" row.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/ui';
import { SheetRow } from '@/features/chat/chat-sheet';

import { getEntryProfile } from './entry-api';
import { InkSwitch } from './ink-switch';
import { chatGates } from './event-plan';
import { probeQrewing, setQrewingMember, useQrewingRoom } from './qrewing-api';
import { allowedQrewingCalls } from './qrewing-plan';
import type { QrewingError } from './types';
import { en } from '@/i18n/en';
import type { ImportantBanner as Banner } from './use-small-talk';

/** While the room read or the probe failed offline, both are tried again this often (no model call). */
const OFFLINE_RETRY_MS = 30_000;

/**
 * The room's Qrewing state for the chat screen. `available` is false until the probe answers ok, so a
 * missing key (503) or a room with AI off shows no AI UI. `hasProfile` is null until known. A read or probe
 * that failed offline is tried again every 30 s, so AI UI comes back after the connection does.
 */
export function useQrewingChat(roomId: string, roomType: string, userId: string | undefined) {
  const q = useQrewingRoom(roomId);
  // Probe answer per room; a stale answer for another room or with AI off counts as unavailable.
  const [probe, setProbe] = useState<{ roomId: string; ok: boolean; error?: QrewingError } | null>(null);
  const [probeTick, setProbeTick] = useState(0);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const { reload, aiEnabled, entryRequired, readFailed } = q;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useEffect(() => {
    if (!allowedQrewingCalls({ aiEnabled, me: null }, false, false).probe) return;
    let alive = true;
    probeQrewing(roomId).then(
      (r) => alive && setProbe({ roomId, ok: 'ok' in r, error: 'error' in r ? r.error : undefined }),
    );
    return () => {
      alive = false;
    };
  }, [roomId, aiEnabled, probeTick]);
  const available = aiEnabled && probe?.roomId === roomId && probe.ok;

  const probeOffline = aiEnabled && probe?.roomId === roomId && probe.error === 'network';
  useEffect(() => {
    if (!readFailed && !probeOffline) return;
    const t = setInterval(() => {
      if (readFailed) reload();
      else setProbeTick((n) => n + 1);
    }, OFFLINE_RETRY_MS);
    return () => clearInterval(t);
  }, [readFailed, probeOffline, reload]);

  const checkProfile = useCallback(() => {
    if (!userId || !entryRequired || roomType !== 'event') return;
    getEntryProfile(roomId, userId)
      .then((row) => setHasProfile(row !== null))
      .catch(() => setHasProfile(null));
  }, [roomId, userId, entryRequired, roomType]);
  useFocusEffect(checkProfile);

  // The entry form is a client gate on the room's setting, not on the AI probe: attendees still introduce
  // themselves to each other when the model is unavailable.
  const gates = chatGates(aiEnabled && available, q.me, entryRequired, roomType, hasProfile);

  return { ...q, available, gates };
}

const m = en.qrewing.mute;

export function MuteBar({
  roomId,
  me,
  hiddenCount,
  unavailable,
  onChanged,
  onNeedConsent,
}: {
  roomId: string;
  me: { aiOk: boolean; mute: boolean } | null;
  hiddenCount: number;
  unavailable: boolean;
  onChanged: () => void;
  onNeedConsent: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [failed, setFailed] = useState<'network' | 'failed' | null>(null);
  const on = optimistic ?? me?.mute ?? false;

  async function toggle(next: boolean) {
    if (!me?.aiOk) {
      onNeedConsent();
      return;
    }
    setBusy(true);
    setFailed(null);
    setOptimistic(next);
    const res = await setQrewingMember(roomId, true, next);
    setBusy(false);
    setOptimistic(null);
    // The switch goes back to the saved value; say why instead of flipping back silently.
    if (res.error) setFailed(res.offline ? 'network' : 'failed');
    onChanged();
  }

  return (
    <View style={styles.muteWrap}>
      {/* Spec 11 polish: a boxed sheet row like Invite / Room info, with the ink switch. */}
      <SheetRow
        symbol="speaker.slash"
        label={m.label}
        detail={on && !unavailable ? `${m.on}${hiddenCount > 0 ? ` · ${m.hidden(hiddenCount)}` : ''}` : undefined}
        right={<InkSwitch value={on} disabled={busy} onValueChange={toggle} accessibilityLabel={m.label} />}
      />
      {on && unavailable ? <Text style={styles.note}>{m.unavailable}</Text> : null}
      {failed ? (
        <Text style={styles.note} accessibilityRole="alert">
          {failed === 'network' ? en.qrewing.errors.network : m.saveFailed}
        </Text>
      ) : null}
    </View>
  );
}

export function ImportantBannerView({ banner, onPress, onClose }: { banner: Banner; onPress: () => void; onClose: () => void }) {
  const text = banner.mention ? m.mentioned : m.banner(banner.reason ?? '');
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Pressable style={styles.bannerMain} onPress={onPress} accessibilityRole="button">
        <Text style={styles.bannerText} numberOfLines={2}>
          {text}
        </Text>
      </Pressable>
      <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={m.dismiss}>
        <Text style={styles.bannerClose}>✕</Text>
      </Pressable>
    </View>
  );
}

export function HiddenRow({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable style={styles.hiddenRow} onPress={onPress} accessibilityRole="button" accessibilityHint={m.showAll}>
      <Text style={styles.hiddenText}>
        {m.hidden(count)} · <Text style={styles.hiddenLink}>{m.showAll}</Text>
      </Text>
    </Pressable>
  );
}

/**
 * UX P1-1: before entry info the chat stays readable and this 64 pt card takes the composer's place
 * ("Introduce yourself to chat" + an ink "Add my info" button). The composer appears once the info is saved.
 */
/** UX2-02: sits in the composer row in place of the text field; the room keeps the "+" to its left. */
export function EntryGate({ roomId }: { roomId: string }) {
  const router = useRouter();
  return (
    <View style={styles.gate}>
      <Text style={styles.gateTitle} numberOfLines={2}>
        {en.qrewing.entry.chatPrompt}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/room/[id]/entry', params: { id: roomId, gate: '1' } })}
        style={({ pressed }) => [styles.gateButton, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.gateButtonText} maxFontSizeMultiplier={1.4}>
          {en.qrewing.entry.addMyInfo}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  muteWrap: { gap: 6 },
  note: { fontSize: 13, color: colors.warning, paddingHorizontal: 14 },
  banner: {
    marginHorizontal: 24,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.field,
    borderLeftWidth: 4,
    borderLeftColor: colors.tint,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerMain: { flex: 1 },
  bannerText: { fontSize: 15, fontWeight: '600', color: colors.label },
  bannerClose: { fontSize: 15, color: colors.ink2 },
  // UX2-35: a 44 pt tall target (was 24) with the same 13 pt text.
  hiddenRow: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  hiddenText: { fontSize: 13, color: colors.ink2 },
  hiddenLink: { color: colors.label, textDecorationLine: 'underline' },
  gate: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  gateTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.label },
  gateButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center', backgroundColor: colors.tint },
  gateButtonText: { fontSize: 15, fontWeight: '600', color: colors.onTint },
});
