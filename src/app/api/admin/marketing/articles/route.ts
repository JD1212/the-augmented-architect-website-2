import {ownerAuth,requireOwner} from '@/lib/marketing/auth';
import {privateJson,marketingFailure,sameOrigin} from '@/lib/marketing/http';
import {articleReportingRange} from '@/lib/marketing/article-performance/identity';
import {MarketingError,uuidPattern} from '@/lib/marketing/config';
import {articlePerformance,articleDetail} from '@/lib/marketing/article-performance/service';
export const maxDuration=120;
export async function GET(request:Request){try{
 sameOrigin(request);const owner=await requireOwner(await ownerAuth()),p=new URL(request.url).searchParams;
 if([...p.keys()].some(k=>!['days','article'].includes(k))||p.has('days')&&!['7','28','90'].includes(p.get('days')!))throw new MarketingError(400,'Choose 7, 28 or 90 complete days.');
 const range=articleReportingRange(p.get('days')),id=p.get('article');if(['days','article'].some(k=>p.getAll(k).length>1)||p.has('article')&&!uuidPattern.test(id??''))throw new MarketingError(400,'Choose one valid article and period.');return privateJson(id?await articleDetail(owner,range,id):await articlePerformance(owner,range));
}catch(e){return marketingFailure(e);}}
