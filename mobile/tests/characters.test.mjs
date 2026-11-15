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
