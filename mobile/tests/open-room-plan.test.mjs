// Run: npm test. Spec 11 B (capacity) and D (Open chat) client rules.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const p = await import('../src/features/event/open-room-plan.ts');
const { INK_ICONS, inkIconKey } = await import('../src/components/calendar/ink-icon-map.ts');

test('capacity: Free 6, Plus 30; unchanged is the plan max; a loading flag counts as Free', () => {
  assert.equal(p.capacityMax(false), 6);
  assert.equal(p.capacityMax(null), 6);
  assert.equal(p.capacityMax(true), 30);
  assert.equal(p.capacityValue('none', false), 6);
  assert.equal(p.capacityValue('none', true), 30);
  assert.equal(p.capacityValue(12, false), 6);
  assert.equal(p.capacityValue(1, true), 2);
  assert.equal(p.capacityValue(12, true), 12);
});

test('UX P1-10: the stepper stays inside 2 … plan max; an unchanged value starts at the max', () => {
  assert.equal(p.stepCapacity('none', -1, false), 5);
  assert.equal(p.stepCapacity('none', -1, true), 29);
  assert.equal(p.stepCapacity('none', 1, true), 30);
  assert.equal(p.stepCapacity(6, 1, false), 6);
  assert.equal(p.stepCapacity(30, 1, true), 30);
  assert.equal(p.stepCapacity(2, -1, true), 2);
  assert.equal(p.stepCapacity(29, 1, true), 30);
  assert.equal(p.stepCapacity(20, 1, false), 6);
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

test('area is trimmed, collapsed and capped; the row reads name, area (the icon is decorative)', () => {
  assert.equal(p.normalizeArea('  Los   Angeles  DTLA '), 'Los Angeles DTLA');
  assert.equal(p.normalizeArea('   '), null);
  assert.equal(p.MAX_AREA, 60);
  assert.equal(p.normalizeArea('x'.repeat(80)).length, 60);
  assert.equal(p.openRowSpoken('Saturday Lake Loop', 'Los Angeles DTLA'), 'Saturday Lake Loop, Los Angeles DTLA');
  assert.equal(p.openRowSpoken('Loop', null), 'Loop');
});

test('UX2-42: every room icon has a spoken "<Name> icon" label, never the slug', async () => {
  const { en } = await import('../src/i18n/en.ts');
  for (const i of p.ROOM_ICONS) assert.match(en.createRoom.iconNames[i.key], /^[A-Z][a-z]+ icon$/, i.key);
});

test('create args: private sends capacity only; public adds icon and trimmed area; unchanged sends the plan max, no p_no_limit', () => {
  assert.deepEqual(p.openRoomArgs({ capacity: 4, plus: false, visibility: 'private', icon: 'run', area: 'DTLA' }), {
    p_max_members: 4,
    p_visibility: 'private',
  });
  assert.deepEqual(p.openRoomArgs({ capacity: 'none', plus: true, visibility: 'public', icon: 'run', area: '  Los   Angeles ' }), {
    p_max_members: 30,
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

test('join_open_room: null (room went private, deleted or expired) is "gone", never a room id', () => {
  assert.equal(p.joinedRoomId('2b1c0d1e-0000-4000-8000-000000000001'), '2b1c0d1e-0000-4000-8000-000000000001');
  assert.equal(p.joinedRoomId(null), null);
  assert.equal(p.joinedRoomId(undefined), null);
  assert.equal(p.joinedRoomId(''), null);
});

test('0032 plan limit: only PT402 plan_limit opens the Plus screen', () => {
  assert.equal(p.isPlanLimit({ code: 'PT402', message: 'plan_limit' }), true);
  assert.equal(p.isPlanLimit({ code: 'PT402', message: 'other' }), false);
  assert.equal(p.isPlanLimit({ code: '22023', message: 'plan_limit' }), false);
  assert.equal(p.isPlanLimit({ code: 'PT422', message: 'daily' }), false);
  assert.equal(p.isPlanLimit(new Error('plan_limit')), false);
  assert.equal(p.isPlanLimit(null), false);
  assert.equal(p.isPlanLimit('plan_limit'), false);
});

test('stepper ends: - off at 2, + off at the plan max', () => {
  assert.deepEqual(p.capacityEnds(2, true), { atMin: true, atMax: false });
  assert.deepEqual(p.capacityEnds(6, true), { atMin: false, atMax: false });
  assert.deepEqual(p.capacityEnds(6, false), { atMin: false, atMax: true });
  assert.deepEqual(p.capacityEnds('none', true), { atMin: false, atMax: true });
});

test('typed people count clamps to 2 .. plan max', () => {
  assert.equal(p.typedCapacity('3', false), 3);
  assert.equal(p.typedCapacity(' 12 ', true), 12);
  assert.equal(p.typedCapacity('12', false), 6);
  assert.equal(p.typedCapacity('99', true), 30);
  assert.equal(p.typedCapacity('1', true), 2);
  assert.equal(p.typedCapacity('0', false), 2);
  assert.equal(p.typedCapacity('', false), null);
  assert.equal(p.typedCapacity('3.5', false), null);
  assert.equal(p.typedCapacity('-4', false), null);
  assert.equal(p.typedCapacity('abc', true), null);
  assert.equal(p.typedCapacity('12', null), 6);
});

test('BUG-OC1: Open chat re-reads only on a return to the foreground', () => {
  assert.equal(p.cameToForeground('background', 'active'), true);
  assert.equal(p.cameToForeground('inactive', 'active'), true);
  assert.equal(p.cameToForeground('active', 'active'), false);
  assert.equal(p.cameToForeground('active', 'inactive'), false);
  assert.equal(p.cameToForeground('active', 'background'), false);
  assert.equal(p.cameToForeground('inactive', 'background'), false);
});

test('UX P1-10: the People hint names the plan maxima, not a fixed 30', async () => {
  const { en } = await import('../src/i18n/en.ts');
  assert.equal(en.createRoom.capacityHintFree(p.capacityMax(false), p.capacityMax(true)), 'Free rooms hold up to 6. Plus up to 30.');
  assert.equal(en.createRoom.capacityHintPlus(p.capacityMax(true)), 'Plus rooms hold up to 30.');
});

test('UX P1-6: row time is the start when known, else the end; today/tomorrow in local days', () => {
  const now = new Date(2026, 10, 14, 9, 0);
  const at = (d, h) => new Date(2026, 10, d, h, 30).toISOString();
  const r1 = p.openRowWhen({ expires_at: at(14, 18) }, now);
  assert.equal(r1.kind, 'until');
  assert.equal(r1.day, 'today');
  const r2 = p.openRowWhen({ starts_at: at(15, 6), expires_at: at(15, 9) }, now);
  assert.equal(r2.kind, 'starts');
  assert.equal(r2.day, 'tomorrow');
  assert.equal(r2.at.getHours(), 6);
  assert.equal(p.openRowWhen({ starts_at: null, expires_at: at(16, 9) }, now).day, null);
});

test('UX P1-6: full rooms leave the Open chat list unless you are already in them', () => {
  const rows = [
    { room_id: 'a', member_count: 3, max_members: 6, already_member: false },
    { room_id: 'b', member_count: 6, max_members: 6, already_member: false },
    { room_id: 'c', member_count: 6, max_members: 6, already_member: true },
  ];
  assert.deepEqual(p.joinableOpenRooms(rows).map((r) => r.room_id), ['a', 'c']);
});

test('capacity option B: + steps below the max; at 6 a Free host goes to Plus; Plus at 30 and unread plan are off', () => {
  assert.equal(p.capacityPlusTap(5, false), 'step');
  assert.equal(p.capacityPlusTap(6, false), 'upgrade');
  assert.equal(p.capacityPlusTap(29, true), 'step');
  assert.equal(p.capacityPlusTap(30, true), 'off');
  assert.equal(p.capacityPlusTap(6, null), 'off');
});

test('capacity option B: the at-max line names the plan', async () => {
  const { en } = await import('../src/i18n/en.ts');
  assert.equal(en.createRoom.capacityAtMax(6, false), '6 · Free max');
  assert.equal(en.createRoom.capacityAtMax(30, true), '30 · Plus max');
});
