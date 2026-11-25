import 'server-only';
import {createHash} from 'node:crypto';
import {sourceSchema,type Source} from '@augmented-architect/content-strategist';
import {safeSource} from '@augmented-architect/seo-analyst';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketingError,marketingTenant} from '../config';
import type {Artifact} from '../opportunities/contracts';
import {loadBacklog} from '../opportunities/repository';
import {stableId} from '../opportunities/identity';
import {canonicalSource} from './sources';
export type SourceReview={url:string;title:string;notes:string;location:string;reviewedAt:string;reviewConfirmed:true};
const snapshotHash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Reviewed notes are data, not instructions. There is no arbitrary server-side fetch. */
export function sourceReview(value:unknown,allowedUrls:string[],now=new Date()):Source{
 const v=value as SourceReview;
 if(!v||Object.keys(v).some(k=>!['url','title','notes','location','reviewedAt','reviewConfirmed'].includes(k))||v.reviewConfirmed!==true||typeof v.url!=='string'||!safeSource(v.url)||!allowedUrls.some(url=>canonicalSource(url)===canonicalSource(v.url))||typeof v.title!=='string'||!v.title.trim()||v.title.length>300||typeof v.notes!=='string'||v.notes.trim().length<80||v.notes.length>12000||typeof v.location!=='string'||!v.location.trim()||v.location.length>500||typeof v.reviewedAt!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v.reviewedAt)||!Number.isFinite(Date.parse(v.reviewedAt))||Date.parse(v.reviewedAt)>now.getTime()||now.getTime()-Date.parse(v.reviewedAt)>30*86400000)throw new MarketingError(400,'Review a cited public source, supply accurate notes and a verification location, and confirm a review within the last thirty days.');
 const snapshot={url:canonicalSource(v.url),title:v.title.trim(),content:v.notes.trim()+'\nVerification location: '+v.location.trim(),retrievedAt:v.reviewedAt};
 const hash=snapshotHash(snapshot);
 return sourceSchema.parse({...snapshot,id:'reviewed-'+hash.slice(0,32),snapshotHash:hash,verified:true,limitations:['Owner-reviewed source notes, not a full-page capture. Reverify material changes before publication.','Notes support only their stated claims, not demand, outcomes or implemented business capabilities.']});
}
export async function saveSourceReview(db:SupabaseClient,tenant:string,actor:string,opportunityId:string,findingId:string,value:unknown){
 if(tenant!==marketingTenant)throw new MarketingError(403,'Unauthorized source review.');
 const backlog=await loadBacklog(db,tenant),o=backlog.opportunities.find(o=>o.id===opportunityId);
 if(!o||o.findingId!==findingId)throw new MarketingError(409,'This finding changed. Review its current sources before saving.');
 const source=sourceReview(value,o.finding.sourceUrls),id=stableId(tenant+':source-review:'+findingId+':'+source.snapshotHash);
 const r=await db.from('marketing_artifacts').insert({id,tenant_id:tenant,kind:'measurement',parent_id:opportunityId,actor_id:actor,title:source.title,payload:{domain:'content-workflow',workflow:'reviewed-source/v1',findingId,source,reviewConfirmed:true}});
 if(r.error&&r.error.code!=='23505')throw new MarketingError(503,'Source review could not be saved.');
 return {id,reused:Boolean(r.error)};
}
export function sourceReviews(rows:Artifact[],tenant:string,opportunityId:string,findingId:string,urls:string[],now=new Date()):Source[]{
 const allowed=new Set(urls.map(canonicalSource)),seen=new Set<string>();
 return [...rows].sort((a,b)=>b.created_at.localeCompare(a.created_at)).flatMap(r=>{
  if(r.tenant_id!==tenant||r.parent_id!==opportunityId||r.payload.workflow!=='reviewed-source/v1'||r.payload.findingId!==findingId||!r.actor_id||r.payload.reviewConfirmed!==true)return [];
  const parsed=sourceSchema.safeParse(r.payload.source);if(!parsed.success)return [];
  const s=parsed.data;
  if(!safeSource(s.url)||!allowed.has(canonicalSource(s.url))||seen.has(s.url))return [];
  if(s.snapshotHash!==snapshotHash({url:s.url,title:s.title,content:s.content,retrievedAt:s.retrievedAt}))return [];
  seen.add(s.url);return [{...s,verified:Number.isFinite(Date.parse(s.retrievedAt))&&Date.parse(s.retrievedAt)<=now.getTime()&&now.getTime()-Date.parse(s.retrievedAt)<=30*86400000}];
 });
}
