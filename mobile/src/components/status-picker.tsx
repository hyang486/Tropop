import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HandTitle } from '@/components/hand-title';
import { colors, radius, usePalette } from '@/components/ui';
import { en } from '@/i18n/en';
import type { StatusDefinition } from '@/lib/activity';
import { statusSymbol } from '@/lib/chat-plan';
import { statusPickerPlan } from '@/lib/emergency-plan';
import { useDismissOnLink } from '@/lib/use-dismiss-on-link';

/**
 * UX2-05b: Emergency is never set without its confirm, and a failed write is never dropped silently: "Emergency not
 * sent" offers Try again (preferred) or Cancel. `send` throws on failure; `after` runs once it went through.
 */
/** UX2-52 server guard: the error setStatus throws for PT409 emergency_active (callers reopen the picker with it). */
export function isEmergencyActiveNotice(error: unknown): boolean {
  return error instanceof Error && error.message === en.activity.emergencyActiveError;
}

/**
 * F-EM-EXP: the one place that builds the "Emergency not sent" alerts. HOLD (waits for the human's OK, not shipped):
 * ux also wants a "Call 911" button (number from expo-localization: US/CA 911, KR 119, else 112) and the body line
 * "If you need help now, call 911." Add both to the 'ended' and 'offline' cases here and nowhere else.
 */
function emergencyFailedAlert(cause: 'ended' | 'offline', retry: () => void, onEnded?: () => void) {
  if (cause === 'ended') {
    Alert.alert(en.activity.emergencyEndedTitle, en.activity.emergencyEndedBody, [
      { text: en.activity.emergencyEndedOk, onPress: () => onEnded?.() },
    ]);
    return;
  }
  Alert.alert(en.activity.emergencyNotSent, en.activity.emergencyOfflineBody, [
    { text: en.room.cancel, style: 'cancel' },
    { text: en.activity.readRetry, isPreferred: true, onPress: retry },
  ]);
}

/**
 * `ended` reports whether the loaded room already shows closed (checked before sending: the request is skipped);
 * `classify` tells a failed send's cause (see lib/send-failure sendFailure); `onEnded` switches the room to its ended
 * state after the alert's OK.
 */
export function confirmEmergency(
  send: () => Promise<void>,
  after?: () => void,
  room?: { ended: () => boolean; classify: (error: unknown) => Promise<'ended' | 'offline' | 'other'>; onEnded: () => void },
) {
  async function attempt() {
    if (room?.ended()) {
      emergencyFailedAlert('ended', () => {}, room.onEnded);
      return;
    }
    try {
      await send();
      after?.();
    } catch (e) {
      const cause = (await room?.classify(e)) === 'ended' ? 'ended' : 'offline';
      emergencyFailedAlert(cause, () => void attempt(), room?.onEnded);
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
  loading = false,
  onRetry,
  title = en.activity.chooseStatus,
  cancelLabel = en.room.cancel,
  notice,
}: {
  /** UX2-52 server guard: why the last pick did not go through (errorText under the title). */
  notice?: string | null;
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
  /** UX2-108: the first status read is still running; Emergency works anyway, the rest show a loading line. */
  loading?: boolean;
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
        <Pressable style={styles.flex} accessibilityRole="button" accessibilityLabel={en.room.cancel} onPress={onClose} />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <View style={styles.handle} />
          {/* flexShrink: inside the sheet's maxHeight the grid scrolls and Cancel stays below it (never over the last row). */}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body} bounces={false}>
            <HandTitle style={styles.title}>{title}</HandTitle>
            {notice ? (
              <Text style={styles.failedText} accessibilityLiveRegion="polite">
                {notice}
              </Text>
            ) : null}
            {plan.showError && onRetry ? <FailedLine onRetry={onRetry} /> : null}
            {/* UX2-52: one status slot, so while in Emergency only "I'm OK now" (clear_my_status) ends it. No alert. */}
            {plan.inEmergency ? (
              <View style={styles.okBlock}>
                <Pressable
                  accessibilityRole="button"
                  onPress={onClear}
                  hitSlop={4}
                  style={({ pressed }) => [styles.okPill, pressed && { opacity: 0.5 }]}
                >
                  <Text style={styles.okPillText} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                    {en.activity.imOkNow}
                  </Text>
                </Pressable>
                <Text style={styles.okCaption}>{en.activity.inEmergencyCaption}</Text>
              </View>
            ) : null}
            <View style={styles.grid}>
              <Tile
                label={plan.emergency === 'builtin' ? en.activity.emergencyTile : plan.emergency.label}
                a11yLabel={en.activity.emergencyTileA11y}
                symbol={statusSymbol('', true) as SFSymbol}
                danger
                selected={!!emergencyId && emergencyId === currentId}
                // Already in Emergency: a second tap would raise a new alert, so the selected tile stays put.
                disabled={plan.inEmergency}
                onPress={onEmergency}
              />
              {loading && plan.others.length === 0 ? <LoadingLine /> : null}
              {plan.others.map((s) => (
                <Tile
                  key={s.id}
                  label={s.label}
                  a11yLabel={plan.inEmergency ? en.activity.unavailableInEmergency(s.label) : undefined}
                  symbol={statusSymbol(s.label, false) as SFSymbol}
                  selected={s.id === currentId}
                  dimmed={plan.inEmergency}
                  disabled={plan.inEmergency}
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

/** UX2-108: shown under Emergency while the first status read runs. */
function LoadingLine() {
  return (
    <View style={styles.loading} accessible accessibilityLabel={en.activity.statusesLoadingSpoken}>
      <ActivityIndicator size="small" color={colors.ink2} />
      <Text style={styles.loadingText} maxFontSizeMultiplier={1.4}>
        {en.activity.statusesLoading}
      </Text>
    </View>
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
  dimmed,
  disabled,
  onPress,
}: {
  label: string;
  a11yLabel?: string;
  symbol: SFSymbol;
  danger?: boolean;
  selected: boolean;
  /** UX2-52: an ordinary status during Emergency (ink3-grey text and icon). */
  dimmed?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const pal = usePalette();
  const color = danger
    ? selected ? pal.onDanger : colors.danger
    : selected ? colors.onTint : dimmed ? colors.secondaryLabel : colors.label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        danger && styles.tileDanger,
        selected && (danger ? { backgroundColor: pal.dangerSolid } : styles.tileSelected),
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
    // V5b (ux): tileOnLift on the lift sheet; selected = ink fill (Emergency: danger fill), no ring.
    backgroundColor: colors.tileOnLift,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 12,
    gap: 10,
    justifyContent: 'space-between',
  },
  tileDanger: { backgroundColor: colors.dangerField },
  tileSelected: { backgroundColor: colors.tint },
  tileText: { fontSize: 15 },
  // UX2-52: the Emergency bar's ink pill (36 pt in a 44 pt hit area) with its caption under it.
  okBlock: { gap: 8, alignItems: 'flex-start' },
  okPill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.tint,
  },
  okPillText: { fontSize: 15, fontWeight: '600', color: colors.onTint },
  okCaption: { fontSize: 15, color: colors.ink2 },
  cancel: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 24 },
  cancelText: { fontSize: 15, color: colors.ink2 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, width: '100%' },
  loadingText: { fontSize: 15, color: colors.ink2 },
  failed: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  failedText: { flex: 1, fontSize: 15, color: colors.errorText },
  failedButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.wash,
  },
  failedButtonText: { fontSize: 15, fontWeight: '600', color: colors.label },
});
