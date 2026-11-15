// Run: npm test. Web sheets must render inside the phone frame, so no file may take Modal straight from react-native.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
  );
}

test('web: every sheet imports Modal from @/components/modal (RN-web portals to body, outside the 402px frame)', () => {
  const bad = walk(new URL('../src', import.meta.url).pathname).filter((f) => {
    if (/components\/modal(\.web)?\.tsx$/.test(f)) return false;
    return /import\s*\{[^}]*\bModal\b[^}]*\}\s*from 'react-native'/.test(readFileSync(f, 'utf8'));
  });
  assert.deepEqual(bad, []);
});

test('web frame hands its element to the modal wrapper', () => {
  const frame = readFileSync(new URL('../src/components/web-frame.web.tsx', import.meta.url), 'utf8');
  assert.match(frame, /FrameHostContext\.Provider/);
});
