import { scanFromURLAsync } from 'expo-camera';
import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import {
  CONNECT_BUCKET,
  CONNECT_QR_MAX_BYTES,
  ConnectError,
  isConnectApp,
  qrImagePath,
  qrImageType,
  qrLinkFor,
  toConnectError,
  type ConnectApp,
  type ConnectState,
  type RequestResult,
} from './connect-plan';
import { supabase, SUPABASE_URL } from './supabase';

/**
 * Connect data layer (migration 0042): typed RPC wrappers and the QR image upload. No UI.
 *
 * Every failure is thrown as a ConnectError whose `kind` the screen branches on (see connect-plan.ts).
 * Storage: bucket `connect-qr` (private), `{user_id}/{uuid}.jpg|png`, at most 3 MB. Readable only by the owner and
 * accepted connections. Replacing or removing a code queues the old object for deletion on the server.
 */

// 0042 is not in database.types.ts yet, so these calls go through an untyped view of the client. Regenerate the
// types after 0042 is applied and drop the cast.
type RpcError = { code?: string; message: string };
type Untyped = { rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: RpcError | null }> };
const untyped = () => supabase as unknown as Untyped;

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  let res: { data: unknown; error: RpcError | null };
  try {
    res = await untyped().rpc(fn, args);
  } catch (e) {
    throw toConnectError(e);
  }
  if (res.error) throw toConnectError(res.error);
  return res.data as T;
}

const apps = (v: unknown): ConnectApp[] => (Array.isArray(v) ? v.filter(isConnectApp) : []);

// ------------------------------------------------------------------ types

export type MyQrCode = {
  app: ConnectApp;
  imagePath: string;
  link: string | null;
  updatedAt: string;
  /** "Code not working?" from a connection; cleared when the code is replaced. */
  reportedAt: string | null;
  reportedByName: string | null;
};

export type PartnerQrCode = {
  app: ConnectApp;
  imagePath: string;
  link: string | null;
  updatedAt: string;
  reportedByMe: boolean;
};

export type ConnectionQuota = {
  plan: string;
  used: number;
  /** null = unlimited (Plus). */
  maxConnections: number | null;
  canAdd: boolean;
  /** Drives the gold badge on Profile → Connections (no push this pass). */
  pendingIncoming: number;
};

export type RoomConnectPerson = {
  userId: string;
  apps: ConnectApp[];
  state: ConnectState;
  requestId: string | null;
  /** false for guest (anonymous) accounts: no Connect button. */
  canConnect: boolean;
};

export type ConnectRequest = {
  requestId: string;
  direction: 'incoming' | 'sent';
  otherId: string;
  otherName: string | null;
  otherAvatarPath: string | null;
  otherApps: ConnectApp[];
  roomId: string | null;
  /** Only while the room still exists (H3: never stored on the request). */
  roomName: string | null;
  createdAt: string;
  expiresAt: string;
};

export type Connection = {
  otherId: string;
  otherName: string | null;
  otherAvatarPath: string | null;
  otherApps: ConnectApp[];
  roomId: string | null;
  /** "Met in …" only while the room still exists. */
  roomName: string | null;
  /** "Connected Nov 15": the connection's own date. */
  createdAt: string;
};

// ------------------------------------------------------------------ my codes

type Row = Record<string, unknown>;
const s = (v: unknown) => (typeof v === 'string' ? v : null);

export async function listMyQrCodes(): Promise<MyQrCode[]> {
  const rows = (await call<Row[] | null>('my_qr_codes')) ?? [];
  return rows.flatMap((r) =>
    isConnectApp(r.app)
      ? [{ app: r.app, imagePath: String(r.image_path), link: s(r.link), updatedAt: String(r.updated_at),
           reportedAt: s(r.reported_at), reportedByName: s(r.reported_by_name) }]
      : [],
  );
}

/** Reads the QR in a picked image. Returns its text, or null when no QR is found (or the scan fails). */
export async function decodeQrImage(uri: string): Promise<string | null> {
  try {
    const found = await scanFromURLAsync(uri, ['qr']);
    return found.find((b) => b.data)?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Uploads a QR screenshot for one app and saves it as that app's code (replacing any earlier one).
 * `decoded` is the QR's text from decodeQrImage; it is stored as the tap-to-open link only when it is that app's own
 * https link, otherwise the code is image-only. Returns the stored link.
 */
export async function saveQrCode(params: {
  userId: string;
  app: ConnectApp;
  uri: string;
  mimeType?: string | null;
  decoded?: string | null;
}): Promise<{ imagePath: string; link: string | null }> {
  const { userId, app, uri, mimeType, decoded } = params;
  const type = qrImageType(mimeType, uri);
  let bytes: ArrayBuffer;
  try {
    // Re-encode on the device: drops EXIF (location) and normalises the format. PNG stays lossless for a sharp QR.
    const ref = await ImageManipulator.manipulate(uri).renderAsync();
    const saved = await ref.saveAsync(
      type.ext === 'png' ? { format: SaveFormat.PNG } : { format: SaveFormat.JPEG, compress: 0.9 },
    );
    bytes = await new File(saved.uri).arrayBuffer();
  } catch (e) {
    throw new ConnectError('badImage', e);
  }
  if (bytes.byteLength > CONNECT_QR_MAX_BYTES) throw new ConnectError('tooLarge');

  const imagePath = qrImagePath(userId, randomUUID(), type.ext);
  const link = qrLinkFor(app, decoded);
  try {
    const { error } = await supabase.storage
      .from(CONNECT_BUCKET)
      .upload(imagePath, bytes, { contentType: type.contentType, upsert: false });
    if (error) throw error;
  } catch (e) {
    throw toConnectError(e);
  }
  try {
    await call('upsert_qr_code', { p_app: app, p_image_path: imagePath, p_link: link });
  } catch (e) {
    // Not referenced by any row: remove it now (best effort) so it does not wait for a cleanup job.
    await supabase.storage.from(CONNECT_BUCKET).remove([imagePath]).catch(() => undefined);
    throw e;
  }
  return { imagePath, link };
}

/** Removes my code for this app; connections lose access at once. */
export async function deleteQrCode(app: ConnectApp): Promise<void> {
  await call('delete_qr_code', { p_app: app });
}

/** Authenticated Storage URL for a code image (owner or accepted connection); pass the session token as a header. */
export function qrImageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/authenticated/${CONNECT_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

// ------------------------------------------------------------------ quota, rooms, requests

export async function getConnectionQuota(): Promise<ConnectionQuota> {
  const rows = (await call<Row[] | null>('my_connection_quota')) ?? [];
  const r = rows[0] ?? {};
  return {
    plan: s(r.plan) ?? 'free',
    used: Number(r.used ?? 0),
    maxConnections: r.max_connections == null ? null : Number(r.max_connections),
    canAdd: r.can_add === true,
    pendingIncoming: Number(r.pending_incoming ?? 0),
  };
}

const STATES: readonly ConnectState[] = ['none', 'requested', 'incoming', 'connected'];

/** Other members of a live room with their apps and my Connect state with each. Empty once the room is closed. */
export async function listRoomConnectPeople(roomId: string): Promise<RoomConnectPerson[]> {
  const rows = (await call<Row[] | null>('room_connect_people', { p_room_id: roomId })) ?? [];
  return rows.map((r) => ({
    userId: String(r.user_id),
    apps: apps(r.apps),
    state: STATES.includes(r.state as ConnectState) ? (r.state as ConnectState) : 'none',
    requestId: s(r.request_id),
    canConnect: r.can_connect === true,
  }));
}

/** Incoming pending requests and my sent ones (a silent decline still shows as sent until it expires). */
export async function listConnectRequests(): Promise<ConnectRequest[]> {
  const rows = (await call<Row[] | null>('my_connect_requests')) ?? [];
  return rows.map((r) => ({
    requestId: String(r.request_id),
    direction: r.direction === 'incoming' ? 'incoming' : 'sent',
    otherId: String(r.other_id),
    otherName: s(r.other_name),
    otherAvatarPath: s(r.other_avatar_path),
    otherApps: apps(r.other_apps),
    roomId: s(r.room_id),
    roomName: s(r.room_name),
    createdAt: String(r.created_at),
    expiresAt: String(r.expires_at),
  }));
}

/**
 * Asks someone in the same live room. 'connected' when they had already asked me (asking back is consent).
 * Throws ConnectError limit / otherLimit / noCodes / theyHaveNoCodes / throttled / roomClosed / notConnectable.
 */
export async function requestConnection(roomId: string, otherId: string): Promise<RequestResult> {
  const r = await call<string>('request_connection', { p_room_id: roomId, p_to: otherId });
  return r === 'connected' ? 'connected' : 'requested';
}

/** Accept or decline (works after the room ended). Decline is silent for the sender. */
export async function respondToRequest(requestId: string, accept: boolean): Promise<'connected' | 'declined'> {
  const r = await call<string>('respond_connection', { p_request_id: requestId, p_accept: accept });
  return r === 'connected' ? 'connected' : 'declined';
}

/** Withdraws my pending request (a declined one stays until it expires; no error either way). */
export async function cancelRequest(requestId: string): Promise<void> {
  await call('cancel_connect_request', { p_request_id: requestId });
}

// ------------------------------------------------------------------ connections

export async function listConnections(): Promise<Connection[]> {
  const rows = (await call<Row[] | null>('my_connections')) ?? [];
  return rows.map((r) => ({
    otherId: String(r.other_id),
    otherName: s(r.other_name),
    otherAvatarPath: s(r.other_avatar_path),
    otherApps: apps(r.other_apps),
    roomId: s(r.room_id),
    roomName: s(r.room_name),
    createdAt: String(r.created_at),
  }));
}

/** All of an accepted connection's codes. */
export async function listConnectionQrCodes(otherId: string): Promise<PartnerQrCode[]> {
  const rows = (await call<Row[] | null>('connection_qr_codes', { p_other: otherId })) ?? [];
  return rows.flatMap((r) =>
    isConnectApp(r.app)
      ? [{ app: r.app, imagePath: String(r.image_path), link: s(r.link), updatedAt: String(r.updated_at),
           reportedByMe: r.reported_by_me === true }]
      : [],
  );
}

/** "Code not working?": flags their code for that app; they see it on their own code until they replace it. */
export async function reportQrCode(ownerId: string, app: ConnectApp): Promise<void> {
  await call('report_qr_code', { p_owner: ownerId, p_app: app });
}

/** Either side; both lose access to each other's codes at once. Silent for the other side. */
export async function removeConnection(otherId: string): Promise<void> {
  await call('remove_connection', { p_other: otherId });
}
