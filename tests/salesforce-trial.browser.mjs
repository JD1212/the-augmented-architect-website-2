// Run against a local production preview: node tests/scout-booking-cta.browser.mjs http://localhost:3100
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
import {loadScoutModule} from './helpers/scout-loader.mjs';
const {salesforceCommercial:copy}=loadScoutModule('src/content/salesforce-commercial.ts');
const {parseBooking}=loadScoutModule('src/lib/booking/types.ts');
const origin=process.argv[2]||'http://localhost:3100',out=process.env.BOOKING_CTA_REVIEW_DIR||join(tmpdir(),'aa-salesforce-trial',origin.startsWith('https:')?'live':'local');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=19905','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;const abortedRequests=new Set();
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19905/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result);}if(m.method==='Network.loadingFailed'&&(m.params.canceled||m.params.errorText==='net::ERR_ABORTED'))abortedRequests.add(m.params.requestId);if(m.method==='Fetch.requestPaused')void fulfill(m.params).catch(async error=>{await sleep(50);if(/Invalid InterceptionId/.test(error.message)&&abortedRequests.has(m.params.networkId)){report.fixtureCancellations=(report.fixtureCancellations||0)+1;return;}report.errors.push({fixture:error.message});});if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.console.push(m.params.args);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)report.failedAssets.push(m.params.response.url);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const i=++id;pending.set(i,{resolve,reject});ws.send(JSON.stringify({id:i,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async expression=>{for(let i=0;i<350;i++){if(await ev(expression))return;await sleep(50)}throw Error('Timeout '+expression)};
 const check=(value,label)=>{assert(value,label);report.checks.push(label);console.log('PASS '+label)};
 const nav=async path=>{await send('Page.navigate',{url:origin+path});await until("document.readyState==='complete'&&!!document.querySelector('main')");await until("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')");await ev("document.querySelectorAll('img').forEach(i=>i.loading='eager')");await until("[...document.images].every(i=>i.complete)");};
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
 const bookingRequest=copy.trial.request;
 let messages=[],posts=[],proposals=[],resets=0,approvals=0,bookingCalls=0;
 const fresh=()=>{messages=[];posts=[];proposals=[];resets=0;approvals=0;};
 async function fulfill(event){
  const {request}=event,url=new URL(request.url);let body,type='application/json',status=200;
  if(url.pathname==='/api/scout/scheduling'){
   if(request.method==='POST'){const action=JSON.parse(request.postData);assert.equal(action.action,'approve');assert.equal(action.proposalId,'trial-fixture');approvals++;proposals[0].state='approved';body={...proposals[0]};}
   else body={enabled:true,proposals,verificationRequired:false};
  }else if(url.pathname.startsWith('/api/booking')){bookingCalls++;body={error:'No live operations in tests'};status=503;}
  else if(request.method==='DELETE'){resets++;messages=[];proposals=[];body={ok:true};}
  else if(request.method==='POST'){
   const input=JSON.parse(request.postData);posts.push(input);messages.push({id:input.clientTurnId,role:'user',content:input.message});let answer;
   if(input.message===bookingRequest)answer='Great! I can help schedule your free Salesforce sandbox trial setup. What name should I use?';
   else if(input.message.includes('visitor @ example . invalid')){
    const booking=parseBooking({requestId:crypto.randomUUID(),name:'Test Visitor',email:'visitor @ example . invalid',start:'2026-11-20T16:00:00.000Z',timezone:'America/Costa_Rica',description:copy.trial.eventTitle,confirmed:true});
    proposals=[{id:'trial-fixture',action:'book',state:'prepared',purposeLabel:copy.trial.eventTitle,name:booking.name,email:booking.email,start:booking.start,end:'2026-11-20T16:30:00.000Z',timezone:booking.timezone}];answer='Please review the Salesforce trial setup appointment and use Confirm booking.';
   }else if(input.message==='Please confirm the consultation I just approved.'&&proposals[0]?.state==='approved'){proposals[0].state='done';answer=copy.trial.preparation;}
   else answer='Thanks. What date and time would work for you?';
   messages.push({id:crypto.randomUUID(),role:'assistant',content:answer});body=JSON.stringify({type:'done',messages,expiresInMs:86400000})+'\n';type='application/x-ndjson';
  }else body={messages,busy:false,failed:null,sessionReset:false,expiresInMs:messages.length?86400000:null};
  await send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:type}],body:Buffer.from(typeof body==='string'?body:JSON.stringify(body)).toString('base64')});
 }
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Fetch.enable',{patterns:[{urlPattern:origin+'/api/scout*'},{urlPattern:origin+'/api/booking*'}]});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"sessionStorage.setItem('aa.scout.introduction.v1','1');window.__micStarts=0;window.SpeechRecognition=class{constructor(){window.__recognition=this;}start(){window.__micStarts++;this.onstart?.();}stop(){this.onend?.();}abort(){this.onend?.();}};"});
 const click=s=>ev(`document.querySelector(${JSON.stringify(s)}).click()`);
 const close=async()=>{await click('[aria-label="Minimize Scout"]');await until("!document.querySelector('#scout-panel')");};
 const set=async value=>ev(`(()=>{const e=document.querySelector('#scout-draft');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 const opened=()=>until("!!document.querySelector('#scout-panel[open] [data-scout-booking-entry]')&&!document.querySelector('#scout-draft').disabled");
 for(const width of [1440,768,390,320]){
  fresh();await send('Emulation.setDeviceMetricsOverride',{width,height:width<=390?844:1000,deviceScaleFactor:1,mobile:width<=390});await nav('/salesforce');
  check(await ev("!!document.querySelector('[data-salesforce-trial]')&&document.querySelector('[data-salesforce-trial]').textContent==='Start Free 30-Day Trial'"),'Public guided trial CTA available '+width);
  check(await ev("!document.querySelector('main').textContent.includes('Private review only')&&document.querySelector('main').textContent.includes('A free 30-minute appointment to arrange your guided evaluation together.')&&document.querySelector('#sf-commercial').textContent.includes('We build the architecture. You keep it.')"),'Guided evaluation and personally arranged setup clearly explained '+width);
  check(await ev("document.querySelector('main').textContent.includes('$10,000')&&document.querySelector('main').textContent.includes('$6,000/year')&&document.querySelectorAll('main a[href=\"/book\"]').length===2"),'Concise commercial terms and existing consultation CTAs '+width);
  check(await ev("document.querySelectorAll('[data-salesforce-trial]').length===2&&document.querySelectorAll('section[aria-labelledby=sf-commercial]').length===1"),'Two compact trial entry points and one commercial offer '+width);
  check(await ev('document.documentElement.scrollWidth===innerWidth'),'No horizontal overflow '+width);
  if([1440,390].includes(width)){await shot('trial-hero-'+width,'main > section:first-child');await shot('trial-pricing-'+width,'section[aria-labelledby=sf-commercial]');}
  await click('[aria-label="Open Scout, AI Architecture Guide"]');await until("!!document.querySelector('#scout-draft')&&!document.querySelector('#scout-draft').disabled");await set('Keep my existing draft');await close();
  await click('[data-salesforce-trial]');await opened();await until("document.activeElement.id==='scout-draft'");
  check(posts.length===1&&posts[0].message===bookingRequest,'CTA immediately sends exact standalone trial request '+width);
  check(await ev("document.querySelector('#scout-draft').value==='Keep my existing draft'"),'Existing draft is preserved and never concatenated '+width);
  check(await ev("!!document.querySelector('button[data-dictation-state=idle]')&&window.__micStarts===0"),'Microphone available without activation '+width);
  await close();await click('[data-salesforce-trial]');await opened();check(posts.length===1&&resets===0,'Repeated trial clicks preserve session and deduplicate '+width);
  await set('Tuesday works for me.');await ev("document.querySelector('#scout-draft').form.requestSubmit()");await opened();check(posts[1].message==='Tuesday works for me.','Typed message sent unchanged '+width);
  await set('');await click('button[data-dictation-state]');await until("document.querySelector('button[data-dictation-state]').dataset.dictationState==='listening'");
  const details='Friday at 10 AM Costa Rica time, visitor @ example . invalid. My name is Test Visitor.';
  await ev(`window.__recognition.onresult({results:[{0:{transcript:${JSON.stringify(details)}},isFinal:true}]})`);await click('button[data-dictation-state]');await until("document.querySelector('button[data-dictation-state]').dataset.dictationState==='idle'");
  check(await ev(`document.querySelector('#scout-draft').value===${JSON.stringify(details)}`),'Completed dictation remains editable '+width);await ev("document.querySelector('#scout-draft').form.requestSubmit()");await opened();check(posts.at(-1).message===details,'Dictated details sent without hidden prefixes '+width);
  await until("[...document.querySelectorAll('#scout-panel button')].some(b=>b.textContent==='Confirm booking')");
  check(await ev(`document.querySelector('[aria-label="Appointment confirmation"]').textContent.includes(${JSON.stringify(copy.trial.eventTitle)})&&document.querySelector('[aria-label="Appointment confirmation"]').textContent.includes('30 minutes')`),'Explicit confirmation identifies trial purpose and 30-minute duration '+width);
  check(await ev("document.querySelector('[aria-label=\"Appointment confirmation\"]').textContent.includes('visitor@example.invalid')&&!document.querySelector('[aria-label=\"Appointment confirmation\"]').textContent.includes('visitor @ example . invalid')"),'Normalized email displayed for visitor approval '+width);
  check(messages.some(m=>m.role==='user'&&m.content===details),'Original spaced dictated email preserved in history '+width);
  check(!messages.some(m=>m.content.includes("You're booked!"))&&approvals===0,'No preparation message before confirmation '+width);
  if([1440,390].includes(width)){await until("document.querySelector('#scout-panel').getAnimations().every(a=>a.playState==='finished')");await shot('trial-confirmation-'+width);}
  await ev("[...document.querySelectorAll('#scout-panel button')].find(b=>b.textContent==='Confirm booking').click()");await until(`document.querySelector('#scout-panel').textContent.includes(${JSON.stringify("You're booked!")})&&!document.querySelector('#scout-draft').disabled`);
  check(approvals===1&&messages.at(-1).content===copy.trial.preparation,'Preparation appears only after mocked confirmation '+width);
  const count=posts.length;await close();await click('section[aria-labelledby=sf-commercial] [data-salesforce-trial]');await opened();check(posts.length===count&&resets===0,'Commercial trial CTA reopens the same flow without duplicates '+width);await close();
  fresh();messages=[{id:'general',role:'user',content:"I'd like to book a free 30-minute consultation."},{id:'reply',role:'assistant',content:'What date and time works for you?'}];await nav('/salesforce');await click('[data-salesforce-trial]');await opened();check(posts.length===1&&posts[0].message===bookingRequest&&messages[0].id==='general','Trial purpose is not lost in an earlier general conversation '+width);await close();
 }
 check(bookingCalls===0,'No real booking API, calendar or email requests');check(report.errors.length===0,'No runtime errors '+JSON.stringify(report.errors));check(report.console.length===0,'No console errors '+JSON.stringify(report.console));check(report.failedAssets.length===0,'No failed assets');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,out}));
}finally{ws?.close();child.kill('SIGTERM');}
