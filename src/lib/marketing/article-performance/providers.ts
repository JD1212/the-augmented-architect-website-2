import 'server-only';
import {z} from 'zod';
import {reportingRequest} from '../google';
import {searchProperty} from '../config';
import type {DateRange} from '../types';
import type {ProviderState} from './types';
import {searchPagePattern} from './identity';
export type Observation={date:string;key:string;event?:string;values:number[]};
export type Dataset={state:ProviderState;rows:Observation[]};
const metric=z.union([z.number(),z.string().min(1)]).transform(Number).pipe(z.number().finite().nonnegative());
const gaSchema=z.object({error:z.never().optional(),rows:z.array(z.object({dimensionValues:z.array(z.object({value:z.string()})),metricValues:z.array(z.object({value:metric}))})).optional(),rowCount:z.number().nonnegative().optional(),metadata:z.object({timeZone:z.string().optional(),subjectToThresholding:z.boolean().optional(),dataLossFromOtherRow:z.boolean().optional()}).optional()});
const searchSchema=z.object({error:z.never().optional(),rows:z.array(z.object({keys:z.array(z.string()),clicks:metric,impressions:metric,ctr:metric,position:metric})).optional()});
export const unavailable=(message:string,status:ProviderState['status']='unavailable'):Dataset=>({rows:[],state:{status,message,updatedAt:null}});
const state=(rows:Observation[],limited:boolean,timeZone?:string):ProviderState=>({status:limited?'partial':rows.some(r=>r.values.some(v=>v>0))?'connected':'empty',updatedAt:new Date().toISOString(),message:limited?'Google may omit rows.':'Reported observations; recent data can be delayed.',...(timeZone?{timeZone}:{})});
const date=(value:string)=>{const d=/^\d{8}$/.test(value)?value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6):value;if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||new Date(d+'T00:00:00Z').toISOString().slice(0,10)!==d)throw Error('Invalid report date');return d;};
export async function articleGa4(range:DateRange,paths:string[],kind:'traffic'|'events'|'bookings',ids:string[],request=reportingRequest):Promise<Dataset>{
 if(process.env.GA4_PROPERTY_ID!=='564904776')return unavailable('The authorized GA4 property is not configured.','not_configured');
 const property='564904776',origin='https://analyticsdata.googleapis.com/v1beta/properties/'+property;
 try{
  if(kind==='bookings'){
   const metadata=z.object({error:z.never().optional(),dimensions:z.array(z.object({apiName:z.string()})).optional()}).parse(await request(origin+'/metadata',{},'GET'));
   if(!metadata.dimensions?.some(d=>d.apiName==='customEvent:origin_publication_id'))return unavailable('Register the event-scoped origin_publication_id dimension in GA4.','not_configured');
  }
  const filters:unknown[]=[{filter:{fieldName:'hostName',inListFilter:{values:['theaugmentedarchitect.com','www.theaugmentedarchitect.com']}}}];
  if(kind==='bookings')filters.push({filter:{fieldName:'customEvent:origin_publication_id',inListFilter:{values:ids}}},{filter:{fieldName:'eventName',stringFilter:{matchType:'EXACT',value:'consultation_booked'}}});
  else filters.push({filter:{fieldName:'pagePath',inListFilter:{values:paths.flatMap(p=>[p,p+'/'])}}});
  if(kind==='events')filters.push({filter:{fieldName:'eventName',inListFilter:{values:['article_engagement','article_consultation_start']}}});
  const dimensions=['date',kind==='bookings'?'customEvent:origin_publication_id':'pagePath',...(kind==='events'?['eventName']:[])],metrics=kind==='traffic'?['screenPageViews','userEngagementDuration']:['eventCount'];
  const raw=gaSchema.parse(await request(origin+':runReport',{dateRanges:[{startDate:range.start,endDate:range.end}],dimensions:dimensions.map(name=>({name})),metrics:metrics.map(name=>({name})),dimensionFilter:{andGroup:{expressions:filters}},limit:'10000',orderBys:[{dimension:{dimensionName:'date'}}]}));
  const rows=(raw.rows??[]).map(r=>{if(r.dimensionValues.length!==dimensions.length||r.metricValues.length!==metrics.length)throw Error('Incomplete article reporting');return {date:date(r.dimensionValues[0].value),key:r.dimensionValues[1].value,...(kind==='events'?{event:r.dimensionValues[2].value}:{}),values:r.metricValues.map(v=>v.value)};});
  return {rows,state:state(rows,Boolean(raw.metadata?.subjectToThresholding||raw.metadata?.dataLossFromOtherRow||(raw.rowCount??rows.length)>=10000),raw.metadata?.timeZone)};
 }catch{return unavailable(kind==='bookings'?'Booking attribution could not be retrieved.':'GA4 reporting could not be retrieved.');}
}
export async function articleSearch(range:DateRange,paths:string[],queries=false,request=reportingRequest):Promise<Dataset>{
 try{
  const dimensions=queries?['query']:['date','page'];
  const raw=searchSchema.parse(await request('https://searchconsole.googleapis.com/webmasters/v3/sites/'+encodeURIComponent(searchProperty)+'/searchAnalytics/query',{startDate:range.start,endDate:range.end,type:'web',dataState:'final',dimensions,dimensionFilterGroups:[{groupType:'and',filters:[{dimension:'page',operator:'includingRegex',expression:searchPagePattern(paths)}]}],rowLimit:10000}));
  const rows=(raw.rows??[]).map(r=>{if(r.keys.length!==dimensions.length)throw Error('Incomplete search report');return {date:queries?'':date(r.keys[0]),key:queries?r.keys[0]:r.keys[1],values:[r.clicks,r.impressions,r.ctr,r.position]};});
  return {rows,state:state(rows,rows.length>=10000,'America/Los_Angeles')};
 }catch{return unavailable('Search Console reporting could not be retrieved.');}
}
