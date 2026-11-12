// Entry info (spec 1.3): read and upsert through the room-scoped table and RPC.
import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

import type { EntryInput } from './event-plan';
import type { EntryProfileRow } from './types';

// Untyped until database.types.ts is regenerated after migration 0027 (see qrewing-api.ts).
const db = supabase as unknown as SupabaseClient;

export async function getEntryProfile(roomId: string, userId: string): Promise<EntryProfileRow | null> {
  const { data, error } = await db
    .from('entry_profiles')
    .select('*')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle<EntryProfileRow>();
  if (error) throw error;
  return data;
}

/** Everyone's entry info in the room (members can read each other's; the form says so). */
export async function listEntryProfiles(roomId: string): Promise<EntryProfileRow[]> {
  const { data, error } = await db.from('entry_profiles').select('*').eq('room_id', roomId);
  if (error) throw error;
  return (data ?? []) as EntryProfileRow[];
}

export async function saveEntryProfile(roomId: string, entry: EntryInput): Promise<{ error?: string }> {
  const { error } = await db.rpc('upsert_entry_profile', {
    p_room_id: roomId,
    p_headline: entry.headline,
    p_interests: entry.interests,
    p_looking_for: entry.lookingFor,
    p_links: entry.links,
  });
  return error ? { error: error.message } : {};
}
