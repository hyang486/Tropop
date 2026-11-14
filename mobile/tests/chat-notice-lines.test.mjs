import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('UX2-56: chat system lines wrap to 2 centered lines (the time is not cut off)', () => {
  const src = readFileSync(new URL('../src/app/room/[id]/index.tsx', import.meta.url), 'utf8');
  const block = src.slice(src.indexOf('if (NOTICE_KINDS.has(item.kind))'), src.indexOf('// UX P1-3'));
  assert.equal((block.match(/numberOfLines=\{2\}/g) ?? []).length, 2);
  assert.doesNotMatch(block, /numberOfLines=\{1\}/);
  assert.match(src, /notice: \{[^}]*textAlign: 'center'/);
});

test('UX2-56 follow-up: the media row wraps to 2 lines, keeps "· time ›" together, and is a 44 pt tap target', () => {
  const src = readFileSync(new URL('../src/app/room/[id]/index.tsx', import.meta.url), 'utf8');
  const block = src.slice(src.indexOf("if (item.kind === 'media') {"), src.indexOf('if (NOTICE_KINDS.has(item.kind))'));
  assert.match(block, /numberOfLines=\{2\}/);
  assert.doesNotMatch(block, /numberOfLines=\{1\}/);
  // No-break spaces join "·", the time (its own spaces too) and "›", so the chevron never wraps away from the time.
  assert.match(block, /const tail = `·\\u00A0\$\{time\.replace\(\/\\s\/g, '\\u00A0'\)\}\\u00A0›`;/);
  assert.match(block, /\{text\} \{tail\}/);
  assert.match(block, /<Pressable\s+style=\{\[styles\.noticeRow, styles\.mediaRow\]\}/);
  assert.match(src, /mediaRow: \{ minHeight: 44, justifyContent: 'center'/);
});
