'use strict';

const GAME_NAMES = [
  '', 'The Awe Route', 'The Slowest Bite', 'No-Delete', 'The Fable of Today',
  'Untracked Miles', 'The Coin Walk', 'The Kindness Heist', 'The Stranger Hunt',
  'The Question Ladder', 'Yes-And Supper', 'Awkward on Purpose',
  'The Pocket Vacation', 'Every Angle', 'Three Good Finds', 'The Balloon Keeper',
];

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
}

function configured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function supabase(path, init) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const opts = Object.assign({}, init || {});
  opts.headers = Object.assign({
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }, opts.headers || {});
  return fetch(`${base}/rest/v1/${path}`, opts);
}

function mondayUTC(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d;
}

function isoDate(date) { return date.toISOString().slice(0, 10); }

function previousWeek(now) {
  const end = mondayUTC(now || new Date());
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  return { start: isoDate(start), end: isoDate(end) };
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

module.exports = { GAME_NAMES, json, body, configured, supabase, previousWeek, escapeHTML };
