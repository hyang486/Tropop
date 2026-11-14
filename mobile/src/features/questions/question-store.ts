/**
 * Question cards of one room (Spec 11 C): read through RLS (only my cards as asker or answerer), refetched on the
 * room's `question_cards` broadcast. Feeds the bell (cards waiting for me, answers to my questions) and reads a new
 * card aloud while I am moving in a running activity. Module store read through useSyncExternalStore (React
 * Compiler safe).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useSyncExternalStore } from 'react';

import { paceSnapshot } from '@/features/pace/engine';
import { speak } from '@/features/pace/voice';
import { en } from '@/i18n/en';
import { useRoomEvents } from '@/lib/room-channel';
import { removeNotice, upsertNotice } from '@/lib/room-notices';
import { supabase } from '@/lib/supabase';

import {
  answerNoticeId,
  cardAnswer,
  cardErrorKind,
  type CardError,
  cardNoticeId,
  cardsIAsked,
  cardsToAnswer,
  cardsToSpeak,
  parseCard,
  parseCards,
  type QuestionCard,
  waitingTitle,
} from './question-plan';

// question_cards and its RPCs (migration 0031) are not in database.types.ts yet.
const db = supabase as unknown as SupabaseClient;

type RoomCards = { cards: readonly QuestionCard[]; loaded: boolean };
const EMPTY: RoomCards = { cards: [], loaded: false };
const state = new Map<string, RoomCards>();
const listeners = new Set<() => void>();
const loads = new Map<string, number>();
/** Cards already read aloud (each once per app run). */
const spoken = new Set<string>();
let owner: string | undefined;

function set(roomId: string, cards: readonly QuestionCard[]) {
  state.set(roomId, { cards, loaded: true });
  for (const l of listeners) l();
}

function merge(card: QuestionCard) {
  const cur = state.get(card.roomId)?.cards ?? [];
  set(card.roomId, [...cur.filter((c) => c.id !== card.id), card]);
}

/** Refetches the room's cards. A late answer of an older load never overwrites a newer one. */
export async function loadCards(roomId: string): Promise<void> {
  const seq = (loads.get(roomId) ?? 0) + 1;
  loads.set(roomId, seq);
  try {
    const { data, error } = await db
      .from('question_cards')
      .select('id, room_id, asker_id, answerer_id, question, answer, status, created_at, timeout_at, answered_at, posted_as_notice')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error || loads.get(roomId) !== seq) return;
    set(roomId, parseCards(data));
  } catch {
    // Kept until the next broadcast or screen focus.
  }
}

/** The room ended or I signed out: its cards and their notices go. */
export function clearCards(roomId?: string) {
  for (const id of roomId ? [roomId] : [...state.keys()]) {
    for (const c of state.get(id)?.cards ?? []) {
      removeNotice(cardNoticeId(c.id));
      removeNotice(answerNoticeId(c.id));
    }
    state.delete(id);
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useRoomCards(roomId: string): RoomCards {
  return useSyncExternalStore(subscribe, () => state.get(roomId) ?? EMPTY);
}

type RpcResult = { card: QuestionCard } | { error: CardError };

async function rpc(name: string, args: Record<string, unknown>): Promise<RpcResult> {
  try {
    const { data, error } = await db.rpc(name, args);
    if (error) return { error: cardErrorKind(error.code, error.message) };
    const card = parseCard(data);
    if (!card) return { error: 'failed' };
    merge(card);
    return { card };
  } catch (e) {
    return { error: cardErrorKind(undefined, e instanceof Error ? e.message : String(e)) };
  }
}

/** Answers a card for the asker only; with `asNotice` the answer is also pinned as the room notice. */
export function answerCard(cardId: string, text: string, asNotice: boolean): Promise<RpcResult> {
  const answer = cardAnswer(text, asNotice);
  if (!answer) return Promise.resolve({ error: 'invalid' });
  return rpc('answer_question_card', { p_card_id: cardId, p_answer: answer, p_post_as_notice: asNotice });
}

/** After the 3 minutes: the server posts my question as a normal chat message and closes the card. */
export function askInChat(cardId: string): Promise<RpcResult> {
  return rpc('ask_question_in_chat', { p_card_id: cardId });
}

type ActivityRoom = { id: string; activity_state: string; activity_seq: number };

/**
 * Mounted by the room screen: loads the cards, follows the broadcast, keeps the bell notices in step and reads new
 * cards aloud while I am moving. `names` resolves the asker's and answerer's names for the notice text.
 */
export function useQuestionCards(room: ActivityRoom, userId: string | undefined, names: ReadonlyMap<string, string>) {
  const roomId = room.id;
  const { cards, loaded } = useRoomCards(roomId);

  useEffect(() => {
    // Another account signed in on this phone: the last one's cards go first.
    if (owner !== userId) {
      clearCards();
      owner = userId;
    }
    loadCards(roomId);
  }, [roomId, userId]);

  useRoomEvents(
    roomId,
    (e) => {
      if (e.table === 'question_cards') loadCards(roomId);
    },
    (status) => {
      // Back after a dropped connection: a broadcast may have been missed.
      if (status === 'SUBSCRIBED') loadCards(roomId);
    },
  );

  useEffect(() => {
    if (!loaded || !userId) return;
    const s = en.questions;
    const waiting = cardsToAnswer(cards, userId);
    const title = waitingTitle(waiting.length, { one: s.newQuestion, many: s.waiting });
    for (const c of cards) {
      const waitingCard = waiting.includes(c);
      if (waitingCard) {
        upsertNotice({
          id: cardNoticeId(c.id),
          roomId,
          kind: 'question',
          title,
          body: s.fromAsker(names.get(c.askerId) ?? en.chat.formerMember, c.question),
          createdAt: c.createdAt,
          action: { kind: 'open-question', cardId: c.id },
        });
      } else {
        removeNotice(cardNoticeId(c.id));
      }
    }
    for (const c of cardsIAsked(cards, userId)) {
      if (c.status === 'answered') {
        upsertNotice({
          id: answerNoticeId(c.id),
          roomId,
          kind: 'question',
          title: s.answered(names.get(c.answererId) ?? en.chat.formerMember),
          body: c.question,
          createdAt: c.answeredAt ?? c.createdAt,
          action: { kind: 'open-ask' },
        });
      }
    }
    // Voice (Spec 11 C): read a new card aloud when I am moving in this room's running activity.
    const moving = paceSnapshot(room)?.activity === 'moving';
    for (const c of cardsToSpeak(waiting, spoken, moving)) {
      spoken.add(c.id);
      speak(s.spoken(names.get(c.askerId) ?? en.chat.formerMember, c.question));
    }
  },[cards, loaded, userId, names, roomId, room]);
}
