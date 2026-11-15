import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sheet = readFileSync(new URL('../src/features/event/disclosure-sheet.tsx', import.meta.url), 'utf8');
const en = readFileSync(new URL('../src/i18n/en.ts', import.meta.url), 'utf8');

test('P1-7 consent sheet: three short icon rows, full text behind a link', () => {
  assert.match(en, /'Trok reads chat and entry info to flag key messages and write the recap\.'/);
  assert.match(en, /'Host and @everyone messages are flagged without AI\.'/);
  assert.match(en, /'Everything is deleted when the room ends\.'/);
  assert.match(en, /more: 'How Trok uses your messages ›'/);
  assert.match(sheet, /SUMMARY_ICONS: SFSymbol\[\] = \['sparkles', 'megaphone', 'trash'\]/);
  assert.match(sheet, /size=\{22\} tintColor=\{colors\.label\}/);
  assert.match(sheet, /\{details\s*\? s\.body\.map/);
  assert.match(sheet, /title=\{s\.agree\}/);
  assert.match(sheet, /title=\{s\.notNow\}/);
});
