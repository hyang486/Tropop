// Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { en } from '../src/i18n/en.ts';

const people = readFileSync(new URL('../src/features/event/people-screen.tsx', import.meta.url), 'utf8');

test('UX2-137: host vs member wording on the no-questions empty state; consent title matches plusTitle', () => {
  const s = en.qrewing.people;
  assert.equal(s.noQuestionsHost, "You didn't add entry questions, so Qrewing can't suggest people to meet here.");
  assert.equal(s.noQuestions, "The host didn't add entry questions, so Qrewing can't suggest people to meet here.");
  assert.equal(s.consentTitle, 'Find who to meet');
  assert.equal(s.consentTitle, s.plusTitle);
  assert.match(people, /setHostId\(members\.find\(\(m\) => m\.role === 'host'\)\?\.user_id \?\? null\)/);
  assert.match(people, /const noQuestionsBody = !!uid && hostId === uid \? s\.noQuestionsHost : s\.noQuestions;/);
  assert.equal((people.match(/body=\{noQuestionsBody\}/g) ?? []).length, 2);
  assert.doesNotMatch(people, /body=\{s\.noQuestions\}/);
});

test('UX2-138: shorter Introduce yourself intro', () => {
  assert.equal(en.qrewing.entry.intro, "Everyone in this room can see your intro. It's deleted when the room ends.");
});

test('UX2-138: disabled Button is the enabled style at 40%; pressed, busy and accessibilityState unchanged', () => {
  const ui = readFileSync(new URL('../src/components/ui.tsx', import.meta.url), 'utf8');
  const at = ui.indexOf('export function Button(');
  const button = ui.slice(at, ui.indexOf('\n}\n', at));
  assert.match(button, /disabled \? \{ opacity: 0\.4 \} : pressed && !quiet && \{ opacity: variant === 'destructiveFill' \? 0\.85 : 0\.6 \}/);
  assert.doesNotMatch(button, /disabled \? \{ opacity: 0\.6 \}/);
  // Busy alone never dims (spinner at full opacity); it still reads disabled and busy to VoiceOver.
  assert.doesNotMatch(button, /busy \? \{ opacity/);
  assert.match(button, /accessibilityState=\{\{ disabled: disabled \|\| busy, busy \}\}/);
  assert.match(button, /backgroundColor: quiet && pressed && !disabled \? colors\.wash2 : fill/);
});
