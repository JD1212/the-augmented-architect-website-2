import {ownerAuth,requireOwner} from '@/lib/marketing/auth';
import {privateJson,privateBody,marketingFailure,sameOrigin} from '@/lib/marketing/http';
import {researchConnections} from '@/lib/marketing/intelligence/providers';
import {allowanceStatus} from '@/lib/marketing/intelligence/workflow-binding';
import {publicationEnvironment} from '@/lib/marketing/environment';
import {intelligenceRecords,savedResearch,selectIntelligence} from '@/lib/marketing/intelligence/service';
import {MarketingError,uuidPattern} from '@/lib/marketing/config';
import {seoDatabase} from '@/lib/marketing/seo/config';
import {prepareSeoResearchPlan} from '@/lib/marketing/seo/planning-service';
import {planningRecords,savedPlans,reviewResearchPlan,authorizeResearchPlan} from '@/lib/marketing/intelligence/planning';
import {planningExecutionEnabled,requirePlanningExecution,planningReadiness} from '@/lib/marketing/seo/planning-policy';
export const maxDuration=180;
export async function GET(request:Request){
 try{sameOrigin(request);const owner=await requireOwner(await ownerAuth());const rows=await planningRecords(owner.db,owner.tenantId),research=await intelligenceRecords(owner.db,owner.tenantId),selection=selectIntelligence(research,owner.tenantId);return privateJson({plans:savedPlans(rows).slice(0,10),authorizations:rows.filter(r=>r.payload.workflow==='research-spend-approval/v1'&&r.payload.environment===publicationEnvironment()&&r.actor_id===owner.user.id).map(r=>({id:r.id,planId:r.parent_id,maximumRequests:r.payload.maximumRequests,maximumCostUsd:r.payload.maximumCostUsd,...allowanceStatus(research,r)})),evidence:savedResearch(research).map(r=>({id:r.id,planId:r.query.planId??null,planIds:research.filter(link=>link.payload.workflow==='research-plan-evidence/v1'&&link.payload.researchId===r.id).map(link=>link.parent_id),mode:r.query.mode,terms:r.query.seeds,eligible:selection.records.find(e=>e.researchId===r.id)?.status==='eligible'})),paidExecutionEnabled:false,planningExecutionEnabled:planningExecutionEnabled(),execution:planningReadiness(),providers:researchConnections().filter(c=>c.id!=='google_ads').map(c=>({id:c.id,ready:c.ready,message:c.message}))});}catch(error){return marketingFailure(error);}
}
export async function POST(request:Request){
 try{
  const owner=await requireOwner(await ownerAuth()),body=await privateBody(request);
  if(body.operation==='prepare'){
   requirePlanningExecution();
   if(Object.keys(body).some(k=>!['operation','requestId','objective','days','modelConfirmed'].includes(k))||typeof body.requestId!=='string'||!uuidPattern.test(body.requestId)||typeof body.objective!=='string'||body.objective.trim().length<10||body.objective.length>1500||![7,28,90].includes(Number(body.days))||typeof body.days!=='number')throw new MarketingError(400,'Provide a business objective, execution ID, and authorized reporting window.');
   if(body.modelConfirmed!==true)throw new MarketingError(400,'Confirm this bounded model execution.');
   return privateJson(await prepareSeoResearchPlan(owner,body.requestId,body.objective,body.days as 7|28|90,request.signal));
  }
  if(body.operation==='authorizeResearch'){
   if(Object.keys(body).some(k=>!['operation','planId','requestId','maximumRequests','maximumCostUsd','spendingConfirmed'].includes(k))||body.spendingConfirmed!==true||typeof body.planId!=='string'||!uuidPattern.test(body.planId)||typeof body.requestId!=='string'||!uuidPattern.test(body.requestId)||typeof body.maximumRequests!=='number'||typeof body.maximumCostUsd!=='number')throw new MarketingError(400,'Confirm the exact plan, request limit and USD allowance.');
   return privateJson(await authorizeResearchPlan(seoDatabase(),owner.tenantId,owner.user.id,{planId:body.planId,requestId:body.requestId,maximumRequests:body.maximumRequests,maximumCostUsd:body.maximumCostUsd}));
  }
  if(body.operation==='review'){
   if(Object.keys(body).some(k=>!['operation','planId','decision','note'].includes(k))||typeof body.planId!=='string'||!uuidPattern.test(body.planId)||!['approved','deferred','rejected'].includes(String(body.decision))||typeof body.note!=='string'||body.note.length>600)throw new MarketingError(400,'Provide a saved plan, decision, and optional short note.');
   return privateJson(await reviewResearchPlan(seoDatabase(),owner.tenantId,owner.user.id,body.planId,body.decision as 'approved'|'deferred'|'rejected',body.note));
  }
  throw new MarketingError(400,'Choose prepare or review. Paid execution is disabled.');
 }catch(error){return marketingFailure(error);}
}
