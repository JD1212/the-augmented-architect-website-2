import * as phase3Content from '@augmented-architect/content-strategist';
// Deterministic fixtures only. No provider/model/network calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import * as pkg from '@augmented-architect/seo-analyst';
import {loadScoutModule as load} from './helpers/scout-loader.mjs';
import {memoryDatabase} from './helpers/marketing-memory.mjs';
const overrides={'@augmented-architect/content-strategist':phase3Content,'@augmented-architect/seo-analyst':pkg},config=load('src/lib/marketing/config.ts'),tenant=config.marketingTenant,actor='a2eba199-7949-49c9-828e-9d755e2e345b';
const data=load('src/lib/marketing/intelligence/dataforseo.ts',overrides),{dataForSeoKeywordProvider,dataForSeoProvider,dataForSeoTarget,dataForSeoApproval,firstResearchExperiment}=data;
overrides['./dataforseo']=data;
const {executeResearch,parseResearchCommand,intelligenceRecords,providerScope}=load('src/lib/marketing/intelligence/service.ts',overrides),{researchConnections}=load('src/lib/marketing/intelligence/providers.ts',overrides);
const time=new Date('2026-11-18T04:00:30Z'),target={country:'US',language:'en'},signal=()=>new AbortController().signal;
const command=(extra={})=>({requestId:randomUUID(),provider:'dataforseo',mode:'ideas',service:'salesforce',seeds:[...firstResearchExperiment.seeds],target,...extra});
const task=(result,cost=.09,extra={})=>Response.json({status_code:20000,cost,tasks:[{id:'fixture-task-id',cost,status_code:20000,result,...extra}]});
const row=(extra={})=>({keyword:'Salesforce automation consulting',location_code:2840,language_code:'en',search_partners:false,search_volume:40,competition:'HIGH',competition_index:90,cpc:3.14,low_top_of_page_bid:1.2,high_top_of_page_bid:7.5,monthly_searches:[{year:2026,month:10,search_volume:30}],...extra});
const options=fetcher=>({login:'fixture-api-login',password:'fixture-api-password',fetcher,now:()=>time});
const approved={DATAFORSEO_LOGIN:'fixture-api-login',DATAFORSEO_PASSWORD:'fixture-api-password',DATAFORSEO_RESEARCH_ENABLED:'true',DATAFORSEO_APPROVAL_ID:'fixture-approved-experiment',DATAFORSEO_MAX_REQUESTS:'4',DATAFORSEO_BUDGET_USD:'.184'};
async function env(values,fn){const before={};for(const [k,v] of Object.entries(values)){before[k]=process.env[k];process.env[k]=v;}try{return await fn();}finally{for(const [k,v] of Object.entries(before))if(v===undefined)delete process.env[k];else process.env[k]=v;}}
test('DataForSEO keywords use only approved v3 endpoints, fixed task size and server-only Basic auth',async()=>{
 const calls=[],provider=dataForSeoKeywordProvider(options(async(url,o)=>{calls.push({url,body:JSON.parse(o.body)});assert.equal(o.redirect,'error');assert.equal(o.cache,'no-store');assert.equal(o.headers.Authorization,'Basic '+Buffer.from('fixture-api-login:fixture-api-password').toString('base64'));return task([row()]);}));
 const a=await provider.research(command(),signal());await provider.research(command({mode:'historical'}),signal());
 assert(calls[0].url.endsWith('/keywords_data/google_ads/keywords_for_keywords/live'));assert(calls[1].url.endsWith('/keywords_data/google_ads/search_volume/live'));assert.equal(calls[0].body.length,1);assert.equal(calls[0].body[0].keywords.length,5);assert.equal(calls[0].body[0].location_code,2840);assert.equal(calls[0].body[0].language_code,'en');assert.equal(calls[0].body[0].search_partners,false);assert(!('limit' in calls[0].body[0]));assert.equal(a.provenance.reportedCostUsd,.09);assert.equal(a.provenance.requestId,'fixture-task-id');assert.equal(a.records[0].averageCpcMicros,3140000);assert.equal(a.records[0].currency,'USD');assert.equal(a.records[0].monthly[0].estimatedSearches,30);assert(!JSON.stringify(a).includes('fixture-api-password'));
});
test('unknown versus zero and corrected spelling remain explicit; returned ideas are bounded without extra requests',async()=>{
 let calls=0;const provider=dataForSeoKeywordProvider(options(async()=>{calls++;return task([row({keyword:'salesforce consultng',spell:'salesforce consulting',search_volume:0,competition:null,competition_index:0,cpc:0,monthly_searches:null}),row({keyword:'Missing',search_volume:null,cpc:null,monthly_searches:null}),...Array.from({length:60},(_,i)=>row({keyword:'idea '+i}))]);}));
 const {records}=await provider.research(command(),signal());assert.equal(calls,1);assert.equal(records.length,50);assert.equal(records[0].term,'salesforce consulting');assert.deepEqual(records[0].variants,['salesforce consultng']);assert.equal(records[0].estimatedMonthlySearches,0);assert.equal(records[0].averageCpcMicros,0);assert.equal(records[0].advertisingCompetition,null);assert.equal(records[0].advertisingCompetitionIndex,0);assert.equal(records[0].searchIntent,'unknown');assert.equal(records[1].estimatedMonthlySearches,null);assert.equal(records[1].averageCpcMicros,null);assert.deepEqual(records[1].monthly,[]);
});
test('configured geography/language are shared, validated and included in cache scope',async()=>{
 await env({DATAFORSEO_LOCATION_CODE:'2124',DATAFORSEO_COUNTRY_CODE:'CA',DATAFORSEO_LANGUAGE_CODE:'fr'},async()=>{
  assert.deepEqual(dataForSeoTarget(),{locationCode:2124,country:'CA',language:'fr'});let body;
  const provider=dataForSeoKeywordProvider(options(async(_u,o)=>{body=JSON.parse(o.body);return task([row({location_code:2124,language_code:'fr'})]);}));
  const q=parseResearchCommand(command({target:{country:'CA',language:'fr'}}));assert.equal(q.provider,'dataforseo');assert.equal(q.locationCode,2124);const r=await provider.research(q,signal());assert.equal(body[0].location_code,2124);assert.equal(body[0].language_code,'fr');assert.equal(r.records[0].target.country,'CA');
  const scope=providerScope(tenant,q);process.env.DATAFORSEO_LOCATION_CODE='1000000';assert.notEqual(scope,providerScope(tenant,q));await assert.rejects(provider.research(command(),signal()),e=>e.status===400);
 });
 assert.throws(()=>dataForSeoTarget({DATAFORSEO_LOCATION_CODE:'https://evil.invalid'}));
});
test('Google Ads authorization does not enable DataForSEO; credentials alone and flag alone cannot approve paid requests',()=>{
 for(const e of [{},{DATAFORSEO_LOGIN:'fixture',DATAFORSEO_PASSWORD:'fixture'},{DATAFORSEO_LOGIN:'fixture',DATAFORSEO_PASSWORD:'fixture',DATAFORSEO_RESEARCH_ENABLED:'true'}])assert(researchConnections(e).filter(c=>c.id!=='google_ads').every(c=>!c.ready));
 assert(researchConnections(approved).filter(c=>c.id!=='google_ads').every(c=>c.ready));assert(!dataForSeoApproval({...approved,DATAFORSEO_BUDGET_USD:'Infinity'}).configured);assert(!dataForSeoApproval({...approved,DATAFORSEO_MAX_REQUESTS:'500'}).configured);
});
test('failed, expensive or malformed provider results retain available receipts without leaking raw provider errors',async()=>{
 for(const response of [()=>task([], .10),()=>task(null,.09,{status_code:40501,status_message:'fixture-api-password must never surface'}),()=>task([row({cpc:-1})]),()=>task([row({location_code:2124})])]){
  const provider=dataForSeoKeywordProvider(options(async()=>response()));await assert.rejects(provider.research(command(),signal()),e=>e.status===503&&e.receipt?.requestId==='fixture-task-id'&&!e.message.includes('fixture-api-password'));
 }
 let calls=0;await assert.rejects(dataForSeoKeywordProvider(options(async()=>{calls++;throw Error('fixture-api-password');})).research(command(),signal()),e=>e.status===503&&!e.message.includes('fixture-api-password'));assert.equal(calls,1);
});
test('SERP observations use organic rank, keep actual cost and reject unsafe URLs and paid modifiers',async()=>{
 let calls=0;const provider=dataForSeoProvider(options(async()=>{calls++;return task([{location_code:2840,language_code:'en',datetime:'2026-11-18 04:00:00 +00:00',items:[{type:'organic',url:'https://example.com/service',title:'Consulting',rank_group:2,rank_absolute:4}]}],.002);}));
 const r=await provider.research(firstResearchExperiment.competitionTerms[0],target,signal());assert.equal(r.results[0].observedOrganicPosition,2);assert.equal(r.results[0].contentType,null);assert.equal(r.provenance.reportedCostUsd,.002);assert.equal(r.observedAt,'2026-11-18T04:00:00.000Z');
 await assert.rejects(provider.research('site:example.com Salesforce',target,signal()),e=>e.status===400);assert.equal(calls,1);
 await assert.rejects(dataForSeoProvider(options(async()=>task([{items:[{type:'organic',url:'http://127.0.0.1/secrets',rank_group:1}]}],.002))).research('Salesforce consulting',target,signal()),e=>e.receipt?.reportedCostUsd===.002);
});
test('approved USD reservations enforce experiment exposure before dispatch; repeated IDs and caches do not spend twice',async()=>{
 await env(approved,async()=>{
  const db=memoryDatabase();let calls=0,minute=0;const keyword={id:'dataforseo_keywords',research:async()=>{calls++;return {records:[],provenance:{provider:'dataforseo_keywords',apiVersion:'v3',collectedAt:time.toISOString(),expiresAt:'2026-11-25T04:00:30Z',requestId:'fixture-task-'+calls,reportedCostUsd:.09,sourceUrls:['https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/']}};}},run=q=>executeResearch({db,tenant,actor,command:q,authorize:async()=>{},keyword,competitive:dataForSeoProvider(options(async()=>{calls++;return task([{items:[]}],.002);})),now:new Date(time.getTime()+minute++*60000)});
  const first=command();await run(first);await run(first);await run(command());assert.equal(calls,1);await run(command({mode:'historical'}));assert.equal(calls,2);await assert.rejects(run(command({seeds:['Another paid keyword']})),e=>e.status===429);assert.equal(calls,2);
  await run(command({mode:'competition',seeds:['Salesforce automation consulting']}));await run(command({mode:'competition',seeds:['Salesforce org cleanup']}));await assert.rejects(run(command({mode:'competition',seeds:['Salesforce technical debt']})),e=>e.status===429);assert.equal(calls,4);
  const claims=db.rows.marketing_artifacts.filter(r=>r.payload.workflow==='intelligence-request/v1');assert.equal(claims.length,4);assert(Math.abs(claims.reduce((n,r)=>n+r.payload.reservedMaximumUsd,0)-.184)<1e-10);assert.equal(db.rows.marketing_executions.length,0);
 });
});
test('uncertain paid failure stops further spending under the approval and preserves the real receipt',async()=>{
 await env(approved,async()=>{
  const db=memoryDatabase();let calls=0;const keyword=dataForSeoKeywordProvider(options(async()=>{calls++;return task([], .11);})),run=q=>executeResearch({db,tenant,actor,command:q,authorize:async()=>{},keyword,now:new Date(time.getTime()+60000)});
  await assert.rejects(run(command()));const failed=(await intelligenceRecords(db,tenant)).find(r=>r.payload.workflow==='intelligence-failure/v1');assert.equal(failed.payload.receipt.reportedCostUsd,.11);assert.equal(failed.payload.approvalId,approved.DATAFORSEO_APPROVAL_ID);await assert.rejects(run(command({seeds:['Another query']})),e=>e.status===409);assert.equal(calls,1);
 });
});
test('disabled owner research is rejected before privileged database construction',async()=>{
 let touched=0;const db={},owner={db,tenantId:tenant,user:{id:actor}},route=load('src/app/api/admin/marketing/intelligence/route.ts',{...overrides,'./config':config,'../config':config,'@/lib/marketing/auth':{ownerAuth:async()=>db,requireOwner:async()=>owner},'@/lib/marketing/config':config,'@/lib/marketing/seo/config':{seoDatabase:()=>{touched++;throw Error();}}});
 const response=await route.POST(new Request('https://site.invalid/api/admin/marketing/intelligence',{method:'POST',headers:{origin:'https://site.invalid','content-type':'application/json'},body:JSON.stringify({operation:'research',...command()})}));assert.equal(response.status,503);assert.equal(touched,0);
});
test('DataForSEO evidence attaches to existing opportunities and exposes supported demand without fabricating a full score',async()=>{
 const executionId=randomUUID(),opportunityId=randomUUID(),finding={change:'new',existingOpportunityId:null,priority:1,title:'Salesforce automation consulting',targetCustomer:'Salesforce administrators',searchIntent:'Commercial investigation',supportingEvidence:'Fixture only.',recommendedAction:'Review consulting relevance.',businessRelevance:'Qualified Salesforce consulting inquiries.',confidence:'low',limitations:['Fixture only.'],basis:'external_research',requiresOwnerReview:true,evidenceIds:['fixture'],sourceUrls:['https://architect.salesforce.com/'],evidenceArtifactId:randomUUID()};
 const db=memoryDatabase({marketing_executions:[{id:executionId,tenant_id:tenant,agent_id:randomUUID(),state:'completed'}],marketing_artifacts:[{id:opportunityId,tenant_id:tenant,execution_id:executionId,kind:'opportunity',created_at:time.toISOString(),payload:finding}]});
 const result=await executeResearch({db,tenant,actor,command:command(),authorize:async()=>{},keyword:dataForSeoKeywordProvider(options(async()=>task([row()]))),enabled:true,now:time});
 const {linkResearch}=load('src/lib/marketing/intelligence/service.ts',overrides);await linkResearch(db,tenant,actor,result.research.id,opportunityId,row().keyword);const {opportunityIntelligence}=load('src/lib/marketing/intelligence/scoring.ts',overrides),score=opportunityIntelligence(opportunityId,await intelligenceRecords(db,tenant),time).score;assert.equal(score.evidenceCoverage,20);assert.equal(score.status,'insufficient_evidence');assert.equal(score.factors.find(f=>f.name==='competitiveFeasibility').value,null);assert.equal(db.rows.marketing_artifacts.filter(r=>r.kind==='opportunity').length,1);assert(!JSON.stringify(db.rows).includes('fixture-api-password'));
});

test('successful provider receipt survives result persistence failure; unfinished claims stop another paid request',async()=>{
 await env(approved,async()=>{
  const db=memoryDatabase(),original=db.from;db.from=function(table){const q=original.call(db,table),insert=q.insert;q.insert=function(payload){if(payload?.payload?.workflow==='intelligence-research/v1')return Promise.resolve({error:{code:'fixture-persistence-failure'}});return insert.call(q,payload);};return q;};let calls=0;
  const keyword=dataForSeoKeywordProvider(options(async()=>{calls++;return task([row()]);})),run=q=>executeResearch({db,tenant,actor,command:q,authorize:async()=>{},keyword,now:new Date(time.getTime()+120000)});
  await assert.rejects(run(command()));const failure=db.rows.marketing_artifacts.find(r=>r.payload.workflow==='intelligence-failure/v1');assert.equal(failure.payload.receipt.reportedCostUsd,.09);assert.equal(failure.payload.receipt.requestId,'fixture-task-id');
  // Even a lost failure artifact cannot turn a claimed/uncertain task into permission to spend again.
  db.rows.marketing_artifacts=db.rows.marketing_artifacts.filter(r=>r.id!==failure.id);await assert.rejects(run(command({seeds:['Different seed']})),e=>e.status===409);assert.equal(calls,1);
 });
});
test('concurrent paid research uses one durable reservation and another tenant cannot dispatch',async()=>{
 await env(approved,async()=>{
  const db=memoryDatabase();let calls=0;const keyword=dataForSeoKeywordProvider(options(async()=>{calls++;return task([row()]);})),run=(q,t=tenant)=>executeResearch({db,tenant:t,actor,command:q,authorize:async()=>{},keyword,now:time});
  await assert.rejects(run(command(),'another-tenant'),e=>e.status===403);assert.equal(calls,0);
  const results=await Promise.allSettled([run(command()),run(command({seeds:['Other seed']}))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(calls,1);assert.equal(db.rows.marketing_artifacts.filter(r=>r.payload.workflow==='intelligence-request/v1').length,1);
 });
});

// Failure diagnostics: numeric metadata only; every test fetcher is a fixture.
const capture=async action=>{try{await action();assert.fail('Expected a fixture failure');}catch(e){assert(e instanceof data.DataForSeoError);return e;}};
for(const [status,category] of [[401,'authentication'],[403,'permissions'],[402,'insufficient_balance'],[429,'rate_limit'],[500,'unexpected_response'],[503,'unexpected_response']])test(`HTTP ${status} persists safe ${category} diagnostics and never retries`,async()=>{
 const db=memoryDatabase(),q=command();let calls=0;
 const keyword=dataForSeoKeywordProvider(options(async()=>{calls++;return new Response('sensitive fixture-api-password response body',{status,headers:{Authorization:'fixture-api-password'}});}));
 const error=await capture(()=>executeResearch({db,tenant,actor,command:q,authorize:async()=>{},keyword,enabled:true,now:time}));
 const failure=db.rows.marketing_artifacts.find(r=>r.payload.workflow==='intelligence-failure/v1'),d=failure.payload.diagnostic;
 assert.equal(calls,1);assert.equal(d.httpStatus,status);assert.equal(d.category,category);assert.equal(d.stage,'http_response');assert.equal(d.providerStatusCode,null);assert.equal(d.reportedCostUsd,null);assert.equal(d.providerRequestId,null);assert.equal(d.requestId,q.requestId);assert.equal(d.endpoint,'keywords_data/google_ads/keywords_for_keywords/live');assert.equal(failure.payload.receipt,null);assert(error.message.includes(String(status)));
 assert(!JSON.stringify(failure).includes('fixture-api-password'));assert(!JSON.stringify(d).includes('Authorization'));assert(!JSON.stringify(d).includes('response body'));
 await assert.rejects(executeResearch({db,tenant,actor,command:q,authorize:async()=>{},keyword,enabled:true,now:time}),e=>e.status===409);assert.equal(calls,1);
});
for(const [code,category] of [[40100,'authentication'],[40104,'permissions'],[40200,'insufficient_balance'],[40210,'insufficient_balance'],[40202,'rate_limit'],[40203,'rate_limit'],[40205,'rate_limit'],[40209,'rate_limit'],[40207,'permissions'],[40501,'unexpected_response']])test(`HTTP 200 provider error ${code} retains its real code and zero-cost receipt`,async()=>{
 const db=memoryDatabase(),q=command();let calls=0;
 const keyword=dataForSeoKeywordProvider(options(async()=>{calls++;return task(null,0,{status_code:code,status_message:'fixture-api-password private provider message',data:{Authorization:'secret header'}});}));
 await capture(()=>executeResearch({db,tenant,actor,command:q,authorize:async()=>{},keyword,enabled:true,now:time}));const failure=db.rows.marketing_artifacts.find(r=>r.payload.workflow==='intelligence-failure/v1'),d=failure.payload.diagnostic;
 assert.equal(calls,1);assert.equal(d.httpStatus,200);assert.equal(d.providerStatusCode,code);assert.equal(d.category,category);assert.equal(d.reportedCostUsd,0);assert.equal(d.providerRequestId,'fixture-task-id');assert.equal(failure.payload.receipt.reportedCostUsd,0);assert.equal(d.requestId,q.requestId);assert(!JSON.stringify(failure).includes('fixture-api-password'));assert(!JSON.stringify(failure).includes('private provider message'));assert.equal(db.rows.marketing_executions.length,0);
});
test('HTTP-level JSON failures retain code and actual reported cost; envelope errors work without task records',async()=>{
 const e=await capture(()=>dataForSeoKeywordProvider(options(async()=>Response.json({status_code:40210,cost:0,status_message:'fixture-api-password',tasks:null},{status:402}))).research(command(),signal()));assert.equal(e.diagnostic.httpStatus,402);assert.equal(e.diagnostic.providerStatusCode,40210);assert.equal(e.diagnostic.reportedCostUsd,0);assert.equal(e.diagnostic.providerRequestId,null);assert.equal(e.diagnostic.category,'insufficient_balance');assert(!JSON.stringify(e.diagnostic).includes('fixture-api-password'));
 const top=await capture(()=>dataForSeoKeywordProvider(options(async()=>Response.json({status_code:40207,cost:0,tasks:[]}))).research(command(),signal()));assert.equal(top.diagnostic.providerStatusCode,40207);assert.equal(top.diagnostic.category,'permissions');
 const cost=await capture(()=>dataForSeoKeywordProvider(options(async()=>task(null,.025,{status_code:40501}))).research(command(),signal()));assert.equal(cost.diagnostic.reportedCostUsd,.025);assert.equal(cost.receipt.reportedCostUsd,.025);
});
for(const name of ['network','timeout'])test(`${name} failures have unknown HTTP/code/cost and no sensitive cause`,async()=>{
 const db=memoryDatabase(),q=command();let calls=0;
 const keyword=dataForSeoKeywordProvider(options(async()=>{calls++;throw name==='timeout'?new DOMException('fixture-api-password','AbortError'):Error('Authorization fixture-api-password request body');}));
 const error=await capture(()=>executeResearch({db,tenant,actor,command:q,authorize:async()=>{},keyword,enabled:true,now:time})),d=db.rows.marketing_artifacts.find(r=>r.payload.workflow==='intelligence-failure/v1').payload.diagnostic;
 assert.equal(calls,1);assert.equal(d.category,'transport');assert.equal(d.stage,'transport');assert.equal(d.httpStatus,null);assert.equal(d.providerStatusCode,null);assert.equal(d.reportedCostUsd,null);assert.equal(d.requestId,q.requestId);assert(!error.message.includes('fixture-api-password'));assert(!JSON.stringify(d).includes('fixture-api-password'));
});
test('malformed, oversized and evidence-invalid responses preserve HTTP metadata without storing bodies',async()=>{
 for(const response of [()=>new Response('<html>fixture-api-password</html>'),()=>new Response('x'.repeat(65537),{status:401}),()=>task([row({cpc:-1})])]){
  const e=await capture(()=>dataForSeoKeywordProvider(options(async()=>response())).research(command(),signal()));assert(e.diagnostic.httpStatus!==null);assert(!JSON.stringify(e.diagnostic).includes('fixture-api-password'));if(e.diagnostic.httpStatus===401)assert.equal(e.diagnostic.category,'authentication');else assert.equal(e.diagnostic.category,'unexpected_response');
 }
});
test('echoed credentials cannot become provider correlation IDs; diagnostic projection drops arbitrary data',async()=>{
 for(const id of ['fixture-api-password','fixture-api-login',Buffer.from('fixture-api-login:fixture-api-password').toString('base64')]){
  const e=await capture(()=>dataForSeoKeywordProvider(options(async()=>task(null,0,{id,status_code:40100}))).research(command(),signal()));assert.equal(e.diagnostic.providerRequestId,null);assert.equal(e.receipt.requestId,null);assert(!JSON.stringify(e.diagnostic).includes(id));
 }
 const base=(await capture(()=>dataForSeoKeywordProvider(options(async()=>task(null,0,{status_code:40100}))).research(command(),signal()))).diagnostic;
 const projected=data.sanitizeDataForSeoDiagnostic({...base,Authorization:'private',body:{password:'private'},status_message:'private',cause:Error('private')});assert.deepEqual(projected,base);assert.equal(data.sanitizeDataForSeoDiagnostic(undefined),null);assert.equal(data.sanitizeDataForSeoDiagnostic({...base,endpoint:'https://evil.invalid/?password=private'}),null);
});
test('new diagnostic metadata does not reopen a failed spending approval',async()=>{
 await env(approved,async()=>{
  const db=memoryDatabase();let calls=0;const keyword=dataForSeoKeywordProvider(options(async()=>{calls++;return Response.json({status_code:40100,cost:0},{status:401});})),run=q=>executeResearch({db,tenant,actor,command:q,authorize:async()=>{},keyword,now:new Date(time.getTime()+120000)});
  await capture(()=>run(command()));await assert.rejects(run(command({seeds:['Do not dispatch']})),e=>e.status===409);assert.equal(calls,1);const failure=db.rows.marketing_artifacts.find(r=>r.payload.workflow==='intelligence-failure/v1');assert.equal(failure.payload.approvalId,approved.DATAFORSEO_APPROVAL_ID);assert.equal(failure.payload.reservedMaximumUsd,.09);assert.equal(failure.payload.diagnostic.httpStatus,401);
 });
});
test('owner-only failure projection exposes only sanitized diagnostics and keeps legacy unknowns unchanged',async()=>{
 const db=memoryDatabase(),q=command(),keyword=dataForSeoKeywordProvider(options(async()=>Response.json({status_code:40100,cost:0,status_message:'fixture-api-password'},{status:401})));
 await capture(()=>executeResearch({db,tenant,actor,command:q,authorize:async()=>{},keyword,enabled:true,now:time}));
 const failed=db.rows.marketing_artifacts.find(r=>r.payload.workflow==='intelligence-failure/v1');failed.payload.diagnostic.authorization='fixture-api-password';failed.payload.diagnostic.body={password:'fixture-api-password'};
 db.rows.marketing_artifacts.push({id:randomUUID(),tenant_id:tenant,kind:'measurement',created_at:'2026-11-17T04:00:00Z',payload:{domain:'opportunity-intelligence',workflow:'intelligence-failure/v1',receipt:null}});
 const owner={db,tenantId:tenant,user:{id:actor}},route=load('src/app/api/admin/marketing/intelligence/route.ts',{...overrides,'./config':config,'../config':config,'@/lib/marketing/auth':{ownerAuth:async()=>db,requireOwner:async()=>owner},'@/lib/marketing/config':config});
 const response=await route.GET(new Request('https://site.invalid/api/admin/marketing/intelligence')),body=await response.json();assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(body.failureHistory[0].diagnostic.httpStatus,401);assert.equal(body.failureHistory[0].diagnostic.requestId,q.requestId);assert.equal(body.failureHistory[1].diagnostic,null);assert.equal(body.failureHistory[1].receipt,null);assert(!JSON.stringify(body).includes('fixture-api-password'));assert(!JSON.stringify(body).includes('authorization'));
});
