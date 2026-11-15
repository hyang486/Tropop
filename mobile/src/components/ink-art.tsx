import { Image, StyleSheet, View } from 'react-native';

import { useArtFit } from '@/components/art-fit';
import { artEntry, type ArtKey, themeArt } from '@/lib/ink-art';
import { roomTheme } from '@/lib/room-theme';

const IMAGES: Record<ArtKey, number> = {
  gathering: require('@/assets/brand/hero/crew-usc.jpg'),
  gate: require('@/assets/brand/stickers/connection-03.png'),
  paper: require('@/assets/brand/stickers/meetup-11.png'),
  run: require('@/assets/brand/stickers/usc-lets-go.png'),
  reference: require('@/assets/brand/stickers/connection-08.png'),
  ended: require('@/assets/brand/stickers/connection-11.png'),
  camera: require('@/assets/brand/stickers/connection-08.png'),
  scan: require('@/assets/brand/stickers/connection-03.png'),
  meetup: require('@/assets/brand/stickers/connection-05.png'),
  hey: require('@/assets/brand/stickers/connection-01.png'),
  sports: require('@/assets/brand/stickers/meetup-10.png'),
  imHere: require('@/assets/brand/stickers/meetup-02.png'),
  onMyWay: require('@/assets/brand/stickers/meetup-01.png'),
};

const HERO_GROUND = '#FBE8D0';
const MAX_STICKER = 200;

/**
 * B2 brand art. The crew photo is opaque, so it sits in a hero card (16 pt gutters, radius 24, 3:2, cover); the
 * stickers are transparent and draw straight on the paper (capped at 200 pt). Decorative: hidden from VoiceOver.
 * `width` is the sticker width in points; the hero always fills the width the screen gives it.
 */
export function InkArt({ art, roomName, width = 180 }: { art?: ArtKey; roomName?: string; width?: number }) {
  const entry = art ? artEntry(art) : themeArt(roomTheme(roomName));
  // UX2-61: in a QScreen `bottom` block the art shows whole or not at all.
  const fit = useArtFit();
  if (fit?.hidden) return null;
  const side = Math.min(width, MAX_STICKER);
  return (
    <View
      style={entry.kind === 'hero' ? styles.heroWrap : styles.wrap}
      onLayout={fit ? (e) => fit.report(e.nativeEvent.layout.height) : undefined}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {entry.kind === 'hero' ? (
        <View style={styles.hero}>
          <Image source={IMAGES[entry.key]} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </View>
      ) : (
        <Image source={IMAGES[entry.key]} style={{ width: side, height: side }} resizeMode="contain" />
      )}
    </View>
  );
}

/** A small themed sticker (Rooms row tile): the room theme's sticker at `size` points. Decorative. */
export function ThemeSticker({ roomName, size }: { roomName?: string; size: number }) {
  const entry = themeArt(roomTheme(roomName));
  return <Image source={IMAGES[entry.key]} style={{ width: size, height: size }} resizeMode="contain" accessibilityElementsHidden />;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  heroWrap: { alignSelf: 'stretch' },
  hero: { width: '100%', aspectRatio: 3 / 2, borderRadius: 24, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: HERO_GROUND },
});
