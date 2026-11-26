// Read-only real-browser checks against a finished local/Preview build. No publishing or agent actions.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync,readdirSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {homedir,tmpdir} from 'node:os';
import {join} from 'node:path';
const origin=process.argv[2]??'http://localhost:3118',out=join(tmpdir(),'aa-approach-tabs',String(Date.now()));await mkdir(out,{recursive:true});
const candidates=[process.env.CHROME_BIN,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
for(const root of [join(homedir(),'Library/Caches/ms-playwright'),join(homedir(),'.cache/ms-playwright')])if(existsSync(root))for(const dir of readdirSync(root))candidates.push(join(root,dir,'chrome-headless-shell-mac-arm64/chrome-headless-shell'));
const chrome=candidates.find(p=>p&&existsSync(p));assert(chrome,'Chromium required');
const browser=spawn(chrome,['--headless','--no-sandbox','--remote-debugging-port=19831','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'}),sleep=ms=>new Promise(r=>setTimeout(r,ms)),checks=[],errors=[];let ws;
try{
 let targets;for(let i=0;i<100;i++){try{targets=await(await fetch('http://localhost:19831/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);
 ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let seq=0;const pending=new Map();
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 ws.onmessage=e=>{const p=JSON.parse(e.data);if(p.id){const r=pending.get(p.id);pending.delete(p.id);p.error?r.reject(Error(JSON.stringify(p.error))):r.resolve(p.result);}if(p.method==='Runtime.exceptionThrown')errors.push(p.params.exceptionDetails.text);};
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async expression=>{for(let i=0;i<300;i++){if(await ev(expression))return;await sleep(50);}throw Error('Timeout: '+expression);};
 const check=(ok,label)=>{assert(ok,label);checks.push(label);console.log('PASS '+label);};
 const active=id=>`document.querySelector('#approach-tab-${id}')?.getAttribute('aria-selected')==='true'&&document.querySelector('#approach-panel-${id}')?.hidden===false`;
 const navigate=async path=>{await send('Page.navigate',{url:origin+path});await until("document.readyState==='complete'&&!!document.querySelector('[role=tablist]')");await until("Object.keys(document.querySelector('[role=tab]')).some(k=>k.startsWith('__reactProps'))");await ev("[...document.querySelectorAll('button')].find(b=>b.textContent==='Decline analytics')?.click()");};
 await send('Page.enable');await send('Runtime.enable');
 for(const width of [1440,800,390,320]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<700});await navigate('/our-approach');await until(active('philosophy'));
  check(await ev("!document.querySelector('.insights-category-grid')&&document.querySelector('#approach-panel-philosophy h1').textContent==='Good architecture makes everything else easier.'"),'Root opens existing Philosophy without cards '+width);
  check(await ev("document.querySelectorAll('[role=tab]').length===3&&[...document.querySelectorAll('[role=tabpanel]')].filter(e=>!e.hidden).length===1"),'Three accessible tabs, one visible panel '+width);
  await ev("window.__approachDocument='same-document';document.querySelector('#approach-tab-ai-architecture').click()");await until(active('ai-architecture'));await ev("document.querySelector('#approach-tab-salesforce').click()");await until(active('salesforce'));
  check(await ev("window.__approachDocument==='same-document'&&location.pathname==='/our-approach'&&location.hash==='#salesforce'&&document.querySelector('#approach-panel-salesforce').textContent.includes('Modernize without starting over.')"),'Tabs switch complete content in place without navigation '+width);
  await ev('history.back()');await until(active('ai-architecture'));await ev('history.back()');await until(active('philosophy'));await ev('history.forward()');await until(active('ai-architecture'));
  check(await ev("window.__approachDocument==='same-document'"),'Back/forward restores tab without reload '+width);
  await ev("document.querySelector('#approach-tab-ai-architecture').focus()");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'End',code:'End',windowsVirtualKeyCode:35});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'End',code:'End',windowsVirtualKeyCode:35});await until(active('salesforce'));
  check(await ev("document.activeElement.id==='approach-tab-salesforce'"),'Keyboard changes and focuses selected tab '+width);
  check(await ev("document.documentElement.scrollWidth===innerWidth&&new Set([...document.querySelectorAll('[role=tab]')].map(e=>Math.round(e.getBoundingClientRect().top))).size===1"),'Tabs remain horizontal without overflow '+width);
  for(const id of ['philosophy','ai-architecture','salesforce']){
   await navigate('/our-approach/'+id+'?ref=shared');await until(active(id));
   check(await ev(`document.querySelector('link[rel=canonical]').href==='https://theaugmentedarchitect.com/our-approach/${id}'&&document.querySelector('#approach-panel-${id} article').textContent.length>2000`),'Old URL, query, canonical and existing content preserved '+id+' '+width);
  }
  await navigate('/our-approach#ai-architecture');await until(active('ai-architecture'));check(await ev("document.querySelector('#approach-panel-ai-architecture h1').textContent.includes('AI agents are getting easier')"),'Shared fragment restores selection '+width);
  if([1440,390].includes(width))await writeFile(out+'/'+width+'.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }
 for(const path of ['/our-approach','/our-approach/philosophy','/our-approach/ai-architecture','/our-approach/salesforce']){const r=await fetch(origin+path);const html=await r.text();check(r.ok&&html.includes('Good architecture makes everything else easier.')&&html.includes("The future isn"),'Content remains server-rendered '+path);}
 check(errors.length===0,'No browser runtime exceptions');await writeFile(out+'/results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,out}));
}finally{ws?.close();browser.kill('SIGTERM');}
