import type { ImageSourcePropType } from 'react-native';

// Character PNGs (36 / 72 / 144 with @2x/@3x beside), named as in assets/brand/manifest.json (NN-key-size.png).
export const CHARACTER_IMAGES: Record<number, { 36: ImageSourcePropType; 72: ImageSourcePropType; 144: ImageSourcePropType }> = {
  1: { 36: require('@/assets/brand/characters/01-host-36.png'), 72: require('@/assets/brand/characters/01-host-72.png'), 144: require('@/assets/brand/characters/01-host-144.png') },
  2: { 36: require('@/assets/brand/characters/02-loop-36.png'), 72: require('@/assets/brand/characters/02-loop-72.png'), 144: require('@/assets/brand/characters/02-loop-144.png') },
  3: { 36: require('@/assets/brand/characters/03-bloom-36.png'), 72: require('@/assets/brand/characters/03-bloom-72.png'), 144: require('@/assets/brand/characters/03-bloom-144.png') },
  4: { 36: require('@/assets/brand/characters/04-peak-36.png'), 72: require('@/assets/brand/characters/04-peak-72.png'), 144: require('@/assets/brand/characters/04-peak-144.png') },
  5: { 36: require('@/assets/brand/characters/05-moon-36.png'), 72: require('@/assets/brand/characters/05-moon-72.png'), 144: require('@/assets/brand/characters/05-moon-144.png') },
  6: { 36: require('@/assets/brand/characters/06-fold-36.png'), 72: require('@/assets/brand/characters/06-fold-72.png'), 144: require('@/assets/brand/characters/06-fold-144.png') },
  7: { 36: require('@/assets/brand/characters/07-twin-36.png'), 72: require('@/assets/brand/characters/07-twin-72.png'), 144: require('@/assets/brand/characters/07-twin-144.png') },
  8: { 36: require('@/assets/brand/characters/08-wave-36.png'), 72: require('@/assets/brand/characters/08-wave-72.png'), 144: require('@/assets/brand/characters/08-wave-144.png') },
  9: { 36: require('@/assets/brand/characters/09-bean-36.png'), 72: require('@/assets/brand/characters/09-bean-72.png'), 144: require('@/assets/brand/characters/09-bean-144.png') },
  10: { 36: require('@/assets/brand/characters/10-trojan-36.png'), 72: require('@/assets/brand/characters/10-trojan-72.png'), 144: require('@/assets/brand/characters/10-trojan-144.png') },
  11: { 36: require('@/assets/brand/characters/11-tommy-36.png'), 72: require('@/assets/brand/characters/11-tommy-72.png'), 144: require('@/assets/brand/characters/11-tommy-144.png') },
  12: { 36: require('@/assets/brand/characters/12-grad-36.png'), 72: require('@/assets/brand/characters/12-grad-72.png'), 144: require('@/assets/brand/characters/12-grad-144.png') },
};
