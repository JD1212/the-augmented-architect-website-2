// Opt-in authenticated local browser regression. No live Auth/database/provider writes.
// Set OWNER_BRIEF_SNAPSHOT to a private read-only export of marketing records.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {readFileSync,writeFileSync,mkdtempSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
assert.equal(process.env.OWNER_BRIEF_BROWSER_TEST,'1');assert(process.env.OWNER_BRIEF_SNAPSHOT?.startsWith('/private/'));
const snapshot=JSON.parse(readFileSync(process.env.OWNER_BRIEF_SNAPSHOT,'utf8'));
const opportunity='d0c19ee4-b000-4fae-a20f-7c7423e6c33f',owner=randomUUID(),title='Why Salesforce Automation Becomes Unmanageable—and How Businesses Can Regain Control';
const originalFinding=snapshot.marketing_artifacts.filter(a=>a.parent_id===opportunity&&a.kind==='recommendation').sort((a,b)=>a.created_at.localeCompare(b.created_at)).at(-1);assert(originalFinding);
const originalHash=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
const freePort=()=>new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const port=await freePort(),cdpPort=await freePort(),origin='http://localhost:'+port,out=mkdtempSync('/private/tmp/owner-brief-browser-'),fixturePath=out+'/database.json';
writeFileSync(fixturePath,JSON.stringify(snapshot),{mode:0o600});
let server,browser,ws;const checks=[],errors=[],logs=[],writes=[],blocked=[];
const check=(v,label)=>{assert(v,label);checks.push(label);console.log('PASS '+label);};
try{
 server=spawn(process.execPath,['--import',resolve('tests/helpers/owner-brief-local-backend.mjs'),'node_modules/next/dist/bin/next','start','--port',String(port)],{env:{...process.env,OWNER_BRIEF_BROWSER_TEST:'1',OWNER_BRIEF_FIXTURE:fixturePath,MARKETING_OWNER_IDS:owner,SUPABASE_URL:'https://cjldcaiybqguklzqtdjj.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_local_browser_fixture',SUPABASE_SECRET_KEY:'sb_secret_local_browser_fixture',OPENAI_API_KEY:'',OPENAI_SCOUT_MODEL:'',OPENAI_SEO_MODEL:'',OPENAI_CONTENT_MODEL:'',SEO_RESEARCH_PLANNING_ENABLED:'false',DATAFORSEO_LOGIN:'',DATAFORSEO_PASSWORD:'',DATAFORSEO_RESEARCH_ENABLED:'false',CONTENT_STRATEGIST_ENABLED:'false',CONTENT_STRATEGIST_PRODUCTION_ENABLED:'false',ARTICLE_PUBLISHING_ENABLED:'false',GOOGLE_MARKETING_PROJECT_NUMBER:''},stdio:['ignore','pipe','pipe','ipc']});
 server.stdout.on('data',b=>logs.push(b.toString()));server.stderr.on('data',b=>logs.push(b.toString()));server.on('message',m=>{if(m.fixture==='blocked-external')blocked.push(m.host);else writes.push(m);});
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(origin+'/admin/login')).ok){ready=true;break;}}catch{}await sleep(200);}assert(ready,'Local server ready');
 check((await fetch(origin+'/api/admin/marketing/opportunities?id='+opportunity)).status===401,'Anonymous owner API access is denied');
 const binary=process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';assert(existsSync(binary));browser=spawn(binary,['--headless','--no-sandbox','--disable-background-networking','--disable-extensions','--remote-debugging-port='+cdpPort,'--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});
 let targets;for(let i=0;i<100;i++){try{targets=await(await fetch('http://localhost:'+cdpPort+'/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);
 ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let seq=0;const pending=new Map();
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 ws.onmessage=e=>{const p=JSON.parse(e.data);if(p.id){const r=pending.get(p.id);pending.delete(p.id);if(p.error)r.reject(Error(JSON.stringify(p.error)));else r.resolve(p.result);}if(p.method==='Runtime.exceptionThrown')errors.push(p.params.exceptionDetails.exception?.description??p.params.exceptionDetails.text);};
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
 const until=async expression=>{for(let i=0;i<160;i++){if(await ev(expression))return;await sleep(100);}throw Error('Condition timed out: '+expression+'; errors: '+JSON.stringify(errors));};
 const click=async text=>{const predicate=`b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled&&b.getClientRects().length>0&&Object.keys(b).some(k=>k.startsWith('__reactProps'))`;await until(`[...document.querySelectorAll('button,a')].some(b=>${predicate})`);await ev(`[...document.querySelectorAll('button,a')].find(b=>${predicate}).click()`);};
 const fill=async(selector,value)=>{await until(`!!document.querySelector(${JSON.stringify(selector)})`);await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);};
 const capture=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(out+'/'+name+'.png',Buffer.from(r.data,'base64'),{mode:0o600});};
 const detail=()=>ev(`fetch('/api/admin/marketing/opportunities?id=${opportunity}').then(async r=>{if(!r.ok)throw Error('Owner read failed '+r.status);return r.json()})`);
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setBlockedURLs',{urls:['https://*']});
 await send('Page.navigate',{url:origin+'/admin/login'});await until("!!document.querySelector('#owner-email')");await fill('#owner-email','owner-browser@example.invalid');await fill('#owner-password','local-browser-test-only');await click('Sign in securely');await until("location.pathname==='/admin/marketing'");
 const cookies=await send('Network.getAllCookies');check(cookies.cookies.some(c=>c.name.startsWith('aa-owner-auth')&&c.httpOnly),'Owner session cookie is HTTP-only');
 check(await ev("fetch('/api/admin/auth').then(async r=>r.ok&&(await r.json()).stage==='ready')"),'Password login and HTTP-only owner session pass the actual local authentication boundary (fixture Auth service)');
 for(const width of [1440,390]){
  writeFileSync(fixturePath,JSON.stringify(snapshot),{mode:0o600});
  await send('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:width<700});
  await send('Page.navigate',{url:origin+'/admin/marketing?view=discover&opportunity='+opportunity});
  await until("!!document.querySelector('[aria-label=\"Owner article brief\"]')");
  check(await ev(`document.querySelector('[aria-label="Owner article brief"]').textContent.includes(${JSON.stringify(title)})`),'Requested Salesforce business brief opens '+width);
  check(!await ev("!!document.querySelector('[aria-label=\"Owner article brief\"] textarea')"),'Brief opens read-only '+width);
  check(await ev("[...document.querySelectorAll('details')].some(d=>d.querySelector('summary')?.textContent==='Original SEO Analyst finding & evidence'&&!d.open)"),'Original SEO finding remains accessible without burying the brief '+width);
  await click('Review article brief');
  check(await ev("[...document.querySelectorAll('button')].some(b=>b.textContent==='Approve for drafting'&&b.disabled)"),'Drafting approval is visible but disabled before saving '+width);
  await capture('initial-'+width);
  await click('Edit article brief');check(await ev("document.querySelectorAll('[aria-label=\"Owner article brief\"] textarea').length===7"),'All seven fields are editable '+width);
  const problem='Salesforce automation becomes difficult to understand, expensive to maintain, and risky to change. Browser verification edit.';
  await fill('[aria-label="Owner article brief"] label:nth-of-type(3) textarea',problem);await click('Save article brief');
  await until("document.querySelector('[aria-label=\"Owner article brief\"]').textContent.includes('Version 1')");
  let d=await detail();assert.equal(d.opportunity.ownerBrief.content.problem,problem);check(d.assignment===null,'Saving does not approve or execute '+width);
  await send('Page.reload',{ignoreCache:true});await until("document.querySelector('[aria-label=\"Owner article brief\"]')?.textContent.includes('Version 1')");
  check(await ev(`document.querySelector('[aria-label="Owner article brief"]').textContent.includes(${JSON.stringify(problem)})`),'Saved edit survives full page refresh '+width);
  await click('Review article brief');await click('Approve for drafting');await until("document.body.textContent.includes('Current article brief approved for drafting.')");
  d=await detail();const firstApproval=d.opportunity.reviewId;assert.equal(d.assignment.approvalId,firstApproval);assert.equal(d.opportunity.ownerBrief.hash,d.opportunity.reviews.at(-1).ownerBrief.hash);assert.equal(d.opportunity.findingId,originalFinding.id);assert.deepEqual(d.opportunity.finding.sourceUrls,originalFinding.payload.sourceUrls);assert.equal(d.opportunity.ownerBrief.evidenceArtifactId,originalFinding.payload.evidenceArtifactId);assert.deepEqual(d.opportunity.ownerBrief.researchWorkflow,originalFinding.payload.researchWorkflow);assert.match(d.assignment.objective,/Why Salesforce Automation Becomes Unmanageable/);assert.equal(d.assignment.approvalRequirements.publishingAuthorized,false);
  check(true,'Exact brief approval retains original finding, sources, saved research IDs and evidence snapshot '+width);await send('Page.reload',{ignoreCache:true});await until("[...document.querySelectorAll('a')].some(a=>a.textContent==='Open Create →'&&a.getClientRects().length>0)");check(true,'Approved state and direct next action survive refresh '+width);await capture('approved-'+width);
  await click('Edit article brief');await fill('[aria-label="Owner article brief"] label:nth-of-type(3) textarea',problem+' Assign ownership.');
  await click('Save article brief');await until("document.querySelector('[aria-label=\"Owner article brief\"]').textContent.includes('Version 2')");
  d=await detail();check(d.assignment===null&&d.opportunity.reviewId===firstApproval&&d.opportunity.briefHistory.length===2,'Editing approved brief requires fresh approval; original decision remains in history '+width);
  if(await ev("[...document.querySelectorAll('button')].some(b=>b.textContent==='Review article brief')"))await click('Review article brief');check(await ev("document.body.textContent.includes('This brief needs approval before drafting.')&&[...document.querySelectorAll('button')].some(b=>b.textContent==='Approve for drafting'&&!b.disabled)"),'Next required action is explicit reapproval '+width);await capture('changed-needs-approval-'+width);
  await click('Approve for drafting');await until("document.body.textContent.includes('Current article brief approved for drafting.')");await click('Open Create →');await until("location.search.includes('view=create')");
  await until("document.body.textContent.includes('Next: Review supporting sources')");
  check(await ev(`document.body.textContent.includes(${JSON.stringify(title)})&&document.body.textContent.includes('At least two reviewed primary sources are required.')`),'Create retains the business brief and explains the next source-review action '+width);
  check(await ev("[...document.querySelectorAll('button')].some(b=>b.textContent==='Generate website + LinkedIn draft'&&b.disabled)"),'Generation remains disabled; no run is initiated '+width);await capture('create-next-'+width);
  const unchanged=JSON.parse(readFileSync(fixturePath,'utf8'));for(const row of snapshot.marketing_artifacts)assert.deepEqual(unchanged.marketing_artifacts.find(r=>r.id===row.id),row);
  check(true,'All original records and approvals are byte-for-byte preserved '+width);
  check(await ev('document.documentElement.scrollWidth===innerWidth'),'No horizontal viewport overflow '+width);
 }
 check(blocked.length===0,'No external server requests or live provider calls attempted');check(errors.length===0,'No browser runtime exceptions');
 check(writes.every(w=>['owner-article-brief/v1','seo-opportunity-review/v1'].includes(w.workflow)),'Only local brief and drafting-approval writes occurred');
 check(createHash('sha256').update(JSON.stringify(JSON.parse(readFileSync(process.env.OWNER_BRIEF_SNAPSHOT,'utf8')))).digest('hex')===originalHash,'Read-only input snapshot unchanged');
 writeFileSync(out+'/results.json',JSON.stringify({checks,session:'actual local login/cookies with mocked Auth and database transport',liveAuth:false,liveDatabaseWrites:0,models:0,research:0,publishing:0},null,2),{mode:0o600});console.log(JSON.stringify({out,checks:checks.length}));
}catch(error){writeFileSync(out+'/server.log',logs.join(''),{mode:0o600});console.error('Local browser failure artifacts: '+out);throw error;}
finally{ws?.close();browser?.kill('SIGTERM');server?.kill('SIGTERM');}
