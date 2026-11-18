import 'server-only';
import {randomUUID} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {intelligenceSchema,intelligenceContextSchema,safeSource,type Intelligence,type KeywordResearchProvider,type CompetitiveResearchProvider} from '@augmented-architect/seo-analyst';
import {marketingRows,loadBacklog} from '../opportunities/repository';
import {stableId} from '../opportunities/identity';
import {MarketingError,marketingTenant,uuidPattern} from '../config';
import type {Artifact} from '../opportunities/contracts';
import {researchConnections,researchPolicy,googleAdsProvider,dataForSeoProvider} from './providers';
import {approvedBusinessEvidence} from './context';

export type ResearchCommand={requestId:string;mode:'ideas'|'historical'|'competition';service:'salesforce'|'ai-solutions'|'custom-applications';seeds:string[];target:{country:string;language:string}};
export type SavedResearch={id:string;createdAt:string;query:ResearchCommand;bundle:Intelligence;cached:boolean;scope:string};
const domain='opportunity-intelligence';
export async function intelligenceRecords(db:SupabaseClient,tenant:string){return await marketingRows(db,'marketing_artifacts',tenant,domain) as Artifact[];}
export function savedResearch(rows:Artifact[]):SavedResearch[]{
  return rows.filter(r=>r.payload.workflow==='intelligence-research/v1'&&r.payload.state==='completed').map(r=>({id:r.id,createdAt:r.created_at,query:r.payload.query as ResearchCommand,bundle:intelligenceSchema.parse(r.payload.bundle),cached:Boolean(r.payload.cached),scope:String(r.payload.scope??'unknown')})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
}
export function parseResearchCommand(value:Record<string,unknown>):ResearchCommand {
  const keys=['requestId','mode','service','seeds','target'],target=value.target as Record<string,unknown>;
  if(Object.keys(value).some(k=>!keys.includes(k))||typeof value.requestId!=='string'||!uuidPattern.test(value.requestId)||!['ideas','historical','competition'].includes(String(value.mode))||!['salesforce','ai-solutions','custom-applications'].includes(String(value.service))||!Array.isArray(value.seeds)||!value.seeds.length||value.seeds.length>5||value.seeds.some(s=>typeof s!=='string'||!s.trim()||s.length>80||/[@\u0000-\u001f]|https?:|(?:^|\s)(?:site|inurl|intitle|intext|filetype|link|define|id|info|inanchor|allinurl|allintitle|allintext|allinanchor):/i.test(s))||!target||typeof target!=='object'||Array.isArray(target)||Object.keys(target).some(k=>!['country','language'].includes(k))||target.country!=='US'||target.language!=='en')throw new MarketingError(400,'Use an authorized service, up to five plain seed terms, and the US/English target. Private contact data and search operators are not accepted.');
  if(value.mode==='competition'&&value.seeds.length!==1)throw new MarketingError(400,'Competitive research accepts one term per bounded request.');
  return {...value,seeds:value.seeds.map(s=>(s as string).trim())} as ResearchCommand;
}
const queryKey=(q:ResearchCommand)=>JSON.stringify({mode:q.mode,service:q.service,target:q.target,seeds:q.seeds.map(s=>s.toLocaleLowerCase('en')).sort(),api:q.mode==='competition'?'v3':'v26'});
export const providerScope=(tenant:string,command:ResearchCommand)=>stableId(tenant+':research-scope-v1:'+command.mode+':'+(command.mode==='competition'?process.env.DATAFORSEO_LOGIN??'unconfigured':(process.env.GOOGLE_ADS_CUSTOMER_ID??'').replaceAll('-','')));
const cacheFresh=(r:SavedResearch,now:Date)=>{
  const sources=[...r.bundle.collections,...r.bundle.market.map(m=>m.provenance),...r.bundle.competition.map(c=>c.provenance)];
  return sources.length>0&&sources.every(p=>Date.parse(p.expiresAt)>now.getTime())&&(r.query.mode==='competition'||r.createdAt.slice(0,7)===now.toISOString().slice(0,7));
};
export async function executeResearch({db,tenant,actor,command,authorize,keyword,competitive,now=new Date(),enabled}:{db:SupabaseClient;tenant:string;actor:string;command:ResearchCommand;authorize:()=>Promise<void>;keyword?:KeywordResearchProvider;competitive?:CompetitiveResearchProvider;now?:Date;enabled?:boolean}){
  if(tenant!==marketingTenant)throw new MarketingError(403,'Unauthorized research tenant.');await authorize();
  const rows=await intelligenceRecords(db,tenant),existing=rows.find(r=>r.id===command.requestId),results=savedResearch(rows),scope=providerScope(tenant,command);
  if(existing){if(existing.payload.workflow!=='intelligence-request/v1'||existing.actor_id!==actor||existing.payload.scope!==scope||queryKey(existing.payload.query as ResearchCommand)!==queryKey(command))throw new MarketingError(409,'Request ID already belongs to another research command.');const result=results.find(r=>r.id===stableId(command.requestId+':result'));if(result)return {research:result,reused:true};throw new MarketingError(409,'This request was already claimed. Inspect its history; it will not be replayed automatically.');}
  const cached=results.find(r=>r.scope===scope&&queryKey(r.query)===queryKey(command)&&cacheFresh(r,now));if(cached)return {research:cached,reused:true};
  const providerId=command.mode==='competition'?'dataforseo':'google_ads',connection=researchConnections().find(c=>c.id===providerId)!;
  if(enabled!==true&&!connection.ready)throw new MarketingError(503,connection.message);
  const guards=rows.filter(r=>r.payload.workflow==='intelligence-budget/v1').sort((a,b)=>b.created_at.localeCompare(a.created_at));
  if(guards.some(r=>now.getTime()-Date.parse(r.created_at)<researchPolicy.minimumIntervalMs))throw new MarketingError(429,'Allow one minute between provider requests.');
  if(guards.filter(r=>Date.parse(r.created_at)>now.getTime()-86400000).length>=researchPolicy.maximumDailyRequests)throw new MarketingError(429,'The ten-request daily research budget has been reached.');
  const guardId=stableId(tenant+':intelligence-budget-v1:'+(guards[0]?.id??'initial'));
  const guard=await db.from('marketing_artifacts').insert({id:guardId,tenant_id:tenant,kind:'measurement',title:'Manual research budget reservation',actor_id:actor,payload:{domain,workflow:'intelligence-budget/v1',requestId:command.requestId,previousId:guards[0]?.id??null}});if(guard.error)throw new MarketingError(409,'Another research request claimed this workspace. No provider request was sent.');
  const claim=await db.from('marketing_artifacts').insert({id:command.requestId,tenant_id:tenant,kind:'measurement',title:'Manual intelligence request',actor_id:actor,payload:{domain,workflow:'intelligence-request/v1',query:command,scope}});if(claim.error)throw new MarketingError(409,'Research request already claimed. No duplicate provider request was sent.');
  const resultId=stableId(command.requestId+':result');
  try{
    await authorize();const signal=AbortSignal.timeout(30000);
    const bundle:Intelligence={version:'opportunity-intelligence/v1',id:resultId,collections:[],market:[],competition:[],business:approvedBusinessEvidence(command.service,now),limitations:['Provider search volume is an estimate, not this business’s measured demand or conversions.','Advertising competition and bid metrics do not measure organic difficulty.','Only bounded provider results are collected; page content, traffic and backlinks are not inferred.']};
    if(command.mode==='competition'){const provider=competitive??dataForSeoProvider({login:process.env.DATAFORSEO_LOGIN!,password:process.env.DATAFORSEO_PASSWORD!});const observation=await provider.research(command.seeds[0],command.target,signal);bundle.competition=[observation];bundle.collections=[observation.provenance];}
    else{const provider=keyword??googleAdsProvider({customerId:(process.env.GOOGLE_ADS_CUSTOMER_ID??'').replaceAll('-',''),currency:process.env.GOOGLE_ADS_CURRENCY||null});const response=await provider.research({...command,mode:command.mode},signal);bundle.market=response.records;bundle.collections=[response.provenance];}
    intelligenceSchema.parse(bundle);if([...bundle.collections,...bundle.market.map(m=>m.provenance),...bundle.competition.map(c=>c.provenance)].some(p=>p.sourceUrls.some(u=>!safeSource(u)))||bundle.competition.some(c=>c.results.some(r=>!safeSource(r.url))))throw new MarketingError(503,'Research source provenance was unsafe.');await authorize();
    const saved=await db.from('marketing_artifacts').insert({id:resultId,tenant_id:tenant,kind:'measurement',title:command.seeds.join(', ').slice(0,200),parent_id:command.requestId,actor_id:actor,payload:{domain,workflow:'intelligence-research/v1',state:'completed',query:command,bundle,cached:false,scope}});if(saved.error)throw new MarketingError(503,'Provider research finished but could not be persisted. Inspect the request before any new action.');
    return {research:{id:resultId,createdAt:now.toISOString(),query:command,bundle,cached:false,scope},reused:false};
  }catch(error){await db.from('marketing_artifacts').insert({id:stableId(command.requestId+':failure'),tenant_id:tenant,kind:'measurement',title:'Manual research failed',parent_id:command.requestId,actor_id:actor,payload:{domain,workflow:'intelligence-failure/v1',query:command,error:'Provider access, response validation or persistence failed. No automatic retry was started.'}});throw error;}
}
export async function linkResearch(db:SupabaseClient,tenant:string,actor:string,researchId:string,opportunityId:string,term:string){
  const [rows,backlog]=await Promise.all([intelligenceRecords(db,tenant),loadBacklog(db,tenant)]),research=savedResearch(rows).find(r=>r.id===researchId),opportunity=backlog.opportunities.find(o=>o.id===opportunityId);
  if(!research||!opportunity||![...research.bundle.market.map(r=>r.term),...research.bundle.competition.map(r=>r.term)].includes(term))throw new MarketingError(404,'Research term or opportunity not found in this workspace.');
  const id=stableId(tenant+':research-link:'+researchId+':'+opportunityId+':'+term),result=await db.from('marketing_artifacts').insert({id,tenant_id:tenant,kind:'measurement',title:'Linked keyword evidence',parent_id:opportunityId,actor_id:actor,payload:{domain,workflow:'intelligence-link/v1',researchId,term}});
  if(result.error&&result.error.code!=='23505')throw new MarketingError(503,'Research link could not be saved.');return {id,reused:Boolean(result.error)};
}
export function intelligenceContext(rows:Artifact[]):Intelligence|undefined {
  const records=savedResearch(rows).filter(r=>r.query.service==='salesforce'&&cacheFresh(r,new Date()));if(!records.length)return undefined;
  const bundle:Intelligence={version:'opportunity-intelligence/v1',id:randomUUID(),collections:records.flatMap(r=>r.bundle.collections).slice(0,3),market:records.flatMap(r=>r.bundle.market).slice(0,10),competition:records.flatMap(r=>r.bundle.competition).slice(0,1).map(c=>({...c,results:c.results.slice(0,8),findings:c.findings.filter(f=>f.sourceUrls.every(u=>c.results.slice(0,8).some(r=>r.url===u)||c.provenance.sourceUrls.includes(u)))})),business:records.find(r=>r.bundle.business)?.bundle.business??null,limitations:['Saved research is bounded and may omit older or unrelated terms; at most eight observed competitor pages enter model context. Full source records remain available to the owner.','Keyword Planner volume is a provider estimate; SERP positions apply only to the recorded query, geography and collection time.']};
  while(new TextEncoder().encode(JSON.stringify(bundle)).length>9000||!intelligenceContextSchema.safeParse(bundle).success){if(bundle.market.length)bundle.market.pop();else if(bundle.competition.length)bundle.competition.pop();else if(bundle.collections.length)bundle.collections.pop();else return undefined;}
  return bundle;
}
