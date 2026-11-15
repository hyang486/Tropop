import { supabase } from '@/lib/supabase';

export type HostFace = { avatar_path: string | null; avatar_character: number | null };

/**
 * B3 Rooms rows: the host's face (photo or character) per host id. DEPENDS ON 0043 (profiles.avatar_character): until
 * that column is live the select errors and this returns an empty map, so rows keep the room-type sticker.
 */
export async function fetchHostFaces(hostIds: readonly string[]): Promise<Map<string, HostFace>> {
  const out = new Map<string, HostFace>();
  const ids = [...new Set(hostIds)];
  if (ids.length === 0) return out;
  const { data, error } = await supabase.from('profiles').select('id, avatar_path, avatar_character' as 'id, avatar_path').in('id', ids);
  if (error || !data) return out;
  for (const row of data as unknown as { id: string; avatar_path: string | null; avatar_character: number | null }[]) {
    out.set(row.id, { avatar_path: row.avatar_path, avatar_character: row.avatar_character });
  }
  return out;
}
