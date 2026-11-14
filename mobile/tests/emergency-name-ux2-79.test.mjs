// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';
import { emergencySender } from '../src/lib/emergency-plan.ts';

test('UX2-79: unknown names (null) never read as Former member', () => {
  assert.deepEqual(emergencySender(null, 'u1'), { kind: 'unknown' });
  assert.deepEqual(emergencySender(new Map([['u1', 'Mina']]), 'u1'), { kind: 'name', name: 'Mina' });
  assert.deepEqual(emergencySender(new Map(), 'u1'), { kind: 'former' });
  assert.equal(en.activity.emergencyFromUnknown, 'Emergency from someone in this room');
});

test('UX2-79: the standalone banner starts unknown, keeps known names on a failed reload, retries once on active and after 5 s', () => {
  const src = readFileSync(new URL('../src/components/room-activity.tsx', import.meta.url), 'utf8');
  const banner = src.slice(src.indexOf('export function RoomEmergencyBanner'));
  assert.match(banner, /useState<Map<string, string> \| null>\(null\)/);
  assert.doesNotMatch(banner, /\.catch\(\(\) => \{\}\)/);
  assert.match(banner, /setTimeout\([\s\S]*?, 5000\)/);
  assert.match(banner, /AppState\.addEventListener\('change'/);
  assert.match(src, /names: Map<string, string> \| null;/);
});

test('UX2-79 follow-up + UX2-126: one seen part; the count is known while names are null', async () => {
  const { seenPart } = await import('../src/lib/emergency-plan.ts');
  const none = new Set();
  const two = new Set(['a', 'b']);
  const names = new Map([['me', 'Me'], ['a', 'Mina'], ['b', 'Joon'], ['c', 'Sora']]);
  assert.deepEqual(seenPart({ mine: true, ackedBy: none, names: null, copy: en.activity }), {
    visible: 'Waiting for someone to see it.',
    spoken: 'Waiting for someone to see it.',
  });
  assert.equal(seenPart({ mine: false, ackedBy: none, names, copy: en.activity }).visible, 'No one has seen it yet.');
  assert.equal(seenPart({ mine: false, ackedBy: two, names: null, copy: en.activity }).visible, 'Seen by 2');
  assert.deepEqual(seenPart({ mine: false, ackedBy: two, names, copy: en.activity }), {
    visible: 'Seen by Mina, Joon · 2 of 3',
    spoken: 'Seen by Mina, Joon, 2 of 3',
  });
  assert.equal(en.activity.noneSeen, undefined);
  const src = readFileSync(new URL('../src/components/room-activity.tsx', import.meta.url), 'utf8');
  assert.match(src, /seenPart\(\{ mine, ackedBy: e\.ackedBy, names, copy: en\.activity \}\)/);
});
