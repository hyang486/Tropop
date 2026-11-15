import { Avatar } from '@/components/avatar';
import { CharacterAvatar, type CharacterAvatarSize } from '@/features/characters/character-avatar';
import { isDefaultAvatarPath } from '@/lib/default-avatars';

/** The path of a real uploaded photo; the retired preset glyph avatars count as "no photo". */
export function realPhotoPath(path: string | null | undefined): string | null {
  return path && !isDefaultAvatarPath(path) ? path : null;
}

/**
 * B3 display rule for one person: their photo if set, else the chosen character, else the default character.
 * `name` labels the face for VoiceOver; omit it where the name is already next to the face.
 */
export function PersonAvatar({
  userId,
  name,
  path,
  character,
  size,
}: {
  userId: string;
  name: string;
  path: string | null | undefined;
  character?: number | null;
  size: CharacterAvatarSize;
}) {
  const photo = realPhotoPath(path);
  if (photo) return <Avatar path={photo} name={name} size={size} />;
  return <CharacterAvatar userId={userId} character={character} size={size} />;
}
