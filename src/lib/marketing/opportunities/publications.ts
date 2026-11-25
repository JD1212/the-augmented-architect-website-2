import type {Artifact} from './contracts';
import {site} from '@/content/site';
import {articleHref} from '@/lib/article-path';
/** Current verified pointers determine live state. Immutable events remain history, not proof of continued availability. */
export function opportunityPublications(artifacts:Artifact[],opportunityId:string){
 return artifacts.filter(a=>a.parent_id===opportunityId&&a.payload.workflow==='website-publication-pointer/v1').map(a=>{
  const p=a.payload,environment=String(p.environment??'unknown'),slug=String(p.slug??'');
  const validSlug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),verified=p.status==='live'&&p.active===true&&typeof p.verifiedAt==='string';
  const revision=artifacts.find(r=>r.id===p.revisionId&&r.parent_id===opportunityId&&r.kind==='content_draft');
  const input=revision?.payload.input as {assignment?:{findingId?:string}}|undefined;
  return {environment,status:String(p.status??'unknown'),live:verified,slug,path:validSlug?articleHref(slug):null,url:verified&&environment==='production'&&validSlug?site.url+articleHref(slug):null,revisionId:String(p.revisionId??''),sourceFindingId:input?.assignment?.findingId??null};
 });
}
