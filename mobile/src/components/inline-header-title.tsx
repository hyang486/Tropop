import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent, StyleSheet } from 'react-native';

import { useReduceMotion } from '@/components/enter-view';
import { HandTitle } from '@/components/hand-title';

/** Fade time for the inline title (UX2-59). */
const FADE_MS = 180;

/**
 * UX2-59: once the large handwritten title scrolls under the header, the same title fades in centered between the
 * nav buttons (Patrick Hand 20, one line, tail truncation; the native header gives it the gap between the buttons).
 * Pass `title` only on a screen with a visible header (null turns it off). Put `onTitleLayout` on the title block
 * (in scroll content coordinates), optionally `onTitleTextLayout` on a view around the large title alone (inside
 * the block), and call `onScrollY` with the content offset. `overlap` is the header bottom. UX2-59 C25: with the
 * title measure, the trigger is the title's own bottom, so a subtitle under it never holds the inline title back;
 * without it (Map), the block's bottom.
 */
export function useInlineHeaderTitle(title: string | null, overlap: number) {
  const navigation = useNavigation();
  const blockY = useRef<number | null>(null);
  const blockH = useRef(0);
  const textBottom = useRef<number | null>(null);
  const lastY = useRef(0);
  const [shown, setShown] = useState(false);

  const update = useCallback(
    (y: number) => {
      lastY.current = y;
      const bottom = blockY.current == null ? null : blockY.current + (textBottom.current ?? blockH.current);
      setShown(bottom != null && y + overlap >= bottom);
    },
    [overlap],
  );
  const onTitleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      blockY.current = e.nativeEvent.layout.y;
      blockH.current = e.nativeEvent.layout.height;
      update(lastY.current);
    },
    [update],
  );
  const onTitleTextLayout = useCallback(
    (e: LayoutChangeEvent) => {
      textBottom.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height;
      update(lastY.current);
    },
    [update],
  );

  useLayoutEffect(() => {
    if (!title) return;
    navigation.setOptions({ headerTitle: () => <InlineTitle text={title} shown={shown} /> });
  }, [navigation, title, shown]);

  return { onTitleLayout, onTitleTextLayout, onScrollY: update };
}

function InlineTitle({ text, shown }: { text: string; shown: boolean }) {
  const reduceMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(shown ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(shown ? 1 : 0);
      return;
    }
    const a = Animated.timing(opacity, { toValue: shown ? 1 : 0, duration: FADE_MS, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [shown, reduceMotion, opacity]);
  return (
    <Animated.View
      style={{ opacity }}
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
    >
      <HandTitle style={styles.title} numberOfLines={1}>
        {text}
      </HandTitle>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, lineHeight: 26 },
});
