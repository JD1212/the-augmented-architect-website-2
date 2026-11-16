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
import {randomUUID,createHash} from 'node:crypto';
import {schedulingFixture,schedulingFixtureCache} from './helpers/scheduling-fixture.mjs';
import {loadScoutModule} from './helpers/scout-loader.mjs';
const origin='http://localhost:3193',out=process.env.BOOKING_REVIEW_DIR||join(tmpdir(),'aa-scout-scheduling');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19782','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19782/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.console.push(m.params.args);if(m.method==='Network.responseReceived'&&m.params.response.status>=400&&!(m.params.response.url.includes('/api/scout/scheduling')&&m.params.response.status===400))report.failedAssets.push(m.params.response.url);};
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
 const upstream=process.argv[2]||'http://localhost:3102';assert(['http://localhost:3100','http://localhost:3102'].includes(upstream));
 const credential='s'.repeat(43),owner=createHash('sha256').update(credential).digest('hex');let f=schedulingFixture(),messages=[],chatBodies=[];
 const {schedulingHTTP}=loadScoutModule('src/lib/booking/scheduling-http.ts',{
  './scheduling-server':{schedulingEnabled:()=>true,schedulingService:()=>f.service},
  '@/lib/scout/store':{createScoutStore:()=>({find:async()=>null})},
  '@/lib/scout/request-limits':{createSharedRequestLimiter:()=>async()=>{}},
 },schedulingFixtureCache);
 const server=createServer(async(req,res)=>{
  try{let response;
   if(req.url==='/api/scout/scheduling'){
    const chunks=[];for await(const c of req)chunks.push(c);response=await schedulingHTTP(new Request(origin+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks).toString()}:{})}));
   }else if(req.url==='/api/scout'){
    if(req.method==='POST'){
     const chunks=[];for await(const c of req)chunks.push(c);const v=JSON.parse(Buffer.concat(chunks));chatBodies.push(v.message);await f.verification.blockCodeInChat(owner,v.message);
     let text;
     if(v.message==='Please cancel my consultation.'){await f.verification.request(owner,'visitor@example.invalid');text='Enter the emailed code in the secure field below.';}
     else if(v.message.includes("I've verified my email")){await f.service.appointments(owner);text='Your email is verified. Your appointment is available to manage.';}
     else if(v.message.includes('consultation I just approved')){const id=[...f.records.values()].find(r=>r.kind==='proposal'&&r.payload.state==='approved').payload.id;const result=await f.service.confirmBooking(owner,id);text=result.status==='confirmed'?'Your consultation is confirmed. Google Meet: '+result.meetUrl:'Your request is pending.';}
     else{await f.service.prepareBooking(owner,{name:'Fixture Visitor',email:'visitor@example.invalid',start:'2026-11-16T14:00:00.000Z',timezone:'America/New_York',description:''});text='Please confirm the exact appointment using the secure control below.';}
     messages.push({id:v.clientTurnId,role:'user',content:v.message},{id:randomUUID(),role:'assistant',content:text});response=new Response(JSON.stringify({type:'done',messages,expiresInMs:86400000})+'\n',{headers:{'Content-Type':'application/x-ndjson'}});
    }else response=Response.json({messages,busy:false,failed:null,sessionReset:false,expiresInMs:messages.length?86400000:null},{headers:{'Set-Cookie':`scout_session=${credential}; Path=/; HttpOnly; SameSite=Lax`}});
   }else response=await fetch(upstream+req.url,{headers:req.headers,redirect:'manual'});
   for(const [name,value]of response.headers)if(!['set-cookie','content-encoding','content-length','transfer-encoding','connection'].includes(name))res.setHeader(name,value);
   if(response.headers.getSetCookie().length)res.setHeader('Set-Cookie',response.headers.getSetCookie());res.writeHead(response.status);if(response.body)for await(const chunk of response.body)res.write(chunk);res.end();
  }catch{res.writeHead(500);res.end('Fixture request failed');}
 });await new Promise(r=>server.listen(3193,'127.0.0.1',r));
 try{
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.origin===${JSON.stringify(origin)})sessionStorage.setItem('aa.scout.introduction.v1','1')`});
  const click=s=>ev(`document.querySelector(${JSON.stringify(s)}).click()`),set=(selector,value)=>ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  const chat=async message=>{await until("!!document.querySelector('#scout-draft')&&!document.querySelector('#scout-draft').disabled");await set('#scout-draft',message);await ev("document.querySelector('#scout-draft').form.requestSubmit()");await until("!!document.querySelector('#scout-panel [role=log]')&&!document.querySelector('#scout-draft').disabled");};
  for(const width of [1440,390]){
   f=schedulingFixture();messages=[];chatBodies=[];await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width===390});await nav('/');await until("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')");await click('[aria-label="Open Scout, AI Architecture Guide"]');await chat('Please book a consultation.');await until("[...document.querySelectorAll('#scout-panel button')].some(b=>b.textContent==='Confirm booking')");
   check(f.booking.creates===0,'Preparing a proposal creates no appointment '+width);
   check(await ev("document.querySelector('#scout-panel').textContent.includes('Fixture Visitor')&&document.querySelector('#scout-panel').textContent.includes('visitor@example.invalid')&&document.querySelector('#scout-panel').textContent.includes('America/New_York')"),'Exact name/email/timezone displayed before confirmation '+width);
   await shot('scout-proposal-'+width);
   await ev("[...document.querySelectorAll('#scout-panel button')].find(b=>b.textContent==='Confirm booking').click()");await until("document.querySelector('#scout-panel').textContent.includes('Your consultation is confirmed.')&&!document.querySelector('#scout-draft').disabled");check(f.booking.creates===1,'Secure approval completes exactly one booking '+width);
   await chat('Please cancel my consultation.');await until("!!document.querySelector('#scout-verification')");const code=f.sent.at(-1).code;
   check(await ev("document.querySelector('#scout-verification').autocomplete==='one-time-code'&&document.querySelector('#scout-verification').inputMode==='numeric'"),'Dedicated accessible OTP field is outside chat '+width);
   await set('#scout-verification',code==='000000'?'111111':'000000');await ev("document.querySelector('#scout-verification').form.requestSubmit()");await until("!!document.querySelector('#scout-panel [role=alert]')");check(true,'Incorrect code is recoverable '+width);
   await set('#scout-verification',code);await shot('scout-verification-'+width);await ev("document.querySelector('#scout-verification').form.requestSubmit()");await until("document.querySelector('#scout-panel').textContent.includes('Your email is verified.')&&!document.querySelector('#scout-draft').disabled");
   check(!chatBodies.some(body=>body.includes(code))&&!JSON.stringify(messages).includes(code),'OTP never enters model messages or transcript '+width);
   check(await ev("(()=>{const p=document.querySelector('#scout-panel'),r=p.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1&&p.scrollWidth<=p.clientWidth})()"),'Approved portrait panel remains within viewport '+width);
   await click('[aria-label="Minimize Scout"]');await until("!document.querySelector('#scout-panel')");
  }
  check(report.errors.length===0,'No browser runtime errors');check(report.console.length===0,'No browser console errors');check(report.failedAssets.length===0,'No unexpected failed assets or requests: '+JSON.stringify(report.failedAssets));await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,out}));
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
}finally{ws?.close();child.kill('SIGTERM');}
