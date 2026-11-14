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
 * offline: the request never reached the server. ended: the room is closed (P0002, or the server's "not a member
 * of an open room", which is what an ended or expired room returns). notMember: removed from the room.
 * notAllowed: any other permission refusal (42501, RLS, 401/403). full / throttled: the server's own limits.
 */
export type ErrorKind = 'offline' | 'ended' | 'notMember' | 'notAllowed' | 'full' | 'throttled' | 'generic';

export function errorKind(error: unknown): ErrorKind {
  if (isOfflineError(error)) return 'offline';
  if (!error || typeof error !== 'object') return 'generic';
  const { code, message, status } = error as { code?: unknown; message?: unknown; status?: unknown };
  const text = typeof message === 'string' ? message : '';
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
