'use strict';

// Shared helpers for the /api functions.
//
// Two rules govern everything in this file:
//   1. The Supabase client lives only here, on the server. The browser is
//      never told Supabase exists and talks to exactly one host.
//   2. Nothing that identifies a player — no email, no code, no note body —
//      is ever written to a log line or put in a URL. Vercel records the
//      request path and query string of every invocation, so identifying
//      material travels in POST bodies only, and log() takes a fixed code,
//      never a value.

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const COOKIE = 'lusory_session';
const SESSION_DAYS = 30;

// --- logging -------------------------------------------------------------
// The only logging in the codebase. Takes a fixed string chosen from the
// call sites below; never a request body, never an error body, never a
// value that came from outside. Supabase error bodies can echo the address
// that was submitted, so failures record the HTTP status and nothing else.
function log(code) {
  console.log(`lusory:${code}`);
}

// --- responses -----------------------------------------------------------
function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

function methodGate(req, res, allowed) {
  if (req.method === allowed) return true;
  res.setHeader('Allow', allowed);
  json(res, 405, { error: 'method not allowed' });
  return false;
}

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
}

// --- session cookie ------------------------------------------------------
// The cookie carries a player id and an expiry, signed with HMAC-SHA256.
// A player id is a structural identifier, not a fact about anyone. No
// Supabase token is handed to the browser: the access token from the auth
// exchange is read for the user id and then dropped, and the refresh token
// is never requested, stored, or used.

function hmac(payload) {
  return crypto.createHmac('sha256', SERVICE_KEY).update(payload).digest('base64url');
}

function issue(playerId) {
  const expires = Date.now() + SESSION_DAYS * 86400000;
  const payload = Buffer.from(JSON.stringify({ p: playerId, e: expires })).toString('base64url');
  return `${payload}.${hmac(payload)}`;
}

function open(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const i = token.lastIndexOf('.');
  const payload = token.slice(0, i);
  const mac = token.slice(i + 1);
  const expected = hmac(payload);
  // Constant-time compare; unequal lengths would throw, so check first.
  if (mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  let claim;
  try { claim = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch (e) { return null; }
  if (!claim || typeof claim.p !== 'string' || typeof claim.e !== 'number') return null;
  if (claim.e < Date.now()) return null;
  return claim.p;
}

function setSession(res, playerId) {
  res.setHeader('Set-Cookie',
    `${COOKIE}=${issue(playerId)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}`);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
}

function playerFrom(req) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== COOKIE) continue;
    return open(part.slice(eq + 1).trim());
  }
  return null;
}

// --- Supabase (server side only) ----------------------------------------
async function rest(path, init) {
  const opts = init || {};
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: opts.method || 'GET',
    headers: Object.assign({
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    }, opts.headers || {}),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

async function auth(path, payload) {
  return fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

// --- dates ---------------------------------------------------------------
// Every date here is a calendar date and nothing finer. notes.created_on is
// filled by the column's own CURRENT_DATE default, so no clock value is sent
// for it at all. last_open has to be written on return visits as well as on
// the first one, which PostgREST cannot express as CURRENT_DATE, so it is
// computed here — as a UTC calendar date, which is what CURRENT_DATE resolves
// to on this database.
function today() {
  return new Date().toISOString().slice(0, 10);
}

// ISO-8601 year and week, e.g. 2026-W33. The coarsest useful bucket: it is
// what the intake row records instead of a timestamp, so a response cannot
// be lined up in time with the signup that produced it.
function isoYearWeek(now) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // Thursday of the current ISO week determines the ISO year.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function configured() {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

module.exports = {
  log, json, methodGate, body,
  setSession, clearSession, playerFrom,
  rest, auth, today, isoYearWeek, configured,
};
