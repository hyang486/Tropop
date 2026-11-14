// Run: npm test. Spec 11 A5/A7: Create room Start ⋮ End rules.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const p = await import('../src/features/event/create-room-plan.ts');
const H = 3_600_000;
const now = Date.UTC(2026, 10, 13, 20, 0);

test('Free rooms last at most 2 days, Plus 7; a loading flag counts as Free', () => {
  assert.equal(p.maxRoomHours(false), 48);
  assert.equal(p.maxRoomHours(null), 48);
  assert.equal(p.maxRoomHours(true), 168);
});

test('defaults: Sports 3 h; others 2 days on Free, 4 days on Plus', () => {
  assert.equal(p.defaultEndHours('sports', false), 3);
  assert.equal(p.defaultEndHours('sports', true), 3);
  for (const t of ['event', 'waiting', 'general']) {
    assert.equal(p.defaultEndHours(t, false), 48);
    assert.equal(p.defaultEndHours(t, null), 48);
    assert.equal(p.defaultEndHours(t, true), 96);
  }
});

test('the quick presets fit one line (3 chips + More) and never pass the Free max', () => {
  assert.deepEqual([...p.QUICK_PRESETS], [3, 24, 48]);
  assert.ok(p.QUICK_PRESETS.every((h) => h <= p.FREE_MAX_HOURS));
  assert.deepEqual([...p.MORE_PRESETS], [72, 96, 120, 144, 168]);
});

test('a preset End follows now; a picked End is fixed', () => {
  assert.equal(p.endMs({ kind: 'preset', hours: 3 }, now), now + 3 * H);
  assert.equal(p.endMs({ kind: 'at', ms: now + 5 * H }, now + H), now + 5 * H);
});

test('End range and errors follow the plan and the server window', () => {
  const r = p.endRange(now, false);
  assert.equal(r.start.getTime(), now + p.MIN_END_LEAD_MS);
  assert.equal(r.end.getTime(), now + 48 * H);
  assert.equal(p.endRange(now, true).end.getTime(), now + 168 * H);
  assert.equal(p.endError(now + 60_000, now, false), 'tooSoon');
  assert.equal(p.endError(now + 49 * H, now, false), 'tooLong');
  assert.equal(p.endError(now + 49 * H, now, true), null);
  assert.equal(p.endError(now + 169 * H, now, true), 'tooLong');
  assert.equal(p.endError(now + 2 * H, now, null), null);
});

test('chip selection and the More action', () => {
  assert.equal(p.selectedPreset({ kind: 'preset', hours: 24 }), 24);
  assert.equal(p.selectedPreset({ kind: 'preset', hours: 120 }), 'more');
  assert.equal(p.selectedPreset({ kind: 'at', ms: now }), null);
  assert.equal(p.moreAction(true), 'choices');
  assert.equal(p.moreAction(false), 'upgrade');
  assert.equal(p.moreAction(null), null);
});

test('Qrewing AI switch: Free turning on opens Plus; off always toggles; nothing while the plan loads', () => {
  assert.equal(p.aiSwitchAction(true, true), 'toggle');
  assert.equal(p.aiSwitchAction(true, false), 'toggle');
  assert.equal(p.aiSwitchAction(false, true), 'upgrade');
  assert.equal(p.aiSwitchAction(false, false), 'toggle');
  assert.equal(p.aiSwitchAction(null, true), null);
  assert.equal(p.aiSwitchAction(null, false), 'toggle');
});
