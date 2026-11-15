import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Image, type ImageSourcePropType, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { colors } from '@/components/ui';

/** Tab route name → its 24 pt template icon (assets/brand/tabs, @2x 48 / @3x 72 px). */
export const TAB_ICONS: Record<string, ImageSourcePropType> = {
  index: require('@/assets/brand/tabs/today.png'),
  explore: require('@/assets/brand/tabs/explore.png'),
  qrews: require('@/assets/brand/tabs/qrews.png'),
  calendar: require('@/assets/brand/tabs/moments.png'),
};

/** tabs-spec §3: inactive label grey (5.0:1 on paper); not a palette token. */
const LABEL_INACTIVE = '#716D69';

/** True while the software keyboard is up (tabs-spec §2: the bar hides). */
function useKeyboardShown() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setShown(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}

/**
 * The app's bottom tab bar on iOS and web (tabs-spec §2-3, Preview.png): paper bar with a hairline, four equal
 * triggers; the active one is Cardinal with a wash pill behind icon + label and a 16×3 underline under the pill.
 * Selection haptic on change; tapping the active tab emits tabPress so a tab root scrolls to the top.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const keyboardShown = useKeyboardShown();
  if (keyboardShown) return null;
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <View style={styles.row} accessibilityRole="tabbar">
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (focused || event.defaultPrevented) return;
            if (Platform.OS === 'ios') void Haptics.selectionAsync();
            navigateToTab(route.key);
          };
          const tint = focused ? colors.tint : colors.label;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              // The Pressable is the accessibility element, so the iOS large-content viewer is declared here.
              accessibilityShowsLargeContentViewer
              accessibilityLargeContentTitle={label}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              // Web: a 2 pt Cardinal focus ring (react-native-web passes `focused`).
              style={(s) => [styles.trigger, (s as { focused?: boolean }).focused ? styles.focusRing : null]}
            >
              <View style={[styles.pill, focused && styles.pillActive]}>
                <Image source={TAB_ICONS[route.name]} style={[styles.icon, { tintColor: tint }]} />
                {/* Fixed 12/16 so Dynamic Type cannot overflow the 64 pt bar; long-press shows the large-content viewer (on the Pressable). */}
                <Text
                  style={[styles.label, focused ? styles.labelActive : null]}
                  allowFontScaling={false}
                >
                  {label}
                </Text>
              </View>
              <View style={[styles.underline, focused && styles.underlineActive]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  // Fixed 64 pt (tabs-spec §2-3): top 3 + pill 54 + gap 3 + underline 3 + bottom 1. Never grows, so
  // useBottomTabBarHeight and screen insets stay stable.
  row: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  trigger: { flex: 1, alignSelf: 'stretch', minWidth: 64, paddingTop: 3, paddingBottom: 1, alignItems: 'center', borderRadius: 18 },
  focusRing: { outlineWidth: 2, outlineStyle: 'solid', outlineColor: colors.tint },
  pill: { height: 54, alignItems: 'center', gap: 2, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18 },
  pillActive: { backgroundColor: colors.wash },
  icon: { width: 24, height: 24 },
  label: { fontSize: 12, lineHeight: 16, color: LABEL_INACTIVE },
  labelActive: { color: colors.tint, fontWeight: '600' },
  underline: { width: 16, height: 3, borderRadius: 2, marginTop: 3, backgroundColor: 'transparent' },
  underlineActive: { backgroundColor: colors.tint },
});
