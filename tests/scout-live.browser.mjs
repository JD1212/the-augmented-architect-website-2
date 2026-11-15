// Run against a local production preview: node tests/scout-homepage.browser.mjs http://localhost:3100
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
import {createHash} from 'node:crypto';
const origin=process.argv[2]||'http://localhost:3100',out=process.env.SCOUT_LIVE_REVIEW_DIR||join(tmpdir(),'aa-scout-live',origin.startsWith('https:')?'production':'local');await mkdir(out,{recursive:true});
const report={origin,syntheticSessionHashes:[],checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19691','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19691/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
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
 // Explicit invocation only: this suite makes two real model requests.
 assert(['http://localhost:3100','https://the-augmented-architect-website-2.vercel.app'].includes(origin),'Use only the authorized website/local preview');
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"sessionStorage.setItem('aa.scout.introduction.v1','1')"});
 const open=async()=>{await until("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')");await ev("document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]').click()");await until("!!document.querySelector('#scout-panel[open]')");};
 const close=async()=>{await ev("document.querySelector('[aria-label=\"Minimize Scout\"]').click()");await until("!document.querySelector('#scout-panel')");};
 for(const width of [1440,390]){
  await send('Network.clearBrowserCookies');await send('Emulation.setDeviceMetricsOverride',{width,height:width>600?1000:844,deviceScaleFactor:1,mobile:width<600});
  await nav('/');await open();await until("!document.querySelector('#scout-draft').disabled");
  const cookies=await send('Network.getCookies',{urls:[origin]});const cookie=cookies.cookies.find(c=>c.name==='__Host-scout_session'||c.name==='scout_session');
  assert(cookie);check(cookie.httpOnly,'Session cookie is HttpOnly '+width);if(origin.startsWith('https:'))check(cookie.secure,'Production cookie is Secure '+width);
  report.syntheticSessionHashes.push(createHash('sha256').update(cookie.value).digest('hex'));
  await writeFile(out+'/synthetic-session-hashes.json',JSON.stringify(report.syntheticSessionHashes));
  const text=width===1440?'What does the $10,000 starting implementation include, and are custom AI agents included?':'Can Salesforce be modernized incrementally without abandoning Flows?';
  await ev("document.querySelector('#scout-draft').focus()");await send('Input.insertText',{text});await ev("document.querySelector('#scout-panel form').requestSubmit()");
  await until("!!document.querySelector('#scout-panel [role=log]')");
  await until("document.querySelectorAll('#scout-panel [data-message-role=assistant]').length===1&&!document.querySelector('#scout-draft').disabled");await sleep(350);
  const reply=await ev("document.querySelector('#scout-panel [data-message-role=assistant]').textContent");
  check(width===1440?reply.includes('$10,000')&&/separat|not included/i.test(reply):/Flow/i.test(reply)&&/increment|object|workflow|rebuild/i.test(reply),'Real agent answers offering and scope accurately '+width);
  check(await ev("(()=>{const p=document.querySelector('#scout-panel'),r=p.getBoundingClientRect();return p.offsetWidth===Math.min(360,innerWidth-24)&&p.offsetHeight===600&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&p.scrollWidth<=p.clientWidth})()"),'Real conversation fits approved panel '+width);
  await shot('real-conversation-'+width);await close();await open();check(await ev("document.querySelectorAll('#scout-panel [data-message-role]').length===2"),'Real transcript survives minimize/reopen '+width);await close();
  await ev("document.querySelector('#main-navigation a[href=\"/salesforce\"]').click()");await until("location.pathname==='/salesforce'");await open();check(await ev("document.querySelectorAll('#scout-panel [data-message-role]').length===2"),'Real transcript survives client navigation '+width);await close();
  await send('Page.reload');await until("document.readyState==='complete'");await open();await until("document.querySelectorAll('#scout-panel [data-message-role]').length===2&&!document.querySelector('#scout-draft').disabled");
  check(true,'Database transcript restored after refresh '+width);await close();
 }
 check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed assets');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,console:report.console,failedAssets:report.failedAssets,out}));
}finally{ws?.close();child.kill('SIGTERM');}
