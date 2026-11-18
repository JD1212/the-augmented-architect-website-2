import 'server-only';
import {marketEvidenceSchema,competitiveEvidenceSchema,safeSource,type KeywordResearchProvider,type CompetitiveResearchProvider,type TargetMarket,type Provenance} from '@augmented-architect/seo-analyst';
import {MarketingError} from '../config';

const root='https://api.dataforseo.com/v3/';
const methods={ideas:'keywords_data/google_ads/keywords_for_keywords/live',historical:'keywords_data/google_ads/search_volume/live',competition:'serp/google/organic/live/advanced'} as const;
export const dataForSeoPrices={ideas:.09,historical:.09,competition:.002} as const;
export const firstResearchExperiment={id:'salesforce-demand-v1',seeds:['Salesforce automation consulting','Salesforce Flow optimization','Salesforce Apex consultant','Salesforce org cleanup','Salesforce technical debt'],competitionTerms:['Salesforce automation consulting','Salesforce org cleanup'],maximumRequests:4,maximumCostUsd:.184} as const;
export function dataForSeoTarget(env=process.env){
 const locationCode=Number(env.DATAFORSEO_LOCATION_CODE??2840),country=env.DATAFORSEO_COUNTRY_CODE??'US',language=env.DATAFORSEO_LANGUAGE_CODE??'en';
 if(!Number.isSafeInteger(locationCode)||locationCode<=0||!/^[A-Z]{2}$/.test(country)||!/^[a-z]{2}$/.test(language))throw new MarketingError(503,'The server research target needs a valid provider location, country and language.');
 return {locationCode,country,language};
}
export function dataForSeoApproval(env=process.env){
 const id=env.DATAFORSEO_APPROVAL_ID??'',maximumRequests=Number(env.DATAFORSEO_MAX_REQUESTS??0),maximumCostUsd=Number(env.DATAFORSEO_BUDGET_USD??0);
 return {id,maximumRequests,maximumCostUsd,configured:/^[a-zA-Z0-9_-]{1,80}$/.test(id)&&Number.isInteger(maximumRequests)&&maximumRequests>=1&&maximumRequests<=10&&Number.isFinite(maximumCostUsd)&&maximumCostUsd>0&&maximumCostUsd<=1};
}
export class DataForSeoError extends MarketingError {
 constructor(message:string,readonly receipt:Provenance|null=null){super(503,message);}
}
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const numeric=(v:unknown,integer=false)=>{if(v===null||v===undefined)return null;if(typeof v!=='number'||!Number.isFinite(v)||v<0||integer&&!Number.isSafeInteger(v))throw new DataForSeoError('Provider numeric data did not pass validation.');return v;};
const micros=(v:unknown)=>{const n=numeric(v);if(n===null)return null;const m=Math.round(n*1000000);if(!Number.isSafeInteger(m))throw new DataForSeoError('Provider bid amount exceeded the supported range.');return m;};
const plain=(term:string)=>term.trim().length>0&&term.length<=80&&term.trim().split(/\s+/).length<=10&&!/[@\u0000-\u001f]|https?:|(?:^|\s)(?:site|inurl|intitle|intext|filetype|link|define|id|info|inanchor|allinurl|allintitle|allintext|allinanchor):/i.test(term);
type Options={login:string;password:string;fetcher?:typeof fetch;now?:()=>Date;target?:ReturnType<typeof dataForSeoTarget>};
function client({login,password,fetcher=fetch,now=()=>new Date(),target=dataForSeoTarget()}:Options){
 const check=(terms:string[],market:TargetMarket)=>{if(!terms.length||terms.length>5||terms.some(t=>!plain(t))||market.country!==target.country||market.language!==target.language)throw new MarketingError(400,'Use plain seed terms and the configured research target.');};
 const request=async(mode:keyof typeof methods,data:object,signal:AbortSignal)=>{
  let receipt:Provenance|null=null;
  try{
   const r=await fetcher(root+methods[mode],{method:'POST',redirect:'error',cache:'no-store',headers:{Authorization:'Basic '+Buffer.from(login+':'+password).toString('base64'),'Content-Type':'application/json'},body:JSON.stringify([{location_code:target.locationCode,language_code:target.language,...data}]),signal:AbortSignal.any([signal,AbortSignal.timeout(20000)])});
   if(!r.ok)throw new DataForSeoError('DataForSEO access or transport failed. No retry was started.');
   // Discovery may return up to 20,000 ideas. Bound the response, then retain at most 50.
   const reader=r.body?.getReader();if(!reader)throw new DataForSeoError('DataForSEO returned no response body.');const chunks:Uint8Array[]=[];let size=0;
   try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>32*1024*1024)throw new DataForSeoError('DataForSEO response exceeded the bounded size. Inspect the provider task before retrying.');chunks.push(part.value);}}finally{await reader.cancel();}
   const body=object(JSON.parse(Buffer.concat(chunks).toString('utf8'))),tasks=body.tasks;
   if(body.status_code!==20000||!Array.isArray(tasks)||tasks.length!==1)throw new DataForSeoError('DataForSEO did not return one successful task envelope.');
   const task=object(tasks[0]),time=now(),cost=numeric(task.cost),requestId=typeof task.id==='string'&&task.id.length<=150?task.id:null;
   receipt={provider:mode==='competition'?'dataforseo':'dataforseo_keywords',apiVersion:'v3',collectedAt:time.toISOString(),expiresAt:new Date(time.getTime()+(mode==='competition'?86400000:604800000)).toISOString(),requestId,reportedCostUsd:cost,sourceUrls:['https://docs.dataforseo.com/v3/'+methods[mode]+'/']};
   if(cost===null||cost>dataForSeoPrices[mode]+.000000001)throw new DataForSeoError('DataForSEO cost receipt exceeded or did not establish the reserved request price. Further requests require review.',receipt);
   if(task.status_code!==20000)throw new DataForSeoError('DataForSEO task failed. No metrics or rankings were inferred.',receipt);
   if(task.result!==null&&!Array.isArray(task.result))throw new DataForSeoError('DataForSEO results did not pass validation.',receipt);
   return {results:(task.result??[]) as unknown[],receipt};
  }catch(error){if(error instanceof DataForSeoError)throw error;throw new DataForSeoError('DataForSEO response or transport validation failed. Inspect history before any new request.',receipt);}
 };
 return {check,request};
}
export function dataForSeoKeywordProvider(options:Options):KeywordResearchProvider {
 const {check,request}=client(options);
 return {id:'dataforseo_keywords',async research(query,signal){
  check(query.seeds,query.target);
  const {results,receipt}=await request(query.mode,{keywords:query.seeds,search_partners:false,...(query.mode==='ideas'?{sort_by:'relevance',include_adult_keywords:false}:{})},signal);
  try{
   const records=results.slice(0,50).map(raw=>{const r=object(raw),months=r.monthly_searches??[];
    if(r.location_code!=null&&r.location_code!==(options.target??dataForSeoTarget()).locationCode||r.language_code!=null&&r.language_code!==query.target.language||r.search_partners===true||!Array.isArray(months))throw Error();
    // If Google corrected spelling, the returned metrics describe that correction.
    const term=typeof r.spell==='string'&&r.spell?r.spell:r.keyword;
    return marketEvidenceSchema.parse({category:'market_intelligence',term,variants:typeof r.keyword==='string'&&r.keyword!==term?[r.keyword]:[],cluster:query.service,target:query.target,estimatedMonthlySearches:numeric(r.search_volume,true),monthly:months.slice(0,48).map(v=>{const m=object(v);return {year:numeric(m.year,true),month:numeric(m.month,true),estimatedSearches:numeric(m.search_volume,true)};}),advertisingCompetition:r.competition??null,advertisingCompetitionIndex:numeric(r.competition_index,true),lowTopOfPageBidMicros:micros(r.low_top_of_page_bid),highTopOfPageBidMicros:micros(r.high_top_of_page_bid),averageCpcMicros:micros(r.cpc),currency:'USD',provenance:receipt});
   });return {records,provenance:receipt};
  }catch{throw new DataForSeoError('DataForSEO keyword metrics did not pass evidence validation.',receipt);}
 }};
}
export function dataForSeoProvider(options:Options):CompetitiveResearchProvider {
 const {check,request}=client(options);
 return {id:'dataforseo',async research(term,target,signal){
  check([term],target);const {results,receipt}=await request('competition',{keyword:term,device:'desktop',depth:10,max_crawl_pages:1},signal);
  try{
   const result=object(results[0]);if(results.length!==1||result.location_code!=null&&result.location_code!==(options.target??dataForSeoTarget()).locationCode||result.language_code!=null&&result.language_code!==target.language)throw Error();
   const items=result.items??[];if(!Array.isArray(items))throw Error();
   const pages=items.map(object).filter(i=>i.type==='organic').slice(0,10).map(i=>{if(typeof i.url!=='string'||!safeSource(i.url))throw Error();return {url:i.url,domain:new URL(i.url).hostname,title:String(i.title??'').slice(0,300),snippet:String(i.description??'').slice(0,1000),observedOrganicPosition:numeric(i.rank_group,true),contentType:null};});
   const observed=typeof result.datetime==='string'?Date.parse(result.datetime):NaN;
   return competitiveEvidenceSchema.parse({category:'competitive_intelligence',term,target,searchEngine:'google',device:'desktop',observedAt:Number.isFinite(observed)?new Date(observed).toISOString():null,results:pages,findings:[],provenance:receipt});
  }catch{throw new DataForSeoError('DataForSEO search results did not pass evidence validation.',receipt);}
 }};
}
