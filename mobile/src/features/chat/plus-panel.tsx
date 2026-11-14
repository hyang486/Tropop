import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { type SFSymbol, SymbolView } from 'expo-symbols';

import { confirmEmergency, StatusPicker } from '@/components/status-picker';
import { colors } from '@/components/ui';
import { en } from '@/i18n/en';
import { type StatusDefinition, useRoomActivity } from '@/lib/activity';
import { errorMessage } from '@/lib/errors';

export type PlusTile = {
  key: string;
  symbol: SFSymbol;
  label: string;
  /** Small second line, e.g. "3:08 PM" or "Uploading 2". */
  detail?: string;
  danger?: boolean;
  /** Filled ink tile: the state is on (Arrived done, a status set). */
  on?: boolean;
  badge?: number;
  busy?: boolean;
  onPress?: () => void;
};

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Spec 11 A11: what used to be the tab row and the Arrived/Set status pills, now behind "+" left of the composer.
 * KakaoTalk-style: the grid opens in place under the composer (no modal), so Set status can still open its sheet.
 * `tiles` are navigation tiles from the screen (Photos, Map, Question cards); Arrived and Set status live here.
 */
export function PlusPanel({
  activity,
  userId,
  tiles,
  onDone,
  bottomInset,
}: {
  activity: ReturnType<typeof useRoomActivity>;
  userId: string;
  tiles: PlusTile[];
  onDone: () => void;
  bottomInset: number;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
      onDone();
    } catch (e) {
      Alert.alert(en.activity.actionFailed, errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const userStatusId = activity.memberStatus.get(userId);
  const myStatus = activity.statuses.find((s) => s.id === userStatusId);

  function pick(def: StatusDefinition) {
    setPicking(false);
    if (def.id === userStatusId) return;
    run('status', () => activity.setStatus(def.id));
  }

  // UX2-05b: works without the status list; a failed send asks to try again (never dropped silently).
  function emergency() {
    setPicking(false);
    if (myStatus?.is_emergency) return;
    confirmEmergency(async () => {
      setBusy('status');
      try {
        await activity.setEmergency();
      } finally {
        setBusy(null);
      }
    }, onDone);
  }

  function clear() {
    setPicking(false);
    if (userStatusId) run('status', activity.clearStatus);
  }

  const all: PlusTile[] = [
    ...tiles,
    {
      key: 'arrived',
      symbol: 'mappin.and.ellipse',
      label: en.chat.arrivedTile,
      detail: activity.myArrivedAt ? timeOf(activity.myArrivedAt) : undefined,
      on: !!activity.myArrivedAt,
      busy: busy === 'arrive',
      // Arrived is one-way per activity, as on the old pill.
      onPress: activity.loading || activity.myArrivedAt ? undefined : () => run('arrive', activity.arrive),
    },
    {
      key: 'status',
      symbol: 'person.crop.circle.badge.questionmark',
      label: en.chat.statusTile,
      detail: myStatus?.label,
      danger: myStatus?.is_emergency,
      on: !!myStatus && !myStatus.is_emergency,
      busy: busy === 'status',
      onPress: activity.loading ? undefined : () => setPicking(true),
    },
  ];

  return (
    <View style={[styles.panel, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <View style={styles.grid}>
        {all.map((t) => (
          <Tile key={t.key} tile={t} />
        ))}
      </View>
      <StatusPicker
        visible={picking}
        statuses={activity.statuses}
        currentId={userStatusId}
        onPick={pick}
        onEmergency={emergency}
        onClear={clear}
        onClose={() => setPicking(false)}
        failed={!!activity.error}
        onRetry={activity.reload}
      />
    </View>
  );
}

function Tile({ tile }: { tile: PlusTile }) {
  const tint = tile.on ? colors.onTint : tile.danger ? colors.danger : colors.label;
  const a11y = [tile.label, tile.detail, tile.badge ? String(tile.badge) : undefined].filter(Boolean).join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !tile.onPress, busy: tile.busy, selected: tile.on }}
      disabled={!tile.onPress || tile.busy}
      onPress={tile.onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={[styles.circle, tile.on && styles.circleOn, tile.danger && styles.circleDanger]}>
        {tile.busy ? <ActivityIndicator color={tint} /> : <SymbolView name={tile.symbol} size={24} tintColor={tint} />}
        {tile.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText} maxFontSizeMultiplier={1.2}>
              {tile.badge > 9 ? '9+' : tile.badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.4}>
        {tile.label}
      </Text>
      {tile.detail ? (
        <Text style={[styles.detail, tile.danger && styles.detailDanger]} numberOfLines={1} maxFontSizeMultiplier={1.4}>
          {tile.detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  // Four per row, as in KakaoTalk's "+" grid.
  tile: { width: '25%', alignItems: 'center', gap: 6 },
  pressed: { opacity: 0.5 },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOn: { backgroundColor: colors.tint },
  circleDanger: { backgroundColor: colors.dangerField },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.tint,
    borderWidth: 1.5,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.onTint, fontVariant: ['tabular-nums'] },
  label: { fontSize: 13, color: colors.label },
  detail: { marginTop: -4, fontSize: 12, color: colors.ink2, fontVariant: ['tabular-nums'] },
  detailDanger: { color: colors.danger },
});
