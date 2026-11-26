import * as phase3Content from '@augmented-architect/content-strategist';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as pkg from '@augmented-architect/seo-analyst';
import {loadScoutModule as load} from './helpers/scout-loader.mjs';
const config=load('src/lib/marketing/config.ts');
const overrides={'@augmented-architect/content-strategist':phase3Content,'@augmented-architect/seo-analyst':pkg,'../config':config,'@/lib/marketing/config':config};
const policy=load('src/lib/marketing/seo/planning-policy.ts',overrides);
test('planning is strictly opt-in; missing, false and malformed flags remain off in every environment',()=>{
 for(const VERCEL_ENV of ['production','preview','development'])for(const value of [undefined,'false','TRUE','1',' true '])assert.equal(policy.planningExecutionEnabled({VERCEL_ENV,SEO_RESEARCH_PLANNING_ENABLED:value}),false);
 assert.equal(policy.planningExecutionEnabled({SEO_RESEARCH_PLANNING_ENABLED:'true'}),true);
});
test('disabled planning blocks direct service calls before credentials, registration, database or model access',async()=>{
 let effects=0;const host=load('src/lib/marketing/seo/planning-service.ts',{...overrides,'./planning-policy':{requirePlanningExecution:()=>{throw new config.MarketingError(503,'Disabled');}},'./config':{seoConfiguration:()=>effects++,seoDatabase:()=>effects++},'./store':{createSeoStore:()=>effects++}});
 await assert.rejects(host.prepareSeoResearchPlan({},'id','Objective',28,new AbortController().signal),e=>e.status===503);assert.equal(effects,0);
});
test('API authenticates before disabled execution, rejects bypasses, and keeps saved plans readable without execution credentials',async()=>{
 let calls=0;const fakePolicy={planningReadiness:()=>({enabled:false}),planningExecutionEnabled:()=>false,requirePlanningExecution:()=>{throw new config.MarketingError(503,'New research planning is disabled');}};
 const owner={tenantId:config.marketingTenant,user:{id:'a2eba199-7949-49c9-828e-9d755e2e345b'},db:{}};
 const api=load('src/app/api/admin/marketing/research-plans/route.ts',{...overrides,'@/lib/marketing/seo/planning-policy':fakePolicy,'@/lib/marketing/auth':{ownerAuth:async()=>({}),requireOwner:async()=>owner},'@/lib/marketing/seo/config':{seoDatabase:()=>{throw Error('No credentials needed for read');}},'@/lib/marketing/seo/planning-service':{prepareSeoResearchPlan:async()=>calls++},'@/lib/marketing/intelligence/planning':{planningRecords:async()=>[],savedPlans:()=>[]},'@/lib/marketing/intelligence/service':{intelligenceRecords:async()=>[],selectIntelligence:()=>({records:[]}),savedResearch:()=>[]},'@/lib/marketing/intelligence/providers':{researchConnections:()=>[]}});
 const get=await api.GET(new Request('https://example.com/api/admin/marketing/research-plans'));assert.equal(get.status,200);const state=await get.json();assert.deepEqual(state.plans,[]);assert.equal(state.paidExecutionEnabled,false);assert.equal(state.planningExecutionEnabled,false);assert.equal(state.execution.enabled,false);
 const response=await api.POST(new Request('https://example.com/api/admin/marketing/research-plans',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:JSON.stringify({operation:'prepare',requestId:owner.user.id,objective:'Compare all approved offerings',days:28,planningExecutionEnabled:true})}));assert.equal(response.status,503);assert.equal(calls,0);
});
test('Production-like context works with no DataForSEO/Preview credentials, no purchases and no invented market observations',()=>{
 const context=load('src/lib/marketing/seo/context.ts',overrides),service=load('src/lib/marketing/intelligence/service.ts',overrides);
 const business=context.seoBusinessConfig('fixture',28,'Compare all offerings');assert.equal(business.offerings.length,3);assert.equal(service.intelligenceContext([]),undefined);
 const providers=load('src/lib/marketing/intelligence/providers.ts',overrides).researchConnections({});assert(providers.every(c=>!c.ready));
 const plan=load('src/lib/marketing/intelligence/planning.ts',{...overrides,'./service':service}).priceResearchPlan({summary:'Review current pages',targetCustomer:'Business owners',steps:[],contentDecision:'improve_existing',rationale:'No market evidence yet',nextAction:'Owner review',limitations:['No purchased evidence']},[],config.marketingTenant);
 assert.equal(plan.maximumCostUsd,0);assert.equal(plan.paidExecutionEnabled,false);
});
