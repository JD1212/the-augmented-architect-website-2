import 'server-only';
import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {provenanceSchema,visibilityAssessmentSchema,analysisSchema,validateVisibilityStrategy,validateVisibilityObservation,summarizeVisibility,visibilityEvidence,type VisibilityObservation} from '@augmented-architect/seo-analyst';
import {MarketingError,marketingTenant} from '../config';
import {stableId} from '../opportunities/identity';
import type {Artifact} from '../opportunities/contracts';
import {seoBusinessConfig,seoOfferings} from '../seo/context';
import {planningRecords,savedPlans} from './planning';
import {marketingRows} from '../opportunities/repository';
import {intelligenceRecords,claimResearchBudget} from './service';
import {dataForSeoTarget,dataForSeoPrices,dataForSeoFailureDiagnostic,DataForSeoError} from './dataforseo';
import {visibilityProvider,visibilityMode,type VisibilityRequest} from './visibility-provider';

const domain='opportunity-intelligence';
export function visibilityCapabilities(env=process.env){return {planningEnabled:env.SEO_RESEARCH_PLANNING_ENABLED==='true',researchEnabled:env.AI_VISIBILITY_RESEARCH_ENABLED==='true'&&env.DATAFORSEO_RESEARCH_ENABLED==='true'&&Boolean(env.DATAFORSEO_LOGIN&&env.DATAFORSEO_PASSWORD),analysisEnabled:env.AI_VISIBILITY_ANALYSIS_ENABLED==='true',credentialsPresent:Boolean(env.DATAFORSEO_LOGIN&&env.DATAFORSEO_PASSWORD)};}
export type VisibilityQuote={planId:string;objective:string;hash:string;strategy:NonNullable<ReturnType<typeof savedPlans>[number]['plan']['visibilityStrategy']>;requests:(VisibilityRequest&{maximumCostUsd:number})[];maximumCostUsd:number;target:ReturnType<typeof dataForSeoTarget>;modelCostUsd:null;};
const scope=(tenant:string)=>{if(tenant!==marketingTenant)throw new MarketingError(403,'Unauthorized AI visibility workspace.');};
export function quoteVisibility(planId:string,plans:Artifact[]):VisibilityQuote{
 const source=plans.find(p=>p.id===planId&&p.payload.workflow==='seo-research-plan/v1'),plan=savedPlans(plans).find(p=>p.id===planId);
 if(!source||!plan?.plan.visibilityStrategy)throw new MarketingError(404,'No Analyst visibility strategy exists for this plan.');
 const ids=Array.isArray(source.payload.documents)?source.payload.documents.map(d=>String((d as {id:string}).id)):[];
 const strategy=validateVisibilityStrategy(plan.plan.visibilityStrategy,seoOfferings(),ids),target=dataForSeoTarget();
 if(target.country!=='US'||target.language!=='en'||target.locationCode!==2840)throw new MarketingError(503,'This AI visibility release is verified for US/English only.');
 const requests=strategy.requests.map(r=>{const q=strategy.questions.find(q=>q.id===r.questionId)!;if(r.observationType==='historical_mention'&&q.question.length>250)throw new MarketingError(400,'Historical AI queries must fit the provider limit of 250 characters. Refine the strategy before approval.');const request:VisibilityRequest={...r,question:q.question,offeringId:q.offeringId};return {...request,maximumCostUsd:dataForSeoPrices[visibilityMode(request)]};});
 const hash=createHash('sha256').update(JSON.stringify({version:'ai-visibility-quote/v1',executionScope:{environment:process.env.VERCEL_ENV??'development',branch:process.env.VERCEL_ENV==='preview'?process.env.VERCEL_GIT_COMMIT_REF??'missing':null,account:providerScope(marketingTenant)},planId,objective:plan.objective,strategy,requests,target})).digest('hex');
 return {planId,objective:plan.objective,hash,strategy,requests,maximumCostUsd:Math.round(requests.reduce((n,r)=>n+r.maximumCostUsd,0)*1e6)/1e6,target,modelCostUsd:null};
}
export function visibilityDecision(rows:Artifact[],q:VisibilityQuote){return rows.find(r=>r.id===stableId(q.planId+':visibility-decision:'+q.hash));}
export function savedVisibility(rows:Artifact[]){return rows.filter(r=>r.payload.workflow==='intelligence-ai-observation/v1'&&r.payload.state==='completed').map(r=>({id:r.id,createdAt:r.created_at,requestId:r.parent_id,scope:String(r.payload.scope),query:r.payload.query as VisibilityRequest,receipt:provenanceSchema.parse(r.payload.receipt),observations:(r.payload.observations as unknown[]).map(validateVisibilityObservation)}));}
const providerScope=(tenant:string)=>stableId(tenant+':ai-visibility-v1:'+(process.env.DATAFORSEO_LOGIN??'unconfigured')+':'+JSON.stringify(dataForSeoTarget()));
const identity=(r:VisibilityRequest)=>JSON.stringify({question:r.question,platform:r.platform,observationType:r.observationType});
export function compareVisibility(observation:VisibilityObservation,previous:VisibilityObservation[],business:{name:string;website:string}){
 const prior=previous.filter(o=>o.id!==observation.id&&o.query===observation.query&&o.platform===observation.platform&&o.observationType===observation.observationType&&JSON.stringify(o.target)===JSON.stringify(observation.target)&&Date.parse(o.retrievedAt)<Date.parse(observation.retrievedAt)).sort((a,b)=>b.retrievedAt.localeCompare(a.retrievedAt))[0];
 if(!prior)return null;const before=summarizeVisibility(prior,business),after=summarizeVisibility(observation,business),old=new Set(prior.citations.map(c=>new URL(c.url).hostname)),current=new Set(observation.citations.map(c=>new URL(c.url).hostname));
 return {priorEvidenceId:prior.id,priorRetrievedAt:prior.retrievedAt,appearanceBefore:before.businessAppearance,appearanceAfter:after.businessAppearance,addedCitedDomains:[...current].filter(d=>!old.has(d)),removedCitedDomains:[...old].filter(d=>!current.has(d)),limitation:'Matched query, platform, method and geography; changes between samples do not establish causation, rankings or conversion lift.'};
}
export async function visibilityState(db:SupabaseClient,tenant:string){
 scope(tenant);const [rows,plans]=await Promise.all([intelligenceRecords(db,tenant),planningRecords(db,tenant)]),business=seoBusinessConfig('context-only',28).business;
 const executions=await marketingRows(db,'marketing_executions',tenant);
 const history=savedVisibility(rows).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 return {capabilities:visibilityCapabilities(),executions:executions.filter(e=>(e.diagnostics as {assignment?:{mode?:string}})?.assignment?.mode==='ai_visibility').slice(-12).reverse().map(e=>({id:String(e.id),state:String(e.state),usage:e.usage as {inputTokens:number|null;outputTokens:number|null;totalTokens:number|null;measuredCost:null},failure:(e.diagnostics as {failure?:unknown}).failure??null})),plans:savedPlans(plans).filter(p=>p.plan.visibilityStrategy).map(p=>{const quote=quoteVisibility(p.id,plans);return {quote,decision:visibilityDecision(rows,quote)?.payload.decision??'pending',collectionComplete:quote.requests.every(request=>history.some(h=>h.scope===providerScope(tenant)&&identity(h.query)===identity(request)&&Date.parse(h.createdAt)+86400000>Date.now()))};}).slice(0,10),observations:history.flatMap(r=>r.observations.map(o=>({observation:o,summary:summarizeVisibility(o,business),comparison:compareVisibility(o,history.flatMap(r=>r.observations),business),researchId:r.id}))).slice(0,30),history:history.map(r=>({id:r.id,createdAt:r.createdAt,query:r.query,receipt:r.receipt,observationCount:r.observations.length})).slice(0,20),analyses:rows.filter(r=>r.payload.workflow==='ai-visibility-analysis/v1'&&executions.some(e=>e.id===r.execution_id&&e.state==='completed')).slice(-10).reverse().map(r=>({id:r.id,executionId:r.execution_id,createdAt:r.created_at,analysis:analysisSchema.parse(r.payload.analysis),assessment:r.payload.assessment?visibilityAssessmentSchema.parse(r.payload.assessment):null,evidenceIds:r.payload.evidenceIds})),failures:rows.filter(r=>r.payload.workflow==='intelligence-failure/v1'&&r.payload.visibility===true).slice(-5).map(r=>({id:r.id,diagnostic:r.payload.diagnostic,receipt:r.payload.receipt})),paidExecutionAutomatic:false,publishingEnabled:false};
}
export async function reviewVisibility(db:SupabaseClient,tenant:string,actor:string,quote:VisibilityQuote,expectedHash:string,decision:'approved'|'deferred'|'rejected',note:string){
 scope(tenant);if(quote.hash!==expectedHash)throw new MarketingError(409,'The research quote changed. Review it again.');
 const rows=await intelligenceRecords(db,tenant),id=stableId(quote.planId+':visibility-decision:'+quote.hash),existing=visibilityDecision(rows,quote);
 if(existing){if(existing.actor_id===actor&&existing.payload.decision===decision&&existing.payload.note===note)return {id,reused:true};throw new MarketingError(409,'This quote already has an immutable owner decision. Prepare a new strategy to reconsider.');}
 const r=await db.from('marketing_artifacts').insert({id,tenant_id:tenant,kind:'approval',parent_id:quote.planId,actor_id:actor,title:'AI visibility research '+decision,payload:{domain,workflow:'ai-visibility-approval/v1',quoteHash:quote.hash,decision,note,maximumRequests:quote.requests.length,maximumCostUsd:quote.maximumCostUsd,modelExecutionAuthorized:false,publishingAuthorized:false}});
 if(r.error)throw new MarketingError(409,'The decision could not be saved. Refresh before trying again.');return {id,reused:false};
}
export async function collectVisibility({db,tenant,actor,quote,expectedHash,authorize,provider=visibilityProvider({login:process.env.DATAFORSEO_LOGIN!,password:process.env.DATAFORSEO_PASSWORD!,target:dataForSeoTarget()})}:{db:SupabaseClient;tenant:string;actor:string;quote:VisibilityQuote;expectedHash:string;authorize:()=>Promise<void>;provider?:ReturnType<typeof visibilityProvider>}){
 scope(tenant);await authorize();if(!visibilityCapabilities().researchEnabled)throw new MarketingError(503,'AI visibility purchases are disabled. No provider request was sent.');
 if(quote.hash!==expectedHash)throw new MarketingError(409,'Review the current research quote first.');
 const original=await intelligenceRecords(db,tenant),decision=visibilityDecision(original,quote);if(decision?.payload.decision!=='approved')throw new MarketingError(403,'This exact research quote needs owner approval.');
 const accountScope=providerScope(tenant),completed:string[]=[];
 for(const request of quote.requests){
  await authorize();const rows=await intelligenceRecords(db,tenant),requestId=stableId(decision.id+':'+identity(request)),resultId=stableId(requestId+':result');
  const old=rows.find(r=>r.id===requestId),saved=savedVisibility(rows);
  if(old){if(old.payload.scope!==accountScope)throw new MarketingError(409,'This quote belongs to a different provider account. Prepare a new strategy.');if(saved.some(s=>s.id===resultId&&s.scope===accountScope)){completed.push(resultId);continue;}throw new MarketingError(409,'This request is failed or uncertain. No retry was started.');}
  const cached=saved.find(s=>s.scope===accountScope&&identity(s.query)===identity(request)&&Date.parse(s.createdAt)+86400000>Date.now());
  if(cached){completed.push(cached.id);continue;}
  const now=new Date(),query={...request,seeds:[request.question],service:request.offeringId,mode:visibilityMode(request),target:quote.target};
  await claimResearchBudget({db,tenant,actor,requestId,query,scope:accountScope,reservedMaximumUsd:request.maximumCostUsd,rows,now,approvalRequired:true});
  let receipt:unknown=null;
  try{
   await authorize();const result=await provider.collect(request,AbortSignal.timeout(125000));receipt=result.receipt;await authorize();
   const write=await db.from('marketing_artifacts').insert({id:resultId,tenant_id:tenant,kind:'measurement',parent_id:requestId,actor_id:actor,title:'AI visibility: '+request.platform,payload:{domain,workflow:'intelligence-ai-observation/v1',state:'completed',planId:quote.planId,quoteHash:quote.hash,query:request,scope:accountScope,observations:result.observations,receipt:result.receipt}});
   if(write.error)throw new MarketingError(503,'Provider completed but persistence failed. Review the request before any further action.');completed.push(resultId);
   // One paid provider task per intentional owner action; resume only unclaimed steps.
   return {researchIds:completed,remainingRequests:quote.requests.length-completed.length,reused:false};
  }catch(error){const failure=await db.from('marketing_artifacts').insert({id:stableId(requestId+':failure'),tenant_id:tenant,kind:'measurement',parent_id:requestId,actor_id:actor,title:'AI visibility request failed',payload:{domain,workflow:'intelligence-failure/v1',visibility:true,query,receipt:error instanceof DataForSeoError?error.receipt:receipt,diagnostic:dataForSeoFailureDiagnostic(error,requestId,visibilityMode(request),error instanceof DataForSeoError?error.receipt:null)}});if(failure.error)throw new MarketingError(503,'Research failed and its diagnostic could not be saved. Inspect provider history; do not retry.');throw error;}
 }
 return {researchIds:completed,remainingRequests:0,reused:completed.every(id=>original.some(r=>r.id===id))};
}
export function visibilityAnalysisEvidence(rows:Artifact[],q:VisibilityQuote,asOf=new Date()){
 const allowed=savedVisibility(rows).filter(r=>r.scope===providerScope(marketingTenant)&&Date.parse(r.createdAt)+86400000>asOf.getTime()&&Date.parse(r.receipt.expiresAt)>asOf.getTime()&&q.requests.some(request=>identity(request)===identity(r.query)));
 if(q.requests.some(request=>!allowed.some(r=>identity(request)===identity(r.query))))throw new MarketingError(409,'Collect all approved observations before analyzing.');
 const groups=q.requests.map(request=>allowed.filter(r=>identity(r.query)===identity(request)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,1).flatMap(r=>r.observations));
 const selected:VisibilityObservation[]=[];for(let index=0;selected.length<6&&groups.some(g=>g[index]);index++)for(const group of groups){if(group[index]&&selected.length<6)selected.push(group[index]);}
 return {observations:selected,availableCount:groups.reduce((n,g)=>n+g.length,0),documents:visibilityEvidence(selected,asOf.toISOString())};
}
