import { Image } from 'react-native';

import { CHARACTER_IMAGES } from '@/features/characters/character-art';
import { avatarChoice } from '@/lib/characters';

export type CharacterAvatarSize = 24 | 36 | 44 | 48 | 72 | 144;

/** Smallest sheet that is at least the display size, so the art stays sharp without loading 144 for a 24. */
function sheetFor(size: number): 36 | 72 | 144 {
  return size <= 36 ? 36 : size <= 72 ? 72 : 144;
}

/**
 * B3 character face: a circle (radius = size / 2) showing the character PNG, which carries its own background.
 * Shows the chosen character, else the default for `userId`. A photo is NOT handled here: the existing
 * components/avatar.tsx stays the photo path and the host screen picks (see avatarChoice in lib/characters).
 * accessibilityLabel is `name` when given; omit it where the name already sits next to the face (decorative).
 */
export function CharacterAvatar({
  userId,
  character,
  size = 44,
  name,
}: {
  userId: string;
  character?: number | null;
  size?: CharacterAvatarSize;
  name?: string;
}) {
  const choice = avatarChoice({ userId, character });
  const id = choice.kind === 'character' ? choice.id : 1;
  return (
    <Image
      source={CHARACTER_IMAGES[id][sheetFor(size)]}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      accessible={Boolean(name)}
      accessibilityLabel={name}
      accessibilityIgnoresInvertColors
    />
  );
}
