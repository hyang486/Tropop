/**
 * Capacity option B (0033): media_integrity refuses a media row when the room's storage (Free 1 GiB, Plus 5 GiB by
 * the host's plan) is full, with errcode PT507 and message 'room_storage_full' (HTTP 507). Pure, for tests.
 */
export function isRoomStorageFull(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === 'PT507' && message === 'room_storage_full';
}
