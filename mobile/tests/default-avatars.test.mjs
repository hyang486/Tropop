// Run: npm test. UX2-43: default avatar glyphs draw as ink text, never as a color emoji.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { DEFAULT_AVATARS } from '../src/lib/default-avatars.ts';

test('UX2-43: the sun glyph asks for text presentation (U+FE0E)', () => {
  const sun = DEFAULT_AVATARS.find((a) => a.key === 'sun');
  assert.equal(sun?.glyph, '☀︎');
});

test('UX2-43: no glyph uses emoji presentation (U+FE0F)', () => {
  for (const a of DEFAULT_AVATARS) assert.ok(!a.glyph.includes('️'), a.key);
});

test('UX2-43b: all 8 defaults are filled SF Symbols with a name; keys and tints unchanged', () => {
  const want = {
    star: ['star.fill', '#FDE9B8'], moon: ['moon.fill', '#DCE3F7'], sun: ['sun.max.fill', '#FFE1C2'],
    flower: ['camera.macro', '#F9D9E4'], note: ['music.note', '#E3D9F5'], peak: ['triangle.fill', '#D5ECE0'],
    gem: ['diamond.fill', '#D3EAF3'], leaf: ['leaf.fill', '#E1EDCB'],
  };
  assert.deepEqual(DEFAULT_AVATARS.map((a) => a.key), Object.keys(want));
  for (const a of DEFAULT_AVATARS) {
    assert.deepEqual([a.symbol, a.tint], want[a.key], a.key);
    assert.ok(a.name && a.glyph, a.key);
  }
});

test('UX2-43b: the avatar draws the symbol (ink, semibold, 0.42x) with the glyph as fallback; VoiceOver reads "<Name> picture"', () => {
  const avatar = readFileSync(new URL('../src/components/avatar.tsx', import.meta.url), 'utf8');
  const picker = readFileSync(new URL('../src/features/characters/character-picker.tsx', import.meta.url), 'utf8');
  assert.match(avatar, /<SymbolView\s+name=\{preset\.symbol\}\s+size=\{Math\.round\(size \* 0\.42\)\}\s+tintColor=\{colors\.label\}\s+weight="semibold"\s+fallback=\{<Text[^]*?\{preset\.glyph\}<\/Text>\}/);
  // B3: Edit profile now picks characters (the glyph presets are retired from the picker); selection is announced.
  assert.match(picker, /accessibilityState=\{\{ selected: on \}\}/);
});
