'use strict';

// Offline test of the /api functions.
//
// Every outbound call is intercepted, so this asserts the thing the request
// inventory actually claims: what each endpoint sends onward, what it writes,
// and what it refuses to write. It needs no network and no database, which is
// the point — the shape of a request is a property of the code, and should be
// pinned as one.
//
// What it cannot cover: that Supabase answers as expected, and that a real
// code arrives in a real inbox. That is the live loop, and it is separate.

process.env.SUPABASE_URL = 'https://test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

const assert = require('assert');

// The spike oracle answers for exactly one address, pinned as a digest. The
// tests point that digest at a synthetic address so that no real one appears
// here either.
const ORACLE_EMAIL = 'oracle@example.com';
process.env.SPIKE_OTP_SHA256 =
  require('crypto').createHash('sha256').update(ORACLE_EMAIL).digest('hex');

let pass = 0;
const failures = [];
function check(name, fn) {
  try { fn(); pass++; }
  catch (e) { failures.push(`${name}: ${e.message}`); }
}
async function acheck(name, fn) {
  try { await fn(); pass++; }
  catch (e) { failures.push(`${name}: ${e.message}`); }
}

// --- harness -------------------------------------------------------------
let sent = [];      // every intercepted outbound request
let logged = [];    // every console.log line

const realLog = console.log;
console.log = (line) => { logged.push(String(line)); };

let nextResponses = [];
global.fetch = async (url, init) => {
  const opts = init || {};
  sent.push({
    url: String(url),
    method: opts.method || 'GET',
    headers: opts.headers || {},
    body: opts.body ? JSON.parse(opts.body) : null,
  });
  const canned = nextResponses.shift() || { status: 200, json: [{}] };
  return {
    ok: canned.status >= 200 && canned.status < 300,
    status: canned.status,
    json: async () => canned.json,
  };
};

function reset(responses) {
  sent = [];
  logged = [];
  nextResponses = responses || [];
}

function mockRes() {
  const res = { code: 0, headers: {}, payload: null };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = (c) => { res.code = c; return res; };
  res.send = (b) => { res.payload = b; return res; };
  res.json = () => JSON.parse(res.payload);
  return res;
}

function mockReq(method, body, cookie) {
  return { method, body: body || {}, headers: cookie ? { cookie } : {} };
}

const L = require('../api/_lib.js');
const requestH = require('../api/auth/request.js');
const verifyH = require('../api/auth/verify.js');
const signoutH = require('../api/auth/signout.js');
const notesH = require('../api/notes.js');
const intakeH = require('../api/intake.js');
const oracleH = require('../api/spike-otp.js');

const EMAIL = 'someone@example.com';
const CODE = '123456';
const NOTE = 'the tomato plant on the fire escape, again';
const PLAYER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';

const SESSION_OK = {
  status: 200,
  json: { access_token: 'ACCESS-TOKEN-SECRET', refresh_token: 'REFRESH-TOKEN-SECRET', user: { id: USER, email: EMAIL } },
};

function cookieFor(id) {
  const res = mockRes();
  L.setSession(res, id);
  return res.headers['set-cookie'].split(';')[0];
}

// --- ISO year-week -------------------------------------------------------
check('isoYearWeek: 2026-01-01 is 2026-W01', () => {
  assert.strictEqual(L.isoYearWeek(new Date('2026-01-01T00:00:00Z')), '2026-W01');
});
check('isoYearWeek: 2021-01-01 belongs to 2020-W53', () => {
  assert.strictEqual(L.isoYearWeek(new Date('2021-01-01T00:00:00Z')), '2020-W53');
});
check('isoYearWeek: 2019-12-30 belongs to 2020-W01', () => {
  assert.strictEqual(L.isoYearWeek(new Date('2019-12-30T00:00:00Z')), '2020-W01');
});
check('today() is a bare calendar date, no time of day', () => {
  assert.match(L.today(), /^\d{4}-\d{2}-\d{2}$/);
});

// --- session cookie ------------------------------------------------------
check('cookie is HttpOnly, Secure, SameSite=Strict, site-wide', () => {
  const res = mockRes();
  L.setSession(res, PLAYER);
  const c = res.headers['set-cookie'];
  assert.match(c, /HttpOnly/, 'not HttpOnly');
  assert.match(c, /Secure/, 'not Secure');
  assert.match(c, /SameSite=Strict/, 'not SameSite=Strict');
  assert.match(c, /Path=\//, 'no path');
});
check('cookie round-trips the player id', () => {
  assert.strictEqual(L.playerFrom(mockReq('GET', {}, cookieFor(PLAYER))), PLAYER);
});
check('cookie carries no email and no token', () => {
  const c = cookieFor(PLAYER);
  const decoded = Buffer.from(c.split('=')[1].split('.')[0], 'base64url').toString('utf8');
  assert.ok(!decoded.includes('@'), 'address in cookie');
  assert.ok(!/token/i.test(decoded), 'token in cookie');
  assert.deepStrictEqual(Object.keys(JSON.parse(decoded)).sort(), ['e', 'p']);
});
check('a tampered player id is rejected', () => {
  const forged = Buffer.from(JSON.stringify({ p: OTHER, e: Date.now() + 1000 })).toString('base64url') + '.notavalidmac';
  assert.strictEqual(L.playerFrom(mockReq('GET', {}, `lusory_session=${forged}`)), null);
});
check('an unsigned payload is rejected', () => {
  const bare = Buffer.from(JSON.stringify({ p: OTHER, e: Date.now() + 1000 })).toString('base64url');
  assert.strictEqual(L.playerFrom(mockReq('GET', {}, `lusory_session=${bare}`)), null);
});
check('an expired cookie is rejected', () => {
  const crypto = require('crypto');
  const payload = Buffer.from(JSON.stringify({ p: PLAYER, e: Date.now() - 1 })).toString('base64url');
  const mac = crypto.createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY).update(payload).digest('base64url');
  assert.strictEqual(L.playerFrom(mockReq('GET', {}, `lusory_session=${payload}.${mac}`)), null);
});

// --- the endpoints -------------------------------------------------------
(async function run() {

  await acheck('request: sends only the address, writes nothing', async () => {
    reset([{ status: 200, json: {} }]);
    const res = mockRes();
    await requestH(mockReq('POST', { email: EMAIL }), res);
    assert.strictEqual(res.code, 200);
    assert.strictEqual(sent.length, 1, 'expected exactly one outbound call');
    assert.match(sent[0].url, /\/auth\/v1\/otp$/);
    assert.deepStrictEqual(Object.keys(sent[0].body).sort(), ['create_user', 'email']);
    assert.ok(!sent.some(s => s.url.includes('/rest/v1/')), 'wrote to the database');
  });

  await acheck('request: rejects a non-address before anything leaves', async () => {
    reset([]);
    const res = mockRes();
    await requestH(mockReq('POST', { email: 'not-an-address' }), res);
    assert.strictEqual(res.code, 400);
    assert.strictEqual(sent.length, 0, 'sent something anyway');
  });

  await acheck('request: rate limiting is passed through, not swallowed', async () => {
    reset([{ status: 429, json: {} }]);
    const res = mockRes();
    await requestH(mockReq('POST', { email: EMAIL }), res);
    assert.strictEqual(res.code, 429);
  });

  await acheck('request: GET is refused', async () => {
    reset([]);
    const res = mockRes();
    await requestH(mockReq('GET', {}), res);
    assert.strictEqual(res.code, 405);
    assert.strictEqual(sent.length, 0);
  });

  await acheck('verify: a six-digit code goes as a token', async () => {
    reset([SESSION_OK, { status: 200, json: [{ id: PLAYER }] }]);
    await verifyH(mockReq('POST', { email: EMAIL, code: CODE }), mockRes());
    assert.strictEqual(sent[0].body.token, CODE);
    assert.strictEqual(sent[0].body.email, EMAIL);
    assert.ok(!('token_hash' in sent[0].body));
  });

  await acheck('verify: a link hash goes as a token_hash', async () => {
    reset([SESSION_OK, { status: 200, json: [{ id: PLAYER }] }]);
    await verifyH(mockReq('POST', { email: EMAIL, code: 'pkce_abc123def456ghi789' }), mockRes());
    assert.strictEqual(sent[0].body.token_hash, 'pkce_abc123def456ghi789');
    assert.ok(!('token' in sent[0].body));
  });

  await acheck('verify: writes exactly email, auth_user_id and a date', async () => {
    reset([SESSION_OK, { status: 200, json: [{ id: PLAYER }] }]);
    const res = mockRes();
    await verifyH(mockReq('POST', { email: EMAIL, code: CODE }), res);
    assert.strictEqual(res.code, 200);
    const upsert = sent.find(s => s.url.includes('/rest/v1/players'));
    assert.ok(upsert, 'no players write');
    assert.strictEqual(upsert.method, 'POST');
    assert.match(upsert.url, /on_conflict=email/, 'not an upsert on email');
    assert.deepStrictEqual(Object.keys(upsert.body[0]).sort(), ['auth_user_id', 'email', 'last_open']);
    assert.match(upsert.body[0].last_open, /^\d{4}-\d{2}-\d{2}$/, 'last_open is not a bare date');
  });

  await acheck('verify: no Supabase token reaches the browser or the database', async () => {
    reset([SESSION_OK, { status: 200, json: [{ id: PLAYER }] }]);
    const res = mockRes();
    await verifyH(mockReq('POST', { email: EMAIL, code: CODE }), res);
    const outbound = JSON.stringify(sent.filter(s => s.url.includes('/rest/v1/')));
    const toBrowser = res.payload + JSON.stringify(res.headers);
    for (const secret of ['ACCESS-TOKEN-SECRET', 'REFRESH-TOKEN-SECRET']) {
      assert.ok(!outbound.includes(secret), `${secret} was stored`);
      assert.ok(!toBrowser.includes(secret), `${secret} was sent to the browser`);
    }
    assert.ok(!toBrowser.includes(EMAIL), 'the address was echoed back to the browser');
  });

  await acheck('verify: a bad code sets no cookie and writes nothing', async () => {
    reset([{ status: 403, json: {} }]);
    const res = mockRes();
    await verifyH(mockReq('POST', { email: EMAIL, code: '000000' }), res);
    assert.strictEqual(res.code, 401);
    assert.ok(!res.headers['set-cookie'], 'set a cookie anyway');
    assert.ok(!sent.some(s => s.url.includes('/rest/v1/')), 'wrote to the database anyway');
  });

  await acheck('notes: no cookie means no read', async () => {
    reset([]);
    const res = mockRes();
    await notesH(mockReq('GET'), res);
    assert.strictEqual(res.code, 401);
    assert.strictEqual(sent.length, 0, 'queried the database while signed out');
  });

  await acheck('notes: a forged cookie means no read', async () => {
    reset([]);
    const forged = Buffer.from(JSON.stringify({ p: OTHER, e: Date.now() + 99999 })).toString('base64url') + '.forged';
    const res = mockRes();
    await notesH(mockReq('GET', {}, `lusory_session=${forged}`), res);
    assert.strictEqual(res.code, 401);
    assert.strictEqual(sent.length, 0);
  });

  await acheck('notes: the read is filtered by the cookie and nothing else', async () => {
    reset([{ status: 200, json: [] }]);
    await notesH(mockReq('GET', {}, cookieFor(PLAYER)), mockRes());
    assert.strictEqual(sent.length, 1);
    assert.match(sent[0].url, new RegExp(`player_id=eq\\.${PLAYER}`), 'not scoped to the player');
    assert.ok(!sent[0].url.includes(OTHER), 'another player leaked into the query');
  });

  await acheck('notes: saving sends the body and no time of day', async () => {
    reset([{ status: 200, json: [{ id: 'n1', body: NOTE, created_on: '2026-08-13' }] }, { status: 200, json: [] }]);
    const res = mockRes();
    await notesH(mockReq('POST', { body: NOTE }, cookieFor(PLAYER)), res);
    assert.strictEqual(res.code, 200);
    const insert = sent.find(s => s.url.includes('/rest/v1/notes'));
    assert.deepStrictEqual(Object.keys(insert.body[0]).sort(), ['body', 'player_id']);
    assert.strictEqual(insert.body[0].player_id, PLAYER, 'saved against the wrong player');
    assert.ok(!('created_on' in insert.body[0]), 'sent a date instead of letting the column default');
  });

  await acheck('notes: saving moves last_open and touches nothing else', async () => {
    reset([{ status: 200, json: [{ id: 'n1' }] }, { status: 200, json: [] }]);
    await notesH(mockReq('POST', { body: NOTE }, cookieFor(PLAYER)), mockRes());
    const stamp = sent.find(s => s.method === 'PATCH');
    assert.ok(stamp, 'last_open was not stamped');
    assert.match(stamp.url, new RegExp(`players\\?id=eq\\.${PLAYER}`));
    assert.deepStrictEqual(Object.keys(stamp.body), ['last_open'], 'patched more than the one date');
  });

  await acheck('notes: an empty note is refused', async () => {
    reset([]);
    const res = mockRes();
    await notesH(mockReq('POST', { body: '   ' }, cookieFor(PLAYER)), res);
    assert.strictEqual(res.code, 400);
    assert.strictEqual(sent.length, 0);
  });

  await acheck('intake: both blank writes nothing', async () => {
    reset([]);
    const res = mockRes();
    await intakeH(mockReq('POST', {}), res);
    assert.strictEqual(res.code, 400);
    assert.strictEqual(sent.length, 0, 'wrote an empty row');
  });

  await acheck('intake: whitespace-only counts as blank', async () => {
    reset([]);
    const res = mockRes();
    await intakeH(mockReq('POST', { came_for: '  ', heard_from: '' }), res);
    assert.strictEqual(res.code, 400);
    assert.strictEqual(sent.length, 0);
  });

  await acheck('intake: the row carries no player, no address, no timestamp', async () => {
    reset([{ status: 201, json: [] }]);
    // A signed-in cookie is deliberately supplied: it must make no difference.
    const res = mockRes();
    await intakeH(mockReq('POST', { came_for: 'curiosity', heard_from: 'a friend' }, cookieFor(PLAYER)), res);
    assert.strictEqual(res.code, 200);
    const row = sent[0].body[0];
    assert.deepStrictEqual(Object.keys(row).sort(), ['came_for', 'heard_from', 'recorded_week']);
    assert.match(row.recorded_week, /^\d{4}-W\d{2}$/, 'not an ISO year-week');
    const serialised = JSON.stringify(sent[0]);
    assert.ok(!serialised.includes(PLAYER), 'the player id reached the intake row');
    assert.ok(!serialised.includes(EMAIL), 'an address reached the intake row');
  });

  await acheck('intake: one question answered is enough', async () => {
    reset([{ status: 201, json: [] }]);
    const res = mockRes();
    await intakeH(mockReq('POST', { heard_from: 'a friend' }), res);
    assert.strictEqual(res.code, 200);
    assert.strictEqual(sent[0].body[0].came_for, null);
  });

  await acheck('signout: clears the cookie and calls nothing', async () => {
    reset([]);
    const res = mockRes();
    await signoutH(mockReq('POST'), res);
    assert.strictEqual(res.code, 200);
    assert.match(res.headers['set-cookie'], /Max-Age=0/);
    assert.match(res.headers['set-cookie'], /HttpOnly/);
    assert.strictEqual(sent.length, 0);
  });

  // --- the spike oracle (branch only, deleted before release) ------------
  await acheck('oracle: any other address gets 404 and nothing happens', async () => {
    reset([]);
    const res = mockRes();
    await oracleH(mockReq('POST', { email: 'someone.else@example.com' }), res);
    assert.strictEqual(res.code, 404, 'a refused address must look like an absent route');
    assert.strictEqual(res.json().error, 'not found');
    assert.strictEqual(sent.length, 0, 'reached Supabase for an address it must ignore');
  });

  await acheck('oracle: a near-miss address is still 404', async () => {
    reset([]);
    const res = mockRes();
    await oracleH(mockReq('POST', { email: 'oracle@example.com.evil.test' }), res);
    assert.strictEqual(res.code, 404);
    assert.strictEqual(sent.length, 0);
  });

  await acheck('oracle: no address at all is 404', async () => {
    reset([]);
    const res = mockRes();
    await oracleH(mockReq('POST', {}), res);
    assert.strictEqual(res.code, 404);
    assert.strictEqual(sent.length, 0);
  });

  await acheck('oracle: the permitted address gets a code, minted without mail', async () => {
    reset([{ status: 200, json: { properties: { email_otp: '654321', action_link: 'https://x.invalid' } } }]);
    const res = mockRes();
    await oracleH(mockReq('POST', { email: ORACLE_EMAIL }), res);
    assert.strictEqual(res.code, 200);
    assert.strictEqual(res.json().code, '654321');
    assert.match(sent[0].url, /admin\/generate_link$/, 'did not use the admin mint');
    assert.ok(!sent.some(s => /\/auth\/v1\/otp$/.test(s.url)), 'sent an email after all');
  });

  await acheck('oracle: creates the user once if there is not one yet', async () => {
    reset([
      { status: 422, json: {} },
      { status: 200, json: {} },
      { status: 200, json: { properties: { email_otp: '112233' } } },
    ]);
    const res = mockRes();
    await oracleH(mockReq('POST', { email: ORACLE_EMAIL }), res);
    assert.strictEqual(res.code, 200);
    assert.strictEqual(res.json().code, '112233');
    assert.match(sent[1].url, /admin\/users$/);
    assert.strictEqual(sent[1].body.email_confirm, true);
  });

  await acheck('oracle: the minted code is never logged', async () => {
    reset([{ status: 200, json: { properties: { email_otp: '987654' } } }]);
    await oracleH(mockReq('POST', { email: ORACLE_EMAIL }), mockRes());
    const all = logged.join('\n');
    assert.ok(!all.includes('987654'), 'the code reached a log line');
    assert.ok(!all.includes(ORACLE_EMAIL), 'the address reached a log line');
    assert.deepStrictEqual(logged, ['lusory:spike-otp:minted']);
  });

  await acheck('oracle: GET is refused', async () => {
    reset([]);
    const res = mockRes();
    await oracleH(mockReq('GET'), res);
    assert.strictEqual(res.code, 405);
    assert.strictEqual(sent.length, 0);
  });

  check('oracle: no email address appears anywhere in the shipped api/', () => {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(__dirname, '..', 'api');
    const files = [];
    (function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full); else if (e.name.endsWith('.js')) files.push(full);
      }
    })(dir);
    assert.ok(files.length >= 6, `expected the function set, found ${files.length}`);
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      // Allow the shape-check regex and doc mentions; catch actual addresses.
      const found = src.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
      assert.strictEqual(found, null, `${path.basename(f)} contains an address: ${found}`);
    }
  });

  // --- the logs ----------------------------------------------------------
  // The host records every log line. Nothing identifying may appear in one.
  await acheck('logs: no address, code, or note body is ever logged', async () => {
    reset([SESSION_OK, { status: 200, json: [{ id: PLAYER }] }]);
    await verifyH(mockReq('POST', { email: EMAIL, code: CODE }), mockRes());
    const afterVerify = logged.join('\n');

    reset([{ status: 200, json: [{ id: 'n1' }] }, { status: 200, json: [] }]);
    await notesH(mockReq('POST', { body: NOTE }, cookieFor(PLAYER)), mockRes());
    const afterNote = logged.join('\n');

    reset([{ status: 500, json: {} }]);
    await requestH(mockReq('POST', { email: EMAIL }), mockRes());
    const afterFailure = logged.join('\n');

    const all = [afterVerify, afterNote, afterFailure].join('\n');
    for (const secret of [EMAIL, CODE, NOTE, 'ACCESS-TOKEN-SECRET', 'REFRESH-TOKEN-SECRET', PLAYER]) {
      assert.ok(!all.includes(secret), `"${secret.slice(0, 24)}" appeared in a log line`);
    }
    assert.ok(all.includes('lusory:'), 'expected the fixed log codes to be present');
  });

  await acheck('logs: failures record a status and nothing from the response', async () => {
    reset([{ status: 500, json: { msg: `signups not allowed for ${EMAIL}` } }]);
    await requestH(mockReq('POST', { email: EMAIL }), mockRes());
    assert.deepStrictEqual(logged, ['lusory:request:upstream-500']);
  });

  console.log = realLog;
  const total = pass + failures.length;
  for (const f of failures) console.log(`FAIL  ${f}`);
  console.log(`\nspike-endpoints: ${pass}/${total} pass, ${failures.length} fail`);
  process.exit(failures.length ? 1 : 0);
})();
