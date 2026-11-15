import { type ColorValue, Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useArtFit } from '@/components/art-fit';
import { useInk } from '@/components/hand-title';
import { usePalette } from '@/components/ui';
import { artEntry, type ArtKey, INK_DRAWINGS, themeArt } from '@/lib/ink-art';
import { roomTheme } from '@/lib/room-theme';

const IMAGES = {
  run: require('@/assets/art/run.png'),
  gathering: require('@/assets/art/gathering.png'),
  gate: require('@/assets/art/gate.png'),
  paper: require('@/assets/art/paper.png'),
  reference: require('@/assets/art/reference.png'),
  ended: require('@/assets/art/ended.png'),
  camera: require('@/assets/art/camera.png'),
};

/** Stroke width in drawing units (300-unit-wide drawings), close to the PDF art's line at the same width. */
const STROKE = 2.6;

/**
 * Dark mode, small marks (Rooms rows): light ink on a dark card thins out when the art is drawn this small, so
 * the line is made bolder there. Image art gets four extra copies offset by BOLD_OFFSET points; drawings get a
 * stroke of at least MIN_STROKE_PT points. Light mode and the large art are unchanged.
 */
const BOLD_OFFSET = 0.5;
const MIN_STROKE_PT = 1.1;
const BOLD_SHIFTS = [
  [BOLD_OFFSET, 0],
  [-BOLD_OFFSET, 0],
  [0, BOLD_OFFSET],
  [0, -BOLD_OFFSET],
] as const;

/**
 * Qrew redesign: thin black pen art (transparent PNG from the design, or a dev drawing), centered, below the
 * title and text. Closed drawing paths are filled with `ground` (default: the paper, the screen ground; pass
 * the card color when the art sits on a card) so they hide lines behind them. Decorative: hidden from VoiceOver. `width` is the drawn width in points (Q 01.04: ~180).
 */
export function InkArt({
  art,
  roomName,
  width = 180,
  ground,
}: {
  art?: ArtKey;
  roomName?: string;
  width?: number;
  ground?: ColorValue;
}) {
  const ink = useInk();
  const { paper } = usePalette();
  const bold = false;
  const fill = ground ?? paper;
  const entry = art ? artEntry(art) : themeArt(roomTheme(roomName));
  const height = Math.round(width / entry.aspect);
  // UX2-61: in a QScreen `bottom` block the art shows whole or not at all.
  const fit = useArtFit();
  if (fit?.hidden) return null;
  return (
    <View
      style={styles.wrap}
      onLayout={fit ? (e) => fit.report(e.nativeEvent.layout.height) : undefined}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {entry.kind === 'image' ? (
        <View style={{ width, height }}>
          {bold
            ? BOLD_SHIFTS.map(([dx, dy], i) => (
                <Image
                  key={i}
                  source={IMAGES[entry.key]}
                  style={[StyleSheet.absoluteFill, { width, height, tintColor: ink, transform: [{ translateX: dx }, { translateY: dy }] }]}
                  resizeMode="contain"
                />
              ))
            : null}
          <Image source={IMAGES[entry.key]} style={{ width, height, tintColor: ink }} resizeMode="contain" />
        </View>
      ) : (
        <Svg width={width} height={height} viewBox={INK_DRAWINGS[entry.key].viewBox}>
          {INK_DRAWINGS[entry.key].paths.map((d, i) => (
            <Path key={i} d={d} fill={d.endsWith('Z') ? fill : 'none'}
              stroke={ink}
              strokeWidth={bold ? Math.max(STROKE, (MIN_STROKE_PT * INK_DRAWINGS[entry.key].width) / width) : STROKE} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
});
