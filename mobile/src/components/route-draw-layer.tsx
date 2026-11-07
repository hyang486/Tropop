import { useRef, useState } from 'react';
import { type GestureResponderEvent, type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { addStrokePoint, type Point, type Size } from '@/lib/route-draw';

/**
 * R-1: a transparent layer over the map while the pen is on. It takes every touch, so the map underneath
 * cannot pan, zoom, rotate or select a building or place, and draws the finger's path until it lifts.
 * The finished stroke goes to `onStroke` in view points; the live stroke state stays in this component so
 * finger moves do not re-render the map screen.
 */
export function RouteDrawLayer({ color, onStroke }: { color: string; onStroke: (stroke: Point[], size: Size) => void }) {
  const [size, setSize] = useState<Size | null>(null);
  const [stroke, setStroke] = useState<Point[]>([]);
  // The release can arrive before the last move has rendered, so the stroke is also kept in a ref.
  const live = useRef<Point[]>([]);
  const update = (next: Point[]) => {
    live.current = next;
    setStroke(next);
  };

  const at = (e: GestureResponderEvent): Point => ({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });

  function finish() {
    const done = live.current;
    update([]);
    if (size && done.length > 0) onStroke(done, size);
  }

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(e: LayoutChangeEvent) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      // Keep the touch: the screen's ScrollView must not take it over as a scroll.
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => update([at(e)])}
      onResponderMove={(e) => update(addStrokePoint(live.current, at(e)))}
      onResponderRelease={finish}
      onResponderTerminate={finish}
    >
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {stroke.length > 1 ? (
          <Polyline
            points={stroke.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : stroke.length === 1 ? (
          <Circle cx={stroke[0].x} cy={stroke[0].y} r={3} fill={color} />
        ) : null}
      </Svg>
    </View>
  );
}
