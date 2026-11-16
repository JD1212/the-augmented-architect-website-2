// Run against a local production preview: node tests/service-faq.browser.mjs http://localhost:3100
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
const origin=process.argv[2]||'http://localhost:3100',out=process.env.SERVICE_FAQ_REVIEW_DIR||join(tmpdir(),'aa-service-faq/screenshots');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19611','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19611/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.console.push(m.params.args);if(m.method==='Network.responseReceived'&&m.params.response.status>=400&&!(m.params.response.url.includes('/api/booking')&&m.params.response.status===503))report.failedAssets.push(m.params.response.url);};
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
 const routes=[['/ai-solutions','Questions About AI for Your Business',7],['/salesforce','Questions About Salesforce Modernization',7],['/custom-applications','Questions Before You Modernize',8]];
 const opener="[...document.querySelectorAll('[data-faq-launcher]')].find(e=>e.checkVisibility())";
 const visible=()=>ev(`!!(${opener})&&getComputedStyle(${opener}).visibility==='visible'`);
 const position=()=>ev("(()=>{const r=document.querySelector('main').getBoundingClientRect();return {height:r.height,x:r.x,y:r.y,scroll:document.querySelector('.site-content').scrollTop,windowScroll:scrollY}})()");
 const checkPlacement=async label=>{check(await ev(`(()=>{const f=${opener}.getBoundingClientRect(),s=document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]').getBoundingClientRect(),dock=document.querySelector('.consultation-dock');return f.left>=0&&f.right<=innerWidth&&f.top>=0&&Math.abs(s.top-f.bottom-12)<2&&f.height<s.height&&(!dock||getComputedStyle(dock).display==='none'||f.bottom<=dock.getBoundingClientRect().top)})()`),'Secondary launcher 12px above Scout and clear of consultation dock '+label);};
 for(const width of [1440,1100,768,600,540,390,320]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:width<=540?844:1000,deviceScaleFactor:1,mobile:width<=540});await send('Emulation.setTouchEmulationEnabled',{enabled:width<=540});
  for(const [path,title,count] of routes){
   await nav(path);await until("!!document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]')");await sleep(700);
   check(await visible(),'Launcher visible on '+path+' '+width);
   check(await ev(`${opener}.textContent==='Questions?'&&${opener}.getAttribute('aria-label').includes('Questions?')&&${opener}.querySelector('svg')!==null`),'Help icon, visible text, and accessible label '+path+' '+width);
   check(await ev("document.querySelectorAll('[data-faq-launcher]').length===1&&!document.querySelector('main [data-faq-launcher],#whats-included button[aria-haspopup=dialog]')"),'One floating launcher; buried inline entry removed '+path+' '+width);
   await checkPlacement(path+' '+width);
   check(await ev('document.documentElement.scrollWidth===innerWidth'),'No page overflow '+path+' '+width);
   await ev("document.querySelector('main > section:nth-child(3)').scrollIntoView({behavior:'instant',block:'start'})");await sleep(300);await checkPlacement('after scrolling '+path+' '+width);
   if([1440,390].includes(width))await shot('launcher-'+path.slice(1)+'-'+width);
   await ev(`${opener}.focus()`);const before=await position();
   if(width===390){const point=await ev(`(()=>{const r=${opener}.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else await key('Enter',13);
   await until("!!document.querySelector('[data-service-faq-dialog][open]')");
   check(await ev(`document.querySelector('[data-service-faq-dialog][open] h2').textContent===${JSON.stringify(title)}&&document.querySelectorAll('[data-service-faq-dialog][open] section').length===${count}`),'Correct service heading and '+count+' answers '+path+' '+width);
   check(await ev("document.activeElement.matches('[data-service-faq-dialog][open] button')"),'Modal receives close focus '+path+' '+width);
   check(await ev("(()=>{const d=document.querySelector('[data-service-faq-dialog][open]'),r=d.getBoundingClientRect();return d.matches(':modal')&&!!document.getElementById(d.getAttribute('aria-labelledby'))&&!!document.getElementById(d.getAttribute('aria-describedby'))&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth+1})()"),'Accessible modal fits viewport '+path+' '+width);
   assert.deepEqual(await position(),before);check(true,'Modal does not shift page layout '+path+' '+width);
   await key('Tab',9,8);check(await ev("document.activeElement.matches('[data-service-faq-dialog][open] a[href=\"/book\"]')"),'Reverse focus trap '+path+' '+width);await key('Tab',9);check(await ev("document.activeElement.matches('[data-service-faq-dialog][open] button')"),'Forward focus trap '+path+' '+width);
   await key('Tab',9);await key('PageDown',34);await sleep(160);check(await ev("document.activeElement.matches('[data-service-faq-dialog][open] [role=region]')&&document.activeElement.scrollTop>0"),'Keyboard-scrollable answers '+path+' '+width);
   await ev("document.querySelector('[data-service-faq-dialog][open] [role=region]').scrollTop=0");if([1440,390].includes(width))await shot('modal-'+path.slice(1)+'-'+width);
   if(path==='/custom-applications')check(await ev("(()=>{const t=document.querySelector('[data-service-faq-dialog][open]').textContent;return t.includes('Search rankings cannot be guaranteed')&&t.includes('not automatically included in the $10,000 starting package')})()"),'Approved custom FAQ boundaries '+width);
   if(path==='/ai-solutions')check(await ev("document.querySelector('[data-service-faq-dialog][open]').textContent.includes('A2A is not required for a single-agent workflow')"),'AI interoperability boundaries '+width);
   if(path==='/salesforce')check(await ev("document.querySelector('[data-service-faq-dialog][open]').textContent.includes('No responsible modernization project can guarantee zero risk')"),'Salesforce risk boundaries '+width);
   await key('Escape',27);await until("!document.querySelector('[data-service-faq-dialog][open]')");check(await ev(`document.activeElement===${opener}`),'Escape restores floating-launcher focus '+path+' '+width);assert.deepEqual(await position(),before);
   await ev(`${opener}.click()`);await until("!!document.querySelector('[data-service-faq-dialog][open]')");check(await ev("document.querySelector('[data-service-faq-dialog][open] [role=region]').scrollTop===0"),'Reopening starts at beginning '+path+' '+width);
   await ev("document.querySelector('[data-service-faq-dialog][open] button').click()");await until("!document.querySelector('[data-service-faq-dialog][open]')");check(await ev(`document.activeElement===${opener}`),'Close button restores focus '+path+' '+width);
   await ev("document.querySelector('[aria-label=\"Open Scout, AI Architecture Guide\"]').click()");await until("!!document.querySelector('#scout-panel[open]')");await sleep(450);
   check(!(await visible()),'FAQ hidden while Scout panel is open '+path+' '+width);
   check(await ev("(()=>{const p=document.querySelector('#scout-panel');return p.offsetWidth===Math.min(360,innerWidth-24)&&p.offsetHeight===600})()"),'Approved Scout panel dimensions preserved '+path+' '+width);
   await ev("document.querySelector('[aria-label=\"Minimize Scout\"]').click()");await until("!document.querySelector('#scout-panel')");check(await visible(),'FAQ returns after minimizing Scout '+path+' '+width);await checkPlacement('after Scout close '+path+' '+width);
   if(await ev("getComputedStyle(document.querySelector('.menu-toggle')).display!=='none'")){
    await ev("document.querySelector('.menu-toggle').click()");check(!(await visible()),'FAQ hidden while navigation is open '+path+' '+width);await ev("document.querySelector('.menu-toggle').focus()");await key('Escape',27);check(await visible(),'FAQ returns after navigation closes '+path+' '+width);
   }
   if(width===1440&&path==='/ai-solutions'){
    await ev("document.querySelector('#technology-comparison button').click()");await until("!!document.querySelector('#technology-detail-dialog[open]')");check(!(await visible()),'FAQ does not overlap existing technology modal');await key('Escape',27);await until("!document.querySelector('#technology-detail-dialog')");check(await visible(),'FAQ returns after technology modal');
   }
   if([1440,390].includes(width)){
    await ev(`${opener}.click()`);await until("!!document.querySelector('[data-service-faq-dialog][open]')");await ev("document.querySelector('[data-service-faq-dialog][open] [role=region]').scrollTop=100000");check(await ev("document.querySelector('[data-service-faq-dialog][open] a').getAttribute('href')==='/book'"),'Existing consultation destination '+path+' '+width);await ev("document.querySelector('[data-service-faq-dialog][open] a').click()");await until("!!document.querySelector('#scout-panel[open] [data-scout-booking-intro]')&&!document.querySelector('[data-service-faq-dialog][open]')&&document.activeElement.id==='scout-draft'");check(await ev(`location.pathname===${JSON.stringify(path)}&&document.querySelectorAll('dialog[open]').length===1&&!document.querySelector('#consultation-booking[open]')`),'FAQ CTA opens Scout and closes the FAQ '+path+' '+width);await ev("document.querySelector('[aria-label=\"Minimize Scout\"]').click()");await until("!document.querySelector('#scout-panel')");check(await visible(),'FAQ launcher remains available after conversational booking entry '+path+' '+width);
   }
  }
 }
 // Back navigation can retain an inactive page and its closed dialog in React Activity.
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await nav('/ai-solutions');await ev("document.querySelector('#main-navigation a[href=\"/custom-applications\"]').click()");await until("location.pathname==='/custom-applications'");await ev(`${opener}.click()`);await until("!!document.querySelector('[data-service-faq-dialog][open]')");
 const history=await send('Page.getNavigationHistory');await send('Page.navigateToHistoryEntry',{entryId:history.entries[history.currentIndex-1].id});await until("location.pathname==='/ai-solutions'&&!document.querySelector('[data-service-faq-dialog][open]')");await ev(`${opener}.click()`);await until("!!document.querySelector('[data-service-faq-dialog][open]')");
 check(await ev("(()=>{const d=document.querySelector('[data-service-faq-dialog][open]'),ids=[...document.querySelectorAll('[id]')].map(e=>e.id).filter(id=>id.startsWith('service-faq'));return ids.length===new Set(ids).size&&document.getElementById(d.getAttribute('aria-labelledby')).textContent==='Questions About AI for Your Business'})()"),'Unique accessible IDs after browser Back across cached service pages');await key('Escape',27);
 for(const path of ['/','/about','/contact','/book','/insights','/insights/philosophy','/insights/ai-architecture','/insights/salesforce']){await nav(path);check(await ev("!document.querySelector('[data-service-faq],[data-service-faq-dialog][open]')"),'No FAQ on excluded route '+path);}
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:500,deviceScaleFactor:1,mobile:true});await nav('/salesforce');await ev(`${opener}.click()`);await until("!!document.querySelector('[data-service-faq-dialog][open]')");check(await ev("(()=>{const d=document.querySelector('[data-service-faq-dialog][open]'),r=d.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.querySelector('[data-service-faq-dialog][open] [role=region]').clientHeight>80})()"),'Short mobile viewport remains usable');await key('Escape',27);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});check(await ev(`${opener}&&getComputedStyle(${opener}).transitionDuration==='0s'`),'Reduced motion disables launcher transitions');
 await nav('/custom-applications');await ev("document.querySelector('.menu-toggle').click();document.querySelector('#main-navigation a[href=\"/ai-solutions\"]').click()");await until("location.pathname==='/ai-solutions'&&[...document.querySelectorAll('[data-faq-launcher]')].some(e=>e.checkVisibility())");await ev(`${opener}.click()`);await until("!!document.querySelector('[data-service-faq-dialog][open]')");check(await ev("document.querySelector('[data-service-faq-dialog][open] h2').textContent==='Questions About AI for Your Business'"),'Client navigation selects the new service FAQ');await key('Escape',27);
 check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed assets');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,console:report.console,failedAssets:report.failedAssets,out},null,2));
}finally{ws?.close();child.kill('SIGTERM');}
