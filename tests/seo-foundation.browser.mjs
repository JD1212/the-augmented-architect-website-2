// Local/Production: node tests/seo-foundation.browser.mjs <origin>
// Protected Preview metadata is checked through the authenticated Vercel connector.
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
const origin=process.argv[2]||'http://localhost:3103',out=join(tmpdir(),'aa-seo',origin.startsWith('https:')?'production':'local');await mkdir(out,{recursive:true});
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=19601','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});let ws;
const canonical='https://theaugmentedarchitect.com';
const http=(path,options={})=>fetch(origin+path,options);
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

 // Stub only browser API requests. The SEO audit cannot create conversations or bookings.
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const original=window.fetch.bind(window);window.fetch=(input,init)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return original(input,init);return Promise.resolve(Response.json(url.pathname==='/api/scout'?{messages:[],busy:false,failed:null,sessionReset:false,expiresInMs:null}:url.pathname==='/api/scout/scheduling'?{enabled:false,proposals:[],verificationRequired:false}:{error:'Read-only SEO fixture.'}));};})()`});
 const paths=['/','/ai-solutions','/salesforce','/custom-applications','/our-approach','/our-approach/philosophy','/our-approach/ai-architecture','/our-approach/salesforce','/about','/contact','/book'];
 const titles=new Set(),links=new Set();report.headingGaps=[];
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 for(const path of paths) {
  await nav(path);
  const data=await ev(`(()=>{const meta=name=>document.querySelector('meta[name="'+name+'"],meta[property="'+name+'"]')?.content;const headings=[...document.querySelectorAll('main h1,main h2,main h3,main h4')];return {title:document.title,description:meta('description'),canonical:document.querySelector('link[rel=canonical]')?.href,ogUrl:meta('og:url'),ogImage:meta('og:image'),twitter:meta('twitter:card'),twitterImage:meta('twitter:image'),robots:meta('robots'),h1:document.querySelectorAll('main h1').length,graph:JSON.parse(document.querySelector('#business-structured-data').textContent),links:[...document.querySelectorAll('main a[href],header a[href],footer a[href]')].map(a=>a.href),gaps:headings.flatMap((h,i)=>i&&Number(h.tagName[1])>Number(headings[i-1].tagName[1])+1?[h.textContent]:[])}})()`);
  check(!!data.title&&!titles.has(data.title),'Unique title '+path);titles.add(data.title);
  check(data.description?.length>25,'Meaningful description '+path);
  const expected=new URL(path,canonical).href;
  check(new URL(data.canonical).href===expected&&new URL(data.ogUrl).href===expected,'Production canonical and OG URL '+path);
  check(new URL(data.ogImage).origin===canonical&&new URL(data.ogImage).pathname==='/opengraph-image'&&data.twitter==='summary_large_image'&&data.twitterImage.startsWith(canonical+'/opengraph-image'),'Large social image '+path);
  check(data.robots.includes('index')&&!data.robots.includes('noindex'),'Correct environment indexing '+path);
  check(data.h1===1,'One main heading '+path);
  check(data.graph['@graph'].filter(item=>item['@type']==='Organization').length===1&&data.graph['@graph'].filter(item=>item['@type']==='Service').length===3,'Actual business/service schema '+path);
  if(data.gaps.length)report.headingGaps.push({path,headings:data.gaps});
  data.links.forEach(link=>{const url=new URL(link);if(url.origin===origin&&!url.pathname.startsWith('/api/'))links.add(url.pathname)});
 }
 for(const path of links){const response=await http(path);check(response.ok,'Internal destination '+path)}
 const robots=await(await http('/robots.txt')).text();check(robots.includes('Allow: /')&&robots.includes('Disallow: /api/')&&robots.includes('Disallow: /admin')&&robots.includes(canonical+'/sitemap.xml'),'Public robots and sitemap declaration');
 const sitemap=await(await http('/sitemap.xml')).text();
 check(paths.every(path=>sitemap.includes(new URL(path,canonical).href))&&!sitemap.includes('/insights')&&!sitemap.includes('/admin')&&!sitemap.includes('__empty__'),'All canonical public pages in sitemap');
 const legacy=await http('/insights/philosophy?ref=seo-audit',{redirect:'manual'});check(legacy.status===308&&legacy.headers.get('location').endsWith('/our-approach/philosophy?ref=seo-audit'),'Legacy redirect preserves path/query');
 const missing=await http('/__seo_audit_missing__');check(missing.status===404||(await missing.text()).includes('noindex'),'Unknown page not indexable');
 const social=await http('/opengraph-image');const bytes=Buffer.from(await social.arrayBuffer());
 check(social.ok&&social.headers.get('content-type').includes('image/png')&&bytes.toString('ascii',1,4)==='PNG'&&bytes.readUInt32BE(16)===1200&&bytes.readUInt32BE(20)===630&&bytes.length<5000000,'Real 1200x630 share image');await writeFile(out+'/social.png',bytes);
 for(const width of [1440,390]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width===390});await nav('/');await sleep(300);
  check(await ev('document.documentElement.scrollWidth===innerWidth'),'Homepage no overflow '+width);
  await shot('homepage-'+width,'main');
 }
 check(report.errors.length===0,'No runtime errors');check(report.console.length===0,'No console errors');check(report.failedAssets.length===0,'No failed assets');
 await writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,headingGaps:report.headingGaps,out}));
}finally{await writeFile(out+'/results.json',JSON.stringify(report,null,2));ws?.close();child.kill('SIGTERM');}
