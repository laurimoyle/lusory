'use strict';

const assert = require('assert');

process.env.SUPABASE_URL = 'https://test.supabase.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
let calls = [];
let responses = [];
global.fetch = async (url, init) => {
  calls.push({ url: String(url), init: init || {} });
  const next = responses.shift() || { ok: true, status: 200, json: [] };
  return { ok: next.ok, status: next.status, json: async () => next.json };
};

function res() {
  return {
    statusCode: 0,
    headers: {},
    payload: '',
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(v) { this.payload = v || ''; },
    json() { return JSON.parse(this.payload); },
  };
}

const choice = require('../api/choice.js');

(async () => {
  calls = []; responses = [{ ok: true, status: 204, json: null }];
  let out = res();
  await choice({ method: 'POST', headers: { 'sec-fetch-site': 'same-origin' }, body: { game: 7, source: 'first', first: true } }, out);
  assert.strictEqual(out.statusCode, 202);
  assert.strictEqual(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/rpc\/increment_game_choice$/);
  assert.deepStrictEqual(JSON.parse(calls[0].init.body), { p_game_id: 7, p_source: 'first', p_is_first: true });
  assert.ok(!/email|session|referrer|fingerprint|user|time/i.test(calls[0].init.body));

  calls = [];
  out = res();
  await choice({ method: 'POST', headers: {}, body: { game: 16, source: 'shelf' } }, out);
  assert.strictEqual(out.statusCode, 400);
  assert.strictEqual(calls.length, 0);

  calls = [];
  out = res();
  await choice({ method: 'POST', headers: { 'sec-fetch-site': 'cross-site' }, body: { game: 1, source: 'shelf' } }, out);
  assert.strictEqual(out.statusCode, 403);
  assert.strictEqual(calls.length, 0);

  console.log('choice reporting tests: all green');
})().catch(error => { console.error(error); process.exit(1); });
