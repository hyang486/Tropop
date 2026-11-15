// Connect (0042): pure rules shared by lib/connect.ts and tests. No React Native imports, so node --test can load it.

export const CONNECT_APPS = ['kakaotalk', 'wechat', 'whatsapp', 'line', 'linkedin'] as const;
export type ConnectApp = (typeof CONNECT_APPS)[number];

export function isConnectApp(v: unknown): v is ConnectApp {
  return typeof v === 'string' && (CONNECT_APPS as readonly string[]).includes(v);
}

// Same hosts as private.qr_link_ok in 0042. The server rejects any other link, so the client stores null instead.
const LINK_HOSTS: Record<ConnectApp, RegExp> = {
  kakaotalk: /^https:\/\/(qr\.kakao\.com|open\.kakao\.com|pf-link\.kakao\.com)(\/|$)/i,
  wechat: /^https:\/\/(u\.wechat\.com|weixin\.qq\.com)(\/|$)/i,
  whatsapp: /^https:\/\/(wa\.me|api\.whatsapp\.com)(\/|$)/i,
  line: /^https:\/\/line\.me(\/|$)/i,
  linkedin: /^https:\/\/((www\.)?linkedin\.com\/in\/|lnkd\.in\/)/i,
};

/** The QR's decoded text as a link the server will store for this app, or null (image only). */
export function qrLinkFor(app: ConnectApp, decoded: string | null | undefined): string | null {
  const link = decoded?.trim();
  if (!link || link.length > 512 || !/^https:\/\/\S+$/.test(link)) return null;
  return LINK_HOSTS[app].test(link) ? link : null;
}

/** Which app a decoded QR link belongs to, if any (to suggest the app after a pick). */
export function appForLink(decoded: string | null | undefined): ConnectApp | null {
  for (const app of CONNECT_APPS) if (qrLinkFor(app, decoded)) return app;
  return null;
}

export const CONNECT_BUCKET = 'connect-qr';
/** Same limit as the connect-qr bucket (3 MB). */
export const CONNECT_QR_MAX_BYTES = 3 * 1024 * 1024;

export type QrImageType = { ext: 'png' | 'jpg'; contentType: 'image/png' | 'image/jpeg' };

/** PNG stays PNG (lossless keeps the QR sharp); everything else is re-encoded as JPEG. */
export function qrImageType(mimeType: string | null | undefined, uri: string): QrImageType {
  const png = mimeType ? /png/i.test(mimeType) : /\.png$/i.test(uri.split('?')[0]);
  return png ? { ext: 'png', contentType: 'image/png' } : { ext: 'jpg', contentType: 'image/jpeg' };
}

/** `{user_id}/{uuid}.jpg|png`, the only shape private.is_own_connect_qr_path accepts. */
export function qrImagePath(userId: string, id: string, ext: QrImageType['ext']) {
  return `${userId}/${id}.${ext}`;
}

export type ConnectState = 'none' | 'requested' | 'incoming' | 'connected';
export type RequestResult = 'requested' | 'connected';

/**
 * What a failed Connect call means for the screen. limit opens the Plus sheet; otherLimit is a plain alert that does not
 * reveal the other person's plan (ux, connect-spec §10).
 */
export type ConnectErrorKind =
  | 'limit'
  | 'otherLimit'
  | 'noCodes'
  | 'theyHaveNoCodes'
  | 'throttled'
  | 'roomClosed'
  | 'notConnectable'
  | 'accountRequired'
  | 'notFound'
  | 'badLink'
  | 'badImage'
  | 'tooLarge'
  | 'offline'
  | 'generic';

const OFFLINE =
  /network request failed|failed to fetch|network connection was lost|internet connection appears to be offline/i;

type ErrorLike = { code?: unknown; message?: unknown; name?: unknown; statusCode?: unknown };

export function connectErrorKind(error: unknown): ConnectErrorKind {
  if (!error || typeof error !== 'object') return 'generic';
  const { code, message, name, statusCode } = error as ErrorLike;
  const msg = typeof message === 'string' ? message : '';
  if (name === 'TypeError' || name === 'AbortError' || OFFLINE.test(msg)) return 'offline';
  switch (code) {
    case 'PT402':
      return msg === 'other_connection_limit' ? 'otherLimit' : 'limit';
    case 'PT422':
      return msg === 'they_have_no_codes' ? 'theyHaveNoCodes' : 'noCodes';
    case 'PT429':
      return 'throttled';
    case 'P0002':
      return 'notFound';
    case '42501':
      if (msg === 'Room is not open') return 'roomClosed';
      if (msg === 'They cannot be connected from this room') return 'notConnectable';
      if (msg === 'Account required' || msg === 'Sign in first') return 'accountRequired';
      if (msg === 'Not connected') return 'notFound';
      return 'generic';
    case '22023':
      if (msg === 'Link is not for this app') return 'badLink';
      if (msg === 'Bad image path' || msg === 'Upload the image first') return 'badImage';
      return 'generic';
  }
  // Storage upload errors carry an HTTP status instead of a Postgres code.
  if (statusCode === '413' || statusCode === 413 || /exceeded the maximum allowed size/i.test(msg)) return 'tooLarge';
  if (/mime type .* is not supported/i.test(msg)) return 'badImage';
  return 'generic';
}

/** Error thrown by lib/connect.ts: the kind is what screens branch on; the cause keeps the raw error for logs. */
export class ConnectError extends Error {
  readonly kind: ConnectErrorKind;
  constructor(kind: ConnectErrorKind, cause?: unknown) {
    super(`connect:${kind}`);
    this.name = 'ConnectError';
    this.kind = kind;
    this.cause = cause;
  }
}

export function toConnectError(error: unknown): ConnectError {
  return error instanceof ConnectError ? error : new ConnectError(connectErrorKind(error), error);
}
