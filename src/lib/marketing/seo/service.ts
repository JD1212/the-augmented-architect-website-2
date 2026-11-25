import 'server-only';
import OpenAI from 'openai';
import {OpenAIProvider} from '@openai/agents';
import {runSeoAnalysis,type UsageReceipt} from '@augmented-architect/seo-analyst';
import {requireOwner} from '../auth';
import {MarketingError} from '../config';
import {seoConfiguration,seoDatabase} from './config';
import {seoBusinessConfig} from './context';
import {createSeoTools} from './tools';
import {assertExecutionScope,createSeoStore} from './store';
import {findValidationError,validationDiagnostic} from './validation-diagnostics';
import type {ResearchCatalog} from './research-evidence';
import {loadBacklog} from '../opportunities/repository';
import {historicalContext} from '../opportunities/model';
import {intelligenceRecords,selectIntelligence} from '../intelligence/service';
import {planningRecords,savedPlans,planningMemory} from '../intelligence/planning';

type Owner=Awaited<ReturnType<typeof requireOwner>>;
export function safeExecutionFailure(error:unknown,aborted:boolean){
  if(aborted)return 'The analysis exceeded its time limit or was cancelled. No automatic retry was started.';
  const validation=findValidationError(error);
  if(validation)return `Evidence validation rejected ${validation.code} at ${validation.path}. No recommendation was accepted.`;
  const value=error as {status?:unknown;code?:unknown};
  if(value?.status===400&&value.code==='invalid_json_schema')return 'The model provider rejected the structured-output schema before analysis began. No research or findings were produced.';
  if(typeof value?.status==='number'&&value.status>=400)return 'The model provider rejected the analysis request. No result was accepted; review the execution diagnostics before retrying.';
  const message=error instanceof Error?error.message:'';
  if(error instanceof Error&&error.name==='MaxTurnsExceededError'||['Model request budget exhausted','Model input budget exhausted'].includes(message))return 'The analysis reached its execution budget. Review the recorded usage before a new manual run.';
  const validationErrors=new Set(['Unsafe source reference','Invalid search-data provenance','External research has no traceable sources','Priorities must be unique and ordered','Unknown evidence reference','Unsupported source URL','Unsupported actual-search claim','Missing opportunity-specific external source','Missing external evidence','Unexpected evidence source','Analysis omitted a required evidence source']);
  if(error instanceof Error&&error.name==='ZodError'||validationErrors.has(message))return 'The result did not pass evidence validation. No successful recommendation was published.';
  return 'The analysis could not complete. Reporting, research, model access, or persistence may be unavailable. No automatic retry was started.';
}
export async function executeSeo(owner:Owner,requestId:string,days:7|28|90,signal:AbortSignal){
  assertExecutionScope(owner.tenantId);
  const c=seoConfiguration(),store=createSeoStore(seoDatabase(),owner.tenantId),claimed=await store.claim(requestId,owner.user.id,days);
  if(claimed.reused)return {executionId:requestId,reused:true};
  let lastStage='starting';
  let researchMapping:ResearchCatalog['mapping']|undefined;
  const receipts:UsageReceipt[]=[],bounded=AbortSignal.any([signal,AbortSignal.timeout(c.limits.maxRuntimeMs)]);
  try{
    const client=new OpenAI({apiKey:c.apiKey,maxRetries:0,timeout:60000});
    const recordUsage=async(receipt:UsageReceipt)=>{if(receipt.responseId&&receipts.some(r=>r.responseId===receipt.responseId&&r.purpose===receipt.purpose))return;receipts.push(receipt);await store.progress(requestId,'model',receipts);};
    const authorize=async()=>{const current=await requireOwner(owner.db);if(current.user.id!==owner.user.id||current.tenantId!==owner.tenantId)throw new MarketingError(403,'Execution authorization changed.');};
    const {ports,snapshots}=createSeoTools({tenantId:owner.tenantId,days,client,onResearchUsage:recordUsage,onResearchMapping:mapping=>{researchMapping=mapping;},authorize});
    const prior=await loadBacklog(owner.db,owner.tenantId);
    const researchRows=await intelligenceRecords(owner.db,owner.tenantId),planRows=await planningRecords(owner.db,owner.tenantId);
    const selection=selectIntelligence(researchRows,owner.tenantId),intelligence=selection.context,approvedPlan=savedPlans(planRows).find(p=>p.decision==='approved');
    store.evidenceContext({...selection,context:undefined});
    const websiteRead=ports.websiteResearch;ports.websiteResearch=async signal=>{const doc=await websiteRead(signal);return {...doc,content:JSON.stringify({website:doc.content,memory:planningMemory(researchRows,planRows),approvedPlan:approvedPlan?.plan??null,keywordEvidenceSelection:{...selection,context:undefined}}).slice(0,16000)};};
    const config={...seoBusinessConfig(c.model,days,approvedPlan?.objective),history:historicalContext(prior.opportunities),...(intelligence?{intelligence}:{})};
    const result=await runSeoAnalysis(config,ports,{modelProvider:new OpenAIProvider({openAIClient:client,useResponses:true}),signal:bounded,onProgress:p=>{lastStage=p.stage;return store.progress(requestId,p.stage,receipts);},onUsage:recordUsage});
    await authorize();
    await store.complete(requestId,result,snapshots,owner.user.id,{...selection,context:undefined,consumed:result.evidence.some(d=>d.id==='saved-intelligence'),citedByFindings:result.analysis.opportunities.filter(o=>o.evidenceIds.includes('saved-intelligence')).map(o=>o.priority)});
    return {executionId:requestId,reused:false};
  }catch(error){
    const message=safeExecutionFailure(error,bounded.aborted);
    const status=(error as {status?:unknown})?.status;
    const provider=error as {code?:unknown;param?:unknown};
    const validation=validationDiagnostic(error,researchMapping);
    const failure={validation,phase:lastStage,code:validation?.rule??(typeof provider?.code==='string'&&/^[a-z_]{1,64}$/.test(provider.code)?provider.code:null),param:validation?.path??(typeof provider?.param==='string'&&/^[a-zA-Z0-9_.\[\]]{1,160}$/.test(provider.param)?provider.param:null),kind:validation?'SeoValidationError':error instanceof Error&&['APIError','BadRequestError','AuthenticationError','PermissionDeniedError','RateLimitError','APIConnectionTimeoutError','MaxTurnsExceededError','ZodError','ToolCallError'].includes(error.name)?error.name:'ExecutionError',status:typeof status==='number'&&status>=400&&status<=599?status:null};
    await store.failed(requestId,receipts,message,failure);throw new MarketingError(503,message);
  }finally{await store.release(claimed.agent.id,requestId);}
}
