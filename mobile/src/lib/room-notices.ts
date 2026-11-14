/**
 * Room notices (Spec 11 A9): what the chat header bell holds: the room-ending notice, new question cards,
 * Emergency and reminders. Phone memory only: no server calls; producers push and remove their own notices.
 * Cleared on sign-out (auth.tsx). Read through useSyncExternalStore (React Compiler safe).
 */
import { useSyncExternalStore } from 'react';

export type NoticeKind = 'room-ending' | 'question' | 'emergency' | 'reminder';

/** What tapping the notice opens. */
export type NoticeAction = { kind: 'open-question'; cardId: string } | { kind: 'open-chat' } | { kind: 'open-info' };

export type Notice = {
  /** Stable per notice, e.g. 'question:<card id>' or 'room-ending:<room id>:1h'. Upserting the same id replaces it. */
  id: string;
  roomId: string;
  kind: NoticeKind;
  title: string;
  body?: string;
  /** ms since epoch; newest first in the list. */
  createdAt: number;
  action?: NoticeAction;
};

export type RoomNotices = { notices: readonly Notice[]; unread: number };

const byId = new Map<string, Notice>();
const readIds = new Set<string>();
const snapshots = new Map<string, RoomNotices>();
const listeners = new Set<() => void>();
const EMPTY: RoomNotices = { notices: [], unread: 0 };

function changed(roomId?: string) {
  if (roomId) snapshots.delete(roomId);
  else snapshots.clear();
  for (const l of listeners) l();
}

function same(a: Notice, b: Notice): boolean {
  return (
    a.roomId === b.roomId &&
    a.kind === b.kind &&
    a.title === b.title &&
    a.body === b.body &&
    a.createdAt === b.createdAt &&
    JSON.stringify(a.action) === JSON.stringify(b.action)
  );
}

/** Adds or replaces a notice by id. An identical upsert is a no-op (no re-render, read state kept). */
export function upsertNotice(notice: Notice): void {
  const old = byId.get(notice.id);
  if (old && same(old, notice)) return;
  byId.set(notice.id, { ...notice });
  if (old && old.roomId !== notice.roomId) snapshots.delete(old.roomId);
  changed(notice.roomId);
}

export function removeNotice(id: string): void {
  const old = byId.get(id);
  if (!old) return;
  byId.delete(id);
  readIds.delete(id);
  changed(old.roomId);
}

/** Opening the bell: every notice the room has now counts as read. Later notices are unread again. */
export function markRoomNoticesRead(roomId: string): void {
  let any = false;
  for (const n of byId.values()) {
    if (n.roomId === roomId && !readIds.has(n.id)) {
      readIds.add(n.id);
      any = true;
    }
  }
  if (any) changed(roomId);
}

/** Drops one room's notices (the room ended or I left). */
export function clearRoomNotices(roomId: string): void {
  let any = false;
  for (const [id, n] of byId) {
    if (n.roomId === roomId) {
      byId.delete(id);
      readIds.delete(id);
      any = true;
    }
  }
  if (any) changed(roomId);
}

/** Sign-out and account deletion. */
export function clearAllNotices(): void {
  if (byId.size === 0 && readIds.size === 0) return;
  byId.clear();
  readIds.clear();
  changed();
}

export function roomNotices(roomId: string): RoomNotices {
  const cached = snapshots.get(roomId);
  if (cached) return cached;
  const notices = [...byId.values()].filter((n) => n.roomId === roomId).sort((a, b) => b.createdAt - a.createdAt);
  const snap = notices.length ? { notices, unread: notices.filter((n) => !readIds.has(n.id)).length } : EMPTY;
  snapshots.set(roomId, snap);
  return snap;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRoomNotices(roomId: string): RoomNotices {
  return useSyncExternalStore(subscribe, () => roomNotices(roomId));
}
