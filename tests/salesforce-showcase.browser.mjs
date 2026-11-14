// Run against a local production preview: node tests/salesforce-showcase.browser.mjs http://localhost:3100
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
const origin=process.argv[2]||'http://localhost:3100',out=process.env.SALESFORCE_REVIEW_DIR||join(tmpdir(),'aa-salesforce-showcase/screenshots');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19521','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19521/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
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
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:"sessionStorage.setItem('aa.scout.introduction.v1','1')"});

 const key=async(name,code)=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:code});};
 const sections=['sf-hero','sf-problems','sf-architecture','sf-tools','sf-approach','sf-consultation'];
 if(process.env.SALESFORCE_BASELINE){
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:process.env.SALESFORCE_BASELINE+'/salesforce'});await until("document.readyState==='complete'&&!!document.querySelector('main')");
  report.baselineHeight=await ev("document.querySelector('main').getBoundingClientRect().height");
 }
 for(const width of [1440,1100,900,768,600,390,320]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<540});await nav('/salesforce');await sleep(250);
  check(await ev('document.documentElement.scrollWidth===innerWidth'),'No page overflow '+width);
  check(await ev("document.querySelectorAll('main > section').length===6"),'Six focused consulting sections '+width);
  for(const id of sections)check(await ev(`!!document.getElementById('${id}')`),'Section '+id+' '+width);
  check(await ev("document.querySelectorAll('h1').length===1&&document.querySelector('h1').textContent==='Make your Salesforce org easier to change.'"),'Exact offer headline '+width);
  check(await ev("!document.querySelector('#salesforce-product-showcase,#create-trigger-action,main [role=tablist],main dialog,main button[aria-haspopup]')"),'Simulator and walkthrough absent '+width);
  check(await ev("document.querySelectorAll('[data-product-proof]').length===2&&[...document.querySelectorAll('[data-product-proof] figcaption small')].every(e=>e.textContent==='Interface reconstruction based on an actual application capture.')"),'Exactly two labeled proof views '+width);
  check(await ev("[...document.querySelectorAll('[data-product-proof]')].every(e=>e.innerText.includes('Inactive'))"),'Captured inactive states preserved '+width);
  check(await ev("JSON.stringify([...document.querySelectorAll('[data-product-proof]:last-child [class*=order] strong')].map(e=>e.textContent))==='[\"100\",\"200\",\"300\"]'"),'Actual 100/200/300 sequence '+width);
  check(await ev("[...document.querySelectorAll('[data-product-proof] [class*=order] strong')].every(e=>e.clientWidth>=e.scrollWidth)"),'Order numbers remain readable '+width);
  check(await ev("document.querySelector('main').textContent.includes('AugArch.TriggerDispatcher.dispatch()')&&document.querySelector('main').textContent.includes('Salesforce controls its overall order of execution')"),'Accurate Runtime boundaries '+width);
  check(await ev("document.querySelectorAll('main [class*=stages] > li').length===4&&document.querySelector('main').textContent.includes('Architecture decisions, code review, and validation remain human responsibilities.')"),'Four engagement stages and responsible AI '+width);
  check(await ev("document.querySelectorAll('main a[href=\"/book\"]').length===2&&[...document.querySelectorAll('main a[href=\"/book\"]')].every(e=>e.textContent.includes('Book an Architecture Consultation'))"),'Existing booking destination reused '+width);
  check(await ev("(()=>{const a=document.querySelector('a[href=\"#salesforce-architecture\"]');return a.textContent.includes('See Our Approach')&&!!document.querySelector(a.hash)})()"),'Approach anchor target valid '+width);
  check(await ev("[...document.querySelectorAll('[data-product-proof] [role=region]')].every(e=>getComputedStyle(e).overflowX==='auto'&&e.scrollWidth>=500)"),'Readable focused proofs scroll internally '+width);
  if(width===1440){
   report.newHeight=await ev("document.querySelector('main').getBoundingClientRect().height");
   if(report.baselineHeight)check(report.newHeight<report.baselineHeight*.8,'Page substantially shorter than previous production');
  }
  if([1440,390].includes(width)){
   await shot('salesforce-full-'+width,'main');await shot('salesforce-proof-'+width,'#salesforce-tools');
   await ev("document.querySelector('a[href=\"#salesforce-architecture\"]').click()");await until("location.hash==='#salesforce-architecture'");check(true,'Approach link navigates '+width);
   const region="document.querySelector('[data-product-proof] [role=region]')";
   await ev(`${region}.focus();${region}.scrollLeft=0`);await key('ArrowRight',39);await sleep(150);
   if(width===390)check(await ev(`${region}.scrollLeft>0`),'Keyboard horizontal proof scrolling '+width);
   await ev("document.querySelector('main a[href=\"/book\"]').click()");await until("location.pathname==='/book'&&document.readyState==='complete'");check(true,'Architecture consultation opens existing booking page '+width);
  }
 }
 await nav('/salesforce');
 check(await ev("document.title.includes('Salesforce Architecture Assessment & Modernization')&&document.querySelector('meta[name=description]').content.includes('Assess, clean up, and modernize')"),'Updated service SEO');
 check(await ev("document.querySelector('link[rel=canonical]').href.endsWith('/salesforce')&&document.querySelector('meta[property=\"og:title\"]').content.includes('Architecture Assessment')"),'Canonical and Open Graph retained');
 for(const path of ['/','/ai-solutions','/salesforce','/book','/contact','/insights'])check((await fetch(origin+path)).status===200,'Healthy route '+path);
 for(const name of ['01-architecture-explorer','02-registration-manager','03-native-flow-discovery','04-apex-source-inspector','05-apex-dependencies','06-context-handler-grouping','07-open-in-vscode-button','08-wizard-target','09-wizard-execution-order','10-wizard-create-handler','11-wizard-handler-verified','12-wizard-compatibility','13-wizard-register','14-registration-success'])check((await fetch(origin+'/images/salesforce-showcase/'+name+'.png')).ok,'Capture retained '+name);
 check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed browser assets');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,baselineHeight:report.baselineHeight,newHeight:report.newHeight,errors:report.errors,console:report.console,failedAssets:report.failedAssets,out},null,2));
}finally{ws?.close();child.kill('SIGTERM');}
