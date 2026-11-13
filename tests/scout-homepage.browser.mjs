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
const origin=process.argv[2]||'http://localhost:3100',out=process.env.SCOUT_REVIEW_DIR||join(tmpdir(),'aa-focused-homepage',origin.startsWith('https:')?'live':'local');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19491','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19491/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
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


 const sessionKey='aa.scout.introduction.v1';
 const fresh=async path=>{const reset=await send('Page.addScriptToEvaluateOnNewDocument',{source:`sessionStorage.removeItem('${sessionKey}')`});await nav(path);await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:reset.identifier});};
 const close=async()=>{await ev("document.querySelector('[aria-label=\"Minimize Scout\"]').click()");await until("!document.querySelector('#scout-panel')");};
 const open=async()=>{await until("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')");await ev("document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]').click()");await until("!!document.querySelector('#scout-panel[open]')");};
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Page.bringToFront');
 await fresh('/');await until("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')");await sleep(750);
 check(await ev("(()=>{const b=document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]'),a=b.querySelector('svg');return b.offsetWidth===68&&b.offsetHeight===85&&a.getBoundingClientRect().width===64&&a.getBoundingClientRect().height===70&&!document.querySelector('#scout-panel')})()"),'Original avatar dimensions and entrance preserved');
 await until("!!document.querySelector('#scout-panel[open]')");await sleep(450);check(await ev("(()=>{const p=document.querySelector('#scout-panel'),r=p.getBoundingClientRect();return p.offsetWidth===360&&p.offsetHeight===600&&innerWidth-r.right===24&&innerHeight-r.bottom===20})()"),'Original portrait proportions and position preserved');
 const early=await ev("document.querySelector('[data-message-role] p[aria-hidden]').textContent");await sleep(450);check((await ev("document.querySelector('[data-message-role] p[aria-hidden]').textContent")).length>early.length,'Original typed greeting progresses');await until("document.querySelectorAll('#scout-panel nav a').length===4");await sleep(300);await shot('scout-original-desktop');check(await ev(`sessionStorage.getItem('${sessionKey}')==='1'`),'Automatic opening persisted once per tab');
 await close();check(await ev("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')"),'Closing retains launcher');await open();await sleep(450);check(await ev("document.querySelector('#scout-panel').offsetHeight===600"),'Manual reopening returns full panel');await close();await nav('/');await sleep(4000);check(!await ev("!!document.querySelector('#scout-panel')"),'Dismissal respected on reload');
 await fresh('/ai-solutions#technology-comparison');await sleep(4000);check(await ev(`!document.querySelector('#scout-panel')&&sessionStorage.getItem('${sessionKey}')===null`),'AI Solutions does not consume homepage introduction');
 await ev("document.querySelector('#technology-comparison button').click()");await until("!!document.querySelector('#technology-detail-dialog[open]')");await ev("document.querySelector('#technology-detail-dialog button').click()");await until("!document.querySelector('#technology-detail-dialog')");
 // Use an actual mouse click for the client-side return home.
 await ev("document.querySelector('.site-header a[href=\"/\"]').scrollIntoView({block:'center',behavior:'instant'})");
 const point=await ev("(()=>{const r=document.querySelector('.site-header a[href=\"/\"]').getBoundingClientRect();return {x:r.x+20,y:r.y+20}})()");await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await until("location.pathname==='/'");await until("!!document.querySelector('#scout-panel[open]')");check(true,'First quiet homepage visit opens after browsing AI Solutions');await close();
 await fresh('/');await ev("(()=>{const input=document.createElement('input');input.id='active-visitor';document.body.append(input);input.focus();input.value='An active visitor';})()");await sleep(4000);check(await ev(`!document.querySelector('#scout-panel')&&sessionStorage.getItem('${sessionKey}')===null&&document.activeElement.id==='active-visitor'`),'No interruption or false session consumption while typing');await nav('/');await until("!!document.querySelector('#scout-panel[open]')");check(true,'A skipped visit retains a later quiet homepage opportunity');await close();

 await fresh('/');await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:500,y:600,deltaX:0,deltaY:160});await sleep(4000);check(await ev(`!document.querySelector('#scout-panel')&&sessionStorage.getItem('${sessionKey}')===null`),'Real user scrolling suppresses the current visit without losing eligibility');
 await fresh('/');await ev("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'))");await sleep(4000);await ev("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'))");await sleep(1800);check(!await ev("!!document.querySelector('#scout-panel')"),'Returning to a hidden tab never triggers a delayed interruption');
 await fresh('/ai-solutions');await open();await close();await nav('/');await sleep(4000);check(!await ev("!!document.querySelector('#scout-panel')"),'Manual use on another page prevents later automatic opening');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await fresh('/');await until("!!document.querySelector('#scout-panel[open]')");check(await ev("getComputedStyle(document.querySelector('#scout-panel')).animationName==='none'&&document.querySelectorAll('#scout-panel nav a').length===4"),'Reduced motion preserves complete greeting and interactions');await close();await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 const denied=await send('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(window,'sessionStorage',{get(){throw Error('denied')}})"});await nav('/');await sleep(4000);check(!await ev("!!document.querySelector('#scout-panel')"),'Denied storage safely suppresses automatic opening');await open();await close();check(true,'Manual panel remains usable without storage');await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:denied.identifier});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`sessionStorage.setItem('${sessionKey}','1')`});
 const expected=['/insights/philosophy','/ai-solutions','/salesforce','/ai-solutions#ai-development-heading'];
 for(const width of [1440,1100,800,768,600,390,320]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});await nav('/');
  check(await ev("document.documentElement.scrollWidth===innerWidth"),'Homepage has no overflow '+width);
  assert.deepEqual(await ev("[...document.querySelectorAll('.insights-preview .insight-teasers > a')].map(a=>a.getAttribute('href'))"),expected);check(true,'Four cards have intended destinations '+width);
  check(await ev(`getComputedStyle(document.querySelector('.insights-preview .insight-teasers')).gridTemplateColumns.split(' ').length===${width>1050?4:width>600?2:1}`),'Four/two/one-column layout '+width);
  if([1440,390].includes(width))await shot('homepage-cards-'+width,'.insights-preview');
  if(width===390){await open();await sleep(450);check(await ev("(()=>{const p=document.querySelector('#scout-panel'),r=p.getBoundingClientRect();return p.offsetWidth===360&&p.offsetHeight===600&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()"),'Original full panel fits mobile viewport');await shot('scout-original-mobile');await close();}

 }
 await ev("document.querySelector('.insights-preview a[data-category=custom-applications]').click()");await until("location.pathname==='/ai-solutions'&&location.hash==='#ai-development-heading'");check(await ev("!!document.querySelector('#ai-development-heading')"),'Custom Applications reaches existing development section');
 check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed assets');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,console:report.console,failedAssets:report.failedAssets}));
}finally{ws?.close();child.kill('SIGTERM');}
