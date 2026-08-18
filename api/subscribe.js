'use strict';

const R = require('./_reporting.js');
const COHORTS = new Set(['updates', 'beta']);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return R.json(res, 405, { error: 'method not allowed' });
  }
  if (!R.sameOrigin(req)) return R.json(res, 403, { error: 'same origin only' });
  if (!R.configured()) return R.json(res, 503, { error: 'signup unavailable' });

  const sent = R.body(req);
  if (sent.website) return R.json(res, 202, { ok: true });
  const email = typeof sent.email === 'string' ? sent.email.trim().toLowerCase() : '';
  const cohort = COHORTS.has(sent.cohort) ? sent.cohort : 'updates';
  const valid = email.length >= 3 && email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!valid || sent.consent !== true) return R.json(res, 400, { error: 'invalid signup' });

  let result;
  try {
    result = await R.supabase('email_subscribers?on_conflict=email', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{
        email,
        cohort,
        consented_at: new Date().toISOString(),
        unsubscribed_at: null,
      }]),
    });
  } catch (e) {
    return R.json(res, 503, { error: 'signup unavailable' });
  }
  if (!result.ok) return R.json(res, 503, { error: 'signup unavailable' });
  return R.json(res, 202, { ok: true });
};
