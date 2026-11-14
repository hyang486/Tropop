import { en } from '@/i18n/en';

import { errorKind, type ErrorKind } from './error-kind';

// Every fixed string in en: an Error carrying one was written by the app and is safe to show as-is.
let appCopy: Set<string> | null = null;
function isAppCopy(text: string): boolean {
  if (!appCopy) {
    appCopy = new Set();
    const walk = (v: unknown) => {
      if (typeof v === 'string') appCopy!.add(v);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(en);
  }
  return appCopy.has(text);
}

/** An Error whose message is app copy built at runtime (an en function), so errorMessage shows it as-is. */
export function appError(message: string): Error {
  return Object.assign(new Error(message), { appCopy: true });
}

const COPY: Record<ErrorKind, string> = {
  offline: en.errors.offline,
  ended: en.errors.ended,
  notMember: en.errors.notMember,
  notAllowed: en.errors.notAllowed,
  full: en.rooms.errors.full,
  throttled: en.rooms.errors.throttled,
  generic: en.errors.generic,
};

/** UX2-34: text for a failed call. App copy passes through; raw server or network text never does. */
export function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const marked = 'appCopy' in error || 'deadEnd' in error;
    if (marked || isAppCopy(error.message)) return error.message;
  }
  return COPY[errorKind(error)];
}
