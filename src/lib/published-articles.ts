import 'server-only';
import {cacheLife,cacheTag} from 'next/cache';
import {createClient} from '@supabase/supabase-js';
import {getPublishedArticles,articleHref} from './articles';
import type {Article} from '@/content/articles/types';
import {marketingTenant} from './marketing/config';
import {publicationEnvironment,pointerWorkflow,publicArticle} from './marketing/content/publication-contract';
export const publicationTag=()=> 'website-publications:'+publicationEnvironment();
/** Returns only publication snapshots and withdrawal markers, never an editorial artifact. */
async function snapshots(){
 'use cache';
 cacheTag(publicationTag());cacheLife({stale:0,revalidate:30,expire:60});
 if(!process.env.SUPABASE_SECRET_KEY)return [];
 if(process.env.SUPABASE_URL!=='https://cjldcaiybqguklzqtdjj.supabase.co')throw Error('Article database is not configured.');
 const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,cache:'no-store',signal:AbortSignal.timeout(10000)})}});
 const result=await db.from('marketing_artifacts').select('state:payload->status,active:payload->active,slug:payload->slug,article:payload->article,version:payload->publicHash,verifiedAt:payload->verifiedAt').eq('tenant_id',marketingTenant).eq('kind','measurement').eq('payload->>workflow',pointerWorkflow).eq('payload->>environment',publicationEnvironment()).limit(1001);
 if(result.error||result.data.length>1000)throw Error('Published articles are temporarily unavailable.');
 return result.data.map(row=>({slug:String(row.slug),active:row.active===true,article:row.active===true?publicArticle(row.article as unknown as Article):null,version:typeof row.version==='string'?row.version:undefined,modifiedDate:typeof row.verifiedAt==='string'?row.verifiedAt:undefined}));
}
export async function publishedArticles():Promise<readonly Article[]>{
 const rows=await snapshots(),bySlug=new Map(getPublishedArticles().map(a=>[a.slug,a]));
 for(const row of rows){if(row.active&&row.article)bySlug.set(row.slug,{...row.article,publication:{id:row.article.publication!.id,version:row.version},modifiedDate:row.modifiedDate});else bySlug.delete(row.slug);}
 return [...bySlug.values()].sort((a,b)=>(b.publishedDate??'').localeCompare(a.publishedDate??''));
}
export async function publishedArticle(slug:string){return (await publishedArticles()).find(a=>a.slug===slug);}
export async function articleAnalyticsPages(){return (await publishedArticles()).map(a=>({path:articleHref(a.slug),title:a.title,publicationId:a.publication?.id}));}
