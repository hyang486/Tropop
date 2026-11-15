import { type StyleProp, StyleSheet, type TextStyle } from 'react-native';
import { Text } from '@/components/text';

import { titleSize, usePalette } from '@/components/ui';

/**
 * B1: Source Sans 3 (SIL OFL 1.1, assets/fonts). Embedded at build by the expo-font config plugin (app.json); the
 * root layout also loads them through useFonts so a Metro-only reload on an older build still has them.
 */
export const HAND_FONTS = {
  'SourceSans3-Regular': require('@/assets/fonts/SourceSans3-Regular.ttf'),
  'SourceSans3-Semibold': require('@/assets/fonts/SourceSans3-Semibold.ttf'),
  'SourceSans3-Bold': require('@/assets/fonts/SourceSans3-Bold.ttf'),
};

/** Tropop ink (components/ui palette): the design's #181817 on light; a pale ink on dark so titles and art stay visible. */
export function useInk() {
  return usePalette().ink;
}

/**
 * The one title of a screen, at the top of its content (the screen's nav title is left empty so it is not shown
 * twice). Screen titles are 28/36 semibold, sheet titles 20/28 (phase1 spec §4). Long names wrap; Dynamic Type
 * scales it (capped so a large setting still fits two lines on a phone).
 */
export function HandTitle({
  children,
  style,
  numberOfLines,
  screen,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  /** Spec 11 A8: one line when the title sits in the nav bar. */
  numberOfLines?: number;
  /** A screen's own title (QScreen): 28 pt / 36. Sheets and others are 20 / 28. */
  screen?: boolean;
}) {
  const ink = useInk();
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={screen ? 1.2 : 1.6}
      numberOfLines={numberOfLines}
      style={[styles.title, screen && styles.screen, { color: ink }, style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: titleSize.sheet, lineHeight: 28, fontWeight: '600' },
  screen: { fontSize: titleSize.screen, lineHeight: 36 },
});
