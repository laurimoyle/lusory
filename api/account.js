'use strict';

// DELETE /api/account
//
// R26. Removes the player completely: the Supabase Auth user, the players
// row, and (by foreign-key cascade) every note. Then clears the cookie.
//
// Order matters for retries. The auth user is removed first and a 404 counts
// as already gone, so if the players delete fails the player can simply try
// again: the cookie still names the row, the lookup still finds it, and the
// second attempt finishes the job. Nothing is kept afterward — no tombstone,
// no "deleted" flag, no log line naming who left.

const L = require('./_lib.js');

module.exports = async function handler(req, res) {
  if (!L.methodGate(req, res, 'DELETE')) return;
  if (!L.configured()) return L.json(res, 500, { error: 'not configured' });

  const player = L.playerFrom(req);
  if (!player) return L.json(res, 401, { error: 'not signed in' });

  let r;
  try {
    r = await L.rest(`players?id=eq.${encodeURIComponent(player)}&select=auth_user_id`);
  } catch (e) {
    L.log('account:unreachable');
    return L.json(res, 502, { error: 'could not delete the account; try again' });
  }
  if (!r.ok) {
    L.log(`account:lookup-${r.status}`);
    return L.json(res, 502, { error: 'could not delete the account; try again' });
  }
  const rows = await r.json();
  if (!rows.length) {
    // Already gone. Clear the cookie so the browser stops presenting it.
    L.clearSession(res);
    return L.json(res, 200, { ok: true });
  }

  const authUser = rows[0].auth_user_id;
  if (authUser) {
    let a;
    try {
      a = await L.admin('DELETE', `users/${encodeURIComponent(authUser)}`);
    } catch (e) {
      L.log('account:auth-unreachable');
      return L.json(res, 502, { error: 'could not delete the account; try again' });
    }
    if (!a.ok && a.status !== 404) {
      L.log(`account:auth-delete-${a.status}`);
      return L.json(res, 502, { error: 'could not delete the account; try again' });
    }
  }

  let d;
  try {
    d = await L.rest(`players?id=eq.${encodeURIComponent(player)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
  } catch (e) {
    L.log('account:unreachable');
    return L.json(res, 502, { error: 'could not delete the account; try again' });
  }
  if (!d.ok) {
    L.log(`account:delete-${d.status}`);
    return L.json(res, 502, { error: 'could not delete the account; try again' });
  }

  L.clearSession(res);
  L.log('account:deleted');
  return L.json(res, 200, { ok: true });
};
