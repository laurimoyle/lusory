'use strict';

// POST /api/auth/request  { email }
//
// Asks Supabase Auth to send a sign-in code to the address. Stores nothing:
// no row is written here, and the address is held only for the duration of
// the outbound call. A player row appears at /api/auth/verify, once the
// address has been shown to belong to whoever is asking.

const L = require('../_lib.js');

// Deliberately loose: the address is proven by the code arriving, not by a
// regex. This only rejects input that cannot be an address at all.
const SHAPED = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

module.exports = async function handler(req, res) {
  if (!L.methodGate(req, res, 'POST')) return;
  if (!L.configured()) return L.json(res, 500, { error: 'not configured' });

  const email = L.body(req).email;
  if (typeof email !== 'string' || !SHAPED.test(email.trim())) {
    return L.json(res, 400, { error: 'that does not look like an email address' });
  }

  let r;
  try {
    r = await L.auth('otp', { email: email.trim(), create_user: true });
  } catch (e) {
    L.log('request:unreachable');
    return L.json(res, 502, { error: 'could not send the code' });
  }

  if (r.status === 429) {
    L.log('request:rate-limited');
    return L.json(res, 429, { error: 'too many codes requested; try again later' });
  }
  if (!r.ok) {
    // Status only. The error body can quote the submitted address back.
    L.log(`request:upstream-${r.status}`);
    return L.json(res, 502, { error: 'could not send the code' });
  }

  // Same answer whether or not that address had been seen before, so this
  // endpoint cannot be used to ask who has an account.
  L.log('request:sent');
  return L.json(res, 200, { ok: true });
};
