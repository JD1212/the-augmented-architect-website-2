// Deterministic UI checks. Mock transport is injected by this test only;
// no production test flag, API credential, or real visitor message is used.
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
const origin=process.argv[2]||'http://localhost:3100',out=process.env.SCOUT_CHAT_REVIEW_DIR||join(tmpdir(),'aa-scout-conversation');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19681','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19681/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.console.push(m.params.args);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)report.failedAssets.push(m.params.response.url);};
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
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 const fixture=()=>{
  sessionStorage.setItem('aa.scout.introduction.v1','1');
  const realFetch=window.fetch.bind(window);
  const get=()=>JSON.parse(sessionStorage.getItem('scout-test-conversation')||'{"messages":[],"requests":[],"creates":0}');
  const save=s=>sessionStorage.setItem('scout-test-conversation',JSON.stringify(s));
  window.__scoutTest={failNext:false,get};
  window.fetch=async(input,init={})=>{
   const url=typeof input==='string'?input:input.url;
   if(new URL(url,location.href).pathname!=='/api/scout')return realFetch(input,init);
   const s=get(),method=init.method||'GET';
   if(method==='GET')return Response.json({messages:s.messages,busy:false,failed:null});
   if(method==='DELETE'){save({...s,messages:[]});return Response.json({messages:[],busy:false,failed:null});}
   const p=JSON.parse(init.body);s.requests.push(p);if(!s.messages.length)s.creates++;
   if(!s.messages.some(m=>m.id===p.clientTurnId))s.messages.push({id:p.clientTurnId,role:'user',content:p.message});save(s);
   if(window.__scoutTest.failNext){window.__scoutTest.failNext=false;return new Response(JSON.stringify({type:'error',message:'Scout could not finish this reply. Please retry in a moment.'})+'\n');}
   const text=/custom|cost|\$10/i.test(p.message)?'Implementation starts at $10,000 for a defined scope. Custom AI agents and additional integrations are scoped separately.':/salesforce/i.test(p.message)?'We assess Salesforce automation and modernize it incrementally, supported by Architecture Command Center.':/project/i.test(p.message)?'What business process would you most like to improve?':'We start with your business processes and connect identity, shared context, and the systems your team already uses.';
   const encoder=new TextEncoder();return new Response(new ReadableStream({start(c){
    c.enqueue(encoder.encode(JSON.stringify({type:'delta',text:text.slice(0,20)})+'\n'));
    setTimeout(()=>c.enqueue(encoder.encode(JSON.stringify({type:'delta',text:text.slice(20)})+'\n')),150);
    setTimeout(()=>{const current=get();current.messages.push({id:p.clientTurnId+'-reply',role:'assistant',content:text});save(current);c.enqueue(encoder.encode(JSON.stringify({type:'done',messages:current.messages})+'\n'));c.close();},650);
   }}),{headers:{'content-type':'application/x-ndjson'}});
  };
 };
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(${fixture.toString()})()`});
 const open=async()=>{await until("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')");await ev("document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]').click()");await until("!!document.querySelector('#scout-panel[open]')");};
 const close=async()=>{await ev("document.querySelector('[aria-label=\"Minimize Scout\"]').click()");await until("!document.querySelector('#scout-panel')");};
 const reset=async()=>{await ev("[...document.querySelectorAll('#scout-panel button')].find(b=>b.textContent==='New Conversation').click()");await until("!document.querySelector('#scout-panel [role=log]')&&!document.querySelector('#scout-draft').disabled");};
 const done=()=>until("document.querySelectorAll('#scout-panel [data-message-role=assistant]').length===1&&!document.querySelector('#scout-draft').disabled");
 const message=async text=>{await ev("document.querySelector('#scout-draft').focus()");await send('Input.insertText',{text});await ev("document.querySelector('#scout-panel form').requestSubmit()");};
 const starters=['Explore AI solutions','Salesforce consulting','Custom software','Discuss my project'];
 for(const width of [1440,390,320]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:width>600?1000:844,deviceScaleFactor:1,mobile:width<600});
  await nav('/');await ev("sessionStorage.removeItem('scout-test-conversation')");await send('Page.reload');await until("document.readyState==='complete'");await open();
  await until("document.querySelectorAll('#scout-panel [role=group] button').length===4");await sleep(450);
  check(await ev("(()=>{const p=document.querySelector('#scout-panel'),r=p.getBoundingClientRect();return p.offsetWidth===Math.min(360,innerWidth-24)&&p.offsetHeight===600&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()"),'Approved portrait panel fits '+width);
  assert.deepEqual(await ev("[...document.querySelectorAll('#scout-panel [role=group] button')].map(b=>b.children[1].textContent)"),starters);check(true,'Four approved starter labels '+width);
  await shot('introduction-'+width);
  await ev("document.querySelector('#scout-panel [role=group] button').click()");await until("document.querySelector('#scout-draft').disabled&&!!document.querySelector('#scout-panel [role=log]')");
  check(await ev("document.querySelector('[role=log]').getAttribute('aria-busy')==='true'&&document.querySelector('#scout-panel form button').disabled"),'Streaming state prevents overlapping sends '+width);
  await close();await open();await done();check(await ev("document.querySelectorAll('#scout-panel [data-message-role]').length===2&&!document.querySelector('#scout-panel p[aria-hidden]')"),'Close/reopen retains real conversation without restarting intro '+width);
  await shot('conversation-'+width);
  await close();await ev("document.querySelector('#main-navigation a[href=\"/salesforce\"]').click()");await until("location.pathname==='/salesforce'");await open();await done();check(await ev("document.querySelectorAll('#scout-panel [data-message-role]').length===2"),'Conversation persists across client navigation '+width);await close();
  await send('Page.reload');await until("document.readyState==='complete'");await open();await done();check(await ev("document.querySelectorAll('#scout-panel [data-message-role]').length===2&&window.__scoutTest.get().requests.length===1"),'Refresh restores history without resending '+width);
  await reset();check(await ev("window.__scoutTest.get().creates===1&&window.__scoutTest.get().messages.length===0"),'New Conversation waits for a message to create conversation '+width);
  await until("document.querySelectorAll('#scout-panel [role=group] button').length===4");
  for(let i=1;i<4;i++){
   await ev(`document.querySelectorAll('#scout-panel [role=group] button')[${i}].click()`);await done();
   const text=await ev("document.querySelector('#scout-panel [data-message-role=assistant]').textContent");
   check(i===1?text.includes('Architecture Command Center'):i===2?text.includes('$10,000')&&text.includes('scoped separately'):text.includes('business process'),'Starter produces service-specific conversation '+i+' '+width);await reset();
  }
  await ev("window.__scoutTest.failNext=true");await message('A synthetic retry test');await until("!![...document.querySelectorAll('#scout-panel button')].find(b=>b.textContent==='Retry reply')");
  check(await ev("document.querySelectorAll('#scout-panel [data-message-role=user]').length===1&&document.querySelector('#scout-draft').disabled"),'Failure preserves the unanswered message '+width);
  await ev("[...document.querySelectorAll('#scout-panel button')].find(b=>b.textContent==='Retry reply').click()");await done();
  check(await ev("(()=>{const r=window.__scoutTest.get().requests;return r.at(-1).clientTurnId===r.at(-2).clientTurnId&&document.querySelectorAll('#scout-panel [data-message-role=user]').length===1})()"),'Retry reuses client ID without duplicating user message '+width);
  check(await ev("(()=>{const c=document.querySelector('#scout-panel [role=log]');return c.scrollWidth<=c.clientWidth&&document.documentElement.scrollWidth===innerWidth})()"),'Messages wrap without page overflow '+width);
  await ev("document.querySelector('[aria-label=\"Minimize Scout\"]').focus()");for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});check(await ev("document.activeElement.id==='scout-draft'"),'Reverse focus trap stays within panel '+width);
  for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until("!document.querySelector('#scout-panel')");check(await ev("document.activeElement.getAttribute('aria-label')==='Open Scout, AI Architecture Guide'"),'Escape restores launcher focus '+width);
 }
 check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed assets');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,console:report.console,failedAssets:report.failedAssets,out}));
}finally{ws?.close();child.kill('SIGTERM');}
