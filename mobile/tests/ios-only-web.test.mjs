// Run: npm test. ux web-ios-only-spec: web phone-only screens are branded, offer a next step, never say "iOS app".
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const comp = read('../src/components/ios-only.tsx');
const scans = [read('../src/app/scan.web.tsx'), read('../src/app/start/scan.web.tsx')];

test('IosOnly: 140pt sticker hidden from AT, header-role title, 48pt secondary action', () => {
  assert.match(comp, /width: 140, height: 140/);
  assert.match(comp, /accessible=\{false\}/);
  assert.match(comp, /accessibilityRole="header"/);
  assert.match(comp, /fontSize: 22, lineHeight: 28/);
  assert.match(comp, /fontSize: 16, lineHeight: 22/);
  assert.match(comp, /height: 48/);
  assert.match(comp, /maxWidth: 360/);
  assert.match(comp, /pressed && styles\.buttonPressed/);
  assert.match(comp, /buttonPressed: \{ opacity: 0\.7 \}/);
  assert.match(comp, /outlineColor: colors\.tint, outlineWidth: 2/);
});

test('both scan routes: connection-01, Enter code -> /start/code', () => {
  for (const s of scans) {
    assert.match(s, /sticker="connection-01"/);
    assert.match(s, /Scan with your phone/);
    assert.match(s, /label: 'Enter code', onPress: \(\) => router\.push\('\/start\/code'\)/);
  }
});

test('web copy never says "iOS app"', () => {
  for (const s of [comp, ...scans]) assert.doesNotMatch(s, /iOS app/);
});
