// B3: character ids, default face and display rule (pure; npm test).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { avatarChoice, characterA11y, CHARACTERS, defaultCharacter, hashString, isCharacterId } from '../src/lib/characters.ts';

test('twelve characters with ids 1-12', () => {
  assert.deepEqual(CHARACTERS.map((c) => c.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.equal(new Set(CHARACTERS.map((c) => c.key)).size, 12);
});

test('isCharacterId accepts only integers 1-12', () => {
  for (const ok of [1, 6, 12]) assert.equal(isCharacterId(ok), true);
  for (const bad of [0, 13, 1.5, null, undefined, '3', NaN]) assert.equal(isCharacterId(bad), false);
});

test('default face is stable and within 1-9', () => {
  const ids = ['a', 'b', '0f8e2c4a-1111-4222-8333-444455556666', '', 'zzzz'];
  for (const id of ids) {
    const d = defaultCharacter(id);
    assert.ok(d >= 1 && d <= 9, id);
    assert.equal(d, defaultCharacter(id));
  }
  assert.equal(hashString('abc'), hashString('abc'));
  assert.ok(new Set(Array.from({ length: 60 }, (_, i) => defaultCharacter(`user-${i}`))).size >= 6);
});

test('display rule: photo, then character, then default', () => {
  assert.deepEqual(avatarChoice({ userId: 'u', photoPath: 'p/1.jpg', character: 4 }), { kind: 'photo', path: 'p/1.jpg' });
  assert.deepEqual(avatarChoice({ userId: 'u', photoPath: null, character: 11 }), { kind: 'character', id: 11 });
  assert.deepEqual(avatarChoice({ userId: 'u', character: 99 }), { kind: 'character', id: defaultCharacter('u') });
  assert.deepEqual(avatarChoice({ userId: 'u' }), { kind: 'character', id: defaultCharacter('u') });
});

test('VoiceOver labels', () => {
  assert.equal(characterA11y(1), 'Host character');
  assert.equal(characterA11y(1, true), 'Host character, selected');
});

// Real-deletion rule: choosing a character clears avatar_path in the same update as Remove photo does, and the
// profile_avatar trigger (private.on_profile_avatar) queues the old stored photo for deletion on that change.
import { readFileSync } from 'node:fs';

test('choosing a character clears avatar_path so the server queues the old photo for deletion', () => {
  const store = readFileSync(new URL('../src/features/characters/character-store.ts', import.meta.url), 'utf8');
  assert.match(store, /update\(\{ avatar_character: id, avatar_path: null \}/);
  const remove = readFileSync(new URL('../src/lib/avatar.ts', import.meta.url), 'utf8');
  assert.match(remove, /update\(\{ avatar_path: null \}\)/);
  const mig = readFileSync(new URL('../../supabase/migrations/20261104000031_spec11_capacity_open_chat_question_cards.sql', import.meta.url), 'utf8');
  assert.match(mig, /old\.avatar_path is distinct from new\.avatar_path then\s+perform private\.enqueue_cleanup\('avatars', old\.avatar_path, 'avatar_replaced'\)/);
});

test('first run: guest and sign-up set the flag before signing in and clear it on failure; Rooms takes it once; Skip keeps the default', () => {
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const guest = read('../src/app/guest.tsx');
  assert.ok(guest.indexOf('markCharacterPrompt()') < guest.indexOf('startAsGuest(name)'));
  assert.match(guest, /catch \(e\) \{\s+await clearCharacterPrompt\(\)/);
  const up = read('../src/app/sign-up.tsx');
  assert.ok(up.indexOf('markCharacterPrompt()') < up.indexOf('signUpHost('));
  assert.match(up, /await clearCharacterPrompt\(\);\s+throw e;/);
  assert.match(read('../src/app/(tabs)/index.tsx'), /takeCharacterPrompt\(\)\.then\(\(pending\) => \{\s+if \(pending\) router\.push\('\/pick-character'\)/);
  const pick = read('../src/app/pick-character.tsx');
  assert.match(pick, /pickCharacterSkip\} onPress=\{\(\) => router\.back\(\)\}/);
  assert.match(pick, /defaultCharacter\(userId\)/);
});

test('Rooms rows show the host face when known and keep the room-type sticker otherwise', () => {
  const idx = readFileSync(new URL('../src/app/(tabs)/index.tsx', import.meta.url), 'utf8');
  assert.match(idx, /if \(face\) \{\s+return <PersonAvatar userId=\{room\.host_id\}/);
  assert.match(idx, /<ThemeSticker roomName=\{room\.name\} size=\{40\} \/>/);
});
