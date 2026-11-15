/** HeroCard constants and the VoiceOver label (hero-set-spec §C). Pure so it is unit-tested. */
export const HERO_HEIGHT = 200;
export const HERO_EMPTY_HEIGHT = 160;
export const HERO_EMPTY_OPACITY = 0.4;
export const HERO_RADIUS = 24;
export const SCRIM_FROM = 'rgba(48,43,40,0)';
export const SCRIM_TO = 'rgba(48,43,40,0.72)';
/** Scrim covers the lower 65% (calendar-v2-spec §B1, ux decision). */
export const SCRIM_HEIGHT = '65%';

/** Topic tile symbol: SF Symbol on iOS, Lucide name for the web demo. */
export const TOPIC_SYMBOL = {
  run: { sf: 'figure.run', lucide: 'footprints' },
  sports: { sf: 'trophy', lucide: 'trophy' },
  study: { sf: 'book', lucide: 'book-open' },
  food: { sf: 'fork.knife', lucide: 'utensils' },
  party: { sf: 'party.popper', lucide: 'party-popper' },
  hike: { sf: 'mountain.2', lucide: 'mountain' },
  music: { sf: 'music.note', lucide: 'music' },
  travel: { sf: 'airplane', lucide: 'plane' },
  general: { sf: 'person.2', lucide: 'users' },
} as const;

/** "title, time, place": parts that are empty are left out; the image is never read. */
export function heroLabel(title: string, time?: string | null, place?: string | null): string {
  return [title, time, place].map((s) => s?.trim()).filter(Boolean).join(', ');
}
