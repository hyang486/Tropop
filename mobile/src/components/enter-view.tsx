import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

import { enterMotion, readReduceMotion } from '@/lib/motion-plan';

/** Live Reduce Motion setting; null until the first read answers. */
export function useReduceMotion(): boolean | null {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    void readReduceMotion(() => AccessibilityInfo.isReduceMotionEnabled()).then((on) => {
      if (live) setReduce(on);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * UX P2-10: fades (and, unless Reduce Motion is on, rises 8 pt) into place over 200 ms ease-out on mount.
 * Stays transparent until the setting is known, so a Reduce Motion user never sees the slide.
 */
export function EnterView({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const reduce = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const ready = reduce !== null;
  const motion = enterMotion(reduce !== false);
  useEffect(() => {
    if (!ready) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [ready, progress, motion.duration]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [motion.fromTranslateY, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
