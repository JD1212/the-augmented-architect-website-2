import type {SavedPlan} from '@/lib/marketing/intelligence/planning';
import type {SeoPanelData} from '@/lib/marketing/seo/contracts';
import type {Opportunity} from '@/lib/marketing/opportunities/contracts';
import type {ResearchWorkflowState} from './use-research-workflow';
export type StageState={label:string;state:'complete'|'ready'|'blocked'|'pending'};
/** Presentation only: completion requires matching saved records, never a click. */
export function discoverState(plan:SavedPlan|undefined,data:ResearchWorkflowState|null,ids:string[],seo:SeoPanelData|null,opportunity?:Opportunity|null){
 const evidence=(data?.evidence??[]).filter(e=>e.planId===plan?.id||e.planIds?.includes(plan?.id??'')||plan?.plan.steps.some(s=>s.cachedResearchIds.includes(e.id)));
 const eligible=evidence.filter(e=>e.eligible),approved=plan?.decision==='approved';
 const complete=Boolean(approved&&plan.plan.steps.every(s=>s.cachedResearchIds.some(id=>eligible.some(e=>e.id===id))||eligible.some(e=>e.mode===s.mode&&s.seeds.every(seed=>e.terms.some(term=>term.trim().toLowerCase()===seed.trim().toLowerCase())))));
 const use=seo?.evidenceUsage as (NonNullable<SeoPanelData['evidenceUsage']>&{researchWorkflow?:{planId:string;researchIds:string[]}})|undefined;
 const same=(a:string[],b:string[])=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
 const analyzed=Boolean(plan&&seo?.analysis&&use?.researchWorkflow?.planId===plan.id&&same(use.researchWorkflow.researchIds,ids));
 const observation=opportunity?.observations.find(o=>o.id===opportunity.findingId);
 const reviewed=Boolean(analyzed&&observation?.researchWorkflow?.planId===plan?.id&&['approved_for_drafting','completed'].includes(opportunity?.status??'')&&opportunity?.reviews.some(r=>r.action==='approve'&&r.findingId===opportunity.findingId));
 const providerReady=data?.providers?.some(p=>p.ready),allowance=data?.authorizations?.filter(a=>a.planId===plan?.id).at(-1);
 const statuses:Record<string,StageState>={
  plans:{label:approved?'Plan approved':plan?plan.decision==='pending'?'Pending review':plan.decision:'Choose a plan',state:approved?'complete':plan?'pending':'blocked'},
  keywords:{label:complete?plan?.plan.steps.length?'Evidence collected':'Not required by plan':!approved?'Approve plan first':!providerReady?'Collection disabled':allowance?.blocked?'Review uncertain request':!allowance||allowance.remainingRequests===0?'Spending approval required':'Ready for collection',state:complete?'complete':approved&&providerReady&&allowance&&!allowance.blocked&&allowance.remainingRequests>0?'ready':'blocked'},
  analyst:{label:analyzed?'Analysis saved':!approved?'Approve plan first':ids.some(id=>!eligible.some(e=>e.id===id))?'Evidence unavailable':ids.length?'Ready for owner run':'Available with evidence gaps',state:analyzed?'complete':approved&&!ids.some(id=>!eligible.some(e=>e.id===id))?'ready':'blocked'},
  opportunities:{label:reviewed?'Finding approved':analyzed?'Recommendations ready':'Existing backlog available',state:reviewed?'complete':analyzed?'ready':'pending'},
 };
 const next=!approved?{section:'plans',label:'Review Plan'}:!complete?{section:'keywords',label:'Review keyword collection'}:!ids.length&&Boolean(plan?.plan.steps.length)&&eligible.length?{section:'keywords',label:'Select keyword evidence'}:!analyzed?{section:'analyst',label:'Review SEO analysis'}:{section:'opportunities',label:'Review opportunities'};
 return {statuses,next};
}
