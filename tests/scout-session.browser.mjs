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
const origin=process.argv[2]||'http://localhost:3100',out=process.env.SCOUT_SESSION_REVIEW_DIR||join(tmpdir(),'aa-scout-session');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19731','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19731/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
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
  sessionStorage.setItem('aa.scout.introduction.v1','1');const realFetch=window.fetch.bind(window);
  const get=()=>JSON.parse(sessionStorage.getItem('scout-session-test')||'{"records":[],"active":null,"expiresAt":null,"requests":0}');
  const save=s=>sessionStorage.setItem('scout-session-test',JSON.stringify(s));
  window.__phase2Test={get,setExpiry:ms=>{const s=get();s.expiresAt=Date.now()+ms;save(s);}};
  window.fetch=async(input,init={})=>{
   const url=typeof input==='string'?input:input.url;if(new URL(url,location.href).pathname!=='/api/scout')return realFetch(input,init);
   const s=get(),method=init.method||'GET',expired=s.active!==null&&Date.now()>=s.expiresAt;
   if(expired){s.active=null;s.expiresAt=null;save(s);}
   if(method==='GET')return Response.json({messages:s.active===null?[]:s.records[s.active],busy:false,failed:null,expiresInMs:s.expiresAt===null?null:s.expiresAt-Date.now()});
   if(method==='DELETE'){s.active=null;s.expiresAt=null;save(s);return Response.json({messages:[],busy:false,failed:null});}
   s.requests++;save(s);if(expired)return Response.json({error:'This conversation has ended.',code:'scout_session_reset'},{status:window.__phase2Test.missingCookie?401:410});
   const p=JSON.parse(init.body);if(s.active===null){s.active=s.records.length;s.records.push([]);}
   s.records[s.active].push({id:p.clientTurnId,role:'user',content:p.message},{id:p.clientTurnId+'-reply',role:'assistant',content:'We can help you understand your business systems.'});s.expiresAt=Date.now()+86400000;save(s);
   return new Response(JSON.stringify({type:'done',messages:s.records[s.active],expiresInMs:86400000})+'\n',{headers:{'content-type':'application/x-ndjson'}});
  };
 };
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(${fixture.toString()})()`});
 const open=async()=>{await until("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')");await ev("document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]').click()");await until("!!document.querySelector('#scout-panel[open]')");};
 const close=async()=>{await ev("document.querySelector('[aria-label=\"Minimize Scout\"]').click()");await until("!document.querySelector('#scout-panel')");};
 const done=()=>until("!!document.querySelector('#scout-panel [role=log]')&&!document.querySelector('#scout-draft').disabled");
 const welcome=()=>until("!document.querySelector('#scout-panel [role=log]')&&document.querySelectorAll('#scout-panel [role=group] button').length===4&&!document.querySelector('#scout-draft').disabled");
 const message=async text=>{await ev("document.querySelector('#scout-draft').focus()");await send('Input.insertText',{text});await ev("document.querySelector('#scout-panel form').requestSubmit()");};
 for(const width of [1440,390]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:width>600?1000:844,deviceScaleFactor:1,mobile:width<600});await nav('/');await ev("sessionStorage.removeItem('scout-session-test')");await send('Page.reload');await until("document.readyState==='complete'");await open();await welcome();
  check(await ev("window.__phase2Test.get().records.length===0"),'Fresh greeting creates no conversation '+width);
  await message('A synthetic business question');await done();await close();await open();await done();check(await ev("document.querySelectorAll('#scout-panel [data-message-role]').length===2"),'Close/reopen preserves conversation '+width);
  await close();await ev("document.querySelector('#main-navigation a[href=\"/salesforce\"]').click()");await until("location.pathname==='/salesforce'");await open();await done();check(await ev("document.querySelectorAll('#scout-panel [data-message-role]').length===2"),'Navigation preserves conversation '+width);
  await close();await send('Page.reload');await until("document.readyState==='complete'");await open();await done();check(await ev("window.__phase2Test.get().requests===1"),'Refresh restores without resending '+width);
  await close();await ev("window.__phase2Test.setExpiry(4500)");await send('Page.reload');await until("document.readyState==='complete'");await open();await done();check(true,'Active transcript restored before expiry '+width);await ev("document.querySelector('#scout-draft').focus()");await send('Input.insertText',{text:'An old unsent draft'});await welcome();
  check(await ev("window.__phase2Test.get().records.length===1&&window.__phase2Test.get().active===null&&window.__phase2Test.get().requests===1&&document.querySelector('#scout-draft').value===''"),'Idle expiry shows fresh welcome, clears old draft and retains prior record '+width);await sleep(300);await shot('expired-welcome-'+width);
  await message('A second synthetic project');await done();check(await ev("window.__phase2Test.get().records.length===2"),'Fresh session starts only after an explicit message '+width);
  await ev(`window.__phase2Test.setExpiry(-1);window.__phase2Test.missingCookie=${width===390}`);await message('Message typed at expiry');await done();
  check(await ev("document.querySelector('#scout-panel [data-message-role=user]').textContent.includes('Message typed at expiry')&&window.__phase2Test.get().records.length===3&&window.__phase2Test.get().requests===4"),'Expired send recovers automatically with the preserved message '+width);await shot('recovered-draft-'+width);
  check(await ev("document.querySelectorAll('#scout-panel [data-message-role=user]').length===1"),'Recovery does not duplicate the submitted message '+width);
  check(await ev("(()=>{const p=document.querySelector('#scout-panel'),r=p.getBoundingClientRect();return p.offsetWidth===Math.min(360,innerWidth-24)&&p.offsetHeight===600&&r.left>=0&&r.right<=innerWidth&&p.scrollWidth<=p.clientWidth})()"),'Approved panel dimensions remain unchanged '+width);await close();
 }
 check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed assets');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,console:report.console,failedAssets:report.failedAssets,out}));
}finally{ws?.close();child.kill('SIGTERM');}
