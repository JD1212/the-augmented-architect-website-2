import 'server-only';
import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {analysisSchema,type SeoResult,type UsageReceipt,type Progress} from '@augmented-architect/seo-analyst';
import {MarketingError,marketingTenant} from '../config';
import {seoRegistration,seoRegistrationScope,seoPolicy} from './config';
import {usageSummary,type SeoPanelData,type SeoRun,type EvidenceUse} from './contracts';
import type {ReportSnapshot} from './tools';
import {loadBacklog} from '../opportunities/repository';
import {reconcileFinding,materiallyChanged,measuredEvidenceChanged} from '../opportunities/identity';
import type {Opportunity} from '../opportunities/contracts';

type AgentRow={id:string;tenant_id:string;name:string;version:string;enabled:boolean;config:Record<string,unknown>};
type Lease={id:string;expiresAt:string};
function fail(message='SEO Analyst storage is temporarily unavailable.'):never{throw new MarketingError(503,message);}
function uuid(value:string){const h=createHash('sha256').update(value).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
export function assertExecutionScope(tenantId:string){if(tenantId!==marketingTenant)throw new MarketingError(403,'This workspace is not authorized for SEO analysis.');}
export function leaseDecision(config:Record<string,unknown>,id:string,now=new Date()){
  const lease=config.lease as Lease|undefined;
  if(lease&&Date.parse(lease.expiresAt)>now.getTime())throw new MarketingError(409,'An SEO analysis is already running. Refresh its progress instead of starting another.');
  const starts=Array.isArray(config.recentStarts)?config.recentStarts.filter((s):s is string=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&Date.parse(s)>now.getTime()-86400000):[];
  if(starts.some(s=>Date.parse(s)>now.getTime()-seoPolicy.minimumIntervalMs))throw new MarketingError(429,'Please allow ten minutes between analyses.');
  if(starts.length>=seoPolicy.maximumDailyRuns)throw new MarketingError(429,'The six-analysis daily execution budget has been reached.');
  return {...config,recentStarts:[...starts,now.toISOString()],lease:{id,expiresAt:new Date(now.getTime()+seoPolicy.leaseMs).toISOString()}};
}
export function createSeoStore(db:SupabaseClient,tenantId:string){
  assertExecutionScope(tenantId);
  let executionActor:string|undefined;
  let executionEvidence:unknown;
  function evidenceContext(selection:unknown){executionEvidence=selection;}
  type Assignment={objective:string;mode:'research_plan'|'analysis';researchWorkflow?:import('../intelligence/workflow-binding').ResearchBinding};
  let executionAssignment:Assignment|undefined;
  async function findAgent():Promise<AgentRow|null>{const r=await db.from('marketing_agents').select('id,tenant_id,name,version,enabled,config').eq('tenant_id',tenantId).eq('name',seoRegistration.name).order('created_at',{ascending:false}).limit(1).maybeSingle();if(r.error)fail();return r.data as AgentRow|null;}
  async function register():Promise<AgentRow>{
    const existing=await findAgent();
    if(existing){
      if(existing.version===seoRegistration.version)return existing;
      const numeric=(version:string)=>version.split('.').map(Number);
      const current=numeric(existing.version),requested=numeric(seoRegistration.version);
      const difference=current.map((v,i)=>v-requested[i]).find(v=>v!==0)??0;
      if(difference>0)throw new MarketingError(409,'A newer SEO Analyst version is registered. Open the latest workspace deployment.');
      // Keep the stable identity, disable flag, lease and rate-limit history across package upgrades.
      const upgraded=await db.from('marketing_agents').update({version:seoRegistration.version,instructions_version:seoRegistration.instructions_version}).eq('id',existing.id).eq('tenant_id',tenantId).eq('version',existing.version).select('id,tenant_id,name,version,enabled,config').maybeSingle();
      if(upgraded.error)fail();if(upgraded.data)return upgraded.data as AgentRow;
      const latest=await findAgent();if(latest?.version===seoRegistration.version)return latest;
      throw new MarketingError(409,'The agent registration changed. Refresh before running analysis.');
    }
    const r=await db.from('marketing_agents').insert({tenant_id:tenantId,...seoRegistration,config:{slug:'seo-analyst',executionMode:'manual',runtime:'OpenAI Agents SDK',sourceRepository:'JD1212/augarch-seo-analyst',recentStarts:[],readOnly:true,...(seoRegistrationScope?{registrationScope:seoRegistrationScope}:{})}}).select('id,tenant_id,name,version,enabled,config').single();
    if(r.error){if(r.error.code==='23505'){const found=await findAgent();if(found)return found;}fail();}return r.data as AgentRow;
  }
  async function claim(id:string,actorId:string,days:number,assignment?:Assignment){
    executionActor=actorId;executionAssignment=assignment;
    const agent=await register();if(!agent.enabled)throw new MarketingError(403,'SEO Analyst has been disabled by the workspace administrator.');
    const existing=await db.from('marketing_executions').select('id,state,diagnostics').eq('id',id).eq('tenant_id',tenantId).eq('agent_id',agent.id).maybeSingle();if(existing.error)fail();if(existing.data){if(assignment&&JSON.stringify(existing.data.diagnostics?.assignment)!==JSON.stringify(assignment))throw new MarketingError(409,'Execution ID belongs to a different objective or mode.');return {agent,reused:true};}
    const next=leaseDecision(agent.config,id);
    // JSONB compare-and-swap is atomic across Vercel instances. No broad database grants or new lock tables.
    const claimed=await db.from('marketing_agents').update({config:next}).eq('id',agent.id).eq('tenant_id',tenantId).eq('enabled',true).eq('config',JSON.stringify(agent.config)).select('id').maybeSingle();
    if(claimed.error)fail();if(!claimed.data)throw new MarketingError(409,'Another analysis claimed this workspace. Refresh to see its status.');
    const stale=agent.config.lease as Lease|undefined;
    if(stale)await db.from('marketing_executions').update({state:'failed',finished_at:new Date().toISOString(),diagnostics:{stage:'failed',error:'The previous execution exceeded its lease. No automatic retry was started.'}}).eq('id',stale.id).eq('tenant_id',tenantId).eq('agent_id',agent.id).eq('state','running');
    const created=await db.from('marketing_executions').insert({id,tenant_id:tenantId,agent_id:agent.id,state:'running',started_at:new Date().toISOString(),usage:usageSummary([]),diagnostics:{stage:'starting',actorId,days,packageVersion:seoRegistration.version,...(assignment?{assignment}:{})}});
    if(created.error){await release(agent.id,id);fail();}return {agent,reused:false};
  }
  async function release(agentId:string,id:string){
    const current=await findAgent();if(!current||current.id!==agentId||(current.config.lease as Lease|undefined)?.id!==id)return;
    const next={...current.config};delete next.lease;
    const r=await db.from('marketing_agents').update({config:next}).eq('id',agentId).eq('tenant_id',tenantId).eq('config',JSON.stringify(current.config));if(r.error)fail();
  }
  async function progress(id:string,stage:Progress['stage'],receipts:UsageReceipt[]){
    const r=await db.from('marketing_executions').update({usage:usageSummary(receipts),diagnostics:{stage,...(executionEvidence?{evidenceSelection:executionEvidence}:{}),...(executionAssignment?{assignment:executionAssignment}:{}),actorId:executionActor,packageVersion:seoRegistration.version}}).eq('id',id).eq('tenant_id',tenantId).eq('state','running');if(r.error)fail();
  }
  async function complete(id:string,result:SeoResult,snapshots:ReportSnapshot[],actorId:string,evidenceSelection?:unknown){
    // The existing tenant execution lease serializes reconciliation and persistence.
    // Read every accepted identity, including decisions omitted from bounded model context.
    const backlog=await loadBacklog(db,tenantId),working=backlog.opportunities;
    const reportIds=new Map<string,string>();
    for(const s of snapshots){const reportId=uuid(id+':'+s.source),r=await db.from('marketing_reports').upsert({id:reportId,tenant_id:tenantId,source:s.source,property_id:s.propertyId,start_date:s.range.start,end_date:s.range.end,extracted_at:s.retrievedAt,payload:s.data},{onConflict:'id'});if(r.error)fail();reportIds.set(s.evidenceId,reportId);}
    const bundleId=uuid(id+':evidence');
    const bundle=await db.from('marketing_artifacts').upsert({id:bundleId,tenant_id:tenantId,kind:'measurement',title:'SEO research evidence bundle',execution_id:id,actor_id:actorId,payload:{...(executionAssignment?.researchWorkflow?{researchWorkflow:executionAssignment.researchWorkflow}:{}),...(evidenceSelection?{evidenceSelection}:{}),documents:result.evidence,analysis:result.analysis,packageVersion:result.packageVersion,instructionsVersion:result.instructionsVersion,readOnly:true,requiresOwnerReview:true}},{onConflict:'id'});if(bundle.error)fail();
    for(const o of result.analysis.opportunities){
      const matched=reconcileFinding(o,working);
      const previousBundle=matched.opportunity?.observations?.at(-1)?.evidenceArtifactId;
      if(matched.opportunity&&!materiallyChanged(o,matched.opportunity.finding)&&!measuredEvidenceChanged(o,result.evidence,previousBundle?backlog.evidence[previousBundle]??[]:[]))continue;
      const opportunityId=matched.opportunity?.id??uuid(id+':opportunity:'+o.priority),recommendationId=uuid(id+':recommendation:'+o.priority);
      if(!matched.opportunity){
        const opportunity=await db.from('marketing_artifacts').insert({id:opportunityId,tenant_id:tenantId,kind:'opportunity',title:o.title,execution_id:id,actor_id:actorId,payload:{...o,...(executionAssignment?.researchWorkflow?{researchWorkflow:executionAssignment.researchWorkflow}:{}),evidenceArtifactId:bundleId,requiresOwnerReview:true}});if(opportunity.error)fail();
        working.push({id:opportunityId,finding:o} as Opportunity);
      }else matched.opportunity.finding=o;
      const recommendation=await db.from('marketing_artifacts').insert({id:recommendationId,tenant_id:tenantId,kind:'recommendation',title:o.title,execution_id:id,parent_id:opportunityId,actor_id:actorId,payload:{...o,...(executionAssignment?.researchWorkflow?{researchWorkflow:executionAssignment.researchWorkflow}:{}),evidenceArtifactId:bundleId,requiresOwnerReview:true,continuity:{version:1,reason:matched.reason,previousFindingId:matched.opportunity?.findingId??null}}});if(recommendation.error)fail();
      // Google rows anchor measured/empty report context. External sources remain explicit research documents in the bundle.
      const links=[...reportIds].map(([evidenceId,reportId])=>({tenant_id:tenantId,artifact_id:recommendationId,report_id:reportId,observation:{kind:'report_context',evidenceId,status:result.evidence.find(e=>e.id===evidenceId)?.status,externalEvidenceArtifactId:bundleId,doesNotProveDemand:true}}));
      if(links.length){const e=await db.from('marketing_evidence').upsert(links,{onConflict:'tenant_id,artifact_id,report_id'});if(e.error)fail();}
    }
    const done=await db.from('marketing_executions').update({state:'completed',finished_at:new Date().toISOString(),usage:usageSummary(result.usage),diagnostics:{stage:'completed',...(executionAssignment?.researchWorkflow?{researchWorkflow:executionAssignment.researchWorkflow}:{}),packageVersion:result.packageVersion,instructionsVersion:result.instructionsVersion,actorId,opportunities:result.analysis.opportunities.length,...(evidenceSelection?{evidenceSelection}:{})}}).eq('id',id).eq('tenant_id',tenantId).eq('state','running').select('id').single();if(done.error)fail();
  }
  async function failed(id:string,receipts:UsageReceipt[],message:string,failure?:{kind:string;status:number|null;code?:string|null;param?:string|null;phase?:string;validation?:unknown;research?:unknown}){const r=await db.from('marketing_executions').update({state:'failed',finished_at:new Date().toISOString(),usage:usageSummary(receipts),diagnostics:{stage:'failed',...(executionEvidence?{evidenceSelection:executionEvidence}:{}),...(executionAssignment?{assignment:executionAssignment}:{}),actorId:executionActor,packageVersion:seoRegistration.version,error:message,failure}}).eq('id',id).eq('tenant_id',tenantId).eq('state','running');if(r.error)fail();}
  async function completePlan(id:string,receipts:UsageReceipt[],assignment:{objective:string;mode:'research_plan'}){
    const result=await db.from('marketing_executions').update({state:'completed',finished_at:new Date().toISOString(),usage:usageSummary(receipts),diagnostics:{stage:'completed',kind:'research_plan',assignment,actorId:executionActor,packageVersion:seoRegistration.version}}).eq('id',id).eq('tenant_id',tenantId).eq('state','running').select('id').single();if(result.error)fail();
  }
  return {findAgent,register,claim,release,progress,complete,completePlan,failed,evidenceContext};
}
export async function readSeoPanel(db:SupabaseClient,tenantId:string):Promise<SeoPanelData>{
  assertExecutionScope(tenantId);const store=createSeoStore(db,tenantId),agent=await store.findAgent();
  const base={agent:agent?{id:agent.id,enabled:agent.enabled,version:agent.version}:null,policy:{minimumIntervalMinutes:10,maximumDailyRuns:6}};
  if(!agent)return {...base,runs:[],analysis:null,evidence:[],analysisExecutionId:null};
  const r=await db.from('marketing_executions').select('id,state,created_at,started_at,finished_at,usage,diagnostics').eq('tenant_id',tenantId).eq('agent_id',agent.id).order('created_at',{ascending:false}).limit(12);if(r.error)fail();
  const runs=(r.data??[]).map(row=>({...row,...(row.state==='running'&&row.started_at&&Date.now()-Date.parse(row.started_at)>seoPolicy.leaseMs?{state:'interrupted'}:{}),stage:typeof row.diagnostics?.stage==='string'?row.diagnostics.stage:'unknown',error:typeof row.diagnostics?.error==='string'?row.diagnostics.error:null,diagnostics:undefined})) as SeoRun[];
  const completed=runs.find(run=>run.state==='completed'&&!(r.data??[]).find(row=>row.id===run.id)?.diagnostics?.kind);if(!completed)return {...base,runs,analysis:null,evidence:[],analysisExecutionId:null};
  const bundle=await db.from('marketing_artifacts').select('payload').eq('tenant_id',tenantId).eq('execution_id',completed.id).eq('kind','measurement').maybeSingle();if(bundle.error)fail();
  const parsed=analysisSchema.safeParse(bundle.data?.payload?.analysis);
  const use=bundle.data?.payload?.evidenceSelection as EvidenceUse|undefined;
  const evidenceUsage=use&&['savedCount','eligibleCount','includedCount'].every(k=>Number.isSafeInteger(use[k as keyof EvidenceUse]))&&typeof use.consumed==='boolean'&&Array.isArray(use.citedByFindings)?use:null;
  return {...base,runs,evidenceUsage,analysis:parsed.success?parsed.data:null,evidence:Array.isArray(bundle.data?.payload?.documents)?bundle.data.payload.documents:[],analysisExecutionId:completed.id};
}
