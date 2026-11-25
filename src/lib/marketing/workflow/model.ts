import {opportunityPublications} from '../opportunities/publications';
import type {Backlog,Artifact} from '../opportunities/contracts';
import {revisionHead,approvedRevision} from '../content/repository';
import {workspaceLink,type WorkflowStage,workflowStages} from '../workspace-navigation';
import {executionStatus} from '../execution-status';
export type WorkflowRun={id:string;state:string;started_at?:string|null;created_at?:string;diagnostics?:unknown};
export type WorkflowItem={origin?:'owner-authored';id:string;title:string;priority:number;stage:WorkflowStage;completedStages:WorkflowStage[];status:string;blocker:string|null;next:{label:string;href:string};reviewRequired:boolean;hasDraft:boolean;readyToPublish:boolean;productionLive:boolean;previewLive:boolean;productionStatus:string;destinationStatus:string;updatedAt:string;revisionId:string|null;active:boolean};
export type WorkflowSnapshot={environment:string;destination:string;items:WorkflowItem[];counts:{needsReview:number;draftsToReview:number;readyToPublish:number;productionLive:number;previewLive:number};generatedAt:string};
/** Read projection of existing artifacts. No decisions, execution or reporting requests occur here. */
export function workflowSnapshot(backlog:Backlog,artifacts:Artifact[],runs:WorkflowRun[],options:{environment:string;publishingEnabled:boolean;generationEnabled:boolean;generationOpportunityId?:string|null;now?:number}):WorkflowSnapshot{
 const finished=new Set(runs.filter(r=>r.state==='completed').map(r=>r.id));
 const editorial=artifacts.filter(a=>a.kind!=='content_draft'||!a.execution_id||finished.has(a.execution_id));
 const items=backlog.opportunities.map((o):WorkflowItem=>{
  const head=revisionHead(editorial,o.id),approvedFinding=o.reviews.filter(r=>r.action==='approve').at(-1)?.findingId;
  const topicApproved=['approved_for_drafting','completed'].includes(o.status)&&approvedFinding===o.findingId;
  const draftCurrent=Boolean(head&&head.draft.website&&head.draft.decision!=='request_evidence'&&topicApproved&&head.input.assignment.findingId===approvedFinding),approved=Boolean(head&&approvedRevision(editorial,head,'website'));
  const linkedinNeedsReview=Boolean(head?.draft.linkedin&&!approvedRevision(editorial,head,'linkedin'));
  const linkedinRecorded=Boolean(head&&artifacts.some(a=>a.kind==='published_change'&&a.parent_id===o.id&&a.payload.channel==='linkedin'&&a.payload.revisionId===head.id&&a.payload.revisionHash===head.hash&&a.payload.verification==='owner_attested'));
  const local=o.publicationStates.find(p=>p.environment===options.environment),production=o.publicationStates.find(p=>p.environment==='production');
  const productionLive=Boolean(production?.live),previewLive=o.publicationStates.some(p=>p.environment.startsWith('preview:')&&p.live);
  const currentLive=Boolean(head&&draftCurrent&&((local?.live&&local.revisionId===head.id)||(production?.live&&production.revisionId===head.id)));
  const relatedRuns=runs.filter(r=>(r.diagnostics as {opportunityId?:string})?.opportunityId===o.id).sort((a,b)=>(b.created_at??'').localeCompare(a.created_at??''));
  const latestRun=relatedRuns[0],runState=latestRun?executionStatus(latestRun.state,latestRun.started_at??null,options.now):null;
  let stage:WorkflowStage='discover',status='Needs opportunity review',blocker:string|null=null,label='Review opportunity';
  if(topicApproved){stage='create';status=head?'Draft needs review':'Ready for drafting';label=head?'Review draft':'Open drafting';
   if(!draftCurrent){if(head){status=head.draft.decision==='request_evidence'?'More evidence needed':'Draft needs alignment';blocker=head.draft.decision==='request_evidence'?'Review the saved evidence request before authorizing another draft.':'The saved draft belongs to an earlier approved finding. Review it before requesting a revision.';}else if(runState==='running'){status='Drafting in progress';blocker='Wait for the current execution; do not start another.';}else if(runState==='failed'||runState==='interrupted'){status='Drafting needs attention';blocker='Review the last attempt. A new run needs separate authorization.';}else if(!options.generationEnabled||Boolean(options.generationOpportunityId&&options.generationOpportunityId!==o.id)){blocker='Draft generation is disabled. A separately authorized bounded run is required.';}}
   if(draftCurrent){stage='publish';status=approved?'Approved revision ready':'Exact revision needs approval';label=approved?'Review publication':'Review exact revision';
    if(!options.publishingEnabled&&approved)blocker='Publishing is disabled in this environment. Approval does not enable it.';
    if(local?.status==='verification_failed'){status='Publication needs attention';blocker='The last verification failed. Review its details before another explicit attempt.';}
    if(local?.status==='verifying'){status='Verification pending';blocker='Review the existing pending verification; do not start another publication.';}
    if(currentLive){stage='measure';status=productionLive?'Live in Production':'Verified in Preview';label='View available reports';blocker=productionLive?'Article-specific outcome reporting is not connected yet. Available reports describe the website.':'This is a Preview publication, not a public Production article. Article-specific outcome reporting is not connected yet.';}
    if(currentLive&&head?.draft.linkedin&&!linkedinRecorded){stage='publish';status=linkedinNeedsReview?'LinkedIn revision needs approval':'LinkedIn post not recorded';label=linkedinNeedsReview?'Review LinkedIn revision':'Prepare LinkedIn post';blocker=!productionLive&&head.draft.linkedin.linkStrategy==='after_website_publication'?'The website article is verified only in Preview. LinkedIn link preparation requires the exact revision to be live in Production.':'LinkedIn approval and manual posting are separate from website publication.';}
   }
  }
  const active=!['archived','rejected','deferred'].includes(o.status);
  if(!active){stage='discover';status=o.status==='archived'?'Archived':o.status==='rejected'?'Rejected':'Deferred';label='Review decision';blocker='Reopen or restore explicitly before starting more work.';}
  const completedStages=workflowStages.slice(0,workflowStages.indexOf(stage));
  return {id:o.id,title:o.finding.title,priority:o.finding.priority,stage,completedStages,status,blocker,next:{label,href:workspaceLink(stage,o.id)},reviewRequired:active&&(!topicApproved||Boolean(draftCurrent&&(!approved||linkedinNeedsReview))),hasDraft:Boolean(head),readyToPublish:active&&draftCurrent&&approved&&!currentLive&&local?.status!=='verifying',productionLive,previewLive,productionStatus:productionLive?'Live in Production':production?.status==='unpublished'?'Withdrawn from Production':'Not live in Production',destinationStatus:local?.live?(options.environment==='production'?'Live in Production':'Live in protected Preview'):local?.status==='unpublished'?'Withdrawn here':local?.status==='verifying'?'Verification pending':'Not published here',updatedAt:o.updatedAt,revisionId:head?.id??null,active};
 });
 for(const root of editorial.filter(a=>a.payload.workflow==='owner-article/v1')){
  const head=revisionHead(editorial,root.id);if(!head)continue;
  const states=opportunityPublications(artifacts,root.id),local=states.find(p=>p.environment===options.environment),production=states.find(p=>p.environment==='production'),approved=Boolean(approvedRevision(editorial,head,'website'));
  const current=Boolean(local?.live&&local.revisionId===head.id),stage:WorkflowStage=current?'measure':approved?'publish':'create';
  items.push({id:root.id,origin:'owner-authored',title:head.draft.website?.title??root.title,priority:0,stage,completedStages:current?['create','publish']:approved?['create']:[],status:current?'Imported article verified':approved?'Approved imported revision ready':'Imported draft needs review',blocker:current?'Available reports describe the website; article-specific measurement is not connected yet.':!options.publishingEnabled&&approved?'Publishing is disabled in this environment.':'Owner-authored content needs no SEO opportunity or model execution. Publication requires a separate exact-revision approval and Publish action.',next:{label:current?'View available reports':approved?'Review publication':'Review imported article',href:workspaceLink(stage,root.id)},reviewRequired:!approved,hasDraft:true,readyToPublish:approved&&!current,productionLive:Boolean(production?.live),previewLive:states.some(p=>p.live&&p.environment.startsWith('preview:')),productionStatus:production?.live?'Live in Production':production?.status==='unpublished'?'Withdrawn from Production':'Not live in Production',destinationStatus:local?.live?(options.environment==='production'?'Live in Production':'Live in protected Preview'):local?.status==='unpublished'?'Withdrawn here':'Not published here',updatedAt:head.createdAt,revisionId:head.id,active:true});
 }
 const rank=(i:WorkflowItem)=>!i.active?6:i.reviewRequired?0:i.readyToPublish?1:i.stage==='create'?2:i.stage==='publish'?3:4;
 items.sort((a,b)=>rank(a)-rank(b)||a.priority-b.priority||b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
 return {environment:options.environment,destination:options.environment==='production'?'Production':options.environment.startsWith('preview:')?'Protected Preview':'Local development',items,counts:{needsReview:items.filter(i=>i.reviewRequired).length,draftsToReview:items.filter(i=>i.active&&i.hasDraft&&i.stage==='publish'&&i.reviewRequired).length,readyToPublish:items.filter(i=>i.readyToPublish).length,productionLive:items.filter(i=>i.productionLive).length,previewLive:items.filter(i=>i.previewLive).length},generatedAt:new Date(options.now??Date.now()).toISOString()};
}
