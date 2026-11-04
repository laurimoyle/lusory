'use strict';

// GET /api/notes/export
//
// R26. Hands the player every note they kept, as one file they can save.
// Only the note text and its date go into the file: no player id, no email,
// nothing the player did not write themselves.

const L = require('../_lib.js');

module.exports = async function handler(req, res) {
  if (!L.methodGate(req, res, 'GET')) return;
  if (!L.configured()) return L.json(res, 500, { error: 'not configured' });

  const player = L.playerFrom(req);
  if (!player) return L.json(res, 401, { error: 'not signed in' });

  let r;
  try {
    r = await L.rest(
      `notes?player_id=eq.${encodeURIComponent(player)}&select=body,created_on&order=created_on.asc,id.asc`);
  } catch (e) {
    L.log('export:unreachable');
    return L.json(res, 502, { error: 'could not reach your notes' });
  }
  if (!r.ok) {
    L.log(`export:list-${r.status}`);
    return L.json(res, 502, { error: 'could not reach your notes' });
  }
  const notes = (await r.json()).map(n => ({ written_on: n.created_on, note: n.body }));

  res.setHeader('Content-Disposition', 'attachment; filename="lusory-notes.json"');
  return L.json(res, 200, { exported_on: L.today(), notes });
};
