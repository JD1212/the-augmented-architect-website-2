// Run against a local production preview: node tests/custom-applications.browser.mjs http://localhost:3100
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
const origin=process.argv[2]||'http://localhost:3100',out=process.env.CUSTOM_APPLICATIONS_REVIEW_DIR||join(tmpdir(),'aa-custom-applications/screenshots');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19601','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19601/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
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

 const key=async(name,code,modifiers=0)=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:name,code:name,windowsVirtualKeyCode:code,modifiers});};
 const sections=['custom-hero','custom-problem','custom-solution','custom-package','custom-ai','custom-approach','custom-consultation'];
 for(const width of [1920,1440,1280,1191,1190,1100,1051,1050,900,800,768,600,390,320]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<540});await nav('/custom-applications');await sleep(180);
  check(await ev('document.documentElement.scrollWidth===innerWidth'),'No page overflow '+width);
  check(await ev("document.querySelectorAll('main > section').length===7&&document.querySelectorAll('h1').length===1"),'Seven focused sections and one h1 '+width);
  check(await ev("document.querySelector('h1').textContent==='Your website is just the beginning.'"),'Exact offer headline '+width);
  for(const id of sections)check(await ev(`!!document.getElementById('${id}')`),'Section '+id+' '+width);
  check(await ev("document.querySelector('main').textContent.includes('Implementation starting at $10,000')&&document.querySelector('#custom-package').textContent.includes('Starting at $10,000')"),'Starting implementation price '+width);
  check(await ev("document.querySelectorAll('main dl > div').length===9&&[...document.querySelectorAll('main dl dt')].some(e=>e.textContent.includes('One business integration'))&&[...document.querySelectorAll('main dl dt')].some(e=>e.textContent.includes('One working business workflow'))"),'Nine scoped baseline capabilities '+width);
  check(await ev("document.querySelector('main').textContent.includes('Complex integrations, extensive data migration, additional portal modules, custom AI agents, and ongoing support are quoted separately.')"),'Scope exclusions preserved '+width);
  check(await ev("document.querySelectorAll('main article').length===3&&document.querySelector('main').textContent.includes('not claims of completed client projects')"),'Three clearly illustrative workflows '+width);
  check(await ev("document.querySelectorAll('figure').length===1&&!document.querySelector('main img,main iframe,main input,main form')"),'Architecture graphic without fake application UI or live integration '+width);
  check(await ev("document.querySelector('main').textContent.includes('interoperability protocols')&&document.querySelector('main').textContent.includes('A2A is not needed')&&document.querySelector('main').textContent.includes('not a dependency or a promised completed feature')"),'Accurate AI interoperability and platform boundaries '+width);
  check(await ev("document.querySelectorAll('main a[href=\"/book\"]').length===3&&[...document.querySelectorAll('main a[href=\"/book\"]')].every(a=>a.textContent.includes('Book a Free Consultation'))"),'Existing consultation destination reused '+width);
  const header=await ev("(()=>{const h=document.querySelector('.header-inner'),logo=h.querySelector('.home-link'),nav=h.querySelector('nav'),menu=h.querySelector('.menu-toggle');const n=nav.getBoundingClientRect(),b=logo.getBoundingClientRect();return {menu:getComputedStyle(menu).display!=='none',navDisplay:getComputedStyle(nav).display,left:n.left,right:n.right,logoRight:b.right}})()");
  check(header.menu||(header.navDisplay==='flex'&&header.left>=header.logoRight+10&&header.right<=width),'Header navigation fits without overlap '+width);
  const links=await ev("[...document.querySelectorAll('#main-navigation > a:not(.button)')].map(a=>({label:a.textContent,href:a.getAttribute('href')}))");
  assert.deepEqual(links.slice(0,3),[{label:'AI Solutions',href:'/ai-solutions'},{label:'Salesforce',href:'/salesforce'},{label:'Custom Business Applications',href:'/custom-applications'}]);check(links.filter(a=>a.href==='/custom-applications').length===1,'Exactly three service destinations; no duplicate custom link '+width);
  if(header.menu){
   await ev("document.querySelector('.menu-toggle').click()");check(await ev("document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='true'&&getComputedStyle(document.querySelector('#main-navigation')).display==='flex'"),'Responsive menu opens '+width);
   check(await ev("(()=>{const r=document.querySelector('#main-navigation a[href=\"/custom-applications\"]').getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth})()"),'New navigation label fits mobile menu '+width);
   await ev("document.querySelector('.menu-toggle').focus()");await key('Escape',27);check(await ev("document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='false'&&document.activeElement===document.querySelector('.menu-toggle')"),'Escape closes menu and restores focus '+width);
  }
  check(await ev("document.querySelector('#main-navigation a[href=\"/custom-applications\"]').getAttribute('aria-current')==='page'"),'Active-page navigation accessible '+width);
  if([1440,390].includes(width)){
   await shot('custom-applications-'+width,'main');await shot('custom-hero-'+width,'main > section:first-child');await shot('custom-diagram-'+width,'figure');
   await ev("document.querySelector('a[href=\"#whats-included\"]').click()");await until("location.hash==='#whats-included'");check(true,'Included-package anchor works '+width);
   await ev("document.querySelector('main a[href=\"/book\"]').click()");await until("location.pathname==='/book'");check(true,'Consultation CTA opens existing booking page '+width);
   await nav('/');const menuVisible=await ev("getComputedStyle(document.querySelector('.menu-toggle')).display!=='none'");if(menuVisible)await ev("document.querySelector('.menu-toggle').click()");await ev("document.querySelector('#main-navigation a[href=\"/custom-applications\"]').click()");await until("location.pathname==='/custom-applications'");check(await ev("document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='false'"),'Main navigation reaches offering and closes menu '+width);
  }
 }
 await nav('/custom-applications');
 check(await ev("document.title.includes('Custom Business Applications & Customer Portals')&&document.querySelector('meta[name=description]').content.includes('$10,000')"),'Offering metadata');
 check(await ev("document.querySelector('link[rel=canonical]').href.endsWith('/custom-applications')&&document.querySelector('meta[property=\"og:url\"]').content.endsWith('/custom-applications')"),'Canonical and Open Graph URLs');
 check((await(await fetch(origin+'/sitemap.xml')).text()).includes('/custom-applications'),'Sitemap includes offering');
 for(const path of ['/','/ai-solutions','/salesforce','/custom-applications','/insights','/insights/philosophy','/about','/contact','/book'])check((await fetch(origin+path)).status===200,'Healthy route '+path);
 check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed browser assets');await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,console:report.console,failedAssets:report.failedAssets,out},null,2));
}finally{ws?.close();child.kill('SIGTERM');}
