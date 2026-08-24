'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

function block(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `${start} implementation was not found`);
  return html.slice(from, to);
}

const choice = block('function recordChoice(', 'function chooseGame(');
assert.match(choice, /fetch\("\/api\/choice"/);
assert.match(choice, /source:source,first:isFirst/);

const beta = block('function submitBeta(', 'function submitJoin(');
assert.doesNotMatch(beta, /Promise\.all/);
assert.match(beta, /postJSON\("\/api\/intake"/);
assert.match(beta, /request_token:intakeToken\("beta_gate"\)/);
assert.match(beta, /cohort:"beta"/);
assert.match(beta, /source:data\.get\("source"\)/);
assert.match(beta, /context:"beta_gate"/);
assert.match(beta, /clearIntakeToken\("beta_gate"\)/);

const join = block('function submitJoin(', 'function openUsability(');
assert.doesNotMatch(join, /Promise\.all/);
assert.match(join, /postJSON\("\/api\/intake"/);
assert.match(join, /request_token:intakeToken\("signup"\)/);
assert.match(join, /cohort:"updates"/);
assert.match(join, /source:data\.get\("source"\)/);
assert.match(join, /context:"signup"/);
assert.match(join, /clearIntakeToken\("signup"\)/);

assert.match(html, /sessionStorage\.getItem\(key\)/);
assert.match(html, /sessionStorage\.removeItem\(key\)/);
assert.doesNotMatch(html, /postJSON\("\/api\/(?:subscribe|referral)"/);

const usability = block('function submitUsability(', 'function openTestimonial(');
assert.match(usability, /postJSON\("\/api\/usability"/);
assert.match(usability, /website:data\.get\("website"\)\|\|""/);

const testimonial = block('function submitTestimonial(', 'function renderShelf(');
assert.match(testimonial, /postJSON\("\/api\/testimonial"/);
assert.match(testimonial, /website:data\.get\("website"\)\|\|""/);

assert.doesNotMatch(html, /formspree/i);
assert.doesNotMatch(html, /postFormspree/);
assert.doesNotMatch(html, /http-equiv="Content-Security-Policy"/i);

const rootHeaders = vercel.headers.find(entry => entry.source === '/(.*)');
assert.ok(rootHeaders, 'root security headers were not found');
const cspHeader = rootHeaders.headers.find(header => header.key === 'Content-Security-Policy');
assert.ok(cspHeader, 'Content-Security-Policy header was not found');
assert.match(cspHeader.value, /default-src 'self'/);
assert.match(cspHeader.value, /connect-src 'self'/);
assert.match(cspHeader.value, /form-action 'none'/);
assert.doesNotMatch(cspHeader.value, /formspree|connect-src \*|script-src \*/i);

console.log('frontend data-path tests: all green');
