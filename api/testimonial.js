'use strict';

const R = require('./_reporting.js');
const ROLES = new Set([
  'player', 'therapist', 'researcher', 'coach',
  'wellness_buyer', 'employer_benefits', 'other',
]);
const ATTRIBUTIONS = new Set(['anonymous', 'first_name', 'name_and_role']);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return R.json(res, 405, { error: 'method not allowed' });
  }
  if (!R.sameOrigin(req)) return R.json(res, 403, { error: 'same origin only' });
  if (!R.configured()) return R.json(res, 503, { error: 'testimonial unavailable' });

  const sent = R.body(req);
  if (sent.website) return R.json(res, 202, { ok: true });
  const quote = R.text(sent.quote, 600);
  const displayName = sent.display_name ? R.text(sent.display_name, 80) : null;
  const role = sent.role ? (ROLES.has(sent.role) ? sent.role : null) : null;
  const attribution = typeof sent.attribution === 'string' ? sent.attribution : '';
  if (!quote || quote.length < 40 || (sent.display_name && !displayName)
    || (sent.role && !role) || !ATTRIBUTIONS.has(attribution)
    || sent.public_consent !== true
    || (attribution !== 'anonymous' && !displayName)) {
    return R.json(res, 400, { error: 'invalid testimonial' });
  }

  let result;
  try {
    result = await R.supabase('beta_testimonials', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([{
        quote,
        display_name: displayName,
        role,
        attribution,
        public_consent: true,
      }]),
    });
  } catch (e) {
    return R.json(res, 503, { error: 'testimonial unavailable' });
  }
  if (!result.ok) return R.json(res, 503, { error: 'testimonial unavailable' });
  return R.json(res, 202, { ok: true });
};
