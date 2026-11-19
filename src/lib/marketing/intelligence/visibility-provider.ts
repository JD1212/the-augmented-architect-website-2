import 'server-only';
import {validateVisibilityObservation,safeSource,type VisibilityObservation} from '@augmented-architect/seo-analyst';
import {MarketingError} from '../config';
import {stableId} from '../opportunities/identity';
import {dataForSeoClient,dataForSeoTarget,DataForSeoError,type DataForSeoOptions} from './dataforseo';

export type VisibilityRequest={questionId:string;question:string;offeringId:string;platform:VisibilityObservation['platform'];observationType:VisibilityObservation['observationType'];reason:string};
export const visibilityMode=(r:VisibilityRequest)=>r.observationType==='historical_mention'?'aiMentions':r.platform==='chatgpt'?'aiChatgpt':'aiGemini';
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const array=(v:unknown)=>Array.isArray(v)?v:[];
const time=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
export function visibilityProvider(options:DataForSeoOptions){
 const transport=dataForSeoClient({...options,timeoutMs:120000});
 return {async collect(r:VisibilityRequest,signal:AbortSignal){
  if(!['chatgpt','gemini','google_ai_overview'].includes(r.platform)||!['prompt_test','historical_mention'].includes(r.observationType)||r.platform==='google_ai_overview'&&r.observationType!=='historical_mention'||r.platform==='gemini'&&r.observationType!=='prompt_test'||r.question.length<10||r.question.length>500||r.observationType==='historical_mention'&&r.question.length>250||/[\u0000-\u001f@]/.test(r.question))throw new MarketingError(400,'Unsupported or private AI visibility query.');
  const mode=visibilityMode(r),target=options.target??dataForSeoTarget(),data=mode==='aiMentions'?{platform:r.platform==='chatgpt'?'chat_gpt':'google',target:[{keyword:r.question,search_scope:['question'],match_type:'word_match',search_filter:'include'}],limit:10}:{keyword:encodeURIComponent(r.question),...(r.platform==='chatgpt'?{force_web_search:true}:{}),device:'desktop',os:'windows'};
  const response=await transport.request(mode,data,signal);
  try{
   if(response.results.length!==1||!response.receipt.requestId)throw Error();const root=object(response.results[0]);
   const items=mode==='aiMentions'?array(root.items):[root];if(items.length>10)throw Error();
   const observations=items.map((item,index)=>{
    const raw=object(item);if(raw.location_code!==undefined&&raw.location_code!==target.locationCode||raw.language_code!==undefined&&raw.language_code!==target.language)throw Error();
    if(mode==='aiMentions'&&raw.platform!==(r.platform==='chatgpt'?'chat_gpt':'google'))throw Error();
    if(mode!=='aiMentions'&&raw.keyword!==r.question)throw Error();
    const text=typeof raw.answer==='string'?raw.answer:typeof raw.markdown==='string'?raw.markdown:array(raw.items).map(x=>object(x).markdown).filter(x=>typeof x==='string').join('\n');
    const sources=[...array(raw.sources),...array(raw.items).flatMap(x=>array(object(x).sources))];
    const citations=[...new Map(sources.map(s=>{const c=object(s);if(typeof c.url!=='string'||!safeSource(c.url))throw Error();return [c.url,{url:c.url,title:String(c.title??c.domain??'Observed source').slice(0,250)}] as const;})).values()];
    const brands=[...array(raw.brand_entities),...array(raw.items).flatMap(x=>array(object(x).brand_entities))].map(x=>object(x).title).filter((x):x is string=>typeof x==='string'&&Boolean(x));
    return validateVisibilityObservation({id:stableId(response.receipt.requestId+':'+index),platform:r.platform,observationType:r.observationType,model:typeof raw.model==='string'?raw.model:typeof raw.model_name==='string'?raw.model_name:null,query:r.question,returnedQuestion:mode==='aiMentions'&&typeof raw.question==='string'?raw.question:null,target:{...target},observedAt:time(raw.datetime??raw.last_response_at),retrievedAt:response.receipt.collectedAt,responseText:text.slice(0,12000),responseTruncated:text.length>12000||citations.length>30||new Set(brands).size>20,citations:citations.slice(0,30),reportedBrands:[...new Set(brands)].slice(0,20),provenance:response.receipt,limitations:[...(citations.length>30?['Only the first 30 cited sources are retained.']:[]),...(!citations.length?['No citations were returned; source attribution is unavailable.']:[]),...(raw.model===undefined&&raw.model_name===undefined?['The provider did not identify the model.']:[]),'Business matching uses the approved full name and owned domains; unconfigured name variants may need owner review.','Cited pages have not been independently fetched or verified.','Other cited organizations are not automatically verified competitors.']});
   });return {observations,receipt:response.receipt};
  }catch{throw new DataForSeoError('AI visibility response did not pass provenance validation. No retry was started.',response.receipt,{...response.diagnostic,stage:'evidence'});}
 }};
}
