'use strict';

// POST /api/spike-otp  { email }  →  { code }
//
// BRANCH ONLY. This endpoint hands back a sign-in code instead of emailing
// it, so the loop can be driven without waiting on the mailer's few-per-hour
// limit. It exists because a test needs an oracle, and for no other reason.
//
// IT MUST BE DELETED BEFORE RELEASE. It is listed in the request inventory
// under exactly that heading. If it ever reaches a production deploy, anyone
// who learns the one permitted address can sign in as it.
//
// The guard: one address, pinned as a SHA-256 digest so that no address
// appears anywhere in this repository. Every other address gets a 404 — the
// same answer an absent route would give, so the endpoint's existence is not
// advertised to anyone probing for it.
//
// Supabase's admin generate_link mints a token without sending mail, which
// is what makes this an oracle rather than a second way in: it reads a code
// that the normal flow would have emailed, using a key only the server has.

const crypto = require('crypto');
const L = require('./_lib.js');

// sha256 of the one address this will answer for, lowercased and trimmed.
// Overridable so the offline tests can exercise both branches without an
// address in the test file either.
const ALLOWED = process.env.SPIKE_OTP_SHA256
  || 'a37a1358a1d1f326a7fdefe5a4b6105357f7c36173e56c1e5dcf42e649b9250c';

function permitted(email) {
  const digest = crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  const a = Buffer.from(digest);
  const b = Buffer.from(ALLOWED);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function codeFrom(payload) {
  const props = (payload && payload.properties) || payload || {};
  return props.email_otp || props.otp || null;
}

module.exports = async function handler(req, res) {
  if (!L.methodGate(req, res, 'POST')) return;
  if (!L.configured()) return L.json(res, 500, { error: 'not configured' });

  const email = typeof L.body(req).email === 'string' ? L.body(req).email.trim() : '';

  // Not 403. A wrong address is told nothing at all about what lives here.
  if (!email || !permitted(email)) {
    L.log('spike-otp:refused');
    return L.json(res, 404, { error: 'not found' });
  }

  let r;
  try {
    r = await L.auth('admin/generate_link', { type: 'magiclink', email });
    if (!r.ok) {
      // No user yet: make one, confirmed, then mint the link. Same address,
      // still the only one this endpoint will act on.
      const made = await L.auth('admin/users', { email, email_confirm: true });
      if (!made.ok && made.status !== 422) {
        L.log(`spike-otp:create-${made.status}`);
        return L.json(res, 502, { error: 'could not mint a code' });
      }
      r = await L.auth('admin/generate_link', { type: 'magiclink', email });
    }
  } catch (e) {
    L.log('spike-otp:unreachable');
    return L.json(res, 502, { error: 'could not mint a code' });
  }

  if (!r.ok) {
    L.log(`spike-otp:generate-${r.status}`);
    return L.json(res, 502, { error: 'could not mint a code' });
  }

  const code = codeFrom(await r.json());
  if (!code) {
    L.log('spike-otp:no-code');
    return L.json(res, 502, { error: 'could not mint a code' });
  }

  // The code goes to the caller and nowhere else. It is never logged.
  L.log('spike-otp:minted');
  return L.json(res, 200, { code });
};
