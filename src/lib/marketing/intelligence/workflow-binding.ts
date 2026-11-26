import 'server-only';
import {createHash} from 'node:crypto';
import {normalizedTerm} from '@augmented-architect/seo-analyst';
import {MarketingError,uuidPattern,marketingTenant} from '../config';
import type {Artifact} from '../opportunities/contracts';
import type {PricedPlan} from './planning';
import type {ResearchCommand} from './service';
import {publicationEnvironment} from '../environment';

export type ResearchBinding={planId:string;objective:string;researchIds:string[];selectionFingerprint:string};
export function approvedPlan(rows:Artifact[],planId:string){
 if(rows.some(r=>r.tenant_id!==marketingTenant))throw new MarketingError(403,'Unauthorized research evidence tenant.');
 if(!uuidPattern.test(planId))throw new MarketingError(400,'Select a saved research plan.');
 const row=rows.find(r=>r.id===planId&&r.payload.workflow==='seo-research-plan/v1');
 const decision=rows.find(r=>r.parent_id===planId&&r.kind==='approval'&&r.payload.workflow==='seo-research-plan-review/v1');
 if(!row||decision?.payload.decision!=='approved')throw new MarketingError(403,'Review and approve this exact research plan first.');
 return {row,plan:row.payload.plan as PricedPlan,objective:String(row.payload.objective),decisionId:decision.id};
}
const terms=(seeds:readonly string[])=>[...new Set(seeds.map(normalizedTerm))].sort();
export function matchesPlanStep(plan:PricedPlan,command:ResearchCommand){return plan.steps.some(s=>s.mode===command.mode&&s.service===command.service&&JSON.stringify(terms(s.seeds))===JSON.stringify(terms(command.seeds)));}
export function quoteHash(planId:string,plan:PricedPlan,maximumRequests:number,maximumCostUsd:number){return createHash('sha256').update(JSON.stringify({planId,plan,maximumRequests,maximumCostUsd,environment:publicationEnvironment()})).digest('hex');}
export function researchAuthorization(rows:Artifact[],actor:string,command:ResearchCommand){
 const selected=approvedPlan(rows,command.planId??'');
 if(!matchesPlanStep(selected.plan,command))throw new MarketingError(403,'This keyword request is outside the approved research plan.');
 const approval=rows.find(r=>r.id===command.authorizationId&&r.kind==='approval'&&r.payload.workflow==='research-spend-approval/v1'&&r.parent_id===command.planId);
 if(!approval||approval.actor_id!==actor||approval.payload.environment!==publicationEnvironment()||approval.payload.planDecisionId!==selected.decisionId||approval.payload.quoteHash!==quoteHash(command.planId!,selected.plan,Number(approval.payload.maximumRequests),Number(approval.payload.maximumCostUsd)))throw new MarketingError(403,'Confirm this plan’s exact research allowance in the current environment.');
 return {selected,approval};
}
export function bindSelectedEvidence(rows:Artifact[],planId:string,researchIds:string[],days:number){
 const selected=approvedPlan(rows,planId);
 if(researchIds.length>5||new Set(researchIds).size!==researchIds.length||researchIds.some(id=>!uuidPattern.test(id)))throw new MarketingError(400,'Select up to five unique saved evidence collections.');
 for(const id of researchIds){
  const row=rows.find(r=>r.id===id&&r.payload.workflow==='intelligence-research/v1'&&r.payload.state==='completed');
  const command=row?.payload.query as ResearchCommand|undefined;
  const cached=selected.plan.steps.some(s=>s.cachedResearchIds.includes(id))||rows.some(r=>r.parent_id===planId&&r.payload.workflow==='research-plan-evidence/v1'&&r.payload.researchId===id);
  if(!row||!command||!cached&&(command.planId!==planId||!matchesPlanStep(selected.plan,command)))throw new MarketingError(403,'Selected evidence is not associated with this approved plan.');
 }
 const binding:ResearchBinding={planId,objective:selected.objective,researchIds,selectionFingerprint:createHash('sha256').update(JSON.stringify({planId,researchIds:[...researchIds].sort(),days,asOf:new Date().toISOString().slice(0,10)})).digest('hex')};
 return {selected,binding};
}

/** Reservations, including uncertain requests, consume the allowance until reviewed. */
export function allowanceStatus(rows:Artifact[],approval:Artifact){
 const claims=rows.filter(r=>r.payload.workflow==='intelligence-request/v1'&&(r.payload.query as ResearchCommand)?.authorizationId===approval.id);
 const completed=new Set(rows.filter(r=>r.payload.workflow==='intelligence-research/v1'&&r.payload.state==='completed').map(r=>r.parent_id));
 return {remainingRequests:Math.max(0,Number(approval.payload.maximumRequests)-claims.length),reservedCostUsd:claims.reduce((n,r)=>n+Number(r.payload.reservedMaximumUsd??1),0),blocked:claims.some(r=>!completed.has(r.id))};
}
