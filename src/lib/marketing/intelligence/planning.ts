import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {researchPlanSchema,normalizedTerm,type ResearchPlan,type ResearchMemory,type Evidence,type UsageReceipt} from '@augmented-architect/seo-analyst';
import {MarketingError,marketingTenant} from '../config';
import type {Artifact} from '../opportunities/contracts';
import {marketingRows} from '../opportunities/repository';
import {stableId} from '../opportunities/identity';
import {cacheFresh,providerScope,queryKey,parseResearchCommand,savedResearch,type ResearchCommand} from './service';
import {dataForSeoPrices,dataForSeoTarget} from './dataforseo';

const domain='seo-research-planning';
export type PricedPlan=Omit<ResearchPlan,'steps'>&{steps:(ResearchPlan['steps'][number]&{cachedResearchIds:string[];maximumCostUsd:number})[];maximumRequests:number;maximumCostUsd:number;paidExecutionEnabled:false};
export type SavedPlan={id:string;executionId:string;createdAt:string;objective:string;plan:PricedPlan;decision:'pending'|'approved'|'deferred'|'rejected';note:string;};
export async function planningRecords(db:SupabaseClient,tenant:string){return await marketingRows(db,'marketing_artifacts',tenant,domain) as Artifact[];}
export function savedPlans(rows:Artifact[]):SavedPlan[]{
 return rows.filter(r=>r.payload.workflow==='seo-research-plan/v1').map(r=>{
  const decision=rows.find(d=>d.parent_id===r.id&&d.payload.workflow==='seo-research-plan-review/v1');
  return {id:r.id,executionId:r.execution_id!,createdAt:r.created_at,objective:String(r.payload.objective),plan:r.payload.plan as PricedPlan,decision:(decision?.payload.decision??'pending') as SavedPlan['decision'],note:String(decision?.payload.note??'')};
 }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export function priceResearchPlan(plan:ResearchPlan,rows:Artifact[],tenant:string,now=new Date()):PricedPlan{
 if(tenant!==marketingTenant)throw new MarketingError(403,'Unauthorized research workspace.');
 researchPlanSchema.parse(plan);
 const {country,language}=dataForSeoTarget(),records=savedResearch(rows),seen=new Set<string>();
 const steps=plan.steps.map(step=>{
  const command=parseResearchCommand({requestId:'11111111-1111-4111-a111-111111111111',provider:'dataforseo',mode:step.mode,service:step.service,seeds:[...new Map(step.seeds.map(s=>[normalizedTerm(s),s])).values()],target:{country,language}});
  const key=queryKey(command);if(seen.has(key))throw new MarketingError(400,'The plan repeats a research request.');seen.add(key);
  const cached=records.filter(r=>r.scope===providerScope(tenant,r.query)&&cacheFresh(r,now)&&(
   queryKey(r.query)===key||step.mode==='historical'&&r.query.service===step.service&&r.query.target.country===country&&r.query.target.language===language&&r.query.locationCode===command.locationCode&&r.query.provider==='dataforseo'&&command.seeds.every(term=>r.bundle.market.some(m=>normalizedTerm(m.term)===normalizedTerm(term)&&m.estimatedMonthlySearches!==null))
  ));
  return {...step,seeds:command.seeds,cachedResearchIds:cached.map(r=>r.id).slice(0,3),maximumCostUsd:cached.length?0:dataForSeoPrices[step.mode]};
 });
 return {...plan,steps,maximumRequests:steps.filter(s=>s.maximumCostUsd>0).length,maximumCostUsd:Math.round(steps.reduce((n,s)=>n+s.maximumCostUsd,0)*1e6)/1e6,paidExecutionEnabled:false};
}
export function planningMemory(research:Artifact[],plans:Artifact[]):ResearchMemory{
 const latest=research.filter(r=>r.payload.workflow==='intelligence-request/v1').slice(-15).reverse();
 const priorPlans=savedPlans(plans).slice(0,5).flatMap(p=>(p.plan.steps.length?p.plan.steps:[{service:'all',mode:'no_purchase',seeds:[]}]).map(step=>({id:p.id,service:step.service,mode:step.mode,seeds:step.seeds,status:'planned_'+p.decision,limitations:[p.plan.contentDecision,p.plan.rationale,...p.plan.limitations].slice(0,4).map(value=>value.slice(0,300))})));
 return {investigations:[...latest.map(r=>{const q=r.payload.query as ResearchCommand,complete=research.some(a=>a.parent_id===r.id&&a.payload.workflow==='intelligence-research/v1'),failed=research.find(a=>a.parent_id===r.id&&a.payload.workflow==='intelligence-failure/v1');return {id:r.id,service:q.service,mode:q.mode,seeds:q.seeds,status:complete?'completed':failed?'failed':'uncertain',limitations:complete?['Provider estimates are not measured site conversions.']:[String((failed?.payload.diagnostic as {category?:string})?.category??'Result unconfirmed; do not replay automatically.')]};}),...priorPlans].slice(0,30),decisions:savedPlans(plans).slice(0,8).map(p=>({planId:p.id,decision:p.decision,note:p.note.slice(0,300)})),feedback:[]};
}
export function savedPlanningEvidence(rows:Artifact[],now=new Date()):Evidence[]{
 return savedResearch(rows).filter(r=>r.scope===providerScope(marketingTenant,r.query)).slice(0,5).map(r=>({id:r.id,kind:'external_research',title:`Saved ${r.query.service} ${r.query.mode} investigation`,content:JSON.stringify({query:r.query,bundle:r.bundle,stale:!cacheFresh(r,now)}).slice(0,8000),sources:r.bundle.collections.flatMap(p=>p.sourceUrls.map(url=>({url,title:p.provider}))).slice(0,15),retrievedAt:r.createdAt,status:'connected',hasActualSearchData:false}));
}
export async function saveResearchPlan(db:SupabaseClient,tenant:string,actor:string,executionId:string,objective:string,plan:PricedPlan,evidence:Evidence[],usage:UsageReceipt[]){
 if(tenant!==marketingTenant)throw new MarketingError(403,'Unauthorized research workspace.');
 const id=stableId(executionId+':research-plan'),result=await db.from('marketing_artifacts').insert({id,tenant_id:tenant,kind:'measurement',execution_id:executionId,actor_id:actor,title:'SEO Analyst research plan',payload:{domain,workflow:'seo-research-plan/v1',objective,plan,documents:evidence,usage,spendingAuthorized:false,publishingAuthorized:false}});
 if(result.error)throw new MarketingError(503,'The research plan could not be saved. Inspect execution history before trying again.');return id;
}
export async function reviewResearchPlan(db:SupabaseClient,tenant:string,actor:string,planId:string,decision:'approved'|'deferred'|'rejected',note:string){
 const records=await planningRecords(db,tenant),plan=savedPlans(records).find(r=>r.id===planId);
 if(!plan)throw new MarketingError(404,'Research plan not found in this workspace.');
 const id=stableId(planId+':owner-decision'),existing=records.find(r=>r.id===id);
 if(existing){if(existing.actor_id===actor&&existing.payload.decision===decision&&existing.payload.note===note)return {id,reused:true};throw new MarketingError(409,'A decision already exists. Prepare a new plan to reconsider.');}
 const result=await db.from('marketing_artifacts').insert({id,tenant_id:tenant,kind:'approval',parent_id:planId,execution_id:plan.executionId,actor_id:actor,title:`Research plan ${decision}`,payload:{domain,workflow:'seo-research-plan-review/v1',decision,note,spendingAuthorized:false,publishingAuthorized:false}});
 if(result.error)throw new MarketingError(409,'The plan decision could not be saved. Refresh before trying again.');
 return {id,reused:false};
}
