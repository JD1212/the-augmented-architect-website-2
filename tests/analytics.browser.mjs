// Positive local cases require a production-mode fixture build: VERCEL_ENV=production npm run build -- --webpack
// All Google and application API requests in this suite are mocked; no real analytics or bookings are sent.
// Run against a local production preview: node tests/analytics.browser.mjs http://localhost:3105
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
const origin=process.argv[2]||'http://localhost:3105',out=process.env.ANALYTICS_REVIEW_DIR||join(tmpdir(),'aa-analytics',origin.startsWith('https:')?'live':'local');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=19907','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;const abortedRequests=new Set();
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19907/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
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
 let messages=[],proposals=[],googleRequests=[],bookingPosts=0,bookingId='',requestIds=[];
 const proposalId='140f425d-6c10-4553-8f35-4df5ad866123';
 async function fulfill(event){
  const {request}=event,url=new URL(request.url);let body,type='application/json',status=200;
  if(url.hostname.endsWith('googletagmanager.com')||url.hostname.endsWith('google-analytics.com')){googleRequests.push(url.href);body='window.__analyticsFixtureLoaded=true;';type='application/javascript';}
  else if(url.pathname==='/api/booking'){
   if(request.method==='POST'){bookingPosts++;const input=JSON.parse(request.postData);bookingId=input.requestId;requestIds.push(input.requestId);body=bookingPosts===1?{status:'pending'}:{status:'confirmed',start:input.start,end:'2027-01-18T16:30:00.000Z',timezone:'UTC',meetUrl:'https://meet.google.com/fixture-only'};}
   else body={timezone:'America/Costa_Rica',today:'2027-01-01',initialDate:'2027-01-18',lastDate:'2027-02-18',slots:url.search?[{start:'2027-01-18T16:00:00.000Z',end:'2027-01-18T16:30:00.000Z'}]:[]};
  }else if(url.pathname==='/api/scout/scheduling'){
   if(request.method==='POST'){const input=JSON.parse(request.postData);if(input.action==='approve')proposals=proposals.map(p=>p.id===input.proposalId?{...p,state:'approved'}:p);body=proposals.find(p=>p.id===input.proposalId);}
   else body={enabled:true,proposals,verificationRequired:false};
  }else if(request.method==='POST'){
   const input=JSON.parse(request.postData);messages.push({id:input.clientTurnId,role:'user',content:input.message});
   proposals=proposals.map(p=>p.state==='approved'?{...p,state:'done',result:{status:'confirmed',start:p.start,meetUrl:'https://meet.google.com/fixture-only'}}:p);
   messages.push({id:crypto.randomUUID(),role:'assistant',content:'Please use the existing secure appointment controls.'});
   body=JSON.stringify({type:'done',messages,expiresInMs:86400000})+'\n';type='application/x-ndjson';
  }else body={messages,busy:false,failed:null,sessionReset:false,expiresInMs:messages.length?86400000:null};
  await send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:type}],body:Buffer.from(typeof body==='string'?body:JSON.stringify(body)).toString('base64')});
 }
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Fetch.enable',{patterns:[{urlPattern:origin+'/api/*'},{urlPattern:'https://*.googletagmanager.com/*'},{urlPattern:'https://*.google-analytics.com/*'}]});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(navigator,'webdriver',{configurable:true,get:()=>false});sessionStorage.setItem('aa.scout.introduction.v1','1');"});
 const click=s=>ev(`document.querySelector(${JSON.stringify(s)}).click()`);
 const button=label=>ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`);
 const events=()=>ev("Array.from(window.dataLayer||[],c=>Array.from(c)).filter(c=>c[0]==='event')");
 const count=async name=>(await events()).filter(c=>c[1]===name).length;
 const accept=async()=>{await until("!!document.querySelector('#analytics-consent-title')");await button('Allow analytics');await until("window.__analyticsFixtureLoaded===true");};
 const set=async(selector,value)=>ev(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 const closeScout=async()=>{if(await ev("!!document.querySelector('#scout-panel')")){await click('[aria-label="Minimize Scout"]');await until("!document.querySelector('#scout-panel')");}};
 for(const width of [1440,390]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width===390});
  await nav('/about');await ev('localStorage.clear();sessionStorage.clear()');messages=[];proposals=[];googleRequests=[];bookingPosts=0;requestIds=[];await nav('/about');
  await until("!!document.querySelector('#analytics-consent-title')");await sleep(250);
  check(googleRequests.length===0&&!await ev("!!document.querySelector('script[src*=googletagmanager]')"),'No tag or Google request before consent '+width);
  check(await ev("(()=>{const r=document.querySelector('#analytics-consent-title').parentElement.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&(()=>{const a=document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]').getBoundingClientRect();return r.right<=a.left||r.bottom<=a.top-8})()&&[...document.querySelectorAll('#analytics-consent-title~div button')].every(b=>b.getBoundingClientRect().height>=44)})()"),'Accessible consent panel fits viewport '+width);await shot('consent-'+width);
  await button('Decline analytics');await nav('/ai-solutions');check(googleRequests.length===0,'Declined navigation and refresh have no Google requests '+width);
  await button('Privacy preferences');await until("document.activeElement.id==='analytics-consent-title'");check(true,'Preferences focus is accessible '+width);await accept();
  check(googleRequests.length===1&&googleRequests[0].includes('id=G-STBZV24WWN'),'Exactly one tag with approved ID after consent '+width);
  check(await count('page_view')===1,'Exactly one initial consented page view '+width);
  const commands=await ev('Array.from(window.dataLayer,c=>Array.from(c))');check(commands[0][0]==='consent'&&commands[0][1]==='default'&&Object.values(commands[0][2]).every(v=>v==='denied')&&commands.find(c=>c[0]==='config')[2].send_page_view===false,'Consent v2 defaults precede config; automatic page views off '+width);
  await click('#main-navigation a[href="/salesforce"]');await until("location.pathname==='/salesforce'");await sleep(200);check(await count('page_view')===2&&googleRequests.length===1,'Soft navigation adds one view and no duplicate tag '+width);
  await ev("history.pushState({},'',location.pathname+'?email=private@example.invalid#secret')");await sleep(150);check(await count('page_view')===2,'Query/hash-only changes do not add views '+width);
  await until("Array.from(window.dataLayer||[],c=>Array.from(c)).some(c=>c[0]==='event'&&c[1]==='service_engagement')");check(await count('service_engagement')===1,'Ten foreground seconds produce one service engagement '+width);
  await click('[aria-label="Open Scout, AI Architecture Guide"]');await until("!!document.querySelector('#scout-draft')&&!document.querySelector('#scout-draft').disabled");await closeScout();await click('.site-footer a[href="/book"]');await until("!!document.querySelector('[data-scout-booking-entry]')&&!document.querySelector('#scout-draft').disabled");await click('.site-footer a[href="/book"]');await sleep(150);
  check(await count('scout_open')===1&&await count('consultation_start')===1,'Explicit Scout and consultation starts deduplicate '+width);
  check(await count('consultation_booked')===0,'Opening or preparing booking is not a conversion '+width);
  await click('[data-scout-booking-entry] button');await until("!!document.querySelector('#consultation-booking[open] button[data-slot]')");await set('#consultation-booking input[name=name]','Private Visitor');await set('#consultation-booking input[name=email]','private@example.invalid');await set('#consultation-booking textarea','Confidential project details');await click('#consultation-booking button[data-slot]');await click('#consultation-booking input[type=checkbox]');await ev("document.querySelector('#consultation-booking form').requestSubmit()");await until("document.querySelector('#consultation-booking button[type=submit]')?.textContent==='Check booking status'&&!document.querySelector('#consultation-booking button[type=submit]').disabled");check(await count('consultation_booked')===0,'Pending booking result is not a conversion '+width);await ev("document.querySelector('#consultation-booking form').requestSubmit()");await until("!!document.querySelector('#consultation-booking a[href*=fixture-only]')");
  check(await count('consultation_booked')===1&&bookingPosts===2&&requestIds[0]===requestIds[1],'Authoritative manual confirmation emits one conversion '+width);await click('#consultation-booking button[aria-label="Close consultation booking"]');await closeScout();
  proposals=[{id:proposalId,action:'book',state:'prepared',name:'Private Visitor',email:'private@example.invalid',start:'2027-01-18T16:00:00.000Z',end:'2027-01-18T16:30:00.000Z',timezone:'UTC'}];
  await click('[aria-label="Open Scout, AI Architecture Guide"]');await until("!!document.querySelector('#scout-draft')&&!document.querySelector('#scout-draft').disabled");await set('#scout-draft','Please check availability');await ev("document.querySelector('#scout-draft').form.requestSubmit()");await until("[...document.querySelectorAll('#scout-panel button')].some(b=>b.textContent==='Confirm booking')");
  check(await count('consultation_booked')===1,'Prepared Scout proposal does not emit a conversion '+width);await button('Confirm booking');await until("!document.querySelector('#scout-draft').disabled&&![...document.querySelectorAll('#scout-panel button')].some(b=>b.textContent==='Confirm booking')");await sleep(150);
  check(await count('consultation_booked')===2,'Confirmed Scout backend outcome emits one conversion '+width);
  await set('#scout-draft','Thank you');await ev("document.querySelector('#scout-draft').form.requestSubmit()");await until("!document.querySelector('#scout-draft').disabled");await sleep(150);check(await count('consultation_booked')===2,'Repeated snapshots do not duplicate confirmed conversions '+width);
  const serialized=JSON.stringify(await ev('Array.from(window.dataLayer,c=>Array.from(c))'));
  check(![bookingId,proposalId,'private@example.invalid','Private Visitor','Confidential project details','2027-01-18','meet.google.com','secret'].some(value=>serialized.includes(value)),'No private visitor, booking, message, URL or identifier data in analytics '+width);
  await closeScout();const beforeRefresh=googleRequests.length;await nav('/salesforce');await until("window.__analyticsFixtureLoaded===true");check(googleRequests.length===beforeRefresh+1&&await count('page_view')===1&&await count('consultation_booked')===0,'Saved grant refresh loads once without replaying conversions '+width);
  await click('[aria-label="Open Scout, AI Architecture Guide"]');await until("!!document.querySelector('#scout-panel[open]')");await sleep(150);if(await ev("[...document.querySelectorAll('#scout-panel button')].some(b=>b.textContent==='Continue previous conversation')"))await button('Continue previous conversation');await until("!!document.querySelector('#scout-draft')&&!document.querySelector('#scout-draft').disabled");check(await count('scout_open')===0,'Explicit reopens remain deduplicated across refresh '+width);
  await closeScout();const before=googleRequests.length;await ev("document.cookie='_ga=fixture; Path=/';document.cookie='essential_fixture=keep; Path=/'");await button('Privacy preferences');await button('Decline analytics');await until("document.readyState==='complete'&&!document.querySelector('script[src*=googletagmanager]')");await sleep(300);
  check(googleRequests.length===before&&!await ev("document.cookie.split(';').some(c=>c.trim().startsWith('_ga='))")&&await ev("document.cookie.includes('essential_fixture=keep')"),'Withdrawal unloads tag, clears GA cookie, retains essential storage '+width);
  check(await ev('document.documentElement.scrollWidth===innerWidth'),'No page overflow '+width);
  if(width===1440)for(const [property,value] of [['webdriver',true],['globalPrivacyControl',true],['doNotTrack','1']]){
   const beforeBlocked=googleRequests.length;
   const script=await send('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,${JSON.stringify(property)},{configurable:true,get:()=>${JSON.stringify(value)}});localStorage.setItem('aa.analytics.consent.v1',JSON.stringify({version:1,choice:'granted',expires:Date.now()+86400000}));`});
   await nav('/about');await sleep(200);check(googleRequests.length===beforeBlocked&&!await ev("!!document.querySelector('script[src*=googletagmanager]')"),'Browser privacy / automation setting suppresses even a saved grant '+property);
   await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script.identifier});
  }

 }
 check(report.errors.length===0,'No runtime errors '+JSON.stringify(report.errors));check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed assets');
 await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,out,realAppointments:0,realGoogleEvents:0}));
}finally{ws?.close();child.kill('SIGTERM');}
