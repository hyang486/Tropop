/**
 * UX P1-5: listMyRooms embeds `room_members(count)`; PostgREST returns it as `[{ count: n }]`.
 * This flattens it to `member_count` (null when the embed is missing) and drops the nested field.
 */
export function withMemberCount<T extends { room_members?: unknown }>(
  row: T,
): Omit<T, 'room_members'> & { member_count: number | null } {
  const { room_members, ...rest } = row;
  const first = Array.isArray(room_members) ? room_members[0] : null;
  const count = first && typeof first === 'object' ? (first as { count?: unknown }).count : null;
  return { ...rest, member_count: typeof count === 'number' && count >= 0 ? count : null };
}
