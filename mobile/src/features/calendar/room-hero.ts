/**
 * Room hero art (ux spec 3 of 3): one bundled illustration per room, picked from the room name on the phone.
 * Pure and free: no server, no image API. The pick is stored once in the calendar snapshot, so renaming a room
 * keeps its art.
 */
export type HeroTopic = 'run' | 'sports' | 'study' | 'food' | 'party' | 'hike' | 'music' | 'travel' | 'general';

/** First match wins, in this order (spec §B). Whole words only: "rerun" is not run, "gamer" is not game. */
const KEYWORDS: readonly (readonly [HeroTopic, readonly string[]])[] = [
  ['run', ['run', 'running', 'jog', '5k', '10k', 'marathon', 'tempo']],
  ['hike', ['hike', 'hiking', 'trail', 'climb', 'mountain', 'trek']],
  ['sports', ['soccer', 'football', 'basketball', 'tennis', 'game', 'match', 'futsal', 'volleyball', 'pickleball', 'gym']],
  ['study', ['study', 'exam', 'class', 'lecture', 'library', 'homework', 'review']],
  ['food', ['lunch', 'dinner', 'brunch', 'breakfast', 'coffee', 'cafe', 'eat', 'food', 'bbq', 'potluck']],
  ['party', ['party', 'birthday', 'bday', 'drinks', 'bar', 'celebrate', 'mixer']],
  ['music', ['concert', 'gig', 'show', 'music', 'jam', 'band', 'karaoke', 'festival']],
  ['travel', ['trip', 'travel', 'flight', 'airport', 'tour', 'roadtrip']],
];

export const HERO_TOPICS: readonly HeroTopic[] = ['run', 'sports', 'study', 'food', 'party', 'hike', 'music', 'travel', 'general'];

export function isHeroTopic(v: unknown): v is HeroTopic {
  return typeof v === 'string' && (HERO_TOPICS as readonly string[]).includes(v);
}

/** The pace maker is on for a sports room that may read location (same rule as the Map's pace layer). */
export function paceOn(room: { type: string; location_allowed?: boolean }): boolean {
  return room.type === 'sports' && room.location_allowed === true;
}

export function roomHero(room: { name: string; type: string; location_allowed?: boolean }): HeroTopic {
  if (paceOn(room)) return 'run';
  const words = new Set(room.name.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
  for (const [topic, list] of KEYWORDS) if (list.some((w) => words.has(w))) return topic;
  return 'general';
}
