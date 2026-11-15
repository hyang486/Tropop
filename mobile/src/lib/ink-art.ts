// B2 art map: the brand stickers and the crew hero image. Pure (the PNG sources are required by
// components/ink-art, so this file has no React Native imports and is unit tested).
import type { RoomTheme } from './room-theme';

export type ArtKey = 'gathering' | 'gate' | 'paper' | 'run' | 'reference' | 'ended' | 'camera' | 'scan' | 'meetup' | 'hey' | 'sports' | 'imHere' | 'onMyWay';

/** `hero`: the opaque crew photo, shown in a card. `sticker`: transparent art drawn straight on the paper. */
export type ArtEntry = { kind: 'hero' | 'sticker'; key: ArtKey; aspect: number };

/** Sticker source is 280 px square at @2x; the crew hero is 3:2. */
const KIND: Record<ArtKey, 'hero' | 'sticker'> = {
  gathering: 'hero', gate: 'sticker', paper: 'sticker', run: 'sticker', reference: 'sticker', ended: 'sticker',
  camera: 'sticker', scan: 'sticker', meetup: 'sticker', hey: 'sticker', sports: 'sticker', imHere: 'sticker', onMyWay: 'sticker',
};

/** Theme → sticker (ux): run "Let's go!", hike "I'm here!", bike and motorcycle "On my way!", gathering "Hey, crew!". A theme not in the map falls back to the crew hero (gathering). */
const THEME_ART: Partial<Record<RoomTheme, ArtKey>> = {
  run: 'sports',
  hike: 'imHere',
  bike: 'onMyWay',
  motorcycle: 'onMyWay',
  gathering: 'hey',
};

export function artEntry(key: ArtKey): ArtEntry {
  const kind = KIND[key];
  return { kind, key, aspect: kind === 'hero' ? 3 / 2 : 1 };
}

/** The art for a room theme, or the gathering art when the theme has none. */
export function themeArt(theme: RoomTheme): ArtEntry {
  return artEntry(THEME_ART[theme] ?? 'gathering');
}
