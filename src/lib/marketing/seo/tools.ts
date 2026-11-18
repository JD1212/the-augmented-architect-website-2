import 'server-only';
import OpenAI from 'openai';
import {safeSource,limits,externalResearchInstructions,type Evidence,type SeoTools,type UsageReceipt} from '@augmented-architect/seo-analyst';
import {ga4Report,searchConsoleReport} from '../providers';
import type {DateRange,ReportingData,ReportTable} from '../types';
import {approvedWebsiteEvidence} from './context';
import {seoConfiguration} from './config';

export type ReportSnapshot={source:'ga4'|'search_console';propertyId:string;range:DateRange;data:ReportingData;retrievedAt:string;evidenceId:string};
export function completeAgentRange(days:7|28|90,now=new Date()):DateRange {
  const day=(zone:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const earliest=[day('America/New_York'),day('America/Los_Angeles')].sort()[0];
  const end=new Date(earliest+'T00:00:00Z');end.setUTCDate(end.getUTCDate()-1);const start=new Date(end);start.setUTCDate(start.getUTCDate()-days+1);
  return {days,start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
}
export function createSeoTools({tenantId,days,client,authorize,onResearchUsage,reporters={ga4Report,searchConsoleReport}}:{tenantId:string;days:7|28|90;client:OpenAI;authorize:()=>Promise<void>;onResearchUsage:(usage:UsageReceipt)=>Promise<void>;reporters?:{ga4Report:typeof ga4Report;searchConsoleReport:typeof searchConsoleReport}}):{ports:SeoTools;snapshots:ReportSnapshot[]} {
  const config=seoConfiguration();if(tenantId!==config.tenantId)throw Error('Unauthorized reporting tenant');
  const range=completeAgentRange(days),snapshots:ReportSnapshot[]=[];
  const compact=(table:ReportTable|undefined)=>table?{...table,rows:table.rows.slice(0,15)}:undefined;
  async function report(source:'ga4'|'search_console',requested:number,signal:AbortSignal):Promise<Evidence>{
    if(requested!==days)throw Error('Unauthorized reporting window');await authorize();signal.throwIfAborted();
    const id=source+'-report',retrievedAt=new Date().toISOString();
    try{
      const data=source==='ga4'?await reporters.ga4Report(config.ga4Property,range):await reporters.searchConsoleReport(range);signal.throwIfAborted();
      const hasData=data.overview.rows.some(r=>r.values.some(n=>n>0));
      snapshots.push({source,propertyId:source==='ga4'?config.ga4Property:config.searchProperty,range,data,retrievedAt,evidenceId:id});
      return {id,kind:source,title:source==='ga4'?'Authorized GA4 report':'Authorized Search Console report',retrievedAt,status:hasData?'connected':'empty',hasActualSearchData:source==='search_console'&&hasData,sources:[{url:source==='ga4'?'https://analytics.google.com/analytics/web/':'https://search.google.com/search-console/',title:source==='ga4'?'Google Analytics reporting':'Google Search Console reporting'}],content:JSON.stringify({range,overview:data.overview,daily:compact(data.daily),pages:compact(data.pages),queries:compact(data.queries),acquisition:compact(data.acquisition),services:compact(data.services),conversions:compact(data.conversions),limitations:data.notes}).slice(0,15500)};
    }catch(error){if(signal.aborted)throw error;return {id,kind:source,title:'Reporting source unavailable',retrievedAt,status:'error',hasActualSearchData:false,sources:[],content:'This reporting source could not be retrieved. No metrics can be inferred. Use external research only as hypotheses and disclose this limitation.'};}
  }
  return {snapshots,ports:{googleAnalytics:(requested,signal)=>report('ga4',requested,signal),searchConsole:(requested,signal)=>report('search_console',requested,signal),websiteResearch:async signal=>{await authorize();signal.throwIfAborted();return approvedWebsiteEvidence();},externalResearch:async(query,signal)=>{
    await authorize();signal.throwIfAborted();
    if(query.length<10||query.length>300)throw Error('Invalid research query');
    const response=await client.responses.create({model:config.model,store:false,max_output_tokens:limits.maxResearchOutputTokens,max_tool_calls:1,reasoning:{effort:'low'},tools:[{type:'web_search',search_context_size:'low'}],tool_choice:'required',include:['web_search_call.action.sources'],instructions:externalResearchInstructions,input:query},{signal,timeout:60000,maxRetries:0});
    const number=(n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>=0?n:null;
    const usage:UsageReceipt={purpose:'research',model:response.model,responseId:response.id,inputTokens:number(response.usage?.input_tokens),outputTokens:number(response.usage?.output_tokens),totalTokens:number(response.usage?.total_tokens),webSearchCalls:response.output.filter(i=>i.type==='web_search_call').length,measuredCost:null};
    await onResearchUsage(usage);
    if(response.status!=='completed')throw Error('External research did not complete within budget');
    const sources=new Map<string,{url:string;title:string}>();let calls=0;
    for(const item of response.output){
      if(item.type==='web_search_call'){calls++;const action=item.action;if('sources' in action&&Array.isArray(action.sources))for(const source of action.sources){if('url' in source&&typeof source.url==='string'&&safeSource(source.url))sources.set(source.url,{url:source.url,title:'Web research source'});}}
      if(item.type==='message')for(const content of item.content)if(content.type==='output_text')for(const a of content.annotations)if(a.type==='url_citation'&&safeSource(a.url))sources.set(a.url,{url:a.url,title:a.title||'Cited research source'});
    }
    if(calls<1||calls>1||!sources.size)throw Error('Research requires one traceable hosted search call');
    return {evidence:{id:'external-research',kind:'external_research',title:'Public external research',retrievedAt:new Date().toISOString(),status:'connected',hasActualSearchData:false,content:response.output_text.slice(0,15000),sources:[...sources.values()].slice(0,15)},usage};
  }}};
}
