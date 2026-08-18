'use strict';

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

function sameOrigin(req) {
  const fetchSite = req.headers && req.headers['sec-fetch-site'];
  return !fetchSite || fetchSite === 'same-origin';
}

function text(value, limit) {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  if (!clean || clean.length > limit) return null;
  return clean;
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

module.exports = { json, body, sameOrigin, text, configured, supabase };
