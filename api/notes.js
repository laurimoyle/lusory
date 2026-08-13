'use strict';

// GET  /api/notes          → this player's notes, newest first
// POST /api/notes { body } → save one, and stamp today on the player
//
// The cookie decides whose notes these are. RLS is deny-all on the table
// and these functions hold the service role key, so that scoping is not a
// convenience — it is the whole boundary, and every query below is filtered
// by the player id the signed cookie carries and by nothing else.
//
// Notes are never read in aggregate, never inspected one by one, and never
// feed anything back into the game. They are written for one reader and
// read by that same reader.

const L = require('./_lib.js');

const MAX = 4000;

module.exports = async function handler(req, res) {
  if (!L.configured()) return L.json(res, 500, { error: 'not configured' });

  const player = L.playerFrom(req);
  if (!player) return L.json(res, 401, { error: 'not signed in' });

  if (req.method === 'GET') return list(res, player);
  if (req.method === 'POST') return save(req, res, player);
  res.setHeader('Allow', 'GET, POST');
  return L.json(res, 405, { error: 'method not allowed' });
};

async function list(res, player) {
  let r;
  try {
    r = await L.rest(
      `notes?player_id=eq.${encodeURIComponent(player)}&select=id,body,created_on&order=created_on.desc,id.desc`);
  } catch (e) {
    L.log('notes:unreachable');
    return L.json(res, 502, { error: 'could not reach your notes' });
  }
  if (!r.ok) {
    L.log(`notes:list-${r.status}`);
    return L.json(res, 502, { error: 'could not reach your notes' });
  }
  return L.json(res, 200, { notes: await r.json() });
}

async function save(req, res, player) {
  const text = L.body(req).body;
  if (typeof text !== 'string' || !text.trim()) {
    return L.json(res, 400, { error: 'nothing to save' });
  }
  if (text.length > MAX) {
    return L.json(res, 413, { error: 'that note is too long' });
  }

  let r;
  try {
    // created_on is left out on purpose: the column's CURRENT_DATE default
    // fills it, so the note carries a date and never a time.
    r = await L.rest('notes', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: [{ player_id: player, body: text }],
    });
  } catch (e) {
    L.log('notes:unreachable');
    return L.json(res, 502, { error: 'could not save that' });
  }
  if (!r.ok) {
    L.log(`notes:insert-${r.status}`);
    return L.json(res, 502, { error: 'could not save that' });
  }
  const saved = (await r.json())[0];

  // Writing a note is opening the game, so the same one date moves. This is
  // the only column on players that anything ever updates.
  try {
    await L.rest(`players?id=eq.${encodeURIComponent(player)}`, {
      method: 'PATCH',
      body: { last_open: L.today() },
    });
  } catch (e) {
    // The note is saved; the date is not worth failing the request over.
    L.log('notes:stamp-failed');
  }

  return L.json(res, 200, { note: saved });
}
