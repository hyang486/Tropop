// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const fab = readFileSync(new URL('../src/features/event/qrewing-fab.tsx', import.meta.url), 'utf8');
const chat = readFileSync(new URL('../src/features/event/chat-layer.tsx', import.meta.url), 'utf8');

test('UX2-111: after a network probe failure the FAB re-probes every 30 s and on foreground', () => {
  assert.match(fab, /probe\?\.error === 'network'/);
  assert.match(fab, /setInterval\(\(\) => setProbeTick\(\(n\) => n \+ 1\), QREWING_OFFLINE_RETRY_MS\)/);
  assert.match(fab, /AppState\.addEventListener\('change'/);
  assert.match(fab, /\[roomId, q\.aiEnabled, probeTick\]/);
  // One interval for both callers.
  assert.match(chat, /QREWING_OFFLINE_RETRY_MS/);
  assert.doesNotMatch(chat, /const OFFLINE_RETRY_MS/);
});
