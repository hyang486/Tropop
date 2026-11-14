import { useFonts } from 'expo-font';
import { type StyleProp, StyleSheet, Text, type TextStyle, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { titleSize, usePalette } from '@/components/ui';
import { HAND_FONT_KOREAN, HAND_FONT_LATIN, handFontFor } from '@/lib/hand-font';

/**
 * Qrew redesign: the bundled OFL handwriting fonts (assets/fonts, licenses next to them). Loaded at runtime by
 * expo-font, so existing dev builds need no rebuild. The root layout preloads them; useFonts here is cached.
 */
export const HAND_FONTS = {
  [HAND_FONT_LATIN]: require('@/assets/fonts/PatrickHand-Regular.ttf'),
  [HAND_FONT_KOREAN]: require('@/assets/fonts/Gaegu-Light.ttf'),
};

/** Qrew ink (components/ui palette): the design's #181817 on light; a pale ink on dark so titles and art stay visible. */
export function useInk() {
  return usePalette().ink;
}

/**
 * The one handwritten title of a screen, at the top of its content (the screen's nav title is left empty so it
 * is not shown twice). Body text stays in the system sans. Until the fonts load, the system font is used.
 * Long names wrap; Dynamic Type scales it (capped so a large setting still fits two lines on a phone).
 */
export function HandTitle({
  children,
  style,
  numberOfLines,
  screen,
  underline,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  /** Spec 11 A8: one line when the title sits in the nav bar. */
  numberOfLines?: number;
  /** V1: a screen's own title (QScreen): 40 pt / 44, Dynamic Type capped at 1.2. Sheets and others stay as before. */
  screen?: boolean;
  /** V1: the pencil squiggle under the title, on the three root screens only (Rooms, Calendar, Profile). */
  underline?: boolean;
}) {
  const [loaded] = useFonts(HAND_FONTS);
  const ink = useInk();
  const title = (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={screen ? 1.2 : 1.6}
      numberOfLines={numberOfLines}
      style={[
        styles.title,
        screen && styles.screen,
        { color: ink },
        loaded ? { fontFamily: handFontFor(children) } : styles.fallback,
        style,
      ]}
    >
      {children}
    </Text>
  );
  if (!underline) return title;
  return (
    <View>
      {title}
      <Svg width={96} height={10} viewBox="0 0 96 10" style={styles.underline} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Path d={PENCIL_UNDERLINE} stroke={ink} strokeWidth={2} strokeLinecap="round" fill="none" />
      </Svg>
    </View>
  );
}

/** V1: the pencil squiggle (96×10) under a root screen's title. */
export const PENCIL_UNDERLINE = 'M2 6c10-4 18 3 28-1s18-3 28 0 20 2 36-2';

const styles = StyleSheet.create({
  // UX §3 screen title: Patrick Hand 30.
  title: { fontSize: 30, lineHeight: 38 },
  screen: { fontSize: titleSize.screen, lineHeight: 44 },
  underline: { marginTop: 4 },
  fallback: { fontWeight: '300' },
});
