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

assert.match(html, /var invite=BETA_GATED&&firstRun&&!testimonialPrompted/);
assert.match(html, /data\.get\("public_consent"\)==="on"/);
assert.match(html, /document\.getElementById\("betatestimonial"\)\.hidden=true/);

const meet = html.slice(html.indexOf('function enterMeet(){'), html.indexOf('function beginIntro(){'));
assert.ok(meet.length > 0, 'enterMeet implementation was not found');
assert.match(meet, /if\(!replayingIntro&&!meetSpent&&hopperBudget>0\)/);
assert.match(meet, /if\(marg\)marg\.style\.display=!replayingIntro&&meetSpent\?"":"none"/);

assert.match(html, /if\(testMode&&!betaBlocked\(\)\)document\.getElementById\("testbar"\)\.hidden=false/);

console.log('beta gate tests: all green');
