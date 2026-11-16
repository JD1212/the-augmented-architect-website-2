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
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {bookingFixture,bookingModuleCache} from './helpers/booking-fixture.mjs';
import {loadScoutModule} from './helpers/scout-loader.mjs';
const origin='http://localhost:3192',out=process.env.BOOKING_REVIEW_DIR||join(tmpdir(),'aa-booking');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19781','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19781/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.console.push(m.params.args);if(m.method==='Network.responseReceived'&&m.params.response.status>=400&&!(m.params.response.url.includes('/api/booking')&&[400,401,409,503].includes(m.params.response.status)))report.failedAssets.push(m.params.response.url);};
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
 const upstream=process.argv[2]||'http://localhost:3100';assert(['http://localhost:3100','http://localhost:3000'].includes(upstream));

 const f=bookingFixture(),policy={timezone:'America/New_York',hours:{1:[['09:00','17:00']]},bufferMinutes:15,noticeMinutes:120,horizonDays:30};let enabled=true,posts=0,messages=[];
 const {createBookingHandlers}=loadScoutModule('src/lib/booking/http.ts',{},bookingModuleCache);const {bookingConfig}=loadScoutModule('src/lib/booking/config.ts',{},bookingModuleCache);
 const handlers=createBookingHandlers(()=>{if(!enabled)bookingConfig({});return {service:f.service,policy};},async()=>{});
 const server=createServer(async(req,res)=>{
  try{let response;
   if(req.url.startsWith('/api/booking')){const chunks=[];for await(const c of req)chunks.push(c);if(req.method==='POST')posts++;response=await handlers[req.method](new Request(origin+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks).toString()}:{})}));}
   else if(req.url==='/api/scout'){
    if(req.method==='POST'){const chunks=[];for await(const c of req)chunks.push(c);const v=JSON.parse(Buffer.concat(chunks));messages.push({id:v.clientTurnId,role:'user',content:v.message},{id:randomUUID(),role:'assistant',content:'You can discuss the project at /book.'});response=new Response(JSON.stringify({type:'done',messages,expiresInMs:86400000})+'\n',{headers:{'Content-Type':'application/x-ndjson'}});}
    else response=Response.json({messages,busy:false,failed:null,sessionReset:false,expiresInMs:messages.length?86400000:null});
   }else response=await fetch(upstream+req.url,{headers:req.headers,redirect:'manual'});
   for(const [name,value]of response.headers)if(!['set-cookie','content-encoding','content-length','transfer-encoding','connection'].includes(name))res.setHeader(name,value);
   if(response.headers.getSetCookie().length)res.setHeader('Set-Cookie',response.headers.getSetCookie());res.writeHead(response.status);if(response.body)for await(const chunk of response.body)res.write(chunk);res.end();
  }catch{res.writeHead(500);res.end('Fixture server failed');}
 });await new Promise(r=>server.listen(3192,'127.0.0.1',r));
 try{
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.origin===${JSON.stringify(origin)})sessionStorage.setItem('aa.scout.introduction.v1','1')`});
  const booking=()=>until("!!document.querySelector('#consultation-booking[open]')&&!!document.querySelector('#consultation-booking input[name=name]')&&!document.querySelector('#consultation-booking fieldset').disabled");
  const click=selector=>ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const closeBooking=async()=>{await click('#consultation-booking button[aria-label="Close consultation booking"]');await until("!document.querySelector('#consultation-booking[open]')");};
  const set=async(selector,value)=>ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  const formSelector='#consultation-booking';
  const fill=async()=>{await set(formSelector+' input[name=date]','2026-11-16');await until("document.querySelectorAll('#consultation-booking select[name=time] option').length>1&&!document.querySelector('#consultation-booking fieldset').disabled");await set(formSelector+' select[name=timezone]','America/Costa_Rica');const start=await ev("document.querySelector('#consultation-booking select[name=time] option:nth-child(2)').value");await set(formSelector+' select[name=time]',start);await set(formSelector+' input[name=name]','Booking Test');await set(formSelector+' input[name=email]','visitor@example.invalid');return start;};
  for(const width of [1440,390]){
   f.records.clear();f.events.clear();f.leads.clear();f.busy=[];messages=[];posts=0;
   await send('Network.clearBrowserCookies');await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width===390});await nav('/');
   if(width===390)await click('.menu-toggle');await click('#main-navigation a.header-cta');await booking();
   check(await ev("location.pathname==='/'&&document.querySelectorAll('#consultation-booking').length===1"),'Header opens one shared modal without navigation '+width);await closeBooking();
   check(await ev(width===390?"document.activeElement.matches('.menu-toggle')":"document.activeElement.matches('#main-navigation a.header-cta')"),'Closing restores visible header control focus '+width);
   for(const path of ['/ai-solutions','/salesforce','/custom-applications']){await nav(path);await click('main a.button[href="/book"]');await booking();check(await ev(`location.pathname===${JSON.stringify(path)}`),'Service CTA opens shared modal '+path+' '+width);await closeBooking();}
   await nav('/book');await click('main button.button');await booking();check(await ev("!document.querySelector('#consultation-booking input[type=password]')"),'Direct book page requires no account '+width);await closeBooking();
   await nav('/');await until("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')");await click('[aria-label="Open Scout, AI Architecture Guide"]');await until("!!document.querySelector('#scout-panel[open]')&&!document.querySelector('#scout-draft').disabled");
   await set('#scout-draft','Discuss a project');await ev("document.querySelector('#scout-panel form').requestSubmit()");await until("!!document.querySelector('#scout-panel [role=log] a[href=\"/book\"]')&&!document.querySelector('#scout-draft').disabled");await click('#scout-panel [role=log] a[href="/book"]');await booking();check(true,'Scout invitation opens same booking modal '+width);await closeBooking();
   const scoutBook="[...document.querySelectorAll('#scout-panel button')].find(b=>b.textContent==='Book Consultation')";await ev(scoutBook+'.click()');await booking();check(await ev("document.querySelector('#scout-panel[open]')!==null&&document.querySelectorAll('#scout-panel [role=log] [data-message-role]').length===2"),'Fixed Scout action keeps conversation mounted and intact '+width);
   await fill();check(await ev("document.querySelector('#consultation-booking select[name=time] option:nth-child(2)').textContent.includes('8:00')"),'Appointment display converts business time to visitor timezone '+width);
   await set(formSelector+' input[name=email]','invalid-email');await ev("document.querySelector('#consultation-booking form').requestSubmit()");check(posts===0&&f.events.size===0,'Invalid email cannot submit '+width);await set(formSelector+' input[name=email]','visitor@example.invalid');
   await ev("document.querySelector('#consultation-booking form').requestSubmit()");check(posts===0,'Explicit appointment confirmation is required '+width);
   await set(formSelector+' input[name=name]','   ');await click(formSelector+' input[type=checkbox]');await ev("document.querySelector('#consultation-booking form').requestSubmit()");await until("!!document.querySelector('#consultation-booking [role=alert]')&&!document.querySelector('#consultation-booking fieldset').disabled");check(f.events.size===0,'Server rejects whitespace name and lets visitor correct it '+width);
   await set(formSelector+' input[name=name]','Booking Test');await ev("document.querySelector('#consultation-booking form').requestSubmit();document.querySelector('#consultation-booking form').requestSubmit()");await until("document.querySelector('#consultation-booking').textContent.includes('Your consultation is confirmed')");
   check(f.events.size===1&&f.records.size===1&&f.leads.size===1&&posts===2,'Double submit creates one event, one lead and one reservation '+width);
   check(await ev("document.querySelector('#consultation-booking a').href.startsWith('https://meet.google.com/')&&document.querySelector('#consultation-booking').textContent.includes('America/Costa_Rica')"),'Confirmation shows real fixture event Meet link and timezone '+width);await closeBooking();
   check(await ev("document.querySelectorAll('#scout-panel [role=log] [data-message-role]').length===2"),'Booking leaves Scout transcript unchanged '+width);
   await nav('/book');f.records.clear();f.events.clear();f.leads.clear();await click('main button.button');await booking();await fill();f.failFinish=true;await click(formSelector+' input[type=checkbox]');await ev("document.querySelector('#consultation-booking form').requestSubmit()");await until("document.querySelector('#consultation-booking').textContent.includes('checking the result of your booking')");check(f.events.size===1&&!await ev("document.querySelector('#consultation-booking').textContent.includes('Your consultation is confirmed')"),'Persistence interruption never displays fake success '+width);
   await ev("document.querySelector('#consultation-booking form').requestSubmit()");await until("document.querySelector('#consultation-booking').textContent.includes('Your consultation is confirmed')");check(f.events.size===1,'Retry reconciles existing event without duplicate '+width);await closeBooking();
   await nav('/book');await click('main button.button');await booking();await fill();await ev("Promise.all(document.querySelector('#consultation-booking').getAnimations().map(a=>a.finished.catch(()=>{})))");
   check(await ev("(()=>{const p=document.querySelector('#consultation-booking'),r=p.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&p.scrollWidth<=p.clientWidth})()"),'Modal fits desktop/mobile without clipping '+width);await shot('booking-form-'+width);
   await ev("document.querySelector('#consultation-booking button[aria-label=\"Close consultation booking\"]').focus()");for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});check(await ev("document.activeElement.matches('#consultation-booking input[type=checkbox]')"),'Keyboard focus stays inside booking modal '+width);await closeBooking();
  }
  enabled=false;await nav('/book');await click('main button.button');await until("document.querySelector('#consultation-booking').textContent.includes('Online booking is not available yet')");check(await ev("document.querySelector('#consultation-booking fieldset').disabled&&document.querySelector('#consultation-booking button[type=submit]').disabled&&document.querySelectorAll('#consultation-booking select[name=time] option').length===1"),'Disabled review shows full form, no selectable slots or submission');
  check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No unexpected failed requests');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,out}));
 }finally{await new Promise(r=>server.close(r));}
}finally{ws?.close();child.kill('SIGTERM');}
