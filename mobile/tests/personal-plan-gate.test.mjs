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
  assert.match(layer, /const plus = plan === 'plus' \? true : plan === 'free' \? false : null;\s*const running = .*&& paceAllowed\(plus\);/); // UX2-119
  const card = src('features/pace/pace-card.tsx');
  assert.match(card, /const plan = usePlanState\(userId\);/);
  assert.match(card, /if \(plan === 'free'\) \{/);
  assert.match(card, /plusIntroHref\('pace'\)/);
  assert.match(card, /disabled=\{!share \|\| !paceAllowed\(plus\)\}/);
  assert.match(src('app/room/[id]/map.tsx'), /<PaceCard room=\{room\} share=\{my\.share\} userId=\{userId\} \/>/);
});

test('Ask and people to meet: plan_limit opens the matching Plus slide', () => {
  const a = src('features/event/ask-screen.tsx');
  // UX2-04: a 402 re-reads my plan and shows the Plus empty state with See Plus in the composer's place.
  assert.match(a, /isPlanLimit\(res\.error\)\) \{\s*\/\/.*\n\s*if \(userId\) refreshPlus\(userId\);\s*setPlusGate\(true\);\s*setSending\(null\);\s*return;/);
  assert.match(a, /plusGate \? \(\s*<Button title=\{en\.planPreview\.seePlus\}[\s\S]{0,160}plusIntroHref\('ask'\)/);
  // UX2-04b: my answered questions stay readable above the gate.
  assert.match(a, /plusGate \? \(\s*<>[\s\S]{0,120}<AnsweredCards roomId=\{id\} \/>\s*<EmptyState art="meetup" artWidth=\{160\} title=\{s\.plusTitle\} body=\{s\.plusBody\} \/>/);
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
  assert.match(info, /subtitle=\{plan === 'free' \? s\.partOfPlus : plan === 'loading' \? ' ' : undefined\}/);
  // UX2-03: a Free host's AI switch opens the room-ai slide (stays off); a server refusal does the same.
  assert.match(info, /v && plan === 'free'\s*\? router\.push\(plusIntroHref\('room-ai'\)\)\s*: run\(\(\) => setQrewingRoom/);
  assert.match(info, /if \(res\.planLimit\) \{\s*if \(uid\) refreshPlus\(uid\);\s*router\.push\(plusIntroHref\('room-ai'\)\);/);
  assert.match(src('features/event/qrewing-api.ts'), /isPlanLimit\(error\) \? \{ planLimit: true \}/);
  assert.match(info, /plan === 'free'\s*\? router\.push\(plusIntroHref\('meet'\)\)/);
});

test('UX2-04b: a person\'s answer to my question is readable on Free', () => {
  // The notice carries the answer: "You asked: …" above "<name>: <answer>" (3 lines), its own VoiceOver label.
  const store = src('features/questions/question-store.ts');
  assert.match(store, /lead: s\.youAsked\(c\.question\)/);
  assert.match(store, /body: s\.answerLine\(/);
  assert.match(store, /label: s\.answeredLabel\(/);
  assert.match(store, /action: \{ kind: 'open-ask', cardId: c\.id \}/);
  const row = src('features/chat/chat-sheet.tsx');
  assert.match(row, /numberOfLines=\{lead \? 3 : undefined\} ellipsizeMode="tail"/);
  assert.match(row, /rowBody: \{ fontSize: 15, color: colors\.ink2 \}/);
  assert.match(row, /accessibilityLabel=\{a11yLabel \?\? /);
  assert.match(src('features/chat/chat-header.tsx'), /lead=\{n\.lead\}\s*a11yLabel=\{n\.label\}/);
  // Free → the read-only sheet; Plus (or plan unknown) → Ask as before.
  const chat = src('app/room/[id]/index.tsx');
  assert.match(chat, /if \(plan === 'free' && cardId\) setTimeout\(\(\) => setAnswerCard\(cardId\), 400\);\s*\/\/.*\n\s*else if \(ask\.available\) ask\.open\(\);/);
  assert.match(chat, /onSeePlus=\{\(\) => router\.push\(plusIntroHref\('ask'\)\)\}/);
  // The sheet: no composer, no red; secondary See Plus, primary Done.
  const sheet = src('features/questions/answer-sheet.tsx');
  assert.match(sheet, /<HandTitle>\{s\.yourQuestion\}<\/HandTitle>/);
  assert.match(sheet, /<AnsweredCard card=\{card\}/);
  assert.match(sheet, /title=\{en\.planPreview\.seePlus\}\s*variant="secondary"/);
  // ux: no chevron on See Plus anywhere (buttons and the pace card link).
  assert.match(src('i18n/en.ts'), /    seePlus: 'See Plus',\n/);
  assert.doesNotMatch(src('i18n/en.ts'), /See Plus ›/);
  assert.match(sheet, /<Button title=\{s\.done\} onPress=\{onClose\} \/>/);
  assert.doesNotMatch(sheet, /Composer|tone="error"|colors\.danger/);
  // Reading is a plain RLS select (asker or answerer, room open), not the plan-gated qrewing function.
  assert.match(src('features/questions/question-store.ts'), /\.from\('question_cards'\)/);
});
