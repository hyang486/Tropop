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
  assert.match(a, /isPlanLimit\(res\.error\)\) \{\s*\/\/.*\n\s*if \(userId\) refreshPlus\(userId\);\s*router\.push\(plusIntroHref\('ask'\)\);/);
  const p = src('features/event/people-screen.tsx');
  assert.match(p, /isPlanLimit\(state\.error\)[\s\S]{0,200}plusIntroHref\('people'\)/);
});
