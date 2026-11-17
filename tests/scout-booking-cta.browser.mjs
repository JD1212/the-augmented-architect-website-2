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
const origin=process.argv[2]||'http://localhost:3100',out=process.env.BOOKING_CTA_REVIEW_DIR||join(tmpdir(),'aa-booking-cta',origin.startsWith('https:')?'live':'local');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=19902','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;const abortedRequests=new Set();
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19902/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result);}if(m.method==='Network.loadingFailed'&&(m.params.canceled||m.params.errorText==='net::ERR_ABORTED'))abortedRequests.add(m.params.requestId);if(m.method==='Fetch.requestPaused')void fulfill(m.params).catch(async error=>{await sleep(50);if(/Invalid InterceptionId/.test(error.message)&&abortedRequests.has(m.params.networkId)){report.fixtureCancellations=(report.fixtureCancellations||0)+1;return;}report.errors.push({fixture:error.message});});if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.console.push(m.params.args);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)report.failedAssets.push(m.params.response.url);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const i=++id;pending.set(i,{resolve,reject});ws.send(JSON.stringify({id:i,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async expression=>{for(let i=0;i<350;i++){if(await ev(expression))return;await sleep(50)}throw Error('Timeout '+expression)};
 const check=(value,label)=>{assert(value,label);report.checks.push(label);console.log('PASS '+label)};
 const nav=async path=>{await send('Page.navigate',{url:origin+path});await until("document.readyState==='complete'&&!!document.querySelector('main')");await ev("document.querySelectorAll('img').forEach(i=>i.loading='eager')");await until("[...document.images].every(i=>i.complete)");await until("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')");};
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
 const bookingRequest="I'd like to book a free 30-minute consultation.";
 let messages=[],posts=[],resets=0,proposals=[],sideEffects=0,replyDelay=0,failNext=false;
 async function fulfill(event){
  const {request}=event,url=new URL(request.url);let body,type='application/json',status=200;
  if(url.pathname==='/api/scout/scheduling'){if(request.method==='POST')sideEffects++;body={enabled:true,proposals,verificationRequired:false};}
  else if(url.pathname.startsWith('/api/booking')){if(request.method==='POST')sideEffects++;status=503;body={error:'Read-only fixture: no appointment or invitation is created.'};}
  else if(request.method==='DELETE'){resets++;messages=[];proposals=[];body={ok:true};}
  else if(request.method==='POST'){
   const input=JSON.parse(request.postData);posts.push(input);
   if(failNext){failNext=false;status=503;body={error:'Synthetic reply failure; retry is safe.'};}
   else{
    const complete=/alex@example.invalid/i.test(input.message)&&/Friday|Tuesday/i.test(input.message);
    if(complete)proposals=[{id:'fixture-proposal',action:'book',state:'prepared',name:'Alex',email:'alex@example.invalid',start:'2026-11-20T16:00:00.000Z',timezone:'America/Costa_Rica'}];
    messages.push({id:input.clientTurnId,role:'user',content:input.message});await sleep(replyDelay);
    messages.push({id:crypto.randomUUID(),role:'assistant',content:complete?'Please confirm the exact appointment using the secure control.':input.message===bookingRequest?'What is your name, email address, and preferred date and time?':'What kind of business do you run?'});
    body=JSON.stringify({type:'done',messages,expiresInMs:86400000})+'\n';type='application/x-ndjson';
   }
  }else body={messages,busy:false,failed:null,sessionReset:false,expiresInMs:messages.length?86400000:null};
  await send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:type}],body:Buffer.from(typeof body==='string'?body:JSON.stringify(body)).toString('base64')});
 }
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Fetch.enable',{patterns:[{urlPattern:origin+'/api/scout*'},{urlPattern:origin+'/api/booking*'}]});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"window.__micStarts=0;window.SpeechRecognition=class{constructor(){window.__recognition=this;}start(){window.__micStarts++;this.onstart?.();}stop(){this.onend?.();}abort(){this.onend?.();}};"});
 const click=s=>ev(`document.querySelector(${JSON.stringify(s)}).click()`);
 const close=async()=>{await click('[aria-label="Minimize Scout"]');await until("!document.querySelector('#scout-panel')");};
 const set=async value=>ev(`(()=>{const e=document.querySelector('#scout-draft');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 const opened=()=>until("!!document.querySelector('#scout-panel[open] [data-scout-booking-entry]')&&!document.querySelector('#scout-draft').disabled");
 const checkEntry=async label=>{
  await opened();await until("document.activeElement.id==='scout-draft'");
  check(posts.length===1&&posts[0].message===bookingRequest&&messages[0].content===bookingRequest,'Immediate standalone request, exactly once '+label);
  check(await ev("!!document.querySelector('button[data-dictation-state=idle]')&&window.__micStarts===0&&!document.querySelector('[data-scout-waveform]')"),'Mic available without automatic activation '+label);
  check(resets===0&&sideEffects===0,'Existing session retained; no appointment or email '+label);
 };
 const fresh=()=>{messages=[];posts=[];resets=0;proposals=[];replyDelay=0;failNext=false;};
 const paths=['/','/ai-solutions','/salesforce','/custom-applications','/our-approach','/our-approach/philosophy','/our-approach/ai-architecture','/our-approach/salesforce','/about','/contact','/book'];
 for(const width of [1440,390]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width===390});
  for(const path of paths){fresh();await nav(path);
   if(width===390)await click('.menu-toggle');await click('#main-navigation a[href="/book"]');await checkEntry('header '+path+' '+width);
   check(await ev(`location.pathname===${JSON.stringify(path)}&&!document.querySelector('.navigation.is-open')&&!document.querySelector('#consultation-booking[open]')`),'CTA stays on page and closes mobile menu '+path+' '+width);
   await click('#main-navigation a[href="/book"]');await checkEntry('repeat '+path+' '+width);await close();
   await click('.site-footer a[href="/book"]');await checkEntry('footer '+path+' '+width);await close();
   const count=await ev("document.querySelectorAll('main a[href=\"/book\"]').length");for(let i=0;i<count;i++){await ev(`document.querySelectorAll('main a[href="/book"]')[${i}].click()`);await checkEntry('page CTA '+i+' '+path+' '+width);await close();}
   if(path==='/book'){await click('main button.button');await checkEntry('direct booking page '+width);await close();}
   if(path==='/contact'){await until("!!document.querySelector('.consultation-dock a[href=\"/book\"]')");await click('.consultation-dock a[href="/book"]');await checkEntry('floating CTA '+width);await close();}
   if(['/ai-solutions','/salesforce','/custom-applications'].includes(path)){
    await click('[data-faq-launcher]');await until("!!document.querySelector('[data-service-faq-dialog][open]')");await click('[data-service-faq-dialog] a[href="/book"]');await checkEntry('FAQ CTA '+path+' '+width);
    check(await ev("!document.querySelector('[data-service-faq-dialog][open]')&&document.querySelectorAll('dialog[open]').length===1"),'FAQ closes when Scout opens '+path+' '+width);await close();
   }
  }
  fresh();await nav('/about');await click('[aria-label="Open Scout, AI Architecture Guide"]');await until("!!document.querySelector('#scout-draft')&&!document.querySelector('#scout-draft').disabled");await set('Unsent business question');await close();
  replyDelay=300;await click('.site-footer a[href="/book"]');await until("!!document.querySelector('#scout-draft')&&document.querySelector('#scout-draft').disabled");await click('.site-footer a[href="/book"]');await checkEntry('repeated while sending '+width);
  check(await ev("document.querySelector('#scout-draft').value==='Unsent business question'"),'CTA preserves existing draft without submitting or mixing it '+width);
  await until("document.querySelector('#scout-panel').getAnimations().every(a=>a.playState==='finished')");
  check(await ev("(()=>{const p=document.querySelector('#scout-panel'),r=p.getBoundingClientRect();return p.offsetWidth===Math.min(360,innerWidth-24)&&p.offsetHeight===600&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&p.scrollWidth<=p.clientWidth})()"),'Approved panel size and no overflow '+width);await shot('scout-booking-request-'+width);
  await set('');await click('button[data-dictation-state]');await until("document.querySelector('button[data-dictation-state]').dataset.dictationState==='listening'");
  const details='Friday at 10 AM, Pacific Time. alex@example.invalid — my name is Alex.';
  await ev(`window.__recognition.onresult({results:[{0:{transcript:${JSON.stringify(details)}},isFinal:true}]})`);await click('button[data-dictation-state]');await until("document.querySelector('button[data-dictation-state]').dataset.dictationState==='idle'");
  check(await ev(`document.querySelector('#scout-draft').value===${JSON.stringify(details)}`),'Completed dictated details remain editable and unchanged '+width);
  await ev("document.querySelector('#scout-draft').form.requestSubmit()");await opened();
  check(posts.length===2&&posts[1].message===details,'Next dictated message has no hidden prefix '+width);
  await until("[...document.querySelectorAll('#scout-panel button')].some(b=>b.textContent==='Confirm booking')");check(sideEffects===0,'Exact appointment requires existing secure confirmation '+width);await shot('scout-booking-details-'+width);
  const before=JSON.stringify(messages);await close();await click('.site-footer a[href="/book"]');await opened();check(JSON.stringify(messages)===before&&posts.length===2&&resets===0,'Active flow reopens without restarting or duplicating intent '+width);await close();
  await nav('/about');await click('[aria-label="Open Scout, AI Architecture Guide"]');await until("[...document.querySelectorAll('#scout-panel button')].some(b=>b.textContent==='Continue previous conversation')");check(await ev("!document.querySelector('#scout-panel [role=log]')"),'Return privacy choice still hides history before an action '+width);await close();
  await click('.site-footer a[href="/book"]');await opened();check(JSON.stringify(messages)===before&&posts.length===2&&resets===0,'Explicit booking CTA restores the same session without duplicate execution '+width);
  await ev("[...document.querySelectorAll('#scout-panel button')].find(b=>b.textContent==='New Conversation').click()");await until("!document.querySelector('#scout-panel [role=log]')&&!document.querySelector('#scout-draft').disabled");await click('.site-footer a[href="/book"]');await opened();check(resets===1&&posts.length===3&&messages.length===2&&posts[2].message===bookingRequest,'Explicit New Conversation permits one new standalone request '+width);await close();
  // Existing business discovery must yield to a new, separate booking turn.
  fresh();messages=[{id:'known',role:'user',content:"I'd like to schedule a free 30-minute consultation.\n\nMy name is Alex; alex@example.invalid. We need software."},{id:'discovery',role:'assistant',content:'What kind of business do you run?'}];const history=JSON.stringify(messages);
  await nav('/about');await click('.site-footer a[href="/book"]');await opened();check(posts.length===1&&posts[0].message===bookingRequest&&JSON.stringify(messages.slice(0,2))===history&&resets===0,'Booking switches from discovery with existing details and history intact '+width);await close();
  fresh();messages=[{id:'prior',role:'user',content:'Please book a consultation.'},{id:'reply',role:'assistant',content:'What date and time would you prefer?'}];await nav('/about');await click('.site-footer a[href="/book"]');await opened();check(posts.length===0&&resets===0,'Existing direct booking flow only reopens and focuses '+width);await close();
  // Keep normal one-turn-at-a-time execution; booking is the next queued intent.
  fresh();await nav('/about');await click('[aria-label="Open Scout, AI Architecture Guide"]');await until("!!document.querySelector('#scout-draft')&&!document.querySelector('#scout-draft').disabled");replyDelay=700;await set('We need software for a service business.');await ev("document.querySelector('#scout-draft').form.requestSubmit()");await until("document.querySelector('#scout-draft').disabled");await click('.site-footer a[href="/book"]');await opened();check(posts.length===2&&posts[1].message===bookingRequest,'Booking requested during an in-flight reply runs next, without overlapping execution '+width);await close();
  fresh();await nav('/about');await click('[aria-label="Open Scout, AI Architecture Guide"]');await until("!!document.querySelector('#scout-draft')&&!document.querySelector('#scout-draft').disabled");await set('Keep my unsent draft');await close();failNext=true;await click('.site-footer a[href="/book"]');await until("[...document.querySelectorAll('#scout-panel button')].some(b=>b.textContent==='Retry reply')");await click('.site-footer a[href="/book"]');await sleep(150);check(posts.length===1&&await ev("document.querySelector('#scout-draft').value==='Keep my unsent draft'"),'Failed booking request preserves draft and does not auto-repeat '+width);await ev("[...document.querySelectorAll('#scout-panel button')].find(b=>b.textContent==='Retry reply').click()");await opened();check(posts.length===2&&posts[0].clientTurnId===posts[1].clientTurnId&&messages.length===2&&await ev("document.querySelector('#scout-draft').value==='Keep my unsent draft'"),'Explicit retry reuses turn ID and preserves draft '+width);await close();
  fresh();await nav('/about');await click('.site-footer a[href="/book"]');await opened();await click('[data-scout-booking-entry] button');await until("!!document.querySelector('#consultation-booking[open]')");check(await ev("!!document.querySelector('#scout-panel[open]')"),'Manual form remains an explicit fallback '+width);await click('#consultation-booking button[aria-label="Close consultation booking"]');await until("!document.querySelector('#consultation-booking[open]')");await close();
  fresh();await nav('/about');await click('[aria-label="Open Scout, AI Architecture Guide"]');await until("document.querySelectorAll('#scout-panel [role=group] button').length===4");await ev("[...document.querySelectorAll('#scout-panel [role=group] button')].find(b=>b.textContent.includes('Book a free consultation')).click()");await checkEntry('welcome booking suggestion '+width);await close();
 }
 check(sideEffects===0,'No booking or email side effects submitted');check(report.errors.length===0,'No runtime errors: '+JSON.stringify(report.errors));check(report.console.length===0,'No console errors: '+JSON.stringify(report.console));
 check(report.failedAssets.every(url=>['/api/booking','/api/scout'].includes(new URL(url).pathname)),'Only intentional failure fixtures, no failed assets');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,out}));
}finally{ws?.close();child.kill('SIGTERM');}
