import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('F-EMX8: the confirm is an in-app modal, not a native Alert, so the room ending can close it', () => {
  const sp = src('components/status-picker.tsx');
  assert.match(sp, /openEmergencyConfirm\(\(\) => void attempt\(\), room\?\.onEnded\)/);
  assert.doesNotMatch(sp, /Alert\.alert\(en\.activity\.emergencyConfirmTitle/);
});

test('F-EMX8: ending closes the open confirm and alerts at once (Room has ended, call local emergency number)', () => {
  const c = src('components/emergency-confirm.tsx');
  assert.match(c, /export function dismissEmergencyConfirmForEnd\(\)/);
  assert.match(c, /if \(!p\) return;\s*set\(null\);\s*Alert\.alert\(en\.activity\.emergencyEndedTitle, en\.activity\.emergencyEndedBody/);
  const en = src('i18n/en.ts');
  assert.match(en, /emergencyEndedTitle: 'Room has ended'/);
  assert.match(en, /emergencyEndedBody: "Your Emergency wasn't sent\. If you need help now, call your local emergency number\."/);
});

test('F-EMX8: chat and map mount the host above the ended switch and dismiss when the room is gone', () => {
  const chat = src('app/room/[id]/index.tsx');
  assert.match(chat, /<RoomScreenBody \/>\s*<EmergencyConfirmHost \/>/);
  assert.match(chat, /if \(!isGone\) return;\s*dismissEmergencyConfirmForEnd\(\);/);
  const map = src('app/room/[id]/map.tsx');
  assert.match(map, /<RoomMapScreenBody \/>\s*<EmergencyConfirmHost \/>/);
  assert.match(map, /if \(ended\.over\) dismissEmergencyConfirmForEnd\(\);/);
});
