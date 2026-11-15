import { Image, type ImageRef } from 'expo-image';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

import { AVATAR_PIN_RADIUS, AVATAR_RING_WIDTH, avatarFaceKey, type AvatarFace } from './location-plan';

// UX P0-3: expo-maps draws an annotation icon as a plain square 50 pt image (AppleMapsViewiOS18.swift), so a
// round avatar pin is drawn once per face with react-native-svg, read back as a PNG (toDataURL) and loaded as
// a native image ref. Map colors are fixed (not the app theme) so pins read the same on light and dark maps.
const INK = '#181817';
/** B2: you (and a "+N" with you in it) and the On my way badge are Cardinal discs. */
const CARDINAL = '#990000';
const PAPER = '#FFFFFF';
const STALE = '#8E8E93';
const EMERGENCY_RED = '#FF3B30';
/** The icon frame expo-maps draws, in points. */
const FRAME = 50;
/** A bake that gets no image is tried again a few times before the pin keeps its text fallback. */
const BAKE_ATTEMPTS = 4;
const BAKE_RETRY_MS = 250;

/** V4: the rim is 3 pt white; the On my way badge is an 18 pt ink disc with a 2 pt white rim. */
const RIM = 3;
const BADGE_R = 9;
const BADGE_RIM = 2;
/** ux: the lift pin's shadow is a radial gradient (r 24, +1 down); 'hairline' is ux's fallback if gradients drop in the bake. */
const PIN_SHADOW: 'gradient' | 'hairline' = 'gradient';
const SHADOW_R = 24;

/**
 * V4 pins: a 40 pt disc with a 3 pt white rim. You (and a "+N" with you in it) = ink disc, paper initial; others
 * (and other "+N") = lift (white) disc, ink initial, with a soft 0 2 6 shadow (no outline). Emergency = danger disc
 * with a 20% danger halo. On my way = an ink badge with a white walker at the disc's bottom right.
 */
function PinFace({ face }: { face: AvatarFace }) {
  const c = FRAME / 2;
  const r = AVATAR_PIN_RADIUS;
  const ink = face.stale ? STALE : INK;
  const mine = face.stale ? STALE : CARDINAL;
  const filled = face.kind === 'me' || face.kind === 'my-cluster';
  const disc = face.emergency ? EMERGENCY_RED : filled ? mine : PAPER;
  const initial = face.emergency || filled ? PAPER : ink;
  const fontSize = face.kind === 'cluster' || face.kind === 'my-cluster' ? 13 : 15;
  // The badge sits on the rim toward the bottom right, its white rim touching the 50 pt frame's edges.
  const b = FRAME - BADGE_R - BADGE_RIM;
  // Others' pins and others' "+N" are lift discs; only they get the shadow (ink and danger pins need none).
  const lift = !filled && !face.emergency;
  return (
    <>
      {face.emergency ? <Circle cx={c} cy={c} r={r + AVATAR_RING_WIDTH} fill={EMERGENCY_RED} fillOpacity={0.2} /> : null}
      {lift && PIN_SHADOW === 'gradient' ? (
        // ux: a radial falloff baked under the disc (an SVG blur doesn't survive the PNG bake; rings read as outlines).
        <>
          <Defs>
            <RadialGradient id="pinShadow" cx={c} cy={c + 1} r={SHADOW_R} gradientUnits="userSpaceOnUse">
              <Stop offset={r / SHADOW_R} stopColor="#000000" stopOpacity={0.18} />
              <Stop offset={1} stopColor="#000000" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={c} cy={c + 1} r={SHADOW_R} fill="url(#pinShadow)" />
        </>
      ) : null}
      <Circle cx={c} cy={c} r={r} fill={PAPER} />
      {lift && PIN_SHADOW === 'hairline' ? (
        <Circle cx={c} cy={c} r={r + 0.25} fill="none" stroke="#000000" strokeOpacity={0.12} strokeWidth={0.5} />
      ) : null}
      <Circle cx={c} cy={c} r={r - RIM} fill={disc} />
      <SvgText x={c} y={c + fontSize * 0.36} textAnchor="middle" fontSize={fontSize} fontWeight="700" fill={initial}>
        {face.text}
      </SvgText>
      {face.onWay ? (
        <G>
          <Circle cx={b} cy={b} r={BADGE_R + BADGE_RIM} fill={PAPER} />
          <Circle cx={b} cy={b} r={BADGE_R} fill={CARDINAL} />
          {/* An 11 pt walker: head, body, a forward arm and a striding pair of legs. */}
          <Circle cx={b + 0.6} cy={b - 3.6} r={1.4} fill={PAPER} />
          <Path
            d={`M${b + 0.2} ${b - 1.8} L${b - 0.6} ${b + 1.6} M${b - 0.6} ${b + 1.6} L${b - 2.6} ${b + 4.6} M${b - 0.6} ${b + 1.6} L${b + 1.8} ${b + 4.6} M${b - 0.1} ${b - 0.6} L${b + 2.4} ${b + 0.6} M${b - 0.1} ${b - 0.6} L${b - 2.4} ${b + 0.4}`}
            stroke={PAPER}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      ) : null}
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
