// Run: npm test. Web dialogs (ux web-dialogs-spec): native stays React Native's own, and no file bypasses lib/dialogs.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const src = new URL('../src', import.meta.url).pathname;
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const files = walk(src).filter((f) => /\.tsx?$/.test(f));
const read = (f) => readFileSync(f, 'utf8');

test('iOS: lib/dialogs.ts is a plain re-export of the React Native modules', () => {
  const code = read(join(src, 'lib/dialogs.ts')).split('\n').filter((l) => l.trim() && !l.trim().startsWith('//'));
  assert.deepEqual(code, ["export { ActionSheetIOS, Alert } from 'react-native';"]);
});

test('web: dialogs.web.tsx defines both with the React Native call shapes, and the root layout mounts the host inside the frame', () => {
  const web = read(join(src, 'lib/dialogs.web.ts'));
  assert.match(web, /export const Alert = \{\s*alert\(title: string, message\?: string, buttons\?: AlertButton\[\], options\?: AlertOptions\)/);
  assert.match(web, /export const ActionSheetIOS = \{\s*showActionSheetWithOptions\(config: ActionSheetOptions, callback: \(index: number\) => void\)/);
  assert.match(read(join(src, 'app/_layout.tsx')), /<\/AuthProvider>\s*<WebDialogHost \/>/);
});

test('guard: ActionSheetIOS is imported only through lib/dialogs', () => {
  const bad = files.filter((f) => /import \{[^}]*\bActionSheetIOS\b[^}]*\} from 'react-native'/.test(read(f)));
  assert.deepEqual(bad, []);
});

test('guard: Alert is imported only through lib/dialogs', () => {
  const bad = files.filter((f) => /import \{[^}]*\bAlert\b[^}]*\} from 'react-native'/.test(read(f)));
  assert.deepEqual(bad, []);
});

test('web file is dialogs.web.ts: Metro tries dialogs.ts before dialogs.web.tsx, so a .tsx variant would lose on web', () => {
  assert.ok(files.includes(join(src, 'lib/dialogs.web.ts')));
  assert.ok(!files.includes(join(src, 'lib/dialogs.web.tsx')));
});
