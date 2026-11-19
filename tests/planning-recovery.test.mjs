// Regression: real saved PostgreSQL timestamp shape, mocked SDK transport only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import OpenAI from 'openai';
import {OpenAIProvider} from '@openai/agents';
import * as pkg from '@augmented-architect/seo-analyst';
import {loadScoutModule as load} from './helpers/scout-loader.mjs';
import {memoryDatabase} from './helpers/marketing-memory.mjs';
const overrides={'@augmented-architect/seo-analyst':pkg},config=load('src/lib/marketing/config.ts'),tenant=config.marketingTenant,actor='a2eba199-7949-49c9-828e-9d755e2e345b';
const intelligence=load('src/lib/marketing/intelligence/service.ts',overrides),planning=load('src/lib/marketing/intelligence/planning.ts',{...overrides,'./service':intelligence});
const market=JSON.parse(fs.readFileSync('tests/fixtures/dataforseo-success.redacted.json','utf8')).market;
const query={requestId:actor,provider:'dataforseo',mode:'ideas',service:'salesforce',seeds:['Salesforce org cleanup'],target:{country:'US',language:'en'},locationCode:2840};
const row={id:'11111111-1111-4111-a111-111111111111',created_at:'2026-11-19T00:20:14.756634+00:00',payload:{workflow:'intelligence-research/v1',state:'completed',query,scope:intelligence.providerScope(tenant,query),bundle:{version:'opportunity-intelligence/v1',id:'11111111-1111-4111-a111-111111111111',collections:[market[0].provenance],market,competition:[],business:null,limitations:['Provider estimates only.']}}};
const doc=(id,kind)=>({id,kind,title:id,content:'Deterministic fixture.',retrievedAt:'2026-11-19T00:20:14.756Z',status:'empty',hasActualSearchData:false,sources:[]});
const business={model:'fixture-only',reportingDays:28,business:{name:'Example business',website:'https://example.com',objective:'Research qualified consulting opportunities without purchases.',targetCustomers:['Business owners']}};
const memory={investigations:[],decisions:[],feedback:[]};
test('actual failure shape rejects raw PostgreSQL offset before model access, without weakening the evidence schema',async()=>{
 const normalized=planning.savedPlanningEvidence([row]),raw={...normalized[0],retrievedAt:row.created_at};let calls=0;
 await assert.rejects(pkg.runSeoResearchPlan(business,{googleAnalytics:async()=>doc('ga4','ga4'),searchConsole:async()=>doc('search','search_console'),websiteResearch:async()=>doc('website','website'),savedResearch:async()=>({evidence:[raw],memory})},{modelProvider:{getModel:async()=>{calls++;throw Error('No model permitted');}}}),e=>e.code==='EVIDENCE_SCHEMA_INVALID'&&e.path==='retrievedAt');
 assert.equal(calls,0);assert.equal(pkg.evidenceSchema.shape.retrievedAt.safeParse(row.created_at).success,false);
});
test('adapter normalizes offsets to UTC Z, preserves original records and timestamps, and rejects invalid times',()=>{
 for(const timestamp of [row.created_at,'2026-11-18T18:20:14.756634-06:00','2026-11-19T00:20:14.756Z']){const source={...row,created_at:timestamp},before=JSON.stringify(source),evidence=planning.savedPlanningEvidence([source]);assert.equal(evidence[0].retrievedAt,'2026-11-19T00:20:14.756Z');assert.doesNotThrow(()=>pkg.validateEvidence(evidence[0]));assert.equal(JSON.stringify(source),before);assert.equal(evidence[0].sources[0].url,row.payload.bundle.collections[0].sourceUrls[0]);}
 assert.throws(()=>planning.savedPlanningEvidence([{...row,created_at:'invalid-timestamp'}]));
});
test('corrected real saved evidence passes through the actual SDK with a mocked model and persists a plan/evidence/usage',async()=>{
 let calls=0;const plan={summary:'Investigate gaps using saved evidence.',targetCustomer:'Business owners',steps:[{service:'salesforce',mode:'competition',seeds:['Salesforce org cleanup'],reason:'Competitor observations are missing.',evidenceIds:[row.id]}],contentDecision:'gather_evidence',rationale:'Do not create content without competitive support.',nextAction:'Review a bounded competitor request.',limitations:['No observed organic competitors.']};
 const client=new OpenAI({apiKey:'fixture-not-a-real-key',maxRetries:0,fetch:async()=>{calls++;return Response.json({id:'fixture-response',object:'response',created_at:1,status:'completed',model:'fixture-only',usage:{input_tokens:101,output_tokens:42,total_tokens:143},output:[{type:'message',id:'fixture-message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(plan),annotations:[]}]}]});}});
 const sourceBefore=JSON.stringify(row),result=await pkg.runSeoResearchPlan(business,{googleAnalytics:async()=>doc('ga4','ga4'),searchConsole:async()=>doc('search','search_console'),websiteResearch:async()=>doc('website','website'),savedResearch:async()=>({evidence:planning.savedPlanningEvidence([row]),memory})},{modelProvider:new OpenAIProvider({openAIClient:client,useResponses:true})});
 const db=memoryDatabase(),priced=planning.priceResearchPlan(result.plan,[row],tenant),id=await planning.saveResearchPlan(db,tenant,actor,actor,business.business.objective,priced,result.evidence,result.usage);
 assert.equal(calls,1);assert.equal(db.rows.marketing_artifacts[0].id,id);assert.equal(db.rows.marketing_artifacts[0].payload.documents.find(d=>d.id===row.id).retrievedAt,'2026-11-19T00:20:14.756Z');assert.equal(db.rows.marketing_artifacts[0].payload.usage[0].totalTokens,143);assert.equal(result.usage[0].measuredCost,null);assert.equal(priced.paidExecutionEnabled,false);assert.equal(JSON.stringify(row),sourceBefore);
});
const diagnostic=load('src/lib/marketing/seo/planning-service.ts',overrides).planningFailureDiagnostic;
test('sanitized diagnostics retain phase, exact rule/path or provider status without private error content',()=>{
 const validation=diagnostic(new pkg.SeoValidationError('EVIDENCE_SCHEMA_INVALID','private-value','retrievedAt'),'evidence');assert.equal(validation.code,'EVIDENCE_SCHEMA_INVALID');assert.equal(validation.param,'retrievedAt');assert.equal(validation.phase,'evidence');
 const provider=diagnostic(Object.assign(new Error('sk-fixture-private-value'),{name:'BadRequestError',status:400,code:'invalid_json_schema',param:'text.format.schema',headers:{authorization:'private-header'},body:'private-body'}),'model');assert.equal(provider.status,400);assert.equal(provider.code,'invalid_json_schema');assert.equal(provider.param,'text.format.schema');assert(!JSON.stringify(provider).includes('private'));
 const unsafe=diagnostic({name:'private-name',code:'private-code',param:'private-param',body:'private-body'},'persistence');assert.equal(unsafe.kind,'PlanningError');assert.equal(unsafe.code,null);assert.equal(unsafe.param,null);assert(!JSON.stringify(unsafe).includes('private'));
 const schema=diagnostic({name:'ZodError',issues:[{path:['steps',0,'seeds'],message:'private-value'}]},'validation');assert.equal(schema.code,'SCHEMA_VALIDATION_FAILED');assert.equal(schema.param,'steps.0.seeds');assert(!JSON.stringify(schema).includes('private'));
});
test('host persists redacted evidence/model/output failures and available token receipts, releases lease and never retries',async()=>{
 for(const scenario of ['evidence','model','output','persistence']){
  const name='SEO Analyst [preview:fixture]',db=memoryDatabase({marketing_agents:[{id:actor,tenant_id:tenant,name,version:'0.4.0',enabled:true,config:{recentStarts:[]}}]}),receipt={purpose:'analysis',model:'fixture',responseId:'fixture-response',inputTokens:101,outputTokens:42,totalTokens:143,webSearchCalls:0,measuredCost:null};let calls=0;
  const seoConfig={seoRegistration:{name,version:'0.4.0'},seoPolicy:{minimumIntervalMs:600000,maximumDailyRuns:6,leaseMs:300000},seoConfiguration:()=>({apiKey:'fixture-not-a-real-key',model:'fixture',limits:pkg.limits}),seoDatabase:()=>db};
  const owner={tenantId:tenant,user:{id:actor},db:{}},store=load('src/lib/marketing/seo/store.ts',{...overrides,'./config':seoConfig});
  const host=load('src/lib/marketing/seo/planning-service.ts',{
   ...overrides,'@augmented-architect/seo-analyst':{...pkg,runSeoResearchPlan:async(_config,_ports,execution)=>{calls++;if(scenario!=='evidence')await execution.onProgress({stage:'model'});if(['output','persistence'].includes(scenario))await execution.onUsage(receipt);if(scenario==='persistence')return {plan:{},evidence:[],usage:[receipt],packageVersion:'0.4.0'};if(scenario==='model')throw Object.assign(new Error('private-provider-body'),{name:'BadRequestError',status:400,code:'invalid_json_schema',param:'text.format.schema'});throw new pkg.SeoValidationError(scenario==='evidence'?'EVIDENCE_SCHEMA_INVALID':'OUTPUT_SCHEMA_INVALID','private-validation-content',scenario==='evidence'?'retrievedAt':'steps.0.evidenceIds');}},
   '../auth':{requireOwner:async()=>owner},'../config':config,'./config':seoConfig,'./store':{createSeoStore:()=>{const instance=store.createSeoStore(db,tenant);return {...instance,failed:async(...args)=>{assert.equal(logged.length,1,'Sanitized logging precedes database failure persistence');return instance.failed(...args);}};}},'./context':{seoBusinessConfig:()=>business},'./tools':{createSeoTools:()=>({ports:{}})},'../opportunities/repository':{loadBacklog:async()=>({opportunities:[],evidence:{}})},'../opportunities/model':{historicalContext:()=>undefined},'../intelligence/service':{intelligenceRecords:async()=>[],intelligenceContext:()=>undefined},'../intelligence/planning':{planningRecords:async()=>[],planningMemory:()=>memory,priceResearchPlan:p=>p,saveResearchPlan:async()=>{throw Error('private-persistence-body');}},
  });
  const logged=[],original=console.error;console.error=(...args)=>logged.push(args);
  try{await assert.rejects(host.prepareSeoResearchPlan(owner,actor,business.business.objective,28,new AbortController().signal),e=>e.status===503);}finally{console.error=original;}
  const run=db.rows.marketing_executions[0];assert.equal(run.state,'failed');assert.equal(run.diagnostics.failure.phase,scenario==='output'?'validation':scenario);assert.equal(run.diagnostics.failure.param,scenario==='evidence'?'retrievedAt':scenario==='model'?'text.format.schema':scenario==='persistence'?null:'steps.0.evidenceIds');
  assert.equal(run.usage.totalTokens,['output','persistence'].includes(scenario)?143:null);assert.equal(run.usage.measuredCost,null);assert.equal(db.rows.marketing_agents[0].config.lease,undefined);assert.equal(db.rows.marketing_artifacts.length,0);assert.equal(logged[0][1].executionId,actor);assert.equal(logged[0][1].usage.totalTokens,run.usage.totalTokens);assert(!JSON.stringify([run,logged]).includes('private-'));
  assert.equal((await host.prepareSeoResearchPlan(owner,actor,business.business.objective,28,new AbortController().signal)).reused,true);assert.equal(calls,1);
 }
});
