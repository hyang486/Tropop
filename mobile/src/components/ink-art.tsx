import { Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useInk } from '@/components/hand-title';
import { usePalette } from '@/components/ui';
import { artEntry, type ArtKey, INK_DRAWINGS, themeArt } from '@/lib/ink-art';
import { roomTheme } from '@/lib/room-theme';

const IMAGES = {
  run: require('@/assets/art/run.png'),
  gathering: require('@/assets/art/gathering.png'),
};

/** Stroke width in drawing units (300-unit-wide drawings), close to the PDF art's line at the same width. */
const STROKE = 2.6;

/**
 * Qrew redesign: thin black pen art (transparent PNG from the design, or a dev drawing), centered, below the
 * title and text. Closed drawing paths are filled with the paper (screen ground) so they hide lines behind
 * them. Decorative: hidden from VoiceOver. `width` is the drawn width in points (Q 01.04: ~180).
 */
export function InkArt({ art, roomName, width = 180 }: { art?: ArtKey; roomName?: string; width?: number }) {
  const ink = useInk();
  const { paper } = usePalette();
  const entry = art ? artEntry(art) : themeArt(roomTheme(roomName));
  const height = Math.round(width / entry.aspect);
  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {entry.kind === 'image' ? (
        <Image source={IMAGES[entry.key]} style={{ width, height, tintColor: ink }} resizeMode="contain" />
      ) : (
        <Svg width={width} height={height} viewBox={INK_DRAWINGS[entry.key].viewBox}>
          {INK_DRAWINGS[entry.key].paths.map((d, i) => (
            <Path key={i} d={d} fill={d.endsWith('Z') ? paper : 'none'} stroke={ink} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
});
