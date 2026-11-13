import { useFonts } from 'expo-font';
import { type ReactNode, useMemo, useState } from 'react';
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { HAND_FONTS } from '@/components/hand-title';
import { handFontFor } from '@/lib/hand-font';

import { pencilStrokes } from './sketch';
import { useCalendarColors } from './tokens';

/** One ruled line per row: text set with this lineHeight sits on the rules. */
export const DIARY_LINE_HEIGHT = 36;
export const DIARY_PAD_TOP = 20;
const PAD_BOTTOM = 16;
const PAD_X = 20;
/** The rules are fainter than the grid: the handwriting is the ink, the rules only guide it. */
const RULE_FADE = 0.4;

/**
 * Qrewing Calendar: diary paper (cream, faint straight pencil rules, no card chrome) behind the caller's children.
 * At least `lines` rules tall; it grows with its content and draws one rule per line of its measured height.
 */
export function RuledDiaryPaper({
  width,
  lines,
  seed = 'diary',
  children,
  style,
}: {
  width: number;
  lines: number;
  seed?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useCalendarColors();
  const minHeight = DIARY_PAD_TOP + lines * DIARY_LINE_HEIGHT + PAD_BOTTOM;
  const [height, setHeight] = useState(minHeight);
  const rules = Math.max(lines, Math.floor((height - DIARY_PAD_TOP - PAD_BOTTOM) / DIARY_LINE_HEIGHT));
  const passes = useMemo(() => {
    const ys = Array.from({ length: rules }, (_, k) => DIARY_PAD_TOP + (k + 1) * DIARY_LINE_HEIGHT - 0.5);
    return pencilStrokes(
      ys.map((y) => [PAD_X / 2, y, width - PAD_X / 2, y] as const),
      `${seed}:${width}:${rules}`,
    );
  }, [rules, width, seed]);
  return (
    <View
      onLayout={(e) => setHeight(Math.round(e.nativeEvent.layout.height))}
      style={[styles.paper, { width, minHeight, backgroundColor: colors.paper }, style]}
    >
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {passes.map((p, i) => (
          <Path key={i} d={p.d} stroke={colors.pencil} strokeOpacity={p.opacity * RULE_FADE} strokeWidth={p.width} strokeLinecap="round" fill="none" />
        ))}
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

/**
 * Qrewing Calendar: a past room's diary, handwritten on pencil-ruled paper: a title, a date line, then up to 3 lines of
 * the first-person recap (extra lines are dropped). Read by VoiceOver as one element.
 */
export function DiaryCard({
  width,
  title,
  dateLine,
  lines,
  accessibilityLabel,
  style,
}: {
  width: number;
  title: string;
  dateLine: string;
  lines: string[];
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [loaded] = useFonts(HAND_FONTS);
  const colors = useCalendarColors();
  const shown = lines.slice(0, 3);
  const font = (text: string) => (loaded ? { fontFamily: handFontFor(text) } : styles.fallback);
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? [title, dateLine, ...shown].join('. ')}
      style={style}
    >
      <RuledDiaryPaper width={width} lines={2 + Math.max(shown.length, 1)} seed={title}>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.title, { color: colors.ink }, font(title)]}>
          {title}
        </Text>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.date, { color: colors.ink }, font(dateLine)]}>
          {dateLine}
        </Text>
        {shown.map((line, i) => (
          <Text key={i} maxFontSizeMultiplier={1.2} style={[styles.line, { color: colors.ink }, font(line)]}>
            {line}
          </Text>
        ))}
      </RuledDiaryPaper>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { borderRadius: 4, overflow: 'hidden' },
  content: { paddingTop: DIARY_PAD_TOP, paddingBottom: PAD_BOTTOM, paddingLeft: PAD_X, paddingRight: PAD_X },
  title: { fontSize: 28, lineHeight: DIARY_LINE_HEIGHT },
  date: { fontSize: 19, lineHeight: DIARY_LINE_HEIGHT, opacity: 0.75 },
  line: { fontSize: 23, lineHeight: DIARY_LINE_HEIGHT },
  fallback: { fontWeight: '300' },
});
