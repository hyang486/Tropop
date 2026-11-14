// Pure rules for Qrewing question cards (Spec 11 C, planning/spec11-briefs/API.md): parsing rows, who sees what,
// the 3-minute "ask in chat" offer and the notice text. No React Native imports (tested in node).

export type CardStatus = 'pending' | 'answered' | 'asked_in_chat';

export type QuestionCard = {
  id: string;
  roomId: string;
  askerId: string;
  answererId: string;
  question: string;
  answer: string | null;
  status: CardStatus;
  /** ms since epoch */
  createdAt: number;
  timeoutAt: number;
  answeredAt: number | null;
  postedAsNotice: boolean;
};

export const CARD_LIMITS = { answer: 2000, notice: 1000 } as const;

const STATUSES: readonly string[] = ['pending', 'answered', 'asked_in_chat'];

const time = (v: unknown): number | null => {
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
};

/** A `question_cards` row, or null when it is not one (bad rows are dropped, never shown). */
export function parseCard(row: unknown): QuestionCard | null {
  const r = row as Record<string, unknown> | null;
  if (!r) return null;
  const { id, room_id, asker_id, answerer_id, question, answer, status } = r;
  const createdAt = time(r.created_at);
  const timeoutAt = time(r.timeout_at);
  if (
    typeof id !== 'string' ||
    typeof room_id !== 'string' ||
    typeof asker_id !== 'string' ||
    typeof answerer_id !== 'string' ||
    typeof question !== 'string' ||
    typeof status !== 'string' ||
    !STATUSES.includes(status) ||
    createdAt === null ||
    timeoutAt === null
  ) {
    return null;
  }
  return {
    id,
    roomId: room_id,
    askerId: asker_id,
    answererId: answerer_id,
    question,
    answer: typeof answer === 'string' ? answer : null,
    status: status as CardStatus,
    createdAt,
    timeoutAt,
    answeredAt: time(r.answered_at),
    postedAsNotice: r.posted_as_notice === true,
  };
}

export function parseCards(rows: unknown): QuestionCard[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(parseCard).filter((c): c is QuestionCard => c !== null);
}

/** Cards waiting for my answer, oldest first (the one asked first is answered first). */
export function cardsToAnswer(cards: readonly QuestionCard[], me: string | undefined): QuestionCard[] {
  if (!me) return [];
  return cards.filter((c) => c.answererId === me && c.status === 'pending').sort((a, b) => a.createdAt - b.createdAt);
}

/** Cards I answered, newest first. */
export function cardsIAnswered(cards: readonly QuestionCard[], me: string | undefined): QuestionCard[] {
  if (!me) return [];
  return cards
    .filter((c) => c.answererId === me && c.status === 'answered')
    .sort((a, b) => (b.answeredAt ?? b.createdAt) - (a.answeredAt ?? a.createdAt));
}

/** Questions I asked that Qrewing relayed, oldest first (they follow the Ask Qrewing history). */
export function cardsIAsked(cards: readonly QuestionCard[], me: string | undefined): QuestionCard[] {
  if (!me) return [];
  return cards.filter((c) => c.askerId === me).sort((a, b) => a.createdAt - b.createdAt);
}

/** The asker may move the question to the room chat once `timeout_at` passed with no answer. */
export function canAskInChat(card: QuestionCard, now: number): boolean {
  return card.status === 'pending' && now >= card.timeoutAt;
}

/** ms until the offer shows, or 0 when it already shows (or never will). */
export function msUntilOffer(card: QuestionCard, now: number): number {
  return card.status === 'pending' ? Math.max(0, card.timeoutAt - now) : 0;
}

/** The answer as sent, or null when it cannot be sent. Post as notice caps it at 1000 characters. */
export function cardAnswer(text: string, asNotice: boolean): string | null {
  const a = text.trim();
  const n = [...a].length;
  return n >= 1 && n <= (asNotice ? CARD_LIMITS.notice : CARD_LIMITS.answer) ? a : null;
}

/** Errors from the card RPCs (API.md): PT409 already moved or answered, 22023 too early or bad input. */
export type CardError = 'conflict' | 'too_early' | 'invalid' | 'not_allowed' | 'network' | 'failed';

export function cardErrorKind(code: string | undefined, message?: string): CardError {
  if (code === 'PT409') return 'conflict';
  if (code === '22023') return /wait/i.test(message ?? '') ? 'too_early' : 'invalid';
  if (code === '42501') return 'not_allowed';
  if (!code && /network|fetch|offline/i.test(message ?? '')) return 'network';
  return 'failed';
}

/** Bell notice id of a card waiting for me (one per card; it goes when the card is no longer pending). */
export const cardNoticeId = (cardId: string) => `question:${cardId}`;
/** Bell notice id of an answer to my question. */
export const answerNoticeId = (cardId: string) => `answer:${cardId}`;

/** Notice title for a waiting card: "New question" alone, "3 questions waiting" with more. */
export function waitingTitle(count: number, labels: { one: string; many: (n: number) => string }): string {
  return count > 1 ? labels.many(count) : labels.one;
}

/**
 * Cards to read aloud (Spec 11 C voice): new cards for me that arrived while I am moving in a running activity.
 * `spoken` holds ids already read, so each card is read once.
 */
export function cardsToSpeak(
  toAnswer: readonly QuestionCard[],
  spoken: ReadonlySet<string>,
  moving: boolean,
): QuestionCard[] {
  return moving ? toAnswer.filter((c) => !spoken.has(c.id)) : [];
}
