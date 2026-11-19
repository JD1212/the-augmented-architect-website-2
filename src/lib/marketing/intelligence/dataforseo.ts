import 'server-only';
import {marketEvidenceSchema,competitiveEvidenceSchema,safeSource,type KeywordResearchProvider,type CompetitiveResearchProvider,type TargetMarket,type Provenance} from '@augmented-architect/seo-analyst';
import {MarketingError} from '../config';

const root='https://api.dataforseo.com/v3/';
const methods={ideas:'keywords_data/google_ads/keywords_for_keywords/live',historical:'keywords_data/google_ads/search_volume/live',competition:'serp/google/organic/live/advanced',aiChatgpt:'ai_optimization/chat_gpt/llm_scraper/live/advanced',aiGemini:'ai_optimization/gemini/llm_scraper/live/advanced',aiMentions:'ai_optimization/llm_mentions/search_mentions/live'} as const;
export const dataForSeoPrices={ideas:.09,historical:.09,competition:.002,aiChatgpt:.004,aiGemini:.004,aiMentions:.11} as const;
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
export type DataForSeoFailureCategory='authentication'|'permissions'|'insufficient_balance'|'rate_limit'|'transport'|'unexpected_response';
export type DataForSeoDiagnostic={version:'dataforseo-failure/v1';requestId:string|null;endpoint:typeof methods[keyof typeof methods];httpStatus:number|null;providerStatusCode:number|null;category:DataForSeoFailureCategory;providerRequestId:string|null;reportedCostUsd:number|null;stage:'transport'|'http_response'|'provider_response'|'evidence'|'application'};
const safeCode=(v:unknown)=>typeof v==='number'&&Number.isInteger(v)&&v>=10000&&v<=99999?v:null;
const safeCost=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
const safeId=(v:unknown,secrets:readonly string[]=[])=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,150}$/.test(v)&&!secrets.some(s=>s&&v.includes(s))?v:null;
function failureCategory(http:number|null,code:number|null):DataForSeoFailureCategory {
 if(code===40100)return 'authentication';
 if([40104,40201,40204,40207,40208].includes(code??0))return 'permissions';
 if([40200,40210].includes(code??0))return 'insufficient_balance';
 if([40202,40203,40205,40206,40209].includes(code??0))return 'rate_limit';
 return http===401?'authentication':http===403?'permissions':http===402?'insufficient_balance':http===429?'rate_limit':'unexpected_response';
}
// Reconstruct an allowlisted DTO. No response messages, bodies, headers or thrown causes.
export function sanitizeDataForSeoDiagnostic(value:unknown):DataForSeoDiagnostic|null {
 const d=object(value),stages=['transport','http_response','provider_response','evidence','application'],categories=['authentication','permissions','insufficient_balance','rate_limit','transport','unexpected_response'];
 if(d.version!=='dataforseo-failure/v1'||!Object.values(methods).includes(d.endpoint as DataForSeoDiagnostic['endpoint'])||!stages.includes(String(d.stage))||!categories.includes(String(d.category)))return null;
 return {version:'dataforseo-failure/v1',requestId:typeof d.requestId==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(d.requestId)?d.requestId:null,endpoint:d.endpoint as DataForSeoDiagnostic['endpoint'],httpStatus:typeof d.httpStatus==='number'&&Number.isInteger(d.httpStatus)&&d.httpStatus>=100&&d.httpStatus<=599?d.httpStatus:null,providerStatusCode:safeCode(d.providerStatusCode),category:d.category as DataForSeoFailureCategory,providerRequestId:safeId(d.providerRequestId),reportedCostUsd:safeCost(d.reportedCostUsd),stage:d.stage as DataForSeoDiagnostic['stage']};
}
export class DataForSeoError extends MarketingError {
 constructor(message:string,readonly receipt:Provenance|null=null,readonly diagnostic:DataForSeoDiagnostic|null=null){super(503,message);}
}
export function dataForSeoFailureDiagnostic(error:unknown,requestId:string,mode:keyof typeof methods,receipt:Provenance|null):DataForSeoDiagnostic {
 const existing=error instanceof DataForSeoError?sanitizeDataForSeoDiagnostic(error.diagnostic):null;
 return {...(existing??{version:'dataforseo-failure/v1',httpStatus:null,providerStatusCode:null,category:'unexpected_response',providerRequestId:receipt?.requestId??null,reportedCostUsd:receipt?.reportedCostUsd??null,stage:'application'}),requestId,endpoint:methods[mode]};
}

const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const numeric=(v:unknown,integer=false)=>{if(v===null||v===undefined)return null;if(typeof v!=='number'||!Number.isFinite(v)||v<0||integer&&!Number.isSafeInteger(v))throw new DataForSeoError('Provider numeric data did not pass validation.');return v;};
const micros=(v:unknown)=>{const n=numeric(v);if(n===null)return null;const m=Math.round(n*1000000);if(!Number.isSafeInteger(m))throw new DataForSeoError('Provider bid amount exceeded the supported range.');return m;};
const plain=(term:string)=>term.trim().length>0&&term.length<=80&&term.trim().split(/\s+/).length<=10&&!/[@\u0000-\u001f]|https?:|(?:^|\s)(?:site|inurl|intitle|intext|filetype|link|define|id|info|inanchor|allinurl|allintitle|allintext|allinanchor):/i.test(term);
export type DataForSeoOptions={timeoutMs?:number;login:string;password:string;fetcher?:typeof fetch;now?:()=>Date;target?:ReturnType<typeof dataForSeoTarget>};
export function dataForSeoClient({login,password,fetcher=fetch,now=()=>new Date(),target=dataForSeoTarget(),timeoutMs=20000}:DataForSeoOptions){
 const check=(terms:string[],market:TargetMarket)=>{if(!terms.length||terms.length>5||terms.some(t=>!plain(t))||market.country!==target.country||market.language!==target.language)throw new MarketingError(400,'Use plain seed terms and the configured research target.');};
 const request=async(mode:keyof typeof methods,data:object,signal:AbortSignal)=>{
  let receipt:Provenance|null=null,httpStatus:number|null=null,providerStatusCode:number|null=null,providerRequestId:string|null=null,reportedCostUsd:number|null=null;
  let stage:DataForSeoDiagnostic['stage']='transport';
  const secrets=[login,password,Buffer.from(login+':'+password).toString('base64')];
  const diagnostic=(category?:DataForSeoFailureCategory):DataForSeoDiagnostic=>({version:'dataforseo-failure/v1',requestId:null,endpoint:methods[mode],httpStatus,providerStatusCode,category:category??failureCategory(httpStatus,providerStatusCode),providerRequestId,reportedCostUsd,stage});
  const failure=(message:string,category?:DataForSeoFailureCategory)=>new DataForSeoError(message,receipt,diagnostic(category));
  try{
   const r=await fetcher(root+methods[mode],{method:'POST',redirect:'error',cache:'no-store',headers:{Authorization:'Basic '+Buffer.from(login+':'+password).toString('base64'),'Content-Type':'application/json'},body:JSON.stringify([{location_code:target.locationCode,language_code:target.language,...data}]),signal:AbortSignal.any([signal,AbortSignal.timeout(Math.min(120000,Math.max(1000,timeoutMs)))])});
   httpStatus=r.status;stage=r.ok?'provider_response':'http_response';
   // Read errors too, but only allow numeric codes/cost and a safe task ID to escape memory.
   let body:Record<string,unknown>={};
   try{
    const reader=r.body?.getReader();if(!reader)throw Error();const chunks:Uint8Array[]=[];let size=0;
    try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>(r.ok?32*1024*1024:64*1024))throw Error();chunks.push(part.value);}}finally{await reader.cancel();}
    body=object(JSON.parse(Buffer.concat(chunks).toString('utf8')));
   }catch{if(r.ok)throw failure('DataForSEO returned an unreadable or oversized response. No retry was started.','unexpected_response');}
   const tasks=body.tasks,task=Array.isArray(tasks)&&tasks.length===1?object(tasks[0]):{},envelopeCode=safeCode(body.status_code),taskCode=safeCode(task.status_code);
   providerStatusCode=envelopeCode!==null&&envelopeCode!==20000?envelopeCode:taskCode??envelopeCode;
   providerRequestId=safeId(task.id,secrets);reportedCostUsd=safeCost(task.cost)??safeCost(body.cost);
   if(providerRequestId!==null||reportedCostUsd!==null){const time=now();receipt={provider:mode.startsWith('ai')?'dataforseo_ai':mode==='competition'?'dataforseo':'dataforseo_keywords',apiVersion:'v3',collectedAt:time.toISOString(),expiresAt:new Date(time.getTime()+(mode==='competition'||mode.startsWith('ai')?86400000:604800000)).toISOString(),requestId:providerRequestId,reportedCostUsd,sourceUrls:['https://docs.dataforseo.com/v3/'+methods[mode]+'/']};}
   if(!r.ok)throw failure(`DataForSEO request failed (HTTP ${httpStatus}; ${failureCategory(httpStatus,providerStatusCode)}${providerStatusCode===null?'':`; provider code ${providerStatusCode}`}). No retry was started.`);
   if(envelopeCode!==20000||!Array.isArray(tasks)||tasks.length!==1||taskCode!==20000)throw failure(`DataForSEO provider response failed (${failureCategory(httpStatus,providerStatusCode)}${providerStatusCode===null?'':`; code ${providerStatusCode}`}). No retry was started.`);
   if(reportedCostUsd===null||safeCost(task.cost)===null||reportedCostUsd>dataForSeoPrices[mode]+.000000001)throw failure('DataForSEO cost receipt exceeded or did not establish the reserved request price. Further requests require review.','unexpected_response');
   if(!receipt||task.result!==null&&!Array.isArray(task.result))throw failure('DataForSEO results did not pass validation.','unexpected_response');
   return {results:(task.result??[]) as unknown[],receipt,diagnostic:diagnostic('unexpected_response')};
  }catch(error){if(error instanceof DataForSeoError&&error.diagnostic)throw error;throw failure('DataForSEO transport failed. No retry was started.','transport');}
 };
 return {check,request};
}
export function dataForSeoKeywordProvider(options:DataForSeoOptions):KeywordResearchProvider {
 const {check,request}=dataForSeoClient(options);
 return {id:'dataforseo_keywords',async research(query,signal){
  check(query.seeds,query.target);
  const {results,receipt,diagnostic}=await request(query.mode,{keywords:query.seeds,search_partners:false,...(query.mode==='ideas'?{sort_by:'relevance',include_adult_keywords:false}:{})},signal);
  try{
   const records=results.slice(0,50).map(raw=>{const r=object(raw),months=r.monthly_searches??[];
    if(r.location_code!=null&&r.location_code!==(options.target??dataForSeoTarget()).locationCode||r.language_code!=null&&r.language_code!==query.target.language||r.search_partners===true||!Array.isArray(months))throw Error();
    // If Google corrected spelling, the returned metrics describe that correction.
    const term=typeof r.spell==='string'&&r.spell?r.spell:r.keyword;
    return marketEvidenceSchema.parse({category:'market_intelligence',term,variants:typeof r.keyword==='string'&&r.keyword!==term?[r.keyword]:[],cluster:query.service,target:query.target,estimatedMonthlySearches:numeric(r.search_volume,true),monthly:months.slice(0,48).map(v=>{const m=object(v);return {year:numeric(m.year,true),month:numeric(m.month,true),estimatedSearches:numeric(m.search_volume,true)};}),advertisingCompetition:r.competition??null,advertisingCompetitionIndex:numeric(r.competition_index,true),lowTopOfPageBidMicros:micros(r.low_top_of_page_bid),highTopOfPageBidMicros:micros(r.high_top_of_page_bid),averageCpcMicros:micros(r.cpc),currency:'USD',provenance:receipt});
   });return {records,provenance:receipt};
  }catch{throw new DataForSeoError('DataForSEO keyword metrics did not pass evidence validation.',receipt,{...diagnostic,stage:'evidence',category:'unexpected_response'});}
 }};
}
export function dataForSeoProvider(options:DataForSeoOptions):CompetitiveResearchProvider {
 const {check,request}=dataForSeoClient(options);
 return {id:'dataforseo',async research(term,target,signal){
  check([term],target);const {results,receipt,diagnostic}=await request('competition',{keyword:term,device:'desktop',depth:10,max_crawl_pages:1},signal);
  try{
   const result=object(results[0]);if(results.length!==1||result.location_code!=null&&result.location_code!==(options.target??dataForSeoTarget()).locationCode||result.language_code!=null&&result.language_code!==target.language)throw Error();
   const items=result.items??[];if(!Array.isArray(items))throw Error();
   const pages=items.map(object).filter(i=>i.type==='organic').slice(0,10).map(i=>{if(typeof i.url!=='string'||!safeSource(i.url))throw Error();return {url:i.url,domain:new URL(i.url).hostname,title:String(i.title??'').slice(0,300),snippet:String(i.description??'').slice(0,1000),observedOrganicPosition:numeric(i.rank_group,true),contentType:null};});
   const observed=typeof result.datetime==='string'?Date.parse(result.datetime):NaN;
   return competitiveEvidenceSchema.parse({category:'competitive_intelligence',term,target,searchEngine:'google',device:'desktop',observedAt:Number.isFinite(observed)?new Date(observed).toISOString():null,results:pages,findings:[],provenance:receipt});
  }catch{throw new DataForSeoError('DataForSEO search results did not pass evidence validation.',receipt,{...diagnostic,stage:'evidence',category:'unexpected_response'});}
 }};
}
