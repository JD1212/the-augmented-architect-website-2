// Opt in: MARKETING_AUTH_LIVE=1 node --env-file=.env.local tests/marketing-auth.browser.mjs
// Uses real dedicated-project Auth + TOTP with a temporary example.invalid account.
// No invitations, owner passwords, Google requests, Scout calls or appointments.
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {existsSync,readdirSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {homedir,tmpdir} from 'node:os';
import {join} from 'node:path';
assert.equal(process.env.MARKETING_AUTH_LIVE,'1','Explicit live Auth test opt-in is required');
assert.equal(process.env.SUPABASE_URL,'https://cjldcaiybqguklzqtdjj.supabase.co');
const tenant='b329164a-f981-4acc-befc-2f0c70f8af10',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const auth=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
function chrome(){
 const candidates=[process.env.CHROME_BIN,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
 for(const root of [join(homedir(),'Library/Caches/ms-playwright'),join(homedir(),'.cache/ms-playwright')])if(existsSync(root))for(const dir of readdirSync(root))candidates.push(join(root,dir,'chrome-headless-shell-mac-arm64/chrome-headless-shell'),join(root,dir,'chrome-headless-shell-linux64/chrome-headless-shell'));
 const binary=candidates.find(p=>p&&existsSync(p));assert(binary,'Chromium required');return binary;
}
function totp(secret){
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const char of secret.toUpperCase().replace(/=+$/,''))bits+=alphabet.indexOf(char).toString(2).padStart(5,'0');
 const key=Buffer.from(bits.match(/.{8}/g).map(b=>parseInt(b,2)));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
 const digest=createHmac('sha1',key).update(counter).digest(),offset=digest[19]&15;return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
const port=await new Promise(resolve=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
const origin='http://localhost:'+port,out=join(tmpdir(),'aa-marketing-review',String(Date.now()));await mkdir(out,{recursive:true});
let userId,server,browser,ws;const checks=[];const check=(value,label)=>{assert(value,label);checks.push(label);console.log('PASS '+label);};
try{
 const email='marketing-qa-'+randomUUID()+'@example.invalid',password=randomBytes(32).toString('base64url')+'aA1!';
 const created=await db.auth.admin.createUser({email,password,email_confirm:true});assert(!created.error,'Temporary Auth user creation failed');userId=created.data.user.id;
 const member=await db.from('marketing_memberships').insert({tenant_id:tenant,user_id:userId});assert(!member.error,'Temporary owner membership creation failed');
 const signed=await auth.auth.signInWithPassword({email,password});assert(!signed.error,'Temporary password sign-in failed');
 const before=await auth.rpc('marketing_authorized',{p_tenant:tenant});check(!before.error&&before.data===true,'Real password-only owner passes scoped database authorization');
 const enrolled=await auth.auth.mfa.enroll({factorType:'totp',friendlyName:'Temporary QA authenticator'});assert(!enrolled.error,'Real TOTP enrollment failed');
 const secret=enrolled.data.totp.secret;assert(secret);const initial=await auth.auth.mfa.challengeAndVerify({factorId:enrolled.data.id,code:totp(secret)});assert(!initial.error,'Initial real TOTP confirmation failed');
 const after=await auth.rpc('marketing_authorized',{p_tenant:tenant});check(!after.error&&after.data===true,'Real AAL2 owner and live session pass database authorization');
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',String(port)],{env:{...process.env,MARKETING_OWNER_IDS:userId,GOOGLE_MARKETING_PROJECT_NUMBER:''},stdio:'ignore'});
 let ready=false;for(let i=0;i<150;i++){try{if((await fetch(origin+'/admin/login')).ok){ready=true;break;}}catch{}await sleep(200);}assert(ready,'Temporary production server did not start');
 const denied=await fetch(origin+'/api/admin/marketing');check(denied.status===401,'Anonymous marketing API returns 401');check(/no-store/.test(denied.headers.get('cache-control'))&&/noindex/.test(denied.headers.get('x-robots-tag')),'Private API sends no-store and noindex headers');
 const cross=await fetch(origin+'/api/admin/auth',{method:'POST',headers:{origin:'https://evil.invalid','content-type':'application/json'},body:'{}'});check(cross.status===403,'Cross-origin Auth mutation rejected');
 const page=await(await fetch(origin+'/admin/marketing')).text();check(!page.includes('Top search queries')&&page.includes('/admin/login'),'Server-protected dashboard reveals no private data before login');
 browser=spawn(chrome(),['--headless','--no-sandbox','--remote-debugging-port=21302','--user-data-dir='+out+'/profile','about:blank'],{stdio:'ignore'});
 let targets;for(let i=0;i<150;i++){try{targets=await(await fetch('http://localhost:21302/json')).json();if(targets.length)break;}catch{}await sleep(100);}assert(targets?.length);
 ws=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const pending=new Map(),errors=[];let fixture=false,requestedDays=[];
 const metric=(columns,values,label='Selected period')=>({columns,rows:[{label,values}]});
 const ga4={overview:metric(['Active users','Sessions','Page views'],[18,24,35]),daily:metric(['Active users','Sessions','Page views'],[18,24,35],'20261116'),pages:metric(['Sessions'],[24],'/salesforce'),acquisition:metric(['Sessions','Active users'],[24,18],'Organic Search / google / organic'),services:metric(['Engagement events'],[7],'/salesforce'),conversions:metric(['Event count'],[1],'consultation_booked'),notes:['Fixture aggregate values for layout verification only.']};
 const search={overview:metric(['Clicks','Impressions','CTR','Avg. position'],[5,100,.05,8.2]),daily:metric(['Clicks','Impressions','CTR','Avg. position'],[5,100,.05,8.2],'2026-11-16'),pages:metric(['Clicks','Impressions','CTR','Avg. position'],[5,100,.05,8.2],'/salesforce'),queries:metric(['Clicks','Impressions','CTR','Avg. position'],[5,100,.05,8.2],'salesforce modernization'),notes:['Fixture search data, not production statistics.']};
 const source=data=>({status:'connected',message:'QA fixture data',updatedAt:'2026-11-17T12:00:00Z',cached:false,persisted:true,data});
 const report=days=>({range:{days:Number(days),start:'2026-11-01',end:'2026-11-16'},ga4:source(ga4),search:source(search)});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});
 ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const p=pending.get(message.id);pending.delete(message.id);if(message.error)p.reject(message.error);else p.resolve(message.result);}
   if(message.method==='Runtime.exceptionThrown')errors.push('runtime exception');
   if(message.method==='Fetch.requestPaused')void(async()=>{const p=message.params,url=new URL(p.request.url);if(url.pathname==='/api/admin/marketing'&&fixture){const days=url.searchParams.get('days');requestedDays.push(days);const body=fixture==='error'?{error:'Reporting service unavailable for this fixture.'}:fixture==='empty'?{...report(days),ga4:{...source({...ga4,overview:{columns:ga4.overview.columns,rows:[]},daily:{columns:ga4.daily.columns,rows:[]}}),status:'empty',message:'No reportable data yet.'}}:report(days);await send('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:fixture==='error'?503:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Cache-Control',value:'private, no-store'}],body:Buffer.from(JSON.stringify(body)).toString('base64')});}
    else if(url.pathname.startsWith('/api/scout')||url.pathname.startsWith('/api/booking')||url.hostname.includes('google-analytics.com')||url.hostname.includes('googletagmanager.com'))await send('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'});
    else await send('Fetch.continueRequest',{requestId:p.requestId});})().catch(()=>errors.push('interception failure'));};
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('Browser evaluation failed');return r.result.value;};
 const until=async expression=>{for(let i=0;i<300;i++){if(await ev(expression))return;await sleep(100);}throw Error('Browser state did not settle: '+expression);};
 const fill=async(selector,value)=>ev(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 const button=async text=>ev(`[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(text)}).click()`);
 await send('Page.enable');await send('Network.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('aa.analytics.consent.v1',JSON.stringify({version:1,choice:'denied',expires:Date.now()+86400000}));"});
 await send('Page.navigate',{url:origin+'/admin/login'});await until("!!document.querySelector('#owner-email')");
 check(await ev("document.querySelector('meta[name=robots]').content.includes('noindex')"),'Owner login is noindex');
 await fill('#owner-email',email);await fill('#owner-password',password);await button('Sign in securely');await until("location.pathname==='/admin/marketing'&&document.body.textContent.includes('Configure the numeric GA4')");
 check(!await ev("!!document.querySelector('#owner-code')"),'Existing verified factor does not force MFA when the owner has not opted in');
 const cookies=await send('Network.getCookies',{urls:[origin]});const authCookies=cookies.cookies.filter(c=>c.name.startsWith('aa-owner-auth'));check(authCookies.length>0&&authCookies.every(c=>c.httpOnly&&c.secure&&c.sameSite==='Lax'),'Auth cookies are HttpOnly, Secure and SameSite=Lax');
 check(await ev("(async()=>{const r=await fetch('/api/admin/marketing');const j=await r.json();return r.ok&&j.ga4.status==='not_configured'&&j.search.status==='not_configured'})()"),'Password login opens the private dashboard directly with honest setup states');
 for(const width of [1440,1280,1191,1100,1051,390]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width===390});
   const menu=await ev("document.querySelector('.menu-toggle').checkVisibility()");if(menu)await ev("document.querySelector('.menu-toggle').click()");
   check(await ev("(()=>{const a=document.querySelector('.header-signin'),r=a.getBoundingClientRect();return a.getAttribute('href')==='/admin/login'&&a.checkVisibility()&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&document.documentElement.scrollWidth===innerWidth})()"),'Discreet Sign in link fits and remains accessible '+width);
   if(menu)await ev("document.querySelector('.menu-toggle').click()");
 }
 fixture=true;
 for(const width of [1440,390]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1000,deviceScaleFactor:1,mobile:width===390});
   await button('Refresh reports');await until("document.body.textContent.includes('salesforce modernization')&&!document.querySelector('[aria-busy=true]')");
   check(await ev('document.documentElement.scrollWidth===innerWidth'),'Dashboard has no horizontal page overflow '+width);
   check(await ev("!!document.querySelector('svg[aria-label*=trend]')&&document.querySelectorAll('table').length>=6"),'Real component charts and accessible reporting tables render '+width);
   const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(out+'/dashboard-'+width+'-fixture.png',Buffer.from(shot.data,'base64'));
 }
 for(const days of ['7','90','28']){await ev(`(()=>{const s=document.querySelector('#marketing-range');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,${JSON.stringify(days)});s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await until("!document.body.textContent.includes('Retrieving private reports')");await sleep(300);check(requestedDays.includes(days),'Date selection requests supported range '+days);}
 fixture='empty';await button('Refresh reports');await until("document.body.textContent.includes('No reportable data yet.')");check(await ev("document.body.textContent.includes('Missing dates are not invented as zero.')"),'Empty report state explains absent data without manufactured trend');
 fixture='error';await button('Refresh reports');await until("!!document.querySelector('[role=alert]')");check(await ev("document.querySelector('[role=alert]').textContent.includes('unavailable')"),'Provider/API failure is recoverable and clearly disclosed');
 fixture=false;await button('Sign out');await until("location.pathname==='/admin/login'&&!!document.querySelector('#owner-email')");
 check(await ev("(async()=>{const r=await fetch('/api/admin/marketing');return r.status===401})()"),'Sign out removes browser access to private API');
 check(!await ev("document.body.textContent.includes('salesforce modernization')"),'Private report contents absent after sign out');
 // Optional MFA remains enforceable through an explicit administrator-set policy.
 const optedIn=await db.from('marketing_memberships').update({require_mfa:true}).eq('tenant_id',tenant).eq('user_id',userId);assert(!optedIn.error);
 await fill('#owner-email',email);await fill('#owner-password',password);await button('Sign in securely');await until("!!document.querySelector('#owner-code')");
 check(await ev("document.body.textContent.includes('Temporary QA authenticator')&&!document.querySelector('img[alt*=enrollment]')"),'Opted-in account identifies its existing factor without issuing a replacement QR');
 check(await ev("(async()=>{const r=await fetch('/api/admin/marketing');return r.status===403})()"),'Opted-in MFA policy blocks password-only report access');
 await button('I can’t access my authenticator');check(await ev("document.querySelector('#owner-mfa-recovery').textContent.includes('verified Supabase project administrator')"),'Recovery help requires administrator verification and provides no bypass');
 await sleep(30500-(Date.now()%30000));await fill('#owner-code',totp(secret));await button('Verify and open dashboard');await until("location.pathname==='/admin/marketing'&&document.body.textContent.includes('Configure the numeric GA4')");
 check(await ev("(async()=>{const r=await fetch('/api/admin/marketing');return r.ok})()"),'Optional MFA verification still unlocks the same securely scoped dashboard');
 await button('Sign out');await until("location.pathname==='/admin/login'&&!!document.querySelector('#owner-email')");
 check(errors.length===0,'No browser runtime errors');
 await writeFile(out+'/results.json',JSON.stringify({checks,fixtureScreenshots:true,realEmails:0,realAppointments:0},null,2));console.log(JSON.stringify({checks:checks.length,out,realEmails:0,realAppointments:0}));
}finally{
 ws?.close();browser?.kill('SIGTERM');server?.kill('SIGTERM');await auth.auth.signOut().catch(()=>{});
 if(userId){const removed=await db.auth.admin.deleteUser(userId);assert(!removed.error,'Temporary QA Auth user cleanup failed');console.log('Temporary Auth user and membership removed.');}
}
