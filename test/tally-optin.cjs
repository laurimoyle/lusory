/* R31: the weekly game tally is opt-in, default off, asked once.
   Pins: no /api/choice request before a yes; the question appears once, after
   the first completed game; a yes adds exactly one device key and enables the
   request; a no adds the key and keeps the request off; About can change it. */
const {chromium}=require('playwright-core');
const URL='http://127.0.0.1:8123/';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const fail=[],pass=[];
const ok=(c,m)=>{(c?pass:fail).push(m);console.log((c?'  ok  ':'  XX  ')+m);};
const screen=p=>p.evaluate(()=>{const s=document.querySelector('section[data-screen].on');return s?s.dataset.screen:null;});

async function fresh(b){
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const p=await ctx.newPage(); const choices=[];
  await p.route('**/api/choice',r=>{choices.push(JSON.parse(r.request().postData()||'{}'));r.fulfill({status:202,body:'{}'});});
  return {ctx,p,choices};
}
async function firstGame(p){
  await p.goto(URL,{waitUntil:'networkidle'});
  await p.click('section[data-screen="intro"] .btn');
  await p.click('#skipfable');
  await p.click('#meetcontinue');
  await p.locator('#firstcards .entry').first().click();
  await p.locator('.tierbtn').first().click();
  await p.click('section[data-screen="play"] .actions .btn');
  await p.locator('#postures button, #postures .posture').first().click().catch(()=>{});
  await p.click('section[data-screen="reflect"] .actions .btn');
}
const keys=p=>p.evaluate(()=>Object.keys(localStorage).sort());

(async()=>{
const b=await chromium.launch({executablePath:EXE});

/* default: nothing sent, asked once after the first game */
{const {ctx,p,choices}=await fresh(b);
 await firstGame(p);
 ok(await screen(p)==='done','T1 first session reaches done');
 ok(choices.length===0,'T1 no /api/choice request before the player says yes: '+choices.length);
 ok(await p.locator('#tallyask').isVisible(),'T1 the question is asked after the first game');
 ok(JSON.stringify(await keys(p))==='["lusory.lastOpen"]','T1 unanswered question writes nothing: '+JSON.stringify(await keys(p)));
 /* answer yes */
 await p.click('#tallyyes');
 ok(!(await p.locator('#tallyask').isVisible()),'T2 question closes once answered');
 ok(JSON.stringify(await keys(p))==='["lusory.lastOpen","lusory.tallyOptIn.v1"]','T2 a yes adds exactly one key: '+JSON.stringify(await keys(p)));
 await p.click('section[data-screen="done"] > .actions .quiet');
 await p.locator('#shelfbody .entry').first().click();
 await p.waitForTimeout(300);
 ok(choices.length===1&&Object.keys(choices[0]).sort().join()==='first,game,source','T2 after yes, a choice sends only {game,source,first}: '+JSON.stringify(choices));
 /* About shows the setting and can turn it off */
 await p.evaluate(()=>go('about'));
 ok(/On\./.test(await p.textContent('#tallystate')),'T3 About shows the tally as on');
 await p.click('#tallytoggle');
 ok(/Off\./.test(await p.textContent('#tallystate')),'T3 About turns it off');
 await p.evaluate(()=>go('shelf'));
 await p.locator('#shelfbody .entry').first().click();
 await p.waitForTimeout(300);
 ok(choices.length===1,'T3 after turning off, no further request: '+choices.length);

 await ctx.close();}

/* a no keeps it off */
{const {ctx,p,choices}=await fresh(b);
 await firstGame(p);
 await p.click('#tallyno');
 ok(JSON.stringify(await keys(p))==='["lusory.lastOpen","lusory.tallyOptIn.v1"]','T5 a no is remembered as one key');
 await p.click('section[data-screen="done"] > .actions .quiet');
 await p.locator('#shelfbody .entry').first().click();
 await p.waitForTimeout(300);
 ok(choices.length===0,'T5 after no, nothing is sent');
 await ctx.close();}

/* F1: nothing can be answered or stored before the first game is finished */
{const {ctx,p,choices}=await fresh(b);
 await p.goto(URL,{waitUntil:'networkidle'});
 await p.evaluate(()=>go('about'));
 ok(!(await p.locator('#tallysetting').isVisible()),'T7 About shows no tally setting before the first game');
 await p.evaluate(()=>{toggleTally();answerTally(true);});
 ok((await keys(p)).length===0,'T7 calling the handlers pre-completion stores nothing: '+JSON.stringify(await keys(p)));
 await p.evaluate(()=>go('intro'));
 await p.click('section[data-screen="intro"] .btn'); await p.click('#skipfable'); await p.click('#meetcontinue');
 await p.locator('#firstcards .entry').first().click();
 await p.waitForTimeout(200);
 ok(choices.length===0,'T7 the first choice is not sent');
 await ctx.close();}

/* F2: asked once per visit, even when left unanswered */
{const {ctx,p}=await fresh(b);
 await firstGame(p);
 ok(await p.locator('#tallyask').isVisible(),'T8 asked after the first game');
 await p.click('section[data-screen="done"] > .actions .quiet');
 await p.locator('#shelfbody .entry').first().click();
 await p.locator('.tierbtn').first().click();
 await p.click('section[data-screen="play"] .actions .btn');
 await p.click('section[data-screen="reflect"] .actions .btn');
 ok(await screen(p)==='done','T8 second done screen reached');
 ok(!(await p.locator('#tallyask').isVisible()),'T8 an unanswered question is not asked a second time in the same visit');
 await p.goBack(); await p.goForward();
 ok(!(await p.locator('#tallyask').isVisible()),'T8 history navigation does not bring it back');
 await p.reload({waitUntil:'networkidle'});
 await p.evaluate(()=>{sessionDone=true;go('done');});
 ok(!(await p.locator('#tallyask').isVisible()),'T8 a returning visit is never asked');
 await ctx.close();}

/* junk stored value and throwing storage keep the tally off */
{const {ctx,p,choices}=await fresh(b);
 await ctx.addInitScript(()=>{try{localStorage.setItem('lusory.lastOpen','2026-01-01');localStorage.setItem('lusory.tallyOptIn.v1','YES ');}catch(e){}});
 await p.goto(URL,{waitUntil:'networkidle'});
 await p.evaluate(()=>chooseGame(3,'shelf')); await p.waitForTimeout(200);
 ok(choices.length===0,'T9 a junk stored value is treated as no');
 await ctx.close();}
{const {ctx,p,choices}=await fresh(b);
 await ctx.addInitScript(()=>{Storage.prototype.getItem=function(){throw new Error('blocked');};Storage.prototype.setItem=function(){throw new Error('blocked');};});
 await p.goto(URL,{waitUntil:'networkidle'});
 await p.evaluate(()=>{sessionDone=true;chooseGame(3,'shelf');});await p.waitForTimeout(200);
 ok(choices.length===0,'T9 blocked storage sends nothing');
 await ctx.close();}

/* F3: with the constant off, no setting, no question, no request */
{const fs=require('fs');const src=fs.readFileSync(__dirname+'/../index.html','utf8').replace('var TALLY_ENABLED=true;','var TALLY_ENABLED=false;');
 const {ctx,p,choices}=await fresh(b);
 await p.route('http://127.0.0.1:8123/',r=>r.fulfill({status:200,contentType:'text/html',body:src}));
 await firstGame(p);
 ok(!(await p.locator('#tallyask').isVisible()),'T10 TALLY_ENABLED=false: no question');
 await p.evaluate(()=>go('about'));
 ok(!(await p.locator('#tallysetting').isVisible()),'T10 TALLY_ENABLED=false: no setting on About');
 await p.evaluate(()=>{writeTally('yes');chooseGame(2,'shelf');}); await p.waitForTimeout(200);
 ok(choices.length===0,'T10 TALLY_ENABLED=false: even a stored yes sends nothing');
 await ctx.close();}

/* the single constant disables the request outright */
{const fs=require('fs');const h=fs.readFileSync(__dirname+'/../index.html','utf8');
 ok(/var TALLY_ENABLED=(true|false);/.test(h),'T6 TALLY_ENABLED constant present');
 ok(/function tallyOn\(\)\{return TALLY_ENABLED&&readTally\(\)==="yes";\}/.test(h),'T6 tally requires both the constant and a stored yes');
 const rc=h.slice(h.indexOf('function recordChoice('),h.indexOf('function chooseGame('));
 ok(rc.indexOf('if(!tallyOn())return;')>-1&&rc.indexOf('if(!tallyOn())return;')<rc.indexOf('fetch('),'T6 recordChoice returns before fetch unless opted in');}

await b.close();
console.log(fail.length?'\nTALLY FAIL ('+fail.length+')':'\nTALLY ALL GREEN ('+pass.length+')');
process.exit(fail.length?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(1);});
