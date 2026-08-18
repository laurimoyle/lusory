'use strict';

const R = require('./_reporting.js');
const CHOICE = new Set(['too_few', 'about_right', 'too_many']);
const DOORS = new Set(['equal', 'ranked', 'unsure']);
const RETURN = new Set(['yes', 'probably', 'not_sure', 'no']);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return R.json(res, 405, { error: 'method not allowed' });
  }
  if (!R.sameOrigin(req)) return R.json(res, 403, { error: 'same origin only' });
  if (!R.configured()) return R.json(res, 503, { error: 'feedback unavailable' });

  const sent = R.body(req);
  if (sent.website) return R.json(res, 202, { ok: true });
  const expectation = R.text(sent.expectation, 800);
  const confusion = sent.confusion ? R.text(sent.confusion, 800) : null;
  const keepText = sent.keep_text ? R.text(sent.keep_text, 500) : null;
  const changeText = R.text(sent.change_text, 500);
  if (!expectation || !changeText || (sent.confusion && !confusion) || (sent.keep_text && !keepText)
    || !CHOICE.has(sent.choice_amount) || !DOORS.has(sent.doors_read)
    || !RETURN.has(sent.return_clarity)) {
    return R.json(res, 400, { error: 'invalid feedback' });
  }

  let result;
  try {
    result = await R.supabase('usability_responses', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([{
        test_version: 1,
        expectation,
        confusion,
        choice_amount: sent.choice_amount,
        doors_read: sent.doors_read,
        keep_text: keepText,
        change_text: changeText,
        return_clarity: sent.return_clarity,
      }]),
    });
  } catch (e) {
    return R.json(res, 503, { error: 'feedback unavailable' });
  }
  if (!result.ok) return R.json(res, 503, { error: 'feedback unavailable' });
  return R.json(res, 202, { ok: true });
};
