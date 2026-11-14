// Run: npm test. UX P1-2: stored system/emergency bodies shown as short grey lines.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chatLine } from '../src/lib/chat-line.ts';

test('an Emergency body keeps only the name, so the line reads "<name> set Emergency"', () => {
  assert.deepEqual(chatLine('emergency', 'Sora needs help (Emergency)'), { kind: 'emergency', name: 'Sora' });
  assert.deepEqual(chatLine('emergency', 'Someone needs help (Emergency)'), { kind: 'emergency', name: 'Someone' });
});

test('the activity start line is recognized only as a system line with the exact stored text', () => {
  const body = 'Activity started. Open Map to share your location.';
  assert.deepEqual(chatLine('system', body), { kind: 'activityStarted' });
  assert.deepEqual(chatLine('status', body), { kind: 'plain', text: body });
});

test('anything else is shown as stored', () => {
  assert.deepEqual(chatLine('emergency', 'Sora is OK now'), { kind: 'plain', text: 'Sora is OK now' });
  assert.deepEqual(chatLine('arrival', 'Jun arrived'), { kind: 'plain', text: 'Jun arrived' });
});
