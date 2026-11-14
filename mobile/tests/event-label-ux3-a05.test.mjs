// Run: npm test. UX3-A05: the event editor's Title field keeps its label above the field; the placeholder is an example.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = readFileSync(new URL('../src/features/calendar/event-editor.tsx', import.meta.url), 'utf8');

test('event title field: label above, example placeholder', () => {
  assert.match(src, /<QField\s+label=\{t\.titleLabel\}\s+labelAbove\s+placeholder=\{t\.titlePlaceholder\}/);
});
