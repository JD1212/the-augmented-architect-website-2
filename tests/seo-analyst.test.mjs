import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as agentPackage from '@augmented-architect/seo-analyst';
import {loadScoutModule as load} from './helpers/scout-loader.mjs';
const config=load('src/lib/marketing/config.ts'),tenant=config.marketingTenant,ownerId='a2eba199-7949-49c9-828e-9d755e2e345b';
const packageOverride={'@augmented-architect/seo-analyst':agentPackage};
const seoConfig={seoRegistration:{name:'SEO Analyst',version:agentPackage.packageVersion,enabled:true},seoPolicy:{minimumIntervalMs:600000,maximumDailyRuns:6,leaseMs:300000},seoConfiguration:()=>({tenantId:tenant,ga4Property:'564904776',searchProperty:'sc-domain:theaugmentedarchitect.com',model:'fixture'})};
const store=load('src/lib/marketing/seo/store.ts',{...packageOverride,'../config':config,'./config':seoConfig});
test('SEO package is external, pinned and provenance-bearing; no Next or business IDs in reusable source',()=>{
 const p=JSON.parse(readFileSync('package.json','utf8'));assert.equal(p.dependencies['@augmented-architect/seo-analyst'],'file:vendor/augmented-architect-seo-analyst-0.1.3.tgz');
 assert(!agentPackage.seoInstructions.includes('564904776'));assert(!agentPackage.seoInstructions.includes(tenant));assert.equal(agentPackage.packageVersion,'0.1.3');
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
 assert.equal((await api.POST(request({requestId:ownerId,days:28}))).status,200);assert.equal(calls,1);
 const denied=load('src/app/api/admin/marketing/seo/route.ts',{'./config':config,'@/lib/marketing/config':config,'@/lib/marketing/auth':{ownerAuth:async()=>({}),requireOwner:async()=>{throw new config.MarketingError(401,'Please sign in.');}},'@/lib/marketing/seo/store':{},'@/lib/marketing/seo/service':{executeSeo:async()=>{calls++;}}});
 assert.equal((await denied.POST(request({requestId:ownerId,days:28}))).status,401);assert.equal((await denied.GET(new Request('https://site.invalid/api/admin/marketing/seo'))).status,401);assert.equal(calls,1);
});

function leaseDatabase(){
 const rows={marketing_agents:[{id:'11111111-1111-4111-a111-111111111111',tenant_id:tenant,name:'SEO Analyst',version:agentPackage.packageVersion,enabled:true,config:{recentStarts:[]}}],marketing_executions:[]};
 return {rows,from(table){let action='select',payload,filters=[];const q={select(){return q;},eq(key,value){filters.push([key,value]);return q;},update(value){action='update';payload=value;return q;},insert(value){action='insert';payload=value;return q;},async maybeSingle(){const r=await execute();return {...r,data:r.data[0]??null};},then(resolve,reject){return execute().then(resolve,reject);}};
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
