import {currentBriefApproved} from './brief-records';
import {searchBrief} from './seo-brief';
import {intelligenceRecords} from '../intelligence/service';
import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketingError,marketingTenant} from '../config';
import {projectBacklog} from './model';
import {reviewSlot} from './identity';
import {nextReviewStatus,type Artifact,type ReviewCommand} from './contracts';
function scope(tenant:string){if(tenant!==marketingTenant)throw new MarketingError(403,'Unauthorized opportunity workspace.');}
export async function marketingRows(db:SupabaseClient,table:'marketing_artifacts'|'marketing_executions',tenant:string,domain?:string){
  scope(tenant);const found:Record<string,unknown>[]=[];
  for(let offset=0;offset<10000;offset+=500){let query=db.from(table).select('*').eq('tenant_id',tenant);if(domain)query=query.eq('payload->>domain',domain);const r=await query.order('created_at').order('id').range(offset,offset+499);if(r.error)throw new MarketingError(503,'Opportunity history is temporarily unavailable.');found.push(...r.data);if(r.data.length<500)return found;}
  throw new MarketingError(503,'Opportunity history needs archival pagination before another analysis. No history was silently omitted.');
}
export async function loadBacklog(db:SupabaseClient,tenant:string){
  const [artifacts,executions]=await Promise.all([marketingRows(db,'marketing_artifacts',tenant),marketingRows(db,'marketing_executions',tenant)]);
  return projectBacklog(artifacts as Artifact[],executions as {id:string;agent_id:string;state:string}[]);
}
export async function saveReview(db:SupabaseClient,tenant:string,actorId:string,command:ReviewCommand){
  scope(tenant);const backlog=await loadBacklog(db,tenant),opportunity=backlog.opportunities.find(o=>o.id===command.opportunityId);
  if(!opportunity)throw new MarketingError(404,'Opportunity not found in this workspace.');
  const reused=opportunity.reviews.find(r=>r.requestId===command.requestId);
  if(reused){if((reused.ownerBrief?.id??null)!==(command.expectedBriefId??null)||(reused.ownerBrief?.hash??null)!==(command.expectedBriefHash??null)||reused.actorId!==actorId||reused.action!==command.action||reused.note!==command.note||reused.deliverable!==command.deliverable||reused.findingId!==command.expectedFindingId||reused.previousReviewId!==command.expectedReviewId)throw new MarketingError(409,'This request ID was already used for a different decision.');return {id:reused.id,reused:true};}
  if(opportunity.reviewId!==command.expectedReviewId||opportunity.findingId!==command.expectedFindingId)throw new MarketingError(409,'This opportunity changed. Refresh before recording a decision.');
  if(command.action==='approve'&&((opportunity.ownerBrief?.id??null)!==(command.expectedBriefId??null)||(opportunity.ownerBrief?.hash??null)!==(command.expectedBriefHash??null)||opportunity.ownerBrief&&opportunity.ownerBrief.findingId!==opportunity.findingId))throw new MarketingError(409,'Save and review the current article brief before approving this exact snapshot.');
  if(command.action==='approve'&&currentBriefApproved(opportunity)&&opportunity.status==='approved_for_drafting'&&opportunity.reviews.filter(r=>r.action==='approve').at(-1)?.findingId===command.expectedFindingId)throw new MarketingError(409,'This finding is already approved for drafting.');
  if(command.action==='complete'&&!opportunity.canComplete)throw new MarketingError(409,'Completion requires a verified live Production publication of the approved current finding.');
  const status=nextReviewStatus(opportunity.status,command.action,opportunity.reviews.at(-1)?.previousStatus);if(!status)throw new MarketingError(409,'This review transition is not available.');
  const id=reviewSlot(tenant,opportunity.id,opportunity.reviewId);
  // The primary key is a deterministic slot for the previous review revision.
  // Concurrent decisions compete for one INSERT; no UPDATE/upsert or last-writer-wins.
  let seoBrief=command.action==='approve'&&opportunity.finding.searchAssessment?searchBrief(opportunity.finding,opportunity.findingId,backlog.evidence[opportunity.observations.at(-1)!.evidenceArtifactId]??[],await intelligenceRecords(db,tenant)):undefined;
  if(seoBrief&&command.action==='approve'&&opportunity.ownerBrief){const b=opportunity.ownerBrief.content;seoBrief={...seoBrief,audience:b.audience,customerProblem:b.problem,recommendedContentType:'new_article',conversionAction:b.cta,limitations:[...seoBrief.limitations,b.limitations].slice(-20)};}
  const workflow=['archive','restore','complete'].includes(command.action)?'seo-opportunity-review/v2':'seo-opportunity-review/v1';
  const r=await db.from('marketing_artifacts').insert({id,tenant_id:tenant,kind:'approval',title:`SEO opportunity: ${status}`,parent_id:opportunity.id,actor_id:actorId,payload:{...(command.action==='approve'&&opportunity.ownerBrief?{ownerBrief:opportunity.ownerBrief}:{}),...(opportunity.observations.find(o=>o.id===command.expectedFindingId)?.researchWorkflow?{researchWorkflow:opportunity.observations.find(o=>o.id===command.expectedFindingId)!.researchWorkflow}:{}),...(seoBrief?{seoBrief,assignmentVersion:2}:{}),workflow,action:command.action,status,note:command.note,previousReviewId:opportunity.reviewId,findingId:opportunity.findingId,deliverable:command.deliverable,requestId:command.requestId,draftOnly:true,publishingAuthorized:false,spendingAuthorized:false}});
  if(r.error){if(r.error.code==='23505'){
    const latest=await loadBacklog(db,tenant),saved=latest.opportunities.find(o=>o.id===opportunity.id)?.reviews.find(v=>v.id===id);
    if((saved?.ownerBrief?.id??null)===(command.expectedBriefId??null)&&(saved?.ownerBrief?.hash??null)===(command.expectedBriefHash??null)&&saved?.requestId===command.requestId&&saved.actorId===actorId&&saved.action===command.action&&saved.note===command.note&&saved.deliverable===command.deliverable&&saved.findingId===command.expectedFindingId)return {id,reused:true};
    throw new MarketingError(409,'Another decision was recorded. Refresh this opportunity.');
  }throw new MarketingError(503,'The decision could not be saved. Retry the same request safely.');}
  return {id,reused:false};
}
