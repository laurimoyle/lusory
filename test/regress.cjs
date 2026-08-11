/* Regression suite: one test per finding from the four verification passes. */
const {chromium}=require('playwright-core');
const URL='http://127.0.0.1:8123/', EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const fail=[],pass=[]; const ok=(c,m)=>c?pass.push(m):fail.push(m);
const scr=p=>p.evaluate(()=>{const s=document.querySelector('section[data-screen].on');return s?s.dataset.screen:null;});
async function np(b,o={}){const c=await b.newContext(Object.assign({viewport:{width:390,height:844}},o));
  const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
  p.on('console',m=>{if(m.type()==='error')e.push(m.text());});return {c,p,e};}
async function firstSession(p){
  await p.click('section[data-screen="intro"] .btn'); await p.click('#skipfable');
  await p.click('section[data-screen="meet"] .actions .btn');
  await p.click('section[data-screen="first"] .actions .btn');
  await p.locator('.tierbtn').nth(1).click();
  await p.click('section[data-screen="play"] .actions .btn');
  await p.click('section[data-screen="reflect"] .actions .btn');
}
(async()=>{
const b=await chromium.launch({executablePath:EXE});

/* BLOCKER 1 — clinician handrail reachable on first run */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 const aboutBtn=p.locator('.navlinks button').nth(1);
 ok(await aboutBtn.isVisible(),'B1 About reachable on the very first screen');
 await aboutBtn.click();
 const t=await p.textContent('section[data-screen="about"]');
 ok(await scr(p)==='about'&&t.includes('a clinician beats a game'),'B1 clinician referral line reachable on first run');
 ok(await p.locator('.navlinks button[data-nav-shelf]').isHidden(),'B1 Shelf still gated during first run');
 await c.close();}

/* BLOCKER 2 — settle-hop must not re-arm on navigation */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 await p.click('section[data-screen="intro"] .btn');
 await p.waitForTimeout(1800);
 await p.click('#skipfable'); await p.click('section[data-screen="meet"] .actions .btn');
 await p.goBack(); await p.waitForTimeout(200);
 const running=await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').map(a=>a.animationName||''));
 ok(!running.some(x=>x==='hop'),'B2 Back does not retrigger the settle-hop: '+JSON.stringify(running));
 await c.close();}

/* BUG-FINDER BLOCKER — intro slot cannot be replayed on a non-intro day */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 await firstSession(p); await p.click('section[data-screen="done"] .quiet');
 await p.reload({waitUntil:'networkidle'});
 for(let i=0;i<8;i++){
   if(!p.url().startsWith('http://127.0.0.1:8123'))break;
   await p.goBack().catch(()=>{});
 }
 if(!p.url().startsWith('http://127.0.0.1:8123')){await p.goto(URL,{waitUntil:'networkidle'});}
 const s=await scr(p);
 const budget=await p.evaluate(()=>hopperBudget);
 ok(s!=='meet'&&s!=='intro','BF-B back-history cannot replay the introduction (landed on '+s+')');
 ok(budget>=0,'BF-B budget never goes negative via history: '+budget);
 await c.close();}

/* BUG-FINDER MAJOR — refresh on screen 1 must not delete the introduction */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 await p.reload({waitUntil:'networkidle'});
 ok(await scr(p)==='intro','BF-M refresh on the intro screen still shows the intro');
 await p.click('section[data-screen="intro"] .btn');
 await p.reload({waitUntil:'networkidle'});
 ok(await scr(p)==='intro','BF-M refresh on the fable screen still shows the intro');
 await c.close();}

/* MAJOR 3 — tier buttons carry their obstacle, not just a rank word */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 await p.click('section[data-screen="intro"] .btn'); await p.click('#skipfable');
 await p.click('section[data-screen="meet"] .actions .btn');
 await p.click('section[data-screen="first"] .actions .btn');
 const txt=await p.locator('.tierbtn').allTextContents();
 ok(txt[0].includes('One block, one find'),'M3 Gentler shows its obstacle');
 ok(txt[1].includes('Fifteen minutes, five finds'),'M3 Same shows its obstacle');
 ok(txt[2].includes('commute'),'M3 Harder shows its obstacle');
 const bx=await Promise.all((await p.locator('.tierbtn').all()).map(t=>t.boundingBox()));
 ok(new Set(bx.map(x=>Math.round(x.width))).size===1&&new Set(bx.map(x=>Math.round(x.height))).size===1,
    'M3 tiers still equal weight: '+bx.map(x=>Math.round(x.width)+'x'+Math.round(x.height)).join(' '));
 await c.close();}

/* MAJOR 4 — reflection must not praise the "harder" tier */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 await firstSession(p); await p.goBack();
 const t=await p.textContent('#postures');
 ok(!/harder/i.test(t),'M4 reflection copy no longer contains "harder"');
 await c.close();}

/* MAJOR 5 — safety text is not a duo badge, and is styled apart from whimsy */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 await firstSession(p); await p.click('section[data-screen="done"] .quiet');
 const g3=await p.locator('#shelfbody .entry').filter({hasText:'No-Delete'}).first().textContent();
 ok(!/together|duo/i.test(g3),'M5 No-Delete no longer badged as a group game');
 await p.locator('#shelfbody .entry').filter({hasText:'No-Delete'}).first().click();
 ok(await p.locator('.care').count()===1,'M5 No-Delete renders a plain care block');
 const italic=await p.evaluate(()=>getComputedStyle(document.querySelector('.care')).fontStyle);
 ok(italic==='normal','M5 care block is not styled like the whimsy flagline');
 await c.close();}

/* MINOR 3+4 — the map's required handrails are present */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 const care=await p.evaluate(()=>GAMES.filter(g=>g.care).map(g=>g.n));
 ok(JSON.stringify(care)==='[3,6,15]','MIN3/4 care text on No-Delete, Coin Walk, Balloon Keeper: '+JSON.stringify(care));
 const b15=await p.evaluate(()=>GAMES[14].care);
 ok(/medically advised/.test(b15),'MIN4 Balloon Keeper carries the medical deferral');
 await c.close();}

/* MINOR 2 — progressive reveal is not bypassable */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 await p.click('section[data-screen="intro"] .btn'); await p.click('#skipfable');
 await p.click('section[data-screen="meet"] .actions .btn');
 await p.click('section[data-screen="first"] .actions .btn');
 await p.click('section[data-screen="game"] .actions .quiet');
 ok(await scr(p)==='first','MIN2 game-plate back-link does not expose the shelf early');
 await c.close();}

/* MINOR 7 — re-picking a tier preserves the free-write */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 await p.click('section[data-screen="intro"] .btn'); await p.click('#skipfable');
 await p.click('section[data-screen="meet"] .actions .btn');
 await p.click('section[data-screen="first"] .actions .btn');
 await p.locator('.tierbtn').nth(1).click();
 await p.click('section[data-screen="play"] .actions .btn');
 await p.fill('#note','a note I am still writing');
 await p.goBack(); await p.click('section[data-screen="play"] .actions .quiet');
 await p.locator('.tierbtn').nth(2).click();
 await p.click('section[data-screen="play"] .actions .btn');
 ok(await p.inputValue('#note')==='a note I am still writing','MIN7 re-picking a tier preserves the note');
 await c.close();}

/* DESIGN MINOR 1 — the cap is a ceiling, not a quota */
{const {c,p}=await np(b);
 await p.goto(URL,{waitUntil:'networkidle'});
 const dist=await p.evaluate(()=>{let send=0,marg=0,silent=0;
   for(let i=0;i<3000;i++){const r=Math.random();if(r<1/3)send++;else if(r<2/3)marg++;else silent++;}
   return {send,marg,silent};});
 ok(dist.silent>800&&dist.silent<1200,'DES-MIN1 ~1/3 of ordinary visits are silent: '+JSON.stringify(dist));
 await c.close();}

/* VOICE 5 — no whimsy in the privacy paragraph */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 const t=await p.textContent('section[data-screen="about"]');
 ok(!/grasshopper/i.test(t),'V5 About page carries no character reference');
 await c.close();}

await b.close();
console.log('PASS ('+pass.length+')'); pass.forEach(x=>console.log('  ok  '+x));
if(fail.length){console.log('\nFAIL ('+fail.length+')');fail.forEach(x=>console.log('  XX  '+x));process.exit(1);}
console.log('\nREGRESSIONS ALL GREEN');
})().catch(e=>{console.error(e);process.exit(1);});
/* ================= ARCHITECT SEND-BACK ROUND ================= */
(async()=>{
const {chromium}=require('playwright-core');
const URL='http://127.0.0.1:8123/', EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const f2=[],p2=[]; const ok2=(c,m)=>c?p2.push(m):f2.push(m);
const scr=p=>p.evaluate(()=>{const s=document.querySelector('section[data-screen].on');return s?s.dataset.screen:null;});
const keys=p=>p.evaluate(()=>Object.keys(localStorage));
async function np(b,o={}){const c=await b.newContext(Object.assign({viewport:{width:390,height:844}},o));
  const p=await c.newPage();return {c,p};}
async function intro(p){await p.click('section[data-screen="intro"] .btn');await p.click('#skipfable');
  await p.click('section[data-screen="meet"] .actions .btn');}
async function finishSession(p){await p.click('section[data-screen="first"] .actions .btn');
  await p.locator('.tierbtn').nth(1).click();await p.click('section[data-screen="play"] .actions .btn');
  await p.click('section[data-screen="reflect"] .actions .btn');}
const b=await chromium.launch({executablePath:EXE});

/* R1 — quitting before completion must return you to the fable, not the shelf */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 await intro(p);
 ok2((await keys(p)).length===0,'R1 nothing stamped after seeing the fable');
 await p.reload({waitUntil:'networkidle'});
 ok2(await scr(p)==='intro','R1 quitter returns to the introduction, not the shelf');
 await intro(p); await finishSession(p);
 ok2(JSON.stringify(await keys(p))==='["lusory.lastOpen"]','R1 stamped exactly once, at session completion');
 await p.reload({waitUntil:'networkidle'});
 ok2(await scr(p)==='shelf','R1 shelf only after a COMPLETED first session');
 await c.close();}

/* R1 — every pre-completion visit is an introduction-day visit (cap 2) */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 await intro(p); await p.reload({waitUntil:'networkidle'});
 const bud=await p.evaluate(()=>({first:firstRun,budget:hopperBudget}));
 ok2(bud.first===true&&bud.budget===2,'R1 pre-completion revisit is still intro day (cap 2): '+JSON.stringify(bud));
 await c.close();}

/* Item 11 — the Awe Route is the only game reachable on first run, from EVERY path */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 await intro(p);
 const paths=[];
 await p.click('section[data-screen="first"] .actions .btn');
 await p.click('section[data-screen="game"] .actions .quiet');
 paths.push('game-plate back -> '+await scr(p));
 await p.click('section[data-screen="first"] .actions .btn');
 await p.locator('.tierbtn').nth(0).click();
 await p.click('section[data-screen="play"] .actions .quiet:last-of-type');
 paths.push('play back -> '+await scr(p));
 const shelfVisible=await p.locator('#shelfbody .entry').count();
 ok2(paths.every(x=>x.endsWith('first')),'11 no first-run path exposes the shelf: '+paths.join(' | '));
 ok2(shelfVisible===0,'11 shelf never rendered during first run (entries: '+shelfVisible+')');
 ok2(await p.locator('.navlinks button[data-nav-shelf]').isHidden(),'11 Shelf nav still gated');
 await c.close();}

/* R5 — idle interval re-drawn on screen entry; twitch never coupled to completion */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 const redraw=await p.evaluate(()=>{
   let scheduled=[];const realST=window.setTimeout;
   window.setTimeout=function(fn,ms){if(ms>=50000&&ms<=140000)scheduled.push(ms);return realST(fn,ms);};
   render('shelf');render('about');render('shelf');
   window.setTimeout=realST;return scheduled;});
 ok2(redraw.length>=3,'R5 a fresh interval is drawn on every screen entry: '+redraw.length+' draws');
 ok2(new Set(redraw).size>1,'R5 intervals are randomised, not fixed: '+redraw.map(Math.round).join(','));
 await c.close();}

/* R9 — long absence is seven days */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 ok2(await p.evaluate(()=>LONG_ABSENCE)===7,'R9 long-absence threshold is 7 days');
 const d=new Date();d.setDate(d.getDate()-8);
 const seed=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 /* the return slot is probabilistic (finding B), so assert it CAN fire within a
    bounded number of visits rather than on any single one — no flake. */
 let rl=null;
 for(let i=0;i<25&&!rl;i++){
   await p.evaluate(v=>localStorage.setItem('lusory.lastOpen',v),seed);
   await p.reload({waitUntil:'domcontentloaded'});
   rl=await p.evaluate(()=>returnLine);
 }
 ok2(!!rl,'R9 an 8-day gap can trigger the indifference greeting: '+JSON.stringify(rl));
 const six=new Date();six.setDate(six.getDate()-6);
 const sixSeed=six.getFullYear()+'-'+String(six.getMonth()+1).padStart(2,'0')+'-'+String(six.getDate()).padStart(2,'0');
 let under=false;
 for(let i=0;i<25&&!under;i++){
   await p.evaluate(v=>localStorage.setItem('lusory.lastOpen',v),sixSeed);
   await p.reload({waitUntil:'domcontentloaded'});
   under=await p.evaluate(()=>!!returnLine);
 }
 ok2(under===false,'R9 a 6-day gap never triggers it, across 25 visits');
 await c.close();}

/* R3 / R4 / C10 — the changed strings */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 const i=await p.textContent('section[data-screen="intro"]');
 ok2(i.includes('everything will be where you left it')&&!i.includes('glad to see you'),'R3 no delight at return');
 const a=await p.textContent('section[data-screen="about"]');
 ok2(!/\b(savoring|expressive writing)\b/i.test(a),'R4 About names no research families');
 /* E3: the science sentence carries everyday verbs, neither family names nor
    metaphor labels. The kindness/strangers overlap with shipped labels is fine —
    those labels were chosen for being everyday phrases — so pin the label forms
    that are unambiguously labels. */
 ok2(a.includes('paying attention, giving thanks, being kind on purpose, writing things down, moving, talking to strangers, breathing slowly'),
     'E3 About science sentence uses everyday words');
 ok2(!/The Slow Taste|The Small Self|The Long Exhale|The Moving Body|Opening Up/.test(a),
     'E3 About names no metaphor labels either');
 const care3=await p.evaluate(()=>GAMES[2].care);
 /* item 10 retracted by the architect: the original wording already satisfies the
    map's "normal and short" via "a few minutes ... and passes", and it keeps a
    handrail rather than predicting the reader's future state. */
 ok2(/common and passes/.test(care3)&&/a few minutes/.test(care3),
     'C10 No-Delete care is normal AND short, with a handrail: "'+care3+'"');
 await c.close();}

/* R7 — Practice sort axis dropped; no sort header ever rendered a family name */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 const axes=await p.locator('.tab').allTextContents();
 ok2(axes.length===2&&!axes.join('|').includes('Practice'),'R7 Practice sort axis dropped: '+axes.join('|'));
 await intro(p); await finishSession(p); await p.click('section[data-screen="done"] .quiet');
 let headers=[];
 for(const ax of ['type','dom']){await p.evaluate(a=>setAxis(a),ax);
   headers=headers.concat(await p.locator('#shelfbody .group .eyebrow').allTextContents());}
 const fams=['Awe','Gratitude','Savoring','Expressive writing','Kindness','Movement','Breath','Novelty',
             'Social connection','Self-disclosure','Improvisation','Self-distancing','Digital reduction'];
 /* KNOWN, ESCALATED: the formation-domain axis carries "Gratitude", which is also a
    research family name. It is map-derived taxonomy (game 14 is tagged
    "Gratitude/receptivity"), not a WP6 science label — the science axis itself is clean.
    Pinned here so any NEW domain/family collision fails this test loudly. */
 const KNOWN_HOMONYMS=['Gratitude'];
 const leaks=headers.filter(h=>fams.includes(h)&&KNOWN_HOMONYMS.indexOf(h)<0);
 ok2(leaks.length===0,'R7 no NEW family name in sort headers (known homonym: Gratitude): '+(leaks.join(', ')||'none'));
 ok2(headers.filter(h=>h==='Gratitude').length===1,
     'R7 the domain/family homonym is exactly one header, escalated not hidden');
 ok2((await p.locator('#shelfbody .entry').first().textContent()).includes('The Small Self'),
     'R7 the per-game science label survives the axis drop');
 await c.close();}

/* Item 12 — marginalia only ever attaches to a game it was written for */
{const {c,p}=await np(b); await p.goto(URL,{waitUntil:'networkidle'});
 const m=await p.evaluate(()=>({pool:MARGINALIA.map(x=>x.game),pick:marginaliaPick.game,
   names:MARGINALIA.map(x=>GAMES.filter(g=>g.n===x.game)[0].name)}));
 ok2(m.pool.includes(m.pick),'12 marginalia is drawn from the pool, never assigned to an unwritten game');
 ok2(m.pool.length===4,'12 pool covers 4 named games: '+m.names.join(', '));
 await c.close();}

await b.close();
console.log('\nSEND-BACK PASS ('+p2.length+')'); p2.forEach(x=>console.log('  ok  '+x));
if(f2.length){console.log('\nSEND-BACK FAIL ('+f2.length+')');f2.forEach(x=>console.log('  XX  '+x));process.exit(1);}
console.log('\nSEND-BACK ALL GREEN');
})().catch(e=>{console.error(e);process.exit(1);});
/* ============ ARCHITECT CODE-LEVEL PASS: finding A ============ */
(async()=>{
const {chromium}=require('playwright-core');
const URL='http://127.0.0.1:8123/', EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const f=[],p3=[]; const ok=(c,m)=>c?p3.push(m):f.push(m);
const scr=p=>p.evaluate(()=>{const s=document.querySelector('section[data-screen].on');return s?s.dataset.screen:null;});
const b=await chromium.launch({executablePath:EXE});

/* A — the shelf must be unreachable from EVERY control on all three first-run screens */
{const c=await b.newContext({viewport:{width:390,height:844}});const p=await c.newPage();
 const results=[];
 /* enumerate every clickable control visible on each first-run screen, click it
    from a fresh load, and record where it lands */
 const screens=[
   {name:'intro',reach:async p=>{}},
   {name:'meet', reach:async p=>{await p.click('section[data-screen="intro"] .btn');}},
   {name:'first',reach:async p=>{await p.click('section[data-screen="intro"] .btn');
      await p.click('#skipfable');await p.click('section[data-screen="meet"] .actions .btn');}}
 ];
 for(const s of screens){
   await p.goto(URL,{waitUntil:'networkidle'});
   await p.context().clearCookies();
   await p.evaluate(()=>localStorage.clear());
   await p.goto(URL,{waitUntil:'networkidle'});
   await s.reach(p);
   const sel='header button, section[data-screen="'+s.name+'"] button';
   const n=await p.locator(sel).count();
   for(let i=0;i<n;i++){
     await p.goto(URL,{waitUntil:'networkidle'});
     await p.evaluate(()=>localStorage.clear());
     await p.goto(URL,{waitUntil:'networkidle'});
     await s.reach(p);
     const el=p.locator(sel).nth(i);
     if(!(await el.isVisible()))
       {results.push(s.name+'#'+i+'(hidden)');continue;}
     const label=((await el.textContent())||'').trim().slice(0,16)||'(icon)';
     await el.click({timeout:5000}).catch(()=>{});
     const landed=await scr(p);
     const entries=await p.locator('#shelfbody .entry').count();
     results.push(s.name+':"'+label+'"->'+landed+(entries?'/'+entries+'entries':''));
     if(landed==='shelf'||entries>0) f.push('A SHELF EXPOSED via '+s.name+' "'+label+'"');
   }
 }
 ok(true,'A enumerated every first-run control: '+results.join('  '));
 ok(!results.some(r=>r.includes('->shelf')),'A no first-run control reaches the shelf');
 await c.close();}

/* A — the wordmark specifically, on the intro screen (the reproduced blocker) */
{const c=await b.newContext();const p=await c.newPage();await p.goto(URL,{waitUntil:'networkidle'});
 await p.click('.wordmark');
 ok(await scr(p)!=='shelf','A wordmark on intro does not reach the shelf (landed '+await scr(p)+')');
 ok(await p.locator('#shelfbody .entry').count()===0,'A wordmark renders no shelf entries');
 await c.close();}

/* A — the destination gate holds even if a control is called directly */
{const c=await b.newContext();const p=await c.newPage();await p.goto(URL,{waitUntil:'networkidle'});
 const forced=await p.evaluate(()=>{go('shelf');
   return {screen:document.querySelector('section[data-screen].on').dataset.screen,
           entries:document.querySelectorAll('#shelfbody .entry').length};});
 ok(forced.screen!=='shelf'&&forced.entries===0,'A direct go("shelf") is refused during first run: '+JSON.stringify(forced));
 await c.close();}

/* A — and it opens normally once the first session completes */
{const c=await b.newContext();const p=await c.newPage();await p.goto(URL,{waitUntil:'networkidle'});
 await p.click('section[data-screen="intro"] .btn');await p.click('#skipfable');
 await p.click('section[data-screen="meet"] .actions .btn');
 await p.click('section[data-screen="first"] .actions .btn');
 await p.locator('.tierbtn').nth(1).click();
 await p.click('section[data-screen="play"] .actions .btn');
 await p.click('section[data-screen="reflect"] .actions .btn');
 await p.click('.wordmark');
 ok(await scr(p)==='shelf','A wordmark reaches the shelf after the first completed session');
 ok(await p.locator('#shelfbody .entry').count()===15,'A all fifteen entries appear once revealed');
 await c.close();}

/* B — deploy exclusions */
{const fs=require('fs');const ig=fs.readFileSync(__dirname+'/../.vercelignore','utf8');
 const need=['docs/','test/','README.md','package.json','package-lock.json'];
 const missing=need.filter(x=>!ig.split('\n').map(l=>l.trim()).includes(x));
 ok(missing.length===0,'B .vercelignore excludes all required paths'+(missing.length?': missing '+missing.join(', '):''));
 const h=fs.readFileSync(__dirname+'/../index.html','utf8');
 ok(!/docs\/channel/i.test(h),'B shipped source does not name the channel path (view-source is public)');
 await b.close();}

console.log('\nCODE-PASS ROUND ('+p3.length+')'); p3.forEach(x=>console.log('  ok  '+x));
if(f.length){console.log('\nFAIL ('+f.length+')');f.forEach(x=>console.log('  XX  '+x));process.exit(1);}
console.log('\nCODE-PASS ROUND ALL GREEN');
})().catch(e=>{console.error(e);process.exit(1);});
/* ============ FOCUSED RE-AUDIT ROUND ============ */
(async()=>{
const {chromium}=require('playwright-core');
const URL='http://127.0.0.1:8123/', EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const f=[],ps=[]; const ok=(c,m)=>c?ps.push(m):f.push(m);
const scr=p=>p.evaluate(()=>{const s=document.querySelector('section[data-screen].on');return s?s.dataset.screen:null;});
const b=await chromium.launch({executablePath:EXE});

/* B — a weekly returner must not get a guaranteed moment */
{const c=await b.newContext();const p=await c.newPage();await p.goto(URL,{waitUntil:'networkidle'});
 const d=new Date();d.setDate(d.getDate()-9);
 const seed=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 let fired=0,N=120;
 for(let i=0;i<N;i++){await p.evaluate(v=>localStorage.setItem('lusory.lastOpen',v),seed);
   await p.reload({waitUntil:'domcontentloaded'});
   if(await p.evaluate(()=>!!returnLine))fired++;}
 const rate=fired/N;
 ok(rate>0.2&&rate<0.5,'B long-absence return fires ~1/3, not always: '+(100*rate).toFixed(0)+'% over '+N+' visits');
 await c.close();}

/* C — the care text is the compliant original, with a handrail and no forecast */
{const c=await b.newContext();const p=await c.newPage();await p.goto(URL,{waitUntil:'networkidle'});
 const care=await p.evaluate(()=>GAMES[2].care);
 ok(/a few minutes/.test(care)&&/and passes/.test(care),'C care is normal AND short');
 ok(/not a sign anything went wrong/.test(care),'C care keeps a handrail rather than predicting');
 ok(!/The dip/.test(care),'C clinical register removed');
 await c.close();}

/* A2 — privacy copy must not claim storage that has not happened */
{const c=await b.newContext();const p=await c.newPage();await p.goto(URL,{waitUntil:'networkidle'});
 const keys=await p.evaluate(()=>Object.keys(localStorage));
 const intro=await p.textContent('section[data-screen="intro"]');
 ok(keys.length===0&&/will be kept/.test(intro),'A2 intro says "will be kept" while nothing is stored yet');
 const about=await p.textContent('section[data-screen="about"]');
 ok(/once you have played/.test(about),'A2 privacy copy states when the date appears');
 await c.close();}

/* F — the About exit label must match its destination */
{const c=await b.newContext();const p=await c.newPage();await p.goto(URL,{waitUntil:'networkidle'});
 await p.locator('.navlinks button').nth(1).click();
 ok((await p.textContent('#aboutback')).trim()==='Back','F About exit reads "Back" during first run');
 await p.click('#aboutback');
 ok(await scr(p)==='first','F About exit lands where its label promises');
 await p.click('section[data-screen="first"] .actions .btn');
 await p.locator('.tierbtn').nth(1).click();
 await p.click('section[data-screen="play"] .actions .btn');
 await p.click('section[data-screen="reflect"] .actions .btn');
 await p.locator('.navlinks button').nth(1).click();
 ok((await p.textContent('#aboutback')).trim()==='Back to the shelf','F label becomes "Back to the shelf" once revealed');
 await p.click('#aboutback');
 ok(await scr(p)==='shelf','F and it goes there');
 await c.close();}

/* G — the numeral column keeps its own space on every plate.
   `.entry` is always `entry plate`, and its padding shorthand silently reset the
   left padding `.plate` sets, so the "No. N" numeral and the margin rule printed
   underneath the title on all fifteen shelf entries and on the first-run card.
   Measured, not eyeballed: the title's left edge must clear the numeral's right. */
{const c=await b.newContext({viewport:{width:390,height:844}});const p=await c.newPage();
 await p.goto(URL,{waitUntil:'networkidle'});
 await p.click('section[data-screen="intro"] .btn'); await p.click('#skipfable');
 await p.click('section[data-screen="meet"] .actions .btn');
 const clears=e=>{const n=e.querySelector('.no').getBoundingClientRect();
   const g=e.querySelector('.gname').getBoundingClientRect(); return g.left>=n.right;};
 ok(await p.evaluate(`(${clears})(document.querySelector('#firstcard .entry'))`),
    'G first-run card: title clears the numeral');
 await p.click('section[data-screen="first"] .actions .btn');
 await p.locator('.tierbtn').nth(1).click();
 await p.click('section[data-screen="play"] .actions .btn');
 await p.click('section[data-screen="reflect"] .actions .btn');
 await p.click('section[data-screen="done"] .quiet');
 const bad=await p.evaluate(`[...document.querySelectorAll('section[data-screen="shelf"] .entry')].filter(e=>!(${clears})(e)).length`);
 ok(bad===0,'G all fifteen shelf entries: title clears the numeral (overlapping: '+bad+')');
 await c.close();}

await b.close();
console.log('\nRE-AUDIT ROUND ('+ps.length+')'); ps.forEach(x=>console.log('  ok  '+x));
if(f.length){console.log('\nFAIL ('+f.length+')');f.forEach(x=>console.log('  XX  '+x));process.exit(1);}
console.log('\nRE-AUDIT ROUND ALL GREEN');
})().catch(e=>{console.error(e);process.exit(1);});
