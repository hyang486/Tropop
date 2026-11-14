// Run: npm test. Spec 11 C question cards (planning/spec11-briefs/API.md): row parsing, who sees which card, the
// 3-minute ask-in-chat offer, answer bounds, RPC error mapping, notice text and which cards are read aloud.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const p = await import('../src/features/questions/question-plan.ts');

const T0 = Date.parse('2026-11-13T20:00:00Z');
const row = (o = {}) => ({
  id: 'c1',
  room_id: 'r1',
  asker_id: 'asker',
  answerer_id: 'host',
  question: 'Where do we meet?',
  answer: null,
  status: 'pending',
  created_at: new Date(T0).toISOString(),
  timeout_at: new Date(T0 + 180_000).toISOString(),
  answered_at: null,
  posted_as_notice: false,
  ...o,
});

test('parseCard reads a row and drops bad ones', () => {
  const c = p.parseCard(row());
  assert.equal(c.roomId, 'r1');
  assert.equal(c.timeoutAt - c.createdAt, 180_000);
  assert.equal(c.answer, null);
  assert.equal(p.parseCard(row({ status: 'deleted' })), null);
  assert.equal(p.parseCard(row({ timeout_at: 'nope' })), null);
  assert.equal(p.parseCard(null), null);
  assert.equal(p.parseCards([row(), { id: 1 }, row({ id: 'c2' })]).length, 2);
  assert.deepEqual(p.parseCards(null), []);
});

test('only the answerer sees the card to answer; only the asker sees it relayed', () => {
  const cards = p.parseCards([
    row({ id: 'b', created_at: new Date(T0 + 5).toISOString() }),
    row({ id: 'a' }),
    row({ id: 'x', status: 'answered', answer: 'Gate 3', answered_at: new Date(T0 + 9).toISOString() }),
    row({ id: 'o', asker_id: 'other', answerer_id: 'someone' }),
  ]);
  assert.deepEqual(p.cardsToAnswer(cards, 'host').map((c) => c.id), ['a', 'b']);
  assert.deepEqual(p.cardsIAnswered(cards, 'host').map((c) => c.id), ['x']);
  assert.deepEqual(p.cardsIAsked(cards, 'asker').map((c) => c.id), ['a', 'x', 'b']);
  assert.deepEqual(p.cardsToAnswer(cards, 'asker'), []);
  assert.deepEqual(p.cardsToAnswer(cards, undefined), []);
});

test('ask in chat is offered from timeout_at, only while pending', () => {
  const c = p.parseCard(row());
  assert.equal(p.canAskInChat(c, T0 + 179_999), false);
  assert.equal(p.canAskInChat(c, T0 + 180_000), true);
  assert.equal(p.msUntilOffer(c, T0 + 60_000), 120_000);
  assert.equal(p.msUntilOffer(c, T0 + 200_000), 0);
  const answered = p.parseCard(row({ status: 'answered', answer: 'ok' }));
  assert.equal(p.canAskInChat(answered, T0 + 999_999), false);
  assert.equal(p.msUntilOffer(answered, T0), 0);
});

test('answer bounds: 1..2000, and 1000 when posted as notice', () => {
  assert.equal(p.cardAnswer('  hi  ', false), 'hi');
  assert.equal(p.cardAnswer('   ', false), null);
  assert.equal(p.cardAnswer('a'.repeat(2000), false)?.length, 2000);
  assert.equal(p.cardAnswer('a'.repeat(2001), false), null);
  assert.equal(p.cardAnswer('a'.repeat(1001), true), null);
  assert.equal(p.cardAnswer('a'.repeat(1000), true)?.length, 1000);
});

test('RPC errors map to what the screens show', () => {
  assert.equal(p.cardErrorKind('PT409'), 'conflict');
  assert.equal(p.cardErrorKind('22023', 'Wait for the answer a little longer.'), 'too_early');
  assert.equal(p.cardErrorKind('22023', 'An answer is 1 to 2000 characters'), 'invalid');
  assert.equal(p.cardErrorKind('42501', 'Question not found'), 'not_allowed');
  assert.equal(p.cardErrorKind(undefined, 'TypeError: Network request failed'), 'network');
  assert.equal(p.cardErrorKind('XX000', 'boom'), 'failed');
});

test('notice ids and title', () => {
  assert.equal(p.cardNoticeId('c1'), 'question:c1');
  assert.equal(p.answerNoticeId('c1'), 'answer:c1');
  const labels = { one: 'New question', many: (n) => `${n} questions waiting` };
  assert.equal(p.waitingTitle(1, labels), 'New question');
  assert.equal(p.waitingTitle(3, labels), '3 questions waiting');
});

test('cards are read aloud only while moving, each once', () => {
  const cards = p.parseCards([row({ id: 'a' }), row({ id: 'b' })]);
  assert.deepEqual(p.cardsToSpeak(cards, new Set(), false), []);
  assert.deepEqual(p.cardsToSpeak(cards, new Set(['a']), true).map((c) => c.id), ['b']);
});
