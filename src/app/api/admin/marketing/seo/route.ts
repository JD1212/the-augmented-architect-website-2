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
    if(Object.keys(body).some(k=>!['requestId','days'].includes(k))||typeof body.requestId!=='string'||!uuidPattern.test(body.requestId)||![7,28,90].includes(Number(body.days))||typeof body.days!=='number')throw new MarketingError(400,'A valid execution ID and authorized 7, 28, or 90-day window are required.');
    return privateJson(await executeSeo(owner,body.requestId,body.days as 7|28|90,request.signal));
  }catch(error){return marketingFailure(error);}
}
