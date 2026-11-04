'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(html, /data-screen="beta"/);
assert.match(html, /name="email"[^>]*required/);
assert.match(html, /name="source"[^>]*required/);
assert.match(html, /name="consent"[^>]*required/);
assert.match(html, /cohort:"beta"/);
assert.match(html, /context:"beta_gate"/);
assert.match(html, /var startScreen=betaBlocked\(\)\?"beta"/);
assert.match(html, /if\(betaBlocked\(\)&&screen!=="beta"&&screen!=="about"\)screen="beta"/);

// The testimonial invite lives on About during the beta, never on the done screen.
assert.ok(!/testimonialPrompted/.test(html), 'testimonial invite must not be pushed on the done screen');
const done = html.slice(html.indexOf('<section data-screen="done">'), html.indexOf('</section>', html.indexOf('<section data-screen="done">')));
assert.ok(!/betatestimonial/.test(done), 'testimonial card must not sit on the done screen');
const about = html.slice(html.indexOf('<section data-screen="about"'), html.indexOf('</section>', html.indexOf('<section data-screen="about"')));
assert.match(about, /id="betatestimonial" hidden/);
assert.match(html, /tc\.hidden=!\(BETA_GATED&&!betaBlocked\(\)&&!\(firstRun&&!sessionDone\)\)/);
assert.match(html, /data\.get\("public_consent"\)==="on"/);
assert.match(html, /document\.getElementById\("betatestimonial"\)\.hidden=true/);

const meet = html.slice(html.indexOf('function enterMeet(){'), html.indexOf('function beginIntro(){'));
assert.ok(meet.length > 0, 'enterMeet implementation was not found');
assert.match(meet, /if\(!replayingIntro&&!meetSpent&&hopperBudget>0\)/);
assert.match(meet, /if\(marg\)marg\.style\.display=!replayingIntro&&meetSpent\?"":"none"/);

assert.match(html, /if\(testMode&&!betaBlocked\(\)\)document\.getElementById\("testbar"\)\.hidden=false/);

// R41: the gate follows the hostname. beta.* and vercel.app are gated; app.* and localhost are open.
const gh = html.match(/function gatedHost\(h\)\{(.*)\}\nvar BETA_GATED/);
assert.ok(gh, 'gatedHost not found');
const gatedHost = new Function('h', gh[1]);
for (const h of ['beta.lusoryplay.com', 'lusory-pied.vercel.app', 'lusory-pied.vercel.app.', 'lusory-abc123-lauri-moyle-s-projects.vercel.app']) assert.strictEqual(gatedHost(h), true, h + ' should be gated');
for (const h of ['app.lusoryplay.com', 'lusoryplay.com', 'localhost', '127.0.0.1', 'notbeta.example.com']) assert.strictEqual(gatedHost(h), false, h + ' should be open');
assert.match(html, /var BETA_GATED=gatedHost\(window\.location\.hostname\);/);

console.log('beta gate tests: all green');
