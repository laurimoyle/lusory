'use strict';

// POST /api/auth/verify  { email, code }
//
// Exchanges the emailed code for proof the address belongs to whoever is
// asking, then makes sure a players row exists for it and stamps today's
// date on it. Replies with a session cookie set by us.
//
// The tokens Supabase returns are read for the user id and then dropped.
// No access token and no refresh token is stored, forwarded, or given to
// the browser.

const L = require('../_lib.js');

module.exports = async function handler(req, res) {
  if (!L.methodGate(req, res, 'POST')) return;
  if (!L.configured()) return L.json(res, 500, { error: 'not configured' });

  const sent = L.body(req);
  const email = typeof sent.email === 'string' ? sent.email.trim() : '';
  const code = typeof sent.code === 'string' ? sent.code.replace(/\s+/g, '') : '';
  if (!email || !code) {
    return L.json(res, 400, { error: 'need the address and the code' });
  }

  // A six-digit code is the token the player reads out of the email. The
  // longer form is the hash a mail client's link carries, kept working so
  // the exchange still happens here rather than in the player's browser.
  const claim = /^\d{6}$/.test(code)
    ? { type: 'email', email, token: code }
    : { type: 'email', token_hash: code };

  let verified;
  try {
    verified = await L.auth('verify', claim);
  } catch (e) {
    L.log('verify:unreachable');
    return L.json(res, 502, { error: 'could not check the code' });
  }

  if (!verified.ok) {
    L.log(`verify:rejected-${verified.status}`);
    return L.json(res, 401, { error: 'that code did not work' });
  }

  let userId;
  try {
    const session = await verified.json();
    userId = session && session.user && session.user.id;
  } catch (e) {
    userId = null;
  }
  if (!userId) {
    L.log('verify:no-user');
    return L.json(res, 502, { error: 'could not check the code' });
  }

  // One row per address. A returning player updates the same row; the only
  // thing that changes on it is the date.
  let row;
  try {
    const up = await L.rest('players?on_conflict=email', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: [{ email, auth_user_id: userId, last_open: L.today() }],
    });
    if (!up.ok) {
      L.log(`verify:upsert-${up.status}`);
      return L.json(res, 502, { error: 'could not open your notes' });
    }
    row = (await up.json())[0];
  } catch (e) {
    L.log('verify:upsert-failed');
    return L.json(res, 502, { error: 'could not open your notes' });
  }

  if (!row || !row.id) {
    L.log('verify:no-row');
    return L.json(res, 502, { error: 'could not open your notes' });
  }

  L.setSession(res, row.id);
  L.log('verify:ok');
  return L.json(res, 200, { ok: true });
};
