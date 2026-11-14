// Run: npm test. UX3-B11: the room map uses Apple's muted style (no POIs, flat) in light and dark.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const map = readFileSync(new URL('../src/app/room/[id]/map.tsx', import.meta.url), 'utf8');
const types = readFileSync(new URL('../node_modules/expo-maps/build/apple/AppleMaps.types.js', import.meta.url), 'utf8');

test('map style: muted emphasis, no points of interest, flat elevation', () => {
  const style = map.match(/const MAP_STYLE: MapProperties = \{([^}]+\}[^}]*)\};/s)?.[1] ?? '';
  assert.match(style, /emphasis: 'MUTED' as/);
  assert.match(style, /pointsOfInterest: \{ including: \[\] \}/);
  assert.match(style, /elevation: AppleMaps\.MapStyleElevation\.FLAT/);
  // The literal must stay a real enum value of the installed expo-maps.
  assert.match(types, /AppleMapsMapStyleEmphasis\["MUTED"\] = "MUTED"/);
});

test('the map view spreads the style under its own properties, with no color scheme override', () => {
  assert.match(map, /properties=\{\{ \.\.\.MAP_STYLE, isMyLocationEnabled: showsMyLocation \}\}/);
  assert.doesNotMatch(map, /colorScheme:/);
});
