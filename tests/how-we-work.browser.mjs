// Run against a local production preview: node tests/how-we-work.browser.mjs http://localhost:3100
// Set CHROME_BIN if Chromium is not installed in a standard browser/Playwright location.
import {spawn} from 'node:child_process';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
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
const origin=process.argv[2]||'http://localhost:3100',out=process.env.HOW_WE_WORK_REVIEW_DIR||join(tmpdir(),'aa-how-we-work',origin.startsWith('https:')?'live':'local');await mkdir(out,{recursive:true});
const protection=process.env.VERCEL_PROTECTED==='1'?readFileSync('.vercel/marketing-oidc-token','utf8').trim():null;
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=19927','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;const abortedRequests=new Set();
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19927/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
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
  if(!url.pathname.startsWith('/api/scout')&&!url.pathname.startsWith('/api/booking')){const headers=Object.entries(request.headers).map(([name,value])=>({name,value}));if(protection&&url.origin===origin)headers.push({name:'x-vercel-trusted-oidc-idp-token',value:protection});return send('Fetch.continueRequest',{requestId:event.requestId,headers});}
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
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Fetch.enable',{patterns:[{urlPattern:origin+'/*'}]});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('aa.analytics.consent.v1',JSON.stringify({version:1,choice:'denied',expires:Date.now()+86400000}));window.__micStarts=0;window.SpeechRecognition=class{constructor(){window.__recognition=this;}start(){window.__micStarts++;this.onstart?.();}stop(){this.onend?.();}abort(){this.onend?.();}};"});
 const click=s=>ev(`document.querySelector(${JSON.stringify(s)}).click()`);
 const close=async()=>{await click('[aria-label="Minimize Scout"]');await until("!document.querySelector('#scout-panel')");};
 const opened=()=>until("!!document.querySelector('#scout-panel[open] [data-scout-booking-entry]')&&!document.querySelector('#scout-draft').disabled");
 const checkEntry=async label=>{
  await opened();await until("document.activeElement.id==='scout-draft'");
  check(posts.length===1&&posts[0].message===bookingRequest&&messages[0].content===bookingRequest,'Immediate standalone request, exactly once '+label);
  check(await ev("!!document.querySelector('button[data-dictation-state=idle]')&&window.__micStarts===0&&!document.querySelector('[data-scout-waveform]')"),'Mic available without automatic activation '+label);
  check(resets===0&&sideEffects===0,'Existing session retained; no appointment or email '+label);
 };
 const fresh=()=>{messages=[];posts=[];resets=0;proposals=[];replyDelay=0;failNext=false;};

 for(const width of [1440,1366,1361,1281,1280,1191,1100,1051,768,390,320]){
  fresh();await send('Emulation.setDeviceMetricsOverride',{width,height:width<600?844:1000,deviceScaleFactor:1,mobile:width<600});await nav('/how-we-work');
  const label=width+'px';
  check(await ev("document.querySelectorAll('main h1').length===1&&document.querySelectorAll('main h2').length===5"),'Semantic heading hierarchy '+label);
  check(await ev("document.querySelectorAll('main nav[aria-label=\"The engagement journey\"] li').length===6&&document.querySelectorAll('main #your-journey>ol>li').length===6"),'Six linked journey stages '+label);
  check(await ev("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.site-content').scrollWidth<=innerWidth&&[...document.querySelectorAll('main section,main nav')].every(e=>e.getBoundingClientRect().right<=innerWidth+1)"),'No horizontal overflow '+label);
  const header=await ev("(()=>{const brand=document.querySelector('.home-link').getBoundingClientRect(),nav=document.querySelector('#main-navigation').getBoundingClientRect(),menu=document.querySelector('.menu-toggle');return {desktop:getComputedStyle(menu).display==='none',brandRight:brand.right,navLeft:nav.left,navRight:nav.right,containerRight:document.querySelector('.header-inner').getBoundingClientRect().right}})()");
  check(!header.desktop||(header.navLeft>=header.brandRight+8&&header.navRight<=header.containerRight+1),'Header navigation fits beside brand '+label);
  if(!header.desktop){await click('.menu-toggle');check(await ev("document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='true'&&document.querySelector('#main-navigation a[href=\"/how-we-work\"]').getAttribute('aria-current')==='page'"),'Mobile navigation exposes current page '+label);await ev("document.querySelector('.menu-toggle').focus()");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await until("document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='false'");check(await ev("document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='false'"),'Menu Escape handling '+label);}
  check(await ev("document.querySelector('link[rel=canonical]').href==='https://theaugmentedarchitect.com/how-we-work'&&document.querySelector('meta[property=\"og:url\"]').content==='https://theaugmentedarchitect.com/how-we-work'"),'Canonical and social metadata '+label);
  check(await ev("[...document.querySelectorAll('main script[type=\"application/ld+json\"]')].some(s=>JSON.parse(s.textContent)['@graph']?.some(n=>n['@type']==='WebPage'&&n.url==='https://theaugmentedarchitect.com/how-we-work'))"),'Page structured metadata '+label);
  const ids=await ev("[...document.querySelectorAll('main nav[aria-label=\"The engagement journey\"] a')].map(a=>a.hash.slice(1))");
  for(const id of ids)check(await ev(`!!document.getElementById(${JSON.stringify(id)})`),'Journey anchor '+id+' '+label);
  await click('main details summary');check(await ev("document.querySelector('main details').open"),'Native FAQ opens '+label);await click('main details summary');
  if([1440,390].includes(width)){
   await shot('how-we-work-'+width,'main');await shot('how-we-work-hero-'+width,'main > section:first-of-type');
   for(let i=0;i<2;i++){await ev(`document.querySelectorAll('main a[href="/book"]')[${i}].click()`);await checkEntry('How We Work CTA '+i+' '+label);check(await ev("location.pathname==='/how-we-work'"),'Booking stays on new page '+label);await close();}
   check(posts.length===1&&sideEffects===0,'CTA deduplicates; no live booking or email '+label);
  }
 }
 const hrefs=await ev("[...document.querySelectorAll('main a[href]')].map(a=>a.getAttribute('href')).filter(h=>h.startsWith('/'))");
 for(const href of new Set(hrefs)){
  const result=await ev(`fetch(${JSON.stringify(href)}).then(r=>r.status)`);check(result===200,'Internal destination '+href);
 }
 check(await ev("fetch('/sitemap.xml').then(r=>r.text()).then(s=>s.includes('https://theaugmentedarchitect.com/how-we-work'))"),'New page appears in sitemap');
 check(report.errors.length===0,'No browser runtime errors');check(report.console.length===0,'No browser console errors');check(report.failedAssets.length===0,'No failed assets');
 await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,out,liveModels:0,realAppointments:0,realEmails:0}));
}finally{ws?.close();child.kill('SIGTERM');}
