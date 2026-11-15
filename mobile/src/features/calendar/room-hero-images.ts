import type { HeroTopic } from './room-hero';

/** The bundled PNG per topic (one density; the image is always cover-sized). */
export const HERO_IMAGES: Record<HeroTopic, number> = {
  run: require('../../../assets/brand/hero/rooms/run.webp'),
  sports: require('../../../assets/brand/hero/rooms/sports.png'),
  study: require('../../../assets/brand/hero/rooms/study.png'),
  food: require('../../../assets/brand/hero/rooms/food.png'),
  party: require('../../../assets/brand/hero/rooms/party.png'),
  hike: require('../../../assets/brand/hero/rooms/hike.png'),
  music: require('../../../assets/brand/hero/rooms/music.png'),
  travel: require('../../../assets/brand/hero/rooms/travel.png'),
  general: require('../../../assets/brand/hero/rooms/general.webp'),
};
