'use strict';

// POST /api/intake  { came_for?, heard_from? }
//
// Two questions asked once, at signup. The answers are detached from the
// person the moment they are written: the row carries no player id, no
// address, and no timestamp — only an ISO year-week, which is coarse
// enough that a row cannot be lined up with the signup that produced it.
//
// This endpoint deliberately takes no cookie and reads no session. It could
// not attach an answer to a player even if a later change tried to, because
// the table has no column to put one in.
//
// Skipping is a real answer to have given: if both questions are left
// blank the page sends nothing at all, and if a request arrives empty
// anyway, nothing is written.

const L = require('./_lib.js');

const MAX = 500;

function cleaned(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX);
}

module.exports = async function handler(req, res) {
  if (!L.methodGate(req, res, 'POST')) return;
  if (!L.configured()) return L.json(res, 500, { error: 'not configured' });

  const sent = L.body(req);
  const cameFor = cleaned(sent.came_for);
  const heardFrom = cleaned(sent.heard_from);

  if (!cameFor && !heardFrom) {
    // Loud on purpose. An empty row would be a record that someone signed
    // up, which is exactly what this table must not hold.
    return L.json(res, 400, { error: 'nothing to record' });
  }

  let r;
  try {
    r = await L.rest('intake_responses', {
      method: 'POST',
      body: [{
        came_for: cameFor,
        heard_from: heardFrom,
        recorded_week: L.isoYearWeek(new Date()),
      }],
    });
  } catch (e) {
    L.log('intake:unreachable');
    return L.json(res, 502, { error: 'could not record that' });
  }
  if (!r.ok) {
    L.log(`intake:insert-${r.status}`);
    return L.json(res, 502, { error: 'could not record that' });
  }

  L.log('intake:ok');
  return L.json(res, 200, { ok: true });
};
