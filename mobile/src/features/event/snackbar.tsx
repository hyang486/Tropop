// UX P1-6: a one-time notice ("Sunrise 5K just filled up.") as a 4-second ink snackbar instead of a red line that
// stays. Pinned above the bottom safe area; fades in over 200 ms (opacity only, so it suits reduced motion too).
import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/components/ui';

import { useAnnounce } from './announce';

export const SNACKBAR_MS = 4000;

/** `notice.id` changes for each new notice, so the same text twice still shows (and is read) again. */
export function Snackbar({ notice, onHide }: { notice: { id: number; text: string }; onHide: () => void }) {
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(0));
  useAnnounce(notice.text, notice.id);
  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const t = setTimeout(onHide, SNACKBAR_MS);
    return () => clearTimeout(t);
  }, [notice.id, onHide, opacity]);
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.bar, { bottom: Math.max(insets.bottom, space.m) + space.s, opacity }]}
    >
      <Text style={styles.text}>{notice.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: space.gutter,
    right: space.gutter,
    backgroundColor: colors.label,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: space.l,
    paddingVertical: space.m,
  },
  text: { fontSize: 15, color: colors.background },
});
