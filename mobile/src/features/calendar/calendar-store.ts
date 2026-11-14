/**
 * Qrewing Calendar storage: the per-user calendar doc (phone only) and the Plus flag (server user_plans, cached) in AsyncStorage,
 * with an in-memory copy and listeners so every screen sees one state. Writes are serialized per key.
 * Both keys are removed when the user signs out or the account is deleted (both end in SIGNED_OUT).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { supabase } from '@/lib/supabase';

import {
  applyRecap,
  type CalendarDoc,
  calendarKey,
  clearUserCalendar,
  deleteEvent,
  emptyDoc,
  mayWrite,
  type EventInput,
  mergeRooms,
  parseDoc,
  planFromRead,
  planSaveOutcome,
  plusPreviewKey,
  upsertEvent,
} from './calendar-data';

// Who is signed in, from auth events (update() and setPlusPreview() skip writes for anyone else).
let currentUid: string | null = null;
let authKnown = false;
const docs = new Map<string, CalendarDoc>();
const plus = new Map<string, boolean>();
const listeners = new Set<() => void>();
let chain: Promise<unknown> = Promise.resolve();

function emit() {
  for (const l of listeners) l();
}

function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.catch(() => {});
  return run;
}

async function loadDoc(uid: string): Promise<CalendarDoc> {
  const hit = docs.get(uid);
  if (hit) return hit;
  let doc = emptyDoc();
  try {
    doc = parseDoc(await AsyncStorage.getItem(calendarKey(uid)));
  } catch {}
  if (!docs.has(uid)) docs.set(uid, doc);
  return docs.get(uid)!;
}

/** Read, change and write the user's doc in order; failures keep the in-memory copy (never block the app). */
function update(uid: string, change: (doc: CalendarDoc) => CalendarDoc): Promise<void> {
  return serial(async () => {
    if (!mayWrite(uid, currentUid, authKnown)) return;
    const next = change(await loadDoc(uid));
    docs.set(uid, next);
    emit();
    try {
      await AsyncStorage.setItem(calendarKey(uid), JSON.stringify(next));
    } catch {}
  });
}

export function syncCalendarRooms(uid: string | null | undefined, rooms: Parameters<typeof mergeRooms>[1]) {
  if (!uid || rooms.length === 0) return;
  void update(uid, (doc) => mergeRooms(doc, rooms));
}

export function saveRecapToCalendar(uid: string, roomId: string, recap: { emoji?: unknown; diary?: unknown }) {
  return update(uid, (doc) => applyRecap(doc, roomId, recap));
}

/** True while this room has no good diary saved, so the recap call asks for one (Plus preview only; capped server-side). */
export async function wantsDiary(uid: string, roomId: string): Promise<boolean> {
  if (!(await loadPlus(uid))) return false;
  const room = (await loadDoc(uid)).rooms[roomId];
  return !room || !Array.isArray(room.diary) || room.diary.length === 0;
}

export const saveEvent = (uid: string, id: string, e: EventInput) => update(uid, (doc) => upsertEvent(doc, id, e));
export const removeEvent = (uid: string, id: string) => update(uid, (doc) => deleteEvent(doc, id));

/**
 * Store reads go through useSyncExternalStore: the React Compiler caches plain render reads of module state on
 * the hook's inputs (uid), which kept a stale null after the first load (2026-11-13 stuck spinner).
 */
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useCalendar(uid: string | null | undefined): CalendarDoc | null {
  useEffect(() => {
    if (uid && !docs.has(uid)) void loadDoc(uid).then(emit);
  }, [uid]);
  return useSyncExternalStore(subscribe, () => (uid ? (docs.get(uid) ?? null) : null));
}

// 0032 is not in database.types.ts yet: user_plans / set_my_plan go through an untyped view of the client.
// Regenerate the types after 0032 is applied and drop the cast.
type UntypedPlans = {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ error: unknown }>;
  from(table: string): {
    select(cols: string): {
      eq(col: string, v: string): { maybeSingle(): PromiseLike<{ data: { plan?: unknown } | null; error: unknown }> };
    };
  };
};
const plans = () => supabase as unknown as UntypedPlans;

async function readCachedPlus(uid: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(plusPreviewKey(uid))) === '1';
  } catch {
    return false;
  }
}

async function writeCachedPlus(uid: string, on: boolean) {
  if (!mayWrite(uid, currentUid, authKnown)) return;
  try {
    if (on) await AsyncStorage.setItem(plusPreviewKey(uid), '1');
    else await AsyncStorage.removeItem(plusPreviewKey(uid));
  } catch {}
}

/** Server plan first (user_plans, 0032); the local key is its cache and the fallback when 0032 is missing or offline. */
async function loadPlus(uid: string): Promise<boolean> {
  if (plus.has(uid)) return plus.get(uid)!;
  let on = await readCachedPlus(uid);
  let server: boolean | null = null;
  try {
    server = planFromRead(await plans().from('user_plans').select('plan').eq('user_id', uid).maybeSingle());
  } catch {}
  if (server !== null) {
    on = server;
    void writeCachedPlus(uid, on);
  }
  if (!plus.has(uid)) plus.set(uid, on);
  return plus.get(uid)!;
}

/**
 * Save the plan through set_my_plan. Before 0032 is live the local copy keeps it (no error). Any other failure
 * flips the flag back and returns false so the screen shows the error.
 */
export async function setPlusPreview(uid: string, on: boolean): Promise<boolean> {
  if (!mayWrite(uid, currentUid, authKnown)) return true;
  const before = plus.get(uid) ?? false;
  plus.set(uid, on);
  emit();
  let error: unknown = null;
  try {
    ({ error } = await plans().rpc('set_my_plan', { p_plan: on ? 'plus' : 'free' }));
  } catch (e) {
    error = e ?? new Error('set_my_plan failed');
  }
  if (planSaveOutcome(error) === 'revert') {
    if (plus.get(uid) === on && mayWrite(uid, currentUid, authKnown)) {
      plus.set(uid, before);
      emit();
    }
    return false;
  }
  await writeCachedPlus(uid, on);
  return true;
}

/** The server said Free where the local copy said Plus (qrewing 402 plan_limit): read the plan again. */
export function refreshPlus(uid: string) {
  if (!mayWrite(uid, currentUid, authKnown)) return;
  plus.delete(uid);
  void loadPlus(uid).then(emit);
}

/** The Plus preview flag (null while loading). */
export function usePlusPreview(uid: string | null | undefined): boolean | null {
  useEffect(() => {
    if (uid && !plus.has(uid)) void loadPlus(uid).then(emit);
  }, [uid]);
  return useSyncExternalStore(subscribe, () => (uid ? (plus.get(uid) ?? null) : null));
}

// Sign-out and account deletion (deleteAccount and the account-gone check both end in signOut) emit SIGNED_OUT:
// remove that user's calendar and Plus preview keys. INITIAL_SESSION on subscribe tells us who is signed in.
supabase.auth.onAuthStateChange((event, session) => {
  authKnown = true;
  if (session?.user.id) currentUid = session.user.id;
  if (event !== 'SIGNED_OUT' || !currentUid) return;
  const uid = currentUid;
  currentUid = null;
  docs.delete(uid);
  plus.delete(uid);
  emit();
  void serial(() => clearUserCalendar(AsyncStorage, uid)).catch(() => {});
});
