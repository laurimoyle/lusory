const {chromium}=require('playwright-core');
const URL='http://127.0.0.1:8123/';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const log=console.log;
(async()=>{
const browser=await chromium.launch({executablePath:EXE});
const mk=async(o={})=>{const ctx=await browser.newContext(Object.assign({viewport:{width:390,height:844}},o));const page=await ctx.newPage();return {ctx,page};};
const screen=p=>p.evaluate(()=>{const s=document.querySelector('section[data-screen].on');return s?s.dataset.screen:null;});

/* B1: same-day reload -> back-nav budget overrun, 12 trials */
let over=0;
for(let t=0;t<12;t++){
 const {ctx,page}=await mk();
 await page.goto(URL,{waitUntil:'networkidle'});
 await page.click('section[data-screen="intro"] .btn');
 await page.click('#skipfable');
 await page.click('section[data-screen="meet"] .actions .btn');
 await page.click('section[data-screen="first"] .actions .btn');
 await page.locator('.tierbtn').nth(1).click();
 await page.click('section[data-screen="play"] .actions .btn');
 await page.click('section[data-screen="reflect"] .actions .btn');
 await page.click('section[data-screen="done"] .quiet');
 await page.reload({waitUntil:'networkidle'});          // <- second visit, SAME DAY
 /* Harness repair (R15): seed in-document history so 12 backs cannot walk out
    of the document to about:blank (which crashed the hopperBudget evaluate). */
 await page.evaluate(()=>{for(let i=0;i<6;i++)history.pushState({s:'shelf',p:null},'');});
 const shelfM=await page.evaluate(()=>document.querySelector('section.on').querySelectorAll('.marg').length);
 let n=0,reached=false;
 while(n++<12){ await page.goBack(); await page.waitForTimeout(40); if(await screen(page)==='meet'){reached=true;break;} }
 const b=await page.evaluate(()=>hopperBudget);
 const total=shelfM+(reached?1:0);
 if(total>1||b<0) over++;
 log('B1 trial'+t+' shelfMoments='+shelfM+' reachedMeet='+reached+' budget='+b+' totalMoments='+total+(total>1?'  <-- OVER CAP':''));
 await ctx.close();
}
log('B1: '+over+'/12 trials exceeded the one-moment cap on a second visit');

/* B2: refresh on the intro screen -> is the introduction slot lost forever? */
{
 const {ctx,page}=await mk();
 await page.goto(URL,{waitUntil:'networkidle'});
 log('B2 first load screen='+await screen(page));
 await page.reload({waitUntil:'networkidle'});
 log('B2 after refresh on intro: screen='+await screen(page)+' firstRun='+await page.evaluate(()=>firstRun));
 await page.reload({waitUntil:'networkidle'});
 log('B2 the fable/introduction is now unreachable from any control: '+
   await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>/meet/.test(b.getAttribute('onclick')||'')).length===0));
 await ctx.close();
}

/* B3: refresh mid-fable / mid-play / mid-reflect */
for(const [label,steps] of Object.entries({
  midfable:['intro'],
  midplay :['intro','skip','meet','first','tier'],
  midreflect:['intro','skip','meet','first','tier','play']
})){
 const {ctx,page}=await mk();
 const errs=[]; page.on('pageerror',e=>errs.push(e.message));
 await page.goto(URL,{waitUntil:'networkidle'});
 for(const s of steps){
  if(s==='intro') await page.click('section[data-screen="intro"] .btn');
  if(s==='skip')  await page.click('#skipfable');
  if(s==='meet')  await page.click('section[data-screen="meet"] .actions .btn');
  if(s==='first') await page.click('section[data-screen="first"] .actions .btn');
  if(s==='tier')  await page.locator('.tierbtn').nth(0).click();
  if(s==='play')  await page.click('section[data-screen="play"] .actions .btn');
 }
 if(label==='midreflect') await page.fill('#note','a note the user typed');
 const before=await screen(page);
 await page.reload({waitUntil:'networkidle'});
 log('B3 refresh from '+before+' -> '+await screen(page)+' errs='+errs.length);
 await ctx.close();
}

/* B4: back button DURING the fable animation (timer still running) */
{
 const {ctx,page}=await mk();
 const errs=[]; page.on('pageerror',e=>errs.push(e.message));
 await page.goto(URL,{waitUntil:'networkidle'});
 await page.click('section[data-screen="intro"] .btn');
 await page.waitForTimeout(1200);
 await page.goBack(); await page.waitForTimeout(100);
 log('B4 back mid-fable -> '+await screen(page)+' fableDone='+await page.evaluate(()=>fableDone));
 await page.goForward(); await page.waitForTimeout(300);
 const st=await page.evaluate(()=>({s:document.querySelector('section.on').dataset.screen,
   stageVisible:getComputedStyle(document.getElementById('fablestage')).display!=='none',
   textVisible:getComputedStyle(document.getElementById('fabletext')).display!=='none',
   cap:document.getElementById('fablecap').textContent,
   idx:fableIdx,budget:hopperBudget}));
 log('B4 forward back to meet: '+JSON.stringify(st)+' errs='+errs.length);
 await ctx.close();
}

/* B5: skip button tap target + fable caption aria-live churn */
{
 const {ctx,page}=await mk();
 await page.goto(URL,{waitUntil:'networkidle'});
 await page.click('section[data-screen="intro"] .btn');
 const bb=await page.locator('#skipfable').boundingBox();
 log('B5 #skipfable tap target h='+Math.round(bb.height)+' w='+Math.round(bb.width)+(bb.height<44?'  <-- under 44px':''));
 await ctx.close();
}

/* B6: reduced-motion toggled mid-session (idle motion keeps its stale decision) */
{
 const {ctx,page}=await mk();
 await page.goto(URL,{waitUntil:'networkidle'});
 const rm=await page.evaluate(()=>reducedMotion);
 await page.emulateMedia({reducedMotion:'reduce'});
 const rm2=await page.evaluate(()=>reducedMotion);
 log('B6 reducedMotion at load='+rm+' after OS toggle='+rm2+(rm2===false?'  <-- idle timer still armed':''));
 await ctx.close();
}

/* B7: 100+ rapid go() calls -> pushState throttle / history bloat */
{
 const {ctx,page}=await mk();
 const errs=[]; page.on('pageerror',e=>errs.push(e.message));
 await page.goto(URL,{waitUntil:'networkidle'});
 await page.evaluate(()=>{for(let i=0;i<300;i++){go('shelf');go('about');}});
 log('B7 after 600 go() calls: history.length='+await page.evaluate(()=>history.length)+' screen='+await screen(page)+' errs='+errs.length);
 await ctx.close();
}

/* B8: does the note survive a game switch? (silent data loss path) */
{
 const {ctx,page}=await mk();
 await page.goto(URL,{waitUntil:'networkidle'});
 await page.click('section[data-screen="intro"] .btn');
 await page.click('#skipfable');
 await page.click('section[data-screen="meet"] .actions .btn');
 await page.click('section[data-screen="first"] .actions .btn');
 await page.locator('.tierbtn').nth(0).click();
 await page.click('section[data-screen="play"] .actions .btn');
 await page.fill('#note','something I wanted to keep');
 await page.click('section[data-screen="reflect"] .actions .btn'); // done
 await page.goBack(); await page.goBack(); await page.waitForTimeout(60); // play
 await page.click('section[data-screen="play"] .actions button.quiet'); // reread rules -> game
 await page.locator('.tierbtn').nth(2).click();
 await page.click('section[data-screen="play"] .actions .btn');
 log('B8 note after re-picking a tier: '+JSON.stringify(await page.inputValue('#note')));
 await ctx.close();
}

await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
