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

export async function prepareSeoResearchPlan(owner:Awaited<ReturnType<typeof requireOwner>>,requestId:string,objective:string,days:7|28|90,signal:AbortSignal){
 const c=seoConfiguration(),db=seoDatabase(),store=createSeoStore(db,owner.tenantId),assignment={objective,mode:'research_plan' as const};
 const claimed=await store.claim(requestId,owner.user.id,days,assignment);
 if(claimed.reused)return {executionId:requestId,reused:true};
 const receipts:UsageReceipt[]=[],bounded=AbortSignal.any([signal,AbortSignal.timeout(c.limits.maxRuntimeMs)]);
 const authorize=async()=>{const current=await requireOwner(owner.db);if(current.tenantId!==owner.tenantId||current.user.id!==owner.user.id)throw new MarketingError(403,'Research authorization changed.');bounded.throwIfAborted();};
 try{
  await authorize();const client=new OpenAI({apiKey:c.apiKey,maxRetries:0,timeout:60000});
  const [rows,plans,backlog]=await Promise.all([intelligenceRecords(owner.db,owner.tenantId),planningRecords(owner.db,owner.tenantId),loadBacklog(owner.db,owner.tenantId)]);
  const memory=planningMemory(rows,plans);
  memory.feedback=backlog.opportunities.flatMap(o=>o.outcomes.flatMap(outcome=>{const parsed=performanceFeedbackSchema.safeParse(outcome.payload.performanceFeedback);return parsed.success&&parsed.data.opportunityId===o.id?[parsed.data]:[];})).slice(0,10);
  const {ports}=createSeoTools({tenantId:owner.tenantId,days,client,authorize,onResearchUsage:async()=>{throw Error('External model research is not permitted in planning mode.');}});
  const result=await runSeoResearchPlan({...seoBusinessConfig(c.model,days,objective),history:historicalContext(backlog.opportunities),intelligence:intelligenceContext(rows)}, {...ports,services:[{id:'salesforce',title:'Salesforce Modernization'},{id:'ai-solutions',title:'AI Solutions'},{id:'custom-applications',title:'Custom Business Applications'}],savedResearch:async()=>{await authorize();return {evidence:savedPlanningEvidence(rows),memory};}}, {modelProvider:new OpenAIProvider({openAIClient:client,useResponses:true}),signal:bounded,onUsage:async receipt=>{receipts.push(receipt);await store.progress(requestId,'model',receipts);}});
  await authorize();const plan=priceResearchPlan(result.plan,rows,owner.tenantId),id=await saveResearchPlan(db,owner.tenantId,owner.user.id,requestId,objective,plan,result.evidence,result.usage);
  await store.completePlan(requestId,result.usage,assignment);return {planId:id,executionId:requestId,reused:false};
 }catch{
  const message=bounded.aborted?'Research planning was cancelled or reached its time limit. No paid research was started.':'Research planning failed validation, model access, or persistence. No paid research was started. Review execution history before retrying.';
  await store.failed(requestId,receipts,message);throw new MarketingError(503,message);
 }finally{await store.release(claimed.agent.id,requestId);}
}
