import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadScoutModule as load} from './helpers/scout-loader.mjs';
const ownerId='a7777777-7777-4777-8777-777777777777';
const config=load('src/lib/marketing/config.ts');
const range={days:7,start:'2026-11-10',end:'2026-11-16'};

test('marketing configuration pins the website and requires explicit valid owner UUIDs',()=>{
  assert.deepEqual([...config.ownerIds({MARKETING_OWNER_IDS:`${ownerId},email@example.invalid,admin`})],[ownerId]);
  assert.throws(()=>config.authConfig({SUPABASE_URL:'https://other.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'}));
  assert.throws(()=>config.authConfig({SUPABASE_URL:'https://cjldcaiybqguklzqtdjj.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_secret_never-auth'}));
});
test('Auth SDK expiry initialization cannot run before the request-time boundary',async()=>{
  let connected=false,initialized=false;
  const {ownerAuth}=load('src/lib/marketing/auth.ts',{
    'next/server':{connection:async()=>{await Promise.resolve();connected=true;}},
    'next/headers':{cookies:async()=>({getAll:()=>[],set:()=>{}})},
    '@supabase/ssr':{createServerClient:()=>{assert(connected,'SDK clock access must occur after the request boundary');initialized=true;return {fixture:true};}},
    './config':{...config,authConfig:()=>({url:'https://cjldcaiybqguklzqtdjj.supabase.co',key:'sb_publishable_fixture'})},
  });
  assert.deepEqual(await ownerAuth(),{fixture:true});assert(initialized);
});
test('date ranges are bounded, complete calendar dates; canonical paths retain no query, fragment or private URL',()=>{
  const {reportingRange,publicPath}=load('src/lib/marketing/ranges.ts');
  assert.deepEqual(reportingRange('7',new Date('2026-11-17T01:00Z')),range);
  assert.equal(reportingRange('365').days,28);assert.equal(reportingRange('90').days,90);
  assert.equal(publicPath('https://www.theaugmentedarchitect.com/salesforce/?email=private#x'),'/salesforce');
  assert.equal(publicPath('https://evil.invalid/salesforce'),undefined);assert.equal(publicPath('/admin/marketing'),undefined);assert.equal(publicPath('/api/scout'),undefined);assert.equal(publicPath('(not set)'),undefined);
});
test('all private JSON responses are no-store/noindex; writes reject cross-origin, malformed and oversized data',async()=>{
  const {privateBody,privateJson}=load('src/lib/marketing/http.ts');
  assert.match(privateJson({}).headers.get('cache-control'),/no-store/);assert.match(privateJson({}).headers.get('x-robots-tag'),/noindex/);
  const req=(body,origin='https://site.invalid')=>new Request('https://site.invalid/api/admin/auth',{method:'POST',headers:{origin,'content-type':'application/json'},body});
  await assert.rejects(privateBody(req('{}','https://evil.invalid')),e=>e.status===403);
  for(const text of ['null','[]','"test"','{'])await assert.rejects(privateBody(req(text)),e=>e.status===400);
  await assert.rejects(privateBody(req(JSON.stringify({x:'a'.repeat(5000)}))),e=>e.status===413);
});
function authFixture({user={id:ownerId,email_confirmed_at:'2026-11-17',is_anonymous:false},claims={sub:ownerId,aal:'aal2'},access='allowed',rpcError=null}={}){
  return {auth:{getUser:async()=>({data:{user},error:null}),getClaims:async()=>({data:{claims},error:null})},rpc:async()=>({data:access,error:rpcError})};
}
test('owner authorization permits password-only owners and rejects missing identity, editable metadata, wrong roles, opted-in MFA gaps and revoked membership',async()=>{
  const auth=load('src/lib/marketing/auth.ts');const previous=process.env.MARKETING_OWNER_IDS;process.env.MARKETING_OWNER_IDS=ownerId;
  try{
    await assert.rejects(auth.requireOwner(authFixture({user:null})),e=>e.status===401);
    await assert.rejects(auth.requireOwner(authFixture({user:{id:'b7777777-7777-4777-8777-777777777777',email_confirmed_at:'yes',user_metadata:{role:'owner'}}})),e=>e.status===403);
    await assert.rejects(auth.requireOwner(authFixture({user:{id:ownerId,is_anonymous:true,email_confirmed_at:'yes'}})),e=>e.status===403);
    await assert.rejects(auth.requireOwner(authFixture({user:{id:ownerId}})),e=>e.status===403);
    await assert.doesNotReject(auth.requireOwner(authFixture({claims:{sub:ownerId,aal:'aal1'}})));
    await assert.rejects(auth.requireOwner(authFixture({claims:{sub:ownerId,aal:'aal1'},access:'mfa_required'})),e=>e.status===403);
    await assert.rejects(auth.requireOwner(authFixture({claims:{sub:ownerId,aal:'unknown'}})),e=>e.status===403);
    await assert.rejects(auth.requireOwner(authFixture({claims:{sub:'other',aal:'aal2'}})),e=>e.status===403);
    await assert.rejects(auth.requireOwner(authFixture({access:false})),e=>e.status===403);
    await assert.rejects(auth.requireOwner(authFixture({rpcError:{message:'db secret withheld'}})),e=>e.status===503&&!e.message.includes('secret'));
    assert.equal((await auth.requireOwner(authFixture())).tenantId,config.marketingTenant);
  }finally{if(previous===undefined)delete process.env.MARKETING_OWNER_IDS;else process.env.MARKETING_OWNER_IDS=previous;}
});
test('owner login goes directly to dashboard when optional MFA is off, including accounts with an existing factor',async()=>{
  let factorReads=0;
  const db={auth:{signInWithPassword:async()=>({error:null}),mfa:{listFactors:async()=>{factorReads++;return {};}}}};
  const route=load('src/app/api/admin/auth/route.ts',{'./config':config,'@/lib/marketing/auth':{ownerAuth:async()=>db,ownerAccess:async()=>({state:'allowed'})},'@/lib/marketing/config':{...config,ownerIds:()=>new Set([ownerId])}});
  const response=await route.POST(new Request('https://site.invalid/api/admin/auth',{method:'POST',headers:{origin:'https://site.invalid','content-type':'application/json'},body:JSON.stringify({action:'login',email:'owner@example.invalid',password:'fixture-password'})}));
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{stage:'ready'});assert.equal(factorReads,0);
  assert.deepEqual(await(await route.GET(new Request('https://site.invalid/api/admin/auth'))).json(),{stage:'ready'});
});
test('explicit MFA opt-in supports first-time QR enrollment and existing-factor verification without reset',async()=>{
  let verified=false,enrolled=0;
  const db={auth:{mfa:{listFactors:async()=>({data:{totp:verified?[{id:ownerId,status:'verified',friendly_name:'Marketing owner'}]:[],all:[]},error:null}),enroll:async()=>{enrolled++;return {data:{id:ownerId,totp:{qr_code:'data:image/svg+xml;utf8,fixture-qr',secret:'must-not-return'}},error:null};}}}};
  const route=load('src/app/api/admin/auth/route.ts',{'./config':config,'@/lib/marketing/auth':{ownerAuth:async()=>db,ownerIdentity:async()=>({id:ownerId}),ownerAccess:async()=>({state:'mfa_required'})},'@/lib/marketing/config':{...config,ownerIds:()=>new Set([ownerId])}});
  const get=()=>route.GET(new Request('https://site.invalid/api/admin/auth'));
  assert.deepEqual(await(await get()).json(),{stage:'enroll'});
  const request=()=>new Request('https://site.invalid/api/admin/auth',{method:'POST',headers:{origin:'https://site.invalid','content-type':'application/json'},body:JSON.stringify({action:'enroll'})});
  const response=await route.POST(request()),body=await response.json();assert.equal(body.stage,'challenge');assert(body.qr);assert(!JSON.stringify(body).includes('must-not-return'));
  verified=true;const existing=await(await get()).json();assert.equal(existing.stage,'challenge');assert.equal(existing.factorName,'Marketing owner');assert(!existing.qr);
  assert.equal((await route.POST(request())).status,409);assert.equal(enrolled,1);
});
test('private report API checks owner before calling any reporting provider',async()=>{
  let called=0;
  const route=load('src/app/api/admin/marketing/route.ts',{
    './config':config,
    '@/lib/marketing/auth':{ownerAuth:async()=>({}),requireOwner:async()=>{throw new config.MarketingError(401,'Please sign in.');}},
    '@/lib/marketing/reports':{marketingReports:async()=>{called++;}},
  });
  const response=await route.GET(new Request('https://site.invalid/api/admin/marketing?days=7'));
  assert.equal(response.status,401);assert.equal(called,0);assert.match(response.headers.get('cache-control'),/no-store/);
});
const ga=(values,dimension)=>({rows:values===null?[]:[{...(dimension?{dimensionValues:[{value:dimension}]}:{}),metricValues:values.map(v=>({value:String(v)}))}]});
test('GA4 adapters request numeric property, correct events, aggregate totals and safe landing paths',async()=>{
  const {ga4Report}=load('src/lib/marketing/providers.ts');const calls=[];
  const responses=[ga([12,18,25]),ga([5,6,7],'20261116'),ga([4,3],'Organic Search'),ga([8],'/salesforce?email=private'),ga([2],'/ai-solutions'),ga([1],'consultation_booked'),ga([1],'20261116 / consultation_booked')];
  const data=await ga4Report('564904776',range,async(url,body)=>{calls.push({url,body});return responses[calls.length-1];});
  assert.equal(calls.length,7);assert(calls.every(c=>c.url.includes('/properties/564904776:runReport')));
  assert.deepEqual(data.overview.rows[0].values,[12,18,25]);assert.equal(data.pages.rows[0].path,'/salesforce');
  assert(!JSON.stringify(data).includes('email=private'));assert(JSON.stringify(calls[4]).includes('service_engagement'));assert(JSON.stringify(calls[5]).includes('consultation_booked'));
  assert(!JSON.stringify(calls).includes('customEvent:')); // No custom-dimension setup prerequisite.
  await assert.rejects(ga4Report('G-STBZV24WWN',range));
  await assert.rejects(ga4Report('564904776',range,async()=>ga(['not-a-number',2,3])));
});
test('Search Console uses exact Domain property, final web data, weighted page metrics and independent totals',async()=>{
  const {searchConsoleReport}=load('src/lib/marketing/providers.ts');const calls=[];
  const row=(keys,clicks,impressions,position)=>({keys,clicks,impressions,ctr:clicks/impressions,position});
  const responses=[{rows:[row([],3,100,8)]},{rows:[row(['2026-11-16'],3,100,8)]},{rows:[]},{rows:[row(['https://theaugmentedarchitect.com/salesforce'],1,10,5),row(['https://www.theaugmentedarchitect.com/salesforce?x=1'],2,20,11)]}];
  const data=await searchConsoleReport(range,async(url,body)=>{calls.push({url,body});return responses[calls.length-1];});
  assert(calls.every(c=>c.url.includes('sc-domain%3Atheaugmentedarchitect.com')&&c.body.dataState==='final'&&c.body.type==='web'));
  assert.deepEqual(data.pages.rows[0].values,[3,30,.1,9]);assert.equal(data.overview.rows[0].values[1],100);assert.equal(data.queries.rows.length,0);
});
test('providers preserve genuine empty results, with no invented zero-filled daily series',async()=>{
  const providers=load('src/lib/marketing/providers.ts');
  const search=await providers.searchConsoleReport(range,async()=>({}));assert.deepEqual(search.daily.rows,[]);
  const ga4=await providers.ga4Report('564904776',range,async()=>({}));assert.deepEqual(ga4.overview.rows,[]);
});
test('reporting credentials are isolated read-only scopes; provider errors never disclose response secrets',async()=>{
  let authOptions;
  let token='short-lived-fixture-a';
  const fake={fromJSON:options=>{authOptions=options;return {request:async()=>{throw {response:{status:403,data:{secret:'private-key'}}};}};}};
  const {reportingRequest}=load('src/lib/marketing/google.ts',{'google-auth-library':{ExternalAccountClient:fake},'@vercel/oidc':{getVercelOidcToken:async()=>token}});
  const values={GOOGLE_MARKETING_PROJECT_NUMBER:'123456789012',GOOGLE_MARKETING_POOL_ID:'augarch-marketing',GOOGLE_MARKETING_PROVIDER_ID:'vercel',GOOGLE_MARKETING_SERVICE_ACCOUNT_EMAIL:'marketing-intelligence-reader@the-augmented-architect-web.iam.gserviceaccount.com'};
  const previous=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));Object.assign(process.env,values);
  try{
    await assert.rejects(reportingRequest('https://analyticsdata.googleapis.com/v1beta/properties/1:runReport',{}),e=>e.status===503&&!e.message.includes('private-key'));
    assert.deepEqual(authOptions.scopes,['https://www.googleapis.com/auth/analytics.readonly','https://www.googleapis.com/auth/webmasters.readonly']);
    assert.equal(authOptions.type,'external_account');assert.equal(authOptions.service_account_impersonation.token_lifetime_seconds,900);
    assert(!authOptions.credentials&&!authOptions.private_key&&!authOptions.credential_source);
    assert.match(authOptions.audience,/\/projects\/123456789012\/locations\/global\/workloadIdentityPools\/augarch-marketing\/providers\/vercel$/);
    assert.match(authOptions.service_account_impersonation_url,/marketing-intelligence-reader@the-augmented-architect-web\.iam\.gserviceaccount\.com:generateAccessToken$/);
    assert.equal(await authOptions.subject_token_supplier.getSubjectToken(),'short-lived-fixture-a');token='short-lived-fixture-b';assert.equal(await authOptions.subject_token_supplier.getSubjectToken(),'short-lived-fixture-b');
    await assert.rejects(reportingRequest('https://evil.invalid/',{}));
  }finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
test('keyless configuration rejects missing identifiers, unsafe URLs and a different service account',()=>{
  const {federationConfig}=load('src/lib/marketing/federation.ts');
  const values={GOOGLE_MARKETING_PROJECT_NUMBER:'123456789012',GOOGLE_MARKETING_POOL_ID:'augarch-marketing',GOOGLE_MARKETING_PROVIDER_ID:'vercel',GOOGLE_MARKETING_SERVICE_ACCOUNT_EMAIL:'marketing-intelligence-reader@the-augmented-architect-web.iam.gserviceaccount.com'};
  assert.throws(()=>federationConfig({GOOGLE_MARKETING_SERVICE_ACCOUNT_JSON:'ignored'}));
  assert.throws(()=>federationConfig({...values,GOOGLE_MARKETING_POOL_ID:'../evil'}));
  assert.throws(()=>federationConfig({...values,GOOGLE_MARKETING_SERVICE_ACCOUNT_EMAIL:'other@example.invalid'}));
  assert.match(federationConfig(values).impersonationUrl,/^https:\/\/iamcredentials.googleapis.com\//);
});
test('MFA enrollment verification accepts only a factor owned by the validated user, including unverified enrollment',async()=>{
  const factorId='f7777777-7777-4777-8777-777777777777';let verified=0;
  const db={auth:{mfa:{listFactors:async()=>({data:{totp:[],all:[{id:factorId,factor_type:'totp',status:'unverified'}]},error:null}),challengeAndVerify:async()=>{verified++;return {error:null};}}}};
  const route=load('src/app/api/admin/auth/route.ts',{'./config':config,'@/lib/marketing/auth':{ownerAuth:async()=>db,ownerIdentity:async()=>({id:ownerId}),requireOwner:async()=>({})},'@/lib/marketing/config':{...config,ownerIds:()=>new Set([ownerId])}});
  const request=id=>new Request('https://site.invalid/api/admin/auth',{method:'POST',headers:{origin:'https://site.invalid','content-type':'application/json'},body:JSON.stringify({action:'verify',factorId:id,code:'123456'})});
  assert.equal((await route.POST(request(factorId))).status,200);assert.equal(verified,1);
  assert.equal((await route.POST(request(ownerId))).status,400);assert.equal(verified,1);
});
test('persistent report cache scopes every lookup to tenant, source, property and dates; failures reveal no provider body',async()=>{
  const filters=[],writes=[];let calls=0,cached=false,fail=false;
  const payload={overview:{columns:['Sessions'],rows:[{label:'Selected period',values:[4]}]},daily:{columns:[],rows:[]},pages:{columns:[],rows:[]},notes:[]};
  const db={from:table=>{
    assert.equal(table,'marketing_reports');const chain={select:()=>chain,eq:(key,value)=>{filters.push([key,value]);return chain;},gte:()=>chain,order:()=>chain,limit:()=>chain,maybeSingle:async()=>({data:cached?{payload,extracted_at:'2026-11-17T12:00:00Z'}:null,error:null}),insert:async value=>{writes.push(value);return {error:null};}};return chain;
  }};
  const providers={ga4Report:async()=>{calls++;if(fail)throw Error('raw-provider-secret');return payload;},searchConsoleReport:async()=>payload};
  const {marketingReports}=load('src/lib/marketing/reports.ts',{'./config':config,'./google':{googleReportingConfigured:()=>true},'./providers':providers});
  const previous=process.env.GA4_PROPERTY_ID;process.env.GA4_PROPERTY_ID='564904776';
  try{
    const first=await marketingReports({db,tenantId:config.marketingTenant},range);assert.equal(first.ga4.status,'connected');assert.equal(writes.length,2);assert.equal(first.ga4.persisted,true);
    for(const key of ['tenant_id','source','property_id','start_date','end_date'])assert(filters.some(([k])=>k===key));
    cached=true;const second=await marketingReports({db,tenantId:config.marketingTenant},range);assert.equal(second.ga4.cached,true);assert.equal(calls,1);
    cached=false;fail=true;const failure=await marketingReports({db,tenantId:config.marketingTenant},range);assert.equal(failure.ga4.status,'error');assert.equal(failure.ga4.data,null);assert(!JSON.stringify(failure).includes('raw-provider-secret'));
  }finally{if(previous===undefined)delete process.env.GA4_PROPERTY_ID;else process.env.GA4_PROPERTY_ID=previous;}
});
test('marketing schema separates tenants, rejects cross-tenant evidence and has no public writes to agents or approvals',()=>{
  const sql=readFileSync('supabase/migrations/20261117223824_marketing_intelligence.sql','utf8');
  assert.match(sql,/s\.id=.*session_id/);assert.match(sql,/aal2/);assert.match(sql,/security definer set search_path = ''/);
  assert.match(sql,/foreign key\(tenant_id,report_id\)/);assert.match(sql,/revoke all[\s\S]*from anon,authenticated/);
  assert(!/alter table public\.scout_/.test(sql));assert(!/grant (insert|update|delete).*marketing_artifacts to authenticated/.test(sql));
});

test('preceding reporting periods have equal length and never overlap the selected period',()=>{
 const {previousReportingRange}=load('src/lib/marketing/ranges.ts');
 for(const days of [7,28,90]){
  const range={days,start:'2026-11-01',end:new Date(Date.UTC(2026,10,days)).toISOString().slice(0,10)};
  const prior=previousReportingRange(range);assert.equal(prior.end,'2026-10-31');
  assert.equal((Date.parse(prior.end)-Date.parse(prior.start))/86400000+1,days);
 }
});
test('demo data is deterministic, isolated and internally derived, never an agent execution',()=>{
 const {demoReport}=load('src/components/marketing/demo.ts');
 for(const days of [7,28,90]){
  const data=demoReport(days);assert.deepEqual(data,demoReport(days));assert.equal(data.ga4.data.daily.rows.length,days);
  assert.equal(data.ga4.data.overview.rows[0].values[1],data.ga4.data.daily.rows.reduce((n,r)=>n+r.values[1],0));
  assert.equal(data.search.data.overview.rows[0].values[2],data.search.data.overview.rows[0].values[0]/data.search.data.overview.rows[0].values[1]);
  assert.equal(data.ga4.persisted,false);assert.equal(data.ga4.updatedAt,null);assert.match(data.ga4.message,/Simulated/);
 }
 for(const file of ['src/lib/marketing/reports.ts','src/lib/marketing/providers.ts','src/app/api/admin/marketing/route.ts'])assert(!readFileSync(file,'utf8').includes('demoReport'));
});
test('metric formatting distinguishes unavailable results, true zero and meaningful comparisons',()=>{
 const {metric,formatted,comparison,eventValue}=load('src/components/marketing/report-utils.ts');
 assert.equal(formatted(undefined,'Sessions'),'—');assert.equal(formatted(0,'Sessions'),'0');assert.equal(formatted(.045,'CTR'),'4.5%');
 assert.equal(metric(undefined,'Sessions'),undefined);assert.equal(eventValue(undefined,'consultation_booked'),undefined);
 assert.equal(eventValue({columns:['Event count'],rows:[]},'consultation_booked'),0);
 assert.match(comparison(3,1,'Sessions'),/More data/);assert.equal(comparison(120,100,'Sessions'),'+20.0% vs previous period');
});
test('activity API denies unauthenticated access before any private database query',async()=>{
 const route=load('src/app/api/admin/marketing/activity/route.ts',{'./config':config,'@/lib/marketing/config':config,'@/lib/marketing/auth':{ownerAuth:async()=>({}),requireOwner:async()=>{throw new config.MarketingError(401,'Please sign in.');}}});
 const response=await route.GET(new Request('https://site.invalid/api/admin/marketing/activity'));assert.equal(response.status,401);assert.match(response.headers.get('cache-control'),/no-store/);
});
test('activity uses explicit tenant filters and returns metadata only',async()=>{
 const reads=[];const db={from(table){const q={select(columns){reads.push({table,columns});return q;},eq(k,v){assert.equal(k,'tenant_id');assert.equal(v,config.marketingTenant);return q;},order(){return q;},limit(){return Promise.resolve({data:[],error:null});}};return q;}};
 const route=load('src/app/api/admin/marketing/activity/route.ts',{'./config':config,'@/lib/marketing/config':config,'@/lib/marketing/auth':{ownerAuth:async()=>db,requireOwner:async()=>({db,tenantId:config.marketingTenant})}});
 const response=await route.GET(new Request('https://site.invalid/api/admin/marketing/activity'));assert.equal(response.status,200);assert.deepEqual(await response.json(),{reports:[],executions:[],artifacts:[]});
 assert.equal(reads.length,3);assert(reads.every(r=>!/(payload|diagnostics|config|usage)/.test(r.columns)));
});

test('chart spacing preserves real date gaps and centers a single observation',()=>{
 const {seriesPositions}=load('src/components/marketing/report-utils.ts');
 assert.deepEqual(seriesPositions(['20261101','20261102','20261111']),[0,.1,1]);
 assert.deepEqual(seriesPositions(['2026-11-01']),[.5]);assert.deepEqual(seriesPositions([]),[]);
});
