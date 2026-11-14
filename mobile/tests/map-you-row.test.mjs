import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const map = readFileSync(new URL('../src/app/room/[id]/map.tsx', import.meta.url), 'utf8');

test('P1-9 qa: a presence row with no gap, speed or stale age renders no empty second line', () => {
  assert.match(map, /const meta = stale \? en\.map\.stale\(age\) : gap \? gapLabel\(gap\) : speed;/);
  assert.match(map, /\) : meta \? \(\n\s+<Text style=\{styles\.presenceMeta\}>\{meta\}<\/Text>\n\s+\) : null\}/);
});
