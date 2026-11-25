import 'server-only';
import {createHash} from 'node:crypto';
import type {requireOwner} from '../auth';
import {MarketingError,marketingTenant,uuidPattern} from '../config';
import {googleReportingConfigured} from '../google';
import type {DateRange,ReportTable} from '../types';
import type {ArticleIdentity,ArticleRow,ArticlePerformance,ArticleDetail} from './types';
import {articlePath,liveDay,measured} from './identity';
import {articleGa4,articleSearch,unavailable,type Dataset} from './providers';
type Owner=Awaited<ReturnType<typeof requireOwner>>;
type Bundle={response:ArticlePerformance;traffic:Dataset;events:Dataset;search:Dataset;bookings:Dataset};
const cache=new Map<string,{until:number;value:Promise<Bundle>}>(),queryCache=new Map<string,{until:number;value:Promise<Dataset>}>();
function scope(owner:Owner){if(owner.tenantId!==marketingTenant)throw new MarketingError(403,'Unauthorized article reporting workspace.');}
function rangeCheck(range:DateRange){if(![7,28,90].includes(range.days)||!/^\d{4}-\d{2}-\d{2}$/.test(range.start)||!/^\d{4}-\d{2}-\d{2}$/.test(range.end)||(Date.parse(range.end)-Date.parse(range.start))/86400000!==range.days-1)throw new MarketingError(400,'Choose a supported reporting period.');}
export async function productionArticles(owner:Owner):Promise<ArticleIdentity[]>{
 scope(owner);
 const r=await owner.db.from('marketing_artifacts').select('id,parent_id,title:payload->article->>title,slug:payload->>slug,publication_id:payload->article->publication->>id,canonical_url:payload->>canonicalUrl,revision_id:payload->>revisionId,version_hash:payload->>publicHash,published_date:payload->>firstPublicationDate,verified_at:payload->>verifiedAt').eq('tenant_id',owner.tenantId).eq('kind','measurement').eq('payload->>workflow','website-publication-pointer/v1').eq('payload->>environment','production').eq('payload->>status','live').eq('payload->>active','true').limit(101);
 if(r.error)throw new MarketingError(503,'Production article inventory is unavailable.');if(r.data.length>100)throw new MarketingError(503,'The bounded article report supports up to 100 live articles.');if(!r.data.length)return [];
 const history=await owner.db.from('marketing_artifacts').select('parent_id,verified_at:payload->>verifiedAt,created_at').eq('tenant_id',owner.tenantId).eq('payload->>workflow','content-publication/v2').eq('payload->>environment','production').eq('payload->>status','live').in('parent_id',r.data.map(r=>r.parent_id)).order('created_at').limit(1001);
 if(history.error||history.data.length>1000)throw new MarketingError(503,'Publication timing could not be verified.');
 return r.data.map(row=>{const path=articlePath(row.canonical_url??'');
  if(!path||row.canonical_url!=='https://theaugmentedarchitect.com'+path||path!=='/insights/articles/'+row.slug||!uuidPattern.test(row.publication_id??'')||!uuidPattern.test(row.revision_id??'')||!uuidPattern.test(row.parent_id??'')||!String(row.title??'').trim()||!/^\d{4}-\d{2}-\d{2}$/.test(row.published_date??'')||!/^[a-f0-9]{64}$/.test(row.version_hash??''))throw new MarketingError(503,'A Production publication needs integrity review.');
  const first=history.data.find(h=>h.parent_id===row.parent_id),firstLiveAt=first?.verified_at??row.verified_at;if(!Number.isFinite(Date.parse(firstLiveAt)))throw new MarketingError(503,'A publication has no verified live timestamp.');
  return {id:row.publication_id,documentId:row.parent_id,title:row.title,path,url:row.canonical_url,publishedDate:row.published_date,firstLiveAt,revisionId:row.revision_id,publicVersion:row.version_hash};
 }).sort((a,b)=>b.publishedDate.localeCompare(a.publishedDate)||a.title.localeCompare(b.title));
}
function rowsFor(data:Dataset,article:ArticleIdentity,range:DateRange,byId=false){const first=data.state.timeZone?liveDay(article.firstLiveAt,data.state.timeZone):null;return data.rows.filter(r=>(byId?r.key===article.id:articlePath(r.key)===article.path)&&r.date>=range.start&&r.date<=range.end&&(!first||r.date>=first));}
function sum(data:Dataset,article:ArticleIdentity,range:DateRange,index:number,event?:string,byId=false){const rows=rowsFor(data,article,range,byId).filter(r=>!event||r.event===event);return rows.length?rows.reduce((n,r)=>n+r.values[index],0):undefined;}
function measure(data:Dataset,article:ArticleIdentity,range:DateRange,index:number,event?:string,byId=false){return measured(sum(data,article,range,index,event,byId),data.state,article,range.end,data.state.timeZone);}
function scopeKey(owner:Owner,range:DateRange,articles:ArticleIdentity[]){return createHash('sha256').update(JSON.stringify([process.env.VERCEL_ENV??'development',owner.tenantId,process.env.GA4_PROPERTY_ID,range,articles])).digest('hex');}
function memo<T>(map:Map<string,{until:number;value:Promise<T>}>,key:string,load:()=>Promise<T>){const existing=map.get(key);if(existing&&existing.until>Date.now())return {value:existing.value,cached:true};if(map.size>=12)map.delete(map.keys().next().value!);const value=load();map.set(key,{until:Date.now()+300000,value});value.catch(()=>map.delete(key));return {value,cached:false};}
async function bundle(owner:Owner,range:DateRange){
 scope(owner);rangeCheck(range);const articles=await productionArticles(owner),key=scopeKey(owner,range,articles);
 const result=memo(cache,key,async()=>{
  const paths=articles.map(a=>a.path),ids=articles.map(a=>a.id),none=unavailable('No verified Production articles.');
  const configured=googleReportingConfigured();
  const [traffic,events,search,bookings]=!paths.length?[none,none,none,none]:!configured?Array.from({length:4},()=>unavailable('Keyless Google reporting is not configured.','not_configured')):await Promise.all([articleGa4(range,paths,'traffic',ids),articleGa4(range,paths,'events',ids),articleSearch(range,paths),articleGa4(range,paths,'bookings',ids)]);
  const items:ArticleRow[]=articles.map(a=>({...a,metrics:{views:measure(traffic,a,range,0),engagementSeconds:measure(traffic,a,range,1),engagements:measure(events,a,range,0,'article_engagement'),consultationStarts:measure(events,a,range,0,'article_consultation_start'),bookings:measure(bookings,a,range,0,undefined,true),clicks:measure(search,a,range,0),impressions:measure(search,a,range,1)}}));
  return {response:{range,articles:items,sources:{traffic:traffic.state,events:events.state,search:search.state,bookings:bookings.state},retrievedAt:new Date().toISOString(),cached:false},traffic,events,search,bookings};
 });return {...await result.value,cached:result.cached,key};
}
export async function articlePerformance(owner:Owner,range:DateRange){const b=await bundle(owner,range);return {...b.response,cached:b.cached};}
function daily(data:Dataset,article:ArticleIdentity,range:DateRange,search=false):ReportTable|null{
 if(['unavailable','not_configured'].includes(data.state.status))return null;
 const byDate=new Map<string,number[]>();for(const row of rowsFor(data,article,range)){const old=byDate.get(row.date)??[0,0];byDate.set(row.date,[old[0]+row.values[0],old[1]+row.values[1]]);}
 return {columns:search?['Clicks','Impressions']:['Page views','Engagement seconds'],rows:[...byDate].sort(([a],[b])=>a.localeCompare(b)).map(([label,values])=>({label,values})),limited:data.state.status==='partial'};
}
export async function articleDetail(owner:Owner,range:DateRange,id:string):Promise<ArticleDetail>{
 if(!uuidPattern.test(id))throw new MarketingError(400,'Choose a published article.');const b=await bundle(owner,range),article=b.response.articles.find(a=>a.id===id);if(!article)throw new MarketingError(404,'This article is not a verified live Production publication.');
 const first=liveDay(article.firstLiveAt,'America/Los_Angeles'),queryRange={...range,start:first&&first>range.start?first:range.start};
 const queries=first&&first>range.end||['unavailable','not_configured'].includes(b.search.state.status)?{rows:[],state:b.search.state}:await memo(queryCache,b.key+':'+id,()=>articleSearch(queryRange,[article.path],true)).value;
 const revision=await owner.db.from('marketing_artifacts').select('payload').eq('tenant_id',owner.tenantId).eq('id',article.revisionId).eq('payload->>workflow','content-revision/v1').maybeSingle();if(revision.error)throw new MarketingError(503,'Article research context is unavailable.');
 const payload=revision.data?.payload,assignment=payload?.input?.assignment,brief=payload?.grounding?.seoBrief??assignment?.seoBrief;
 const origin=payload?.input?.version==='owner-authored/v1'?'owner-authored':assignment?'agent':'unknown';
 const linked=assignment?.version==='owner-import/v1'?assignment.linkedOpportunityId:assignment?.opportunityId,opportunityId=uuidPattern.test(linked??'')?linked:null;
 let opportunityTitle:string|null=null;if(opportunityId){const r=await owner.db.from('marketing_artifacts').select('title').eq('tenant_id',owner.tenantId).eq('id',opportunityId).maybeSingle();if(r.error)throw new MarketingError(503,'Research association is unavailable.');opportunityTitle=r.data?.title??null;}
 const keywords=[brief?.primaryKeyword,...(brief?.supportingKeywords??[])].filter((k):k is string=>typeof k==='string'&&k.length>0&&k.length<=200);
 return {article,range,traffic:daily(b.traffic,article,range),search:daily(b.search,article,range,true),queries:['unavailable','not_configured'].includes(queries.state.status)?null:{columns:['Clicks','Impressions','CTR','Avg. position'],rows:queries.rows.map(r=>({label:r.key,values:r.values})),limited:queries.state.status==='partial'},context:{origin,opportunityId:opportunityId??null,opportunityTitle,keywords:[...new Set(keywords)].slice(0,25)},sources:b.response.sources,querySource:queries.state,firstPartyBookings:null,notes:['Only verified Production publications and public business hosts are measured.','GA4 is consented browser reporting, not the complete booking ledger. A confirmed-booking event is not proof of causal conversion or revenue.','Cross-page booking attribution requires the event-scoped origin_publication_id custom dimension; registration is not retroactive.','The booking ledger has no article identifier, so first-party verified booking attribution remains unknown.','Dates use the GA4 property timezone and Pacific Time for Search Console. Recent reporting can lag 24–48 hours or longer.','Search Console may withhold queries; absent queries are not proof of no searches. Thresholded or truncated counts are partial.','Each canonical URL retains measurement across approved content updates. No historical version lift is inferred.']};
}
