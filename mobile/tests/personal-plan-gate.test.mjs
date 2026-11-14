// Run: npm test. capacity B item 4 (app half): personal features follow the caller's own plan (user_plans).
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ask = await import('../src/features/event/ask-plan.ts');
const qp = await import('../src/features/event/qrewing-plan.ts');
const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

test('402 plan_limit survives as its own Ask error and is the only plan-limit signal', () => {
  assert.equal(qp.classifyQrewingError(402), 'plan_limit');
  assert.equal(ask.askErrorKind('plan_limit'), 'plan_limit');
  assert.equal(qp.isPlanLimit('plan_limit'), true);
  for (const e of ['ai_off', 'not_member', 'network', null, undefined]) assert.equal(qp.isPlanLimit(e), false);
});

test('pace maker: Plus on the caller plan only; Free shows the Plus link, the runner never starts', () => {
  const layer = src('features/pace/pace-layer.tsx');
  assert.match(layer, /export function paceAllowed\(plus: boolean \| null\): boolean \{\s*return plus === true;/);
  assert.match(layer, /const plus = usePlusPreview\(userId\);\s*const running = .*&& paceAllowed\(plus\);/);
  const card = src('features/pace/pace-card.tsx');
  assert.match(card, /if \(plus === false\) \{/);
  assert.match(card, /plusIntroHref\('pace'\)/);
  assert.match(card, /disabled=\{!share \|\| !paceAllowed\(plus\)\}/);
  assert.match(src('app/room/[id]/map.tsx'), /<PaceCard room=\{room\} share=\{my\.share\} userId=\{userId\} \/>/);
});

test('Ask and people to meet: plan_limit opens the matching Plus slide', () => {
  const a = src('features/event/ask-screen.tsx');
  // UX2-04: a 402 re-reads my plan and shows the Plus empty state with See Plus in the composer's place.
  assert.match(a, /isPlanLimit\(res\.error\)\) \{\s*\/\/.*\n\s*if \(userId\) refreshPlus\(userId\);\s*setPlusGate\(true\);\s*setSending\(null\);\s*return;/);
  assert.match(a, /plusGate \? \(\s*<Button title=\{en\.planPreview\.seePlus\}[\s\S]{0,160}plusIntroHref\('ask'\)/);
  assert.match(a, /plusGate \? \(\s*<EmptyState art="meetup" artWidth=\{160\} title=\{s\.plusTitle\} body=\{s\.plusBody\} \/>/);
  const p = src('features/event/people-screen.tsx');
  // UX2-01: the plan gate's pinned button opens the people slide; a 402 re-reads my plan; no red plan line.
  assert.match(p, /gate === 'plus' \? \(\s*<Button\s*title=\{en\.planPreview\.seePlus\}[\s\S]{0,120}plusIntroHref\('meet'\)/);
  assert.match(p, /isPlanLimit\(next\.error\) && uid\) refreshPlus\(uid\)/);
  assert.match(p, /if \(!skip\) run\(\);/);
  assert.doesNotMatch(p, /QLink/);
  // The consent gate never saves consent itself: Agree opens the disclosure sheet, which saves and then refreshes.
  assert.doesNotMatch(p, /setQrewingMember/);
  assert.match(p, /gate === 'consent' \? \(\s*<Button title=\{s\.agree\} onPress=\{\(\) => setConsent\(true\)\} \/>/);
  assert.match(p, /<DisclosureSheet\s*roomId=\{id\}\s*visible=\{consent\}\s*onDone=\{\(\) => \{\s*setConsent\(false\);\s*refresh\(\);/);
  const info = src('features/event/info-section.tsx');
  assert.match(info, /subtitle=\{plus === false \? s\.partOfPlus : undefined\}/);
  // UX2-03: a Free host's AI switch opens the room-ai slide (stays off); a server refusal does the same.
  assert.match(info, /v && plus === false\s*\? router\.push\(plusIntroHref\('room-ai'\)\)\s*: run\(\(\) => setQrewingRoom/);
  assert.match(info, /if \(res\.planLimit\) \{\s*if \(uid\) refreshPlus\(uid\);\s*router\.push\(plusIntroHref\('room-ai'\)\);/);
  assert.match(src('features/event/qrewing-api.ts'), /isPlanLimit\(error\) \? \{ planLimit: true \}/);
  assert.match(info, /plus === false\s*\? router\.push\(plusIntroHref\('meet'\)\)/);
});
