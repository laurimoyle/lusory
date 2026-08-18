'use strict';

const R = require('./_reporting.js');
const SOURCES = new Set([
  'friend_family', 'therapist_counselor', 'coach_wellness',
  'church_community', 'workplace_team', 'social_media',
  'search', 'event_workshop', 'reddit', 'facebook_group',
  'linkedin', 'researcher_university', 'insurance_wellness',
  'direct_outreach', 'other',
]);
const CONTEXTS = new Set(['signup', 'beta_gate']);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return R.json(res, 405, { error: 'method not allowed' });
  }
  if (!R.sameOrigin(req)) return R.json(res, 403, { error: 'same origin only' });
  if (!R.configured()) return R.json(res, 503, { error: 'referral unavailable' });

  const sent = R.body(req);
  if (sent.website) return R.json(res, 202, { ok: true });
  const source = typeof sent.source === 'string' ? sent.source : '';
  const intakeContext = CONTEXTS.has(sent.context) ? sent.context : 'signup';
  const detail = sent.detail === undefined || sent.detail === '' ? null : R.text(sent.detail, 160);
  if (!SOURCES.has(source) || (sent.detail && !detail)) {
    return R.json(res, 400, { error: 'invalid referral' });
  }

  let result;
  try {
    result = await R.supabase('referral_responses', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([{ source, detail, intake_context: intakeContext }]),
    });
  } catch (e) {
    return R.json(res, 503, { error: 'referral unavailable' });
  }
  if (!result.ok) return R.json(res, 503, { error: 'referral unavailable' });
  return R.json(res, 202, { ok: true });
};
