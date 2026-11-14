// Run against a local production preview: node tests/modernization-faq.browser.mjs http://localhost:3100
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
const origin=process.argv[2]||'http://localhost:3100',out=process.env.FAQ_REVIEW_DIR||join(tmpdir(),'aa-modernization-faq/screenshots');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19611','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19611/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
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

 const key=async(name,code,modifiers=0)=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:code,modifiers,...(name==='Enter'&&type==='keyDown'?{text:'\r'}:{})});};
 const opener="document.querySelector('#whats-included button[aria-haspopup=dialog]')";
 const position=()=>ev("(()=>{const r=document.querySelector('#custom-package').getBoundingClientRect();return {height:document.querySelector('main').getBoundingClientRect().height,x:r.x,y:r.y,scroll:document.querySelector('.site-content').scrollTop,windowScroll:scrollY}})()");
 for(const width of [1440,1100,768,390,320]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<540});await nav('/custom-applications');
  check(await ev(`${opener}.textContent.includes('Questions Before You Modernize')`),'Understated package FAQ trigger '+width);
  check(await ev("!document.querySelector('#modernization-faq-dialog')"),'Dialog absent until requested '+width);
  await ev(`${opener}.scrollIntoView({block:'center',behavior:'instant'});${opener}.focus()`);const before=await position();
  await key('Enter',13);await until("!!document.querySelector('#modernization-faq-dialog[open]')");
  check(await ev("document.activeElement.getAttribute('aria-label')==='Close modernization questions'"),'Keyboard opens dialog with close focus '+width);
  check(await ev("(()=>{const d=document.querySelector('#modernization-faq-dialog');return d.matches(':modal')&&!!document.getElementById(d.getAttribute('aria-labelledby'))&&!!document.getElementById(d.getAttribute('aria-describedby'))})()"),'Native modal with accessible name and description '+width);
  check(await ev("document.querySelectorAll('#modernization-faq-dialog section').length===8&&document.querySelectorAll('#modernization-faq-dialog h3').length===8"),'All eight questions and answers '+width);
  check(await ev("[...document.querySelectorAll('#modernization-faq-dialog section')].every(s=>s.querySelectorAll('p').length>=3)"),'Complete conversational answers '+width);
  check(await ev("(()=>{const t=document.querySelector('#modernization-faq-dialog').textContent;return t.includes('Search rankings cannot be guaranteed')&&t.includes('one agreed, supported integration')&&t.includes('not automatically included in the $10,000 starting package')})()"),'SEO, integration, and optional AI boundaries retained '+width);
  check(await ev("(()=>{const d=document.querySelector('#modernization-faq-dialog'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth+1})()"),'Dialog fits viewport without horizontal overflow '+width);
  check(await ev("(()=>{const e=document.querySelector('#modernization-faq-dialog [role=region]');return e.scrollHeight>e.clientHeight&&getComputedStyle(e).overflowY==='auto'})()"),'Answers scroll inside bounded dialog '+width);
  assert.deepEqual(await position(),before);check(true,'Opening preserves underlying layout and scroll '+width);
  await key('Tab',9,8);check(await ev("document.activeElement.matches('#modernization-faq-dialog a[href=\"/book\"]')"),'Reverse Tab wraps to consultation '+width);
  await key('Tab',9);check(await ev("document.activeElement.getAttribute('aria-label')==='Close modernization questions'"),'Forward Tab wraps to close '+width);
  await key('Tab',9);check(await ev("document.activeElement.matches('#modernization-faq-dialog [role=region]')"),'Scrollable content is keyboard focusable '+width);
  await key('PageDown',34);await sleep(180);check(await ev("document.querySelector('#modernization-faq-dialog [role=region]').scrollTop>0"),'Keyboard scroll works '+width);
  await ev("document.querySelector('#modernization-faq-dialog [role=region]').scrollTop=0");
  if([1440,390].includes(width))await shot('faq-open-'+width);
  await key('Escape',27);await until("!document.querySelector('#modernization-faq-dialog')");check(await ev(`document.activeElement===${opener}`),'Escape closes and restores trigger focus '+width);
  assert.deepEqual(await position(),before);check(true,'Closing preserves page layout and scroll '+width);
  await ev(`${opener}.click()`);await until("!!document.querySelector('#modernization-faq-dialog[open]')");check(await ev("document.querySelector('#modernization-faq-dialog [role=region]').scrollTop===0"),'Reopening starts at first question '+width);
  await ev("document.querySelector('#modernization-faq-dialog button').click()");await until("!document.querySelector('#modernization-faq-dialog')");check(await ev(`document.activeElement===${opener}`),'Close button restores focus '+width);
  await ev(`${opener}.click()`);await until("!!document.querySelector('#modernization-faq-dialog[open]')");await ev("document.querySelector('#modernization-faq-dialog [role=region]').scrollTop=100000");
  check(await ev("(()=>{const a=document.querySelector('#modernization-faq-dialog a');return a.getAttribute('href')==='/book'&&a.textContent.includes('Book a Free Consultation')&&!a.target})()"),'Existing consultation link at modal bottom '+width);
  if([1440,390].includes(width))await shot('faq-bottom-'+width);
  await ev("document.querySelector('#modernization-faq-dialog a').click()");await until("location.pathname==='/book'&&!document.querySelector('#modernization-faq-dialog')");check(true,'Consultation navigation closes modal '+width);
 }
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:500,deviceScaleFactor:1,mobile:true});await nav('/custom-applications');await ev(`${opener}.click()`);await until("!!document.querySelector('#modernization-faq-dialog[open]')");
 check(await ev("(()=>{const d=document.querySelector('#modernization-faq-dialog'),r=d.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.querySelector('#modernization-faq-dialog [role=region]').clientHeight>80})()"),'Short mobile viewport retains usable scrolling');await key('Escape',27);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await ev(`${opener}.click()`);await until("!!document.querySelector('#modernization-faq-dialog[open]')");check(await ev("getComputedStyle(document.querySelector('#modernization-faq-dialog')).animationName==='none'"),'No motion required for FAQ');await key('Escape',27);
 for(const path of ['/','/ai-solutions','/salesforce']){await nav(path);check(await ev("!document.querySelector('#modernization-faq-dialog')&&![...document.querySelectorAll('button')].some(e=>e.textContent.includes('Questions Before You Modernize'))"),'FAQ confined to custom applications; healthy '+path);}
 check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed assets');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,console:report.console,failedAssets:report.failedAssets,out},null,2));
}finally{ws?.close();child.kill('SIGTERM');}
