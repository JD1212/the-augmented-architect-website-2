// Real React UI and real browser cookie jar against actual HTTP/service handlers.
// Only model and storage are fixtures; no window.fetch replacement or customer data.
// Set CHROME_BIN if Chromium is not installed in a standard browser/Playwright location.
import {spawn} from 'node:child_process';
import {existsSync, readdirSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {join} from 'node:path';
function findChrome() {
 const roots=[join(homedir(),'Library/Caches/ms-playwright'),join(homedir(),'.cache/ms-playwright')];
 const candidates=[process.env.CHROME_BIN,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'];
 for(const root of roots) if(existsSync(root)) for(const dir of readdirSync(root)) candidates.push(join(root,dir,'chrome-headless-shell-mac-arm64/chrome-headless-shell'),join(root,dir,'chrome-headless-shell-linux64/chrome-headless-shell'),join(root,dir,'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'));
 const browser=candidates.find(p=>p&&existsSync(p));if(!browser)throw Error('Set CHROME_BIN to a Chromium executable.');return browser;
}
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.argv[2]||'https://the-augmented-architect-website-2.vercel.app',out=process.env.BOOKING_LIVE_REVIEW_DIR||join(tmpdir(),'aa-booking-live-readonly');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19795','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19795/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
 let bookingPosts=0;
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result);}if(m.method==='Network.requestWillBeSent'&&m.params.request.url===origin+'/api/booking'&&m.params.request.method==='POST')bookingPosts++;if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.console.push(m.params.args);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)report.failedAssets.push(m.params.response.url);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const i=++id;pending.set(i,{resolve,reject});ws.send(JSON.stringify({id:i,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async expression=>{for(let i=0;i<350;i++){if(await ev(expression))return;await sleep(50)}throw Error('Timeout '+expression)};
 const check=(value,label)=>{assert(value,label);report.checks.push(label);console.log('PASS '+label)};
 const nav=async path=>{await send('Page.navigate',{url:origin+path});await until("document.readyState==='complete'&&!!document.querySelector('main')");await ev("document.querySelectorAll('img').forEach(i=>i.loading='eager')");await until("[...document.images].every(i=>i.complete)");};
 const shot=async(name,selector)=>{
  let params={format:'png',captureBeyondViewport:false};
  // A mobile scroll container clips beyond-viewport screenshots. Expand it only
  // for the isolated section artifact; all layout/interaction checks use real CSS.
  if(selector){
   await ev("(()=>{window.__reviewScroll=document.querySelector('.site-content').scrollTop;const style=document.createElement('style');style.id='review-capture-only';style.textContent='html,body,.site-content{height:auto!important;max-height:none!important;overflow:visible!important}.site-header{position:relative!important}.consultation-dock{display:none!important}';document.head.append(style);window.scrollTo(0,0)})()");
   const clip=await ev(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`);params={format:'png',captureBeyondViewport:true,clip};
  }
  try{const r=await send('Page.captureScreenshot',params);await writeFile(out+'/'+name+'.png',Buffer.from(r.data,'base64'));}
  finally{if(selector)await ev("document.querySelector('#review-capture-only').remove();document.querySelector('.site-content').scrollTop=window.__reviewScroll");}
 };
 assert(['http://localhost:3100','https://the-augmented-architect-website-2.vercel.app'].includes(origin),'Use only the authorized website');


 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.origin===${JSON.stringify(origin)})sessionStorage.setItem('aa.scout.introduction.v1','1')`});
 const click=s=>ev(`document.querySelector(${JSON.stringify(s)}).click()`);
 const ready=()=>until("!!document.querySelector('#consultation-booking[open]')&&!!document.querySelector('#consultation-booking fieldset')&&!document.querySelector('#consultation-booking fieldset').disabled");
 const close=async()=>{await click('#consultation-booking button[aria-label="Close consultation booking"]');await until("!document.querySelector('#consultation-booking[open]')");};
 const set=async(selector,value)=>ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 for(const width of [1440,390]){
  const zone=width===1440?'America/Los_Angeles':'Asia/Tokyo';await send('Emulation.setTimezoneOverride',{timezoneId:zone});await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width===390});await nav('/');
  if(width===390)await click('.menu-toggle');await click('#main-navigation a.header-cta');await ready();check(true,'Production header opens enabled shared booking '+width);
  await set('#consultation-booking input[name=date]','2026-11-16');await until("document.querySelectorAll('#consultation-booking select[name=time] option').length>1&&!document.querySelector('#consultation-booking fieldset').disabled");
  check(await ev(`document.querySelector('#consultation-booking select[name=timezone]').value===${JSON.stringify(zone)}`),'Visitor timezone detected '+width);
  check(await ev("[...document.querySelectorAll('#consultation-booking select[name=time] option')].some(o=>o.value==='2026-11-16T16:00:00.000Z')"),'Real approved-calendar availability loads '+width);
  check(await ev(width===1440?"[...document.querySelectorAll('#consultation-booking select[name=time] option')].find(o=>o.value==='2026-11-16T16:00:00.000Z').textContent.includes('8:00')":"[...document.querySelectorAll('#consultation-booking select[name=time] option')].find(o=>o.value==='2026-11-16T16:00:00.000Z').textContent.includes('Nov 17')"),'Time/date convert clearly for visitor '+width);
  check(await ev("!document.querySelector('#consultation-booking input[type=checkbox]').checked&&document.querySelector('#consultation-booking button[type=submit]').disabled"),'No appointment without explicit confirmation '+width);
  check(await ev("(()=>{const p=document.querySelector('#consultation-booking'),r=p.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&p.scrollWidth<=p.clientWidth})()"),'Production dialog fits viewport '+width);await shot('production-booking-'+width);await close();
  check(await ev(width===390?"document.activeElement.matches('.menu-toggle')":"document.activeElement.matches('#main-navigation a.header-cta')"),'Closing restores appropriate trigger focus '+width);
  for(const path of ['/ai-solutions','/salesforce','/custom-applications']){await nav(path);await click('main a.button[href="/book"]');await ready();check(await ev(`location.pathname===${JSON.stringify(path)}`),'Production service CTA uses modal '+path+' '+width);await close();}
  await nav('/book');await click('main button.button');await ready();check(await ev("!document.querySelector('#consultation-booking input[type=password]')"),'Production /book requires no account '+width);await close();
  await nav('/');await until("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')");await click('[aria-label="Open Scout, AI Architecture Guide"]');await until("document.querySelectorAll('#scout-panel [role=group] button').length===4");
  await ev("[...document.querySelectorAll('#scout-panel button')].find(b=>b.textContent==='Book Consultation').click()");await ready();await close();check(await ev("!!document.querySelector('#scout-panel[open]')&&document.querySelectorAll('#scout-panel [role=group] button').length===4"),'Scout booking action preserves chat '+width);await click('[aria-label="Minimize Scout"]');await until("!document.querySelector('#scout-panel')");
 }
 check(bookingPosts===0,'Read-only Production smoke creates no additional appointments');check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed assets or API requests');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,out}));
}finally{ws?.close();child.kill('SIGTERM');}
