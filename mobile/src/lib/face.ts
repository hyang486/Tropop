import { supabase } from './supabase';

/**
 * Room-scoped face reference upload. The object lives at
 * `face-refs/{room_id}/{user_id}/ref-{uuid}.jpg`, which only that member can read or write
 * (Storage RLS), then `enroll_face` records it and queues the room's existing photos.
 * Nothing is uploaded until the member has consented in the enrollment screen.
 */
export function faceRefPath(roomId: string, userId: string, id: string) {
  return `${roomId}/${userId}/ref-${id}.jpg`;
}

export async function enrollFace(roomId: string, photoUri: string): Promise<{ enrollmentId: string } | { error: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { error: 'Not signed in' };
  const path = faceRefPath(roomId, userId, crypto.randomUUID());
  const blob = await (await fetch(photoUri)).blob();
  const { error: upErr } = await supabase.storage.from('face-refs').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (upErr) return { error: upErr.message };
  const { data, error } = await supabase.rpc('enroll_face', { p_room_id: roomId, p_ref_path: path });
  if (error) return { error: error.message };
  return { enrollmentId: data };
}

/** Removes the member's reference and match results for this room. The janitor deletes the stored object. */
export async function removeFaceEnrollment(roomId: string) {
  const { error } = await supabase.rpc('remove_face_enrollment', { p_room_id: roomId });
  return error ? { error: error.message } : { ok: true as const };
}
