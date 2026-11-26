import * as phase3Content from '@augmented-architect/content-strategist';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as agentPackage from '@augmented-architect/seo-analyst';
import {loadScoutModule as load} from './helpers/scout-loader.mjs';
const config=load('src/lib/marketing/config.ts'),tenant=config.marketingTenant,ownerId='a2eba199-7949-49c9-828e-9d755e2e345b';
const packageOverride={'@augmented-architect/content-strategist':phase3Content,'@augmented-architect/seo-analyst':agentPackage};
const seoConfig={seoRegistration:{name:'SEO Analyst',version:agentPackage.packageVersion,enabled:true},seoPolicy:{minimumIntervalMs:600000,maximumDailyRuns:6,leaseMs:300000},seoConfiguration:()=>({tenantId:tenant,ga4Property:'564904776',searchProperty:'sc-domain:theaugmentedarchitect.com',model:'fixture'})};
const store=load('src/lib/marketing/seo/store.ts',{...packageOverride,'../config':config,'./config':seoConfig});
test('SEO package is external, pinned and provenance-bearing; no Next or business IDs in reusable source',()=>{
 const p=JSON.parse(readFileSync('package.json','utf8'));assert.equal(p.dependencies['@augmented-architect/seo-analyst'],'file:vendor/augmented-architect-seo-analyst-0.5.1.tgz');
 assert(!agentPackage.seoInstructions.includes('564904776'));assert(!agentPackage.seoInstructions.includes(tenant));assert.equal(agentPackage.packageVersion,'0.5.1');
 const provenance=JSON.parse(readFileSync('vendor/seo-analyst.provenance.json','utf8')),lock=JSON.parse(readFileSync('package-lock.json','utf8')).packages['node_modules/@augmented-architect/seo-analyst'];
 const integrity='sha512-'+createHash('sha512').update(readFileSync('vendor/'+provenance.artifact)).digest('base64');
 assert.match(provenance.sourceCommit,/^[a-f0-9]{40}$/);assert.equal(provenance.version,agentPackage.packageVersion);assert.equal(lock.version,provenance.version);assert.equal(integrity,provenance.integrity);assert.equal(integrity,lock.integrity);
});
test('execution scope rejects another tenant before any Google or database action',()=>{assert.throws(()=>store.assertExecutionScope('another-tenant'));assert.doesNotThrow(()=>store.assertExecutionScope(tenant));});
test('distributed lease policy bounds concurrency, cooldown and daily requests',()=>{
 const now=new Date('2026-11-17T18:00:00Z');
 assert.throws(()=>store.leaseDecision({lease:{id:'old',expiresAt:'2026-11-17T18:01:00Z'}},'new',now),e=>e.status===409);
 assert.throws(()=>store.leaseDecision({recentStarts:['2026-11-17T17:55:00Z']},'new',now),e=>e.status===429);
 assert.throws(()=>store.leaseDecision({recentStarts:Array.from({length:6},(_,i)=>`2026-11-17T0${i}:00:00Z`)},'new',now),e=>e.status===429);
 const next=store.leaseDecision({recentStarts:['2026-11-15T00:00:00Z']},'new',now);assert.equal(next.recentStarts.length,1);assert.equal(next.lease.id,'new');
});
test('agent reporting windows exclude incomplete days in both source timezones',()=>{
 const {completeAgentRange}=load('src/lib/marketing/seo/tools.ts',{...packageOverride,'./config':seoConfig});
 const range=completeAgentRange(7,new Date('2026-11-18T01:00:00Z'));assert.deepEqual(range,{days:7,start:'2026-11-10',end:'2026-11-16'});
});
test('read-only reporting ports pin tenant/property/window and preserve genuine empty results',async()=>{
 const calls=[],data={overview:{columns:['Clicks'],rows:[]},daily:{columns:['Clicks'],rows:[]},pages:{columns:['Clicks'],rows:[]},notes:['No rows.']};
 const {createSeoTools}=load('src/lib/marketing/seo/tools.ts',{...packageOverride,'./config':seoConfig});
 const {ports,snapshots}=createSeoTools({tenantId:tenant,days:28,client:{},authorize:async()=>{calls.push('authorized');},onResearchUsage:async()=>{},reporters:{ga4Report:async(property)=>{calls.push(property);return data;},searchConsoleReport:async()=>data}});
 const signal=new AbortController().signal,g=await ports.googleAnalytics(28,signal),s=await ports.searchConsole(28,signal);
 assert.equal(g.status,'empty');assert.equal(s.hasActualSearchData,false);assert.equal(snapshots.length,2);assert(calls.includes('564904776'));
 await assert.rejects(ports.googleAnalytics(90,signal));assert.throws(()=>createSeoTools({tenantId:'other',days:28,client:{},authorize:async()=>{},onResearchUsage:async()=>{}}));
});
test('unknown provider billing is never inferred from token counts',()=>{
 const {usageSummary}=load('src/lib/marketing/seo/contracts.ts');assert.equal(usageSummary([]).totalTokens,null);
 const u=usageSummary([{inputTokens:10,outputTokens:20,totalTokens:30,measuredCost:null}]);assert.equal(u.totalTokens,30);assert.equal(u.measuredCost,null);
 assert.equal(usageSummary([{inputTokens:null,outputTokens:null,totalTokens:null}]).totalTokens,null);
});
test('SEO API checks owner first and refuses client tenant, property, model or arbitrary query selection',async()=>{
 let calls=0;const api=load('src/app/api/admin/marketing/seo/route.ts',{'../config':config,'./config':config,'@/lib/marketing/config':config,'@/lib/marketing/auth':{ownerAuth:async()=>({}),requireOwner:async()=>({tenantId:tenant,user:{id:ownerId},db:{}})},'@/lib/marketing/seo/store':{readSeoPanel:async()=>({})},'@/lib/marketing/seo/service':{executeSeo:async()=>{calls++;return {};}}});
 const request=body=>new Request('https://site.invalid/api/admin/marketing/seo',{method:'POST',headers:{origin:'https://site.invalid','content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await api.POST(request({requestId:ownerId,days:28,tenantId:'other'}))).status,400);
 assert.equal((await api.POST(request({requestId:ownerId,days:365}))).status,400);
 assert.equal((await api.POST(request({requestId:ownerId,days:28,planId:ownerId,researchIds:[],executionConfirmed:true}))).status,200);assert.equal(calls,1);
 const denied=load('src/app/api/admin/marketing/seo/route.ts',{'./config':config,'@/lib/marketing/config':config,'@/lib/marketing/auth':{ownerAuth:async()=>({}),requireOwner:async()=>{throw new config.MarketingError(401,'Please sign in.');}},'@/lib/marketing/seo/store':{},'@/lib/marketing/seo/service':{executeSeo:async()=>{calls++;}}});
 assert.equal((await denied.POST(request({requestId:ownerId,days:28}))).status,401);assert.equal((await denied.GET(new Request('https://site.invalid/api/admin/marketing/seo'))).status,401);assert.equal(calls,1);
});

function leaseDatabase(){
 const rows={marketing_agents:[{id:'11111111-1111-4111-a111-111111111111',tenant_id:tenant,name:'SEO Analyst',version:agentPackage.packageVersion,enabled:true,config:{recentStarts:[]}}],marketing_executions:[]};
 return {rows,from(table){let action='select',payload,filters=[];const q={select(){return q;},order(){return q;},limit(){return q;},eq(key,value){filters.push([key,value]);return q;},update(value){action='update';payload=value;return q;},insert(value){action='insert';payload=value;return q;},async maybeSingle(){const r=await execute();return {...r,data:r.data[0]??null};},then(resolve,reject){return execute().then(resolve,reject);}};
  async function execute(){await Promise.resolve();const found=rows[table].filter(row=>filters.every(([k,v])=>k==='config'?JSON.stringify(row[k])===JSON.stringify(JSON.parse(v)):row[k]===v));if(action==='update'){for(const row of found)Object.assign(row,structuredClone(payload));return {data:structuredClone(found),error:null};}if(action==='insert'){if(rows[table].some(r=>r.id===payload.id))return {data:[],error:{code:'23505'}};rows[table].push(structuredClone(payload));return {data:[payload],error:null};}return {data:structuredClone(found),error:null};}
 return q;}};
}
test('atomic JSONB claim admits one concurrent execution, and a repeated ID cannot spend twice',async()=>{
 const db=leaseDatabase(),a=store.createSeoStore(db,tenant),b=store.createSeoStore(db,tenant),id='22222222-2222-4222-a222-222222222222';
 const results=await Promise.allSettled([a.claim(id,ownerId,28),b.claim('33333333-3333-4333-a333-333333333333',ownerId,28)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(db.rows.marketing_executions.length,1);
 const actual=db.rows.marketing_executions[0].id,reused=await a.claim(actual,ownerId,28);assert.equal(reused.reused,true);assert.equal(db.rows.marketing_executions.length,1);
 const leaseId=db.rows.marketing_agents[0].config.lease.id;await a.release(db.rows.marketing_agents[0].id,'not-the-owner');assert.equal(db.rows.marketing_agents[0].config.lease.id,leaseId);
 await a.release(db.rows.marketing_agents[0].id,actual);assert.equal(db.rows.marketing_agents[0].config.lease,undefined);
});

test('provider schema rejection is not mislabeled as an evidence-validation failure',()=>{
 const {safeExecutionFailure}=load('src/lib/marketing/seo/service.ts',{...packageOverride,'../config':config,'./config':seoConfig});
 const error=Object.assign(new Error("Invalid schema at sourceUrls: uri is not a valid format"),{status:400,code:'invalid_json_schema'});
 assert.match(safeExecutionFailure(error,false),/provider rejected the structured-output schema/);
 assert(!safeExecutionFailure(error,false).includes('evidence validation'));
 assert.match(safeExecutionFailure(new Error('Unsupported source URL'),false),/evidence validation/);
 assert(!safeExecutionFailure(new Error('A source server was unavailable'),false).includes('evidence validation'));
});
test('package upgrades preserve agent identity, execution history, disabled state and rate limits',async()=>{
 const db=leaseDatabase(),agent=db.rows.marketing_agents[0],id=agent.id;
 agent.version='0.1.3';agent.config.recentStarts=[new Date().toISOString()];agent.enabled=false;
 db.rows.marketing_executions.push({id:'prior-failed-run',agent_id:id,tenant_id:tenant,state:'failed'});
 const api=store.createSeoStore(db,tenant),upgraded=await api.register();
 assert.equal(upgraded.id,id);assert.equal(upgraded.version,agentPackage.packageVersion);assert.equal(upgraded.enabled,false);
 assert.equal(db.rows.marketing_agents.length,1);assert.equal(db.rows.marketing_executions.length,1);assert.equal(upgraded.config.recentStarts.length,1);
 await assert.rejects(api.claim(ownerId,ownerId,28),e=>e.status===403);
 agent.enabled=true;await assert.rejects(api.claim(ownerId,ownerId,28),e=>e.status===429);
});

test('host persists precise redacted validation diagnostics and usage, releases lease and never retries',async()=>{
 const db=leaseDatabase(),requestId='44444444-4444-4444-a444-444444444444',receipt={purpose:'analysis',model:'fixture-model',responseId:'resp_fixture',inputTokens:100,outputTokens:20,totalTokens:120,webSearchCalls:0,measuredCost:null};
 const source='https://publisher.example.com/article?token=fixture-private-value#private-fragment';
 const rejected=new agentPackage.SeoValidationError('UNSUPPORTED_SOURCE_URL','Unsupported source URL','opportunities[0].sourceUrls',0);
 rejected.references={evidence:[{id:'external-research',kind:'external_research',status:'connected',hasActualSearchData:false,urls:[source]}],proposed:[{priority:1,evidenceIds:['external-research'],sourceUrls:[source+'&invented'],basis:'external_research'}]};
 let runs=0;
 const {executeSeo}=load('src/lib/marketing/seo/service.ts',{
  ...packageOverride,'@augmented-architect/content-strategist':phase3Content,'@augmented-architect/seo-analyst':{...agentPackage,runSeoAnalysis:async(_config,_ports,host)=>{runs++;await host.onUsage(receipt);await host.onProgress({stage:'validating',modelRequests:1});throw new Error('SDK wrapper',{cause:rejected});}},
  '../config':config,'./config':{...seoConfig,seoDatabase:()=>db,seoConfiguration:()=>({apiKey:'fixture-not-a-real-key',model:'fixture-model',limits:agentPackage.limits})},
  '../intelligence/planning':{planningRecords:async()=>[],savedPlans:()=>[],planningMemory:()=>({investigations:[],decisions:[],feedback:[]})},'../intelligence/service':{intelligenceRecords:async()=>[],selectIntelligence:()=>({context:undefined,records:[],savedCount:0,eligibleCount:0,includedCount:0})},'../opportunities/repository':{marketingRows:async()=>[],loadBacklog:async()=>({opportunities:[],evidence:{}})},'../intelligence/workflow-binding':{bindSelectedEvidence:()=>({selected:{objective:'Fixture approved research',plan:{}},binding:{planId:ownerId,researchIds:[],objective:'Fixture approved research',selectionFingerprint:'a'.repeat(64)}})},'./context':{seoBusinessConfig:()=>({})},'./store':{assertExecutionScope:store.assertExecutionScope,createSeoStore:()=>store.createSeoStore(db,tenant)},
  './tools':{createSeoTools:options=>{options.onResearchMapping({annotatedUrls:[source],discoveredUrls:[source],catalogUrls:[source],omittedUncitedCount:0});return {ports:{},snapshots:[]};}},
 });
 const owner={tenantId:tenant,user:{id:ownerId},db:{}};
 await assert.rejects(executeSeo(owner,requestId,28,new AbortController().signal,{planId:ownerId,researchIds:[]}),e=>e.status===503&&e.message.includes('UNSUPPORTED_SOURCE_URL'));
 const row=db.rows.marketing_executions[0],failure=row.diagnostics.failure;
 assert.equal(row.state,'failed');assert.equal(row.diagnostics.packageVersion,agentPackage.packageVersion);assert.equal(failure.phase,'validating');assert.equal(failure.code,'UNSUPPORTED_SOURCE_URL');assert.equal(failure.param,'opportunities[0].sourceUrls');assert.equal(failure.validation.rule,'UNSUPPORTED_SOURCE_URL');assert.equal(failure.validation.opportunityIndex,0);assert.equal(failure.validation.research.annotated.length,1);assert.equal(row.usage.totalTokens,120);assert.equal(row.usage.measuredCost,null);assert.equal(db.rows.marketing_agents[0].config.lease,undefined);
 const json=JSON.stringify(row);assert(!json.includes('fixture-private-value'));assert(!json.includes('private-fragment'));assert.equal((await executeSeo(owner,requestId,28,new AbortController().signal,{planId:ownerId,researchIds:[]})).reused,true);assert.equal(runs,1);assert.equal(db.rows.marketing_executions.length,1);
});
