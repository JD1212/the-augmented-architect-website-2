import * as phase3Content from '@augmented-architect/content-strategist';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import * as pkg from '@augmented-architect/seo-analyst';
import {loadScoutModule as load} from './helpers/scout-loader.mjs';
import {memoryDatabase} from './helpers/marketing-memory.mjs';
const overrides={'@augmented-architect/content-strategist':phase3Content,'@augmented-architect/seo-analyst':pkg},config=load('src/lib/marketing/config.ts'),tenant=config.marketingTenant,actor='a2eba199-7949-49c9-828e-9d755e2e345b';
const {googleAdsProvider,dataForSeoProvider,researchConnections}=load('src/lib/marketing/intelligence/providers.ts',overrides);
const {executeResearch,intelligenceRecords,savedResearch,parseResearchCommand,linkResearch,intelligenceContext,providerScope}=load('src/lib/marketing/intelligence/service.ts',overrides);
const time=new Date('2026-11-18T04:00:30Z'),provenance={provider:'google_ads',apiVersion:'fixture-v26',collectedAt:time.toISOString(),expiresAt:'2026-11-25T04:00:30Z',requestId:'fixture-request-id',sourceUrls:['https://developers.google.com/google-ads/api/docs/keyword-planning/overview']};
const market=()=>pkg.marketEvidenceSchema.parse({category:'market_intelligence',term:'Salesforce consulting',variants:['Salesforce consultants'],cluster:'salesforce',target:{country:'US',language:'en'},estimatedMonthlySearches:100,monthly:[{year:2026,month:10,estimatedSearches:90}],advertisingCompetition:'HIGH',advertisingCompetitionIndex:80,lowTopOfPageBidMicros:1000000,highTopOfPageBidMicros:2000000,currency:'USD',provenance});
const command=(extra={})=>({requestId:randomUUID(),mode:'ideas',service:'salesforce',seeds:['Salesforce consulting'],target:{country:'US',language:'en'},...extra});
test('unconnected providers are explicit; GA4/Search Console credentials cannot imply Ads access',()=>{
 assert(researchConnections({}).every(c=>c.state==='not_connected'&&!c.ready));
 const env={GOOGLE_MARKETING_PROJECT_NUMBER:'68454656491',GOOGLE_MARKETING_POOL_ID:'marketing-reader',GOOGLE_MARKETING_PROVIDER_ID:'vercel-reader',GOOGLE_MARKETING_SERVICE_ACCOUNT_EMAIL:'marketing-intelligence-reader@the-augmented-architect-web.iam.gserviceaccount.com',GOOGLE_ADS_CUSTOMER_ID:'1234567890',GOOGLE_ADS_ACCESS_LEVEL:'EXPLORER',GOOGLE_ADS_RESEARCH_ENABLED:'true'};
 assert.equal(researchConnections(env)[0].ready,false);env.GOOGLE_ADS_ACCESS_LEVEL='BASIC';env.GOOGLE_ADS_RESEARCH_ENABLED='false';assert.equal(researchConnections(env)[0].state,'awaiting_approval');env.GOOGLE_ADS_RESEARCH_ENABLED='true';assert.equal(researchConnections(env)[0].state,'ready_for_verification');
});
test('keyword adapter pins read-only endpoints and targeting; missing numbers remain unknown and zero is real',async()=>{
 const requests=[],provider=googleAdsProvider({customerId:'1234567890',now:()=>time,transport:async(url,body)=>{requests.push({url,body});return {requestId:'fixture',data:{results:[{text:'Salesforce consulting',closeVariants:['Salesforce consultants'],keywordIdeaMetrics:{avgMonthlySearches:'0',competition:'LOW',competitionIndex:'0',monthlySearchVolumes:[{year:'2026',month:'OCTOBER',monthlySearches:'0'}]}},{text:'Missing values'}]}};}});
 const response=await provider.research(command(),new AbortController().signal),[zero,unknown]=response.records;assert.equal(zero.estimatedMonthlySearches,0);assert.equal(zero.advertisingCompetitionIndex,0);assert.equal(zero.monthly[0].estimatedSearches,0);assert.equal(unknown.estimatedMonthlySearches,null);assert.equal(unknown.currency,null);assert.equal(unknown.averageCpcMicros,null);assert.equal(zero.searchIntent,'unknown');assert.equal(response.provenance.requestId,'fixture');
 assert.match(requests[0].url,/v26\/customers\/1234567890:generateKeywordIdeas$/);assert.equal(requests[0].body.pageSize,50);assert.deepEqual(requests[0].body.geoTargetConstants,['geoTargetConstants/2840']);assert.equal(requests[0].body.keywordPlanNetwork,'GOOGLE_SEARCH');
 await provider.research(command({mode:'historical'}),new AbortController().signal);assert.match(requests[1].url,/:generateKeywordHistoricalMetrics$/);assert(!('keywordSeed' in requests[1].body));
});
test('SERP adapter records actual observed organic positions, not global ranks or invented page characteristics',async()=>{
 let calls=0,body;const provider=dataForSeoProvider({login:'fixture-login',password:'fixture-password',now:()=>time,fetcher:async(url,options)=>{calls++;body=JSON.parse(options.body);assert.equal(url,'https://api.dataforseo.com/v3/serp/google/organic/live/advanced');return Response.json({status_code:20000,tasks:[{status_code:20000,id:'fixture-task',cost:.002,result:[{datetime:'2026-11-18 03:59:00 +00:00',items:[{type:'organic',url:'https://example.com/guide',title:'Fixture page',description:'Fixture snippet',rank_group:1,rank_absolute:3}]}]}]});}});
 const observation=await provider.research('Salesforce consulting',{country:'US',language:'en'},new AbortController().signal);assert.equal(calls,1);assert.equal(body[0].depth,10);assert.equal(body[0].max_crawl_pages,1);assert.equal(observation.results[0].observedOrganicPosition,1);assert.equal(observation.results[0].contentType,null);assert(!('traffic' in observation.results[0]));assert.equal(observation.provenance.reportedCostUsd,.002);assert.equal(observation.observedAt,'2026-11-18T03:59:00.000Z');
 await assert.rejects(provider.research('site:example.com Salesforce',{country:'US',language:'en'},new AbortController().signal),e=>e.status===400);assert.equal(calls,1);
});
test('research validation rejects arbitrary accounts, targets, PII and provider cost multipliers',()=>{
 assert.doesNotThrow(()=>parseResearchCommand(command()));
 for(const extra of [{customerId:'another-account'},{enabled:true},{seeds:['person@example.com']},{seeds:['site:example.com']},{target:{country:'GB',language:'en'}},{requestId:'a'.repeat(36)},{mode:'competition',seeds:['one','two']}])assert.throws(()=>parseResearchCommand(command(extra)),e=>e.status===400);
});
test('disabled research makes zero provider calls and creates no misleading success or failed execution records',async()=>{
 const db=memoryDatabase();let calls=0;await assert.rejects(executeResearch({db,tenant,actor,command:command(),authorize:async()=>{},keyword:{id:'fixture',research:async()=>{calls++;return {records:[market()],provenance};}},now:time}),e=>e.status===503);assert.equal(calls,0);assert.equal(db.rows.marketing_artifacts.length,0);assert.equal(db.rows.marketing_executions.length,0);
});
test('provider request is persisted once; retries and cached queries never spend twice',async()=>{
 const db=memoryDatabase();let calls=0;const c=command(),run=q=>executeResearch({db,tenant,actor,command:q,authorize:async()=>{},keyword:{id:'fixture',research:async()=>{calls++;return {records:[market()],provenance};}},enabled:true,now:time});
 const first=await run(c);assert.equal(first.reused,false);assert.equal(calls,1);assert.equal((await run(c)).reused,true);assert.equal((await run(command({seeds:['salesforce consulting']}))).reused,true);assert.equal(calls,1);assert.equal(savedResearch(await intelligenceRecords(db,tenant)).length,1);
 await assert.rejects(run({...c,seeds:['Different query']}),e=>e.status===409);assert.equal(calls,1);assert.equal(db.rows.marketing_executions.length,0);
});
test('concurrent requests compete for one append-only budget revision and cooldown blocks the next request',async()=>{
 const db=memoryDatabase();let calls=0;const run=q=>executeResearch({db,tenant,actor,command:q,authorize:async()=>{},keyword:{id:'fixture',research:async()=>{calls++;return {records:[market()],provenance};}},enabled:true,now:time});
 const outcomes=await Promise.allSettled([run(command()),run(command({seeds:['Different seed']}))]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(calls,1);await assert.rejects(run(command({seeds:['Third seed']})),e=>e.status===429);assert.equal(calls,1);
});
test('genuine empty provider results remain traceable and cacheable; failures are not replayed',async()=>{
 const db=memoryDatabase();let calls=0;const c=command(),run=q=>executeResearch({db,tenant,actor,command:q,authorize:async()=>{},keyword:{id:'fixture',research:async()=>{calls++;return {records:[],provenance};}},enabled:true,now:time});
 const first=await run(c);assert.equal(first.research.bundle.market.length,0);assert.equal(first.research.bundle.collections.length,1);assert.equal((await run(command())).reused,true);assert.equal(calls,1);
 const failed=memoryDatabase(),failure=command();const broken=q=>executeResearch({db:failed,tenant,actor,command:q,authorize:async()=>{},keyword:{id:'fixture',research:async()=>{calls++;throw Error('Fixture provider failure');}},enabled:true,now:time});await assert.rejects(broken(failure));const before=calls;await assert.rejects(broken(failure),e=>e.status===409);assert.equal(calls,before);assert.equal(savedResearch(await intelligenceRecords(failed,tenant)).length,0);assert.equal(failed.rows.marketing_artifacts.filter(r=>r.payload.workflow==='intelligence-failure/v1').length,1);
});
test('linking real saved evidence is tenant-scoped and idempotent; bounded analyst context discloses missing data',async()=>{
 const db=memoryDatabase();const first=await executeResearch({db,tenant,actor,command:command(),authorize:async()=>{},keyword:{id:'fixture',research:async()=>({records:[market()],provenance})},enabled:true,now:time});
 const rows=await intelligenceRecords(db,tenant);assert.equal(rows.length,3);await assert.rejects(linkResearch(db,tenant,actor,first.research.id,randomUUID(),market().term),e=>e.status===404);await assert.rejects(intelligenceRecords(db,'wrong-tenant'),e=>e.status===403);
 const context=intelligenceContext(rows);if(context){assert(Buffer.byteLength(JSON.stringify(context))<=9000);assert.equal(context.market[0].estimatedMonthlySearches,100);assert(context.limitations.length);}
});
test('private intelligence API protects all reads and mutations before provider, key or database access',async()=>{
 let touched=0;const route=load('src/app/api/admin/marketing/intelligence/route.ts',{...overrides,'./config':config,'../config':config,'@/lib/marketing/auth':{ownerAuth:async()=>({}),requireOwner:async()=>{throw new config.MarketingError(401,'Please sign in.');}},'@/lib/marketing/config':config,'@/lib/marketing/seo/config':{seoDatabase:()=>{touched++;throw Error();}}});
 const request=new Request('https://site.invalid/api/admin/marketing/intelligence',{method:'POST',headers:{origin:'https://site.invalid','content-type':'application/json'},body:JSON.stringify({operation:'research',...command()})});assert.equal((await route.POST(request)).status,401);assert.equal((await route.GET(new Request('https://site.invalid/api/admin/marketing/intelligence'))).status,401);assert.equal(touched,0);
});
test('daily request budget is durable and cached data cannot cross a changed provider account scope',async()=>{
 const guards=Array.from({length:10},(_,i)=>({id:randomUUID(),tenant_id:tenant,kind:'measurement',created_at:new Date(time.getTime()-3600000-i*60000).toISOString(),payload:{domain:'opportunity-intelligence',workflow:'intelligence-budget/v1'}}));
 const limited=memoryDatabase({marketing_artifacts:guards});let calls=0;const keyword={id:'fixture',research:async()=>{calls++;return {records:[market()],provenance};}};
 await assert.rejects(executeResearch({db:limited,tenant,actor,command:command(),authorize:async()=>{},keyword,enabled:true,now:time}),e=>e.status===429);assert.equal(calls,0);
 const old=process.env.GOOGLE_ADS_CUSTOMER_ID;try{
  process.env.GOOGLE_ADS_CUSTOMER_ID='1234567890';const db=memoryDatabase();const first=await executeResearch({db,tenant,actor,command:command(),authorize:async()=>{},keyword,enabled:true,now:time});assert.equal(calls,1);
  process.env.GOOGLE_ADS_CUSTOMER_ID='9876543210';assert.notEqual(first.research.scope,providerScope(tenant,first.research.query));await assert.rejects(executeResearch({db,tenant,actor,command:command(),authorize:async()=>{},keyword,enabled:true,now:time}),e=>e.status===429);assert.equal(calls,1);assert(!JSON.stringify(first.research).includes('1234567890'));
 }finally{if(old===undefined)delete process.env.GOOGLE_ADS_CUSTOMER_ID;else process.env.GOOGLE_ADS_CUSTOMER_ID=old;}
});

test('link persists once without changing review status and scoring exposes only actual supported demand',async()=>{
 const executionId=randomUUID(),opportunityId=randomUUID(),evidenceId=randomUUID();
 const finding={change:'new',existingOpportunityId:null,priority:1,title:'Salesforce automation assessment',targetCustomer:'Salesforce administrators',searchIntent:'Commercial investigation',supportingEvidence:'Fixture evidence only.',recommendedAction:'Review an assessment opportunity.',businessRelevance:'Salesforce consulting.',confidence:'low',limitations:['No measured search data.'],basis:'external_research',requiresOwnerReview:true,evidenceIds:['fixture'],sourceUrls:['https://architect.salesforce.com/'],evidenceArtifactId:evidenceId};
 const db=memoryDatabase({marketing_executions:[{id:executionId,agent_id:randomUUID(),tenant_id:tenant,state:'completed'}],marketing_artifacts:[{id:opportunityId,tenant_id:tenant,execution_id:executionId,kind:'opportunity',created_at:time.toISOString(),payload:finding}]});
 const first=await executeResearch({db,tenant,actor,command:command(),authorize:async()=>{},keyword:{id:'fixture',research:async()=>({records:[market()],provenance})},enabled:true,now:time});
 assert.equal((await linkResearch(db,tenant,actor,first.research.id,opportunityId,market().term)).reused,false);assert.equal((await linkResearch(db,tenant,actor,first.research.id,opportunityId,market().term)).reused,true);
 const {opportunityIntelligence}=load('src/lib/marketing/intelligence/scoring.ts',overrides),rows=await intelligenceRecords(db,tenant),result=opportunityIntelligence(opportunityId,rows,time);
 assert.equal(result.links.length,1);assert.equal(result.score.status,'insufficient_evidence');assert.equal(result.score.score,null);assert.equal(result.score.evidenceCoverage,20);assert.equal(result.score.factors.find(f=>f.name==='commercialIntent').value,null);assert.equal(db.rows.marketing_artifacts.filter(r=>r.kind==='approval').length,0);
});
