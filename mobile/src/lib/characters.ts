// B3 characters: ids 1-12 (profiles.avatar_character smallint, null = unset; DRAFT shape until the migration lands).
// Pure (no React Native imports) so it is unit tested. The PNGs are required by features/characters/character-art.

export const CHARACTERS: readonly { id: number; key: string; name: string; a11y: string }[] = [
  { id: 1, key: 'host', name: 'HOST', a11y: 'Host character' },
  { id: 2, key: 'loop', name: 'LOOP', a11y: 'Loop character' },
  { id: 3, key: 'bloom', name: 'BLOOM', a11y: 'Bloom character' },
  { id: 4, key: 'peak', name: 'PEAK', a11y: 'Peak character' },
  { id: 5, key: 'moon', name: 'MOON', a11y: 'Moon character' },
  { id: 6, key: 'fold', name: 'FOLD', a11y: 'Fold character' },
  { id: 7, key: 'twin', name: 'TWIN', a11y: 'Twin character' },
  { id: 8, key: 'wave', name: 'WAVE', a11y: 'Wave character' },
  { id: 9, key: 'bean', name: 'BEAN', a11y: 'Bean character' },
  { id: 10, key: 'trojan', name: 'TROJAN', a11y: 'Trojan character' },
  { id: 11, key: 'tommy', name: 'TOMMY', a11y: 'Tommy character' },
  { id: 12, key: 'grad', name: 'GRAD', a11y: 'Grad character' },
];

/** Defaults span characters 2-12 (11 faces); 1 HOST is kept for people who host. */
export const DEFAULT_CHARACTER_COUNT = 11;

export function isCharacterId(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 12;
}

/** Stable string hash (djb2, unsigned) so a user's default face is the same on every device. */
export function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

/** The default face for a user with no photo and no chosen character: (hash(user_id) % 11) + 2, so 02-12. */
export function defaultCharacter(userId: string): number {
  return (hashString(userId) % DEFAULT_CHARACTER_COUNT) + 2;
}

/** Rooms list: a room's leading character, 02-12 from its id; a row never repeats the one above it (12 wraps to 2). */
export function roomRingPicker(): (roomId: string) => number {
  let prev = 0;
  return (roomId) => {
    let id = (hashString(roomId) % DEFAULT_CHARACTER_COUNT) + 2;
    if (id === prev) id = id === 12 ? 2 : id + 1;
    prev = id;
    return id;
  };
}

export type AvatarChoice = { kind: 'photo'; path: string } | { kind: 'character'; id: number };

/** Display rule: photo if set, else the chosen character, else the default character. */
export function avatarChoice(input: { userId: string; photoPath?: string | null; character?: number | null }): AvatarChoice {
  if (input.photoPath) return { kind: 'photo', path: input.photoPath };
  if (isCharacterId(input.character)) return { kind: 'character', id: input.character };
  return { kind: 'character', id: defaultCharacter(input.userId) };
}

export function characterA11y(id: number, selected = false): string {
  const label = CHARACTERS.find((c) => c.id === id)?.a11y ?? 'Character';
  return selected ? `${label}, selected` : label;
}
