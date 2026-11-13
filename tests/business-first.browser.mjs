// Run against a local production preview: node tests/business-first.browser.mjs http://localhost:3100
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
const origin=process.argv[2]||'http://localhost:3100',out=process.env.BUSINESS_REVIEW_DIR||join(tmpdir(),'aa-business-first',origin.startsWith('https:')?'live':'local');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19501','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19501/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
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


 for(const width of [1440,1100,800,768,700,390,320]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<=540});await nav('/ai-solutions');
  check(await ev("(()=>{const s=document.querySelector('#business-first');return s.previousElementSibling.id==='capabilities'&&s.nextElementSibling.id==='technology-comparison'})()"),'New section placed between capabilities and runtimes '+width);
  const layout=await ev("(()=>{const s=document.querySelector('#business-first');return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,principles:s.querySelectorAll('ol[aria-label=\"Four architectural principles\"] > li').length,agents:s.querySelector('figure ol').children.length,layers:s.querySelectorAll('[data-memory-layer]').length,clipped:[...s.querySelectorAll('p,h2,h3,h4,dt,dd,code')].filter(e=>e.clientWidth>0&&e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX==='visible').map(e=>e.textContent)}})()");
  check(layout.width===layout.scrollWidth&&layout.clipped.length===0,'No page overflow or clipped section text '+width);
  check(layout.principles===4&&layout.agents===3&&layout.layers===3,'Principles, memory scopes, and independent agents present '+width);report.layouts.push(layout);
  const a11y=await ev("(()=>{const s=document.querySelector('#business-first'),f=s.querySelector('figure');return !!document.getElementById(s.getAttribute('aria-labelledby'))&&!!document.getElementById(f.getAttribute('aria-labelledby'))&&!!document.getElementById(f.getAttribute('aria-describedby'))&&s.querySelectorAll('h2').length===1})()");check(a11y,'Section and illustration have accessible headings and description '+width);
  if([1440,390].includes(width)){const suffix=width===1440?'desktop':'mobile';await shot('business-first-'+suffix,'#business-first');await shot('customer-journey-'+suffix,'#business-first figure');}
 }
 const html=await(await fetch(origin+'/ai-solutions')).text();check(html.includes('Your business has a memory. Your AI should share it.')&&html.includes('CRM-MARIA')&&html.includes('PERSON-MARIA'),'Business-first content is present in server-rendered HTML');
 check(await ev("document.querySelector('#business-journey-caption').textContent.includes('fictional')&&document.querySelector('#business-journey-caption').textContent.includes('does not represent completed')"),'Fictional journey is distinct from shipped product claims');
 const scopes=await ev("[...document.querySelectorAll('#business-first figure ol > li')].map(e=>e.querySelector('div:nth-last-child(2)').textContent)");check(new Set(scopes).size===3,'Each agent has a distinct authorized context scope');
 check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed assets');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,layouts:report.layouts.length,errors:report.errors,console:report.console,failedAssets:report.failedAssets}));
}finally{ws?.close();child.kill('SIGTERM');}
