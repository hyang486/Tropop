// Run: node --test supabase/functions/_shared/cors.test.ts   (Node 24 strips types; offline)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { CORS_ALLOWED_ORIGINS, corsHeaders, withCors } from './cors.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const req = (method: string, origin?: string) =>
  new Request('http://fn.local/qrewing', { method, headers: origin ? { origin } : {} });

function assertCors(res: Response, origin: string) {
  assert.equal(res.headers.get('access-control-allow-origin'), origin);
  assert.equal(res.headers.get('access-control-allow-headers'), 'authorization, x-client-info, apikey, content-type');
  assert.equal(res.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
  assert.equal(res.headers.get('vary'), 'Origin');
}

test('allow-list is exactly the dev web origins', () => {
  assert.deepEqual(CORS_ALLOWED_ORIGINS, ['http://localhost:8093', 'http://127.0.0.1:8093', 'http://localhost:8091', 'http://127.0.0.1:8091']);
});

test('OPTIONS preflight: 204, empty body, CORS headers, handler not called', async () => {
  let called = false;
  const h = withCors(() => {
    called = true;
    return json(200, {});
  });
  for (const origin of CORS_ALLOWED_ORIGINS) {
    const res = await h(req('OPTIONS', origin));
    assert.equal(res.status, 204);
    assert.equal(await res.text(), '');
    assertCors(res, origin);
  }
  assert.equal(called, false);
});

test('success and error responses keep status, body and content-type, and gain CORS headers', async () => {
  for (const [status, body] of [[200, { ok: true }], [401, { error: 'unauthorized' }], [405, { error: 'method_not_allowed' }], [500, { error: 'internal' }]] as const) {
    const res = await withCors(() => json(status, body))(req('POST', 'http://127.0.0.1:8091'));
    assert.equal(res.status, status);
    assert.deepEqual(await res.json(), body);
    assert.equal(res.headers.get('content-type'), 'application/json');
    assertCors(res, 'http://127.0.0.1:8091');
  }
});

test('an Origin not on the list is never echoed; native (no Origin) keeps status and body', async () => {
  assert.equal(corsHeaders('https://evil.example')['Access-Control-Allow-Origin'], 'http://localhost:8093');
  const res = await withCors(() => json(401, { error: 'unauthorized' }))(req('POST'));
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: 'unauthorized' });
  assertCors(res, 'http://localhost:8093');
});

test('qrewing, face-match and delete-account serve through withCors', () => {
  for (const f of ['qrewing', 'face-match', 'delete-account']) {
    const src = readFileSync(new URL(`../${f}/index.ts`, import.meta.url), 'utf8');
    assert.match(src, /import \{ withCors \} from '\.\.\/_shared\/cors\.ts';/, f);
    assert.match(src, /Deno\.serve\(withCors\(async \(req\) => \{/, f);
    assert.match(src, /\}\)\);\n$/, f);
  }
});
