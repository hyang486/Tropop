// Run: npm test. ux audit C22 (2026-11-14): Photos & files and Photos of me polish.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const gallery = () => read('../src/app/room/[id]/gallery.tsx');

test('UX2-66: chips read All · Mine · Others · Of me; Of me has face.smiling 13 pt and reads "Photos of me"', async () => {
  const { en } = await import('../src/i18n/en.ts');
  assert.deepEqual([en.media.all, en.media.mine, en.media.others, en.face.filter], ['All', 'Mine', 'Others', 'Of me']);
  assert.equal(en.face.title, 'Photos of me');
  const src = gallery();
  assert.match(src, /\{ key: 'me', label: en\.face\.filter, a11y: en\.face\.title, symbol: 'face\.smiling' \}/);
  assert.match(src, /accessibilityLabel=\{f\.a11y \?\? f\.label\}/);
  assert.match(src, /<SymbolView name=\{f\.symbol\} size=\{13\} tintColor=\{selected \? colors\.onTint : colors\.label\} \/>/);
});
