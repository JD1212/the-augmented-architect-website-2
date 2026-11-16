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
import {scoutFixture} from './helpers/scout-fixture.mjs';
import {loadScoutModule} from './helpers/scout-loader.mjs';
const origin='http://localhost:3191',out=process.env.SCOUT_RETURN_REVIEW_DIR||join(tmpdir(),'aa-scout-returning');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19761','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19761/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.console.push(m.params.args);if(m.method==='Network.responseReceived'&&m.params.response.status>=400&&!(m.params.response.url.endsWith('/api/scout')&&[401,410,503].includes(m.params.response.status)))report.failedAssets.push(m.params.response.url);};
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
 const f=scoutFixture();process.env.NODE_ENV='development';const {createScoutHandlers}=loadScoutModule('src/lib/scout/http.ts',{},f.cache);const handlers=createScoutHandlers(()=>f.service,()=>{});
 let failGet=0,failDelete=0;const attempts=[],blocked=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.responseReceivedExtraInfo')for(const c of m.params.blockedCookies||[])blocked.push({name:c.cookie?.name,reason:c.blockedReasons});});
 const server=createServer(async(req,res)=>{
  try{
   let response;
   if(req.url==='/api/scout/scheduling')response=Response.json({enabled:false,proposals:[],verificationRequired:false});
   else if(req.url==='/api/scout'){
    const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks).toString();
    response=(req.method==='GET'&&failGet-->0)||(req.method==='DELETE'&&failDelete-->0)?Response.json({error:'Temporary test interruption'},{status:503}):await handlers[req.method](new Request(origin+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body}:{})}));
    if(req.method==='POST')attempts.push({status:response.status,turn:JSON.parse(body)});
   }else response=await fetch(upstream+req.url,{headers:req.headers,redirect:'manual'});
   for(const [name,value]of response.headers)if(!['set-cookie','content-encoding','content-length','transfer-encoding','connection'].includes(name))res.setHeader(name,value);
   if(response.headers.getSetCookie().length)res.setHeader('Set-Cookie',response.headers.getSetCookie());res.writeHead(response.status);
   if(response.body)for await(const chunk of response.body)res.write(chunk);res.end();
  }catch{res.writeHead(500);res.end('Fixture proxy failed');}
 });await new Promise(r=>server.listen(3191,'127.0.0.1',r));
 try{
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.origin===${JSON.stringify(origin)})sessionStorage.setItem('aa.scout.introduction.v1','1')`});
  const open=async()=>{await until("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')");await ev("document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]').click()");await until("!!document.querySelector('#scout-panel[open]')");};
  const submit=async(text,count)=>{await ev("document.querySelector('#scout-draft').focus()");await send('Input.insertText',{text});await ev("document.querySelector('#scout-panel form').requestSubmit()");await until(`document.querySelectorAll('#scout-panel [data-message-role=assistant]').length===${count}&&[...document.querySelectorAll('#scout-panel [data-message-role=user]')].at(-1)?.textContent.includes(${JSON.stringify(text)})&&!document.querySelector('#scout-draft').disabled`);};

  const choice=()=>until("document.querySelector('#scout-panel')?.textContent.includes('Welcome back!')&&document.querySelectorAll('#scout-panel [role=group] button').length===2&&!document.querySelector('#scout-panel [role=group] button:disabled')");
  const welcome=()=>until("document.querySelectorAll('#scout-panel [role=group] button').length===4&&!document.querySelector('#scout-draft').disabled");
  const hidden=()=>ev("!document.querySelector('#scout-panel [role=log]')&&!document.querySelector('#scout-panel').textContent.includes('PRIVATE_RETURN_TEST')");
  const choose=async(label)=>ev(`[...document.querySelectorAll('#scout-panel button')].find(b=>b.textContent===${JSON.stringify(label)}).click()`);
  const returnVisit=async()=>{await send('Page.navigate',{url:'about:blank'});await until("location.href==='about:blank'");await nav('/');await open();};
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"window.__privateFlash=false;new MutationObserver(()=>{if(document.querySelector('#scout-panel')?.textContent.includes('PRIVATE_RETURN_TEST'))window.__privateFlash=true}).observe(document,{subtree:true,childList:true,characterData:true})"});
  for(const width of [1440,390]){
   await send('Network.clearBrowserCookies');await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width===390});
   await nav('/');await open();await welcome();check(await hidden(),'Fresh visitor sees unchanged welcome and four starters '+width);
   await submit('PRIVATE_RETURN_TEST project',1);const calls=f.model.calls,sends=attempts.length;
   await send('Page.reload');await until("document.readyState==='complete'");await open();await until("document.querySelectorAll('#scout-panel [role=log] [data-message-role]').length===2&&!document.querySelector('#scout-draft').disabled");
   check(!await ev("document.querySelector('#scout-panel').textContent.includes('Welcome back!')")&&attempts.length===sends,'Active refresh restores without a choice or resend '+width);
   await ev("document.querySelector('[aria-label=\"Minimize Scout\"]').click()");await until("!document.querySelector('#scout-panel')");await ev("document.querySelector('#main-navigation a[href=\"/salesforce\"]').click()");await until("location.pathname==='/salesforce'");await open();
   check(await ev("document.querySelectorAll('#scout-panel [role=log] [data-message-role]').length===2"),'Internal navigation retains active conversation '+width);
   await returnVisit();await choice();check(await hidden()&&!await ev('window.__privateFlash'),'Return choice never renders private transcript, even briefly '+width);
   check(await ev("document.querySelector('#scout-draft').disabled&&document.querySelectorAll('#scout-panel [role=group] button').length===2"),'Choice has two native buttons and blocks messaging '+width);
   await choose('Continue previous conversation');await until("!!document.querySelector('#scout-panel [role=log]')&&!document.querySelector('#scout-draft').disabled");
   check(await ev("document.querySelectorAll('#scout-panel [role=log] [data-message-role]').length===2")&&f.model.calls===calls&&attempts.length===sends,'Continue restores exactly once without model execution '+width);
   await ev("window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))");check(await hidden(),'Cached page clears transcript before leaving '+width);
   await ev("window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))");await choice();check(await hidden(),'Back/forward cache return asks again '+width);
   failGet=1;await choose('Continue previous conversation');await until("document.querySelector('#scout-panel').textContent.includes('Temporary test interruption')");check(await hidden(),'Failed Continue keeps transcript hidden and actions recoverable '+width);
   await choose('Continue previous conversation');await until("!!document.querySelector('#scout-panel [role=log]')&&!document.querySelector('#scout-draft').disabled");check(f.model.calls===calls,'Continue retry only restores, never executes '+width);
   await returnVisit();await choice();failDelete=1;await choose('Start a new conversation');await until("document.querySelector('#scout-panel').textContent.includes('Temporary test interruption')");check(await hidden(),'Failed reset preserves choice without exposing history '+width);
   const oldCookie=(await send('Network.getCookies',{urls:[origin+'/api/scout']})).cookies.find(c=>c.name==='scout_session').value;
   await choose('Start a new conversation');await welcome();const nextCookie=(await send('Network.getCookies',{urls:[origin+'/api/scout']})).cookies.find(c=>c.name==='scout_session').value;
   check(oldCookie!==nextCookie&&f.conversations.at(-1).status==='closed'&&f.model.calls===calls,'Start New securely rotates cookie and keeps historical rows '+width);
   await submit('PRIVATE_RETURN_TEST second project',1);await returnVisit();await choice();f.tick(25*3600000);await choose('Continue previous conversation');await welcome();check(await hidden(),'Expiry between choice and Continue shows fresh welcome '+width);
   await submit('PRIVATE_RETURN_TEST third project',1);f.tick(25*3600000);await returnVisit();await welcome();check(await hidden()&&!await ev("document.querySelector('#scout-panel').textContent.includes('Welcome back!')"),'Expired returning visitor has no Continue option '+width);
   await submit('PRIVATE_RETURN_TEST fourth project',1);failGet=1;await returnVisit();await until("document.querySelector('#scout-panel').textContent.includes('Temporary test interruption')");check(await hidden()&&await ev("document.querySelector('#scout-draft').disabled"),'Initial restore failure fails closed '+width);
   await choose('Try again');await choice();check(await hidden(),'Initial restore retry recovers to choice, not transcript '+width);
   const geometry=()=>ev("(()=>{const p=document.querySelector('#scout-panel'),r=p.getBoundingClientRect();return {width:p.offsetWidth,height:p.offsetHeight,left:r.left,right:r.right,top:r.top,bottom:r.bottom,scrollWidth:p.scrollWidth,clientWidth:p.clientWidth,viewportWidth:innerWidth,viewportHeight:innerHeight,animation:getComputedStyle(p).animationName}})()");
   const during=await geometry();await ev("Promise.all(document.querySelector('#scout-panel').getAnimations().map(a=>a.finished.catch(()=>{})))");const settled=await geometry();report.layouts.push({width,during,settled});console.log(JSON.stringify({width,during,settled}));
   check(await ev("(()=>{const p=document.querySelector('#scout-panel'),r=p.getBoundingClientRect();return p.offsetWidth===360&&p.offsetHeight===600&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&p.scrollWidth<=p.clientWidth})()"),'Approved panel proportions and no overflow '+width);
   await shot('return-choice-'+width);await choose('Start a new conversation');await welcome();
  }
  await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({runtimeErrors:report.errors,consoleErrors:report.console,failedRequests:report.failedAssets}));check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No unexpected failed requests');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,out}));
 }finally{await new Promise(r=>server.close(r));}
}finally{ws?.close();child.kill('SIGTERM');}
