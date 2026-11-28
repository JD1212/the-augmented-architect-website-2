import type {ArticleBriefRevision} from './article-brief';
import type {ResearchBinding} from '../intelligence/workflow-binding';
import type {ContentInput,SeoBrief} from '@augmented-architect/content-strategist';
type ContentAssignment=ContentInput['assignment'];
import type {Analysis,Evidence} from '@augmented-architect/seo-analyst';
export type Finding=Analysis['opportunities'][number];
export type ReviewStatus='pending'|'approved_for_drafting'|'deferred'|'rejected'|'completed'|'archived';
export type ReviewAction='approve'|'defer'|'reject'|'reopen'|'archive'|'restore'|'complete';
export type Deliverable='article'|'landing_page'|'existing_page_update'|'technical_guide';
export type Artifact={id:string;tenant_id:string;kind:string;title:string;payload:Record<string,unknown>;execution_id:string|null;parent_id:string|null;actor_id:string|null;created_at:string};
export type Review={ownerBrief?:ArticleBriefRevision;researchWorkflow?:ResearchBinding;seoBrief?:SeoBrief;id:string;action:ReviewAction;status:ReviewStatus;previousStatus:ReviewStatus;note:string;actorId:string;createdAt:string;previousReviewId:string|null;findingId:string;deliverable:Deliverable;requestId:string};
export type Opportunity={ownerBrief?:ArticleBriefRevision;briefHistory?:ArticleBriefRevision[];id:string;tenantId:string;sourceAgentId:string;executionId:string;createdAt:string;updatedAt:string;status:ReviewStatus;findingId:string;finding:Finding;reviews:Review[];reviewId:string|null;topic:{id:string;label:string};evidenceLevel:'observed_search'|'external_research';observations:{id:string;executionId:string;createdAt:string;finding:Finding;evidenceArtifactId:string;researchWorkflow?:ResearchBinding}[];publishedUrls:string[];publicationStates:ReturnType<typeof import('./publications').opportunityPublications>;canComplete:boolean;linkedDeliverables:{id:string;kind:string;title:string}[];outcomes:{id:string;title:string;payload:Record<string,unknown>}[];};
export type Backlog={opportunities:Opportunity[];evidence:Record<string,Evidence[]>};
export type OpportunityDetail={opportunity:Opportunity;evidence:Evidence[];assignment:ContentAssignment|null;seoBrief?:SeoBrief;intelligence?:ReturnType<typeof import('../intelligence/scoring').opportunityIntelligence>};
export type ReviewCommand={expectedBriefId?:string|null;expectedBriefHash?:string|null;opportunityId:string;requestId:string;expectedReviewId:string|null;action:ReviewAction;note:string;deliverable:Deliverable;expectedFindingId:string};
export const reviewLabels:Record<ReviewStatus,string>={pending:'Needs review',approved_for_drafting:'Approved for drafting',deferred:'Deferred',rejected:'Rejected',completed:'Completed',archived:'Archived'};
export function nextReviewStatus(status:ReviewStatus,action:ReviewAction,restoreStatus?:ReviewStatus):ReviewStatus|null {
  if(action==='archive')return status!=='archived'?'archived':null;
  if(action==='restore')return status==='archived'&&restoreStatus&&restoreStatus!=='archived'?restoreStatus:null;
  if(action==='reopen')return ['deferred','rejected','completed'].includes(status)?'pending':null;
  if(action==='complete')return status==='approved_for_drafting'?'completed':null;
  if(!['pending','approved_for_drafting'].includes(status))return null;
  return action==='approve'?'approved_for_drafting':action==='defer'?'deferred':action==='reject'?'rejected':null;
}
