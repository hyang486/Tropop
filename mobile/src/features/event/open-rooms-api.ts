// Spec 11 B/D client calls (migration 0031, planning/spec11-briefs/API.md). database.types.ts predates 0031, so the
// new RPC arguments are typed here by hand; regenerate the types after 0031 is live and drop the casts.
import type { PostgrestError } from '@supabase/supabase-js';

import { en } from '@/i18n/en';
import { placeTimeArgs, type LatLng } from '@/lib/place-time';
import { RoomError, type Room, type RoomType } from '@/lib/rooms';
import { supabase } from '@/lib/supabase';

import { joinedRoomId, openRoomArgs, type Capacity, type Visibility } from './open-room-plan';

export type OpenRoom = {
  room_id: string;
  name: string;
  type: RoomType;
  public_icon: string;
  public_location: string;
  member_count: number;
  max_members: number;
  expires_at: string;
  already_member: boolean;
};

type UntypedRpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: PostgrestError | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc;

/** PT409 full (join), PT422 the 5-per-day public limit (create). */
export function openRoomError(error: PostgrestError) {
  if (error.code === 'PT409') return new RoomError('full', en.rooms.errors.full);
  if (error.code === 'PT422') return new RoomError('other', en.openChat.dailyLimit);
  return new RoomError('other', error.message || en.errors.generic);
}

export async function createOpenAwareRoom(input: {
  name: string;
  type: RoomType;
  expiresAt: Date;
  locationAllowed: boolean;
  statuses: string[];
  placeName: string;
  pin: LatLng | null;
  startsAt: Date | null;
  capacity: Capacity;
  plus: boolean | null;
  visibility: Visibility;
  icon: string;
  area: string;
}): Promise<Room> {
  const { data, error } = await rpc('create_room', {
    p_name: input.name,
    p_type: input.type,
    p_expires_at: input.expiresAt.toISOString(),
    p_location_allowed: input.locationAllowed,
    p_statuses: input.statuses,
    ...placeTimeArgs({ placeName: input.placeName, pin: input.pin, startsAt: input.startsAt }),
    ...openRoomArgs(input),
  });
  if (error) throw error.code === 'PT422' ? openRoomError(error) : error;
  return data as Room;
}

export async function listOpenRooms(limit = 50): Promise<OpenRoom[]> {
  const { data, error } = await rpc('list_open_rooms', { p_limit: limit });
  if (error) throw error;
  return (data as OpenRoom[] | null) ?? [];
}

/** Joins a public room without a code and returns its id; throws "no longer open" when the room is gone. */
export async function joinOpenRoom(roomId: string): Promise<string> {
  const { data, error } = await rpc('join_open_room', { p_room_id: roomId });
  if (error) throw openRoomError(error);
  // F-D1: null without an error when the room went private, was deleted or expired after the list was read.
  const id = joinedRoomId(data);
  if (!id) throw new RoomError('other', en.openChat.gone);
  return id;
}
