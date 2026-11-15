import type { ImageSourcePropType } from 'react-native';

// Character PNGs (36 / 72 / 144 with @2x/@3x beside). Files are numbered 01-12 in spec order; the name part of the
// file names on disk is shifted by one and does not match assets/brand/manifest.json, so this map keys by number only.
export const CHARACTER_IMAGES: Record<number, { 36: ImageSourcePropType; 72: ImageSourcePropType; 144: ImageSourcePropType }> = {
  1: { 36: require('@/assets/brand/characters/01--36.png'), 72: require('@/assets/brand/characters/01--72.png'), 144: require('@/assets/brand/characters/01--144.png') },
  2: { 36: require('@/assets/brand/characters/02-host-36.png'), 72: require('@/assets/brand/characters/02-host-72.png'), 144: require('@/assets/brand/characters/02-host-144.png') },
  3: { 36: require('@/assets/brand/characters/03-loop-36.png'), 72: require('@/assets/brand/characters/03-loop-72.png'), 144: require('@/assets/brand/characters/03-loop-144.png') },
  4: { 36: require('@/assets/brand/characters/04-bloom-36.png'), 72: require('@/assets/brand/characters/04-bloom-72.png'), 144: require('@/assets/brand/characters/04-bloom-144.png') },
  5: { 36: require('@/assets/brand/characters/05-peak-36.png'), 72: require('@/assets/brand/characters/05-peak-72.png'), 144: require('@/assets/brand/characters/05-peak-144.png') },
  6: { 36: require('@/assets/brand/characters/06-moon-36.png'), 72: require('@/assets/brand/characters/06-moon-72.png'), 144: require('@/assets/brand/characters/06-moon-144.png') },
  7: { 36: require('@/assets/brand/characters/07-fold-36.png'), 72: require('@/assets/brand/characters/07-fold-72.png'), 144: require('@/assets/brand/characters/07-fold-144.png') },
  8: { 36: require('@/assets/brand/characters/08-twin-36.png'), 72: require('@/assets/brand/characters/08-twin-72.png'), 144: require('@/assets/brand/characters/08-twin-144.png') },
  9: { 36: require('@/assets/brand/characters/09-wave-36.png'), 72: require('@/assets/brand/characters/09-wave-72.png'), 144: require('@/assets/brand/characters/09-wave-144.png') },
  10: { 36: require('@/assets/brand/characters/10-bean-36.png'), 72: require('@/assets/brand/characters/10-bean-72.png'), 144: require('@/assets/brand/characters/10-bean-144.png') },
  11: { 36: require('@/assets/brand/characters/11-trojan-36.png'), 72: require('@/assets/brand/characters/11-trojan-72.png'), 144: require('@/assets/brand/characters/11-trojan-144.png') },
  12: { 36: require('@/assets/brand/characters/12-tommy-36.png'), 72: require('@/assets/brand/characters/12-tommy-72.png'), 144: require('@/assets/brand/characters/12-tommy-144.png') },
};
