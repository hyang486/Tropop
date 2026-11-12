// Pure logic for the Qrewing AI client (no React Native imports, so node --test can load it).
import type { QrewingError } from './types';

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
