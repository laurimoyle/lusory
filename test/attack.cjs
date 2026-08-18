const {chromium}=require('playwright-core');
const URL='http://127.0.0.1:8123/';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const out=[];
const say=(t,m)=>{out.push((t?'PASS  ':'FAIL  ')+m);console.log((t?'PASS  ':'FAIL  ')+m);};
const info=m=>{out.push('info  '+m);console.log('info  '+m);};

async function newPage(browser,opts={}){
  const ctx=await browser.newContext(Object.assign({viewport:{width:390,height:844}},opts));
  const page=await ctx.newPage();
  const errs=[];
  page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  page.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  page.on('dialog',async d=>{errs.push('DIALOG '+d.message());await d.dismiss();});
  return {ctx,page,errs};
}
const screen=p=>p.evaluate(()=>{const s=document.querySelector('section[data-screen].on');return s?s.dataset.screen:null;});
// a "moment" = visible grasshopper-signed text on the current screen
const moments=p=>p.evaluate(()=>{
  const on=document.querySelector('section[data-screen].on'); if(!on) return 0;
  let n=on.querySelectorAll('.marg').length;
  if(on.dataset.screen==='meet') n+=1; // static intro line is always rendered on meet
  return n;
});

(async()=>{
const browser=await chromium.launch({executablePath:EXE});

/* ===== A1: budget attack — returning visit, back-nav into the intro slot ===== */
{
 let {ctx,page,errs}=await newPage(browser);
 await page.goto(URL,{waitUntil:'networkidle'});
 // full first session
 await page.click('section[data-screen="intro"] .btn');
 await page.click('#skipfable');
 await page.click('section[data-screen="meet"] .actions .btn');
 await page.locator('#firstcards .entry').first().click();
 await page.locator('.tierbtn').nth(1).click();
 await page.click('section[data-screen="play"] .actions .btn');
 await page.click('section[data-screen="reflect"] .actions .btn');
 await page.click('section[data-screen="done"] .quiet');
 // now simulate the *next* visit in the same tab: set yesterday, reload
 await page.evaluate(()=>localStorage.setItem('lusory.lastOpen','2020-01-02'));
 await page.reload({waitUntil:'networkidle'});
 const st=await page.evaluate(()=>({first:firstRun,budget:hopperBudget,marg:allowMarginalia,ret:!!returnLine,send:!!sendoffLine}));
 info('returning visit state '+JSON.stringify(st));
 let spent=await moments(page);
 info('moments visible on landing shelf: '+spent);
 // walk backwards to the meet screen
 let hops=0, reachedMeet=false;
 while(hops++<10){
   await page.goBack(); await page.waitForTimeout(60);
   if(await screen(page)==='meet'){reachedMeet=true;break;}
 }
 if(reachedMeet){
   const b=await page.evaluate(()=>hopperBudget);
   const m2=await moments(page);
   info('after back-nav to meet: hopperBudget='+b+' moments on meet='+m2);
   say(b>=0,'A1 budget never goes negative on a returning visit (got '+b+')');
   say(!(spent>0&&m2>0),'A1 max ONE grasshopper moment on a non-introduction day (shelf='+spent+', meet='+m2+')');
 } else { info('A1 could not reach meet by back-nav'); }
 say(errs.length===0,'A1 no console errors: '+errs.slice(0,2).join(' | '));
 await ctx.close();
}

/* ===== A2: 10 play-throughs in ONE page load ===== */
{
 let {ctx,page,errs}=await newPage(browser);
 await page.goto(URL,{waitUntil:'networkidle'});
 await page.click('section[data-screen="intro"] .btn');
 await page.click('#skipfable');
 await page.click('section[data-screen="meet"] .actions .btn');
 await page.locator('#firstcards .entry').first().click();
 await page.locator('.tierbtn').nth(0).click();
 await page.click('section[data-screen="play"] .actions .btn');
 await page.click('section[data-screen="reflect"] .actions .btn');
 let total=await moments(page); // done screen
 await page.click('section[data-screen="done"] .quiet');
 total+=await moments(page);   // shelf
 for(let i=0;i<10;i++){
   await page.locator('#shelfbody .entry').nth(i%15).click();
   await page.locator('.tierbtn').nth(i%3).click();
   await page.click('section[data-screen="play"] .actions .btn');
   await page.click('section[data-screen="reflect"] .actions .btn');
   total+=await moments(page);
   await page.click('section[data-screen="done"] .quiet');
   total+=await moments(page);
 }
 const b=await page.evaluate(()=>hopperBudget);
 info('A2 after 11 play-throughs: budget='+b);
 say(b>=0,'A2 budget not negative after 10 replays (got '+b+')');
 say(errs.length===0,'A2 no errors in 10 replays');
 await ctx.close();
}

/* ===== A3: localStorage.setItem throws before load ===== */
{
 let {ctx,page,errs}=await newPage(browser);
 await ctx.addInitScript(()=>{
   Storage.prototype.setItem=function(){throw new Error('QuotaExceededError');};
 });
 await page.goto(URL,{waitUntil:'networkidle'});
 say(await screen(page)==='intro','A3 boots with setItem throwing');
 await page.click('section[data-screen="intro"] .btn');
 await page.click('#skipfable');
 await page.click('section[data-screen="meet"] .actions .btn');
 await page.locator('#firstcards .entry').first().click();
 await page.locator('.tierbtn').nth(0).click();
 await page.click('section[data-screen="play"] .actions .btn');
 await page.click('section[data-screen="reflect"] .actions .btn');
 say(await screen(page)==='done','A3 full loop completes with setItem throwing');
 await page.reload({waitUntil:'networkidle'});
 const s=await screen(page);
 info('A3 after reload with broken storage, lands on: '+s);
 say(errs.length===0,'A3 no errors with setItem throwing: '+errs.slice(0,2).join(' | '));
 await ctx.close();
}

/* ===== A3b: whole localStorage getter throws ===== */
{
 let {ctx,page,errs}=await newPage(browser);
 await ctx.addInitScript(()=>{
   Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked');}});
 });
 await page.goto(URL,{waitUntil:'networkidle'});
 say(await screen(page)!==null,'A3b boots when window.localStorage itself throws (screen='+await screen(page)+')');
 say(errs.length===0,'A3b no errors when localStorage getter throws: '+errs.slice(0,2).join(' | '));
 await ctx.close();
}

/* ===== A4: garbage / hostile seeds ===== */
const seeds=['null','','not-a-date','2999-01-01','9999-99-99','0000-00-00','1970-01-01',
  new Date(Date.now()-900*86400000).toISOString().slice(0,10),
  '<img src=x onerror=alert(1)>','{"a":1}','2026-08-12'];
for(const seed of seeds){
 let {ctx,page,errs}=await newPage(browser);
 await ctx.addInitScript(([k,v])=>{try{localStorage.setItem(k,v);}catch(e){}},['lusory.lastOpen',seed]);
 await page.goto(URL,{waitUntil:'networkidle'});
 const st=await page.evaluate(()=>({s:document.querySelector('section.on').dataset.screen,first:firstRun,gap:gapDays,b:hopperBudget,ret:!!returnLine}));
 const bad=errs.length>0||st.s===null;
 info('A4 seed '+JSON.stringify(seed)+' -> '+JSON.stringify(st)+(errs.length?' ERRS '+errs[0]:''));
 say(!bad,'A4 survives seed '+JSON.stringify(seed));
 if(seed==='2999-01-01') say(st.gap===0,'A4 future date yields gap 0, not a negative/absurd gap (got '+st.gap+')');
 await ctx.close();
}

/* ===== A5: clock going backwards between visits ===== */
{
 let {ctx,page,errs}=await newPage(browser);
 await ctx.addInitScript(([k,v])=>{try{localStorage.setItem(k,v);}catch(e){}},['lusory.lastOpen','2030-06-01']);
 await page.goto(URL,{waitUntil:'networkidle'});
 const st=await page.evaluate(()=>({first:firstRun,gap:gapDays,ret:!!returnLine,stored:localStorage.getItem('lusory.lastOpen')}));
 info('A5 clock-backwards state: '+JSON.stringify(st));
 say(st.gap>=0,'A5 negative day gap clamped (gap='+st.gap+')');
 say(errs.length===0,'A5 no errors with a future stored date');
 await ctx.close();
}

/* ===== A6: 1M char free-write + XSS payloads ===== */
{
 let {ctx,page,errs}=await newPage(browser);
 await page.goto(URL,{waitUntil:'networkidle'});
 await page.click('section[data-screen="intro"] .btn');
 await page.click('#skipfable');
 await page.click('section[data-screen="meet"] .actions .btn');
 await page.locator('#firstcards .entry').first().click();
 await page.locator('.tierbtn').nth(0).click();
 await page.click('section[data-screen="play"] .actions .btn');
 const t0=Date.now();
 await page.evaluate(()=>{const n=document.getElementById('note');n.value='A'.repeat(1000000);n.dispatchEvent(new Event('input'));});
 await page.click('section[data-screen="reflect"] .actions .btn');
 const dt=Date.now()-t0;
 say(await screen(page)==='done','A6 1M-char note reaches done in '+dt+'ms');
 const over=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 say(over<=0,'A6 no horizontal overflow with a 1M-char note (overflow '+over+')');
 // XSS
 await page.goBack();
 await page.evaluate(()=>{document.getElementById('note').value='<img src=x onerror="window.__pwned=1"><script>window.__pwned=2<\/script>';});
 await page.click('section[data-screen="reflect"] .actions .btn');
 await page.waitForTimeout(300);
 const pwned=await page.evaluate(()=>window.__pwned||0);
 say(pwned===0,'A6 free-write is never innerHTML-ed (pwned='+pwned+')');
 say(errs.filter(e=>!/clipboard/i.test(e)).length===0,'A6 no errors: '+errs.slice(0,2).join(' | '));
 await ctx.close();
}

/* ===== A7: reduced motion — loop completes, no stray skip button ===== */
{
 let {ctx,page,errs}=await newPage(browser,{reducedMotion:'reduce'});
 await page.goto(URL,{waitUntil:'networkidle'});
 await page.click('section[data-screen="intro"] .btn');
 const skipVisible=await page.locator('#skipfable').isVisible();
 say(!skipVisible,'A7 no dead "Skip the telling" button under reduced motion (visible='+skipVisible+')');
 say(await page.locator('#fabletext').isVisible(),'A7 text fallback reachable');
 await page.click('section[data-screen="meet"] .actions .btn');
 await page.locator('#firstcards .entry').first().click();
 await page.locator('.tierbtn').nth(2).click();
 await page.click('section[data-screen="play"] .actions .btn');
 await page.locator('.posture').nth(0).click();
 await page.click('section[data-screen="reflect"] .actions .btn');
 say(await screen(page)==='done','A7 loop completes under reduced motion');
 await page.click('section[data-screen="done"] .quiet');
 say(await screen(page)==='shelf','A7 shelf reachable under reduced motion');
 const anims=await page.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e);return s.animationName!=='none'||s.transitionDuration!=='0s';}).length);
 say(anims===0,'A7 zero animations/transitions under reduced motion: '+anims);
 say(errs.length===0,'A7 no errors');
 await ctx.close();
}

/* ===== A8: double clicks, clicks during transition, double-skip ===== */
{
 let {ctx,page,errs}=await newPage(browser);
 await page.goto(URL,{waitUntil:'networkidle'});
 await page.locator('section[data-screen="intro"] .btn').dblclick();
 info('A8 after dblclick Continue: screen='+await screen(page));
 await page.evaluate(()=>{skipFable();skipFable();skipFable();});
 say(await screen(page)==='meet','A8 triple skipFable() survives');
 const hist1=await page.evaluate(()=>history.length);
 await page.locator('section[data-screen="meet"] .actions .btn').dblclick();
 await page.locator('#firstcards .entry').first().dblclick();
 const hist2=await page.evaluate(()=>history.length);
 info('A8 history entries added by two dblclicks: '+(hist2-hist1)+' (2 expected)');
 say(hist2-hist1<=2,'A8 double-click does not duplicate history entries ('+(hist2-hist1)+')');
 await page.locator('.tierbtn').nth(0).dblclick();
 say(await screen(page)==='play','A8 dblclick on tier still reaches play');
 say(errs.length===0,'A8 no errors: '+errs.slice(0,2).join(' | '));
 await ctx.close();
}

/* ===== A9: rapid back/forward abuse, on a seeded in-document history =====
   Harness repair (R15): the test context opens on about:blank, so unbounded
   history.back() could walk clean out of the document — a harness artifact,
   not an app defect. Seed spare in-document entries first; the app must then
   recover to a rendered screen however hard back is abused. */
{
 let {ctx,page,errs}=await newPage(browser);
 await page.goto(URL,{waitUntil:'networkidle'});
 await page.evaluate(()=>{for(let i=0;i<10;i++)history.pushState({s:'intro',p:null},'');});
 await page.click('section[data-screen="intro"] .btn');
 await page.click('#skipfable');
 await page.click('section[data-screen="meet"] .actions .btn');
 await page.locator('#firstcards .entry').first().click();
 await page.locator('.tierbtn').nth(0).click();
 await page.click('section[data-screen="play"] .actions .btn');
 for(let i=0;i<12;i++){ await page.goBack().catch(()=>{}); }
 await page.waitForTimeout(120);
 const s=await screen(page);
 info('A9 after 12 rapid backs: screen='+s+' url='+page.url());
 say(page.url().startsWith(URL),'A9 back abuse stays inside the document ('+page.url()+')');
 say(s!==null,'A9 recovers to a rendered in-document screen after back abuse (screen='+s+')');
 for(let i=0;i<12;i++){ await page.goForward().catch(()=>{}); }
 await page.waitForTimeout(120);
 const s2=await screen(page);
 say(s2!==null,'A9 forward abuse leaves a rendered screen (screen='+s2+')');
 say(errs.length===0,'A9 no errors: '+errs.slice(0,2).join(' | '));
 await ctx.close();
}

/* ===== A10: hostile history state / deep link ===== */
{
 let {ctx,page,errs}=await newPage(browser);
 await page.goto(URL,{waitUntil:'networkidle'});
 await page.evaluate(()=>{history.pushState({s:'play',p:null},'');history.pushState({s:'x',p:null},'');});
 await page.goBack(); await page.waitForTimeout(80);
 info('A10 forced play state with no game -> '+await screen(page));
 await page.evaluate(()=>{history.pushState({s:'game',p:9999},'');});
 await page.goBack(); await page.goForward(); await page.waitForTimeout(80);
 info('A10 forced game 9999 -> '+await screen(page));
 say(await screen(page)!==null,'A10 hostile history state does not blank the app');
 // does back into "meet" from a bad state double-charge the budget?
 const b=await page.evaluate(()=>hopperBudget);
 info('A10 budget='+b);
 say(errs.length===0,'A10 no errors: '+errs.slice(0,2).join(' | '));
 await ctx.close();
}

/* ===== A11: JS disabled ===== */
{
 const ctx=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
 const page=await ctx.newPage();
 await page.goto(URL,{waitUntil:'load'});
 const txt=(await page.locator('body').innerText()).trim();
 info('A11 no-JS visible text ('+txt.length+' chars): '+txt.slice(0,120).replace(/\n/g,' / '));
 say(txt.length>80,'A11 graceful no-JS text, not a blank page');
 await ctx.close();
}

/* ===== A12: input may postpone motion, never provoke it (R15) ===== */
{
 /* (i) tap and hover on the mark, sampled ~40ms after each input event:
    no class, attribute, or inline style is ADDED in response to input.
    (Removals are allowed — clearing runs on its own schedule.) */
 let {ctx,page,errs}=await newPage(browser);
 await page.goto(URL,{waitUntil:'networkidle'});
 await page.click('section[data-screen="intro"] .btn');
 await page.click('#skipfable');
 await page.waitForTimeout(1700); /* let the entry hop-once clear so the baseline is at rest */
 await page.evaluate(()=>{
   const m=document.getElementById('meetmark');
   const snap=()=>({attrs:[...m.attributes].map(a=>a.name),classes:[...m.classList],style:[...m.style]});
   window.__a12={base:snap(),samples:[]};
   ['click','mouseover'].forEach(ev=>m.addEventListener(ev,()=>{
     setTimeout(()=>window.__a12.samples.push({ev,snap:snap()}),40);
   },{once:true}));
 });
 const mark=page.locator('#meetmark');
 await mark.hover(); await mark.click({force:true});
 await page.waitForTimeout(300);
 const r=await page.evaluate(()=>window.__a12);
 const added=r.samples.map(s=>({ev:s.ev,
   attrs:s.snap.attrs.filter(a=>!r.base.attrs.includes(a)),
   classes:s.snap.classes.filter(c=>!r.base.classes.includes(c)),
   style:s.snap.style.filter(x=>!r.base.style.includes(x))}));
 say(r.samples.length>=2&&added.every(a=>!a.attrs.length&&!a.classes.length&&!a.style.length),
     'A12 tap+hover add no class/attribute/inline style within 50ms of input: '+JSON.stringify(added));
 say(errs.length===0,'A12(i) no errors');
 await ctx.close();
}
{
 /* (ii) the entry hop-once clears on its own ~1400ms schedule — absent input,
    and equally with taps/hovers hammering the window — and never re-arms. */
 const watchHop=async(page,withInput)=>{
   await page.click('section[data-screen="intro"] .btn'); /* enters meet, arms hop-once */
   const armed=await page.evaluate(()=>document.getElementById('meetmark').classList.contains('hop-once'));
   const mark=page.locator('#meetmark');
   const t0=Date.now(); let cleared=-1;
   while(Date.now()-t0<2600&&cleared<0){
     if(withInput){ await mark.click({force:true}); await mark.hover(); }
     if(!await page.evaluate(()=>document.getElementById('meetmark').classList.contains('hop-once')))
       cleared=Date.now()-t0;
     else await page.waitForTimeout(60);
   }
   let rearmed=false; const t1=Date.now();
   while(Date.now()-t1<1500&&!rearmed){
     if(withInput){ await mark.click({force:true}); await mark.hover(); }
     rearmed=await page.evaluate(()=>document.getElementById('meetmark').classList.contains('hop-once'));
     await page.waitForTimeout(100);
   }
   return {armed,cleared,rearmed};
 };
 {let {ctx,page,errs}=await newPage(browser);
  await page.goto(URL,{waitUntil:'networkidle'});
  const q=await watchHop(page,false);
  say(q.armed&&q.cleared>=0&&q.cleared<=2400,'A12 absent input, hop-once clears on its own ~1400ms schedule: '+JSON.stringify(q));
  say(!q.rearmed,'A12 absent input, hop-once never re-arms');
  say(errs.length===0,'A12(ii-quiet) no errors');
  await ctx.close();}
 {let {ctx,page,errs}=await newPage(browser);
  await page.goto(URL,{waitUntil:'networkidle'});
  const q=await watchHop(page,true);
  say(q.armed&&q.cleared>=0&&q.cleared<=2400,'A12 with taps/hovers during the window, hop-once still clears: '+JSON.stringify(q));
  say(!q.rearmed,'A12 under input, hop-once never re-arms');
  say(errs.length===0,'A12(ii-input) no errors');
  await ctx.close();}
}

/* ===== A13: phase-aware storage audit (R15) =====
   Before the first session completes NOTHING is stored — across first load,
   navigation, and reload — which is what makes the destination gate hold
   (a quitter is returned to the introduction, never the ungated shelf).
   After the first completed session: exactly one key, lusory.lastOpen.
   The key list is compared whole and verbatim, so any future second key
   fails here loudly instead of being silently tolerated. */
{
 let {ctx,page,errs}=await newPage(browser);
 const audit=p=>p.evaluate(()=>({ls:Object.keys(localStorage),ss:Object.keys(sessionStorage),cookie:document.cookie}));
 const empty=st=>st.ls.length===0&&st.ss.length===0&&st.cookie==='';
 await page.goto(URL,{waitUntil:'networkidle'});
 let st=await audit(page);
 say(empty(st),'A13 first load stores nothing: '+JSON.stringify(st));
 await page.click('section[data-screen="intro"] .btn');
 await page.click('#skipfable');
 await page.click('section[data-screen="meet"] .actions .btn');
 await page.evaluate(()=>go('shelf'));
 say(await screen(page)!=='shelf','A13 destination gate still refuses the shelf pre-completion');
 await page.locator('#firstcards .entry').first().click();
 await page.locator('.tierbtn').nth(1).click();
 await page.click('section[data-screen="play"] .actions .btn');
 st=await audit(page);
 say(empty(st),'A13 pre-completion navigation stores nothing: '+JSON.stringify(st));
 await page.reload({waitUntil:'networkidle'});
 st=await audit(page);
 say(empty(st),'A13 pre-completion reload still stores nothing: '+JSON.stringify(st));
 say(await screen(page)==='intro','A13 the quitter is returned to the introduction (gate pinned by absence of storage)');
 await page.click('section[data-screen="intro"] .btn');
 await page.click('#skipfable');
 await page.click('section[data-screen="meet"] .actions .btn');
 await page.locator('#firstcards .entry').first().click();
 await page.locator('.tierbtn').nth(1).click();
 await page.click('section[data-screen="play"] .actions .btn');
 await page.click('section[data-screen="reflect"] .actions .btn');
 st=await audit(page);
 say(JSON.stringify(st.ls)==='["lusory.lastOpen"]','A13 after first completion: exactly ["lusory.lastOpen"], got '+JSON.stringify(st.ls));
 say(st.ss.length===0&&st.cookie==='','A13 completion adds no sessionStorage or cookies: '+JSON.stringify({ss:st.ss,cookie:st.cookie}));
 say(errs.length===0,'A13 no errors during the storage audit: '+errs.slice(0,2).join(' | '));
 await ctx.close();
}

await browser.close();
console.log('\n===== FAILS =====');
out.filter(l=>l.startsWith('FAIL')).forEach(l=>console.log(l));
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(1);});
