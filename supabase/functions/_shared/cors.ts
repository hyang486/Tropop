// Web CORS for the Edge Functions the client calls (qrewing, face-match, delete-account). Browsers on the dev web
// build (:8093, :8091) send a preflight and need these headers on every response, errors included. Native requests
// send no Origin; they get the same status and body, and the extra headers are ignored there.

export const CORS_ALLOWED_ORIGINS: readonly string[] = [
  'http://localhost:8093',
  'http://127.0.0.1:8093',
  'http://localhost:8091',
  'http://127.0.0.1:8091',
];

/** CORS headers for a request Origin: an allowed Origin is echoed; anything else gets the first allowed one. */
export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin !== null && CORS_ALLOWED_ORIGINS.includes(origin) ? origin : CORS_ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

/** Wraps a handler: OPTIONS answers 204 with CORS headers; every other response gets them added. */
export function withCors(handler: (req: Request) => Promise<Response> | Response): (req: Request) => Promise<Response> {
  return async (req) => {
    const cors = corsHeaders(req.headers.get('origin'));
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const res = await handler(req);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  };
}
