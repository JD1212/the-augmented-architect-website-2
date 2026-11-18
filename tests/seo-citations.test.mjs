import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import OpenAI from 'openai';
import {OpenAIProvider} from '@openai/agents';
import * as pkg from '@augmented-architect/seo-analyst';
import {loadScoutModule as load} from './helpers/scout-loader.mjs';
const overrides={'@augmented-architect/seo-analyst':pkg};
const {collectResearchSources}=load('src/lib/marketing/seo/research-evidence.ts',overrides);
const {validationDiagnostic}=load('src/lib/marketing/seo/validation-diagnostics.ts',overrides);
// Reconstructed provider-response shape, NOT the unavailable failed run's URLs/output.
const urls=Array.from({length:20},(_,i)=>`https://publisher.example.com/reference-${i}`),cited=urls[19];
function response(annotations=[cited]){return {id:'resp_fixture',model:'fixture-model',status:'completed',output_text:'A technical problem documented by the cited source: '+cited,usage:{input_tokens:100,output_tokens:50,total_tokens:150},output:[{type:'web_search_call',id:'search_fixture',status:'completed',action:{type:'search',query:'Fixture query',sources:urls.map(url=>({type:'url',url}))}},{type:'message',id:'msg_fixture',role:'assistant',status:'completed',content:[{type:'output_text',text:'Technical context',annotations:annotations.map(url=>({type:'url_citation',url,title:'Cited primary source',start_index:0,end_index:17}))}]}]};}
const evidence=sources=>({id:'external-research',kind:'external_research',title:'Fixture evidence',retrievedAt:'2026-11-17T12:00:00Z',status:'connected',hasActualSearchData:false,content:'Fixture, not production research.',sources});
const candidate={summary:'A research-led hypothesis, not measured search demand.',limitations:['No processed reporting data.'],opportunities:[{priority:1,title:'Focused architecture assessment',targetCustomer:'Administrators maintaining business automation',supportingEvidence:'Primary documentation supports the technical problem, not keyword volume.',evidenceIds:['external-research'],sourceUrls:[cited],searchIntent:'Commercial investigation',recommendedAction:'Draft a focused assessment outline for review.',businessRelevance:'Relevant to the host-authorized service.',confidence:'medium',limitations:['Demand and rankings are not measured.'],basis:'external_research',requiresOwnerReview:true}]};
test('actual redacted failure envelope cannot be assigned a historical validation rule',()=>{
 const f=JSON.parse(readFileSync('tests/fixtures/seo-failed-run.redacted.json','utf8'));assert.equal(f.inputTokens,22506);assert.equal(f.outputTokens,1904);assert.equal(f.phase,'validating');assert.equal(f.validationRuleRecorded,null);assert.equal(f.providerBodiesRetained,false);
 assert.equal(validationDiagnostic(new Error('The result did not pass evidence validation.')),null);
});
test('citation after the first 15 discovered results survives adapter mapping and strict final validation',()=>{
 const r=response(),old=new Map(urls.map(url=>[url,{url,title:'Discovered'}]));old.set(cited,{url:cited,title:'Cited'});
 assert.throws(()=>pkg.validateAnalysis(candidate,[evidence([...old.values()].slice(0,15))]),e=>e.code==='UNSUPPORTED_SOURCE_URL'&&e.path==='opportunities[0].sourceUrls');
 const catalog=collectResearchSources(r);assert.equal(catalog.sources.length,15);assert.equal(catalog.sources[0].url,cited);assert.equal(catalog.mapping.annotatedUrls[0],cited);
 assert.equal(pkg.validateAnalysis(candidate,[evidence(catalog.sources)]).opportunities.length,1);
});
test('excess cited references fail explicitly, never silently discard a citation',()=>{
 assert.throws(()=>collectResearchSources(response(urls.slice(0,16))),e=>e.code==='RESEARCH_CITATION_LIMIT');
 assert.throws(()=>collectResearchSources(response(['http://publisher.example.com/'])),e=>e.code==='UNSAFE_SOURCE_REFERENCE');
});
test('invented URL variants and unrelated sources remain rejected',()=>{
 const catalog=collectResearchSources(response());
 for(const url of ['https://unrelated.example.com/','https://publisher.example.com/reference-19/','https://publisher.example.com/reference-19?invented=1'])assert.throws(()=>pkg.validateAnalysis({...candidate,opportunities:[{...candidate.opportunities[0],sourceUrls:[url]}]},[evidence(catalog.sources)]),e=>e.code==='UNSUPPORTED_SOURCE_URL');
});
test('validation diagnostics retain precise hashes/mapping while redacting query values and fragments',()=>{
 const privateUrl='https://publisher.example.com/page?access_token=private-test-token#secret-fragment';
 const doc=evidence([{url:privateUrl,title:'Public source'}]);const proposed={...candidate,opportunities:[{...candidate.opportunities[0],sourceUrls:[privateUrl+'&changed']} ]};
 const error=new pkg.SeoValidationError('UNSUPPORTED_SOURCE_URL','Unsupported source URL','opportunities[0].sourceUrls',0);error.references=pkg.referenceSnapshot([doc],proposed);
 const d=validationDiagnostic(error,{annotatedUrls:[privateUrl],discoveredUrls:[privateUrl],catalogUrls:[privateUrl],omittedUncitedCount:0});
 assert.equal(d.rule,'UNSUPPORTED_SOURCE_URL');assert.equal(d.path,'opportunities[0].sourceUrls');assert.equal(d.references.evidence[0].urls[0].fingerprint.length,64);
 const json=JSON.stringify(d);assert(!json.includes('private-test-token'));assert(!json.includes('secret-fragment'));assert(!json.includes('recommendedAction'));assert(json.length<=32000);
});
test('actual SDK plus injected research adapter accepts only provider-backed references with mocked responses',async()=>{
 const config=load('src/lib/marketing/config.ts');let researchCalls=0;const receipts=[],mapped=[];
 const reporters={ga4Report:async()=>({overview:{columns:['Sessions'],rows:[]},daily:{columns:[],rows:[]},pages:{columns:[],rows:[]},notes:['Empty fixture report.']}),searchConsoleReport:async()=>({overview:{columns:['Clicks'],rows:[]},daily:{columns:[],rows:[]},pages:{columns:[],rows:[]},notes:['Empty fixture report.']})};
 const {createSeoTools}=load('src/lib/marketing/seo/tools.ts',{...overrides,'./config':{seoConfiguration:()=>({tenantId:config.marketingTenant,ga4Property:'564904776',searchProperty:'sc-domain:theaugmentedarchitect.com',model:'fixture-model'})}});
 const {ports}=createSeoTools({tenantId:config.marketingTenant,days:28,authorize:async()=>{},reporters,onResearchUsage:async u=>receipts.push(u),onResearchMapping:m=>mapped.push(m),client:{responses:{create:async()=>{researchCalls++;return response();}}}});
 let modelCalls=0;const client=new OpenAI({apiKey:'fixture-not-a-real-key',maxRetries:0,fetch:async()=>{modelCalls++;const fc=(name,args)=>({type:'function_call',id:'fc_'+name,call_id:'call_'+name,name,arguments:JSON.stringify(args),status:'completed'});return Response.json({id:'resp_fixture_'+modelCalls,object:'response',created_at:1,status:'completed',model:'fixture-model',usage:{input_tokens:100,output_tokens:50,total_tokens:150},output:modelCalls===1?[fc('get_google_analytics',{days:'28'}),fc('get_search_console',{days:'28'}),fc('research_approved_website',{}),fc('research_external_web',{query:'Primary documentation about maintainable business automation'})]:[{type:'message',id:'final_fixture',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(candidate),annotations:[]}]}]});}});
 const result=await pkg.runSeoAnalysis({model:'fixture-model',reportingDays:28,business:{name:'Fixture business',website:'https://example.com',objective:'Find owner-reviewed architecture consulting opportunities.',targetCustomers:['Administrators maintaining business automation']}},ports,{modelProvider:new OpenAIProvider({openAIClient:client,useResponses:true})});
 assert.equal(result.analysis.opportunities[0].sourceUrls[0],cited);assert.equal(modelCalls,2);assert.equal(researchCalls,1);assert.equal(mapped.length,1);assert.equal(receipts[0].webSearchCalls,1);assert(result.evidence.filter(d=>['ga4','search_console'].includes(d.kind)).every(d=>d.status==='empty'&&!d.hasActualSearchData));
});
