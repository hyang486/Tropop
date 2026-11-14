// Run: npm test. Spec 11 B (capacity) and D (Open chat) client rules.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const p = await import('../src/features/event/open-room-plan.ts');
const { INK_ICONS, inkIconKey } = await import('../src/components/calendar/ink-icon-map.ts');

test('capacity: Free 6, Plus 30; No limit is the plan max; a loading flag counts as Free', () => {
  assert.equal(p.capacityMax(false), 6);
  assert.equal(p.capacityMax(null), 6);
  assert.equal(p.capacityMax(true), 30);
  assert.equal(p.capacityValue('none', false), 6);
  assert.equal(p.capacityValue('none', true), 30);
  assert.equal(p.capacityValue(12, false), 6);
  assert.equal(p.capacityValue(1, true), 2);
  assert.equal(p.capacityValue(12, true), 12);
});

test('the stepper stays inside 2 … max and starts from the max on No limit', () => {
  assert.equal(p.stepCapacity('none', -1, false), 5);
  assert.equal(p.stepCapacity(6, 1, false), 6);
  assert.equal(p.stepCapacity(2, -1, true), 2);
  assert.equal(p.stepCapacity(29, 1, true), 30);
});

test('every room icon maps back to its own ink icon', () => {
  for (const { key, emoji } of p.ROOM_ICONS) {
    assert.ok(INK_ICONS[key]);
    assert.equal(inkIconKey(emoji), key);
  }
  for (const t of ['sports', 'event', 'waiting', 'general']) {
    assert.ok(p.ROOM_ICONS.some((i) => i.key === p.defaultRoomIcon(t)));
  }
  for (const { key } of p.ROOM_ICONS) assert.match(key, /^[a-z0-9-]{1,30}$/);
  assert.equal(p.iconEmoji('run'), '🏃');
  assert.equal(p.iconEmoji('nope'), '📍');
});

test('area is trimmed, collapsed and capped; the row reads icon, name, area', () => {
  assert.equal(p.normalizeArea('  Los   Angeles  DTLA '), 'Los Angeles DTLA');
  assert.equal(p.normalizeArea('   '), null);
  assert.equal(p.MAX_AREA, 60);
  assert.equal(p.normalizeArea('x'.repeat(80)).length, 60);
  assert.equal(p.openRowSpoken('Run', 'Saturday Lake Loop', 'Los Angeles DTLA'), 'Run, Saturday Lake Loop, Los Angeles DTLA');
  assert.equal(p.openRowSpoken('Run', 'Loop', null), 'Run, Loop');
});

test('create args: private sends capacity only; public adds icon and trimmed area; No limit sends the plan max', () => {
  assert.deepEqual(p.openRoomArgs({ capacity: 4, plus: false, visibility: 'private', icon: 'run', area: 'DTLA' }), {
    p_max_members: 4,
    p_no_limit: false,
    p_visibility: 'private',
  });
  assert.deepEqual(p.openRoomArgs({ capacity: 'none', plus: true, visibility: 'public', icon: 'run', area: '  Los   Angeles ' }), {
    p_max_members: 30,
    p_no_limit: true,
    p_visibility: 'public',
    p_public_icon: 'run',
    p_public_location: 'Los Angeles',
  });
  assert.equal(p.openRoomArgs({ capacity: 'none', plus: false, visibility: 'private', icon: 'x', area: '' }).p_max_members, 6);
});

test('create check: public needs an area; private never blocks', () => {
  assert.equal(p.openRoomProblem('public', '   '), 'area');
  assert.equal(p.openRoomProblem('public', 'Echo Park'), null);
  assert.equal(p.openRoomProblem('private', ''), null);
});

test('every pickable icon key is a valid public_icon slug', () => {
  for (const { key } of p.ROOM_ICONS) assert.match(key, /^[a-z0-9-]{1,30}$/);
});
