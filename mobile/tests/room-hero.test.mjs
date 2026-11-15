import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

const { emptyDoc, mergeRooms, parseDoc } = await import('../src/features/calendar/calendar-data.ts');
const { isHeroTopic, roomHero } = await import('../src/features/calendar/room-hero.ts');

const hero = (name, extra = {}) => roomHero({ name, type: 'general', ...extra });

test('hero: the QA names map to the 9 topics in order', () => {
  const names = ['Morning Run', 'Sunday hike', 'Study group', 'Friday dinner', 'Bday party', 'Jazz concert', 'Tokyo trip', 'Futsal match', 'Hangout'];
  assert.deepEqual(names.map((n) => hero(n)), ['run', 'hike', 'study', 'food', 'party', 'music', 'travel', 'sports', 'general']);
});

test('hero: each list has a positive and a whole-word false-positive guard', () => {
  const cases = [
    ['5k at dawn', 'run', 'rerun night', 'general'],
    ['Trail day', 'hike', 'Trailer watch', 'general'],
    ['Pickleball', 'sports', 'Gamer night', 'general'],
    ['Exam prep', 'study', 'Classic cars', 'general'],
    ['BBQ', 'food', 'Eating contest', 'general'],
    ['Karaoke', 'music', 'Showroom visit', 'general'],
    ['Airport pickup', 'travel', 'Tourism talk', 'general'],
    ['Mixer', 'party', 'Barbell club', 'general'],
  ];
  for (const [yes, topic, no, other] of cases) {
    assert.equal(hero(yes), topic, yes);
    assert.equal(hero(no), other, no);
  }
});

test('hero: case-insensitive, first match in list order, punctuation splits words', () => {
  assert.equal(hero('MORNING RUN!'), 'run');
  assert.equal(hero('Hike, then dinner'), 'hike');
  assert.equal(hero('Run-club'), 'run');
  assert.equal(hero('Study party'), 'study');
});

test('hero: pace maker on (sports + location) wins over the name', () => {
  assert.equal(roomHero({ name: 'Dinner', type: 'sports', location_allowed: true }), 'run');
  assert.equal(roomHero({ name: 'Dinner', type: 'sports', location_allowed: false }), 'food');
  assert.equal(roomHero({ name: 'Dinner', type: 'general', location_allowed: true }), 'food');
});

const room = (over = {}) => ({
  id: 'r1', name: 'Morning Run', type: 'general', starts_at: null,
  created_at: '2026-11-15T15:00:00Z', expires_at: '2026-11-16T15:00:00Z', deleted_at: null, ...over,
});

test('hero: stored once, so renaming the room keeps its art', () => {
  const first = mergeRooms(emptyDoc(), [room()], 'America/Los_Angeles');
  assert.equal(first.rooms.r1.hero, 'run');
  const renamed = mergeRooms(first, [room({ name: 'Hangout' })], 'America/Los_Angeles');
  assert.equal(renamed.rooms.r1.name, 'Hangout');
  assert.equal(renamed.rooms.r1.hero, 'run');
});

test('hero: an old snapshot without hero gets one on the next sync; parseDoc keeps valid values only', () => {
  const old = mergeRooms(emptyDoc(), [room()], 'America/Los_Angeles');
  delete old.rooms.r1.hero;
  assert.equal(mergeRooms(old, [room()], 'America/Los_Angeles').rooms.r1.hero, 'run');
  const round = parseDoc(JSON.stringify(mergeRooms(emptyDoc(), [room()], 'America/Los_Angeles')));
  assert.equal(round.rooms.r1.hero, 'run');
  const bad = JSON.parse(JSON.stringify(round));
  bad.rooms.r1.hero = 'nope';
  assert.equal(parseDoc(JSON.stringify(bad)).rooms.r1.hero, 'run'); // an invalid value is re-picked from the name
  assert.ok(isHeroTopic('general') && !isHeroTopic('nope'));
});

test('hero: whole-word match, rerun and gamer never match run or game', () => {
  assert.equal(hero('Rerun'), 'general');
  assert.equal(hero('Gamer night'), 'general');
  assert.equal(hero('Sunday rerun party'), 'party');
  assert.equal(hero('Run-club'), 'run');
  assert.equal(hero('Game on'), 'sports');
});
