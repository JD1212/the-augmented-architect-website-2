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
import {createHash,randomUUID} from 'node:crypto';
import {scoutFixture} from './helpers/scout-fixture.mjs';
import {loadScoutModule} from './helpers/scout-loader.mjs';
const origin='http://localhost:3191',out=process.env.SCOUT_COOKIE_REVIEW_DIR||join(tmpdir(),'aa-scout-cookie-recovery');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19751','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19751/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.console.push(m.params.args);if(m.method==='Network.responseReceived'&&m.params.response.status>=400&&!(m.params.response.url.endsWith('/api/scout')&&[401,410].includes(m.params.response.status)))report.failedAssets.push(m.params.response.url);};
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
 const attempts=[],blocked=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.responseReceivedExtraInfo')for(const c of m.params.blockedCookies||[])blocked.push({name:c.cookie?.name,reason:c.blockedReasons});});
 const server=createServer(async(req,res)=>{
  try{
   let response;
   if(req.url==='/api/scout'){
    const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks).toString();
    response=await handlers[req.method](new Request(origin+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body}:{})}));
    if(req.method==='POST')attempts.push({status:response.status,turn:JSON.parse(body)});
   }else response=await fetch(upstream+req.url,{headers:req.headers,redirect:'manual'});
   for(const [name,value]of response.headers)if(!['set-cookie','content-encoding','content-length','transfer-encoding','connection'].includes(name))res.setHeader(name,value);
   if(response.headers.getSetCookie().length)res.setHeader('Set-Cookie',response.headers.getSetCookie());res.writeHead(response.status);
   if(response.body)for await(const chunk of response.body)res.write(chunk);res.end();
  }catch{res.writeHead(500);res.end('Fixture proxy failed');}
 });await new Promise(r=>server.listen(3191,'127.0.0.1',r));
 try{
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:"sessionStorage.setItem('aa.scout.introduction.v1','1')"});
  const open=async()=>{await until("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')");await ev("document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]').click()");await until("!!document.querySelector('#scout-panel[open]')&&!document.querySelector('#scout-draft').disabled");};
  const submit=async(text,count)=>{await ev("document.querySelector('#scout-draft').focus()");await send('Input.insertText',{text});await ev("document.querySelector('#scout-panel form').requestSubmit()");await until(`document.querySelectorAll('#scout-panel [data-message-role=assistant]').length===${count}&&[...document.querySelectorAll('#scout-panel [data-message-role=user]')].at(-1)?.textContent.includes(${JSON.stringify(text)})&&!document.querySelector('#scout-draft').disabled`);};
  const cases=[{path:'/api/scout',secure:false},{path:'/api',secure:false},{path:'/api/scout',secure:true},{path:'/',secure:false},{path:'/api/scout',secure:false,duplicate:true},{path:'/',secure:true,production:true}];
  for(const [index,c]of cases.entries()){
   f.conversations.splice(0);f.turns.splice(0);f.model.calls=0;attempts.splice(0);blocked.splice(0);
   process.env.NODE_ENV=c.production?'production':'development';const name=c.production?'__Host-scout_session':'scout_session',legacy='a'.repeat(43),hash=createHash('sha256').update(legacy).digest('hex');
   const initial=await f.service.prepare(hash,'Historical seven-day conversation',randomUUID());await initial.execute(new AbortController().signal,()=>{});f.conversations[0].expires_at=new Date(Date.parse(f.conversations[0].created_at)+7*86400000).toISOString();f.tick(25*3600000);
   await send('Network.clearBrowserCookies');await send('Network.setCookie',{name,value:legacy,url:origin,path:c.path,secure:c.secure,httpOnly:true,sameSite:'Lax',expires:Date.now()/1000+7*86400});
   if(c.duplicate)await send('Network.setCookie',{name,value:'b'.repeat(43),url:origin,path:'/',httpOnly:true,sameSite:'Lax'});
   const width=index%2?390:1440;await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width===390});
   await nav('/');await open();const jar=(await send('Network.getCookies',{urls:[origin+'/api/scout']})).cookies.filter(v=>v.name===name);
   check(jar.length===1&&jar[0].path==='/'&&jar[0].value!==legacy,'Actual cookie jar migrates legacy scope '+index);check(f.conversations.length===1,'Welcome creates no conversation '+index);
   await submit('hi',1);check(attempts.length===1&&attempts[0].status===200,'First hi succeeds without a resend '+index);
   f.tick(25*3600000);const before=attempts.length;await submit('Message submitted after expiry',1);
   const recovery=attempts.slice(before);check(recovery.length===2&&recovery[0].status===410&&recovery[1].status===200&&recovery[0].turn.clientTurnId===recovery[1].turn.clientTurnId&&recovery.every(r=>r.turn.message==='Message submitted after expiry'),'Mid-submit expiration recovers once with the same message/id '+index);
   await submit('Another message',2);check(attempts.at(-1).status===200,'Recovered session stays usable '+index);
   check(f.conversations.length===3&&f.turns[0].user_message==='Historical seven-day conversation'&&f.model.calls===4,'Historical rows retained; no duplicate model execution '+index);
   check(blocked.length===0,'Browser accepts rotation Set-Cookie headers '+index);
   if(index===0||index===1){await sleep(300);await shot('recovered-cookie-'+width);}
  }
  check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No unexpected failed requests');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,out}));
 }finally{await new Promise(r=>server.close(r));}
}finally{ws?.close();child.kill('SIGTERM');}
