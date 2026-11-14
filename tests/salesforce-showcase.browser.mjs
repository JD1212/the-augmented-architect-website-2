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

 const viewer='#salesforce-product-showcase',tour='#create-trigger-action';
 const text=selector=>ev(`document.querySelector(${JSON.stringify(selector)}).innerText`);
 const click=async selector=>{await ev(`document.querySelector(${JSON.stringify(selector)}).click()`);await sleep(80);};
 const key=async(name,code,modifiers=0)=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:code,modifiers});};
 const surfaces=['explorer','sequence','flow','source','vscode'];
 for(const width of [1440,1100,768,390,320]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<540});await nav('/salesforce');await until("!!document.querySelector('#sf-product-tab-explorer')");await sleep(300);
  check(await ev('document.documentElement.scrollWidth===innerWidth'),'No page overflow '+width);
  check(await ev(`${JSON.stringify(viewer)}&&document.querySelectorAll('#salesforce-product-showcase > [role=tablist] [role=tab]').length===5`),'Five product tabs '+width);
  for(const [index,id] of ['explorer','registrations','flow','dependencies','vscode'].entries()){
   await click('#sf-product-tab-'+id);await until(`!!document.querySelector('${viewer} [data-interface=${surfaces[index]}]')`);
   check((await text(viewer)).includes('Interface reconstruction based on an actual application capture.'),'Reconstruction labeled '+id+' '+width);
   check(await ev(`(()=>{const e=document.querySelector('${viewer} [role=region]');return getComputedStyle(e).overflowX==='auto'&&e.scrollWidth>=1040})()`),'Readable internal scroll '+id+' '+width);
   if(id==='explorer')check((await text(viewer)).includes('Demo_Account_Review')&&(await text(viewer)).includes('Inactive'),'Captured Account names and states '+width);
   if(id==='registrations'){
    check(await ev(`JSON.stringify([...document.querySelectorAll('${viewer} [data-interface] [class*=order] strong')].map(e=>e.textContent))==='["100","200","300"]'`),'Execution orders 100/200/300 '+width);
    await click('#sf-variant-tab-context');check((await text(viewer)).includes('DemoAccountRoutingHandler')&&(await text(viewer)).includes('Demo Account Prepare Review'),'Context handlers and exact Flow heading '+width);check(await ev(`Array.from(document.querySelectorAll('${viewer} [class*=order] strong')).every(e=>e.scrollWidth<=e.clientWidth)`),'Context order numbers do not wrap '+width);
   }
   if(id==='flow')check((await text(viewer)).includes('Demo_Opportunity_Discount_Review')&&(await text(viewer)).includes('A detailed Flow Inspector has not been supplied'),'Accurate Flow discovery limitation '+width);
   if(id==='dependencies'){
    check((await text(viewer)).includes('DemoLegacySalesPolicyService.netValue(amount, discount)')&&(await text(viewer)).includes('remaining trigger source is outside'),'Only captured source excerpt '+width);
    await click('#sf-variant-tab-dependencies');await ev("document.querySelector('#salesforce-product-showcase img').scrollIntoView({block:'center',behavior:'instant'})");await until(`!!document.querySelector('${viewer} img')&&document.querySelector('${viewer} img').complete`);
    check(await ev(`(()=>{const i=document.querySelector('${viewer} img');return i.naturalWidth>0&&i.alt.includes('dependency tree')&&getComputedStyle(i).filter==='none'})()`),'Actual dependency image loads '+width);
   }
   if([1440,390].includes(width))await shot('view-'+id+'-'+width,viewer);
   if(id==='vscode')check((await text(viewer)).includes('Open in VS Code')&&(await text(viewer)).includes('desktop workspace capture is still pending'),'Accurate captured IDE action '+width);
  }
  await click('#sf-product-tab-explorer');await ev("document.querySelector('#sf-product-tab-explorer').focus()");await key('ArrowRight',39);await until("document.querySelector('#sf-product-tab-registrations').getAttribute('aria-selected')==='true'");check(await ev("document.activeElement.id==='sf-product-tab-registrations'"),'Arrow-key tab navigation '+width);
  await key('End',35);check(await ev("document.activeElement.id==='sf-product-tab-vscode'"),'End-key tab navigation '+width);await key('Home',36);
  for(let step=0;step<5;step++){
   await click(`${tour} nav button:nth-child(${step+1})`);
   check((await text(tour)).includes(`Step ${step+1} of 5`),'Step counter '+(step+1)+' '+width);
   if(step===0)check((await text(tour)).includes('AFTER_INSERT')&&await ev(`document.querySelector('${tour} > div:last-child button:first-child').disabled`),'Target and disabled Previous '+width);
   if(step===1)check((await text(tour)).includes('No existing Trigger Actions are registered'),'No existing actions for AFTER_INSERT '+width);
   if(step===2){check((await text(tour)).includes('My_Account_HandlerTest'),'Companion test artifact '+width);await click('#sf-walkthrough-variant-tab-verified');check((await text(tour)).includes('Apex handler bundle created successfully.')&&(await text(tour)).includes('Capability declared'),'Captured verified stage '+width);}
   if(step===3)check(await ev(`document.querySelectorAll('${tour} [data-interface] li').length===6`),'Six captured compatibility checks '+width);
   if(step===4){check((await text(tour)).includes('Register Inactive Trigger Action'),'Inactive registration review '+width);await click('#sf-walkthrough-variant-tab-result');check(await ev(`document.querySelectorAll('${tour} [data-interface] [class*=order] strong').length===4`),'Four-action result '+width);check((await text(tour)).includes('My Account Handler AFTER INSERT'),'Exact new action name '+width);}
   if([1440,390].includes(width))await shot('step-'+(step+1)+'-'+width,tour);
  }
  check(await ev(`document.querySelector('${tour} > div:last-child button:last-child').disabled`),'Disabled Next at end '+width);await click(`${tour} > div:last-child button:first-child`);check((await text(tour)).includes('Step 4 of 5'),'Previous works '+width);await click(`${tour} > div:last-child button:last-child`);check((await text(tour)).includes('Step 5 of 5'),'Next works '+width);
  if(width===1440||width===390){
   const suffix=width===1440?'desktop':'mobile';await shot('product-'+suffix,viewer);await shot('walkthrough-'+suffix,tour);
   for(const mode of ['interface','capture']){
    const opener=`${viewer} button[aria-haspopup=dialog]:${mode==='interface'?'first':'last'}-child`;
    await click(opener);await until("!!document.querySelector('[data-product-dialog][open]')");
    check(await ev("document.activeElement.getAttribute('aria-label')==='Close expanded view'"),'Dialog initial focus '+mode+' '+width);
    check(await ev("(()=>{const d=document.querySelector('[data-product-dialog]'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth+1})()"),'Dialog fits viewport '+mode+' '+width);
    if(mode==='capture'){
     await until("document.querySelector('[data-product-dialog] img').complete");
     check(await ev("(()=>{const i=document.querySelector('[data-product-dialog] img');return i.clientWidth===i.naturalWidth&&getComputedStyle(i).filter==='none'})()"),'Actual-size capture default '+width);
     await click('[data-product-dialog] button[aria-pressed=false]');
     check(await ev("(()=>{const i=document.querySelector('[data-product-dialog] img');return i.clientWidth<=i.parentElement.clientWidth&&Math.abs(i.clientWidth/i.clientHeight-i.naturalWidth/i.naturalHeight)<.01})()"),'Fit preserves image ratio '+width);
    }
    await ev("document.querySelector('[data-product-dialog] button').focus()");await key('Tab',9,8);check(await ev("document.activeElement.matches('[data-product-dialog] [role=region]')"),'Reverse focus trap '+mode+' '+width);await key('Tab',9);check(await ev("document.activeElement.getAttribute('aria-label')==='Close expanded view'"),'Forward focus trap '+mode+' '+width);
    await shot('expanded-'+mode+'-'+suffix);await key('Escape',27);await until("!document.querySelector('[data-product-dialog]')");check(await ev(`document.activeElement===document.querySelector(${JSON.stringify(opener)})`),'Escape and focus restoration '+mode+' '+width);
   }
  }
 }
 // Every source capture has a public-safe evidence image; originals stay private.
 const filenames=['01-architecture-explorer','02-registration-manager','03-native-flow-discovery','04-apex-source-inspector','05-apex-dependencies','06-context-handler-grouping','07-open-in-vscode-button','08-wizard-target','09-wizard-execution-order','10-wizard-create-handler','11-wizard-handler-verified','12-wizard-compatibility','13-wizard-register','14-registration-success'];
 for(const file of filenames){const r=await fetch(origin+'/images/salesforce-showcase/'+file+'.png');check(r.ok&&r.headers.get('content-type')?.includes('image/png'),'Public-safe capture '+file);}
 check((await fetch(origin+'/images/salesforce-website-captures/11-wizard-handler-verified.png')).status===404,'Unreviewed original not publicly hosted');
 for(const path of ['/','/ai-solutions','/salesforce','/insights/philosophy','/book'])check((await fetch(origin+path)).status===200,'Healthy route '+path);
 check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed browser assets');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,console:report.console,failedAssets:report.failedAssets,out},null,2));
}finally{ws?.close();child.kill('SIGTERM');}
