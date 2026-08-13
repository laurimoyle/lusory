'use strict';

// POST /api/auth/signout
//
// Clears the cookie. There is nothing else to do: the session lived in the
// cookie, so there is no server-side record of it to revoke and no request
// to Supabase to make. Nothing is written, and nothing about the player
// changes — signing out is not an event anyone keeps.

const L = require('../_lib.js');

module.exports = async function handler(req, res) {
  if (!L.methodGate(req, res, 'POST')) return;
  L.clearSession(res);
  return L.json(res, 200, { ok: true });
};
