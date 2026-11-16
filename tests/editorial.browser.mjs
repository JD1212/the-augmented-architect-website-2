// Run against a local production preview: node tests/editorial.browser.mjs http://localhost:3100
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
const origin=process.argv[2]||'http://localhost:3100',out=process.env.EDITORIAL_REVIEW_DIR||join(tmpdir(),'aa-editorial',origin.startsWith('https:')?'live':'local');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19821','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
try{
 let targets;for(let i=0;i<50;i++){try{targets=await(await fetch('http://localhost:19821/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
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
 const paths=['/our-approach','/our-approach/philosophy','/our-approach/ai-architecture','/our-approach/salesforce','/about'];
 const headings=['Our Approach','Good architecture makes everything else easier.','AI agents are getting easier to build. Making them work together is the challenge.',"Salesforce doesn't have to be this complicated.",'Architecture that serves the business.'];
 const links=new Set();
 // The current approved Production hero remains the visual/markup baseline.
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'https://the-augmented-architect-website-2.vercel.app/about'});await until("document.readyState==='complete'&&!!document.querySelector('.secondary-hero .architecture-diagram')");
 const approvedHero=await ev("document.querySelector('.secondary-hero').outerHTML.replaceAll('/insights/','/our-approach/')");
 for(const width of [1440,1100,800,390,320]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:width<600?844:1000,deviceScaleFactor:1,mobile:width<600});
  for(const [i,path]of paths.entries()){
   await nav(path);const label=path+' '+width;
   check(await ev(`document.querySelectorAll('main h1').length===1&&document.querySelector('main h1').textContent===${JSON.stringify(headings[i])}`),'Approved heading '+label);
   check(await ev("document.documentElement.scrollWidth===innerWidth&&document.querySelector('main').scrollWidth<=innerWidth"),'No horizontal overflow '+label);
   check(await ev("!document.querySelector('main time,main .insights-article-grid,main .insights-empty-state')&&!/No articles|Published|Back to Insights/.test(document.querySelector('main').textContent)"),'Permanent editorial content, no feed/date/empty state '+label);
   check(await ev("!document.querySelector('main').textContent.includes('**')&&!/Suggested visual|Create a clean|Visual 1:/.test(document.querySelector('main').textContent)"),'No editorial markup or production instructions '+label);
   check(await ev("[...document.querySelectorAll('main [id]')].every((e,i,a)=>a.findIndex(x=>x.id===e.id)===i)"),'Unique accessible content anchors '+label);
   check(await ev("!!document.querySelector('#main-navigation a[href=\"/our-approach\"]')&&!!document.querySelector('.site-footer a[href=\"/our-approach\"]')&&!/Insights/.test(document.querySelector('.site-header').textContent+document.querySelector('.site-footer').textContent)"),'Renamed navigation and footer '+label);
   check(await ev(`document.querySelector('link[rel=canonical]').href===${JSON.stringify('https://the-augmented-architect-website-2.vercel.app'+path)}&&document.querySelector('meta[property="og:url"]').content===${JSON.stringify('https://the-augmented-architect-website-2.vercel.app'+path)}`),'Canonical and Open Graph metadata '+label);
   const navLayout=await ev("(()=>{const header=document.querySelector('.header-inner').getBoundingClientRect(),brand=document.querySelector('.home-link').getBoundingClientRect(),nav=document.querySelector('#main-navigation'),r=nav.getBoundingClientRect(),menu=document.querySelector('.menu-toggle');return {desktop:getComputedStyle(menu).display==='none',brandRight:brand.right,left:r.left,right:r.right,headerRight:header.right}})()");
   check(!navLayout.desktop||(navLayout.left>=navLayout.brandRight&&navLayout.right<=navLayout.headerRight+1),'Header has no brand/navigation overlap '+label);
   if(i===0){check(await ev("document.querySelectorAll('.insights-category-grid>li').length===3&&getComputedStyle(document.querySelector('.insights-category-grid')).gridTemplateColumns.split(' ').length==="+(width<600?1:3)),'Preserved three-card landing layout '+width);}
   else if(i<4){check(await ev(`document.querySelectorAll('main article>div>section').length===4&&document.querySelectorAll('main figure').length===${i===2?2:1}`),'Complete sections and lightweight diagrams '+label);check(await ev(`document.querySelector('.insights-category-navigation [aria-current=page]').getAttribute('href')===${JSON.stringify(path)}&&document.querySelector('#main-navigation a[href="/our-approach"]').getAttribute('aria-current')==='location'`),'Accessible current-page navigation '+label);}
   else{check(await ev("!!document.querySelector('#about-company')&&document.querySelector('main').textContent.includes('Founder & Architect — JD Burkholder')&&document.querySelector('main').textContent.includes(\"Uber's global legal team\")&&document.querySelector('main').textContent.includes('Accounting Seed')"),'Company content and approved founder details '+width);if(width===1440)assert.equal(await ev("document.querySelector('.secondary-hero').outerHTML"),approvedHero,'About hero/diagram markup preserved exactly except updated link');}
   for(const href of await ev("[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h.startsWith('/'))"))links.add(href);
   if([1440,390].includes(width)){await shot(path.replaceAll('/','-').slice(1)+'-'+width,'main');if(path.includes('/ai-architecture')){const figure='main figure';await shot('ai-layers-'+width,figure);}}
   if(width===390){await ev("document.querySelector('.menu-toggle').click()");check(await ev("document.querySelector('#main-navigation').classList.contains('is-open')&&document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='true'"),'Mobile menu remains functional '+path);await ev("document.querySelector('.menu-toggle').click()");}
  }
 }
 // Read-only URL validation includes fragment targets without opening or submitting booking.
 for(const href of links){const url=new URL(href,origin),r=await fetch(url);check(r.status===200,'Internal destination '+href);if(url.hash){const html=await r.text();check(html.includes('id="'+decodeURIComponent(url.hash.slice(1))+'"'),'Internal anchor '+href);}}
 for(const old of ['/insights','/insights/philosophy','/insights/ai-architecture','/insights/salesforce','/insights/articles/missing']){const r=await fetch(origin+old+'?ref=legacy',{redirect:'manual'});check(r.status===308&&new URL(r.headers.get('location'),origin).pathname.replace(/\/$/,'')===old.replace('/insights','/our-approach')&&new URL(r.headers.get('location'),origin).search==='?ref=legacy','Permanent redirect preserves nested path and query '+old);const resolved=await fetch(origin+old+'?ref=legacy');check(resolved.status===(old.includes('/articles/')?404:200)&&new URL(resolved.url).pathname===old.replace('/insights','/our-approach')&&new URL(resolved.url).search==='?ref=legacy','Legacy URL resolves to final canonical destination '+old);}
 const sitemap=await(await fetch(origin+'/sitemap.xml')).text();check(paths.every(path=>sitemap.includes('https://the-augmented-architect-website-2.vercel.app'+path))&&!sitemap.includes('/insights'),'Sitemap uses canonical permanent pages');
 check(report.errors.length===0,'No runtime errors: '+JSON.stringify(report.errors));check(report.console.length===0,'No console errors: '+JSON.stringify(report.console));check(report.failedAssets.length===0,'No failed assets: '+JSON.stringify(report.failedAssets));await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,out}));
}finally{ws?.close();child.kill('SIGTERM');}
