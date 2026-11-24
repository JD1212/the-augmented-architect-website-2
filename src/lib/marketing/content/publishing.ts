import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Article,ArticleBlock} from '@/content/articles/types';
import {site} from '@/content/site';
import {articleHref,validateArticles} from '@/lib/articles';
import {MarketingError} from '../config';
import {stableId} from '../opportunities/identity';
import {contentRows,revisionHead,type Revision} from './repository';
import {publicationPermission} from './service';
import {contentDomain} from './config';
const date=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function draftArticle(revision:Revision,publishedDate?:string):Article{
 const d=revision.draft.website;if(!d)throw new MarketingError(400,'No website draft exists.');
 const internal=(link:{label:string;url:string})=>({...link,url:link.url.startsWith(site.url+'/')?link.url.slice(site.url.length):link.url});
 const content:ArticleBlock[]=d.blocks.map(b=>{const annotations={...(b.links.length?{links:b.links.map(internal)}:{}),...(b.citationIds.length?{citationIds:b.citationIds}:{})};switch(b.type){case 'heading':return {type:'heading',text:b.text,level:b.level==='3'?3:2};case 'list':return {type:'list',items:b.items,...annotations};case 'diagram':return {type:'diagram',text:b.text,items:b.items,...annotations};case 'code':return {type:'code',text:b.text,language:b.language!,...annotations};case 'cta':return {type:'cta',text:b.text,link:internal(b.links[0])};case 'fact':{const fact=revision.input.facts.find(f=>f.id===b.factId);if(!fact)throw new MarketingError(400,'A verified fact is unavailable.');return {type:'paragraph',text:fact.display};}default:return {type:'paragraph',text:b.text,...annotations};}});
 const used=new Set([...d.blocks.flatMap(b=>b.citationIds),...revision.draft.claims.flatMap(c=>c.sourceIds)]);
 const a:Article={slug:d.slug,title:d.title,seoTitle:d.seoTitle,category:d.category as Article['category'],summary:d.summary,seoDescription:d.seoDescription,status:publishedDate?'published':'draft',...(publishedDate?{publishedDate}:{}),content,references:revision.input.sources.filter(s=>used.has(s.id)).map(s=>({id:s.id,url:s.url,title:s.title})),publication:{id:stableId(revision.id+':publication:website'),revisionId:revision.id}};validateArticles([a]);return a;
}
export async function preparePublication(db:SupabaseClient,tenant:string,revision:Revision,channel:'website'|'linkedin',hash:string,publicationDate:string){
 const rows=await contentRows(db,tenant);const approval=publicationPermission(rows,revision,channel,hash);if(revisionHead(rows,revision.opportunityId)?.id!==revision.id)throw new MarketingError(409,'A newer revision needs review before release preparation.');
 if(!date(publicationDate))throw new MarketingError(400,'Supply the intended publication date explicitly.');
 if(channel==='linkedin'){
  const li=revision.draft.linkedin!;const publication=rows.find(r=>r.kind==='published_change'&&r.payload.channel==='website'&&r.payload.revisionId===revision.id);
  if(li.linkStrategy==='after_website_publication'&&!publication)throw new MarketingError(409,'Record the real website publication before preparing its LinkedIn link.');
  return {channel,revisionId:revision.id,revisionHash:revision.hash,approvalId:approval.id,manualOnly:true,text:li.text+(li.linkStrategy==='after_website_publication'?'\n\n'+String(publication!.payload.url):li.targetUrl?'\n\n'+li.targetUrl:''),publicationDate};
 }
 if(revision.draft.decision!=='article')return {channel,kind:'reviewable_page_change_proposal',revisionId:revision.id,revisionHash:hash,approvalId:approval.id,proposal:revision.draft.website,publicationDate,requiresGitReview:true,automaticPublishing:false};
 const article=draftArticle(revision,publicationDate),source="import type { Article } from './types';\n\nexport const article: Article = "+JSON.stringify(article,null,2)+';\n';
 return {channel,kind:'article_release',revisionId:revision.id,revisionHash:hash,approvalId:approval.id,filename:`src/content/articles/${article.slug}.ts`,source,article,registryInstruction:'Import this article object in src/content/articles/index.ts under a unique name and add it to the articles array. Run validation, protected Preview, and obtain Production release authorization.',requiresGitReview:true,automaticPublishing:false};
}
export async function recordPublication(db:SupabaseClient,tenant:string,actor:string,revision:Revision,channel:'website'|'linkedin',hash:string,url:string,publicationDate:string,releaseCommit:string|null){
 const rows=await contentRows(db,tenant),approval=publicationPermission(rows,revision,channel,hash);if(!date(publicationDate)||releaseCommit!==null&&!/^[a-f0-9]{40}$/.test(releaseCommit))throw new MarketingError(400,'Supply the actual publication date and an optional full release commit.');
 let parsed:URL;try{parsed=new URL(url);}catch{throw new MarketingError(400,'Provide the actual publication URL.');}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port||parsed.hash||parsed.search)throw new MarketingError(400,'Use the canonical publication URL without credentials, query or fragment.');
 const expected=revision.draft.decision==='existing_page_update'?revision.draft.website?.targetUrl:revision.draft.decision==='solution_page'?site.url+'/'+revision.draft.website?.slug:site.url+articleHref(revision.draft.website?.slug??'');
 if(channel==='website'&&url!==expected||channel==='linkedin'&&(!['linkedin.com','www.linkedin.com'].includes(parsed.hostname)||!/^\/(posts|feed\/update|pulse)\//.test(parsed.pathname)))throw new MarketingError(400,'This URL does not match the approved publication channel and draft.');
 const id=stableId(revision.id+':publication:'+channel),existing=rows.find(r=>r.id===id);if(existing){if(existing.payload.url===url&&existing.payload.publicationDate===publicationDate&&existing.payload.releaseCommit===releaseCommit)return {id,reused:true};throw new MarketingError(409,'A different immutable publication record already exists.');}
 const r=await db.from('marketing_artifacts').insert({id,tenant_id:tenant,kind:'published_change',parent_id:revision.opportunityId,actor_id:actor,title:'Owner-recorded '+channel+' publication',payload:{domain:contentDomain,workflow:'content-publication/v1',revisionId:revision.id,revisionHash:revision.hash,channel,url,publicationDate,approvalId:approval.id,sourceFindingId:revision.input.assignment.findingId,sourceOpportunityApprovalId:revision.input.assignment.approvalId,evidenceReferences:revision.input.assignment.evidence.map(d=>d.id),sourceSnapshotHashes:revision.input.sources.map(s=>({id:s.id,hash:s.snapshotHash})),baselinePeriods:revision.grounding.publicationBaseline??[],releaseCommit,verification:'owner_attested',automaticallyPublished:false}});if(r.error)throw new MarketingError(409,'Publication record could not be saved; refresh before retrying.');return {id,reused:false};
}
