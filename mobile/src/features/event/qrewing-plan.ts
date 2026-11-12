// Pure logic for the Qrewing AI client (no React Native imports, so node --test can load it).
import type { MatchResult, QrewingError } from './types';

const KNOWN: readonly QrewingError[] = [
  'ai_not_configured',
  'ai_off',
  'not_member',
  'not_muted',
  'no_entry',
  'too_early',
  'ai_failed',
  'network',
];

/**
 * Maps a failed `qrewing` call to a contract error. `status` 0 means the request never got an HTTP answer.
 * A known `error` code in the body wins; otherwise the status decides (spec section 2, common order).
 */
export function classifyQrewingError(status: number, bodyError?: unknown): QrewingError {
  if (typeof bodyError === 'string' && (KNOWN as readonly string[]).includes(bodyError)) return bodyError as QrewingError;
  if (status === 0) return 'network';
  if (status === 503) return 'ai_not_configured';
  if (status === 401 || status === 403) return 'not_member';
  return 'ai_failed';
}

export function isQrewingError<T extends object>(value: T | { error: QrewingError }): value is { error: QrewingError } {
  return 'error' in value && typeof (value as { error?: unknown }).error === 'string';
}

const OFFLINE_NAMES = new Set(['TypeError', 'AbortError', 'TimeoutError', 'FetchError', 'FunctionsFetchError']);
const OFFLINE_MESSAGE = /^(TypeError|AbortError|TimeoutError|FetchError): |network request failed|failed to fetch|network connection was lost|internet connection appears to be offline/i;

/**
 * True only when the request itself never got an answer (offline, timeout, aborted): a thrown fetch error
 * (`TypeError: Network request failed`, `AbortError`, `FunctionsFetchError`) or a supabase-js error built from
 * one (its message starts with the fetch error's name). Anything that came back from a server, including a
 * gateway 5xx or a non-JSON body (supabase-js also leaves `code` empty for those) and a FunctionsRelayError, is a
 * server failure, not offline.
 */
export function isOfflineError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (typeof name === 'string' && OFFLINE_NAMES.has(name)) return true;
  return typeof message === 'string' && OFFLINE_MESSAGE.test(message);
}

/** Short text for a failed save or read in a Qrewing screen; never the raw server message. */
export function saveErrorKind(error: unknown): 'network' | 'failed' {
  return isOfflineError(error) ? 'network' : 'failed';
}

/**
 * A failed `functions.invoke('qrewing')`: `http` (FunctionsHttpError: read the status and body), `network` (the
 * request never got an answer) or `server` (FunctionsRelayError or anything else that did reach Supabase).
 */
export function invokeFailureKind(error: unknown): 'http' | 'network' | 'server' {
  const name = error && typeof error === 'object' ? (error as { name?: unknown }).name : undefined;
  if (name === 'FunctionsHttpError') return 'http';
  if (name === 'FunctionsRelayError') return 'server';
  return isOfflineError(error) ? 'network' : 'server';
}

/** Wait before the one re-ask after a 202 pending match answer (backend 68132d6). */
export const MATCH_RETRY_MS = 10_000;

export type MatchAnswer = MatchResult | { state: 'pending' } | { error: QrewingError };
export type MatchStep =
  | { show: 'list'; result: MatchResult; pending: boolean; retryInMs: number | null }
  | { show: 'pending'; retryInMs: number | null }
  | { show: 'error'; error: QrewingError };

/**
 * People to meet after one `match` answer. 202 pending (another call for my list is running): keep the last list
 * if there is one, else a pending line, and re-ask once after MATCH_RETRY_MS when this answer was not itself the
 * re-ask; never in a loop. 200 with stale:true is a normal list (the screen shows the stale hint, no error).
 */
export function matchStep(answer: MatchAnswer, last: MatchResult | null, isRetry: boolean): MatchStep {
  if ('error' in answer) return { show: 'error', error: answer.error };
  if ('matches' in answer) return { show: 'list', result: answer, pending: false, retryInMs: null };
  const retryInMs = isRetry ? null : MATCH_RETRY_MS;
  return last ? { show: 'list', result: last, pending: true, retryInMs } : { show: 'pending', retryInMs };
}
