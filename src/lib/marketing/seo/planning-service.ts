import 'server-only';
import OpenAI from 'openai';
import {OpenAIProvider} from '@openai/agents';
import {runSeoResearchPlan,performanceFeedbackSchema,type UsageReceipt} from '@augmented-architect/seo-analyst';
import {requireOwner} from '../auth';
import {MarketingError} from '../config';
import {seoConfiguration,seoDatabase} from './config';
import {createSeoStore} from './store';
import {seoBusinessConfig} from './context';
import {createSeoTools} from './tools';
import {loadBacklog} from '../opportunities/repository';
import {historicalContext} from '../opportunities/model';
import {intelligenceRecords,intelligenceContext} from '../intelligence/service';
import {planningRecords,planningMemory,savedPlanningEvidence,priceResearchPlan,saveResearchPlan} from '../intelligence/planning';
import {intelligencePlanningEvidence,savedEvidenceDetails} from '../intelligence/planning-evidence';
import {validationDiagnostic} from './validation-diagnostics';
import {usageSummary} from './contracts';

import {requirePlanningExecution} from './planning-policy';

type PlanningPhase='context'|'evidence'|'model'|'validation'|'pricing'|'persistence'|'completion';
export function planningFailureDiagnostic(error:unknown,phase:PlanningPhase){
 const provider=error as {name?:unknown;status?:unknown;code?:unknown;param?:unknown;issues?:{path?:unknown}[]};
 const issuePath=provider?.name==='ZodError'&&Array.isArray(provider.issues)&&Array.isArray(provider.issues[0]?.path)?provider.issues[0].path.join('.'):null;
 const validation=validationDiagnostic(error)??(issuePath&&/^[a-zA-Z0-9_.\[\]]{1,200}$/.test(issuePath)&&!/(sk-|sb_secret_|password|authorization|api_key)/i.test(issuePath)?{rule:'SCHEMA_VALIDATION_FAILED',path:issuePath,opportunityIndex:null,references:null,research:null}:null);
 const codes=['invalid_json_schema','model_not_found','insufficient_quota','invalid_api_key','rate_limit_exceeded','context_length_exceeded','invalid_request_error','permission_denied'];
 const params=['model','text.format.schema','max_output_tokens','input','tools','reasoning.effort'];
 const kinds=['APIError','BadRequestError','AuthenticationError','PermissionDeniedError','RateLimitError','APIConnectionTimeoutError','MaxTurnsExceededError','ZodError','RangeError'];
 return {phase,kind:validation?provider?.name==='ZodError'?'ZodError':'SeoValidationError':typeof provider?.name==='string'&&kinds.includes(provider.name)?provider.name:'PlanningError',status:typeof provider?.status==='number'&&Number.isInteger(provider.status)&&provider.status>=400&&provider.status<=599?provider.status:null,code:validation?.rule??(typeof provider?.code==='string'&&codes.includes(provider.code)?provider.code:null),param:validation?.path??(typeof provider?.param==='string'&&params.includes(provider.param)?provider.param:null),validation};
}

export async function prepareSeoResearchPlan(owner:Awaited<ReturnType<typeof requireOwner>>,requestId:string,objective:string,days:7|28|90,signal:AbortSignal){
 requirePlanningExecution();
 const c=seoConfiguration(),db=seoDatabase(),store=createSeoStore(db,owner.tenantId),assignment={objective,mode:'research_plan' as const};
 const claimed=await store.claim(requestId,owner.user.id,days,assignment);
 if(claimed.reused)return {executionId:requestId,reused:true};
 const receipts:UsageReceipt[]=[],bounded=AbortSignal.any([signal,AbortSignal.timeout(c.limits.maxRuntimeMs)]);
 let phase:PlanningPhase='context';
 const authorize=async()=>{const current=await requireOwner(owner.db);if(current.tenantId!==owner.tenantId||current.user.id!==owner.user.id)throw new MarketingError(403,'Research authorization changed.');bounded.throwIfAborted();};
 try{
  await authorize();const client=new OpenAI({apiKey:c.apiKey,maxRetries:0,timeout:60000});
  const [rows,plans,backlog]=await Promise.all([intelligenceRecords(owner.db,owner.tenantId),planningRecords(owner.db,owner.tenantId),loadBacklog(owner.db,owner.tenantId)]);
  const memory=planningMemory(rows,plans);
  memory.feedback=backlog.opportunities.flatMap(o=>o.outcomes.flatMap(outcome=>{const parsed=performanceFeedbackSchema.safeParse(outcome.payload.performanceFeedback);return parsed.success&&parsed.data.opportunityId===o.id?[parsed.data]:[];})).slice(0,10);
  const {ports}=createSeoTools({tenantId:owner.tenantId,days,client,authorize,onResearchUsage:async()=>{throw Error('External model research is not permitted in planning mode.');}});
  const config=seoBusinessConfig(c.model,days,objective),asOf=new Date(config.asOf!),intelligence=intelligenceContext(rows);
  phase='evidence';
  const result=await runSeoResearchPlan({...config,history:historicalContext(backlog.opportunities),intelligence}, {...ports,services:[{id:'salesforce',title:'Salesforce Modernization'},{id:'ai-solutions',title:'AI Solutions'},{id:'custom-applications',title:'Custom Business Applications'}],savedResearch:async()=>{await authorize();return {evidence:[...savedPlanningEvidence(rows,asOf),...(intelligence?[intelligencePlanningEvidence(intelligence,asOf)]:[])],memory};},evidenceDetails:async query=>{await authorize();return savedEvidenceDetails(rows,owner.tenantId,intelligence,query);}}, {modelProvider:new OpenAIProvider({openAIClient:client,useResponses:true}),signal:bounded,onProgress:()=>{phase='model';},onUsage:async receipt=>{receipts.push(receipt);await store.progress(requestId,'model',receipts);phase='validation';}});
  await authorize();phase='pricing';const plan=priceResearchPlan(result.plan,rows,owner.tenantId);phase='persistence';const id=await saveResearchPlan(db,owner.tenantId,owner.user.id,requestId,objective,plan,result.evidence,result.usage);
  phase='completion';await store.completePlan(requestId,result.usage,assignment);return {planId:id,executionId:requestId,reused:false};
 }catch(error){
  const message=bounded.aborted?'Research planning was cancelled or reached its time limit. No paid research was started.':'Research planning failed validation, model access, or persistence. No paid research was started. Review execution history before retrying.';
  const failure=planningFailureDiagnostic(error,phase);
  const usage=usageSummary(receipts);
  console.error('SEO planning failed',{executionId:requestId,...failure,usage:{inputTokens:usage.inputTokens,outputTokens:usage.outputTokens,totalTokens:usage.totalTokens,measuredCost:null}});
  await store.failed(requestId,receipts,message,failure);
  throw new MarketingError(503,message);
 }finally{await store.release(claimed.agent.id,requestId);}
}
