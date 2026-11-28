import {articleBriefHistory,currentBriefApproved,briefHash} from './brief-records';
import {seoBriefSchema} from '@augmented-architect/content-strategist';
import {analysisSchema,safeSource,type SeoConfig} from '@augmented-architect/seo-analyst';
import type {Artifact,Backlog,Finding,Opportunity,Review,ReviewStatus} from './contracts';
import {nextReviewStatus} from './contracts';
import {opportunityPublications} from './publications';
import {reviewSlot,topicCluster} from './identity';
type Execution={id:string;agent_id:string;state:string};
export function projectBacklog(artifacts:Artifact[],executions:Execution[]):Backlog {
  const completed=new Map(executions.filter(e=>e.state==='completed').map(e=>[e.id,e])),evidence:Backlog['evidence']={};
  for(const a of artifacts)if(a.kind==='measurement'&&a.execution_id&&completed.has(a.execution_id)&&Array.isArray(a.payload.documents))evidence[a.id]=a.payload.documents as Backlog['evidence'][string];
  const finding=(a:Artifact):Finding=>{const p=analysisSchema.shape.opportunities.element.safeParse(Object.fromEntries(Object.keys(analysisSchema.shape.opportunities.element.shape).filter(k=>k in a.payload).map(k=>[k,a.payload[k]])));if(!p.success||p.data.sourceUrls.some(url=>!safeSource(url)))throw Error('Stored opportunity is invalid; continuity cannot omit it.');return p.data;};
  const opportunities:Opportunity[]=artifacts.filter(a=>a.kind==='opportunity'&&a.execution_id&&completed.has(a.execution_id)).map(root=>{
    const observations=artifacts.filter(a=>a.kind==='recommendation'&&a.parent_id===root.id&&a.execution_id&&completed.has(a.execution_id)).map(a=>({id:a.id,executionId:a.execution_id!,createdAt:a.created_at,finding:finding(a),researchWorkflow:a.payload.researchWorkflow as import('../intelligence/workflow-binding').ResearchBinding|undefined,evidenceArtifactId:String(a.payload.evidenceArtifactId??'')})).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
    const first={id:root.id,executionId:root.execution_id!,createdAt:root.created_at,finding:finding(root),researchWorkflow:root.payload.researchWorkflow as import('../intelligence/workflow-binding').ResearchBinding|undefined,evidenceArtifactId:String(root.payload.evidenceArtifactId??'')};
    if(!observations.length)observations.push(first);
    const briefHistory=articleBriefHistory(artifacts,root.tenant_id,root.id),ownerBrief=briefHistory.at(-1);
    const latest=observations.at(-1)!;let status:ReviewStatus='pending',reviewId:string|null=null;const reviews:Review[]=[];
    const decisions=artifacts.filter(a=>a.kind==='approval'&&a.parent_id===root.id&&['seo-opportunity-review/v1','seo-opportunity-review/v2'].includes(String(a.payload.workflow)));
    for(let i=0;i<=decisions.length;i++){
      const decision=decisions.find(a=>a.id===reviewSlot(root.tenant_id,root.id,reviewId));if(!decision)break;
      const p=decision.payload,action=p.action as Review['action'],next=nextReviewStatus(status,action,reviews.at(-1)?.previousStatus);
      if(!next||p.previousReviewId!==reviewId||p.status!==next||!decision.actor_id||!observations.some(o=>o.id===p.findingId))throw Error('Invalid opportunity review chain.');
      const snapshot=p.ownerBrief as import('./article-brief').ArticleBriefRevision|undefined,approvedBrief=snapshot?briefHistory.find(b=>b.id===snapshot.id&&b.hash===snapshot.hash&&b.findingId===p.findingId&&briefHash(snapshot.content)===b.hash):undefined;
      if(snapshot&&!approvedBrief)throw Error('Invalid approved owner brief.');
      reviews.push({...(approvedBrief?{ownerBrief:approvedBrief}:{}),...(p.researchWorkflow?{researchWorkflow:p.researchWorkflow as import('../intelligence/workflow-binding').ResearchBinding}:{}),...(p.seoBrief?{seoBrief:seoBriefSchema.parse(p.seoBrief)}:{}),id:decision.id,action,status:next,previousStatus:status,note:String(p.note??''),actorId:decision.actor_id,createdAt:decision.created_at,previousReviewId:reviewId,findingId:String(p.findingId),deliverable:p.deliverable as Review['deliverable'],requestId:String(p.requestId)});status=next;reviewId=decision.id;
    }
    const publicationStates=opportunityPublications(artifacts,root.id),approvedFinding=[...reviews].reverse().find(r=>r.action==='approve')?.findingId;
    const canComplete=currentBriefApproved({ownerBrief,reviews})&&status==='approved_for_drafting'&&approvedFinding===latest.id&&publicationStates.some(p=>p.environment==='production'&&p.live&&p.sourceFindingId===approvedFinding&&(!ownerBrief||artifacts.some(a=>a.id===p.revisionId&&(a.payload.input as {assignment?:{approvalId?:string}}|undefined)?.assignment?.approvalId===reviews.filter(r=>r.action==='approve').at(-1)?.id)));
    const linked=artifacts.filter(a=>a.parent_id===root.id&&['content_draft','published_change','outcome'].includes(a.kind));
    return {ownerBrief,briefHistory,id:root.id,tenantId:root.tenant_id,sourceAgentId:completed.get(root.execution_id!)!.agent_id,executionId:root.execution_id!,createdAt:root.created_at,updatedAt:[latest.createdAt,...reviews.map(r=>r.createdAt)].sort().at(-1)!,status,findingId:latest.id,finding:latest.finding,reviews,reviewId,topic:topicCluster(root.tenant_id,first.finding),evidenceLevel:['actual_search_data','mixed'].includes(latest.finding.basis)?'observed_search':'external_research',observations,publicationStates,canComplete,publishedUrls:publicationStates.flatMap(p=>p.url?[p.url]:[]),linkedDeliverables:linked.filter(a=>a.kind!=='outcome').map(a=>({id:a.id,kind:a.kind,title:a.title})),outcomes:linked.filter(a=>a.kind==='outcome').map(a=>({id:a.id,title:a.title,payload:a.payload}))};
  });
  return {opportunities:opportunities.sort((a,b)=>a.finding.priority-b.finding.priority||b.updatedAt.localeCompare(a.updatedAt)),evidence};
}
export function historicalContext(opportunities:Opportunity[]):NonNullable<SeoConfig['history']>{
  const sorted=[...opportunities].sort((a,b)=>Number(['rejected','deferred','archived'].includes(b.status))-Number(['rejected','deferred','archived'].includes(a.status))||b.updatedAt.localeCompare(a.updatedAt));
  const selected:NonNullable<SeoConfig['history']>['opportunities']=[];
  for(const o of sorted){if(selected.length===20)break;const entry={id:o.id,status:o.status,title:o.finding.title,targetCustomer:o.finding.targetCustomer.slice(0,400),recommendedAction:o.finding.recommendedAction.slice(0,500),searchIntent:o.finding.searchIntent.slice(0,300),ownerNote:(o.reviews.at(-1)?.note??'').slice(0,300),publishedUrls:o.publishedUrls.slice(0,3)};if(new TextEncoder().encode(JSON.stringify([...selected,entry])).length>15000)continue;selected.push(entry);}
  return {opportunities:selected,omittedCount:sorted.length-selected.length,knownLimitations:['Processed reports may be empty or delayed. External research does not measure this business’s search demand.','History is bounded; the host reconciles against the entire authorized backlog, including omitted entries.']};
}
