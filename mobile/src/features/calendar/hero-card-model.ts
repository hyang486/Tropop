/** HeroCard constants and the VoiceOver label (hero-set-spec §C). Pure so it is unit-tested. */
export const HERO_HEIGHT = 200;
export const HERO_EMPTY_HEIGHT = 160;
export const HERO_EMPTY_OPACITY = 0.4;
export const HERO_RADIUS = 24;
export const SCRIM_FROM = 'rgba(30,25,22,0)';
export const SCRIM_TO = 'rgba(30,25,22,0.62)';

/** "title, time, place": parts that are empty are left out; the image is never read. */
export function heroLabel(title: string, time?: string | null, place?: string | null): string {
  return [title, time, place].map((s) => s?.trim()).filter(Boolean).join(', ');
}
