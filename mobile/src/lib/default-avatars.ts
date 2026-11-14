import type { SFSymbol } from 'expo-symbols';

/** A bundled default avatar. `key` is what the server stores ('default:<key>'). `source` replaces it once final art exists.
 * UX2-43b: `symbol` is the filled SF Symbol drawn in ink; `glyph` stays as the fallback where symbols are missing. `name` is what VoiceOver reads ("<name> picture"). */
export type DefaultAvatar = { key: string; name: string; symbol: SFSymbol; glyph: string; tint: string; source?: number };

// Placeholder ink glyphs on pale tints. Never remove or rename a key: members' profiles point at it.
export const DEFAULT_AVATARS: DefaultAvatar[] = [
  { key: 'star', name: 'Star', symbol: 'star.fill', glyph: '★', tint: '#FDE9B8' },
  { key: 'moon', name: 'Moon', symbol: 'moon.fill', glyph: '☾', tint: '#DCE3F7' },
  // UX2-43: U+FE0E (text presentation) so iOS draws the ink glyph, not the yellow color emoji.
  { key: 'sun', name: 'Sun', symbol: 'sun.max.fill', glyph: '\u2600\uFE0E', tint: '#FFE1C2' },
  { key: 'flower', name: 'Flower', symbol: 'camera.macro', glyph: '✿', tint: '#F9D9E4' },
  { key: 'note', name: 'Note', symbol: 'music.note', glyph: '♪', tint: '#E3D9F5' },
  { key: 'peak', name: 'Peak', symbol: 'triangle.fill', glyph: '▲', tint: '#D5ECE0' },
  { key: 'gem', name: 'Gem', symbol: 'diamond.fill', glyph: '◆', tint: '#D3EAF3' },
  { key: 'leaf', name: 'Leaf', symbol: 'leaf.fill', glyph: '❧', tint: '#E1EDCB' },
];

const PREFIX = 'default:';

export const defaultAvatarPath = (key: string) => `${PREFIX}${key}`;
export const isDefaultAvatarPath = (path: string | null | undefined): path is string => !!path && path.startsWith(PREFIX);
/** The bundled avatar for a stored path, or undefined for an unknown key (shown as the initial). */
export const defaultAvatarFor = (path: string) => DEFAULT_AVATARS.find((a) => a.key === path.slice(PREFIX.length));
