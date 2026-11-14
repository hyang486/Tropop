// Run: npm test. People to meet empty states: a room with no entry questions has no "Add my entry info" dead end.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { peopleEmpty, peopleGate } from '../src/features/event/people-empty.ts';

const none = { loaded: true, failed: false, count: 0 };
const some = { loaded: true, failed: false, count: 2 };
const base = { status: 'error', error: 'no_entry', matches: 0, notConsented: false };

test('no entry questions: "No intros in this room" for both no_entry and an empty list', () => {
  assert.equal(peopleEmpty({ ...base, questions: none }), 'noQuestions');
  assert.equal(peopleEmpty({ ...base, status: 'ready', error: null, questions: none }), 'noQuestions');
});

test('a room with questions keeps "Tell Qrewing about you" and the no-matches state', () => {
  assert.equal(peopleEmpty({ ...base, questions: some }), 'noEntry');
  assert.equal(peopleEmpty({ ...base, status: 'ready', error: null, questions: some }), 'noMatches');
  // Questions not read yet or the read failed: never claim there are none.
  assert.equal(peopleEmpty({ ...base, questions: { loaded: false, failed: false, count: 0 } }), 'noEntry');
  assert.equal(peopleEmpty({ ...base, questions: { loaded: true, failed: true, count: 0 } }), 'noEntry');
});

test('other states are not empty states', () => {
  assert.equal(peopleEmpty({ ...base, notConsented: true, questions: none }), null);
  assert.equal(peopleEmpty({ ...base, error: 'network', questions: none }), null);
  assert.equal(peopleEmpty({ ...base, status: 'ready', error: null, matches: 3, questions: none }), null);
  assert.equal(peopleEmpty({ ...base, status: 'loading', error: null, questions: none }), null);
});

test('UX2-01 gate: Free or a 402 → plus (over consent); Plus or unknown and not agreed → consent; else none', () => {
  assert.equal(peopleGate({ plus: false, error: null, notConsented: false }), 'plus');
  assert.equal(peopleGate({ plus: false, error: null, notConsented: true }), 'plus');
  assert.equal(peopleGate({ plus: null, error: 'plan_limit', notConsented: true }), 'plus');
  assert.equal(peopleGate({ plus: true, error: 'plan_limit', notConsented: false }), 'plus');
  assert.equal(peopleGate({ plus: true, error: null, notConsented: true }), 'consent');
  assert.equal(peopleGate({ plus: null, error: 'not_consented', notConsented: true }), 'consent');
  assert.equal(peopleGate({ plus: true, error: 'network', notConsented: false }), null);
  assert.equal(peopleGate({ plus: true, error: null, notConsented: false }), null);
});

test('UX2-09: ai_off, ai_not_configured and not_member are dead ends, not a red Refresh', () => {
  assert.equal(peopleGate({ plus: true, error: 'ai_off', notConsented: false }), 'off');
  assert.equal(peopleGate({ plus: true, error: 'ai_off', notConsented: true }), 'off');
  assert.equal(peopleGate({ plus: null, error: 'ai_not_configured', notConsented: false }), 'unavailable');
  assert.equal(peopleGate({ plus: true, error: 'not_member', notConsented: true }), 'left');
  assert.equal(peopleGate({ plus: false, error: null, notConsented: false }), 'plus');
  assert.equal(peopleGate({ plus: true, error: 'ai_failed', notConsented: false }), null);
});
