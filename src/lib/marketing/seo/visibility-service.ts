import 'server-only';
import OpenAI from 'openai';
import {OpenAIProvider} from '@openai/agents';
import {runSeoAnalysis,visibilityEvidence,type Evidence,type UsageReceipt} from '@augmented-architect/seo-analyst';
import {requireOwner} from '../auth';
import {MarketingError} from '../config';
import {stableId} from '../opportunities/identity';
import {loadBacklog} from '../opportunities/repository';
import {historicalContext} from '../opportunities/model';
import {seoConfiguration,seoDatabase} from './config';
import {createSeoStore,type SeoAssignment} from './store';
import {createSeoTools} from './tools';
import {seoBusinessConfig} from './context';
import {planningFailureDiagnostic} from './planning-service';
import {intelligenceRecords} from '../intelligence/service';
import {visibilityCapabilities,visibilityDecision,visibilityAnalysisEvidence,savedVisibility,type VisibilityQuote} from '../intelligence/visibility';

export async function analyzeVisibility(owner:Awaited<ReturnType<typeof requireOwner>>,quote:VisibilityQuote,expectedHash:string,signal:AbortSignal){
 if(!visibilityCapabilities().analysisEnabled)throw new MarketingError(503,'AI visibility analysis is disabled. No model execution was started.');
 if(quote.hash!==expectedHash)throw new MarketingError(409,'The quote changed. Refresh first.');
 const rows=await intelligenceRecords(owner.db,owner.tenantId),decision=visibilityDecision(rows,quote);
 if(decision?.payload.decision!=='approved')throw new MarketingError(403,'An owner-approved strategy is required.');
 const saved=visibilityAnalysisEvidence(rows,quote),c=seoConfiguration(),db=seoDatabase(),store=createSeoStore(db,owner.tenantId);
 const id=stableId(decision.id+':visibility-analysis'),assignment:SeoAssignment={objective:quote.objective,mode:'ai_visibility',planId:quote.planId,quoteHash:quote.hash};
 const claim=await store.claim(id,owner.user.id,28,assignment);if(claim.reused)return {executionId:id,reused:true};
 const receipts:UsageReceipt[]=[],bounded=AbortSignal.any([signal,AbortSignal.timeout(c.limits.maxRuntimeMs)]);let phase:'context'|'model'|'persistence'='context';
 const authorize=async()=>{const current=await requireOwner(owner.db);if(current.tenantId!==owner.tenantId||current.user.id!==owner.user.id)throw new MarketingError(403,'Owner access changed.');bounded.throwIfAborted();};
 try{
  await authorize();const client=new OpenAI({apiKey:c.apiKey,maxRetries:0,timeout:60000}),backlog=await loadBacklog(owner.db,owner.tenantId);
  const {ports,snapshots}=createSeoTools({tenantId:owner.tenantId,days:28,client,authorize,onResearchUsage:async()=>{throw Error('No external model research is permitted.');}});
  const older=savedVisibility(rows).flatMap(r=>r.observations).filter(o=>!saved.observations.some(n=>n.id===o.id)&&saved.observations.some(n=>n.query===o.query&&n.platform===o.platform&&n.observationType===o.observationType&&JSON.stringify(n.target)===JSON.stringify(o.target))).sort((a,b)=>b.retrievedAt.localeCompare(a.retrievedAt)).slice(0,2);
  const docs=new Map([...saved.documents,...visibilityEvidence(older,new Date().toISOString())].map(d=>[d.id,d]));
  const summaries=saved.observations.map(o=>({id:o.id,platform:o.platform,kind:o.observationType,query:o.query,observedAt:o.observedAt,model:o.model,textExcerpt:o.responseText.slice(0,350),excerptTruncated:o.responseTruncated||o.responseText.length>350,citations:o.citations.slice(0,3),limitations:o.limitations}));
  const external:Evidence={id:'approved-ai-visibility',kind:'external_research',title:'Owner-approved AI response observations; saved data only',content:JSON.stringify({strategy:quote.strategy,observations:summaries,availableObservationCount:saved.availableCount,analyzedSampleCount:saved.observations.length,limitations:['No external search or purchase occurs in this analysis. Read individual observation IDs for more detail.']}),sources:[...new Map(saved.documents.flatMap(d=>d.sources.slice(0,4)).map(s=>[s.url,s])).values()].slice(0,15),retrievedAt:new Date().toISOString(),status:saved.observations.some(o=>o.responseText)?'connected':'empty',hasActualSearchData:false};
  const oldWebsite=ports.websiteResearch;ports.websiteResearch=async s=>{const doc=await oldWebsite(s),history=savedVisibility(rows).flatMap(r=>r.observations).filter(o=>!saved.observations.some(n=>n.id===o.id)&&saved.observations.some(n=>n.query===o.query&&n.platform===o.platform&&n.observationType===o.observationType&&JSON.stringify(n.target)===JSON.stringify(o.target))).slice(0,6).map(o=>({id:o.id,query:o.query,platform:o.platform,observedAt:o.observedAt,textExcerpt:o.responseText.slice(0,500),sources:o.citations.slice(0,2)}));return {...doc,content:JSON.stringify({website:JSON.parse(doc.content),history})};};
  ports.externalResearch=async(_query,s)=>{await authorize();s.throwIfAborted();return {evidence:external};};
  ports.readVisibilityEvidence=async(observationId,s)=>{await authorize();s.throwIfAborted();const doc=docs.get(observationId);if(!doc)throw new MarketingError(404,'Unknown observation in this approved strategy.');return doc;};
  phase='model';const result=await runSeoAnalysis({...seoBusinessConfig(c.model,28,quote.objective),researchFocus:'ai_visibility',visibilityEvidenceIds:[...docs.keys()],history:historicalContext(backlog.opportunities)},ports,{modelProvider:new OpenAIProvider({openAIClient:client,useResponses:true}),signal:bounded,onProgress:p=>store.progress(id,p.stage,receipts),onUsage:async r=>{receipts.push(r);await store.progress(id,'model',receipts);}});
  await authorize();phase='persistence';
  const analysis=await db.from('marketing_artifacts').insert({id:stableId(id+':visibility-summary'),tenant_id:owner.tenantId,kind:'measurement',execution_id:id,actor_id:owner.user.id,parent_id:quote.planId,title:'SEO Analyst AI visibility recommendations',payload:{domain:'opportunity-intelligence',workflow:'ai-visibility-analysis/v1',planId:quote.planId,quoteHash:quote.hash,analysis:result.analysis,assessment:result.visibilityAssessment,evidenceIds:result.evidence.filter(d=>d.kind==='ai_visibility').map(d=>d.id),availableObservationCount:saved.availableCount,sampledObservationCount:saved.observations.length,providerReceipts:[...new Map(saved.observations.map(o=>[o.provenance.requestId,o.provenance])).values()],requiresOwnerReview:true,publishingAuthorized:false}});
  if(analysis.error)throw new MarketingError(503,'Analysis could not be saved. No automatic retry will occur.');
  await store.complete(id,result,snapshots,owner.user.id);return {executionId:id,reused:false};
 }catch(error){await store.failed(id,receipts,'AI visibility analysis failed. Inspect its execution before any new run.',planningFailureDiagnostic(error,phase));throw new MarketingError(503,'AI visibility analysis failed. Actual returned usage is preserved; no automatic retry was started.');}
 finally{await store.release(claim.agent.id,id);}
}
