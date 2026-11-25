import 'server-only';
import {publicationConfigurationSummary} from './publication-diagnostics';
import {getVercelOidcToken} from '@vercel/oidc';
import {revalidatePath,revalidateTag} from 'next/cache';
import {validateDraft} from '@augmented-architect/content-strategist';
import {stableId} from '../opportunities/identity';
import {site} from '@/content/site';
import {articleHref} from '@/lib/articles';
import {publicationTag} from '@/lib/published-articles';
import {loadBacklog} from '../opportunities/repository';
import {requireOwner} from '../auth';
import {MarketingError} from '../config';
import {contentDatabase} from './config';
import {contentRows,revisionHead,revisions,approvedRevision} from './repository';
import {draftArticle} from './publishing';
import {publicationEnvironment,publishingEnabled,publicArticle,publicArticleHash} from './publication-contract';
export {publicationState} from './publication-state';
import {publicationState} from './publication-state';
export function invalidatePublication(slug:string){revalidateTag(publicationTag(),{expire:0});for(const path of ['/insights','/sitemap.xml',articleHref(slug)])revalidatePath(path);}
export function verificationOrigin(env=process.env){
 if(env.VERCEL_ENV==='production')return site.url;
 if(env.VERCEL_ENV==='preview'&&env.VERCEL_URL&&/^the-augmented-architect-website-2-[a-z0-9-]+\.vercel\.app$/.test(env.VERCEL_URL))return 'https://'+env.VERCEL_URL;
 if(env.ARTICLE_VERIFY_ORIGIN&&/^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(env.ARTICLE_VERIFY_ORIGIN)&&env.VERCEL_ENV!=='production')return env.ARTICLE_VERIFY_ORIGIN;
 throw new MarketingError(503,'A trusted publication verification origin is required.');
}
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
export class PublicationVerificationError extends Error {
 constructor(public diagnostic:Record<string,unknown>){super(String(diagnostic.rule));this.name='PublicationVerificationError';}
}
export async function verifyPublication(command:Record<string,unknown>,request:typeof fetch=fetch){
 const configuration=publicationConfigurationSummary();let origin:string;
 try{origin=verificationOrigin();}catch{throw new PublicationVerificationError({phase:'configuration',rule:'VERIFICATION_ORIGIN_INVALID',configuration});}
 const path=articleHref(String(command.slug)),headers:Record<string,string>={'Cache-Control':'no-cache'};
 if(process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_URL){try{headers['x-vercel-trusted-oidc-idp-token']=await getVercelOidcToken();}catch{throw new PublicationVerificationError({phase:'credential',rule:'VERIFICATION_OIDC_UNAVAILABLE',configuration});}}
 const read=async(path:string)=>{
  try{const response=await request(origin+path,{headers,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(20000)});const text=await response.text();if(text.length>2000000)throw new PublicationVerificationError({phase:'response',rule:'VERIFICATION_RESPONSE_TOO_LARGE',path});return {status:response.status,text,requestId:response.headers.get('x-vercel-id')};}
  catch(error){if(error instanceof PublicationVerificationError)throw error;throw new PublicationVerificationError({phase:'transport',rule:'VERIFICATION_TRANSPORT_FAILED',path});}
 };
 const [page,list,sitemap]=await Promise.all([read(path),read('/insights'),read('/sitemap.xml')]);
 const noindex=(page.text.match(/<meta\b[^>]*>/gi)??[]).some(tag=>/name=["']robots["']/i.test(tag)&&/content=["'][^"']*\bnoindex\b/i.test(tag));
 const renderedArticle=/<article\b/i.test(page.text);
 const streamedNotFound=page.status===200&&!renderedArticle&&noindex&&page.text.includes('NEXT_HTTP_ERROR_FALLBACK;404');
 const receipt={pageStatus:page.status,listStatus:list.status,sitemapStatus:sitemap.status,versionMatched:page.text.includes('data-publication-version="'+command.publicHash+'"'),canonicalMatched:page.text.includes('href="'+site.url+path+'"'),withdrawalVerified:false,streamedNotFound,noindex,renderedArticle};
 const checks:Record<string,boolean>={listingHttp:list.status===200,sitemapHttp:sitemap.status===200};
 if(command.action==='unpublish'){
  Object.assign(checks,{articleWithdrawn:[404,410].includes(page.status)||streamedNotFound,listingRemoved:!list.text.includes('href="'+path+'"'),sitemapRemoved:!sitemap.text.includes(site.url+path)});
  receipt.withdrawalVerified=Object.values(checks).every(Boolean);
 }else{
  Object.assign(checks,{articleHttp:page.status===200,version:receipt.versionMatched,title:page.text.includes(escape((command.article as {title:string}).title)),canonical:receipt.canonicalMatched,listingLinked:list.text.includes('href="'+path+'"'),sitemapLinked:sitemap.text.includes(site.url+path)});
 }
 if(!Object.values(checks).every(Boolean))throw new PublicationVerificationError({phase:'response',rule:'VERIFICATION_CHECK_FAILED',failedChecks:Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name),checks,receipt,requestIds:{article:page.requestId,listing:list.requestId,sitemap:sitemap.requestId},configuration});
 return receipt;
}
export async function changePublication(owner:Awaited<ReturnType<typeof requireOwner>>,input:{action:'publish'|'unpublish';requestId:string;revisionId:string;revisionHash:string;opportunityId:string;publicationDate:string;expectedVersion:number},ports?:{verify?:typeof verifyPublication;invalidate?:typeof invalidatePublication}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.publicationDate)||!Number.isFinite(Date.parse(input.publicationDate+'T00:00:00Z'))||new Date(input.publicationDate+'T00:00:00Z').toISOString().slice(0,10)!==input.publicationDate)throw new MarketingError(400,'Choose a valid publication date.');
 if(!publishingEnabled())throw new MarketingError(503,'Direct publishing is disabled in this environment.');
 await requireOwner(owner.db);
 const db=contentDatabase(),rows=await contentRows(db,owner.tenantId),revision=revisions(rows,input.opportunityId).find(r=>r.id===input.revisionId);
 if(!revision||revision.hash!==input.revisionHash)throw new MarketingError(409,'Choose the exact saved revision.');
 const environment=publicationEnvironment(),state=await publicationState(db,owner.tenantId,input.opportunityId),pointer=state.pointer;
 const original=state.history.find(r=>r.id===input.requestId);
 let command:Record<string,unknown>;
 if(original){command={...original.payload};delete command.workflow;delete command.domain; // Full operation snapshot is reloaded below, only for the authorized owner.
  const r=await db.from('marketing_artifacts').select('payload').eq('id',input.requestId).eq('tenant_id',owner.tenantId).single();if(r.error)throw new MarketingError(503,'Publication attempt unavailable.');command={...r.data.payload};
  if(command.actorId!==owner.user.id||command.environment!==environment||command.revisionId!==input.revisionId||command.revisionHash!==input.revisionHash||command.action!==input.action)throw new MarketingError(409,'This request belongs to a different publication action.');
 }else{
  if(input.action==='publish'&&revisionHead(rows,input.opportunityId)?.id!==revision.id)throw new MarketingError(409,'A newer revision needs review.');
  if(input.action==='publish'){const backlog=await loadBacklog(owner.db,owner.tenantId),selected=backlog.opportunities.find(o=>o.id===input.opportunityId);if(selected?.status!=='approved_for_drafting'||selected.reviewId!==revision.input.assignment.approvalId||selected.findingId!==revision.input.assignment.findingId)throw new MarketingError(409,'The research approval changed. Review the current finding before publishing.');}
  const approval=approvedRevision(rows,revision,'website');
  if(input.action==='publish'&&!approval)throw new MarketingError(403,'Approve this exact website revision first.');
  validateDraft(revision.draft,revision.input);
  const publicationDate=pointer?.payload.firstPublicationDate??input.publicationDate;
  const projected=draftArticle(revision,publicationDate);projected.publication!.id=stableId(owner.tenantId+':website-article:'+projected.slug);const article=publicArticle(projected);
  const slug=pointer?.payload.slug??article.slug;
  if(article.slug!==slug)throw new MarketingError(409,'The published slug is permanent. Keep it when revising this article.');
  command={tenantId:owner.tenantId,actorId:owner.user.id,environment,slug,requestId:input.requestId,action:input.action,revisionId:revision.id,revisionHash:revision.hash,approvalId:approval?.id??null,article,publicHash:publicArticleHash(article),expectedVersion:input.expectedVersion,canonicalUrl:site.url+articleHref(slug),sourceOpportunityId:revision.opportunityId,sourceFindingId:revision.input.assignment.findingId,sourceSnapshotHashes:revision.input.sources.map(s=>({id:s.id,hash:s.snapshotHash})),baselinePeriods:revision.grounding.publicationBaseline??[]};
 }
 const transition=async(phase:string)=>{const r=await db.rpc('marketing_article_transition',{p_command:{...command,phase}});if(r.error)throw new MarketingError(409,'Publication state changed or its exact approval is unavailable. Refresh before continuing.');return r.data;};
 const begun=await transition('begin');if(begun.status!=='verifying')return {status:begun.status,requestId:input.requestId,reused:true};
 const invalidate=ports?.invalidate??invalidatePublication;invalidate(String(command.slug));
 try{command.verificationReceipt=await (ports?.verify??verifyPublication)(command);}catch(error){
  command.verificationDiagnostic=error instanceof PublicationVerificationError?error.diagnostic:{phase:'unknown',rule:'VERIFICATION_UNCLASSIFIED'};
  console.warn('publication_verification_failed',JSON.stringify({requestId:input.requestId,diagnostic:command.verificationDiagnostic}));
  await transition('failed');invalidate(String(command.slug));throw new MarketingError(503,'Publication could not be verified. The previous public version was restored; no new Live publication was recorded.');
 }
 await requireOwner(owner.db);const result=await transition('verified');invalidate(String(command.slug));return {status:result.status,requestId:input.requestId,url:command.canonicalUrl,environment};
}
