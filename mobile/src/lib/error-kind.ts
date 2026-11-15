// UX2-34: raw server and network text never reaches the screen. Pure (no React Native imports), so node --test
// can load it; lib/errors.ts turns the kind into copy.

// Same rule as isOfflineError in features/event/qrewing-plan (kept here: node --test can't resolve that import).
const OFFLINE_NAMES = new Set(['TypeError', 'AbortError', 'TimeoutError', 'FetchError', 'FunctionsFetchError']);
const OFFLINE_MESSAGE =
  /^(TypeError|AbortError|TimeoutError|FetchError): |network request failed|failed to fetch|network connection was lost|internet connection appears to be offline/i;

function isOfflineError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (typeof name === 'string' && OFFLINE_NAMES.has(name)) return true;
  return typeof message === 'string' && OFFLINE_MESSAGE.test(message);
}

/**
 * Server exception texts (supabase/migrations `raise exception`) that are deliberate user-facing copy: shown as-is
 * whatever their errcode. Internal ones (Invalid value, Unknown status, paths, plan_limit, ...) are not listed and map
 * by kind. 'This room has ended.', 'This room is full.' and the throttle text map by kind to the same meaning.
 */
/**
 * Rename (human, 2026-11-14): the AI is "Trok" in the app, but the live DB still raises these texts with the old name
 * (migrations 0027/0028/0035). Match the exact server text; show the renamed copy.
 */
const SERVER_COPY_RENAMED: ReadonlyMap<string, string> = new Map([
  ['Entry info can be required only in an event room with Qrewing AI on', 'Entry info can be required only in an event room with Trok AI on'],
  ['Mute small talk needs Qrewing AI consent', 'Mute small talk needs Trok AI consent'],
  ['Only the host of an open room can change Qrewing AI', 'Only the host of an open room can change Trok AI'],
  ['Qrewing AI is off in this room', 'Trok AI is off in this room'],
]);

/** The text to show for an 'asIs' server message: the renamed copy when the server still uses the old name. */
export function serverCopyText(text: string): string {
  return SERVER_COPY_RENAMED.get(text) ?? text;
}

export const SERVER_COPY: ReadonlySet<string> = new Set([
  'A notice is at most 1000 characters',
  'A pin needs a place name',
  'A pin needs both latitude and longitude',
  'A public room needs a location of 1 to 60 characters',
  'A public room needs an icon',
  'Add 1 to 8 questions',
  'Add at least one entry question first',
  'An answer is 1 to 2000 characters',
  'Answer every required question',
  'Answer is too long',
  'Both people must be members of an open room.',
  'Capacity must be between 2 and 30',
  'Declared size must be 1 byte to 50 MB',
  'Each question needs 1 to 120 characters',
  'Entry questions are only for event rooms',
  'Expiration must be between 5 minutes and 7 days from now',
  'Headline must be 1 to 80 characters',
  'Host account required',
  'Icon and location are only for public rooms',
  'Interests and looking for must be at most 300 characters each',
  'Location sharing is not allowed in this room.',
  'Only the host can change location sharing.',
  'Only the host can change the expiration.',
  'Only the host can edit statuses.',
  'Only the host can edit the route.',
  'Only the host can end this room.',
  'Only the host can reissue the invite.',
  'Only the host can start or end the activity.',
  'Only the host of an open room can set entry questions',
  'Place name must be at most 80 characters',
  'Questions are locked after the first answer',
  'Sign in first',
  'Sign in required',
  'Start time must be before the room closes and not more than a day ago',
  'The host cannot leave. End the room instead.',
  'The pin is outside the valid range',
  'This question was already answered.',
  'This question was moved to the chat.',
  'Too many unanswered questions.',
  'Up to 3 links, each starting with https:// and at most 200 characters',
  'Wait for the answer a little longer.',
  'You can create up to 5 public rooms per day.',
]);

/**
 * offline: the request never reached the server. ended: the room is closed (P0002, or the server's "not a member
 * of an open room", which is what an ended or expired room returns). notMember: removed from the room.
 * notAllowed: any other permission refusal (42501, RLS, 401/403). full / throttled: the server's own limits.
 */
export type ErrorKind =
  | 'asIs'
  | 'offline' | 'ended' | 'notMember' | 'notAllowed' | 'full' | 'throttled' | 'generic';

export function errorKind(error: unknown): ErrorKind {
  if (isOfflineError(error)) return 'offline';
  if (!error || typeof error !== 'object') return 'generic';
  const { code, message, status } = error as { code?: unknown; message?: unknown; status?: unknown };
  const text = typeof message === 'string' ? message : '';
  if (SERVER_COPY.has(text) || SERVER_COPY_RENAMED.has(text)) return 'asIs';
  if (code === 'PT409' || /room is full/i.test(text)) return 'full';
  if (code === 'PT429' || /too many attempts/i.test(text)) return 'throttled';
  if (code === 'P0002' || /room has ended|not a member of an open room|room (has )?expired/i.test(text)) return 'ended';
  if (/not a member/i.test(text)) return 'notMember';
  if (
    code === '42501' ||
    code === 'PGRST301' ||
    status === 401 ||
    status === 403 ||
    /permission denied|row-level security|not allowed|forbidden/i.test(text)
  ) {
    return 'notAllowed';
  }
  return 'generic';
}

// F-EM-EXP: why a send failed, with its own cause for "the room has ended" (never shown as a network error).
// Same fields as room-ended's EndedRoomFields (kept here: node --test can't resolve cross-file imports).
type EndedRoomFields = { deleted_at: string | null; expires_at: string };

/** ended: the room is closed (client clock, host end, or the server's refusal). offline: never reached the server. other: anything else. */
export type SendFailure = 'ended' | 'offline' | 'other';

/** True when the loaded room row already shows it closed (expires_at passed or deleted_at set). */
export function roomHasEnded(room: EndedRoomFields | null | undefined, nowMs: number): boolean {
  if (!room) return false;
  if (room.deleted_at !== null) return true;
  const expires = new Date(room.expires_at).getTime();
  return Number.isFinite(expires) && expires <= nowMs;
}

/**
 * Cause of a failed send. The server answers an ended room with P0002 or "Not a member of an open room" (errorKind 'ended'),
 * but also with 42501 "Not a member of this room" (set_my_status) and an RLS refusal (messages insert), which look like
 * removal or a permission problem. Those count as ended only when the client's own room row shows it closed.
 */
export function sendFailure(error: unknown, room: EndedRoomFields | null | undefined, nowMs: number): SendFailure {
  const kind = errorKind(error);
  if (kind === 'offline') return 'offline';
  if (kind === 'ended') return 'ended';
  if ((kind === 'notMember' || kind === 'notAllowed' || kind === 'generic') && roomHasEnded(room, nowMs)) return 'ended';
  return 'other';
}

/**
 * F-EMX1: the loaded room row can be stale (the host ended the room early, so deleted_at is still null there). On a
 * refusal that could mean "ended" (not a member, not allowed, generic), read the room once more and classify against
 * that row. A network error stays offline; a failed or empty re-read stays 'other'.
 */
export async function sendFailureRefetched(
  error: unknown,
  room: EndedRoomFields | null | undefined,
  nowMs: number,
  refetch: () => Promise<EndedRoomFields | null | undefined>,
): Promise<SendFailure> {
  const first = sendFailure(error, room, nowMs);
  if (first !== 'other') return first;
  const kind = errorKind(error);
  if (kind !== 'notMember' && kind !== 'notAllowed' && kind !== 'generic') return 'other';
  try {
    return sendFailure(error, await refetch(), nowMs);
  } catch {
    return 'other';
  }
}
