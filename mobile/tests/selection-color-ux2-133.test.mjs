// UX2-133 (ux): every TextInput uses the ink label color for its cursor and selection handles, not iOS default blue.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const files = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) files.push(p);
  }
};
walk(new URL('../src', import.meta.url).pathname);

test('UX2-133: every <TextInput sets selectionColor={colors.label}', () => {
  let count = 0;
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/<TextInput\b([^>]*?)\/?>/gs)) {
      count += 1;
      assert.match(m[1], /selectionColor=\{colors\.label\}/, `${f}: a TextInput without selectionColor`);
    }
  }
  assert.ok(count >= 13, `expected at least 13 TextInputs, found ${count}`);
});
