import type {ArticleIdentity,ArticleMetric} from './types';
import {reportingRange} from '../ranges';
/** Common completed-day window for this NY GA4 / Pacific Search Console property. */
export function articleReportingRange(value:string|null,now=new Date()){
 const day=liveDay(now.toISOString(),'America/Los_Angeles')!;
 return reportingRange(value,new Date(day+'T12:00:00Z'));
}
/** Only canonical business hosts; never match Preview, private routes, ports or lookalikes. */
export function articlePath(value:string){
 try{const u=new URL(value,'https://theaugmentedarchitect.com');if(!['https:','http:'].includes(u.protocol)||!['theaugmentedarchitect.com','www.theaugmentedarchitect.com'].includes(u.hostname)||u.port||u.username||u.password)return null;
 const path=u.pathname.replace(/\/$/,'');return /^\/insights\/articles\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)?path:null;}catch{return null;}
}
export function liveDay(timestamp:string,zone:string){try{return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(timestamp));}catch{return null;}}
export function measured(value:number|undefined,source:{status:string},article:ArticleIdentity,end:string,zone?:string):ArticleMetric{
 const day=zone?liveDay(article.firstLiveAt,zone):null;
 if(day&&day>end)return {value:null,state:'outside_period'};
 if(source.status==='unavailable'||source.status==='not_configured')return {value:null,state:'unavailable'};
 if(!zone||!day)return {value:value??null,state:value===undefined?'unavailable':'partial'};
 if(source.status==='partial')return {value:value??null,state:'partial'};
 return {value:value??0,state:value?'observed':'zero'};
}
export const escapeRegex=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function searchPagePattern(paths:string[]){return '^https?://(www\\.)?theaugmentedarchitect\\.com('+paths.map(escapeRegex).join('|')+')/?(\\?.*)?$';}
