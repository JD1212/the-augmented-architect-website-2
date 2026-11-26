import {ownerAuth,requireOwner} from '@/lib/marketing/auth';
import {privateJson,privateBody,marketingFailure,sameOrigin} from '@/lib/marketing/http';
import {MarketingError,uuidPattern} from '@/lib/marketing/config';
import {readSeoPanel} from '@/lib/marketing/seo/store';
import {executeSeo} from '@/lib/marketing/seo/service';
export const maxDuration=240;
export async function GET(request:Request){
  try{sameOrigin(request);const owner=await requireOwner(await ownerAuth());return privateJson(await readSeoPanel(owner.db,owner.tenantId));}catch(error){return marketingFailure(error);}
}
export async function POST(request:Request){
  try{
    const owner=await requireOwner(await ownerAuth()),body=await privateBody(request);
    if(Object.keys(body).some(k=>!['requestId','days','planId','researchIds','executionConfirmed'].includes(k))||typeof body.requestId!=='string'||!uuidPattern.test(body.requestId)||![7,28,90].includes(Number(body.days))||typeof body.days!=='number')throw new MarketingError(400,'A valid execution ID and authorized 7, 28, or 90-day window are required.');
    if(body.executionConfirmed!==true||typeof body.planId!=='string'||!uuidPattern.test(body.planId)||!Array.isArray(body.researchIds)||body.researchIds.length>5||body.researchIds.some(id=>typeof id!=='string'||!uuidPattern.test(id)))throw new MarketingError(400,'Confirm analysis of an approved plan and its explicitly selected evidence.');
    return privateJson(await executeSeo(owner,body.requestId,body.days as 7|28|90,request.signal,{planId:body.planId,researchIds:body.researchIds as string[]}));
  }catch(error){return marketingFailure(error);}
}
