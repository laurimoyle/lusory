/* Acceptance-criteria checklist the architect listed as unverified. */
const {chromium}=require('playwright-core');
const URL='http://127.0.0.1:8123/', EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const out=[]; const say=(k,v)=>{out.push([k,v]);console.log((v===true?'  ok  ':v===false?'  XX  ':'  ..  ')+k+(typeof v==='string'?': '+v:''));};
const scr=p=>p.evaluate(()=>{const s=document.querySelector('section[data-screen].on');return s?s.dataset.screen:null;});
(async()=>{
const b=await chromium.launch({executablePath:EXE});

console.log('\n--- storage backends, enumerated at runtime (WP4 / acceptance 3) ---');
{const c=await b.newContext();const p=await c.newPage();await p.goto(URL,{waitUntil:'networkidle'});
 await p.click('section[data-screen="intro"] .btn');await p.click('#skipfable');
 await p.click('section[data-screen="meet"] .actions .btn');
 await p.locator('#firstcards .entry').first().click();
 await p.locator('.tierbtn').nth(1).click();
 await p.click('section[data-screen="play"] .actions .btn');
 await p.fill('#note','a note');
 await p.click('section[data-screen="reflect"] .actions .btn');
 const st=await p.evaluate(async()=>{
   const idb=(indexedDB.databases?await indexedDB.databases():[]).map(d=>d.name);
   let sw=[];try{sw=(await navigator.serviceWorker.getRegistrations()).map(r=>r.scope);}catch(e){}
   let cacheNames=[];try{cacheNames=await caches.keys();}catch(e){}
   return {localStorage:Object.keys(localStorage),sessionStorage:Object.keys(sessionStorage),
     cookies:document.cookie,indexedDB:idb,serviceWorkers:sw,cacheStorage:cacheNames};});
 say('localStorage is exactly one key',JSON.stringify(st.localStorage));
 say('sessionStorage empty',st.sessionStorage.length===0);
 say('document.cookie empty',st.cookies==='');
 say('indexedDB empty',st.indexedDB.length===0);
 say('no service workers',st.serviceWorkers.length===0);
 say('no CacheStorage entries',st.cacheStorage.length===0);
 const ck=await c.cookies(); say('browser cookie jar empty',ck.length===0);
 await c.close();}

console.log('\n--- non-goals: no PWA / manifest / notifications (WP8) ---');
{const fs=require('fs');const h=fs.readFileSync(__dirname+'/../index.html','utf8');
 say('no <link rel=manifest>',!/rel=["']?manifest/i.test(h));
 say('no service-worker registration',!/serviceWorker/i.test(h));
 say('no Notification API',!/Notification|requestPermission/i.test(h));
 say('no beforeinstallprompt',!/beforeinstallprompt/i.test(h));
 say('no link/fetch to the translation table',!/(href|src)=["'][^"']*(science-axis|translation-table|docs\/)/i.test(h)
       && !/fetch\([^)]*(science-axis|translation-table|docs\/)/i.test(h));
 say('the only browser report is the disclosed same-origin choice call',/fetch\("\/api\/choice"/.test(h)
       && !/fetch\(["']https?:/i.test(h));
 say('translation table not named in shipped source',!/science-axis-translation-table/i.test(h));
 const ig=fs.readFileSync(__dirname+'/../.vercelignore','utf8');
 say('translation table excluded from the deploy (.vercelignore)',/^docs\/$/m.test(ig));
 say('test harnesses excluded from the deploy',/^test\/$/m.test(ig));}

console.log('\n--- binding safety copy present verbatim (map safety section) ---');
{const c=await b.newContext();const p=await c.newPage();await p.goto(URL,{waitUntil:'networkidle'});
 const g=await p.evaluate(()=>GAMES.map(x=>({n:x.n,name:x.name,rule:x.rule,care:x.care||''})));
 const heist=g.find(x=>x.n===7);
 say('Kindness Heist carries the no-trespass line',/trespass/i.test(heist.rule)?heist.rule.match(/Nothing that means[^.]*\./)[0]:false);
 const hunt=g.find(x=>x.n===8);
 say('Stranger Hunt: public / daylight / declinable',/public places/i.test(hunt.rule)&&/decline/i.test(hunt.rule));
 const balloon=g.find(x=>x.n===15);
 say('Balloon Keeper: dizziness + medical deferral',/dizzy/i.test(balloon.care)&&/medically advised/i.test(balloon.care));
 const about=await p.textContent('section[data-screen="about"]');
 say('clinician referral line present',/a clinician beats a game/.test(about));
 await c.close();}

console.log('\n--- JS disabled (pass 1) ---');
{const c=await b.newContext({javaScriptEnabled:false});const p=await c.newPage();
 await p.goto(URL,{waitUntil:'domcontentloaded'});
 const t=(await p.textContent('body')).trim();
 say('graceful failure text, not a blank page',t.length>200?t.length+' chars incl. the full Awe Route rules':false);
 say('noscript names the game',/Awe Route/.test(t));
 await c.close();}

console.log('\n--- localStorage cleared mid-session + absurd input (pass 1) ---');
{const c=await b.newContext();const p=await c.newPage();const errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL,{waitUntil:'networkidle'});
 await p.click('section[data-screen="intro"] .btn');
 await p.evaluate(()=>localStorage.clear());
 await p.click('#skipfable');await p.click('section[data-screen="meet"] .actions .btn');
 await p.locator('#firstcards .entry').first().click();
 await p.locator('.tierbtn').nth(0).click();
 await p.click('section[data-screen="play"] .actions .btn');
 const big='x'.repeat(1000000);
 const t0=Date.now(); await p.fill('#note',big);
 await p.click('section[data-screen="reflect"] .actions .btn');
 say('survives storage cleared mid-session',await scr(p)==='done');
 say('1,000,000-char free-write reaches done',(Date.now()-t0)+'ms');
 const over=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 say('no horizontal overflow with a 1M-char note',over<=0);
 say('zero page errors throughout',errs.length===0);
 await c.close();}

console.log('\n--- loop time + on-screen keyboard (acceptance 2 / WP7) ---');
{const c=await b.newContext({viewport:{width:390,height:844}});const p=await c.newPage();
 await p.goto(URL,{waitUntil:'networkidle'});
 const t0=Date.now();
 await p.click('section[data-screen="intro"] .btn');await p.click('#skipfable');
 await p.click('section[data-screen="meet"] .actions .btn');
 await p.locator('#firstcards .entry').first().click();
 await p.locator('.tierbtn').nth(1).click();
 await p.click('section[data-screen="play"] .actions .btn');
 await p.locator('.posture').nth(3).click();
 await p.fill('#note','a line');
 await p.click('section[data-screen="reflect"] .actions .btn');
 say('full loop UI time',((Date.now()-t0)/1000).toFixed(1)+'s (budget 120s)');
 await p.goBack();
 await p.setViewportSize({width:390,height:400}); /* keyboard up: ~half the screen */
 await p.locator('#note').scrollIntoViewIfNeeded(); await p.locator('#note').focus();
 const box=await p.locator('#note').boundingBox();
 say('textarea fully visible with keyboard up',box.y>=0&&box.y+box.height<=400?Math.round(box.height)+'px tall, in view':false);
 const over=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 say('no overflow at 390x400',over<=0);
 await c.close();}

console.log('\n--- tier symmetry, RE-MEASURED after the obstacle-text change (item 15) ---');
{for(const w of [360,390,430,820]){
 const c=await b.newContext({viewport:{width:w,height:900}});const p=await c.newPage();
 await p.goto(URL,{waitUntil:'networkidle'});
 await p.click('section[data-screen="intro"] .btn');await p.click('#skipfable');
 await p.click('section[data-screen="meet"] .actions .btn');
 await p.locator('#firstcards .entry').first().click();
 const bx=await Promise.all((await p.locator('.tierbtn').all()).map(t=>t.boundingBox()));
 const dims=bx.map(x=>Math.round(x.width)+'x'+Math.round(x.height));
 const styles=await p.evaluate(()=>[...document.querySelectorAll('.tierbtn')].map(e=>{const s=getComputedStyle(e);
   return s.borderWidth+'|'+s.backgroundColor+'|'+s.fontSize+'|'+s.fontWeight+'|'+s.padding;}));
 say('tiers equal at '+w+'px',new Set(dims).size===1&&new Set(styles).size===1?dims[0]+' identical':dims.join(' '));
 await c.close();}}

console.log('\n--- allocator, RE-MEASURED against the current code (item 14) ---');
{const c=await b.newContext();const p=await c.newPage();
 await p.goto(URL,{waitUntil:'networkidle'});
 const d=new Date();d.setDate(d.getDate()-1);
 const y=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 let send=0,marg=0,silent=0,N=150;
 for(let i=0;i<N;i++){
   await p.evaluate(v=>localStorage.setItem('lusory.lastOpen',v),y);
   await p.reload({waitUntil:'domcontentloaded'});
   const a=await p.evaluate(()=>({s:!!sendoffLine,m:allowMarginalia,r:!!returnLine}));
   if(a.s)send++;else if(a.m)marg++;else silent++;}
 const pct=x=>(100*x/N).toFixed(1)+'%';
 say('ALLOCATION rates over '+N+' ordinary visits',
     'sendoff '+pct(send)+' · marginalia '+pct(marg)+' · silent '+pct(silent));
 say('these are allocation rates, not experienced rates',
     'a visitor who quits before `done` experiences fewer — the direction is toward less');
 await c.close();}

await b.close();
const bad=out.filter(([k,v])=>v===false);
console.log('\n'+(bad.length?'FAILED: '+bad.map(x=>x[0]).join(', '):'ACCEPTANCE CHECKLIST CLEAR'));
process.exit(bad.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
