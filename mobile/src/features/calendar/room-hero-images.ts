import type { HeroTopic } from './room-hero';

/** The bundled PNG per topic (one density; the image is always cover-sized). */
const RUN = require('../../../assets/brand/hero/rooms/run-human.webp');
const MEET = require('../../../assets/brand/hero/rooms/meetup-human.webp');
export const HERO_IMAGES: Record<HeroTopic, number> = {
  run: RUN,
  sports: RUN,
  study: MEET,
  food: MEET,
  party: MEET,
  hike: RUN,
  music: MEET,
  travel: MEET,
  general: MEET,
};
