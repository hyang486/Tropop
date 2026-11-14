import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const viewer = readFileSync(new URL('../src/app/room/[id]/media/[mediaId].tsx', import.meta.url), 'utf8');

test('P2-3 media viewer: no file name/size line; Not me only in a ⋯ menu for Photos of me', () => {
  assert.doesNotMatch(viewer, /\$\{media\.file_name\} · \$\{size\}/);
  assert.doesNotMatch(viewer, /<Button\s+title=\{en\.face\.notMe\}/);
  assert.match(viewer, /headerRight: matchEnrollment\s*\?/);
  assert.match(viewer, /name="ellipsis\.circle"/);
  assert.match(viewer, /ActionSheetIOS\.showActionSheetWithOptions/);
  assert.match(viewer, /en\.media\.sharedByAge/);
});
