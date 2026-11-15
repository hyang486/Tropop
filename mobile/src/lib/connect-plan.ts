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

// ------------------------------------------------------------------ UI planning (Connect screens)

export const CONNECT_APP_NAMES: Record<ConnectApp, string> = {
  kakaotalk: 'KakaoTalk',
  wechat: 'WeChat',
  whatsapp: 'WhatsApp',
  line: 'LINE',
  linkedin: 'LinkedIn',
};

/** "KakaoTalk, LINE" in the fixed app order, whatever order the server sent. */
export function appNames(apps: readonly ConnectApp[]): string {
  return CONNECT_APPS.filter((a) => apps.includes(a))
    .map((a) => CONNECT_APP_NAMES[a])
    .join(', ');
}

/** App Store pages for "Get LINE" when the app is missing. */
export const CONNECT_APP_STORE: Record<ConnectApp, string> = {
  kakaotalk: 'https://apps.apple.com/app/id362057947',
  wechat: 'https://apps.apple.com/app/id414478124',
  whatsapp: 'https://apps.apple.com/app/id310633997',
  line: 'https://apps.apple.com/app/id443904275',
  linkedin: 'https://apps.apple.com/app/id288429040',
};

/** Launch schemes for the fallback's "Open KakaoTalk" (opens the app; the user scans the saved photo there). */
export const CONNECT_APP_SCHEME: Record<ConnectApp, string> = {
  kakaotalk: 'kakaotalk://',
  wechat: 'weixin://',
  whatsapp: 'whatsapp://',
  line: 'line://',
  linkedin: 'linkedin://',
};

/**
 * spec §10: KakaoTalk and WeChat links can land in Safari instead of the app, so they (and any image-only code)
 * use the full-screen QR fallback (Save to Photos + Open app). The others open their https link directly.
 */
export function opensFromLink(app: ConnectApp, link: string | null): boolean {
  return link != null && app !== 'kakaotalk' && app !== 'wechat';
}

/** "Expires in 13 days" count: whole days left, at least 1 while not expired, 0 once past. */
export function daysLeft(expiresAt: string, now: number = Date.now()): number {
  const ms = Date.parse(expiresAt) - now;
  if (!(ms > 0)) return 0;
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

/** "Updated" tag on a connection's code: replaced in the last 7 days (spec §4). */
export function isRecentlyUpdated(updatedAt: string, now: number = Date.now()): boolean {
  const t = Date.parse(updatedAt);
  return Number.isFinite(t) && now - t >= 0 && now - t < 7 * 86_400_000;
}

export type PersonConnectBlock =
  | { kind: 'hidden' } // room ended, guest, or myself
  | { kind: 'theyHaveNone' } // "Sora hasn't added any QR codes."
  | { kind: 'connect'; needsCodes: boolean; gated: boolean } // primary Connect
  | { kind: 'requested' }
  | { kind: 'incoming'; gated: boolean }
  | { kind: 'connected' };

/**
 * spec §2 table + §10: what the person card shows. `gated` = Free at the limit, so Connect/Accept open the Plus sheet
 * before acting. Connected and Requested stay visible after the room ends only through the inbox, not here.
 */
export function personConnectBlock(p: {
  isMe: boolean;
  roomLive: boolean;
  canConnect: boolean;
  state: ConnectState;
  theirApps: readonly ConnectApp[];
  myCodeCount: number;
  quotaCanAdd: boolean;
}): PersonConnectBlock {
  if (p.isMe || !p.roomLive || !p.canConnect) return { kind: 'hidden' };
  if (p.state === 'connected') return { kind: 'connected' };
  if (p.state === 'requested') return { kind: 'requested' };
  if (p.state === 'incoming') return { kind: 'incoming', gated: !p.quotaCanAdd };
  if (p.theirApps.length === 0) return { kind: 'theyHaveNone' };
  return { kind: 'connect', needsCodes: p.myCodeCount === 0, gated: !p.quotaCanAdd };
}

export type CropRect = { originX: number; originY: number; width: number; height: number };

/**
 * spec §1 step 3: crop a screenshot to the QR plus a 12% margin (hides the name and photo around it).
 * iOS CIDetector reports bounds with a bottom-left origin; other scanners use top-left. Returns the
 * flipped (bottom-left) candidate first, then the top-left one; the caller keeps the first crop that still decodes.
 * Rects are whole pixels, clamped to the image. Empty when the bounds are unusable.
 */
export function qrCropCandidates(
  bounds: { origin: { x: number; y: number }; size: { width: number; height: number } } | null | undefined,
  imageWidth: number,
  imageHeight: number,
  margin = 0.12,
): CropRect[] {
  if (!bounds || !(imageWidth > 0) || !(imageHeight > 0)) return [];
  const { x, y } = bounds.origin;
  const { width: w, height: h } = bounds.size;
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return [];
  const pad = Math.max(w, h) * margin;
  const rect = (top: number): CropRect | null => {
    const x0 = Math.max(0, Math.floor(x - pad));
    const y0 = Math.max(0, Math.floor(top - pad));
    const x1 = Math.min(imageWidth, Math.ceil(x + w + pad));
    const y1 = Math.min(imageHeight, Math.ceil(top + h + pad));
    return x1 - x0 >= 8 && y1 - y0 >= 8 ? { originX: x0, originY: y0, width: x1 - x0, height: y1 - y0 } : null;
  };
  const out: CropRect[] = [];
  for (const r of [rect(imageHeight - y - h), rect(y)]) {
    if (r && !out.some((o) => o.originX === r.originX && o.originY === r.originY)) out.push(r);
  }
  return out;
}
