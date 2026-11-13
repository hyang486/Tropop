import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { type Cap, highlighterPath } from './sketch';
import { useCalendarColors } from './tokens';

const MIN_TARGET = 44;

/**
 * Qrewing Calendar: one week-row segment of a room's translucent marker band. Round caps only at the range's real
 * start and end; flat where it wraps to another row. An optional emoji sits in the middle. Tappable (44 pt hit
 * area through hitSlop) only when onPress is given; otherwise it takes no touches.
 */
export function HighlighterStroke({
  width,
  height,
  color,
  startCap,
  endCap,
  seed,
  emoji,
  onPress,
  accessibilityLabel,
}: {
  width: number;
  height: number;
  color: string;
  startCap: Cap;
  endCap: Cap;
  seed: string;
  emoji?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const colors = useCalendarColors();
  const d = useMemo(() => highlighterPath(width, height, startCap, endCap, seed), [width, height, startCap, endCap, seed]);
  if (!d) return null;
  const band = (
    <>
      <Svg width={width} height={height}>
        <Path d={d} fill={color} fillOpacity={colors.highlighterOpacity} />
      </Svg>
      {emoji ? (
        <View pointerEvents="none" style={styles.center}>
          <Text allowFontScaling={false} style={{ fontSize: Math.round(height * 1.05), lineHeight: Math.round(height * 1.3) }}>
            {emoji}
          </Text>
        </View>
      ) : null}
    </>
  );
  if (!onPress) {
    return (
      <View
        pointerEvents="none"
        style={{ width, height }}
        accessible={!!accessibilityLabel}
        accessibilityLabel={accessibilityLabel}
      >
        {band}
      </View>
    );
  }
  const v = Math.max(0, (MIN_TARGET - height) / 2);
  const h = Math.max(0, (MIN_TARGET - width) / 2);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: v, bottom: v, left: h, right: h }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [{ width, height }, pressed && styles.pressed]}
    >
      {band}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  pressed: { opacity: 0.6 },
});
