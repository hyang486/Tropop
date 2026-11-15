import { SymbolView } from 'expo-symbols';
import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, type TextInputProps, View } from 'react-native';
import { TextInput } from '@/components/text';

import { composerFadeMs, composerSlot } from '@/components/composer-plan';
import { useReduceMotion } from '@/components/enter-view';

import { useOnSheet } from '@/components/q-screen';
import { colors, size } from '@/components/ui';

/**
 * One composer for chat-like inputs (UX P1-11, mockup m1): a 44 pt field with a 22 pt radius and a 32 pt ink
 * circle with an up-arrow inside its trailing edge. The circle is hidden while the field is empty.
 * UX3-B05: with `idleAction` (Qrewing in chat), the empty field shows that 36 pt button in the same trailing slot
 * instead; typing cross-fades it to the send arrow (150 ms, instant with Reduce Motion).
 */
export function Composer({
  value,
  onChangeText,
  onSend,
  placeholder,
  sendLabel,
  canSend,
  busy = false,
  maxLength,
  idleAction,
  inPill = false,
  ...rest
}: Omit<TextInputProps, 'style'> & {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder: string;
  sendLabel: string;
  canSend: boolean;
  busy?: boolean;
  idleAction?: { label: string; hint: string; icon: ReactNode; onPress: () => void };
  /** V3: inside chat's floating lift pill: no own fill, 40 pt rows and a 40 pt trailing slot (S5). */
  inPill?: boolean;
}) {
  const slot = composerSlot(value, busy, !!idleAction);
  const showCircle = slot === 'send';
  // UX2-48: on a pageSheet (Ask) the field is sheetField, or it would vanish into the dark sheet.
  const onSheet = useOnSheet();
  const sendCircle = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sendLabel}
      accessibilityState={{ disabled: !canSend || busy, busy }}
      disabled={!canSend || busy}
      onPress={onSend}
      hitSlop={6}
      style={({ pressed }) => [
        styles.circle,
        inPill && styles.circleInPill,
        idleAction && styles.circleInSlot,
        (!canSend || pressed) && !busy && styles.dim,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.onTint} />
      ) : (
        <SymbolView name="arrow.up" size={16} weight="bold" tintColor={colors.onTint} />
      )}
    </Pressable>
  );
  return (
    <View style={[styles.field, onSheet && styles.fieldOnSheet, inPill && styles.fieldInPill]}>
      <TextInput
        selectionColor={colors.label}
        {...rest}
        style={[styles.input, inPill && styles.inputInPill]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryLabel}
        accessibilityLabel={placeholder}
        maxLength={maxLength}
        multiline
      />
      {idleAction ? (
        <CrossFadeSlot
          inPill={inPill}
          showIdle={slot === 'idle'}
          idle={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={idleAction.label}
              accessibilityHint={idleAction.hint}
              onPress={idleAction.onPress}
              hitSlop={4}
              style={({ pressed }) => [styles.slotFill, pressed && styles.dim]}
            >
              {idleAction.icon}
            </Pressable>
          }
          send={sendCircle}
        />
      ) : showCircle ? (
        sendCircle
      ) : null}
    </View>
  );
}

/** Both faces stay mounted in one 36 pt slot; only the shown one is touchable and read by VoiceOver. */
function CrossFadeSlot({
  showIdle,
  idle,
  send,
  inPill,
}: {
  showIdle: boolean;
  idle: ReactNode;
  send: ReactNode;
  inPill: boolean;
}) {
  const reduce = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(showIdle ? 1 : 0));
  useEffect(() => {
    Animated.timing(progress, {
      toValue: showIdle ? 1 : 0,
      duration: composerFadeMs(reduce !== false),
      useNativeDriver: true,
    }).start();
  }, [showIdle, reduce, progress]);
  const sendOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  return (
    <View style={[styles.slot, inPill && styles.slotInPill]}>
      <Animated.View
        style={[styles.slotFace, { opacity: progress }]}
        pointerEvents={showIdle ? 'auto' : 'none'}
        accessibilityElementsHidden={!showIdle}
        importantForAccessibility={showIdle ? 'auto' : 'no-hide-descendants'}
      >
        {idle}
      </Animated.View>
      <Animated.View
        style={[styles.slotFace, { opacity: sendOpacity }]}
        pointerEvents={showIdle ? 'none' : 'auto'}
        accessibilityElementsHidden={showIdle}
        importantForAccessibility={showIdle ? 'no-hide-descendants' : 'auto'}
      >
        {send}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldOnSheet: { backgroundColor: colors.sheetField },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: size.hit,
    borderRadius: 22,
    backgroundColor: colors.field,
    paddingLeft: 16,
    paddingRight: 6,
  },
  // V3: the pill draws the fill; the field keeps only the text and the trailing slot.
  fieldInPill: { minHeight: 40, borderRadius: 0, backgroundColor: 'transparent', paddingLeft: 4, paddingRight: 0 },
  inputInPill: { minHeight: 40, paddingTop: 10, paddingBottom: 10 },
  input: { flex: 1, maxHeight: 120, minHeight: size.hit, paddingTop: 12, paddingBottom: 12, fontSize: 16, color: colors.label },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 6,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint,
  },
  circleInPill: { marginBottom: 4, marginLeft: 4 },
  dim: { opacity: 0.4 },
  circleInSlot: { marginBottom: 0, marginLeft: 0 },
  // UX3-B05: the trailing slot (36 pt, 4 pt from the field's bottom so it centres on a one-line field).
  slot: { width: 36, height: 36, marginBottom: 4, marginLeft: 4 },
  slotInPill: { width: 40, height: 40, marginBottom: 0 },
  slotFace: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  slotFill: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
});
