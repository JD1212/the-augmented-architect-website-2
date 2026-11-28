import {z} from 'zod';
import type {ResearchBinding} from '../intelligence/workflow-binding';

export const articleBriefSchema=z.object({
 title:z.string().trim().min(1).max(200),
 audience:z.string().trim().min(1).max(500),
 problem:z.string().trim().min(1).max(400),
 coverage:z.string().trim().min(1).max(500),
 technicalSupport:z.string().trim().min(1).max(300),
 cta:z.string().trim().min(1).max(200),
 limitations:z.string().trim().min(1).max(450),
}).strict().refine(v=>[v.title,v.problem,v.coverage,v.technicalSupport].join('\n').length<=1350,'Keep the title, problem, coverage and technical support within 1,350 characters.');
export type ArticleBrief=z.infer<typeof articleBriefSchema>;
export type ArticleBriefRevision={id:string;hash:string;version:number;previousBriefId:string|null;findingId:string;evidenceArtifactId:string;researchWorkflow?:ResearchBinding;content:ArticleBrief;createdAt:string;actorId:string};
export const articleBriefFields=[['title','Article title'],['audience','Audience'],['problem','Business problem'],['coverage','Coverage'],['technicalSupport','Technical support'],['cta','Consultation CTA'],['limitations','Research limitations']] as const;

/** Host-owned editorial direction only; never an agent instruction or research claim. */
export function suggestedArticleBrief(id:string,title:string,audience:string,problem:string,coverage:string,limitations:string):ArticleBrief{
 if(id==='d0c19ee4-b000-4fae-a20f-7c7423e6c33f')return {
  title:'Why Salesforce Automation Becomes Unmanageable—and How Businesses Can Regain Control',
  audience:'Business owners, operations leaders, IT leaders, Salesforce administrators',
  problem:'Salesforce automation becomes difficult to understand, expensive to maintain, and risky to change',
  coverage:'Flows, Apex triggers, fragmented ownership, dependencies, overlapping automation, testing gaps, and practical modernization',
  technicalSupport:'Automation mapping and execution order, as supporting explanations',
  cta:'Book a Salesforce architecture assessment',
  limitations:'Unknown keyword volumes, missing competitor evidence, no invented savings or customer results',
 };
 return {title:title.slice(0,200),audience:audience.slice(0,500),problem:problem.slice(0,400),coverage:coverage.slice(0,400),technicalSupport:'Use verified technical sources as supporting explanations.',cta:'Book a consultation.',limitations:limitations.slice(0,450)||'Do not invent search demand, customer results or savings.'};
}

export function currentBriefApproved(o:Pick<import('./contracts').Opportunity,'ownerBrief'|'reviews'>){
 const approved=[...o.reviews].reverse().find(r=>r.action==='approve');
 return o.ownerBrief?Boolean(approved&&approved.ownerBrief?.id===o.ownerBrief.id&&approved.ownerBrief.hash===o.ownerBrief.hash&&approved.findingId===o.ownerBrief.findingId):!approved?.ownerBrief;
}
