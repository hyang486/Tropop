import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/text';
import { colors } from '@/components/ui';

import {
  HERO_EMPTY_HEIGHT, HERO_EMPTY_OPACITY, HERO_HEIGHT, HERO_RADIUS, SCRIM_FROM, SCRIM_HEIGHT, SCRIM_TO, TOPIC_SYMBOL, heroLabel,
} from './hero-card-model';
import { HERO_IMAGES } from './room-hero-images';
import type { HeroTopic } from './room-hero';

/**
 * Room hero card (hero-set-spec §C): bundled art, bottom-half scrim, white title and meta. The card, not the image,
 * carries the label. Pass `empty` for a day with nothing: general art, 160 pt, 40% opacity, no text.
 */
export function HeroCard({
  hero, title, time, place, empty, topic,
}: { hero: HeroTopic; title?: string; time?: string | null; place?: string | null; empty?: boolean; topic?: boolean }) {
  if (empty) {
    return (
      <View style={[styles.card, { height: HERO_EMPTY_HEIGHT, opacity: HERO_EMPTY_OPACITY }]} accessible={false} importantForAccessibility="no-hide-descendants">
        <Image source={HERO_IMAGES.general} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
      </View>
    );
  }
  const meta = [time, place].map((s) => s?.trim()).filter(Boolean).join(' · ');
  return (
    <View style={[styles.card, { minHeight: HERO_HEIGHT }]} accessible accessibilityRole="summary" accessibilityLabel={heroLabel(title ?? '', time, place)}>
      <Image source={HERO_IMAGES[hero]} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
      <View style={styles.scrim} pointerEvents="none">
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="s" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={SCRIM_FROM} />
              <Stop offset="1" stopColor={SCRIM_TO} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#s)" />
        </Svg>
      </View>
      <View style={styles.row}>
        {topic ? (
          <View style={styles.tile}>
            <SymbolView name={TOPIC_SYMBOL[hero].sf as SymbolViewProps['name']} size={22} tintColor={colors.tint} />
          </View>
        ) : null}
        <View style={styles.text}>
          {title ? <Text style={styles.title} numberOfLines={2}>{title}</Text> : null}
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderRadius: HERO_RADIUS, overflow: 'hidden', justifyContent: 'flex-end' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: SCRIM_HEIGHT },
  row: { position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  tile: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { color: '#FFFFFF', fontSize: 24, lineHeight: 30, fontFamily: 'SourceSans3-Bold' },
  meta: { color: 'rgba(255,255,255,0.9)', fontSize: 15, lineHeight: 20, fontFamily: 'SourceSans3-Semibold' },
});
