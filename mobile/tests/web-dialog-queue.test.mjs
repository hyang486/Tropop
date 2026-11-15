// Run: npm test. The web dialog queue (lib/dialogs.web.ts) and how the host dismisses it (components/web-dialog-host.web.tsx).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforeEach, test } from 'node:test';

import { ActionSheetIOS, Alert, close, head, subscribe } from '../src/lib/dialogs.web.ts';

const host = readFileSync(new URL('../src/components/web-dialog-host.web.tsx', import.meta.url), 'utf8');

beforeEach(() => {
  while (head()) close();
});

test('Alert.alert queues a card and keeps the buttons it was given', () => {
  const buttons = [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => {} }];
  Alert.alert('Delete?', 'Gone for good', buttons);
  const item = head();
  assert.equal(item.kind, 'alert');
  assert.equal(item.title, 'Delete?');
  assert.equal(item.message, 'Gone for good');
  assert.deepEqual(item.buttons.map((b) => b.text), ['Cancel', 'Delete']);
});

test('Alert.alert with no buttons, or an empty list, gets a single OK', () => {
  Alert.alert('Saved');
  assert.deepEqual(head().buttons, [{ text: 'OK' }]);
  close();
  Alert.alert('Saved', undefined, []);
  assert.deepEqual(head().buttons, [{ text: 'OK' }]);
});

test('one dialog shows at a time: the rest wait in order', () => {
  Alert.alert('first');
  Alert.alert('second');
  ActionSheetIOS.showActionSheetWithOptions({ options: ['A', 'Cancel'], cancelButtonIndex: 1 }, () => {});
  assert.equal(head().title, 'first');
  close();
  assert.equal(head().title, 'second');
  close();
  assert.equal(head().kind, 'sheet');
  close();
  assert.equal(head(), null);
});

test('closing a dialog never runs a button handler by itself', () => {
  let ran = 0;
  Alert.alert('x', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => ran++ }]);
  close();
  assert.equal(ran, 0);
});

test('ActionSheetIOS queues a sheet with its config and callback intact', () => {
  const picks = [];
  const config = { title: 'Photo', options: ['Choose another', 'Remove', 'Cancel'], cancelButtonIndex: 2, destructiveButtonIndex: 1 };
  ActionSheetIOS.showActionSheetWithOptions(config, (i) => picks.push(i));
  const item = head();
  assert.equal(item.kind, 'sheet');
  assert.deepEqual(item.config, config);
  item.callback(1);
  assert.deepEqual(picks, [1]);
});

test('subscribers hear every change and stop after they unsubscribe', () => {
  let calls = 0;
  const off = subscribe(() => calls++);
  Alert.alert('a');
  close();
  assert.equal(calls, 2);
  off();
  Alert.alert('b');
  assert.equal(calls, 2);
});

test('host: Escape and the backdrop run the cancel button, never a destructive one', () => {
  // Alert: the focus trap's Escape handler and the scrim click both call finish(cancel); with no cancel button they are null/undefined.
  assert.match(host, /useFocusTrap\(cancel \? \(\) => finish\(cancel\) : null\)/);
  assert.match(host, /cancel \? \(\) => finish\(cancel\) : undefined,/);
  assert.match(host, /const cancel = item\.buttons\.find\(\(b\) => b\.style === 'cancel'\)/);
  // The scrim only reacts to a click on itself, not on the card.
  assert.match(host, /e\.target === e\.currentTarget && onBackdrop\?\.\(\)/);
});

test('host: the action sheet reports cancelButtonIndex on Escape or backdrop, and nothing without one', () => {
  assert.match(host, /const dismiss = \(\) => \{\s*close\(\);\s*if \(cancelButtonIndex !== undefined\) callback\(cancelButtonIndex\);/);
  assert.match(host, /useFocusTrap\(dismiss\)/);
});
