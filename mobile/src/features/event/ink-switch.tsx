import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet } from 'react-native';

import { colors } from '@/components/ui';

const W = 46;
const H = 28;
const KNOB = 20;
const PAD = (H - KNOB) / 2 - 1.5;
const TRAVEL = W - KNOB - 2 * (PAD + 1.5);

/**
 * Spec 11 A3: an ink switch instead of the green iOS one. Off is an ink outline with an ink knob on paper; on fills
 * the track with ink and the knob turns paper, so both colors invert with the theme. VoiceOver reads it as a switch.
 */
export function InkSwitch({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
}: {
  value: boolean;
  disabled?: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
}) {
  const [x] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!live) return;
      if (reduce) x.setValue(value ? 1 : 0);
      else Animated.timing(x, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: true }).start();
    });
    return () => {
      live = false;
    };
  }, [value, x]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={[styles.track, value && styles.trackOn, disabled && styles.disabled]}
    >
      <Animated.View
        style={[
          styles.knob,
          value && styles.knobOn,
          { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, TRAVEL] }) }] },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: W,
    height: H,
    borderRadius: H / 2,
    borderWidth: 1.5,
    borderColor: colors.label,
    backgroundColor: colors.background,
    padding: PAD,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: colors.tint, borderColor: colors.tint },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: colors.label },
  knobOn: { backgroundColor: colors.onTint },
  disabled: { opacity: 0.4 },
});
