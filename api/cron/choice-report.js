'use strict';

const R = require('../_reporting.js');

function rowsHTML(rows, field, includeSources) {
  const byGame = new Map();
  rows.forEach(row => {
    const id = Number(row.game_id);
    const current = byGame.get(id) || { total: 0, first: 0, firstSource: 0, randomizer: 0, shelf: 0 };
    current.total += Number(row.selections) || 0;
    current.first += Number(row.first_choices) || 0;
    current[row.source === 'first' ? 'firstSource' : row.source] += Number(row.selections) || 0;
    byGame.set(id, current);
  });
  const values = [...byGame.entries()]
    .filter(([, counts]) => counts[field] > 0)
    .sort((a, b) => b[1][field] - a[1][field] || a[0] - b[0]);
  if (!values.length) return '<p>None.</p>';
  return '<table style="border-collapse:collapse;width:100%"><tbody>' + values.map(([id, counts]) => {
    const detail = includeSources
      ? `<br><small>first deal ${counts.firstSource} · randomizer ${counts.randomizer} · shelf ${counts.shelf}</small>`
      : '';
    return `<tr><td style="padding:7px 8px;border-bottom:1px solid #d8d1b8">${id}. ${R.escapeHTML(R.GAME_NAMES[id])}${detail}</td>`
      + `<td style="padding:7px 8px;border-bottom:1px solid #d8d1b8;text-align:right"><strong>${counts[field]}</strong></td></tr>`;
  }).join('') + '</tbody></table>';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return R.json(res, 405, { error: 'method not allowed' });
  }
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return R.json(res, 401, { error: 'unauthorized' });
  }
  if (!R.configured() || !process.env.RESEND_API_KEY || !process.env.REPORT_TO_EMAIL) {
    return R.json(res, 503, { error: 'report not configured' });
  }

  const week = R.previousWeek(new Date());
  const query = `game_choice_weekly?week_start=gte.${week.start}&week_start=lt.${week.end}`
    + '&select=game_id,source,selections,first_choices';
  let dataResponse;
  try { dataResponse = await R.supabase(query, { method: 'GET' }); }
  catch (e) { return R.json(res, 503, { error: 'report data unavailable' }); }
  if (!dataResponse.ok) return R.json(res, 503, { error: 'report data unavailable' });
  const rows = await dataResponse.json();
  const total = rows.reduce((sum, row) => sum + (Number(row.selections) || 0), 0);
  const firstTotal = rows.reduce((sum, row) => sum + (Number(row.first_choices) || 0), 0);
  const html = `<div style="font-family:Georgia,serif;color:#24241b;max-width:620px;margin:auto">`
    + `<h1 style="font-size:26px">Lusory weekly game choices</h1>`
    + `<p>${R.escapeHTML(week.start)} through ${R.escapeHTML(week.end)} · ${total} selections · ${firstTotal} first selections</p>`
    + '<h2 style="font-size:20px">First games chosen</h2>' + rowsHTML(rows, 'first', false)
    + '<h2 style="font-size:20px;margin-top:26px">All game selections</h2>' + rowsHTML(rows, 'total', true)
    + '<p style="margin-top:28px;color:#666;font-size:13px">Aggregate counters only. No player, session, email, referrer, fingerprint, or raw event is stored.</p></div>';

  let emailResponse;
  try {
    emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `lusory-choice-report-${week.start}`,
      },
      body: JSON.stringify({
        from: process.env.REPORT_FROM_EMAIL || 'Lusory <onboarding@resend.dev>',
        to: [process.env.REPORT_TO_EMAIL],
        subject: `Lusory choices · week of ${week.start}`,
        html,
      }),
    });
  } catch (e) { return R.json(res, 503, { error: 'email unavailable' }); }
  if (!emailResponse.ok) return R.json(res, 503, { error: 'email rejected' });
  return R.json(res, 200, { ok: true, week: week.start, selections: total, first_selections: firstTotal });
};
