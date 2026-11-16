// Run against a local production preview: node tests/scout-dictation.browser.mjs http://localhost:3100
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
const origin=process.argv[2]||'http://localhost:3100',out=process.env.DICTATION_REVIEW_DIR||join(tmpdir(),'aa-dictation',origin.startsWith('https:')?'live':'local');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--use-fake-device-for-media-stream','--remote-debugging-port=19843','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;const abortedRequests=new Set();
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19843/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result);}if(m.method==='Network.loadingFailed'&&(m.params.canceled||m.params.errorText==='net::ERR_ABORTED'))abortedRequests.add(m.params.requestId);if(m.method==='Fetch.requestPaused')void fulfill(m.params).catch(async error=>{await sleep(50);if(/Invalid InterceptionId/.test(error.message)&&abortedRequests.has(m.params.networkId)){report.fixtureCancellations=(report.fixtureCancellations||0)+1;return;}report.errors.push({fixture:error.message});});if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.console.push(m.params.args);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)report.failedAssets.push(m.params.response.url);};
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
 // Only speech events and chat HTTP responses are fixtures. Actual React UI,
 // browser DOM/input, route lifecycle, and optimized application assets are real.
 let messages=[],posts=[];
 async function fulfill(event){
  const request=event.request,url=new URL(request.url);let body,type='application/json';
  if(url.pathname==='/api/scout/scheduling')body={enabled:false,proposals:[],verificationRequired:false};
  else if(url.pathname.startsWith('/api/booking'))body={error:'Read-only browser fixture. No appointment is created.'};
  else if(request.method==='POST'){
   const input=JSON.parse(request.postData);posts.push(input);messages.push({id:input.clientTurnId,role:'user',content:input.message},{id:crypto.randomUUID(),role:'assistant',content:'Thanks. You can explore our services or book a consultation.'});
   body=JSON.stringify({type:'done',messages,expiresInMs:86400000})+'\n';type='application/x-ndjson';
  }else if(request.method==='DELETE'){messages=[];body={ok:true};}
  else body={messages,busy:false,failed:null,sessionReset:false,expiresInMs:messages.length?86400000:null};
  await send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:url.pathname.startsWith('/api/booking')?503:200,responseHeaders:[{name:'Content-Type',value:type}],body:Buffer.from(typeof body==='string'?body:JSON.stringify(body)).toString('base64')});
 }
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Fetch.enable',{patterns:[{urlPattern:origin+'/api/scout*'},{urlPattern:origin+'/api/booking*'}]});
 const click=selector=>ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
 const set=async value=>ev(`(()=>{const e=document.querySelector('#scout-draft');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
 const value=()=>ev("document.querySelector('#scout-draft').value");
 const open=async()=>{await until("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')");await click('[aria-label="Open Scout, AI Architecture Guide"]');await until("!!document.querySelector('#scout-draft')&&!document.querySelector('#scout-draft').disabled");};
 const mic='button[data-dictation-state]',listen=()=>until("document.querySelector('button[data-dictation-state]')?.dataset.dictationState==='listening'"),idle=()=>until("document.querySelector('button[data-dictation-state]')?.dataset.dictationState==='idle'");
 const emit=words=>ev(`window.__speech.instance.onresult({results:${JSON.stringify(words.map(transcript=>({0:{transcript},isFinal:false})))}})`);
 // Check the real installed Chrome API with denied permission and fake hardware.
 // This does not test successful real-world speech or record ambient audio.
 await send('Browser.setPermission',{permission:{name:'microphone'},setting:'denied',origin});await nav('/about');await open();
 report.nativeSpeech=await ev("!!(window.SpeechRecognition||window.webkitSpeechRecognition)");
 if(report.nativeSpeech){await set('Native permission check');await click(mic);await idle();check(await value()==='Native permission check','Native Chrome denial/service failure preserves typed input');check(await ev("!!document.querySelector('#scout-dictation-status').textContent"),'Native speech failure provides accessible feedback');}
 await click('[aria-label="Minimize Scout"]');await until("!document.querySelector('#scout-panel')");
 const fake=mode=>`(()=>{window.__speech={instances:[],instance:null};class Recognition{constructor(){this.starts=0;this.stops=0;this.aborts=0;window.__speech.instances.push(this);window.__speech.instance=this;}start(){this.starts++;if(window.__speech.failStart){window.__speech.failStart=false;throw Error('Recognition failed');}queueMicrotask(()=>this.onstart?.());}stop(){this.stops++;queueMicrotask(()=>this.onend?.());}abort(){this.aborts++;}}Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:${mode==='standard'?'Recognition':'undefined'}});Object.defineProperty(window,'webkitSpeechRecognition',{configurable:true,value:${mode==='prefixed'?'Recognition':'undefined'}});})()`;
 for(const [mode,width]of [['standard',1440],['prefixed',390]]){
  messages=[];posts=[];const script=await send('Page.addScriptToEvaluateOnNewDocument',{source:fake(mode)});
  await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width===390});await nav('/about');await open();await set('Discuss');
  await click(mic);await listen();check(await ev("window.__speech.instance.starts===1&&window.__speech.instance.continuous&&window.__speech.instance.interimResults"),'One tap starts live continuous transcription '+mode);
  await emit(['AI arch']);check(await value()==='Discuss AI arch','Interim speech appears immediately in existing input '+mode);await emit(['AI architecture']);check(await value()==='Discuss AI architecture','Interim replacement avoids duplicated words '+mode);
  await set('Please Discuss AI architecture');await set('Please Discuss AI architecture today.');await emit(['AI architecture and integrations']);check(await value()==='Please Discuss AI architecture and integrations today.','Typing before/after dictation is preserved '+mode);
  await click(mic);await idle();check(await ev("window.__speech.instance.stops===1&&document.querySelector('button[data-dictation-state]').getAttribute('aria-pressed')==='false'"),'Second tap stops without holding '+mode);check(posts.length===0,'Recognition never automatically submits '+mode);
  await set('Salesforce');await click(mic);await listen();await emit(['modernization']);await set('Salesforce automation');await emit(['modernization']);check(await value()==='Salesforce automation','Manual edits to dictated words win '+mode);
  await ev("document.querySelector('#scout-draft').form.requestSubmit()");await until("!!document.querySelector('#scout-panel [role=log]')&&!document.querySelector('#scout-draft').disabled");check(posts.length===1&&posts[0].message==='Salesforce automation','Normal explicit send submits the editable draft once '+mode);check(await ev("window.__speech.instance.aborts===1"),'Explicit send releases recognition '+mode);
  await set('Keep my draft');
  for(const code of ['not-allowed','network','no-speech','audio-capture']){await click(mic);await listen();await ev(`window.__speech.instance.onerror({error:${JSON.stringify(code)}})`);await idle();check(await value()==='Keep my draft'&&await ev("!!document.querySelector('#scout-dictation-status').textContent&&!document.querySelector('#scout-draft').disabled"),'Recoverable '+code+' with typing intact '+mode);}
  await click(mic);await listen();await emit(['with a note']);await shot('scout-listening-'+mode);check(await ev("(()=>{const p=document.querySelector('#scout-panel'),r=p.getBoundingClientRect(),b=document.querySelector('button[data-dictation-state]');return p.offsetWidth===360&&p.offsetHeight===600&&r.left>=0&&r.right<=innerWidth&&p.scrollWidth<=p.clientWidth&&b.getBoundingClientRect().width>=36})()"),'Approved panel dimensions and accessible mic target '+mode);
  await click('[aria-label="Minimize Scout"]');await until("!document.querySelector('#scout-panel')");check(await ev("window.__speech.instance.aborts===1&&window.__speech.instance.onresult===null"),'Closing/unmount aborts and detaches callbacks '+mode);
  await open();check(await value()==='Keep my draft with a note','Closing/reopening retains dictated draft '+mode);await click(mic);await listen();await ev("history.pushState({},'', '/contact')");await until("window.__speech.instance.aborts===1");check(await ev("window.__speech.instance.onresult===null"),'Client navigation releases microphone '+mode);
  if(await ev("!!document.querySelector('#scout-panel')")){await click('[aria-label="Minimize Scout"]');await until("!document.querySelector('#scout-panel')");}
  await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script.identifier});
 }
 const unsupported=await send('Page.addScriptToEvaluateOnNewDocument',{source:fake('unsupported')});messages=[];posts=[];await nav('/about');await open();check(!await ev("!!document.querySelector('button[data-dictation-state]')"),'Unsupported browser keeps the normal composer without a dead microphone control');await set('Typing still works');await ev("document.querySelector('#scout-draft').form.requestSubmit()");await until("!document.querySelector('#scout-draft').disabled&&!!document.querySelector('#scout-panel [role=log]')");check(posts.length===1&&posts[0].message==='Typing still works','Unsupported-browser typing and send stay functional');await click('[aria-label="Minimize Scout"]');await until("!document.querySelector('#scout-panel')");await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:unsupported.identifier});
 // The visual polish is bounded to desktop AI headline and Approach spacing.
 for(const width of [1440,390]){await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width===390});await nav('/our-approach/ai-architecture');const size=await ev("parseFloat(getComputedStyle(document.querySelector('main h1')).fontSize)");check(Math.abs(size-(width===1440?54.144:35.1))<.1,'Six-percent desktop headline refinement; mobile scale preserved '+width);await shot('ai-architecture-'+width,'main');await nav('/about');check(await ev("!!document.querySelector('.architecture-diagram .diagram-connectors')&&document.documentElement.scrollWidth===innerWidth"),'Original About diagram remains without overflow '+width);await shot('about-diagram-'+width,'.architecture-diagram');}
 check(report.errors.length===0,'No runtime errors: '+JSON.stringify(report.errors));check(report.console.length===0,'No console errors: '+JSON.stringify(report.console));check(report.failedAssets.length===0,'No failed assets: '+JSON.stringify(report.failedAssets));await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,nativeSpeech:report.nativeSpeech,out}));
}finally{ws?.close();child.kill('SIGTERM');}
