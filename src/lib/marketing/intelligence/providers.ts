import 'server-only';
import {ExternalAccountClient} from 'google-auth-library';
import {getVercelOidcToken} from '@vercel/oidc';
import {marketEvidenceSchema,competitiveEvidenceSchema,safeSource,type KeywordResearchProvider,type CompetitiveResearchProvider,type ResearchQuery,type TargetMarket} from '@augmented-architect/seo-analyst';
import {federationConfig} from '../federation';
import {MarketingError} from '../config';

export const initialMarket={country:'US',language:'en'} as const;
export const researchPolicy={minimumIntervalMs:60000,maximumDailyRequests:10,maxResults:50,serpDepth:10,maxSerpCostUsd:.002,apiVersion:'v26'} as const;
const adsDoc='https://developers.google.com/google-ads/api/docs/keyword-planning/overview';
const serpDoc='https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/';
export type ProviderConnection={id:'google_ads'|'dataforseo';state:'not_connected'|'awaiting_approval'|'ready_for_verification'|'connected';ready:boolean;message:string;lastRetrievedAt?:string|null};
export function researchConnections(env=process.env):ProviderConnection[]{
  let federation=false;try{federationConfig(env);federation=true;}catch{}
  const ads=federation&&/^\d{10}$/.test((env.GOOGLE_ADS_CUSTOMER_ID??'').replaceAll('-',''))&&['BASIC','STANDARD'].includes(env.GOOGLE_ADS_ACCESS_LEVEL??'');
  const serp=Boolean(env.DATAFORSEO_LOGIN&&env.DATAFORSEO_PASSWORD);
  return [{id:'google_ads',state:!ads?'not_connected':env.GOOGLE_ADS_RESEARCH_ENABLED!=='true'?'awaiting_approval':'ready_for_verification',ready:ads&&env.GOOGLE_ADS_RESEARCH_ENABLED==='true',message:!ads?'Google Ads customer access and Basic/Standard API approval are not configured. Existing GA4/Search Console access does not authorize keyword planning.':env.GOOGLE_ADS_RESEARCH_ENABLED!=='true'?'Configured; a bounded first research request still requires explicit approval.':'Enabled for manually authorized research. A successful provider response is still required to verify the connection.'},
  {id:'dataforseo',state:!serp?'not_connected':env.DATAFORSEO_RESEARCH_ENABLED!=='true'?'awaiting_approval':'ready_for_verification',ready:serp&&env.DATAFORSEO_RESEARCH_ENABLED==='true',message:!serp?'No approved SERP-provider credentials are configured. No competing rankings or difficulty metrics are inferred.':env.DATAFORSEO_RESEARCH_ENABLED!=='true'?'Credentials present; paid requests remain disabled pending approval.':'One desktop SERP, ten results per manual request. No scraping, automatic pagination or paid retries.'}];
}
export type AdsTransport=(url:string,body:object,signal:AbortSignal)=>Promise<{data:unknown;requestId:string|null}>;
let adsAuth:ReturnType<typeof ExternalAccountClient.fromJSON>;
export const keylessAdsRequest:AdsTransport=async(url,body,signal)=>{
  if(!/^https:\/\/googleads\.googleapis\.com\/v26\/customers\/\d{10}:generateKeyword(Ideas|HistoricalMetrics)$/.test(url))throw new MarketingError(500,'Unsupported keyword endpoint.');
  const c=federationConfig();
  try{
    // A separate token client: existing reporting scopes/client remain unchanged.
    adsAuth??=ExternalAccountClient.fromJSON({type:'external_account',audience:c.audience,subject_token_type:'urn:ietf:params:oauth:token-type:jwt',token_url:'https://sts.googleapis.com/v1/token',service_account_impersonation_url:c.impersonationUrl,service_account_impersonation:{token_lifetime_seconds:900},scopes:['https://www.googleapis.com/auth/adwords'],subject_token_supplier:{getSubjectToken:()=>getVercelOidcToken()}});
    if(!adsAuth)throw Error();
    const manager=(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID??'').replaceAll('-','');if(manager&&!/^\d{10}$/.test(manager))throw Error();
    const r=await adsAuth.request({url,method:'POST',data:body,signal,timeout:20000,retry:false,headers:manager?{'login-customer-id':manager}:{}});
    const h=r.headers as unknown as {get?:(key:string)=>string|null;[key:string]:unknown};
    return {data:r.data,requestId:typeof h.get==='function'?h.get('request-id'):typeof h['request-id']==='string'?h['request-id']:null};
  }catch{throw new MarketingError(503,'Google Ads keyword access failed. Check API access level, authorized customer and read-only account permissions. No automatic retry was started.');}
};
const integer=(value:unknown)=>{if(value===null||value===undefined)return null;const n=typeof value==='number'?value:typeof value==='string'&&/^\d+$/.test(value)?Number(value):NaN;if(!Number.isSafeInteger(n)||n<0)throw new MarketingError(503,'Provider returned invalid numeric data.');return n;};
const months=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export function googleAdsProvider({customerId,transport=keylessAdsRequest,currency=null,now=()=>new Date()}:{customerId:string;transport?:AdsTransport;currency?:string|null;now?:()=>Date}):KeywordResearchProvider {
  if(!/^\d{10}$/.test(customerId))throw new MarketingError(503,'An authorized Ads customer ID is required.');
  return {id:'google_ads',async research(query:ResearchQuery,signal){
    if(query.target.country!=='US'||query.target.language!=='en'||!query.seeds.length||query.seeds.length>5)throw new MarketingError(400,'Use the approved US/English target and up to five seed terms.');
    const method=query.mode==='ideas'?'generateKeywordIdeas':'generateKeywordHistoricalMetrics';
    const body={language:'languageConstants/1000',geoTargetConstants:['geoTargetConstants/2840'],keywordPlanNetwork:'GOOGLE_SEARCH',historicalMetricsOptions:{includeAverageCpc:true},...(query.mode==='ideas'?{keywordSeed:{keywords:query.seeds},pageSize:50,includeAdultKeywords:false}:{keywords:query.seeds})};
    const response=await transport(`https://googleads.googleapis.com/v26/customers/${customerId}:${method}`,body,signal),data=record(response.data),results=data.results??[];
    if(!Array.isArray(results))throw new MarketingError(503,'Keyword response was not a valid results array.');
    const time=now(),provenance={provider:'google_ads',apiVersion:'v26',collectedAt:time.toISOString(),expiresAt:new Date(time.getTime()+604800000).toISOString(),requestId:response.requestId,reportedCostUsd:null,sourceUrls:[adsDoc]};
    const records=results.slice(0,50).map(raw=>{
      const r=record(raw),m=record(r.keywordIdeaMetrics??r.keywordMetrics),monthly=m.monthlySearchVolumes??[];if(!Array.isArray(monthly))throw new MarketingError(503,'Invalid monthly keyword metrics.');
      return marketEvidenceSchema.parse({category:'market_intelligence',averageCpcMicros:integer(m.averageCpcMicros),term:r.text,variants:Array.isArray(r.closeVariants)?r.closeVariants.slice(0,20):[],cluster:query.service,target:query.target,estimatedMonthlySearches:integer(m.avgMonthlySearches),monthly:monthly.slice(0,48).map(v=>{const n=record(v);return {year:integer(n.year),month:typeof n.month==='string'?months.indexOf(n.month)+1:integer(n.month),estimatedSearches:integer(n.monthlySearches)};}),advertisingCompetition:['LOW','MEDIUM','HIGH','UNKNOWN'].includes(String(m.competition))?m.competition:null,advertisingCompetitionIndex:integer(m.competitionIndex),lowTopOfPageBidMicros:integer(m.lowTopOfPageBidMicros),highTopOfPageBidMicros:integer(m.highTopOfPageBidMicros),currency,provenance});
    });return {records,provenance};
  }};
}
export function dataForSeoProvider({login,password,fetcher=fetch,now=()=>new Date()}:{login:string;password:string;fetcher?:typeof fetch;now?:()=>Date}):CompetitiveResearchProvider {
  return {id:'dataforseo',async research(term:string,target:TargetMarket,signal){
    if(target.country!=='US'||target.language!=='en'||/(?:^|\s)(?:site|inurl|intitle|intext|filetype|link|define|id|info|inanchor|allinurl|allintitle|allintext|allinanchor):/i.test(term))throw new MarketingError(400,'Use plain terms and the approved US/English target. Search operators and cost multipliers are disabled.');
    const response=await fetcher('https://api.dataforseo.com/v3/serp/google/organic/live/advanced',{method:'POST',redirect:'error',headers:{Authorization:'Basic '+Buffer.from(login+':'+password).toString('base64'),'Content-Type':'application/json'},body:JSON.stringify([{keyword:term,location_code:2840,language_code:'en',device:'desktop',depth:10,max_crawl_pages:1}]),signal:AbortSignal.any([signal,AbortSignal.timeout(20000)])});
    if(!response.ok)throw new MarketingError(503,'SERP provider denied or could not complete the request. No retry was started.');
    const body=record(await response.json()),tasks=body.tasks;if(body.status_code!==20000||!Array.isArray(tasks)||tasks.length!==1)throw new MarketingError(503,'SERP provider did not return one successful task.');
    const task=record(tasks[0]);if(task.status_code!==20000)throw new MarketingError(503,'SERP research failed; no rankings were inferred.');
    if(typeof task.cost!=='number'||task.cost>researchPolicy.maxSerpCostUsd||task.cost<0)throw new MarketingError(503,'Provider cost receipt did not match the approved single-SERP budget.');
    const result=Array.isArray(task.result)?record(task.result[0]):{},items=result.items??[];if(!Array.isArray(items))throw new MarketingError(503,'SERP results were invalid.');
    const results=items.map(record).filter(i=>i.type==='organic').slice(0,10).map(i=>{if(typeof i.url!=='string'||!safeSource(i.url))throw new MarketingError(503,'SERP provider returned an unsafe result reference.');return {url:i.url,domain:new URL(i.url).hostname,title:String(i.title??'').slice(0,300),snippet:String(i.description??'').slice(0,1000),observedOrganicPosition:integer(i.rank_group),contentType:null};});
    const time=now(),observed=typeof result.datetime==='string'?Date.parse(result.datetime):NaN;return competitiveEvidenceSchema.parse({category:'competitive_intelligence',term,target,searchEngine:'google',device:'desktop',observedAt:Number.isFinite(observed)?new Date(observed).toISOString():null,results,findings:[],provenance:{provider:'dataforseo',apiVersion:'v3',collectedAt:time.toISOString(),expiresAt:new Date(time.getTime()+86400000).toISOString(),requestId:typeof task.id==='string'?task.id:null,reportedCostUsd:task.cost,sourceUrls:[serpDoc]}});
  }};
}
