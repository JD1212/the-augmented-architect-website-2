import 'server-only';
import {createHash} from 'node:crypto';
import {articleBriefSchema,type ArticleBrief,type ArticleBriefRevision} from './article-brief';
import type {Artifact} from './contracts';
import {stableId} from './identity';

export const briefWorkflow='owner-article-brief/v1';
export const briefHash=(content:ArticleBrief)=>createHash('sha256').update(JSON.stringify(articleBriefSchema.parse(content))).digest('hex');
export const briefSlot=(tenant:string,opportunityId:string,previousId:string|null)=>stableId(tenant+':owner-article-brief:'+opportunityId+':'+(previousId??'initial'));
/** Append-only chain; never rewrites the SEO finding or its evidence. */
export function articleBriefHistory(rows:Artifact[],tenant:string,opportunityId:string):ArticleBriefRevision[]{
 const candidates=rows.filter(r=>r.tenant_id===tenant&&r.parent_id===opportunityId&&r.payload.workflow===briefWorkflow),history:ArticleBriefRevision[]=[];
 for(let i=0;i<candidates.length;i++){
  const previous=history.at(-1)?.id??null,row=candidates.find(r=>r.id===briefSlot(tenant,opportunityId,previous));if(!row)throw Error('Invalid owner brief history.');
  const p=row.payload,content=articleBriefSchema.parse(p.content);
  if(p.previousBriefId!==previous||p.version!==history.length+1||p.hash!==briefHash(content)||!row.actor_id||typeof p.findingId!=='string'||typeof p.evidenceArtifactId!=='string')throw Error('Invalid owner brief snapshot.');
  history.push({id:row.id,hash:String(p.hash),version:Number(p.version),previousBriefId:previous,findingId:p.findingId,evidenceArtifactId:p.evidenceArtifactId,...(p.researchWorkflow?{researchWorkflow:p.researchWorkflow as ArticleBriefRevision['researchWorkflow']}:{}),content,createdAt:row.created_at,actorId:row.actor_id});
 }
 return history;
}
export {currentBriefApproved} from './article-brief';
