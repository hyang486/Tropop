import { randomUUID } from 'expo-crypto';

import { en } from '@/i18n/en';

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
  if (!userId) return { error: en.errors.notSignedIn };
  const path = faceRefPath(roomId, userId, randomUUID());
  // ArrayBuffer body, not Blob: React Native Blob uploads can be stored empty.
  const bytes = await (await fetch(photoUri)).arrayBuffer();
  if (bytes.byteLength === 0) return { error: en.errors.photoUnreadable };
  const { error: upErr } = await supabase.storage.from('face-refs').upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
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
