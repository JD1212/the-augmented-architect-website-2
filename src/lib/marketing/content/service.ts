import 'server-only';
import OpenAI from 'openai';
import {OpenAIProvider} from '@openai/agents';
import {runContentStrategist,validateDraft,type Receipt,type ContentDraft} from '@augmented-architect/content-strategist';
import type {SupabaseClient} from '@supabase/supabase-js';
import {requireOwner} from '../auth';
import {MarketingError,marketingTenant} from '../config';
import {loadBacklog,marketingRows} from '../opportunities/repository';
import {intelligenceRecords} from '../intelligence/service';
import {usageSummary} from '../seo/contracts';
import {contentConfiguration,contentDatabase,contentCapabilities,contentDomain} from './config';
import {groundedOpportunity,contentInput} from './grounding';
import {contentRows,revisionHead,revisions,saveRevision,claimContentExecution,releaseContentExecution,approvedRevision,type Revision} from './repository';
export async function contentState(db:SupabaseClient,tenant:string,opportunityId:string){
 if(tenant!==marketingTenant)throw new MarketingError(403,'Unauthorized content workspace.');
 const [backlog,research,rows,runs]=await Promise.all([loadBacklog(db,tenant),intelligenceRecords(db,tenant),contentRows(db,tenant),marketingRows(db,'marketing_executions',tenant)]);
 const opportunity=backlog.opportunities.find(o=>o.id===opportunityId);if(!opportunity)throw new MarketingError(404,'Opportunity not found.');
 const visible=rows.filter(r=>r.kind!=='content_draft'||!r.execution_id||runs.some(e=>e.id===r.execution_id&&e.state==='completed'));
 const grounding=groundedOpportunity(opportunity,backlog,research),head=revisionHead(visible,opportunityId);
 const related=revisions(visible,opportunityId),ids=new Set(related.map(r=>r.id));
 return {opportunity:{id:opportunity.id,title:opportunity.finding.title,status:opportunity.status,findingId:opportunity.findingId},grounding,head,revisions:related,capabilities:contentCapabilities(),approvals:rows.filter(r=>r.payload.workflow==='content-publication-approval/v1'&&r.parent_id&&ids.has(r.parent_id)),feedback:rows.filter(r=>r.payload.workflow==='content-feedback/v1'&&r.parent_id&&ids.has(r.parent_id)),publications:rows.filter(r=>r.kind==='published_change'&&r.parent_id===opportunityId),runs:runs.filter(r=>(r.diagnostics as {opportunityId?:string})?.opportunityId===opportunityId&&(r.diagnostics as {agentKind?:string})?.agentKind==='content-strategist').slice(-10).reverse(),automaticPublishingEnabled:false};
}
export async function findRevision(db:SupabaseClient,tenant:string,id:string,opportunityId:string){const state=await contentState(db,tenant,opportunityId);const revision=state.revisions.find(r=>r.id===id);if(!revision)throw new MarketingError(404,'Completed draft revision not found.');return {state,revision};}
export function validateEditedDraft(draft:unknown,revision:Revision):ContentDraft{try{return validateDraft(draft,revision.input);}catch(error){const rule=error instanceof Error&&/^[A-Z_]+/.test(error.message)?error.message.match(/^[A-Z_]+/)![0]:'INVALID_CONTENT_PACKAGE';throw new MarketingError(400,'Draft validation failed: '+rule+'. Review the content and citation map before saving.');}}
export async function generateContent(owner:Awaited<ReturnType<typeof requireOwner>>,requestId:string,opportunityId:string,expectedRevisionId:string|null,signal:AbortSignal){
 const config=contentConfiguration(),state=await contentState(owner.db,owner.tenantId,opportunityId);
 if((state.head?.id??null)!==expectedRevisionId)throw new MarketingError(409,'Refresh the current draft before generating.');
 if(!state.grounding.assignment)throw new MarketingError(403,'The owner must approve this finding for drafting first.');
 if(state.grounding.sources.filter(s=>s.verified).length<2)throw new MarketingError(409,'Review at least two relevant primary sources before model execution.');
 const input=contentInput(state.grounding,config.model);input.context.editorialFeedback=state.feedback.slice(-10).map(r=>String(r.payload.note));input.context.priorDraft=state.head?JSON.stringify(state.head.draft):null;
 const db=contentDatabase(),claim=await claimContentExecution(db,owner.tenantId,owner.user.id,requestId,config.approvalId,opportunityId);if(claim.reused)return {executionId:requestId,reused:true};
 const usage:Receipt[]=[],diagnostics={agentKind:'content-strategist',approvalId:config.approvalId,opportunityId,actorId:owner.user.id,assignmentApprovalId:input.assignment.approvalId,sourceFindingId:input.assignment.findingId};let stage='starting';
 const progress=async(next:string,stateValue='running',extra:Record<string,unknown>={})=>{stage=next;const r=await db.from('marketing_executions').update({state:stateValue,usage:usageSummary(usage.map(r=>({...r,purpose:'analysis' as const,webSearchCalls:0}))),diagnostics:{...diagnostics,stage:next,...extra},...(stateValue!=='running'?{finished_at:new Date().toISOString()}:{})}).eq('id',requestId).eq('tenant_id',owner.tenantId).eq('state','running');if(r.error)throw new MarketingError(503,'Execution progress could not be persisted.');};
 const authorize=async()=>{const now=await requireOwner(owner.db);if(now.user.id!==owner.user.id||now.tenantId!==owner.tenantId)throw new MarketingError(403,'Owner access changed.');const latest=await loadBacklog(owner.db,owner.tenantId);const selected=latest.opportunities.find(o=>o.id===opportunityId);if(selected?.status!=='approved_for_drafting'||selected.reviewId!==input.assignment.approvalId||selected.findingId!==input.assignment.findingId)throw new MarketingError(403,'The drafting approval changed.');signal.throwIfAborted();};
 try{
  await authorize();await progress('grounding');
  const result=await runContentStrategist(input,{authorize,readSource:async(id,s)=>{s.throwIfAborted();await authorize();const source=input.sources.find(s=>s.id===id);if(!source)throw new MarketingError(403,'Unauthorized source.');return source;}},{modelProvider:new OpenAIProvider({openAIClient:new OpenAI({apiKey:config.apiKey,maxRetries:0,timeout:120000}),useResponses:true}),signal,onProgress:p=>progress(p),onUsage:async r=>{usage.push(r);await progress('model');}});
  await authorize();await progress('persistence');
  const revision=await saveRevision(db,owner.tenantId,owner.user.id,opportunityId,expectedRevisionId,result.draft,input,structuredClone(state.grounding) as unknown as Record<string,unknown>,requestId);
  await progress('completed','completed',{revisionId:revision.revisionId,packageVersion:result.packageVersion,instructionsVersion:result.instructionsVersion,sourceIds:result.sourceIds});return {executionId:requestId,...revision};
 }catch(error){const e=error as {status?:unknown;message?:string},rule=/^[A-Z_]+(?: at [a-zA-Z0-9.]+)?$/.test(e.message??'')?e.message:null;await progress('failed','failed',{failure:{phase:stage,rule,httpStatus:typeof e.status==='number'?e.status:null},error:'Content generation did not complete. Returned provider usage is preserved; no automatic retry was started.'});throw new MarketingError(503,'Content generation failed. Review execution history and its redacted diagnostic before any new authorization.');}
 finally{await releaseContentExecution(db,owner.tenantId,claim.agent.id,requestId);}
}
export async function editedRevision(db:SupabaseClient,tenant:string,actor:string,revision:Revision,raw:unknown){const draft=validateEditedDraft(raw,revision);return saveRevision(db,tenant,actor,revision.opportunityId,revision.id,draft,revision.input,revision.grounding,null);}
export function publicationPermission(rows:Awaited<ReturnType<typeof contentRows>>,revision:Revision,channel:'website'|'linkedin',hash:string){if(hash!==revision.hash)throw new MarketingError(409,'Revision hash changed.');const approval=approvedRevision(rows,revision,channel);if(!approval)throw new MarketingError(403,'Approve this exact revision for the selected channel first.');return approval;}
export {contentDomain};
