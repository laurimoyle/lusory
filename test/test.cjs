const {chromium}=require('playwright-core');
const URL='http://127.0.0.1:8123/';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const fail=[],pass=[];
const ok=(c,m)=>c?pass.push(m):fail.push(m);

async function newPage(browser,opts={}){
  const ctx=await browser.newContext(Object.assign({viewport:{width:390,height:844}},opts));
  const page=await ctx.newPage();
  const errs=[];
  page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  page.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  page.on('request',r=>{ if(!r.url().startsWith('http://127.0.0.1:8123'))errs.push('EXTERNAL REQUEST '+r.url()); });
  return {ctx,page,errs};
}
const screen=p=>p.evaluate(()=>{const s=document.querySelector('section[data-screen].on');return s?s.dataset.screen:null;});
const keys=p=>p.evaluate(()=>Object.keys(localStorage));

(async()=>{
const browser=await chromium.launch({executablePath:EXE});

/* ---------- 1. FIRST RUN ---------- */
let {ctx,page,errs}=await newPage(browser);
await page.goto(URL,{waitUntil:'networkidle'});
ok(await screen(page)==='intro','WP1 first run lands on intro');
ok(await page.locator('.navlinks button[data-nav-shelf]').isHidden(),'WP1 Shelf gated during first run');
ok(await page.locator('.navlinks button').nth(1).isVisible(),'WP1 About stays reachable (safety is not progressively revealed)');
const k=await keys(page);
ok(k.length===0,'WP4 nothing written at first load: '+JSON.stringify(k));

await page.click('section[data-screen="intro"] .btn');
ok(await screen(page)==='meet','WP2 intro -> meet');
const fableSpec=await page.evaluate(()=>({
 scenes:document.querySelectorAll('#fablestage .scene').length,
 beats:FABLE.map(x=>x.beat||''),
 captions:FABLE.map(x=>x.cap).join(' '),
 duration:FABLE.reduce((n,x)=>n+x.dur,0),
 fallback:document.getElementById('fabletext').textContent
}));
ok(fableSpec.scenes===4,'WP2 fable uses four seasonal drawings');
ok(fableSpec.beats.includes('closing')&&fableSpec.beats.includes('song'),'WP2 door-close and returning-song beats are explicit');
ok(/Spring returned/.test(fableSpec.captions)&&/sang again/.test(fableSpec.captions),'WP2 animated telling continues through spring and summer');
ok(/Spring returned/.test(fableSpec.fallback)&&/sang again/.test(fableSpec.fallback),'WP2 text fallback carries the same continued ending');
ok(fableSpec.duration<=18000,'WP2 full telling stays brisk ('+fableSpec.duration+'ms)');
await page.click('#skipfable');
await page.click('section[data-screen="meet"] .actions .btn');
ok(await screen(page)==='first','WP2 meet -> first');

const shelfLinksOnFirst=await page.locator('section[data-screen="first"] .quiet').count();
ok(shelfLinksOnFirst===0,'WP1 no shelf escape on first-run game offer');
const firstCard=await page.locator('#firstcard .gname').textContent();
ok(firstCard==='The Awe Route','WP1 Awe Route is the only game offered ('+firstCard+')');

await page.click('section[data-screen="first"] .actions .btn');
ok(await screen(page)==='game','WP2 first -> game');
const k1=await keys(page);
ok(k1.length===0,'WP4 R1: nothing written until the first session completes: '+JSON.stringify(k1));

/* ---------- 2. WP3 SYMMETRY ---------- */
const tiers=await page.locator('.tierbtn').all();
const boxes=await Promise.all(tiers.map(t=>t.boundingBox()));
const labels=await page.locator('.tierbtn .tname').allTextContents();
ok(labels.join('|')==='Gentler|Same|Harder','WP3 three symmetric options: '+labels.join('|'));
const descs=await page.locator('.tierbtn .tdesc').allTextContents();
ok(descs.every(d=>d.trim().length>0),'WP3 each option shows its obstacle, not just a rank word');
const w=boxes.map(b=>Math.round(b.width)), h=boxes.map(b=>Math.round(b.height));
ok(new Set(w).size===1&&new Set(h).size===1,'WP3 equal visual weight w='+w+' h='+h);
const preselected=await page.evaluate(()=>[...document.querySelectorAll('.tierbtn')]
  .filter(b=>b.getAttribute('aria-pressed')==='true'||b.classList.contains('sel')).length);
ok(preselected===0,'WP3 nothing preselected');
ok(h.every(x=>x>=44),'WP7 tier tap targets >=44px: '+h);

/* ---------- 3. LOOP + GRASSHOPPER ABSENCE ---------- */
await tiers[2].click();
ok(await screen(page)==='play','WP2 tier -> play');
ok(await page.locator('section[data-screen="play"] .mark').count()===0,'WP5 zero marks on play');
ok((await page.locator('.playcard').textContent()).includes('Harder'),'WP2 chosen tier carried into play');

await page.click('section[data-screen="play"] .actions .btn');
ok(await screen(page)==='reflect','WP2 play -> reflect');
ok(await page.locator('section[data-screen="reflect"] .mark').count()===0,'WP5 zero marks on reflect');
ok(await page.locator('.posture').count()===4,'WP2 four postures');

await page.locator('.posture').nth(3).click();
await page.fill('#note','x'.repeat(20000));
await page.click('section[data-screen="reflect"] .actions .btn');
ok(await screen(page)==='done','WP2 reflect -> done (20k char note)');
ok(await page.locator('#copybtn').isVisible(),'WP4 copy button appears with a note');

const k2=await keys(page);
ok(k2.length===1,'WP4 still one key after full loop: '+JSON.stringify(k2));
const budget=await page.evaluate(()=>({left:hopperBudget,first:firstRun}));
ok(budget.left>=0,'WP5 budget never negative: '+budget.left);
const introDayMoments=2-budget.left;
ok(introDayMoments<=2,'WP5 intro day spent <=2 moments (spent '+introDayMoments+')');
ok(await page.locator('section[data-screen="done"] .marg').count()===0,
   'WP5 no sendoff on introduction day (plan: intro + marginalia only)');

await page.click('section[data-screen="done"] .quiet');
ok(await screen(page)==='shelf','WP2 done -> shelf');
ok(await page.locator('.navlinks').isVisible(),'WP1 shelf reachable + nav revealed after first session');
ok(await page.locator('#shelfbody .entry').count()===15,'WP2 fifteen games on the shelf');
const margCount=await page.locator('#shelfbody .marg, #returnnote .marg').count();
ok(margCount<=1,'WP5 at most one marginalia note per visit: '+margCount);

/* ---------- 4. BACK BUTTON ---------- */
await page.goBack(); ok(await screen(page)==='done','WP2 back: shelf -> done');
await page.goBack(); ok(await screen(page)==='reflect','WP2 back: done -> reflect');
const noteKept=await page.inputValue('#note');
ok(noteKept.length===20000,'WP2 back-nav does not destroy the free-write');
await page.goForward(); await page.goForward();
ok(await screen(page)==='shelf','WP2 forward returns to shelf, no trap');

ok(errs.length===0,'no console/page errors + no external requests: '+errs.slice(0,3).join(' | '));

/* ---------- 5. SECOND VISIT ---------- */
await page.reload({waitUntil:'networkidle'});
ok(await screen(page)==='shelf','WP1 returning visitor lands on shelf');
ok(await page.evaluate(()=>hopperBudget<=1),'WP5 ordinary visit budget starts at 1');
await ctx.close();

/* ---------- 6. MID-SESSION REFRESH ---------- */
let s2=await newPage(browser); 
await s2.page.goto(URL,{waitUntil:'networkidle'});
await s2.page.click('section[data-screen="intro"] .btn');
await s2.page.click('#skipfable');
await s2.page.reload({waitUntil:'networkidle'});
ok(await screen(s2.page)==='intro','WP2 refresh during first run preserves the introduction');
await s2.ctx.close();

/* ---------- 7. STORAGE CLEARED MID-SESSION ---------- */
let s3=await newPage(browser);
await s3.page.goto(URL,{waitUntil:'networkidle'});
await s3.page.click('section[data-screen="intro"] .btn');
await s3.page.evaluate(()=>localStorage.clear());
await s3.page.click('#skipfable');
await s3.page.click('section[data-screen="meet"] .actions .btn');
await s3.page.click('section[data-screen="first"] .actions .btn');
await s3.page.locator('.tierbtn').first().click();
ok(await screen(s3.page)==='play','WP2 survives localStorage cleared mid-session');
ok(s3.errs.length===0,'no errors after storage cleared: '+s3.errs.slice(0,2).join(' | '));
await s3.ctx.close();

/* ---------- 8. REDUCED MOTION ---------- */
let s4=await newPage(browser,{reducedMotion:'reduce'});
await s4.page.goto(URL,{waitUntil:'networkidle'});
await s4.page.click('section[data-screen="intro"] .btn');
ok(await s4.page.locator('#fabletext').isVisible(),'WP2 reduced-motion shows the complete text fallback');
ok(await s4.page.locator('#fablestage').isHidden(),'WP5 reduced-motion hides the animated telling');
const anims=await s4.page.evaluate(()=>[...document.querySelectorAll('*')]
  .filter(e=>getComputedStyle(e).animationName!=='none').length);
ok(anims===0,'WP5 zero running animations under reduced motion: '+anims);
await s4.ctx.close();

/* ---------- 9. PHONE WIDTHS ---------- */
for(const width of [360,390,430,820]){
  let s=await newPage(browser,{viewport:{width,height:844}});
  await s.page.goto(URL,{waitUntil:'networkidle'});
  await s.page.click('section[data-screen="intro"] .btn');
  await s.page.click('#skipfable');
  await s.page.click('section[data-screen="meet"] .actions .btn');
  await s.page.click('section[data-screen="first"] .actions .btn');
  await s.page.locator('.tierbtn').first().click();
  await s.page.click('section[data-screen="play"] .actions .btn');
  await s.page.click('section[data-screen="reflect"] .actions .btn');
  await s.page.click('section[data-screen="done"] .quiet');
  const over=await s.page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ok(over<=0,'WP7 no horizontal overflow at '+width+'px (overflow '+over+'px)');
  const small=await s.page.evaluate(()=>[...document.querySelectorAll('section.on button, header button:not([style*="hidden"])')]
    .filter(b=>b.offsetParent!==null).map(b=>({t:(b.textContent||'').trim().slice(0,22),h:Math.round(b.getBoundingClientRect().height)}))
    .filter(x=>x.h<44));
  ok(small.length===0,'WP7 all tap targets >=44px at '+width+'px'+(small.length?': '+JSON.stringify(small):''));
  await s.ctx.close();
}

await browser.close();
console.log('\nPASS ('+pass.length+')'); pass.forEach(p=>console.log('  ok  '+p));
if(fail.length){console.log('\nFAIL ('+fail.length+')');fail.forEach(f=>console.log('  XX  '+f));process.exit(1);}
console.log('\nALL GREEN');
})().catch(e=>{console.error(e);process.exit(1);});
