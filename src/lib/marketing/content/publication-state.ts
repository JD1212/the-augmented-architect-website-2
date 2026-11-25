import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketingError,marketingTenant} from '../config';
import {publicationEnvironment,publishingEnabled,pointerWorkflow,type PublicationPointer} from './publication-contract';
export async function publicationState(db:SupabaseClient,tenant:string,opportunityId:string){
 if(tenant!==marketingTenant)throw new MarketingError(403,'Unauthorized publication workspace.');
 const environment=publicationEnvironment();const r=await db.from('marketing_artifacts').select('*').eq('tenant_id',tenant).eq('parent_id',opportunityId).eq('payload->>environment',environment).order('created_at');
 if(r.error)throw new MarketingError(503,'Publication state is unavailable.');
 const pointer=r.data.find(r=>r.payload.workflow===pointerWorkflow) as PublicationPointer|undefined;
 return {enabled:publishingEnabled(),environment,pointer:pointer??null,history:r.data.filter(r=>r.payload.workflow==='content-publication/v2'||r.payload.workflow==='website-publication-operation/v1').map(r=>({...r,payload:{...r.payload,article:undefined,previousPointer:undefined}}))};
}
