import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HandTitle } from '@/components/hand-title';
import { colors, radius } from '@/components/ui';
import { en } from '@/i18n/en';
import type { StatusDefinition } from '@/lib/activity';
import { statusSymbol } from '@/lib/chat-plan';
import { statusPickerPlan } from '@/lib/emergency-plan';
import { useDismissOnLink } from '@/lib/use-dismiss-on-link';

/**
 * UX2-05b: Emergency is never set without its confirm, and a failed write is never dropped silently: "Emergency not
 * sent" offers Try again (preferred) or Cancel. `send` throws on failure; `after` runs once it went through.
 */
export function confirmEmergency(send: () => Promise<void>, after?: () => void) {
  async function attempt() {
    try {
      await send();
      after?.();
    } catch {
      Alert.alert(en.activity.emergencyNotSent, en.activity.actionFailed, [
        { text: en.room.cancel, style: 'cancel' },
        { text: en.activity.readRetry, isPreferred: true, onPress: () => void attempt() },
      ]);
    }
  }
  Alert.alert(en.activity.emergencyConfirmTitle, en.activity.emergencyConfirmBody, [
    { text: en.room.cancel, style: 'cancel' },
    { text: en.activity.sendEmergency, style: 'destructive', onPress: () => void attempt() },
  ]);
}

/**
 * Q 03.02 "Set your status": a bottom sheet with the room's statuses as an icon + text grid (icon by keyword,
 * a generic icon for custom statuses), then Clear status and Cancel. Choosing only reports the choice; the caller
 * confirms Emergency (confirmEmergency) and calls the RPC. UX2-05b: Emergency is always the first tile, red, even
 * when the list failed (a built-in tile); a failed list adds a red line with "Try again" above the grid.
 */
export function StatusPicker({
  visible,
  statuses,
  currentId,
  onPick,
  onEmergency,
  onClear,
  onClose,
  failed = false,
  onRetry,
  title = en.activity.chooseStatus,
  cancelLabel = en.room.cancel,
}: {
  /** Pace maker's stationary check asks its own question here; defaults to "Set your status". */
  title?: string;
  /** Defaults to Cancel; the stationary check says Dismiss. */
  cancelLabel?: string;
  visible: boolean;
  statuses: StatusDefinition[];
  currentId: string | undefined;
  /** A status other than Emergency. */
  onPick: (status: StatusDefinition) => void;
  /** The Emergency tile (the room's row or the built-in one). */
  onEmergency: () => void;
  onClear: () => void;
  onClose: () => void;
  /** The last status read failed (tiles may come from the cache). */
  failed?: boolean;
  onRetry?: () => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  // UX2-46: closes at once when a link or notification tap navigates.
  const instant = useDismissOnLink(visible ? onClose : null);
  const plan = statusPickerPlan({ statuses, currentId, failed });
  const emergencyId = plan.emergency === 'builtin' ? undefined : plan.emergency.id;
  return (
    <Modal visible={visible} transparent animationType={instant ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.flex} accessibilityLabel={en.room.cancel} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          {/* flexShrink: inside the sheet's maxHeight the grid scrolls and Cancel stays below it (never over the last row). */}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body} bounces={false}>
            <HandTitle style={styles.title}>{title}</HandTitle>
            {plan.showError && onRetry ? <FailedLine onRetry={onRetry} /> : null}
            <View style={styles.grid}>
              <Tile
                label={plan.emergency === 'builtin' ? en.activity.emergencyTile : plan.emergency.label}
                a11yLabel={en.activity.emergencyTileA11y}
                symbol={statusSymbol('', true) as SFSymbol}
                danger
                selected={!!emergencyId && emergencyId === currentId}
                onPress={onEmergency}
              />
              {plan.others.map((s) => (
                <Tile
                  key={s.id}
                  label={s.label}
                  symbol={statusSymbol(s.label, false) as SFSymbol}
                  selected={s.id === currentId}
                  onPress={() => onPick(s)}
                />
              ))}
              {plan.showClear ? (
                <Tile label={en.activity.clearStatus} symbol="checkmark" selected={false} onPress={onClear} />
              ) : null}
            </View>
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.5 }]}>
            <Text style={styles.cancelText} maxFontSizeMultiplier={1.5}>
              {cancelLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** UX2-05b (pattern E): red cause line + one ink-outline "Try again" (36 pt in a 44 pt hit area, busy while it runs). */
function FailedLine({ onRetry }: { onRetry: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function retry() {
    setBusy(true);
    try {
      await onRetry();
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.failed} accessibilityLiveRegion="polite">
      <Text style={styles.failedText}>{en.activity.statusesFailed}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={retry}
        hitSlop={4}
        style={({ pressed }) => [styles.failedButton, (pressed || busy) && { opacity: 0.5 }]}
      >
        <Text style={styles.failedButtonText} numberOfLines={1} maxFontSizeMultiplier={1.4}>
          {en.activity.readRetry}
        </Text>
      </Pressable>
    </View>
  );
}

function Tile({
  label,
  a11yLabel,
  symbol,
  danger,
  selected,
  onPress,
}: {
  label: string;
  a11yLabel?: string;
  symbol: SFSymbol;
  danger?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const color = danger ? colors.danger : colors.label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        danger && styles.tileDanger,
        selected && styles.tileSelected,
        pressed && { opacity: 0.6 },
      ]}
    >
      <SymbolView name={symbol} size={22} tintColor={color} />
      {/* Dynamic Type capped at 1.4x so one word (Emergency, Resting) fits a half-width tile on the 17e; a longer
          custom label shrinks to fit two lines instead of breaking inside a word. */}
      <Text
        style={[styles.tileText, { color }]}
        numberOfLines={2}
        maxFontSizeMultiplier={1.4}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.sheet,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderCurve: 'continuous',
    paddingTop: 8,
  },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 2.5, backgroundColor: colors.grabber, marginBottom: 8 },
  body: { paddingHorizontal: 16, paddingBottom: 8, gap: 16 },
  title: { fontSize: 30, lineHeight: 38 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    // Two columns (Q 03.02): half the row minus half the gap.
    width: '48.6%',
    minHeight: 64,
    // UX2-45: tiles inside a sheet use cardStrong, so they show on the dark sheet surface.
    backgroundColor: colors.fieldStrong,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 12,
    gap: 10,
    justifyContent: 'space-between',
  },
  tileDanger: { backgroundColor: colors.dangerField },
  tileSelected: { borderWidth: 1.5, borderColor: colors.label },
  tileText: { fontSize: 15 },
  cancel: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 24 },
  cancelText: { fontSize: 15, color: colors.ink2 },
  failed: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  failedText: { flex: 1, fontSize: 15, color: colors.errorText },
  failedButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: colors.label,
  },
  failedButtonText: { fontSize: 15, fontWeight: '600', color: colors.label },
});
