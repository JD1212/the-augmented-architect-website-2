import {ownerAuth,requireOwner} from '@/lib/marketing/auth';
import {privateJson,privateBody,marketingFailure,sameOrigin} from '@/lib/marketing/http';
import {MarketingError,uuidPattern} from '@/lib/marketing/config';
import {seoDatabase} from '@/lib/marketing/seo/config';
import {prepareSeoResearchPlan} from '@/lib/marketing/seo/planning-service';
import {planningRecords,savedPlans,reviewResearchPlan} from '@/lib/marketing/intelligence/planning';
import {planningExecutionEnabled,requirePlanningExecution} from '@/lib/marketing/seo/planning-policy';
export const maxDuration=180;
export async function GET(request:Request){
 try{sameOrigin(request);const owner=await requireOwner(await ownerAuth());return privateJson({plans:savedPlans(await planningRecords(owner.db,owner.tenantId)).slice(0,10),paidExecutionEnabled:false,planningExecutionEnabled:planningExecutionEnabled()});}catch(error){return marketingFailure(error);}
}
export async function POST(request:Request){
 try{
  const owner=await requireOwner(await ownerAuth()),body=await privateBody(request);
  if(body.operation==='prepare'){
   requirePlanningExecution();
   if(Object.keys(body).some(k=>!['operation','requestId','objective','days'].includes(k))||typeof body.requestId!=='string'||!uuidPattern.test(body.requestId)||typeof body.objective!=='string'||body.objective.trim().length<10||body.objective.length>1500||![7,28,90].includes(Number(body.days))||typeof body.days!=='number')throw new MarketingError(400,'Provide a business objective, execution ID, and authorized reporting window.');
   return privateJson(await prepareSeoResearchPlan(owner,body.requestId,body.objective,body.days as 7|28|90,request.signal));
  }
  if(body.operation==='review'){
   if(Object.keys(body).some(k=>!['operation','planId','decision','note'].includes(k))||typeof body.planId!=='string'||!uuidPattern.test(body.planId)||!['approved','deferred','rejected'].includes(String(body.decision))||typeof body.note!=='string'||body.note.length>600)throw new MarketingError(400,'Provide a saved plan, decision, and optional short note.');
   return privateJson(await reviewResearchPlan(seoDatabase(),owner.tenantId,owner.user.id,body.planId,body.decision as 'approved'|'deferred'|'rejected',body.note));
  }
  throw new MarketingError(400,'Choose prepare or review. Paid execution is disabled.');
 }catch(error){return marketingFailure(error);}
}
