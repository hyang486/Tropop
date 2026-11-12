// Run: npm test. Guard for the 6b move of eventStrings into en.qrewing: every key the code reads exists, and no key
// is unused. Code check over src/: direct `eventStrings.section.key` reads plus per-file aliases
// (`const s = eventStrings.section`). `errors` is indexed by QrewingError, so its keys must match that union.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

import { eventStrings } from '../src/features/event/strings.ts';

const SRC = new URL('../src/', import.meta.url);
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const url = new URL(name, dir);
    if (statSync(url).isDirectory()) return walk(new URL(`${name}/`, dir));
    return /\.tsx?$/.test(name) ? [url] : [];
  });
}
const sources = walk(SRC)
  .filter((u) => !u.pathname.endsWith('/features/event/strings.ts'))
  .map((u) => ({ path: u.pathname.split('/src/')[1], text: readFileSync(u, 'utf8') }))
  .filter((f) => f.text.includes('eventStrings'));

/** section -> Set of keys read, plus a list of reads with the file they came from. */
function collectReads() {
  const used = new Map();
  const reads = [];
  const add = (path, section, key) => {
    if (!used.has(section)) used.set(section, new Set());
    used.get(section).add(key);
    reads.push({ path, section, key });
  };
  for (const { path, text } of sources) {
    for (const [, section, key] of text.matchAll(/eventStrings\.(\w+)\.(\w+)/g)) add(path, section, key);
    for (const [, alias, section] of text.matchAll(/const (\w+) = eventStrings\.(\w+);/g)) {
      for (const [, key] of text.matchAll(new RegExp(`(?<![\\w.])${alias}\\.(\\w+)`, 'g'))) add(path, section, key);
      // `...alias` copies the whole section (end-confirm), so every key in it is read.
      if (new RegExp(`\\.\\.\\.${alias}\\b`).test(text)) for (const key of Object.keys(eventStrings[section])) add(path, section, key);
    }
  }
  return { used, reads };
}

test('eventStrings: every key the code reads exists', () => {
  const { reads } = collectReads();
  assert.ok(reads.length > 50, `only ${reads.length} reads found; the scan is broken`);
  const missing = reads.filter(({ section, key }) => !(section in eventStrings) || !(key in eventStrings[section]));
  assert.deepEqual(missing, []);
});

test('eventStrings: no section or key is unused', () => {
  const { used } = collectReads();
  const unused = [];
  for (const [section, keys] of Object.entries(eventStrings)) {
    if (section === 'errors') continue;
    for (const key of Object.keys(keys)) if (!used.get(section)?.has(key)) unused.push(`${section}.${key}`);
  }
  assert.deepEqual(unused, []);
});

test('eventStrings.errors keys match QrewingError exactly', () => {
  const types = readFileSync(new URL('features/event/types.ts', SRC), 'utf8');
  const union = types.match(/export type QrewingError =([^;]+);/)[1];
  const codes = [...union.matchAll(/'(\w+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(Object.keys(eventStrings.errors).sort(), codes);
});
