import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { gridLinePaths } from './sketch';
import { useCalendarColors } from './tokens';

/** Room around the grid so the wobble and overshoot at the outer lines are not clipped. */
const PAD = 3;

/**
 * Qrewing Calendar: the hand-drawn month grid lines (7 × weeks cells), optionally on cream paper. Lines only: the
 * caller lays out day numbers, strokes and press targets on top. Deterministic per seed, so it never jitters.
 */
export function SketchyMonthGrid({
  weeks,
  cellWidth,
  cellHeight,
  seed = 'grid',
  paper = false,
}: {
  weeks: number;
  cellWidth: number;
  cellHeight: number;
  seed?: string;
  paper?: boolean;
}) {
  const colors = useCalendarColors();
  const width = cellWidth * 7;
  const height = cellHeight * weeks;
  const paths = useMemo(() => gridLinePaths(weeks, cellWidth, cellHeight, seed, PAD), [weeks, cellWidth, cellHeight, seed]);
  if (width <= 0 || height <= 0) return null;
  return (
    <View pointerEvents="none" style={{ width, height }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width + PAD * 2} height={height + PAD * 2} style={styles.svg}>
        {paper ? <Rect x={PAD} y={PAD} width={width} height={height} rx={10} fill={colors.paper} /> : null}
        {paths.map((d, i) => (
          <Path key={i} d={d} stroke={colors.ink} strokeOpacity={0.6} strokeWidth={1.4} strokeLinecap="round" fill="none" />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: { position: 'absolute', left: -PAD, top: -PAD },
});
