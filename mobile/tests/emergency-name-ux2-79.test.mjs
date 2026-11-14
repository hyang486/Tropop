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
