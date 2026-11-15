import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const m = await import('../src/features/calendar/hero-card-model.ts');
const src = readFileSync(new URL('../src/features/calendar/hero-card.tsx', import.meta.url), 'utf8');

test('heroLabel reads title, time, place and skips blanks', () => {
  assert.equal(m.heroLabel('Morning Run', '7:30 to 8:30 AM', 'Exposition Park'), 'Morning Run, 7:30 to 8:30 AM, Exposition Park');
  assert.equal(m.heroLabel('Morning Run', null, ' '), 'Morning Run');
});

test('hero spec §C numbers', () => {
  assert.deepEqual([m.HERO_HEIGHT, m.HERO_EMPTY_HEIGHT, m.HERO_EMPTY_OPACITY, m.HERO_RADIUS], [200, 160, 0.4, 24]);
  assert.equal(m.SCRIM_FROM, 'rgba(48,43,40,0)');
  assert.equal(m.SCRIM_TO, 'rgba(48,43,40,0.72)');
});

test('card: image hidden from VoiceOver, cover, grows with minHeight, scrim is the bottom half', () => {
  assert.match(src, /contentFit="cover" accessible=\{false\}/);
  assert.match(src, /minHeight: HERO_HEIGHT/);
  assert.equal(m.SCRIM_HEIGHT, '65%');
  assert.match(src, /height: SCRIM_HEIGHT/);
  assert.match(src, /numberOfLines=\{2\}/);
  assert.match(src, /left: 16, right: 16, bottom: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-end'/);
  assert.match(src, /width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba\(255,255,255,0.9\)'/);
  assert.match(src, /size=\{22\} tintColor=\{colors.tint\}/);
  assert.match(src, /fontSize: 24, lineHeight: 30, fontFamily: 'SourceSans3-Bold'/);
  assert.match(src, /fontSize: 15, lineHeight: 20, fontFamily: 'SourceSans3-Semibold'/);
  assert.match(src, /HERO_IMAGES\.general/);
});

test('topic symbols: 9 topics, SF and Lucide names per ux', () => {
  assert.deepEqual(Object.keys(m.TOPIC_SYMBOL), ['run', 'sports', 'study', 'food', 'party', 'hike', 'music', 'travel', 'general']);
  assert.deepEqual(Object.values(m.TOPIC_SYMBOL).map((s) => s.lucide), ['footprints', 'trophy', 'book-open', 'utensils', 'party-popper', 'mountain', 'music', 'plane', 'users']);
});
