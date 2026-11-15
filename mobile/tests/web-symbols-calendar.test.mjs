// Run: npm test. Calendar HeroCard symbols need a web icon (web-stubs/expo-symbols.tsx maps SF Symbol -> vendored Lucide).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = readFileSync(new URL('../src/web-stubs/expo-symbols.tsx', import.meta.url), 'utf8');
const MAP = {
  'figure.run': 'footprints', trophy: 'trophy', book: 'book-open', 'fork.knife': 'utensils', 'party.popper': 'party-popper',
  'mountain.2': 'mountain', 'music.note': 'music', airplane: 'plane', 'person.2': 'users', 'calendar.badge.plus': 'calendar-plus',
};

test('every HeroCard symbol maps to a Lucide icon whose paths are vendored', () => {
  for (const [sf, icon] of Object.entries(MAP)) {
    assert.match(src, new RegExp(`^ "${sf.replace('.', '\\.')}": "${icon}"`, 'm'), sf);
    assert.match(src, new RegExp(`"${icon}": \\[\\["path"`), icon);
  }
});
