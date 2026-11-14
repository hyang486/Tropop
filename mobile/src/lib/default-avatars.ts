
/** A bundled default avatar. `key` is what the server stores ('default:<key>'). `source` replaces the glyph once final art exists. */
export type DefaultAvatar = { key: string; glyph: string; tint: string; source?: number };

// Placeholder ink glyphs on pale tints. Never remove or rename a key: members' profiles point at it.
export const DEFAULT_AVATARS: DefaultAvatar[] = [
  { key: 'star', glyph: '★', tint: '#FDE9B8' },
  { key: 'moon', glyph: '☾', tint: '#DCE3F7' },
  { key: 'sun', glyph: '☀', tint: '#FFE1C2' },
  { key: 'flower', glyph: '✿', tint: '#F9D9E4' },
  { key: 'note', glyph: '♪', tint: '#E3D9F5' },
  { key: 'peak', glyph: '▲', tint: '#D5ECE0' },
  { key: 'gem', glyph: '◆', tint: '#D3EAF3' },
  { key: 'leaf', glyph: '❧', tint: '#E1EDCB' },
];

const PREFIX = 'default:';

export const defaultAvatarPath = (key: string) => `${PREFIX}${key}`;
export const isDefaultAvatarPath = (path: string | null | undefined): path is string => !!path && path.startsWith(PREFIX);
/** The bundled avatar for a stored path, or undefined for an unknown key (shown as the initial). */
export const defaultAvatarFor = (path: string) => DEFAULT_AVATARS.find((a) => a.key === path.slice(PREFIX.length));
