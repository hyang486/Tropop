// Face-match connection test. NOT RUN: needs supervisor ACCEPT, the human's decisions D-a/D-b/D-c and steps 1–5.
// Plan: docs/face-match-connection-test-plan.md. Syntax-checked only.
//
//   prepare <ROOM_CODE> <PHOTO_DIR>  Switch must be OFF. Creates users A and B, joins the room, uploads A2 and B1,
//                                    enrolls A1 (queues jobs), then probes as A: must return 503 face_match_disabled.
//   match                            Switch ON (set by the human at T1). ONE face-match call as A (one retry only on a
//                                    503 right after T1), then reads results and job attempts. Only step between T1 and T2.
//   probe                            Post-T2 check as A: must return 503. Exits non-zero (STOP) on 200.
//   list                             Prints every user ID created, for exact-ID cleanup (no sign-in).
//
// Env: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (publishable only, from mobile/.env.local).
// State file: OS temp dir, mode 0600, outside the repo. It holds user/enrollment/media IDs and A's refresh token
// (an anonymous session credential, needed so `match` and `probe` can run later as A). The script never prints
// tokens, keys, image bytes or signed URLs. Delete the state file after cleanup.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(new URL('../mobile/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!URL_ || !KEY) throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (publishable only).');

const STATE = process.env.FACE_TEST_STATE ?? join(tmpdir(), 'face-match-test-state.json');
const stamp = () => new Date().toISOString();
const log = (...a) => console.log(stamp(), ...a);
const client = () => createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const loadState = () => JSON.parse(readFileSync(STATE, 'utf8'));
function saveState(s) {
  writeFileSync(STATE, JSON.stringify(s, null, 2), { mode: 0o600 });
}

async function callFaceMatch(accessToken) {
  const res = await fetch(`${URL_}/functions/v1/face-match`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: KEY, authorization: `Bearer ${accessToken}` },
    body: '{}',
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

/** Fresh access token for A from its stored refresh token. Never printed. */
async function sessionA(state) {
  const sb = client();
  const { data, error } = await sb.auth.refreshSession({ refresh_token: state.A.refreshToken });
  if (error) throw new Error(`A refresh: ${error.message}`);
  state.A.refreshToken = data.session.refresh_token; // rotate and keep the newest
  saveState(state);
  return { sb, accessToken: data.session.access_token, id: state.A.id };
}

const mode = process.argv[2];

if (mode === 'prepare') {
  if (existsSync(STATE)) throw new Error(`state file exists (${STATE}); run cleanup and delete it first`);
  const [code, dir] = process.argv.slice(3);
  if (!code || !dir) throw new Error('usage: prepare <ROOM_CODE> <PHOTO_DIR>');
  const bytes = {};
  for (const n of ['A1', 'A2', 'B1']) {
    const p = join(dir, `${n}.jpg`);
    const size = statSync(p).size;
    if (size === 0 || size > 5 * 1024 * 1024) throw new Error(`${n}.jpg must be 1 byte..5 MB`);
    bytes[n] = readFileSync(p);
  }
  const state = { createdAt: stamp(), room: null, A: {}, B: {}, media: {}, refs: [], enrollmentId: null };
  const signIn = async (who) => {
    const sb = client();
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw new Error(`${who} sign-in: ${error.message}`);
    state[who] = { id: data.user.id, refreshToken: data.session.refresh_token };
    saveState(state);
    return { sb, id: data.user.id, accessToken: data.session.access_token };
  };
  const A = await signIn('A');
  const B = await signIn('B');
  log('users created (IDs in state file):', A.id, B.id);
  // Early switch check while A has NO enrollment: claimJobs returns [] for A, so this request cannot reach AWS even if
  // the switch is ON. Stops before any upload/enroll, so the post-enroll probe below can never process A's jobs.
  const early = await callFaceMatch(A.accessToken);
  log('EARLY switch probe as A (no enrollment) ->', early.status, early.body?.error ?? '');
  if (early.status !== 503 || early.body?.error !== 'face_match_disabled') throw new Error('STOP: switch is not OFF before enroll (expected 503 face_match_disabled)');

  for (const u of [A, B]) {
    const { data, error } = await u.sb.rpc('join_room', { p_code: code });
    if (error || !data) throw new Error(`join_room failed: ${error?.message ?? 'invalid code'}`);
    state.room = data;
  }
  saveState(state);

  const upload = async (u, label) => {
    const id = randomUUID();
    const path = `${state.room}/${id}/original.jpg`;
    const { error: ie } = await u.sb.from('media').insert({
      id, room_id: state.room, uploader_id: u.id, kind: 'photo', original_path: path, preview_path: null,
      file_name: `face-test-${label}.jpg`, mime_type: 'image/jpeg', status: 'uploading',
    });
    if (ie) throw new Error(`${label} media insert: ${ie.message}`);
    const { error: ue } = await u.sb.storage.from('room-media').upload(path, bytes[label], { contentType: 'image/jpeg', upsert: false });
    if (ue) throw new Error(`${label} upload: ${ue.message}`);
    const { error: re } = await u.sb.from('media').update({ status: 'ready' }).eq('id', id);
    if (re) throw new Error(`${label} ready: ${re.message}`);
    state.media[label] = id;
    saveState(state);
  };
  await upload(A, 'A2');
  await upload(B, 'B1');

  const refPath = `${state.room}/${A.id}/ref-${randomUUID()}.jpg`;
  const { error: re } = await A.sb.storage.from('face-refs').upload(refPath, bytes.A1, { contentType: 'image/jpeg', upsert: false });
  if (re) throw new Error(`A1 reference upload: ${re.message}`);
  state.refs.push(refPath);
  const { data: enrollmentId, error: ee } = await A.sb.rpc('enroll_face', { p_room_id: state.room, p_ref_path: refPath });
  if (ee) throw new Error(`enroll_face: ${ee.message}`);
  state.enrollmentId = enrollmentId;
  saveState(state);
  const { data: jobs } = await A.sb.from('face_jobs').select('media_id,status,attempts').eq('enrollment_id', enrollmentId);
  log('jobs queued for A (count, all statuses):', jobs?.length, '| attempts so far:', jobs?.reduce((n, j) => n + j.attempts, 0));

  const pre = await callFaceMatch(A.accessToken);
  log('PRE-SWITCH probe as A ->', pre.status, pre.body?.error ?? '');
  if (pre.status !== 503 || pre.body?.error !== 'face_match_disabled') throw new Error('STOP: switch is not OFF (expected 503 face_match_disabled)');
  log('prepared. Next: human sets FACE_MATCH_ENABLED=true (T1), then run: match');
} else if (mode === 'match') {
  const state = loadState();
  const A = await sessionA(state);
  let res = await callFaceMatch(A.accessToken);
  log('T1 face-match call 1 ->', res.status, res.body?.error ?? JSON.stringify(res.body));
  if (res.status === 503 && res.body?.error === 'face_match_disabled') {
    // One retry only, in case the new secret has not reached the function yet.
    await new Promise((r) => setTimeout(r, 5000));
    res = await callFaceMatch(A.accessToken);
    log('retry (once) ->', res.status, res.body?.error ?? JSON.stringify(res.body));
  }
  const { data: matches } = await A.sb.from('face_matches').select('media_id,similarity,matched').eq('enrollment_id', state.enrollmentId);
  const { data: jobs } = await A.sb.from('face_jobs').select('media_id,status,attempts,last_error').eq('enrollment_id', state.enrollmentId);
  const name = (id) => (id === state.media.A2 ? 'A2' : id === state.media.B1 ? 'B1' : 'other');
  for (const m of matches ?? []) log('RESULT', name(m.media_id), 'similarity', m.similarity, 'matched', m.matched);
  for (const j of jobs ?? []) log('JOB', name(j.media_id), j.status, 'attempts', j.attempts, 'error', j.last_error ?? '-');
  log('face_matches count:', matches?.length ?? 0, '| calls (sum of attempts):', (jobs ?? []).reduce((n, j) => n + j.attempts, 0));
  log('expected: A2 matched=true, B1 matched=false. Human sets switch OFF now (T2), then run: probe');
} else if (mode === 'probe') {
  const state = loadState();
  const A = await sessionA(state);
  const res = await callFaceMatch(A.accessToken);
  log('probe as A ->', res.status, res.body?.error ?? '');
  if (res.status === 200) {
    console.error('STOP: a call returned 200 with the switch supposedly OFF. Stop and tell the supervisor.');
    process.exit(2);
  }
  if (!(res.status === 503 && res.body?.error === 'face_match_disabled')) {
    console.error('UNEXPECTED: expected 503 face_match_disabled');
    process.exit(3);
  }
  log('switch OFF confirmed (503)');
} else if (mode === 'list') {
  const s = loadState();
  log('user IDs to delete by exact ID:', s.A.id, s.B.id);
  log('media IDs:', Object.values(s.media).join(', '), '| enrollment:', s.enrollmentId, '| room:', s.room);
  log('storage: face-refs', s.refs.join(', '), '| room-media under', s.room + '/<media id>/');
} else {
  throw new Error('mode: prepare | match | probe | list');
}
