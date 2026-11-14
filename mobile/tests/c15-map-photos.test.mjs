// Run: npm test. ux C15 (audit §7): map and Photos hidden states.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const { en } = await import('../src/i18n/en.ts');

test('C15-4: stale rows read "Last seen …" in ink2 with a clock; Emergency text uses errorText', () => {
  const map = read('app/room/[id]/map.tsx');
  assert.equal(en.map.stale('4 min ago'), 'Last seen 4 min ago');
  assert.match(map, /<SymbolView name="clock" size=\{13\} tintColor=\{colors\.ink2\} \/>/);
  assert.doesNotMatch(map, /colors\.warning|#FF3B30|EMERGENCY_RED/);
  assert.match(map, /emergencyText: \{ color: colors\.errorText/);
  assert.match(map, /const EMERGENCY_LABEL_TEXT = palette\.light\.errorText;/);
});
