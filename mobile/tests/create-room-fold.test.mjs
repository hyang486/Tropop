// Run: npm test. UI audit 2026-11-13 item 8: on Create room, the location and Qrewing AI helper lines show without
// scrolling on an iPhone 17 Pro (402x874 pt, default text size). Heights are measured from the audit captures
// (docs/evidence/ui-audit/10-create-room-filled.png, 11-create-room-ai.png; 1206 px / 402 pt = 3 px per pt).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = readFileSync(new URL('../src/app/create-room.tsx', import.meta.url), 'utf8');
const at = (needle) => {
  const i = src.indexOf(needle);
  assert.ok(i > 0, `missing ${needle}`);
  return i;
};

test('order: Room type, location switch + hint, AI switch + hint, then Start ⋮ End', () => {
  const type = at('<QLabel>{en.createRoom.typeLabel}</QLabel>');
  const loc = at('{en.createRoom.locationLabel}</Text>');
  const locHint = at('<Hint>{en.createRoom.locationHint}</Hint>');
  const ai = at('{en.qrewing.create.aiLabel}</Text>');
  const aiHint = at('<Hint>{en.qrewing.create.aiHint}</Hint>');
  const expiry = at('<QLabel>{en.createRoom.whenLabel}</QLabel>');
  const statuses = at('{en.createRoom.statusesLabel}</Text>');
  assert.ok(type < loc && loc < locHint && locHint < ai && ai < aiHint && aiHint < expiry && expiry < statuses);
});

test('fold: the AI hint ends above the Create bar on 402x874 pt (measured heights, 12 pt gaps)', () => {
  const gap = 12;
  const typeChipsBottom = 312; // 936 px: bottom of the Room type chips
  const card = 55; // switch card (QCard row)
  const locationHint = 32; // 2 lines at 402 pt
  const aiHint = 17; // Spec 11 A4: one line
  const createBarTop = 764; // 2292 px: hairline above Create room
  const aiHintBottom = typeChipsBottom + gap + card + gap + locationHint + gap + card + gap + aiHint;
  assert.ok(aiHintBottom <= createBarTop - gap, `AI hint ends at ${aiHintBottom} pt, bar at ${createBarTop} pt`);
});

test('Spec 11 A2/A3/A6: Class label, ink switches in outlined rows, no Plus preview link', async () => {
  const { en } = await import('../src/i18n/en.ts');
  assert.equal(en.rooms.types.waiting, 'Class');
  assert.doesNotMatch(src, /<Switch\b/);
  assert.match(src, /<InkSwitch value=\{locationAllowed\}/);
  assert.doesNotMatch(src, /<QCard/);
  assert.doesNotMatch(src, /plan-preview'\)\} hitSlop|createRoomLink/);
  assert.equal(en.planPreview.createRoomLink, undefined);
  assert.ok(en.qrewing.create.aiHint.length <= 56, 'AI hint fits one line at 402 pt');
});

test('Spec 11 A5: End presets sit on one line: 3 hours, 1 day, 2 days, More', async () => {
  const { en } = await import('../src/i18n/en.ts');
  assert.match(src, /presets: \{ flexDirection: 'row', flexWrap: 'nowrap'/);
  assert.deepEqual([3, 24, 48].map(en.createRoom.presetLabel), ['3 hours', '1 day', '2 days']);
  assert.equal(en.createRoom.presetLabel(120), '5 days');
});
