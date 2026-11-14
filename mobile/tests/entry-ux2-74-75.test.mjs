// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { requiredAnswered } from '../src/features/event/entry-questions.ts';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('UX2-74: entry gate is one line "Add your intro to chat." in body 15 ink2', () => {
  assert.match(read('i18n/en.ts'), /chatPrompt: 'Add your intro to chat\.'/);
  const gate = read('features/event/chat-layer.tsx');
  assert.match(gate, /<Text style=\{styles\.gateTitle\} numberOfLines=\{1\}/);
  assert.match(gate, /gateTitle: \{ flex: 1, fontSize: 15, color: colors\.ink2 \}/);
});

test('UX2-75: one bottom Save, off until required answers have text', () => {
  const src = read('features/event/entry-screen.tsx');
  assert.match(src, /headerRight: \(\) => null/);
  assert.doesNotMatch(src, /headerSave/);
  assert.match(src, /disabled=\{!ready \|\| !requiredAnswered\(questions, current\)\}/);
  const qs = [
    { id: 'h', kind: 'headline', required: true },
    { id: 'l', kind: 'links', required: false },
  ];
  assert.equal(requiredAnswered(qs, {}), false);
  assert.equal(requiredAnswered(qs, { h: '   ' }), false);
  assert.equal(requiredAnswered(qs, { h: 'Designer' }), true);
  assert.equal(requiredAnswered([{ id: 'l', kind: 'links', required: true }], { l: ['', ' '] }), false);
  assert.equal(requiredAnswered([{ id: 'l', kind: 'links', required: true }], { l: ['https://a.b'] }), true);
});

test('UX2-74 (a): "+" stays; the gate is a field-shaped container with the pill inside', () => {
  const gate = read('features/event/chat-layer.tsx');
  assert.match(gate, /gate: \{\s*flex: 1,\s*minHeight: 44,\s*marginLeft: 4,[\s\S]*?paddingLeft: 16,\s*paddingRight: 6,\s*borderRadius: 22,[\s\S]*?backgroundColor: colors\.field,/);
  assert.match(gate, /numberOfLines=\{1\} ellipsizeMode="tail"/);
  const room = read('app/room/[id]/index.tsx');
  assert.match(room, /qrewing\.gates\.entry \? en\.chat\.moreGated : en\.chat\.more/);
  assert.match(read('i18n/en.ts'), /moreGated: 'More: status, arrival, Emergency'/);
});
