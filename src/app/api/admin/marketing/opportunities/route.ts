import {saveArticleBrief} from '@/lib/marketing/opportunities/brief-store';
import {searchBrief} from '@/lib/marketing/opportunities/seo-brief';
import {ownerAuth,requireOwner} from '@/lib/marketing/auth';
import {privateJson,privateBody,marketingFailure,sameOrigin} from '@/lib/marketing/http';
import {MarketingError,uuidPattern} from '@/lib/marketing/config';
import {marketingDatabase} from '@/lib/marketing/private-database';
import {loadBacklog,saveReview} from '@/lib/marketing/opportunities/repository';
import {contentAssignment} from '@/lib/marketing/opportunities/handoff';
import type {ReviewCommand} from '@/lib/marketing/opportunities/contracts';
import {opportunityPage} from '@/lib/marketing/opportunities/query';
import {intelligenceRecords} from '@/lib/marketing/intelligence/service';
import {opportunityIntelligence} from '@/lib/marketing/intelligence/scoring';
export async function GET(request:Request){
  try{
    sameOrigin(request);const owner=await requireOwner(await ownerAuth()),backlog=await loadBacklog(owner.db,owner.tenantId),id=new URL(request.url).searchParams.get('id');
    if(!id)return privateJson(opportunityPage(backlog.opportunities,new URL(request.url).searchParams));
    if(!uuidPattern.test(id))throw new MarketingError(400,'A valid opportunity ID is required.');
    const opportunity=backlog.opportunities.find(o=>o.id===id);if(!opportunity)throw new MarketingError(404,'Opportunity not found in this workspace.');
    const evidence=backlog.evidence[opportunity.observations.at(-1)!.evidenceArtifactId]??[];
    const research=await intelligenceRecords(owner.db,owner.tenantId);
    return privateJson({opportunity,evidence,seoBrief:searchBrief(opportunity.finding,opportunity.findingId,evidence,research),assignment:contentAssignment(opportunity,backlog),intelligence:opportunityIntelligence(id,research)});
  }catch(error){return marketingFailure(error);}
}
export async function POST(request:Request){
  try{
    const owner=await requireOwner(await ownerAuth()),body=await privateBody(request,16384);
    if(body.operation==='saveBrief'){
      if(Object.keys(body).some(k=>!['operation','opportunityId','expectedFindingId','expectedBriefId','brief'].includes(k))||!['opportunityId','expectedFindingId'].every(k=>typeof body[k]==='string'&&uuidPattern.test(body[k] as string))||body.expectedBriefId!==null&&(typeof body.expectedBriefId!=='string'||!uuidPattern.test(body.expectedBriefId)))throw new MarketingError(400,'Choose the exact opportunity, finding and previous brief.');
      await requireOwner(owner.db);return privateJson(await saveArticleBrief(marketingDatabase(),owner.tenantId,owner.user.id,body as Parameters<typeof saveArticleBrief>[3]));
    }
    const keys=['expectedBriefId','expectedBriefHash','opportunityId','requestId','expectedReviewId','expectedFindingId','action','note','deliverable'];
    if(Object.keys(body).some(k=>!keys.includes(k))||!['opportunityId','requestId','expectedFindingId'].every(k=>typeof body[k]==='string'&&uuidPattern.test(body[k] as string))||body.expectedReviewId!==null&&(typeof body.expectedReviewId!=='string'||!uuidPattern.test(body.expectedReviewId))||!['approve','defer','reject','reopen','archive','restore','complete'].includes(String(body.action))||typeof body.note!=='string'||body.note.length>2000||!['article','landing_page','existing_page_update','technical_guide'].includes(String(body.deliverable)))throw new MarketingError(400,'A valid review action, revision, deliverable and optional note are required.');
    if(body.expectedBriefId!==undefined&&body.expectedBriefId!==null&&(typeof body.expectedBriefId!=='string'||!uuidPattern.test(body.expectedBriefId))||body.expectedBriefHash!==undefined&&body.expectedBriefHash!==null&&(typeof body.expectedBriefHash!=='string'||!/^[a-f0-9]{64}$/.test(body.expectedBriefHash)))throw new MarketingError(400,'Choose the exact brief revision.');
    await requireOwner(owner.db);
    return privateJson(await saveReview(marketingDatabase(),owner.tenantId,owner.user.id,body as ReviewCommand));
  }catch(error){return marketingFailure(error);}
}
