import type {Analysis,Evidence,ContentAssignment} from '@augmented-architect/seo-analyst';
export type Finding=Analysis['opportunities'][number];
export type ReviewStatus='pending'|'approved_for_drafting'|'deferred'|'rejected'|'completed';
export type ReviewAction='approve'|'defer'|'reject'|'reopen';
export type Deliverable='article'|'landing_page'|'existing_page_update'|'technical_guide';
export type Artifact={id:string;tenant_id:string;kind:string;title:string;payload:Record<string,unknown>;execution_id:string|null;parent_id:string|null;actor_id:string|null;created_at:string};
export type Review={id:string;action:ReviewAction;status:ReviewStatus;note:string;actorId:string;createdAt:string;previousReviewId:string|null;findingId:string;deliverable:Deliverable;requestId:string};
export type Opportunity={id:string;tenantId:string;sourceAgentId:string;executionId:string;createdAt:string;updatedAt:string;status:ReviewStatus;findingId:string;finding:Finding;reviews:Review[];reviewId:string|null;observations:{id:string;executionId:string;createdAt:string;finding:Finding;evidenceArtifactId:string}[];publishedUrls:string[];linkedDeliverables:{id:string;kind:string;title:string}[];outcomes:{id:string;title:string;payload:Record<string,unknown>}[];};
export type Backlog={opportunities:Opportunity[];evidence:Record<string,Evidence[]>};
export type OpportunityDetail={opportunity:Opportunity;evidence:Evidence[];assignment:ContentAssignment|null};
export type ReviewCommand={opportunityId:string;requestId:string;expectedReviewId:string|null;action:ReviewAction;note:string;deliverable:Deliverable;expectedFindingId:string};
export const reviewLabels:Record<ReviewStatus,string>={pending:'Needs review',approved_for_drafting:'Approved for drafting',deferred:'Deferred',rejected:'Rejected',completed:'Completed'};
export function nextReviewStatus(status:ReviewStatus,action:ReviewAction):ReviewStatus|null {
  if(action==='reopen')return status==='deferred'||status==='rejected'?'pending':null;
  if(!['pending','approved_for_drafting'].includes(status))return null;
  return action==='approve'?'approved_for_drafting':action==='defer'?'deferred':action==='reject'?'rejected':null;
}
