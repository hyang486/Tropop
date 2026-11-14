// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = readFileSync(new URL('../src/components/room-activity.tsx', import.meta.url), 'utf8');

test('UX2-77: Emergency bar subtitle wraps to 2 lines; the pill stays centered on the bar', () => {
  assert.match(src, /<Text style=\{styles\.barMeta\} numberOfLines=\{2\}/);
  assert.match(src, /bar: \{\s*flexDirection: 'row',\s*alignItems: 'center',/);
  assert.match(src, /barMetaRow: \{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 \}/);
});

test('UX2-77b: spokenSentence drops each trailing period and joins the parts with ". "', async () => {
  const { spokenSentence } = await import('../src/lib/emergency-plan.ts');
  assert.equal(
    spokenSentence(['Help requested', '5:07 AM', 'Waiting for someone to see it.', 'No location shared']),
    'Help requested. 5:07 AM. Waiting for someone to see it. No location shared.',
  );
  assert.equal(spokenSentence(['A..', ' B. ', '', 'C']), 'A. B. C.');
});

test('UX2-77b: the Emergency bar label is built with spokenSentence, time and seen as separate parts', () => {
  assert.match(src, /const spoken = spokenSentence\(\[\s*title,\s*timeOf\(e\.createdAt\),/);
  assert.doesNotMatch(src, /\]\.join\('\. '\)/);
});

test('UX2-77c: spokenSeparators turns " · " into ", " for VoiceOver only', async () => {
  const { spokenSeparators } = await import('../src/lib/emergency-plan.ts');
  assert.equal(spokenSeparators('Seen by Mina · 1 of 4'), 'Seen by Mina, 1 of 4');
  assert.equal(spokenSeparators('Seen by Mina, Joon · 2 of 3'), 'Seen by Mina, Joon, 2 of 3');
  assert.equal(spokenSeparators('Seen by 1 of 4'), 'Seen by 1 of 4');
});

test('UX2-77c: the bar label passes the seen part through spokenSeparators; the visible meta keeps "·"', () => {
  assert.match(src, /spokenSeparators\(en\.activity\.seenByNames\(who, seen, recipients\)\)/);
  const copy = readFileSync(new URL('../src/i18n/en.ts', import.meta.url), 'utf8');
  assert.match(copy, /`Seen by \$\{who\.join\(', '\)\} · \$\{n\} of \$\{total\}`/);
});
