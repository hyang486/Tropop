// Run: npm test. Moments home (calendar-v2-spec §A): week summary, sentence, strip rows, marks, Past / Upcoming.
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const h = await import('../src/features/calendar/home-model.ts');
const { en } = await import('../src/i18n/en.ts');
const t = en.calendar;

const at = (y, m, d, hh = 0, mm = 0) => new Date(y, m - 1, d, hh, mm).getTime();
// Wednesday 2026-11-18 10:00 local; the week is Sun 11-15 .. Sat 11-21.
const now = at(2026, 11, 18, 10);
const today = '2026-11-18';
const room = (id, start, end, over = {}) => ({
  roomId: id, name: `Room ${id}`, type: 'general', start, end, endAt: new Date(at(...end.split('-').map(Number)) + 86_399_000).toISOString(),
  emoji: '📍', diary: undefined, startsAt: null, placeName: null, people: null, ...over,
});
const ev = (id, start, end, over = {}) => ({ id, title: `Ev ${id}`, start, end, emoji: '📌', ...over });
const doc = (rooms, events = []) => ({ v: 1, rooms: Object.fromEntries(rooms.map((r) => [r.roomId, r])), events });

test('weekStart is the local Sunday', () => {
  assert.equal(h.weekStart('2026-11-18'), '2026-11-15');
  assert.equal(h.weekStart('2026-11-15'), '2026-11-15');
  assert.equal(h.weekStart('2026-11-01'), '2026-11-01');
  assert.equal(h.weekStart('2026-12-02'), '2026-11-29');
});

test('weekSummary: rooms+events touching the week, new people from known counts, coming up within 7 days', () => {
  const items = h.homeItems(doc(
    [
      room('a', '2026-11-16', '2026-11-16', { people: 4, endAt: new Date(at(2026, 11, 16, 22)).toISOString() }),
      room('b', '2026-11-14', '2026-11-15', { people: 3, endAt: new Date(at(2026, 11, 15, 12)).toISOString() }),
      room('c', '2026-11-20', '2026-11-20', { startsAt: new Date(at(2026, 11, 20, 9)).toISOString() }),
      room('old', '2026-11-01', '2026-11-02'),
    ],
    [ev('e1', '2026-11-24', '2026-11-24', { startTime: '09:00', endTime: '10:00' }), ev('e2', '2026-11-19', '2026-11-19')],
  ), now);
  const s = h.weekSummary(items, today, now);
  assert.equal(s.rooms, 4); // a, b (ends Sunday), c, e2
  assert.equal(s.newPeople, 3 + 2);
  assert.equal(s.comingUp, 3); // c (11-20 09:00), e2 (11-19 00:00), e1 (11-24 09:00 is within 7 days)
});

test('weekSummary: no known count → newPeople null (clause omitted)', () => {
  const items = h.homeItems(doc([room('a', '2026-11-16', '2026-11-16')]), now);
  assert.equal(h.weekSummary(items, today, now).newPeople, null);
  assert.deepEqual(h.summaryParts({ rooms: 1, newPeople: null, comingUp: 0 }), [{ kind: 'rooms', n: 1 }]);
});

const sentence = (s) => h.joinParts(h.summaryParts(s), (p) =>
  p.kind === 'rooms' ? t.summaryRooms(p.n) : p.kind === 'people' ? t.summaryPeople(p.n) : t.summaryComing(p.n)).flat().join('');

test('summary sentence: non-zero parts only, Oxford comma, period', () => {
  assert.equal(sentence({ rooms: 2, newPeople: 5, comingUp: 1 }), '2 rooms this week, 5 new people, and 1 coming up.');
  assert.equal(sentence({ rooms: 2, newPeople: null, comingUp: 0 }), '2 rooms this week.');
  assert.equal(sentence({ rooms: 0, newPeople: 0, comingUp: 1 }), '1 coming up.');
  assert.equal(sentence({ rooms: 1, newPeople: 1, comingUp: 0 }), '1 room this week and 1 new person.');
  assert.deepEqual(h.summaryParts({ rooms: 0, newPeople: 0, comingUp: 0 }), []);
});

test('stripRows: collapsed = this week + next week; expanded = the month weeks', () => {
  const c = h.stripRows(today, false, 2026, 10);
  assert.equal(c.length, 2);
  assert.deepEqual([c[0][0], c[0][6], c[1][0], c[1][6]], ['2026-11-15', '2026-11-21', '2026-11-22', '2026-11-28']);
  const nov = h.stripRows(today, true, 2026, 10); // Nov 2026: Sun 1st .. Mon 30th
  assert.equal(nov.length, 5);
  assert.deepEqual([nov[0][0], nov[4][6]], ['2026-11-01', '2026-12-05']);
  const aug = h.stripRows(today, true, 2026, 7); // Aug 2026: Sat 1st .. Mon 31st → 6 rows
  assert.equal(aug.length, 6);
  assert.equal(aug[0][0], '2026-07-26');
});

test('dayMarks and dimmed', () => {
  const items = h.homeItems(doc([room('a', '2026-11-16', '2026-11-17')], [ev('e', '2026-11-17', '2026-11-17')]), now);
  const m = h.dayMarks(items, ['2026-11-16', '2026-11-17', '2026-11-18']);
  assert.deepEqual([m.get('2026-11-16'), m.get('2026-11-17'), m.get('2026-11-18')], [{ rooms: 1, events: 0 }, { rooms: 1, events: 1 }, { rooms: 0, events: 0 }]);
  assert.equal(h.dimmed('2026-11-14', today, false, 2026, 10), true);
  assert.equal(h.dimmed('2026-11-15', today, false, 2026, 10), false);
  assert.equal(h.dimmed('2026-12-01', today, true, 2026, 10), true);
  assert.equal(h.dimmed('2026-12-01', today, false, 2026, 10), false);
});

test('Past = ended this month, newest first; Upcoming = starts in 30 days, soonest first', () => {
  const items = h.homeItems(doc(
    [
      room('p1', '2026-11-02', '2026-11-02', { people: 3 }),
      room('p2', '2026-11-10', '2026-11-10', { people: 4 }),
      room('oct', '2026-10-30', '2026-10-31'),
      room('live', '2026-11-18', '2026-11-19'),
    ],
    [ev('done', '2026-11-05', '2026-11-05'), ev('soon', '2026-11-25', '2026-11-25'), ev('far', '2026-12-30', '2026-12-30')],
  ), now);
  const p = h.pastRow(items, today);
  assert.deepEqual(p.items.map((i) => i.id), ['room:p2', 'event:done', 'room:p1']);
  assert.deepEqual([p.rooms, p.events, p.people], [2, 1, 5]);
  const u = h.upcomingRow(items, now);
  assert.deepEqual(u.items.map((i) => i.id), ['event:soon']);
});

test('dayCellLabel reads date, today, counts or no plans', () => {
  assert.equal(t.dayCellLabel('Wednesday, November 18', true, 1, 0), 'Wednesday, November 18, today, 1 room');
  assert.equal(t.dayCellLabel('Thursday, November 19', false, 0, 0), 'Thursday, November 19, no plans');
  assert.equal(t.dayCellLabel('Friday, November 20', false, 2, 1), 'Friday, November 20, 2 rooms, 1 event');
});
