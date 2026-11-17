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

 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const nativeFetch=window.fetch.bind(window);window.fetch=async(input,init={})=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.origin!==location.origin)return nativeFetch(input,init);if(url.pathname==='/api/scout/scheduling')return Response.json({enabled:false,proposals:[],verificationRequired:false});if(url.pathname==='/api/booking')return Response.json({error:'Fixture: no live booking.'},{status:503});if(url.pathname!=='/api/scout')return nativeFetch(input,init);if((init.method||'GET')==='POST'){const data=JSON.parse(init.body);return new Response(JSON.stringify({type:'done',messages:[{id:data.clientTurnId,role:'user',content:data.message},{id:'fixture-reply',role:'assistant',content:'What is your name, email, and preferred time?'}],expiresInMs:86400000})+'\\n',{headers:{'Content-Type':'application/x-ndjson'}});}return Response.json({messages:[],busy:false,failed:null,sessionReset:false,expiresInMs:null});};})()`});
 const key=async(name,code,modifiers=0)=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:code,modifiers,...(name==='Enter'&&type==='keyDown'?{text:'\r'}:{})});};
 const sections=['sf-hero','sf-problems','sf-architecture','sf-tools','sf-approach','sf-consultation'];
 const files=['command-center-overview','architecture-explorer','trigger-dependencies','metadata-field-dependencies','open-in-vscode-action','vscode-source-files','vscode-ai-context'];
 for(const width of [1440,1100,900,768,600,390,320]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<540});await nav('/salesforce');await sleep(250);
  check(await ev('document.documentElement.scrollWidth===innerWidth'),'No page overflow '+width);
  check(await ev("document.querySelectorAll('main > section').length===6"),'Six existing consulting sections '+width);
  for(const id of sections)check(await ev(`!!document.getElementById('${id}')`),'Section preserved '+id+' '+width);
  check(await ev("document.querySelectorAll('h1').length===1&&document.querySelector('h1').textContent==='Make your Salesforce org easier to change.'"),'Approved hero unchanged '+width);
  check(await ev("!document.querySelector('#salesforce-product-showcase,#create-trigger-action,main [role=tablist]')"),'No product simulator or new walkthrough '+width);
  check(await ev("document.querySelectorAll('[data-product-proof]').length===8&&document.querySelectorAll('[data-capture-image]').length===8"),'Eight authentic capture views including retained registration example '+width);
  for(const file of files)check(await ev(`!!document.querySelector('[data-capture-image="/images/salesforce-showcase-2/${file}.png"] img')`),'Approved real capture '+file+' '+width);
  check(await ev("document.querySelector('main').textContent.includes('four registered actions')&&document.querySelector('main').textContent.includes('three inactive actions at orders 100, 200, and 300')&&document.querySelector('main').textContent.includes('no matching record-triggered Flows')"),'Four/three-action and empty Flow boundaries '+width);
  check(await ev("document.querySelector('main').textContent.includes('Inactive registrations do not demonstrate executed automation')&&document.querySelector('main').textContent.includes('dependency inspection is not exhaustive')&&document.querySelector('main').textContent.includes('not completed AI debugging')"),'Accurate demonstration boundaries '+width);
  check(await ev("document.querySelector('main').textContent.includes('AugArch.TriggerDispatcher.dispatch()')&&document.querySelector('main').textContent.includes('Salesforce controls its overall order of execution')"),'Thin-trigger diagram and Runtime qualifications retained '+width);
  check(await ev("document.querySelectorAll('main [class*=stages] > li').length===4&&document.querySelector('main').textContent.includes('Architecture decisions, code review, and validation remain human responsibilities.')"),'Four engagement stages and human review retained '+width);
  check(await ev("document.querySelectorAll('main a[href=\"/book\"]').length===2&&[...document.querySelectorAll('main a[href=\"/book\"]')].every(e=>e.textContent.includes('Book an Architecture Consultation'))"),'Existing consultation CTAs retained '+width);
  check(await ev("(()=>{const a=document.querySelector('a[href=\"#salesforce-architecture\"]');return a.textContent.includes('See Our Approach')&&!!document.querySelector(a.hash)})()"),'Existing approach anchor retained '+width);
  check(await ev("document.querySelectorAll('#salesforce-tools details').length===2&&[...document.querySelectorAll('#salesforce-tools details')].every(d=>!d.open)"),'Secondary inspection details initially compact '+width);
  const indexes=[1440,390].includes(width)?[0,1,2,3,4,5,6,7]:[0];
  for(const index of indexes){
   const trigger=`document.querySelectorAll('[data-capture-image]')[${index}]`;
   await ev(`(()=>{const b=${trigger};const d=b.closest('details');if(d)d.open=true;b.scrollIntoView({block:'center',behavior:'instant'});b.focus()})()`);
   await key('Enter',13);await until("!!document.querySelector('[data-product-dialog][open]')");
   await until("document.querySelector('[data-product-dialog] img')?.complete&&document.querySelector('[data-product-dialog] img').naturalWidth>0");
   check(await ev("(()=>{const d=document.querySelector('[data-product-dialog]'),r=d.getBoundingClientRect();return d.matches(':modal')&&r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&!!document.getElementById(d.getAttribute('aria-labelledby'))&&d.contains(document.activeElement)})()"),'Accessible native-size viewer fits '+index+' '+width);
   check(await ev("(()=>{const d=document.querySelector('[data-product-dialog]'),i=d.querySelector('img');return Math.abs(i.getBoundingClientRect().width-i.naturalWidth)<1})()"),'Native-size text detail preserved '+index+' '+width);
   if(index===0){
    await key('Tab',9,8);check(await ev("document.activeElement.matches('[data-product-dialog] [role=region]')"),'Reverse focus trap reaches scroll canvas '+width);await key('Tab',9);check(await ev("document.activeElement.matches('[data-product-dialog] button')"),'Forward focus trap returns to close '+width);
    if(width<=390){await ev("document.querySelector('[data-product-dialog] [role=region]').focus()");await key('ArrowRight',39);await sleep(160);check(await ev("document.querySelector('[data-product-dialog] [role=region]').scrollLeft>0"),'Keyboard native-size inspection scrolls horizontally '+width);}
   }

   await ev("[...document.querySelectorAll('[data-product-dialog] button')].find(b=>b.textContent==='Fit image').click()");
   check(await ev("(()=>{const d=document.querySelector('[data-product-dialog]'),i=d.querySelector('img'),r=i.getBoundingClientRect();return r.width<=d.clientWidth+1&&d.scrollWidth<=d.clientWidth+1})()"),'Fit image avoids dialog overflow '+index+' '+width);
   await ev("[...document.querySelectorAll('[data-product-dialog] button')].find(b=>b.textContent==='Actual size').click()");
   check(await ev("(()=>{const d=document.querySelector('[data-product-dialog]'),i=d.querySelector('img');return Math.abs(i.getBoundingClientRect().width-i.naturalWidth)<1})()"),'Actual size restores original pixels '+index+' '+width);
   if([1440,390].includes(width)&&index===6)await shot('salesforce-enlarged-'+width);
   await key('Escape',27);await until("!document.querySelector('[data-product-dialog]')");
   check(await ev(`document.activeElement===${trigger}`),'Escape restores screenshot-trigger focus '+index+' '+width);
   if(index===0){await ev(`${trigger}.click()`);await until("!!document.querySelector('[data-product-dialog][open]')");await ev("document.querySelector('[data-product-dialog] button').click()");await until("!document.querySelector('[data-product-dialog]')");check(await ev(`document.activeElement===${trigger}`),'Close button restores trigger focus '+width);}

   if(await ev(`${trigger}.closest('details')!==null`))await ev(`${trigger}.closest('details').open=false`);
  }
  if([1440,390].includes(width)){
   await shot('salesforce-full-'+width,'main');await shot('salesforce-proof-'+width,'#salesforce-tools');
   await ev("document.querySelector('a[href=\"#salesforce-architecture\"]').click()");await until("location.hash==='#salesforce-architecture'");check(true,'Approach link works '+width);
   await ev("document.querySelector('main a[href=\"/book\"]').click()");await until("!!document.querySelector('#scout-panel[open] [data-scout-booking-entry]')&&document.activeElement.id==='scout-draft'");
   check(await ev("location.pathname==='/salesforce'&&!document.querySelector('#consultation-booking[open]')"),'Existing CTA opens Scout with mocked booking entry '+width);
   check(await ev("(()=>{const p=document.querySelector('#scout-panel');return p.offsetWidth===Math.min(360,innerWidth-24)&&p.offsetHeight===600})()"),'Approved Scout dimensions unchanged '+width);
   await ev("document.querySelector('[aria-label=\"Minimize Scout\"]').click()");
  }
 }
 await nav('/salesforce');
 check(await ev("document.title.includes('Salesforce Architecture Assessment & Modernization')&&document.querySelector('meta[name=description]').content.includes('Assess, clean up, and modernize')"),'Existing metadata retained');
 check(await ev("document.querySelector('link[rel=canonical]').href.endsWith('/salesforce')&&document.querySelector('meta[property=\"og:title\"]').content.includes('Architecture Assessment')"),'Canonical and Open Graph retained');
 for(const path of ['/','/ai-solutions','/salesforce','/book','/contact','/insights'])check((await fetch(origin+path)).status===200,'Healthy route '+path);
 for(const name of ['01-architecture-explorer','02-registration-manager','03-native-flow-discovery','04-apex-source-inspector','05-apex-dependencies','06-context-handler-grouping','07-open-in-vscode-button','08-wizard-target','09-wizard-execution-order','10-wizard-create-handler','11-wizard-handler-verified','12-wizard-compatibility','13-wizard-register','14-registration-success'])check((await fetch(origin+'/images/salesforce-showcase/'+name+'.png')).ok,'Existing capture retained '+name);
 const {createHash}=await import('node:crypto');const {readFile}=await import('node:fs/promises');
 const manifest=JSON.parse(await readFile('docs/salesforce-showcase-2-manifest.json','utf8'));
 for(const image of manifest.images){const response=await fetch(origin+'/images/salesforce-showcase-2/'+image.file);check(response.ok,'Sanitized PNG served '+image.file);check(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex')===image.outputSha256,'Published image matches approved sanitized bytes '+image.file);}
 for(const path of ['/images/salesforce-showcase-2/salesforce-new-real-captures.zip','/images/salesforce-showcase-2/11-vscode-ai-context-sensitive.png','/images/salesforce-showcase-2/03-apex-inspector-error-exclude.png'])check((await fetch(origin+path)).status===404,'Unredacted source is not public '+path);
 check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed browser assets');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,console:report.console,failedAssets:report.failedAssets,out},null,2));
}finally{ws?.close();child.kill('SIGTERM');}
