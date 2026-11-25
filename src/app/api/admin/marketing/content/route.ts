import {importArticle,reviseImportedArticle} from '@/lib/marketing/content/importing';
import {contentRows} from '@/lib/marketing/content/repository';
import {saveSourceReview} from '@/lib/marketing/content/reviewed-sources';
import {ownerAuth,requireOwner} from '@/lib/marketing/auth';
import {privateJson,privateBody,marketingFailure,sameOrigin} from '@/lib/marketing/http';
import {MarketingError,uuidPattern} from '@/lib/marketing/config';
import {contentState,generateContent,findRevision,editedRevision} from '@/lib/marketing/content/service';
import {contentDatabase,requireContentExecution} from '@/lib/marketing/content/config';
import {savePublicationApproval,contentFeedback} from '@/lib/marketing/content/repository';
import {publicationReadOnlyProbe} from '@/lib/marketing/content/publication-diagnostics';
import {changePublication} from '@/lib/marketing/content/direct-publishing';
import {preparePublication,recordPublication} from '@/lib/marketing/content/publishing';
export const maxDuration=180;
const uuid=(x:unknown):x is string=>typeof x==='string'&&uuidPattern.test(x);
export async function GET(request:Request){try{sameOrigin(request);const owner=await requireOwner(await ownerAuth()),id=new URL(request.url).searchParams.get('opportunityId');if(new URL(request.url).searchParams.get('imports')==='1'){const rows=await contentRows(owner.db,owner.tenantId);return privateJson({documents:rows.filter(r=>r.payload.workflow==='owner-article/v1').map(r=>({id:r.id,title:r.title,createdAt:r.created_at}))});}if(!uuid(id))throw new MarketingError(400,'Choose an opportunity.');const state=await contentState(owner.db,owner.tenantId,id);return privateJson(new URL(request.url).searchParams.get('diagnostics')==='1'?{...state,verificationProbe:await publicationReadOnlyProbe()}:state);}catch(e){return marketingFailure(e);}}
export async function POST(request:Request){
 try{
  const owner=await requireOwner(await ownerAuth()),body=await privateBody(request,524288),op=body.operation;
  const fields:Record<string,string[]>={import:['requestId','document','linkedOpportunityId'],reviseImport:['revisionId','document'],reviewSource:['findingId','source'],publish:['requestId','revisionId','revisionHash','publicationDate','expectedVersion','publishConfirmed'],unpublish:['requestId','revisionId','revisionHash','publicationDate','expectedVersion','publishConfirmed'],generate:['requestId','expectedRevisionId'],revise:['revisionId','draft'],feedback:['revisionId','note'],approve:['revisionId','revisionHash','channel','reviewConfirmed'],prepare:['revisionId','revisionHash','channel','publicationDate'],record:['revisionId','revisionHash','channel','publicationDate','url','releaseCommit','confirmed']};
  if(typeof op!=='string'||!Object.hasOwn(fields,op)||Object.keys(body).some(k=>!['operation','opportunityId',...fields[op]].includes(k))||!uuid(body.opportunityId))throw new MarketingError(400,'Choose an authorized content operation.');
  if(op==='import'){if(!uuid(body.requestId)||body.linkedOpportunityId!==null&&!uuid(body.linkedOpportunityId))throw new MarketingError(400,'Provide a valid import request and optional linked opportunity.');await requireOwner(owner.db);return privateJson(await importArticle(contentDatabase(),owner.tenantId,owner.user.id,body.requestId,body.document,body.linkedOpportunityId as string|null));}
  if(op==='reviewSource'){if(!uuid(body.findingId))throw new MarketingError(400,'Choose the current finding.');await requireOwner(owner.db);return privateJson(await saveSourceReview(contentDatabase(),owner.tenantId,owner.user.id,body.opportunityId,body.findingId,body.source));}
  if(op==='publish'||op==='unpublish'){if(body.publishConfirmed!==true||!uuid(body.requestId)||!uuid(body.revisionId)||typeof body.revisionHash!=='string'||!/^[a-f0-9]{64}$/.test(body.revisionHash)||typeof body.publicationDate!=='string'||!Number.isSafeInteger(body.expectedVersion)||Number(body.expectedVersion)<0)throw new MarketingError(400,'Confirm the exact publication action, revision and current version.');return privateJson(await changePublication(owner,{action:op,requestId:body.requestId,revisionId:body.revisionId,revisionHash:body.revisionHash,publicationDate:body.publicationDate,expectedVersion:Number(body.expectedVersion),opportunityId:body.opportunityId}));}
  if(op==='generate'){requireContentExecution();if(!uuid(body.requestId)||body.expectedRevisionId!==null&&!uuid(body.expectedRevisionId))throw new MarketingError(400,'Provide the request and expected revision.');return privateJson(await generateContent(owner,body.requestId,body.opportunityId,body.expectedRevisionId as string|null,request.signal));}
  if(!uuid(body.revisionId))throw new MarketingError(400,'Choose a completed revision.');
  const {revision,state}=await findRevision(owner.db,owner.tenantId,body.revisionId,body.opportunityId);
  await requireOwner(owner.db);const db=contentDatabase();
  if(op==='reviseImport')return privateJson(await reviseImportedArticle(db,owner.tenantId,owner.user.id,revision,body.document));
  if(op==='revise')return privateJson(await editedRevision(db,owner.tenantId,owner.user.id,revision,body.draft));
  if(op==='feedback'){if(typeof body.note!=='string'||!body.note.trim()||body.note.length>2000)throw new MarketingError(400,'Provide a brief owner note.');return privateJson(await contentFeedback(db,owner.tenantId,owner.user.id,revision,body.note.trim()));}
  if(!['website','linkedin'].includes(String(body.channel))||typeof body.revisionHash!=='string'||!/^[a-f0-9]{64}$/.test(body.revisionHash))throw new MarketingError(400,'Choose the channel and exact revision hash.');
  const channel=body.channel as 'website'|'linkedin';
  if(['approve','prepare'].includes(op)&&state.origin!=='owner-authored'&&state.grounding.assignment?.approvalId!==revision.input.assignment.approvalId)throw new MarketingError(409,'The drafting approval changed; review the current finding before release.');
  if(op==='approve'&&body.reviewConfirmed!==true)throw new MarketingError(400,'Confirm review of this exact revision before approval.');
  if(op==='approve')return privateJson(await savePublicationApproval(db,owner.tenantId,owner.user.id,revision,channel,body.revisionHash));
  if(typeof body.publicationDate!=='string')throw new MarketingError(400,'Supply the publication date explicitly.');
  if(op==='prepare')return privateJson(await preparePublication(db,owner.tenantId,revision,channel,body.revisionHash,body.publicationDate));
  if(body.confirmed!==true||typeof body.url!=='string'||body.url.length>1000||body.releaseCommit!==null&&typeof body.releaseCommit!=='string')throw new MarketingError(400,'Explicitly confirm the actual publication URL and date.');
  return privateJson(await recordPublication(db,owner.tenantId,owner.user.id,revision,channel,body.revisionHash,body.url,body.publicationDate,body.releaseCommit as string|null));
 }catch(e){return marketingFailure(e);}
}
