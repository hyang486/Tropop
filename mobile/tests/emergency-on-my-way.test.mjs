// Run: npm test (node --test, Node 24 strips the .ts types). Emergency "On my way" (ux spec 2026-11-14).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';
import { onWayLine, onWayWho } from '../src/lib/emergency-plan.ts';

const src = readFileSync(new URL('../src/components/room-activity.tsx', import.meta.url), 'utf8');
const names = new Map([
  ['me', 'Hana'],
  ['m', 'Mina'],
  ['j', 'Jun'],
  ['a', 'Ari'],
  ['b', 'Bo'],
]);
const copy = { you: en.activity.onWayYou, onWayNames: en.activity.onWayNames, onWayCount: en.activity.onWayCount };
const line = (onWay, n = names) => onWayLine({ userId: 'me', onWay, names: n, copy });

test('copy follows the spec', () => {
  assert.equal(en.activity.onMyWay, 'On my way');
  assert.equal(en.activity.cantCome, "Can't come");
  assert.equal(en.activity.youOnWay, "You're on the way");
  assert.equal(en.activity.onMyWayLabel('Sora'), "On my way, tell Sora you're coming");
  assert.equal(en.activity.cantComeLabel('Sora'), "Can't come, tell Sora you're not coming");
  assert.equal(en.activity.onWayCount(2), '2 on the way');
});

test('on-the-way line: answer order, me first as You, 3+ name two', () => {
  assert.equal(line([]), null);
  assert.equal(line(['m']), 'Mina is on the way');
  assert.equal(line(['m', 'j']), 'Mina and Jun are on the way');
  assert.equal(line(['m', 'j', 'a', 'b']), 'Mina, Jun and 2 more are on the way');
  assert.equal(line(['j', 'me']), 'You and Jun are on the way');
});

test('only me on the way: no line (my own row says it)', () => {
  assert.equal(line(['me']), null);
});

test('former members are left out; unknown names fall back to the count', () => {
  assert.equal(line(['gone', 'm']), 'Mina is on the way');
  assert.equal(line(['m', 'j'], null), '2 on the way');
  assert.deepEqual(onWayWho({ userId: 'me', onWay: ['gone'], names, you: 'You' }), []);
});

test('bar wiring: members get I see it + On my way, the sender only I am OK now', () => {
  assert.match(src, /answerOnWay\(e\.id, true\)/);
  assert.match(src, /answerOnWay\(e\.id, false\)/);
  assert.match(src, /announceForAccessibility\(en\.activity\.onWayNames/);
  assert.match(src, /actionsStacked: \{ flexDirection: 'column-reverse' \}/);
});

test('pre-0040 fallback: a missing on_way column re-reads the seen columns and hides the On my way controls', async () => {
  const { ackColumnMissing } = await import('../src/lib/emergency-plan.ts');
  assert.equal(ackColumnMissing({ code: '42703', message: 'column emergency_acks.on_way does not exist' }), true);
  assert.equal(ackColumnMissing({ message: 'column emergency_acks.on_way does not exist' }), true);
  assert.equal(ackColumnMissing({ code: '42501', message: 'permission denied' }), false);
  assert.equal(ackColumnMissing(null), false);
  const act = readFileSync(new URL('../src/lib/activity.ts', import.meta.url), 'utf8');
  assert.match(act, /if \(acks\.error && ackColumnMissing\(acks\.error\)\) \{\s*acks = await readAcks\('event_id, user_id'\);\s*for \(const e of open\) e\.onWayReady = false;/);
  // The bar: today's single "I see it" pill, and no answer row, while on_way is unreadable.
  assert.match(src, /!e\.onWayReady && !iAcked \? \(/);
  assert.match(src, /\{mine \|\| !e\.onWayReady \? null : iOnWay \? \(/);
});
