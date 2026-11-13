// Run against a local production preview: node tests/runtime-comparison.browser.mjs http://localhost:3100
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
const origin=process.argv[2]||'http://localhost:3100',out=process.env.RUNTIME_REVIEW_DIR||join(tmpdir(),'aa-runtime-pass1/screenshots');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19479','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19479/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
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

 const ids=['langgraph','hermes','openclaw','crewai','openai-agents','google-adk','n8n','copilot-studio'];
 const key=async(name,code,modifiers=0)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:name,code:name,windowsVirtualKeyCode:code,modifiers,...(name==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key:name,code:name,windowsVirtualKeyCode:code});};
 for(const width of [1440,1100,800,768,600,390,320]){
  const height=width<=540?844:1000;await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=540});await send('Emulation.setTouchEmulationEnabled',{enabled:width<=540});await nav('/ai-solutions');
  await until("!!document.querySelector('#technology-comparison button')");await sleep(500);
  check(await ev("document.documentElement.scrollWidth===innerWidth"),'No page overflow '+width);
  check(await ev("document.querySelectorAll('#technology-comparison ul')[0].children.length===6&&document.querySelectorAll('#technology-comparison ul')[1].children.length===2"),'Six plus two technologies '+width);
  check(await ev("[...document.querySelectorAll('#technology-comparison img')].length===7&&[...document.querySelectorAll('#technology-comparison img')].every(i=>i.complete&&i.naturalWidth>0&&getComputedStyle(i).filter==='none'&&i.alt.length>0)"),'Official local assets load without filters '+width);
  const columns=await ev("[...document.querySelectorAll('#technology-comparison ul')].map(l=>getComputedStyle(l).gridTemplateColumns.split(' ').length)");
  check(columns[0]===(width>1050?3:width>600?2:1)&&columns[1]===(width>600?2:1),'Correct responsive grid '+width);
  if([1440,390].includes(width)){
   const suffix=width===1440?'desktop':'mobile';
   await ev("document.querySelector('#technology-comparison').scrollIntoView({behavior:'instant'})");await sleep(200);await shot('runtime-'+suffix,'#technology-comparison');
   for(let i=0;i<8;i++){
    const open=`document.querySelectorAll('#technology-comparison button[aria-haspopup=dialog]')[${i}]`;
    await ev(`${open}.scrollIntoView({block:'center',behavior:'instant'})`);
    if(width===390){const point=await ev(`(()=>{const r=${open}.getBoundingClientRect();return {x:r.x+30,y:r.y+30}})()`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    else await ev(`${open}.click()`);
    await until("!!document.querySelector('#technology-detail-dialog[open]')");
    check(await ev("document.activeElement.getAttribute('aria-label')==='Close technology details'"),'Initial close focus '+ids[i]+' '+width);
    check(await ev("document.querySelectorAll('#technology-detail-dialog h3').length===6&&[...document.querySelectorAll('#technology-detail-dialog section')].filter(e=>e.querySelector('p')).every(e=>e.querySelector('p:last-child').textContent.length>30)"),'Six specific details '+ids[i]+' '+width);
    const expectedHeadings=i<6?['What is it?','What makes it different?','When should you use it?','Business example','Considerations','Official documentation']:['What is it?','What is it best for?','Why would we choose it?','Real-world example','Considerations','Official documentation'];
    assert.deepEqual(await ev("[...document.querySelectorAll('#technology-detail-dialog h3')].map(e=>e.textContent)"),expectedHeadings);check(true,'Correct group-specific headings '+ids[i]+' '+width);
    check(await ev("(()=>{const d=document.querySelector('#technology-detail-dialog'),r=d.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth+1})()"),'Dialog fits viewport '+ids[i]+' '+width);
    check(await ev("document.querySelector('#technology-detail-dialog a').href.startsWith('https:')&&!document.querySelector('#technology-detail-dialog a').hasAttribute('target')"),'Documentation link same tab '+ids[i]+' '+width);
    if(i===0){check(await ev("document.querySelector('#technology-detail-dialog > div:last-child').scrollTop===0"),'Dialog starts at the beginning '+width);await sleep(200);await shot('dialog-'+suffix);}
    await key('Tab',9,8);check(await ev("document.activeElement.matches('#technology-detail-dialog a')"),'Reverse Tab wraps '+ids[i]+' '+width);await key('Tab',9);check(await ev("document.activeElement.getAttribute('aria-label')==='Close technology details'"),'Forward Tab wraps '+ids[i]+' '+width);
    if(i%2===0)await key('Escape',27);else await ev("document.querySelector('#technology-detail-dialog button').click()");
    await until("!document.querySelector('#technology-detail-dialog')");await until(`document.activeElement===${open}`);check(true,'Dismiss and restore focus '+ids[i]+' '+width);
   }
  }
 }
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await send('Emulation.setTouchEmulationEnabled',{enabled:false});await nav('/ai-solutions');
 await ev("document.querySelector('#technology-comparison button').scrollIntoView({block:'center',behavior:'instant'})");await sleep(300);
 let point=await ev("(()=>{const r=document.querySelector('#technology-comparison button').getBoundingClientRect();return {x:r.x+20,y:r.y+20}})()");await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await until("!!document.querySelector('[role=tooltip]')");check(true,'Hover shows compact preview');
 await sleep(180);await shot('hover-desktop');await key('Escape',27);await until("!document.querySelector('[role=tooltip]')");check(true,'Escape dismisses pointer preview');
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await ev("document.querySelector('#technology-comparison button').focus()");await until("!!document.querySelector('[role=tooltip]')");check(true,'Keyboard focus shows preview');await key('Enter',13);await until("!!document.querySelector('#technology-detail-dialog[open]')");check(await ev("!document.querySelector('[role=tooltip]')"),'Click or keyboard opening suppresses previews');await key('Escape',27);await until("!document.querySelector('#technology-detail-dialog')");
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await ev("document.querySelector('#technology-comparison button').click()");await until("!!document.querySelector('#technology-detail-dialog[open]')");check(await ev("getComputedStyle(document.querySelector('#technology-detail-dialog')).animationName==='none'"),'Reduced motion disables dialog animation');await key('Escape',27);
 for(const path of ['/','/salesforce','/insights','/insights/philosophy','/about','/contact','/book'])assert.equal((await fetch(origin+path)).status,200,path);check(true,'Existing routes remain healthy');
 check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed assets');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,console:report.console,failedAssets:report.failedAssets},null,2));
}finally{ws?.close();child.kill('SIGTERM');}
