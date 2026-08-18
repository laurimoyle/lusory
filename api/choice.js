'use strict';

const R = require('./_reporting.js');
const SOURCES = new Set(['first', 'randomizer', 'shelf']);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return R.json(res, 405, { error: 'method not allowed' });
  }

  if (!R.sameOrigin(req)) {
    return R.json(res, 403, { error: 'same origin only' });
  }
  if (!R.configured()) return R.json(res, 503, { error: 'reporting unavailable' });

  const sent = R.body(req);
  const game = Number(sent.game);
  const source = typeof sent.source === 'string' ? sent.source : '';
  const first = sent.first === true && source === 'first';
  if (!Number.isInteger(game) || game < 1 || game > 15 || !SOURCES.has(source)) {
    return R.json(res, 400, { error: 'invalid choice' });
  }

  let result;
  try {
    result = await R.supabase('rpc/increment_game_choice', {
      method: 'POST',
      body: JSON.stringify({ p_game_id: game, p_source: source, p_is_first: first }),
    });
  } catch (e) {
    console.log('choice:unreachable');
    return R.json(res, 503, { error: 'reporting unavailable' });
  }
  if (!result.ok) {
    console.log(`choice:rejected-${result.status}`);
    return R.json(res, 503, { error: 'reporting unavailable' });
  }
  return R.json(res, 202, { ok: true });
};
