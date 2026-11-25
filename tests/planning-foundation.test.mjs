import * as phase3Content from '@augmented-architect/content-strategist';
// Saved/redacted observations and mocked SDK/API only. No provider requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as pkg from '@augmented-architect/seo-analyst';
import {loadScoutModule as load} from './helpers/scout-loader.mjs';
const config=load('src/lib/marketing/config.ts'),tenant=config.marketingTenant,actor='a2eba199-7949-49c9-828e-9d755e2e345b';
const overrides={'@augmented-architect/content-strategist':phase3Content,'@augmented-architect/seo-analyst':pkg,'./planning-policy':{requirePlanningExecution:()=>{}},'@/lib/marketing/seo/planning-policy':{planningExecutionEnabled:()=>true,requirePlanningExecution:()=>{}},'../config':config,'./config':config};
const service=load('src/lib/marketing/intelligence/service.ts',overrides);
const helper=load('src/lib/marketing/intelligence/planning-evidence.ts',{...overrides,'./service':service});
const context=load('src/lib/marketing/seo/context.ts',overrides);
const asOf=new Date('2026-11-19T01:54:27.113Z');
const fixture=JSON.parse(readFileSync('tests/fixtures/dataforseo-success.redacted.json','utf8'));
const bundle={version:'opportunity-intelligence/v1',id:'11111111-1111-4111-a111-111111111111',collections:[fixture.market[0].provenance],market:fixture.market,competition:[],business:null,limitations:['Estimates, not measured leads.']};
test('actual Nov 19 collection remains fresh before Nov 26 expiry, UTC independent; missing dates stay unknown',()=>{
 const p={...bundle.collections[0],collectedAt:'2026-11-19T00:20:14.548Z',expiresAt:'2026-11-26T00:20:14.548Z'};
 assert.equal(helper.evidenceFreshness(asOf,[p]).status,'fresh');
 assert.equal(helper.evidenceFreshness(new Date('2026-11-18T19:54:27.113-06:00'),[p]).status,'fresh');
 assert.equal(helper.evidenceFreshness(new Date(p.expiresAt),[p]).status,'expired');
 for(const observations of [[],[{...p,expiresAt:'invalid'}],[{...p,collectedAt:'2026-12-01T00:00:00Z'}]])assert.equal(helper.evidenceFreshness(asOf,observations).status,'unknown');
});
test('compact saved evidence is complete JSON, retains six grouped terms, unknowns and provenance without changing originals',()=>{
 const before=JSON.stringify(bundle),doc=helper.intelligencePlanningEvidence(bundle,asOf),summary=JSON.parse(doc.content);
 assert.equal(summary.keywords.length,6);assert.equal(summary.keywords.filter(k=>k.estimatedMonthlySearches===null).length,3);
 assert.equal(summary.collections[0].reportedCostUsd,.09);assert.equal(summary.collections[0].requestId,bundle.collections[0].requestId);
 assert.equal(summary.freshness.asOf,asOf.toISOString());assert(Buffer.byteLength(doc.content)<=6000);assert.equal(JSON.stringify(bundle),before);
 const many={...bundle,market:Array.from({length:100},(_,i)=>({...bundle.market[0],term:'distinct long keyword '+i}))};
 const bounded=JSON.parse(helper.intelligencePlanningEvidence(many,asOf).content);assert(bounded.omittedGroups>0);assert.equal(bounded.collections[0].requestId,bundle.collections[0].requestId);
});
test('bounded details reject another tenant and unknown source, preserve missing values and return no more than requested',()=>{
 const q={evidenceId:bundle.id,section:'keywords',term:'',limit:2};
 const data=JSON.parse(helper.savedEvidenceDetails([],tenant,bundle,q));assert.equal(data.observations.length,2);assert(data.omittedObservations>0);
 assert.throws(()=>helper.savedEvidenceDetails([],'another-tenant',bundle,q),e=>e.status===403);
 assert.throws(()=>helper.savedEvidenceDetails([],tenant,bundle,{...q,evidenceId:'unknown'}),e=>e.status===404);
 assert.throws(()=>helper.savedEvidenceDetails([],tenant,bundle,{...q,limit:11}),e=>e.status===400);
 assert(Buffer.byteLength(helper.savedEvidenceDetails([],tenant,bundle,{...q,section:'history',limit:10}))<=6000);
});
test('authorized business context covers all three offerings with scope and audiences, without changing the owner objective',()=>{
 const objective='  Compare our services and ChatGPT/Gemini visibility.  ',business=context.seoBusinessConfig('fixture',28,objective);
 assert.equal(business.business.objective,objective);assert.equal(business.offerings.length,3);assert(business.offerings.every(o=>o.audiences.length));
 const facts=JSON.parse(context.approvedWebsiteEvidence().content);assert.equal(facts.offerings.length,3);assert(JSON.stringify(facts.customApplications).includes('10,000'));
 const approved=load('src/lib/marketing/intelligence/context.ts',{...overrides,'../seo/context':context});
 for(const id of ['salesforce','ai-solutions','custom-applications'])assert(approved.approvedBusinessEvidence(id,asOf).targetCustomers.length);
});
test('API passes and persists the exact entered objective including whitespace and AI visibility wording',async()=>{
 let received=null;const objective='  Compare all offerings, including ChatGPT and Gemini visibility.\nUse existing evidence only.  ';
 const api=load('src/app/api/admin/marketing/research-plans/route.ts',{...overrides,'@/lib/marketing/auth':{ownerAuth:async()=>({}),requireOwner:async()=>({tenantId:tenant,user:{id:actor},db:{}})},'@/lib/marketing/seo/planning-service':{prepareSeoResearchPlan:async(_owner,_id,value)=>{received=value;return {executionId:actor};}}});
 const response=await api.POST(new Request('https://example.com/api/admin/marketing/research-plans',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:JSON.stringify({operation:'prepare',requestId:actor,objective,days:28})}));
 assert.equal(response.status,200);assert.equal(received,objective);
});
test('generic application regression testing is not classified or merged as Salesforce testing',()=>{
 const identity=load('src/lib/marketing/opportunities/identity.ts',overrides),base={title:'Regression testing for a customer portal',searchIntent:'Business application testing',targetCustomer:'Business owners'};
 assert.equal(identity.topicCluster(tenant,base).label,'Connected applications');
 assert(!identity.semanticIdentity(base).startsWith('bulk-regression'));
 const sf={...base,title:'Salesforce Apex bulk regression testing'};assert.equal(identity.topicCluster(tenant,sf).label,'Salesforce testing & safety');assert(identity.semanticIdentity(sf).startsWith('bulk-regression'));
});
