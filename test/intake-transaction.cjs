'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sourceContracts = [
  fs.readFileSync(path.join(root, 'api', 'intake.js'), 'utf8'),
  fs.readFileSync(path.join(root, 'api', 'referral.js'), 'utf8'),
  fs.readFileSync(path.join(root, 'docs', 'beta-data-schema.sql'), 'utf8'),
  fs.readFileSync(path.join(root, 'index.html'), 'utf8'),
];
const expectedSources = [
  'friend_family', 'therapist_counselor', 'coach_wellness',
  'church_community', 'workplace_team', 'social_media',
  'search', 'event_workshop', 'reddit', 'facebook_group',
  'linkedin', 'researcher_university', 'insurance_wellness',
  'direct_outreach', 'other',
];
for (const source of expectedSources) {
  for (const contract of sourceContracts) {
    assert.ok(contract.includes(source), `${source} is missing from an intake contract`);
  }
}

process.env.SUPABASE_URL = 'https://test.supabase.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';

let calls = [];
let responses = [];
global.fetch = async (url, init) => {
  calls.push({ url: String(url), init: init || {} });
  const next = responses.shift() || { ok: true, status: 204 };
  return { ok: next.ok, status: next.status };
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

const intake = require('../api/intake.js');
const requestToken = 'e8de5fb5-c1f8-4aa8-8c64-b3f33c0e7eef';

(async () => {
  calls = []; responses = [{ ok: true, status: 204 }];
  let out = res();
  await intake({ method: 'POST', headers: { 'sec-fetch-site': 'same-origin' }, body: {
    request_token: requestToken,
    email: '  Person@Example.com ', consent: true, cohort: 'beta',
    source: 'reddit', detail: 'r/SampleSize', context: 'beta_gate',
  } }, out);
  assert.strictEqual(out.statusCode, 202);
  assert.strictEqual(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/rpc\/submit_beta_intake$/);
  const payload = JSON.parse(calls[0].init.body);
  assert.deepStrictEqual(payload, {
    p_request_token: requestToken,
    p_email: 'person@example.com',
    p_cohort: 'beta',
    p_source: 'reddit',
    p_detail: 'r/SampleSize',
    p_intake_context: 'beta_gate',
  });
  assert.ok(!/game|player|session|referrer|fingerprint|utm|click/i.test(JSON.stringify(payload)));

  calls = [];
  out = res();
  await intake({ method: 'POST', headers: {}, body: {
    request_token: 'not-a-uuid', email: 'person@example.com', consent: true,
    cohort: 'beta', source: 'reddit', context: 'beta_gate',
  } }, out);
  assert.strictEqual(out.statusCode, 400);
  assert.strictEqual(calls.length, 0);

  calls = [];
  out = res();
  await intake({ method: 'POST', headers: {}, body: {
    request_token: requestToken, email: 'person@example.com', consent: true,
    cohort: 'updates', source: 'linkedin', context: 'beta_gate',
  } }, out);
  assert.strictEqual(out.statusCode, 400);
  assert.strictEqual(calls.length, 0);

  calls = [];
  out = res();
  await intake({ method: 'POST', headers: {}, body: {
    website: 'https://spam.invalid', request_token: 'bad', email: 'bot@example.com',
  } }, out);
  assert.strictEqual(out.statusCode, 202);
  assert.strictEqual(calls.length, 0);

  calls = [];
  out = res();
  await intake({ method: 'POST', headers: { 'sec-fetch-site': 'cross-site' }, body: {
    request_token: requestToken, email: 'person@example.com', consent: true,
    cohort: 'beta', source: 'reddit', context: 'beta_gate',
  } }, out);
  assert.strictEqual(out.statusCode, 403);
  assert.strictEqual(calls.length, 0);

  calls = []; responses = [{ ok: false, status: 400 }];
  out = res();
  await intake({ method: 'POST', headers: {}, body: {
    request_token: requestToken, email: 'person@example.com', consent: true,
    cohort: 'updates', source: 'linkedin', detail: '', context: 'signup',
  } }, out);
  assert.strictEqual(out.statusCode, 503);
  assert.strictEqual(calls.length, 1);

  console.log('atomic intake tests: all green');
})().catch(error => { console.error(error); process.exit(1); });
