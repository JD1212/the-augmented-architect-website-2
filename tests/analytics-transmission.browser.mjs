// Opt in only: GA4_LIVE_DEBUG=1 node tests/analytics-transmission.browser.mjs <production-mode origin>
// Sends real debug views/engagement only. All Scout/calendar/email APIs are stubbed.
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
assert.equal(process.env.GA4_LIVE_DEBUG,'1','Explicit opt-in required: this test sends real consented debug page/engagement events.');
const origin=process.argv[2]||'http://localhost:3100',out=join(tmpdir(),'aa-ga4-debug',String(Date.now()));await mkdir(out,{recursive:true});
assert(/^http:\/\/localhost:\d+$/.test(origin)||origin==='https://theaugmentedarchitect.com','Use only this website or its local QA build');
const report={origin,checks:[],layouts:[],errors:[],console:[],failedAssets:[]},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const child=spawn(findChrome(),['--headless','--no-sandbox','--remote-debugging-port=21117','--user-data-dir='+out+'/profile','about:blank'],{stdio:['ignore','ignore','pipe']});let startupErrors='';child.stderr.on('data',chunk=>{startupErrors+=chunk.toString().replace(/DevTools listening[^\n]*/g,'DevTools ready');});let ws;const records=new Map();let googleLoads=0,advertisingRequests=0;
try{
 let targets;for(let i=0;i<150;i++){try{targets=await(await fetch('http://localhost:21117/json')).json();if(targets.length)break;}catch{}await sleep(100);}if(!targets?.length)console.log('BROWSER_STARTUP',{exitCode:child.exitCode,signal:child.signalCode,stderr:startupErrors.slice(-1800)});assert(targets?.length);assert.equal(targets[0].url,'about:blank','Use the newly started clean browser target');ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result);}if(m.method==='Network.requestWillBeSent'){const u=new URL(m.params.request.url);if(/doubleclick\.net$|googlesyndication\.com$|googleadservices\.com$/.test(u.hostname)||(u.hostname==='www.google.com'&&u.pathname.includes('/ccm/')))advertisingRequests++;if(u.hostname==='www.googletagmanager.com')googleLoads++;if(u.hostname.endsWith('google-analytics.com')&&u.pathname.includes('collect')){for(const [i,line] of (m.params.request.postData?.split('\n')??['']).entries()){const p=new URLSearchParams(u.search);for(const [k,v] of new URLSearchParams(line))p.set(k,v);records.set(m.params.requestId+':'+i,{measurementId:p.get('tid'),event:p.get('en'),location:p.get('dl'),consent:p.get('gcs'),consentV2:p.get('gcd'),debug:p.get('_dbg')||p.get('ep.debug_mode'),status:null,requestId:m.params.requestId});}}}if(m.method==='Network.responseReceived'){for(const record of records.values())if(record.requestId===m.params.requestId)record.status=m.params.response.status;}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.console.push(m.params.args);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)report.failedAssets.push(m.params.response.url);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const i=++id;pending.set(i,{resolve,reject});ws.send(JSON.stringify({id:i,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async expression=>{for(let i=0;i<350;i++){if(await ev(expression))return;await sleep(50)}throw Error('Timeout '+expression)};
 const check=(value,label)=>{assert(value,label);report.checks.push(label);console.log('PASS '+label)};
 const nav=async path=>{await send('Page.navigate',{url:origin+path});await until("document.readyState==='complete'&&!!document.querySelector('main')");await ev("document.querySelectorAll('img').forEach(i=>i.loading='eager')");await until("[...document.images].every(i=>i.complete)");};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable',{maxPostDataSize:1000000});await send('Page.addScriptToEvaluateOnNewDocument',{source:"sessionStorage.setItem('aa.scout.introduction.v1','1')"});

 // Stub only browser API requests. The SEO audit cannot create conversations or bookings.
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const original=window.fetch.bind(window);window.fetch=(input,init)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return original(input,init);return Promise.resolve(Response.json(url.pathname==='/api/scout'?{messages:[],busy:false,failed:null,sessionReset:false,expiresInMs:null}:url.pathname==='/api/scout/scheduling'?{enabled:false,proposals:[],verificationRequired:false}:{error:'Read-only SEO fixture.'}));};})()`});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(navigator,'webdriver',{configurable:true,get:()=>false});localStorage.setItem('aa.analytics.debug','1');"});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await nav('/ai-solutions');await until("!!document.querySelector('#analytics-consent-title')");
 check(googleLoads===0&&records.size===0,'No real Google traffic before consent');
 await ev("[...document.querySelectorAll('button')].find(b=>b.textContent==='Allow analytics').click()");
 for(let i=0;i<80&&!Array.from(records.values()).some(r=>r.event==='page_view'&&r.status);i++)await sleep(500);
 check(Array.from(records.values()).filter(r=>r.event==='page_view').length===1,'One real consented initial page view');
 await ev("document.querySelector('#main-navigation a[href=\"/salesforce\"]').click()");await until("location.pathname==='/salesforce'");await sleep(16000);for(let i=0;i<20&&!Array.from(records.values()).some(r=>r.event==='service_engagement'&&r.status);i++)await sleep(500);
 const collected=Array.from(records.values());
 check(collected.filter(r=>r.event==='page_view').length===2,'One real view for each of two page transitions');
 check(collected.some(r=>r.event==='service_engagement'),'Real service engagement collected');
 check(await ev("document.querySelectorAll('#ga4-consented').length===1"),'Single application Google tag element');
 check(collected.every(r=>r.measurementId==='G-STBZV24WWN'&&(r.debug==='1'||r.debug==='true')&&r.consent==='G101'&&[200,204].includes(r.status)&&r.location?.startsWith('https://theaugmentedarchitect.com/')&&!r.location.includes('?')&&!r.location.includes('#')),'Correct property, debug_mode, successful collector responses and clean URLs');
 check(advertisingRequests===0,'No advertising or remarketing network requests');
 check(report.errors.length===0&&report.console.length===0,'No application runtime or console errors');
 const publicRecord=({measurementId,event,location,consent,consentV2,debug,status})=>({measurementId,event,location,consent,consentV2,debug,status});
 await writeFile(out+'/collector.json',JSON.stringify(collected.map(publicRecord),null,2));
 console.log(JSON.stringify({checks:report.checks.length,records:collected.map(publicRecord)},null,2));
 await ev("window['ga-disable-G-STBZV24WWN']=true");
}finally{ws?.close();child.kill('SIGTERM');}
