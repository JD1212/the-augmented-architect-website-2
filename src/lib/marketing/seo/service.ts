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

type Owner=Awaited<ReturnType<typeof requireOwner>>;
export function safeExecutionFailure(error:unknown,aborted:boolean){
  if(aborted)return 'The analysis exceeded its time limit or was cancelled. No automatic retry was started.';
  const message=error instanceof Error?error.message:'';
  if(/budget|turns/i.test(message))return 'The analysis reached its execution budget. Review the recorded usage before a new manual run.';
  if(/evidence|source|provenance|priorities|validation|omitted/i.test(message))return 'The result did not pass evidence validation. No successful recommendation was published.';
  return 'The analysis could not complete. Reporting, research, model access, or persistence may be unavailable. No automatic retry was started.';
}
export async function executeSeo(owner:Owner,requestId:string,days:7|28|90,signal:AbortSignal){
  assertExecutionScope(owner.tenantId);
  const c=seoConfiguration(),store=createSeoStore(seoDatabase(),owner.tenantId),claimed=await store.claim(requestId,owner.user.id,days);
  if(claimed.reused)return {executionId:requestId,reused:true};
  const receipts:UsageReceipt[]=[],bounded=AbortSignal.any([signal,AbortSignal.timeout(c.limits.maxRuntimeMs)]);
  try{
    const client=new OpenAI({apiKey:c.apiKey,maxRetries:0,timeout:60000});
    const recordUsage=async(receipt:UsageReceipt)=>{if(receipt.responseId&&receipts.some(r=>r.responseId===receipt.responseId&&r.purpose===receipt.purpose))return;receipts.push(receipt);await store.progress(requestId,'model',receipts);};
    const authorize=async()=>{const current=await requireOwner(owner.db);if(current.user.id!==owner.user.id||current.tenantId!==owner.tenantId)throw new MarketingError(403,'Execution authorization changed.');};
    const {ports,snapshots}=createSeoTools({tenantId:owner.tenantId,days,client,onResearchUsage:recordUsage,authorize});
    const result=await runSeoAnalysis(seoBusinessConfig(c.model,days),ports,{modelProvider:new OpenAIProvider({openAIClient:client,useResponses:true}),signal:bounded,onProgress:p=>store.progress(requestId,p.stage,receipts),onUsage:recordUsage});
    await authorize();
    await store.complete(requestId,result,snapshots,owner.user.id);
    return {executionId:requestId,reused:false};
  }catch(error){
    const message=safeExecutionFailure(error,bounded.aborted);
    const status=(error as {status?:unknown})?.status;
    const failure={kind:error instanceof Error&&['APIError','BadRequestError','AuthenticationError','PermissionDeniedError','RateLimitError','APIConnectionTimeoutError','MaxTurnsExceededError','ZodError','ToolCallError'].includes(error.name)?error.name:'ExecutionError',status:typeof status==='number'&&status>=400&&status<=599?status:null};
    await store.failed(requestId,receipts,message,failure);throw new MarketingError(503,message);
  }finally{await store.release(claimed.agent.id,requestId);}
}
