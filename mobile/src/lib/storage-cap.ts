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

/** C14: a plan a Plus gate can trust. undefined = not read yet; known = the server or the cache said it. */
export type PlanState = 'plus' | 'free' | 'loading' | 'offline';
export function planState(plus: boolean | undefined, known: boolean): PlanState {
  if (plus === undefined) return 'loading';
  if (!known) return 'offline';
  return plus ? 'plus' : 'free';
}

/**
 * The next step on a dead-end row (C14). Only a host confirmed Free gets "See Plus" (from=storage); while the plan
 * loads its space is reserved and empty; offline with no known plan says so. Guests, a Plus host and a bad file
 * get only Remove.
 */
export function deadEndStep(o: {
  deadEnd: UploadDeadEnd;
  isHost: boolean;
  hostPlan: PlanState;
}): 'plus' | 'reserve' | 'offline' | null {
  if (o.deadEnd !== 'storage' || !o.isHost) return null;
  if (o.hostPlan === 'free') return 'plus';
  if (o.hostPlan === 'loading') return 'reserve';
  if (o.hostPlan === 'offline') return 'offline';
  return null;
}
