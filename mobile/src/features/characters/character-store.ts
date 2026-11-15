import { supabase } from '@/lib/supabase';

import type { Profile } from '@/lib/auth';

// DEPENDS ON 0043 (profiles.avatar_character smallint 1-12, null): a draft shape until that migration is live.
// lib/database.types.ts is generated and has no such column yet, so the column is read and written through these
// narrow casts; regenerate the types after 0043 and drop them.
export type ProfileWithCharacter = Profile & { avatar_character?: number | null };

export function profileCharacter(profile: Profile | null | undefined): number | null {
  const c = (profile as ProfileWithCharacter | null | undefined)?.avatar_character;
  return typeof c === 'number' ? c : null;
}

/** Choosing a character selects it and clears the photo (one update). */
export async function setProfileCharacter(userId: string, id: number) {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_character: id, avatar_path: null } as unknown as { avatar_path: null })
    .eq('id', userId);
  if (error) throw error;
}
