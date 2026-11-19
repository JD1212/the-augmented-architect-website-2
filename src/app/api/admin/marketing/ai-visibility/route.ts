import {ownerAuth,requireOwner} from '@/lib/marketing/auth';
import {privateJson,privateBody,marketingFailure,sameOrigin} from '@/lib/marketing/http';
import {MarketingError,uuidPattern} from '@/lib/marketing/config';
import {seoDatabase} from '@/lib/marketing/seo/config';
import {analyzeVisibility} from '@/lib/marketing/seo/visibility-service';
import {planningRecords} from '@/lib/marketing/intelligence/planning';
import {quoteVisibility,visibilityState,reviewVisibility,collectVisibility,visibilityCapabilities} from '@/lib/marketing/intelligence/visibility';
export const maxDuration=180;
export async function GET(request:Request){try{sameOrigin(request);const owner=await requireOwner(await ownerAuth());return privateJson(await visibilityState(owner.db,owner.tenantId));}catch(e){return marketingFailure(e);}}
export async function POST(request:Request){
 try{
  const owner=await requireOwner(await ownerAuth()),body=await privateBody(request);
  if(!['review','collect','analyze'].includes(String(body.operation))||Object.keys(body).some(k=>!['operation','planId','quoteHash','decision','note'].includes(k))||typeof body.planId!=='string'||!uuidPattern.test(body.planId)||typeof body.quoteHash!=='string'||!/^[a-f0-9]{64}$/.test(body.quoteHash))throw new MarketingError(400,'Select a saved visibility strategy and its exact quote.');
  const capabilities=visibilityCapabilities();
  if(body.operation==='collect'&&!capabilities.researchEnabled)throw new MarketingError(503,'AI visibility purchases are disabled.');
  if(body.operation==='analyze'&&!capabilities.analysisEnabled)throw new MarketingError(503,'AI visibility analysis is disabled.');
  const quote=quoteVisibility(body.planId,await planningRecords(owner.db,owner.tenantId));
  if(body.operation==='review'){
   if(!['approved','deferred','rejected'].includes(String(body.decision))||typeof body.note!=='string'||body.note.length>600)throw new MarketingError(400,'Choose an owner decision and a short note.');
   return privateJson(await reviewVisibility(seoDatabase(),owner.tenantId,owner.user.id,quote,body.quoteHash,body.decision as 'approved'|'deferred'|'rejected',body.note));
  }
  if(body.operation==='analyze')return privateJson(await analyzeVisibility(owner,quote,body.quoteHash,request.signal));
  const authorize=async()=>{const current=await requireOwner(owner.db);if(current.user.id!==owner.user.id||current.tenantId!==owner.tenantId)throw new MarketingError(403,'Owner access changed.');/* A disconnected browser does not discard an already-paid response; owner access is rechecked. */};
  return privateJson(await collectVisibility({db:seoDatabase(),tenant:owner.tenantId,actor:owner.user.id,quote,expectedHash:body.quoteHash,authorize}));
 }catch(e){return marketingFailure(e);}
}
