import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { elevation, radius, size, usePalette } from '@/components/ui';

/**
 * F-RT2 (ux spec): with iOS Reduce Transparency on, the native header items get a system fill that reads near-white
 * in dark mode (iOS 26 draws its own shared bar-button background). Every header item then draws its own surface:
 * an opaque lift fill, a 0.5 pt hairline (light rgba(0,0,0,0.08), dark rgba(255,255,255,0.10)), the lift shadow
 * and label-colored icons, and `hidesSharedBackground` removes the system one. RT off: nothing here is used.
 */
export const RT_HAIRLINE = 'rgba(48,43,40,0.08)';

/** Spread into a screen's options when RT is on: our back circle in place of the native back button. */
export function rtBackOptions(onBack: () => void, label: string) {
  return {
    unstable_headerLeftItems: () => [
      {
        type: 'custom' as const,
        hidesSharedBackground: true,
        element: (
          <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onBack}>
            <RtSurface shape="circle">
              <RtChevron />
            </RtSurface>
          </Pressable>
        ),
      },
    ],
  };
}

/** Spread into a screen's options when RT is on: our own capsule (or circle) holding the right-side items. */
export function rtRightOptions(items: ReactNode) {
  return {
    unstable_headerRightItems: () => [
      { type: 'custom' as const, hidesSharedBackground: true, element: <RtSurface shape="capsule">{items}</RtSurface> },
    ],
  };
}

/** Colors come from the JS scheme (usePalette), never a dynamic color: the header hosts this natively and would resolve it light (F-RT1). */
function RtChevron() {
  const pal = usePalette();
  return <SymbolView name="chevron.left" size={18} weight="semibold" tintColor={pal.ink} />;
}

/** The opaque lift surface: a 44 pt circle (back) or a capsule hugging its 44 pt items. */
export function RtSurface({ shape, children }: { shape: 'circle' | 'capsule'; children: ReactNode }) {
  const pal = usePalette();
  const style: ViewStyle[] = [
    styles.base,
    shape === 'circle' ? styles.circle : styles.capsule,
    {
      backgroundColor: pal.lift,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: RT_HAIRLINE,
    },
    { boxShadow: elevation.lift.light.boxShadow },
  ];
  return <View style={style}>{children}</View>;
}

/** One 44 pt icon button for a right-side capsule. */
export function RtIconButton({ symbol, label, onPress }: { symbol: SFSymbol; label: string; onPress: () => void }) {
  const pal = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.item}>
      <SymbolView name={symbol} size={22} tintColor={pal.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  circle: { width: size.hit, height: size.hit, borderRadius: size.hit / 2 },
  capsule: { minHeight: size.hit, borderRadius: radius.pill, paddingHorizontal: 4 },
  item: { width: size.hit, height: size.hit, alignItems: 'center', justifyContent: 'center' },
});
