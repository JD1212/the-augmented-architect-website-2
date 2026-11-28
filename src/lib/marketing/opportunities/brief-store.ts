import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketingError,marketingTenant} from '../config';
import {loadBacklog} from './repository';
import {articleBriefSchema} from './article-brief';
import {briefHash,briefSlot,briefWorkflow} from './brief-records';

export async function saveArticleBrief(db:SupabaseClient,tenant:string,actor:string,input:{opportunityId:string;expectedFindingId:string;expectedBriefId:string|null;brief:unknown}){
 if(tenant!==marketingTenant)throw new MarketingError(403,'Unauthorized article workspace.');
 const parsed=articleBriefSchema.safeParse(input.brief);if(!parsed.success)throw new MarketingError(400,'Provide all brief fields within the displayed limits.');
 const backlog=await loadBacklog(db,tenant),o=backlog.opportunities.find(o=>o.id===input.opportunityId);
 if(!o)throw new MarketingError(404,'Opportunity not found.');
 if(o.findingId!==input.expectedFindingId)throw new MarketingError(409,'The research finding changed. Refresh before saving the brief.');
 const previous=o.ownerBrief,hash=briefHash(parsed.data);
 if((previous?.id??null)!==input.expectedBriefId){if(previous?.previousBriefId===input.expectedBriefId&&previous.hash===hash&&previous.actorId===actor&&previous.findingId===o.findingId)return {id:previous.id,reused:true};throw new MarketingError(409,'The article brief changed. Refresh before saving.');}
 if(previous?.hash===hash&&previous.findingId===o.findingId)return {id:previous.id,reused:true};
 const observation=o.observations.at(-1)!,id=briefSlot(tenant,o.id,input.expectedBriefId);
 const r=await db.from('marketing_artifacts').insert({id,tenant_id:tenant,parent_id:o.id,kind:'measurement',actor_id:actor,title:parsed.data.title,payload:{domain:'content-workflow',workflow:briefWorkflow,version:(previous?.version??0)+1,previousBriefId:input.expectedBriefId,hash,content:parsed.data,findingId:o.findingId,evidenceArtifactId:observation.evidenceArtifactId,...(observation.researchWorkflow?{researchWorkflow:observation.researchWorkflow}:{}),origin:'owner-directed',publishingAuthorized:false,spendingAuthorized:false}});
 if(r.error)throw new MarketingError(409,'The article brief changed. Refresh before saving.');return {id,reused:false};
}
