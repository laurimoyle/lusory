'use strict';

const R = require('./_reporting.js');

const COHORTS = new Set(['updates', 'beta']);
const CONTEXTS = new Set(['signup', 'beta_gate']);
const SOURCES = new Set([
  'friend_family', 'therapist_counselor', 'coach_wellness',
  'church_community', 'workplace_team', 'social_media',
  'search', 'event_workshop', 'reddit', 'facebook_group',
  'linkedin', 'researcher_university', 'insurance_wellness',
  'direct_outreach', 'other',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return R.json(res, 405, { error: 'method not allowed' });
  }
  if (!R.sameOrigin(req)) return R.json(res, 403, { error: 'same origin only' });
  if (!R.configured()) return R.json(res, 503, { error: 'intake unavailable' });

  const sent = R.body(req);
  if (sent.website) return R.json(res, 202, { ok: true });

  const requestToken = typeof sent.request_token === 'string' ? sent.request_token.trim() : '';
  const email = typeof sent.email === 'string' ? sent.email.trim().toLowerCase() : '';
  const cohort = typeof sent.cohort === 'string' ? sent.cohort : '';
  const source = typeof sent.source === 'string' ? sent.source : '';
  const intakeContext = typeof sent.context === 'string' ? sent.context : '';
  const detail = sent.detail === undefined || sent.detail === '' ? null : R.text(sent.detail, 160);
  const validEmail = email.length >= 3 && email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validPair = (cohort === 'beta' && intakeContext === 'beta_gate')
    || (cohort === 'updates' && intakeContext === 'signup');

  if (!UUID.test(requestToken) || !validEmail || sent.consent !== true
      || !COHORTS.has(cohort) || !CONTEXTS.has(intakeContext)
      || !validPair || !SOURCES.has(source) || (sent.detail && !detail)) {
    return R.json(res, 400, { error: 'invalid intake' });
  }

  let result;
  try {
    result = await R.supabase('rpc/submit_beta_intake', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        p_request_token: requestToken,
        p_email: email,
        p_cohort: cohort,
        p_source: source,
        p_detail: detail,
        p_intake_context: intakeContext,
      }),
    });
  } catch (e) {
    return R.json(res, 503, { error: 'intake unavailable' });
  }
  if (!result.ok) return R.json(res, 503, { error: 'intake unavailable' });
  return R.json(res, 202, { ok: true });
};
