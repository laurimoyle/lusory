'use strict';

const assert = require('assert');

process.env.SUPABASE_URL = 'https://test.supabase.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';

let calls = [];
let responses = [];
global.fetch = async (url, init) => {
  calls.push({ url: String(url), init: init || {} });
  const next = responses.shift() || { ok: true, status: 201 };
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

const fs = require('fs');
const path = require('path');
// R37: the pre-transaction /api/subscribe and /api/referral writers are retired;
// all email + referral intake goes through the atomic /api/intake.
for (const gone of ['subscribe.js', 'referral.js']) {
  assert.ok(!fs.existsSync(path.join(__dirname, '..', 'api', gone)), gone + ' must not be deployed');
}
const usability = require('../api/usability.js');
const testimonial = require('../api/testimonial.js');

(async () => {
  let out;
  calls = []; responses = [{ ok: true, status: 201 }];
  out = res();
  await usability({ method: 'POST', headers: { 'sec-fetch-site': 'same-origin' }, body: {
    expectation: 'A small game shelf', confusion: '', choice_amount: 'about_right',
    doors_read: 'equal', keep_text: 'The restraint', change_text: 'Explain the first screen sooner',
    return_clarity: 'probably',
  } }, out);
  assert.strictEqual(out.statusCode, 202);
  assert.match(calls[0].url, /usability_responses$/);
  const testRow = JSON.parse(calls[0].init.body)[0];
  assert.strictEqual(testRow.test_version, 1);
  assert.strictEqual(testRow.confusion, null);
  assert.ok(!/email|session|referrer|fingerprint|utm|click/i.test(JSON.stringify(testRow)));

  calls = []; responses = [{ ok: true, status: 201 }];
  out = res();
  await testimonial({ method: 'POST', headers: { 'sec-fetch-site': 'same-origin' }, body: {
    quote: 'Lusory made a familiar walk feel newly strange, and I wanted another game afterward.',
    display_name: 'Mara', role: 'therapist', attribution: 'first_name', public_consent: true,
  } }, out);
  assert.strictEqual(out.statusCode, 202);
  assert.match(calls[0].url, /beta_testimonials$/);
  const testimonialRow = JSON.parse(calls[0].init.body)[0];
  assert.strictEqual(testimonialRow.display_name, 'Mara');
  assert.strictEqual(testimonialRow.role, 'therapist');
  assert.ok(!/game_id|session|referrer|fingerprint|utm|click/i.test(JSON.stringify(testimonialRow)));

  calls = [];
  out = res();
  await testimonial({ method: 'POST', headers: {}, body: {
    quote: 'Too short', attribution: 'anonymous', public_consent: true,
  } }, out);
  assert.strictEqual(out.statusCode, 400);
  assert.strictEqual(calls.length, 0);

  calls = [];
  out = res();
  await usability({ method: 'POST', headers: {}, body: {
    expectation: 'A game', choice_amount: 'about_right', doors_read: 'equal',
    change_text: '', return_clarity: 'yes',
  } }, out);
  assert.strictEqual(out.statusCode, 400);
  assert.strictEqual(calls.length, 0);

  console.log('intake + usability tests: all green');
})().catch(error => { console.error(error); process.exit(1); });
