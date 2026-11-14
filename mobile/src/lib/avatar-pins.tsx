import { Image, type ImageRef } from 'expo-image';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import { AVATAR_PIN_RADIUS, AVATAR_RING_WIDTH, avatarFaceKey, type AvatarFace } from './location-plan';

// UX P0-3: expo-maps draws an annotation icon as a plain square 50 pt image (AppleMapsViewiOS18.swift), so a
// round avatar pin is drawn once per face with react-native-svg, read back as a PNG (toDataURL) and loaded as
// a native image ref. Map colors are fixed (not the app theme) so pins read the same on light and dark maps.
const INK = '#181817';
const PAPER = '#FFFFFF';
const STALE = '#8E8E93';
const EMERGENCY_RED = '#FF3B30';
/** The icon frame expo-maps draws, in points. */
const FRAME = 50;
/** A bake that gets no image is tried again a few times before the pin keeps its text fallback. */
const BAKE_ATTEMPTS = 4;
const BAKE_RETRY_MS = 250;

function PinFace({ face }: { face: AvatarFace }) {
  const c = FRAME / 2;
  const ink = face.stale ? STALE : INK;
  const filled = face.kind === 'me' || face.kind === 'my-cluster';
  const inner = AVATAR_PIN_RADIUS - 2;
  const fontSize = face.kind === 'cluster' || face.kind === 'my-cluster' ? 13 : 15;
  return (
    <>
      {face.emergency ? (
        <Circle
          cx={c}
          cy={c}
          r={AVATAR_PIN_RADIUS + AVATAR_RING_WIDTH / 2}
          fill="none"
          stroke={EMERGENCY_RED}
          strokeWidth={AVATAR_RING_WIDTH}
        />
      ) : null}
      {/* A soft shadow so the white outline still has an edge on a light map. */}
      <Circle cx={c} cy={c + 0.75} r={AVATAR_PIN_RADIUS} fill="#000000" fillOpacity={0.2} />
      <Circle cx={c} cy={c} r={AVATAR_PIN_RADIUS} fill={PAPER} />
      <Circle
        cx={c}
        cy={c}
        r={filled ? inner : inner - 0.75}
        fill={filled ? ink : PAPER}
        stroke={filled ? 'none' : ink}
        strokeWidth={filled ? 0 : 1.5}
      />
      <SvgText
        x={c}
        y={c + fontSize * 0.36}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="700"
        fill={filled ? PAPER : ink}
      >
        {face.text}
      </SvgText>
    </>
  );
}

function Bake({ face, onDone }: { face: AvatarFace; onDone: (key: string, ref: ImageRef | null) => void }) {
  const svg = useRef<Svg>(null);
  const key = avatarFaceKey(face);
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = (n: number) => {
      const retry = (why: string) => {
        if (__DEV__) console.log(`[pin-bake] ${key} ${why} (attempt ${n})`);
        if (!live) return;
        if (n < BAKE_ATTEMPTS) timer = setTimeout(() => attempt(n + 1), BAKE_RETRY_MS);
        else onDone(key, null);
      };
      // Always pass the size, equal to the view's own bounds (qa 36259b9: the Emergency face stayed a text
      // square). Without a size RNSVG renders into `boundingBox`, the rect of the view's last UIKit draw:
      // CGRectZero before the first draw (no image, empty callback). A larger size than the view only adds
      // empty canvas, since drawRect always draws at the view's bounds (qa 3c2af2f: pins at a third of their
      // size). The renderer uses the screen scale, so 50 pt is a sharp 150 px on a 3x screen.
      svg.current?.toDataURL(
        (base64?: string) => {
          if (!base64) return retry('empty image');
          Image.loadAsync(`data:image/png;base64,${base64}`)
            .then((ref) => {
              if (__DEV__) console.log(`[pin-bake] ${key} ok (attempt ${n})`);
              if (live) onDone(key, ref);
            })
            .catch(() => retry('load failed'));
        },
        { width: FRAME, height: FRAME },
      );
    };
    // After the first native draw, so the text is laid out.
    const frame = requestAnimationFrame(() => attempt(1));
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, [key, onDone]);
  return (
    <Svg ref={svg} width={FRAME} height={FRAME} viewBox={`0 0 ${FRAME} ${FRAME}`}>
      <PinFace face={face} />
    </Svg>
  );
}

/**
 * UX P0-3: the baked icon for each avatar face, by avatarFaceKey, and the hidden view that bakes the missing
 * ones (render `baker` anywhere on the screen). A face whose bake failed is not retried on this screen; its
 * pin stays a plain text annotation. Faces are few and tiny, so baked icons are kept for the screen's life.
 */
export function useAvatarPinIcons(faces: AvatarFace[]): { icons: ReadonlyMap<string, ImageRef>; baker: ReactNode } {
  const [icons, setIcons] = useState<ReadonlyMap<string, ImageRef>>(new Map());
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const onDone = useCallback((key: string, ref: ImageRef | null) => {
    if (ref) setIcons((current) => new Map(current).set(key, ref));
    else setFailed((current) => new Set(current).add(key));
  }, []);
  const missing = new Map<string, AvatarFace>();
  for (const face of faces) {
    const key = avatarFaceKey(face);
    if (!icons.has(key) && !failed.has(key)) missing.set(key, face);
  }
  const baker =
    missing.size > 0 ? (
      <View style={styles.baker} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {[...missing].map(([key, face]) => (
          <Bake key={key} face={face} onDone={onDone} />
        ))}
      </View>
    ) : null;
  return { icons, baker };
}

const styles = StyleSheet.create({
  // Laid out and drawn (toDataURL needs a mounted view) but never seen.
  baker: { position: 'absolute', left: 0, top: 0, opacity: 0, flexDirection: 'row' },
});
