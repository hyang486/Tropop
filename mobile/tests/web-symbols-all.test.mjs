// Run: npm test. Guard: every SF Symbol name used in src/** has a web icon in src/web-stubs/expo-symbols.tsx.
// Static scan. It collects (1) string literals given to symbol-ish props/keys (name, symbol, sf, icon, systemImage, ...),
// including both arms of a ternary, and (2) every dotted SF-looking literal in a file that touches symbols. Names built at
// runtime cannot be resolved here; they are listed in DYNAMIC and must be covered by the literals above (reviewed by hand).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const SRC = new URL('../src/', import.meta.url).pathname;
const stub = readFileSync(join(SRC, 'web-stubs/expo-symbols.tsx'), 'utf8');
const mapped = new Set([...stub.matchAll(/^ "([^"]+)": "[^"]+",?$/gm)].map((m) => m[1]));
const icons = new Set([...(stub.match(/const ICONS[^\n]*/)?.[0] ?? '').matchAll(/"([a-z0-9-]+)": \[\[/g)].map((m) => m[1]));

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === 'web-stubs' ? [] : walk(p);
    return /\.(tsx?|jsx?)$/.test(f) ? [p] : [];
  });
}

const NAME = /^[a-z][a-z0-9]*(\.[a-z0-9]+)*$/;
const PROP = String.raw`(?:name|symbol|sf|icon|systemImage|iconName|leadingSymbol|trailingSymbol)`;
// A string literal that is a value, not one compared with ===/!== (e.g. kind === 'video').
const LIT = /(?<![=!]==?\s*|\[)['"]([a-z][a-z0-9.]*)['"]/g;
const used = new Map(); // name -> first file
const dynamic = [];
const add = (n, f) => used.has(n) || used.set(n, f);

for (const file of walk(SRC)) {
  const src = readFileSync(file, 'utf8');
  const rel = file.slice(SRC.length);
  const symbolFile = /expo-symbols|SymbolView|\bsymbol\b|\bsf:/.test(src);
  if (!symbolFile) continue;
  // 1. <SymbolView name={...}> : literal, ternary of literals, or dynamic
  for (const m of src.matchAll(/<SymbolView[^>]*?\bname=(\{[^}]*(?:\}[^}]*)?\}|"[^"]+")/g)) {
    const expr = m[1];
    const lits = [...expr.matchAll(LIT)].map((x) => x[1]);
    if (lits.length) lits.forEach((l) => add(l, rel));
    else dynamic.push(`${rel}: name=${expr.replace(/\s+/g, ' ').slice(0, 50)}`);
  }
  // 2. symbol-ish props and object keys with a string literal value (ternary arms too)
  for (const m of src.matchAll(new RegExp(String.raw`\b${PROP}\s*[:=]\s*\{?\s*(['"][a-z][a-z0-9.]*['"](?:\s*[?:]\s*['"][a-z][a-z0-9.]*['"])*)`, 'g'))) {
    for (const l of m[1].matchAll(LIT)) if (NAME.test(l[1]) && (l[1].includes('.') || /^(?:plus|xmark|eye|chevron|checkmark|doc|photo|camera|person|bell|gear|star|heart|trash|pencil|map|mappin|flag|clock|lock|house|globe|link|share|qrcode|scan|video|mic|bolt|moon|sun|leaf|diamond|triangle|play|sparkles|exclamationmark|questionmark|bubble|phone|calendar|tray|megaphone|figure|rectangle)/.test(l[1]))) add(l[1], rel);
  }
  // 3. any dotted SF-looking literal in a symbol file
  for (const m of src.matchAll(/['"]([a-z][a-z0-9]*(?:\.[a-z0-9]+)+)['"]/g)) {
    if (/^(?:[a-z]+\.(?:fill|slash|circle|badge|on|and|wave|right|left|up|down|portrait|viewfinder|text|bubble|triangle|square|dashed|min|max|crop|rectangle|arrow|shield|clockwise|counterclockwise|motion|stack|2|3|fill\.[a-z]+)|(?:person|figure|party|fork|mountain|music|exclamationmark|checkmark|xmark|chevron|doc|photo|qrcode|bubble|rectangle|sun|speaker|calendar|location|mappin|map|bell|lock|eye|hand|camera|video|mic|link|trash|square|arrow|clock|info|questionmark|face|key|star|heart|house|tray|paperplane|megaphone|flag|gear)\.[a-z0-9.]+)$/.test(m[1])) add(m[1], rel);
  }
}

test('every SF Symbol name in src has a web mapping to a vendored Lucide icon', () => {
  assert.ok(mapped.size > 40 && icons.size > 30, 'parsed the web stub');
  assert.ok(used.size > 40, `scan found ${used.size} names`);
  const missing = [...used].filter(([n]) => !mapped.has(n)).map(([n, f]) => `${n} (${f})`);
  assert.deepEqual(missing, [], `no web icon for: ${missing.join(', ')}`);
  const noPaths = [...mapped].filter((n) => {
    const m = stub.match(new RegExp(`^ "${n.replace(/\./g, '\\.')}": "([^"]+)"`, 'm'));
    return m && !icons.has(m[1]);
  });
  assert.deepEqual(noPaths, [], `mapped but no vendored paths: ${noPaths.join(', ')}`);
});

test('dynamic names are listed for review', () => {
  // Informational: these pass a variable; their literals come from the sources scanned above.
  if (dynamic.length) console.log(`dynamic SymbolView names (${dynamic.length}):\n  ${dynamic.join('\n  ')}`);
  assert.ok(Array.isArray(dynamic));
});
