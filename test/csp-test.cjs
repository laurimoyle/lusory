const {chromium}=require('playwright-core');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844}}); const p=await ctx.newPage();
const viol=[]; p.on('console',m=>{const t=m.text(); if(/Content Security Policy|Refused to/i.test(t))viol.push(t); });
p.on('pageerror',e=>viol.push('PAGEERROR '+e.message));
await p.goto('http://127.0.0.1:8124/',{waitUntil:'networkidle'});
// full loop under CSP
await p.click('section[data-screen="intro"] .btn');
await p.click('#skipfable');
await p.click('section[data-screen="meet"] .actions .btn');
await p.locator('#firstcards .entry').first().click();
await p.locator('.tierbtn').nth(1).click();
await p.click('section[data-screen="play"] .actions .btn');
await p.click('section[data-screen="reflect"] .actions .btn');
await p.click('section[data-screen="done"] .quiet');
const scr=await p.evaluate(()=>document.querySelector('section[data-screen].on').dataset.screen);
const bg=await p.evaluate(()=>getComputedStyle(document.body).backgroundImage.includes('data:image/svg')); 
const keys=await p.evaluate(()=>Object.keys(localStorage));
console.log('final screen under CSP:',scr);
console.log('noise background rendered:',bg);
console.log('storage under CSP:',JSON.stringify(keys));
console.log('CSP violations:',viol.length?viol:'NONE');
console.log(scr==='shelf'&&bg&&keys.length===1&&viol.length===0?'CSP OK — full loop completes under production headers':'CSP PROBLEM');
await b.close();})().catch(e=>{console.error(e.message);process.exit(1);});
