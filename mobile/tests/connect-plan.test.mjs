// Run: npm test (node --test, Node 24 strips the .ts types).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  appForLink,
  connectErrorKind,
  ConnectError,
  qrImagePath,
  qrImageType,
  qrLinkFor,
  toConnectError,
} from '../src/lib/connect-plan.ts';

test('qrLinkFor keeps only the app’s own https link (mirrors private.qr_link_ok)', () => {
  assert.equal(qrLinkFor('line', 'https://line.me/ti/p/abc'), 'https://line.me/ti/p/abc');
  assert.equal(qrLinkFor('line', '  https://line.me/ti/p/abc \n'), 'https://line.me/ti/p/abc');
  assert.equal(qrLinkFor('kakaotalk', 'https://qr.kakao.com/talk/xyz'), 'https://qr.kakao.com/talk/xyz');
  assert.equal(qrLinkFor('kakaotalk', 'https://open.kakao.com/o/abc'), 'https://open.kakao.com/o/abc');
  assert.equal(qrLinkFor('wechat', 'https://u.wechat.com/xyz'), 'https://u.wechat.com/xyz');
  assert.equal(qrLinkFor('whatsapp', 'https://wa.me/15551234567'), 'https://wa.me/15551234567');
  assert.equal(qrLinkFor('linkedin', 'https://www.linkedin.com/in/ann'), 'https://www.linkedin.com/in/ann');
  assert.equal(qrLinkFor('linkedin', 'https://lnkd.in/abc'), 'https://lnkd.in/abc');
  // Wrong app, http, look-alike host, non-link text, too long, whitespace inside.
  assert.equal(qrLinkFor('wechat', 'https://line.me/ti/p/abc'), null);
  assert.equal(qrLinkFor('line', 'http://line.me/ti/p/abc'), null);
  assert.equal(qrLinkFor('line', 'https://line.me.evil.com/x'), null);
  assert.equal(qrLinkFor('linkedin', 'https://linkedin.com/company/x'), null);
  assert.equal(qrLinkFor('wechat', 'weixin://dl/abc'), null);
  assert.equal(qrLinkFor('line', `https://line.me/${'a'.repeat(510)}`), null);
  assert.equal(qrLinkFor('line', 'https://line.me/a b'), null);
  assert.equal(qrLinkFor('line', null), null);
});

test('appForLink suggests the app for a decoded link', () => {
  assert.equal(appForLink('https://wa.me/1555'), 'whatsapp');
  assert.equal(appForLink('https://example.com'), null);
  assert.equal(appForLink(undefined), null);
});

test('qrImageType keeps PNG, re-encodes everything else as JPEG', () => {
  assert.deepEqual(qrImageType('image/png', 'file:///a.jpg'), { ext: 'png', contentType: 'image/png' });
  assert.deepEqual(qrImageType(null, 'file:///a.PNG?x=1'), { ext: 'png', contentType: 'image/png' });
  assert.deepEqual(qrImageType('image/heic', 'file:///a.heic'), { ext: 'jpg', contentType: 'image/jpeg' });
  assert.deepEqual(qrImageType(undefined, 'file:///a.jpeg'), { ext: 'jpg', contentType: 'image/jpeg' });
});

test('qrImagePath matches private.is_own_connect_qr_path', () => {
  const uid = '0b9d6f5e-1c2a-4e3b-9f00-112233445566';
  const id = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const path = qrImagePath(uid, id, 'png');
  assert.equal(path, `${uid}/${id}.png`);
  assert.match(path, /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png)$/);
});

test('connectErrorKind maps 0042 errors', () => {
  const pg = (code, message) => ({ code, message });
  assert.equal(connectErrorKind(pg('PT402', 'connection_limit')), 'limit');
  assert.equal(connectErrorKind(pg('PT402', 'other_connection_limit')), 'otherLimit');
  assert.equal(connectErrorKind(pg('PT422', 'no_codes')), 'noCodes');
  assert.equal(connectErrorKind(pg('PT422', 'they_have_no_codes')), 'theyHaveNoCodes');
  assert.equal(connectErrorKind(pg('PT429', 'Too many requests. Try again later.')), 'throttled');
  assert.equal(connectErrorKind(pg('P0002', 'Request not found')), 'notFound');
  assert.equal(connectErrorKind(pg('P0002', 'Code not found')), 'notFound');
  assert.equal(connectErrorKind(pg('42501', 'Room is not open')), 'roomClosed');
  assert.equal(connectErrorKind(pg('42501', 'They cannot be connected from this room')), 'notConnectable');
  assert.equal(connectErrorKind(pg('42501', 'Account required')), 'accountRequired');
  assert.equal(connectErrorKind(pg('42501', 'Sign in first')), 'accountRequired');
  assert.equal(connectErrorKind(pg('42501', 'Not connected')), 'notFound');
  assert.equal(connectErrorKind(pg('42501', 'permission denied for function x')), 'generic');
  assert.equal(connectErrorKind(pg('22023', 'Link is not for this app')), 'badLink');
  assert.equal(connectErrorKind(pg('22023', 'Upload the image first')), 'badImage');
  assert.equal(connectErrorKind(pg('22023', 'Bad image path')), 'badImage');
  assert.equal(connectErrorKind(pg('22023', 'Choose someone else')), 'generic');
});

test('connectErrorKind: storage, offline, unknown', () => {
  assert.equal(connectErrorKind({ statusCode: '413', message: 'Payload too large' }), 'tooLarge');
  assert.equal(connectErrorKind({ message: 'The object exceeded the maximum allowed size' }), 'tooLarge');
  assert.equal(connectErrorKind({ message: 'mime type image/gif is not supported' }), 'badImage');
  assert.equal(connectErrorKind({ name: 'TypeError', message: 'Network request failed' }), 'offline');
  assert.equal(connectErrorKind({ message: 'The Internet connection appears to be offline.' }), 'offline');
  assert.equal(connectErrorKind(null), 'generic');
  assert.equal(connectErrorKind('boom'), 'generic');
  assert.equal(connectErrorKind({ code: 'XX000', message: 'internal' }), 'generic');
});

test('toConnectError wraps once and keeps the cause', () => {
  const raw = { code: 'PT402', message: 'connection_limit' };
  const e = toConnectError(raw);
  assert.ok(e instanceof ConnectError);
  assert.equal(e.kind, 'limit');
  assert.equal(e.cause, raw);
  assert.equal(toConnectError(e), e);
  assert.doesNotMatch(e.message, /connection_limit/); // raw server text is not the message
});
