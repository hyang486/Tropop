// Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('UX2-140: Button label defaults to title (kept while busy), caller label wins, busy state kept', () => {
  const ui = src('components/ui.tsx');
  const at = ui.indexOf('export function Button(');
  const button = ui.slice(at, ui.indexOf('\n}\n', at));
  assert.match(button, /accessibilityLabel=\{accessibilityLabel \?\? title\}/);
  assert.match(button, /accessibilityState=\{\{ disabled: disabled \|\| busy, busy \}\}/);
  assert.match(ui, /accessibilityLabel\?: string;\n(?:  \/\*\*[^\n]*\*\/\n  \w+\?: \w+;\n)*\};\n\nexport function Button\(/);
});

for (const [file, label] of [
  ['components/status-picker.tsx', 'en.room.cancel'],
  ['features/chat/chat-sheet.tsx', 'en.chat.moreClose'],
]) {
  test(`UX2-141: ${file} backdrop is a labeled button and the sheet closes on the escape gesture`, () => {
    const s = src(file);
    assert.ok(s.includes(`<Pressable style={styles.flex} accessibilityRole="button" accessibilityLabel={${label}} onPress={onClose} />`));
    assert.match(s, /accessibilityViewIsModal\n\s+onAccessibilityEscape=\{onClose\}/);
  });
}

test('UX2-142: AI-save-failed note has the dismiss hint', () => {
  assert.equal(en.qrewing.create.aiSaveFailedHint, 'Dismisses this note.');
  assert.match(src('app/room/[id]/index.tsx'), /onPress=\{\(\) => setAiNoteShown\(false\)\}\n\s+accessibilityRole="button"\n\s+accessibilityHint=\{en\.qrewing\.create\.aiSaveFailedHint\}/);
});
