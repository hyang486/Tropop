// Run: npm test. ux C31 (map, pace, calendar): docs/evidence/ux/audit-2-2026-11-14.md.
import './ts-resolve.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const plan = await import('../src/lib/location-plan.ts');
const { en } = await import('../src/i18n/en.ts');
const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('UX2-85: "Sharing now" is loading until a read works, error on a failed read, empty only after a good read', () => {
  const v = plan.presenceView;
  assert.equal(v({ loaded: false, error: false, count: 0 }), 'loading');
  assert.equal(v({ loaded: false, error: true, count: 0 }), 'error');
  assert.equal(v({ loaded: true, error: true, count: 0 }), 'error');
  assert.equal(v({ loaded: true, error: false, count: 0 }), 'empty');
  // Rows already on screen stay (a later failed refetch does not blank them).
  assert.equal(v({ loaded: true, error: true, count: 2 }), 'rows');
  assert.equal(v({ loaded: true, error: false, count: 1 }), 'rows');
  assert.equal(en.map.presenceLoading, 'Checking who’s sharing…');
  assert.equal(en.map.presenceFailed, 'Couldn’t load who’s sharing.');
  const loc = src('lib/location.ts');
  assert.match(loc, /return \{ rows: enabled \? rows : EMPTY_PRESENCE, loaded, error, reload \};/);
  const map = src('app/room/[id]/map.tsx');
  assert.match(map, /presenceView\(\{ loaded: presence\.loaded, error: presence\.error, count: presence\.rows\.length \}\)/);
  assert.match(map, /<Hint>\{en\.map\.nobody\}<\/Hint>/);
  assert.match(map, /title=\{en\.map\.tryAgain\}/);
});

test('UX2-117: a failed refetch keeps rows and adds one stale line with Try again', () => {
  assert.equal(en.map.presenceStale, 'Couldn’t refresh. Showing the last update.');
  const map = src('app/room/[id]/map.tsx');
  assert.match(map, /presenceState === 'rows' && presence\.error \? <Hint>\{en\.map\.presenceStale\}<\/Hint>/);
});

test('UX2-90/92/94/95/125: copy and small Map fixes', () => {
  assert.equal(en.pace.needsSharing, 'Turn on Share my live location to use the pace maker.');
  assert.equal(en.pace.mapOnly, 'Cues play while Map is open.');
  assert.match(src('features/pace/pace-card.tsx'), /<Hint>\{t\.mapOnly\}<\/Hint>/);
  assert.match(src('components/route-editor.tsx'), /savedRoute\.length > 0 \? en\.map\.editRoute : en\.map\.drawRoute/);
  assert.doesNotMatch(src('app/room/[id]/map.tsx'), /\{en\.map\.route\}/);
  assert.equal(en.calendar.askErrors.network, "You're offline. Try again when you're back.");
  assert.match(src('features/calendar/calendar-screen.tsx'), /code === 'network'\s*\? t\.askErrors\.network/);
});

test('UX2-120/121: pace switch and target save revert on a failed write; Saved only after success', () => {
  const settings = src('features/pace/settings.ts');
  assert.match(settings, /export async function setOn[\s\S]*?catch \(e\) \{[\s\S]*?update\(\{ on: next \}\);\s*throw e;/);
  assert.match(settings, /export async function saveTarget[\s\S]*?catch \(e\) \{\s*update\(\{ target: before \}\);\s*throw e;/);
  const card = src('features/pace/pace-card.tsx');
  assert.match(card, /setOn\(room\.id, on\)\.catch\(\(\) => setSwitchFailed\(true\)\)/);
  assert.match(card, /await saveTarget\(next\);\s*if \(showSaved\) status\(\{ type: 'saved' \}\);/);
  assert.equal(en.pace.switchSaveFailed, 'Couldn’t save. Try again.');
  assert.equal(en.pace.targetSaveFailed, 'Couldn’t save your target.');
});

test('UX2-88/119: plan unknown offline has Try again, re-reads on focus and foreground; pace layer uses the plan state', () => {
  assert.equal(en.planPreview.offlineRetry, "Can't check your plan offline.");
  const line = src('features/calendar/plan-offline-line.tsx');
  assert.match(line, /useFocusEffect/);
  assert.match(line, /next === 'active'\) void retry\(\)/);
  assert.match(line, /busy=\{busy\}/);
  assert.match(src('features/calendar/calendar-store.ts'), /export async function rereadPlan/);
  const cal = src('features/calendar/calendar-screen.tsx');
  assert.ok(cal.indexOf('<PlanOfflineLine') > cal.indexOf('t.nextMonth'), 'line sits under the month nav');
  assert.match(src('features/pace/pace-card.tsx'), /<PlanOfflineLine uid=\{userId\} \/>/);
  assert.match(src('features/pace/pace-layer.tsx'), /const plan = usePlanState\(userId\);/);
});

test('UX2-86: own share unknown hides the switch; Try again and Stop sharing', () => {
  assert.equal(en.map.shareUnknown, 'Couldn’t check your sharing.');
  const loc = src('lib/location.ts');
  assert.match(loc, /setUnknown\(server === null\);/);
  assert.match(loc, /return \{ share, unknown, setShareLocal, reload \};/);
  const map = src('app/room/[id]/map.tsx');
  assert.match(map, /\{my\.unknown \? \([\s\S]*?en\.map\.shareUnknown[\s\S]*?my\.reload\(\)[\s\S]*?<QLink title=\{en\.map\.stopSharing\} onPress=\{\(\) => toggleShare\(false\)\} \/>/);
});

test('UX2-120 edge: an older failed pace toggle never reverts a newer one', () => {
  assert.match(src('features/pace/settings.ts'), /if \(onSeq\.get\(roomId\) !== mine\) return;/);
});

test('UX2-87: one ink2 location-off block under Share with a primary Open Settings; pace card has none', () => {
  assert.equal(en.map.locationOffShare, 'Location is off for Qrew. Turn it on to share and use the pace maker.');
  const map = src('app/room/[id]/map.tsx');
  assert.match(map, /<Hint>\{en\.map\.locationOffShare\}<\/Hint>\s*<Button title=\{en\.map\.openSettings\} onPress=/);
  assert.match(map, /locate === 'denied' \|\| locate === 'settings' \? \(\s*<>\s*<Hint>\{en\.pace\.locationOff\}<\/Hint>/);
  assert.doesNotMatch(src('features/pace/pace-card.tsx'), /t\.locationOff/);
});

test('UX2-118: a failed room read makes the card wait for a connection; retried on reconnect and foreground', () => {
  assert.equal(en.pace.waitingConnection, 'Pace maker is waiting for a connection.');
  const layer = src('features/pace/pace-layer.tsx');
  assert.match(layer, /\.catch\(\(\) => setPaceWaiting\(roomId, true\)\)/);
  assert.match(layer, /status === 'SUBSCRIBED'\) load\(\)/);
  assert.match(layer, /next === 'active'\) load\(\)/);
  assert.match(src('features/pace/pace-card.tsx'), /offline && !hasFix \? \(\s*<Hint>\{t\.waitingConnection\}<\/Hint>/);
});

test('UX2-89: an empty draft over a saved route reads Remove route and confirms; with no route Save is disabled', () => {
  assert.equal(en.map.removeRoute, 'Remove route');
  assert.equal(en.map.removeRouteTitle, 'Remove the route?');
  assert.equal(en.map.removeRouteBody, 'Members won’t see it on the map.');
  const ed = src('components/route-editor.tsx');
  assert.match(ed, /const removing = route\.length === 0 && savedRoute\.length > 0;/);
  assert.match(ed, /variant="destructiveFill"[^>]*onPress=\{confirmRemove\}/);
  assert.match(ed, /disabled=\{route\.length === 0\}/);
});

test('UX2-91: a failed Map action alert has a title, the reason, Try again and Cancel', () => {
  assert.equal(en.map.actionFailedTitle, 'Didn’t go through');
  assert.match(src('app/room/[id]/map.tsx'), /Alert\.alert\(en\.map\.actionFailedTitle, errorMessage\(e\), \[[\s\S]*?onPress: \(\) => void run\(key, action, refresh\)/);
});

test('UX2-115/116: calendar scrim and event-editor picked icon use themed tokens', () => {
  assert.match(src('features/calendar/calendar-screen.tsx'), /scrim: \{[^}]*backgroundColor: colors\.scrim/);
  assert.match(src('features/calendar/event-editor.tsx'), /borderColor: colors\.tint, backgroundColor: colors\.sheetField/);
});
