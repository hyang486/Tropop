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
