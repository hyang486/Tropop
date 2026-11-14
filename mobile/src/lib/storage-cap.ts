/**
 * Capacity option B (0033): media_integrity refuses a media row when the room's storage (Free 1 GiB, Plus 5 GiB by
 * the host's plan) is full, with errcode PT507 and message 'room_storage_full' (HTTP 507). Pure, for tests.
 */
export function isRoomStorageFull(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === 'PT507' && message === 'room_storage_full';
}

/** UX2-06 (pattern D): an upload that a retry cannot fix. */
export type UploadDeadEnd = 'storage' | 'file';

/** An Error that carries its dead end, so the upload row drops Retry. */
export function deadEndError(deadEnd: UploadDeadEnd, message: string): Error & { deadEnd: UploadDeadEnd } {
  return Object.assign(new Error(message), { deadEnd });
}

export function deadEndOf(error: unknown): UploadDeadEnd | undefined {
  const d = error && typeof error === 'object' ? (error as { deadEnd?: unknown }).deadEnd : undefined;
  return d === 'storage' || d === 'file' ? d : undefined;
}

/**
 * The next step on a dead-end row: a Free host gets "See Plus" (from=storage); a guest is told to ask the host;
 * a Plus host (or a plan still loading) and a bad file get only Remove.
 */
export function deadEndStep(o: { deadEnd: UploadDeadEnd; isHost: boolean; hostPlus: boolean | null }): 'plus' | 'ask-host' | null {
  if (o.deadEnd !== 'storage') return null;
  if (!o.isHost) return 'ask-host';
  return o.hostPlus === false ? 'plus' : null;
}
