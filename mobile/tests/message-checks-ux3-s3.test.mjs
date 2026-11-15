import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { canCheck, nextChecksReady, summarizeChecks, toggleCheckRows } from '../src/features/chat/message-checks-plan.ts';
import { en } from '../src/i18n/en.ts';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('S3: checks group per message with count, mine and unique members', () => {
  const m = summarizeChecks(
    [
      { message_id: 'a', user_id: 'u1' },
      { message_id: 'a', user_id: 'me' },
      { message_id: 'a', user_id: 'u1' },
      { message_id: 'b', user_id: 'u2' },
    ],
    'me',
  );
  assert.deepEqual(m.get('a'), { count: 2, mine: true, userIds: ['u1', 'me'] });
  assert.deepEqual(m.get('b'), { count: 1, mine: false, userIds: ['u2'] });
  assert.equal(m.get('c'), undefined);
});

test('S3: optimistic toggle adds then removes only this member’s check', () => {
  const start = [{ message_id: 'a', user_id: 'u1' }];
  const on = toggleCheckRows(start, 'a', 'me');
  assert.equal(on.length, 2);
  const off = toggleCheckRows(on, 'a', 'me');
  assert.deepEqual(off, start);
});

test('S3: text and media blocks take a check; notices and unsent messages do not', () => {
  assert.equal(canCheck({ kind: 'text' }, false), true);
  assert.equal(canCheck({ kind: 'text', pending: 'sending' }, false), false);
  assert.equal(canCheck({ kind: 'text', pending: 'failed' }, false), false);
  assert.equal(canCheck({ kind: 'media' }, true), true);
  assert.equal(canCheck({ kind: 'media' }, false), false, 'the plain "shared …" line is a notice');
  for (const kind of ['system', 'arrival', 'status', 'emergency']) assert.equal(canCheck({ kind }, false), false);
});

test('S3: copy and VoiceOver value', () => {
  assert.equal(en.chat.checkAdd, 'Got it');
  assert.equal(en.chat.checkRemove, 'Remove check');
  assert.equal(en.chat.checkCount(1), '1 check');
  assert.equal(en.chat.checkCount(3), '3 checks');
  assert.equal(en.chat.checkValue(3, false), '3 checks');
  assert.equal(en.chat.checkValue(1, true), '1 check, checked by you');
  assert.doesNotMatch(JSON.stringify(Object.values(en.chat).filter((v) => typeof v === 'string')), /\p{Extended_Pictographic}/u);
});

test('S3: menu, double-tap and pill wiring (ux decisions (a) and (b))', () => {
  const b = src('features/chat/check-block.tsx');
  assert.match(b, /from '@expo\/ui\/swift-ui'/);
  assert.match(b, /systemImage="checkmark"/);
  assert.doesNotMatch(b, /impactAsync|haptics\./, '(a) no haptic on menu open; iOS plays its own');
  assert.match(b, /accessibilityActions=\{\[\{ name: 'toggleCheck', label: actionLabel \}\]\}/);
  assert.match(b, /wrap: \{ gap: 6 \}/);
  assert.match(b, /withPill: \{ marginBottom: 10 \}/);
  assert.match(b, /height: 22,[\s\S]*paddingHorizontal: 8,[\s\S]*borderRadius: 11,\s*backgroundColor: colors\.fieldStrong,/);
  assert.doesNotMatch(b, /borderWidth|borderColor/, 'ux: the pill has no border');
  assert.match(b, /pillMine: \{ backgroundColor: colors\.label \}/);
  assert.match(b, /tintColor=\{checked \? colors\.onTint : colors\.label\}/);
  assert.match(b, /pillCountMine: \{ color: colors\.onTint \}/);
  const h = src('features/chat/message-checks.ts');
  assert.match(h, /if \(withHaptic\) haptics\.selection\(\);/, 'double-tap: selectionAsync after success');
  assert.match(h, /rpc\('toggle_message_check'/);
  assert.match(h, /event\.table === 'message_reactions'/);
  const r = src('app/room/[id]/index.tsx');
  assert.match(r, /<CheckBlock mine=\{mine\} check=\{check\} doubleTap=\{false\}/, '(b) media: long-press only, no Copy');
  assert.match(r, /copyText=\{isSticker \? undefined : \(item\.body \?\? ''\)\}\s*doubleTap=\{!isSticker\}\s/);
});

test('S3 gate: checks start off, turn on after a read, off when 0038 is missing; other errors keep the state', () => {
  assert.equal(nextChecksReady(false, null), true);
  assert.equal(nextChecksReady(true, { code: '42P01' }), false);
  assert.equal(nextChecksReady(true, { code: 'PGRST205' }), false);
  assert.equal(nextChecksReady(true, { code: '08006' }), true);
  assert.equal(nextChecksReady(false, { code: '08006' }), false);
  const h = src('features/chat/message-checks.ts');
  assert.match(h, /useState\(false\)/, 'off until the first successful read');
  assert.match(h, /if \(!userId \|\| !ready\) return;/);
  const r = src('app/room/[id]/index.tsx');
  // checksReady=false: no CheckBlock (no ContextMenu, no double-tap Pressable) and the text stays selectable.
  assert.match(r, /const block = checksReady && canCheck\(item, true\) \?/);
  assert.match(r, /const bubble = checksReady && canCheck\(item, false\) \?/);
  assert.match(r, /<Text selectable=\{!\(checksReady && canCheck\(item, false\)\)\}/);
  assert.match(r, /checksReady=\{messageChecks\.ready\}/);
});
