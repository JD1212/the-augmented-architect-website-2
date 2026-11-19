import 'server-only';
import {summarizeIntelligence,normalizedTerm,type Evidence,type Intelligence} from '@augmented-architect/seo-analyst';
import {MarketingError,marketingTenant} from '../config';
import type {Artifact} from '../opportunities/contracts';
import {providerScope,savedResearch} from './service';

export function evidenceFreshness(asOf:Date,collections:Intelligence['collections']):NonNullable<Evidence['freshness']>{
 const observed=collections.map(p=>Date.parse(p.collectedAt)),expires=collections.map(p=>Date.parse(p.expiresAt));
 const valid=collections.length>0&&[...observed,...expires].every(Number.isFinite)&&observed.every((t,i)=>t<=asOf.getTime()&&expires[i]>=t);
 return {asOf:asOf.toISOString(),status:!valid?'unknown':expires.some(t=>t<=asOf.getTime())?'expired':'fresh',observedAt:valid?new Date(Math.max(...observed)).toISOString():null,expiresAt:valid?new Date(Math.min(...expires)).toISOString():null};
}
function boundedSummary(bundle:Intelligence){
 const summary=summarizeIntelligence(bundle);
 // Remove complete observations rather than cutting serialized JSON. Detail remains in saved records.
 while(Buffer.byteLength(JSON.stringify(summary))>5500){
  if(summary.competitors.some(c=>c.results.length)){summary.competitors.find(c=>c.results.length)!.results.pop();continue;}
  if(summary.keywords.length){summary.keywords.pop();summary.omittedGroups++;continue;}
  throw new MarketingError(503,'Saved evidence provenance exceeds the planning summary budget.');
 }
 return summary;
}
export function intelligencePlanningEvidence(bundle:Intelligence,asOf:Date):Evidence{
 const freshness=evidenceFreshness(asOf,bundle.collections);
 return {id:bundle.id,kind:'external_research',title:'Saved provider observations (estimates, not site conversions)',content:JSON.stringify({...boundedSummary(bundle),freshness,detailsAvailable:['keywords','history','competitors']}),freshness,sources:[...new Set(bundle.collections.flatMap(p=>p.sourceUrls))].slice(0,15).map(url=>({url,title:'Saved provider source'})),retrievedAt:freshness.observedAt??asOf.toISOString(),status:'connected',hasActualSearchData:false};
}
export function savedEvidenceDetails(rows:Artifact[],tenant:string,aggregate:Intelligence|undefined,query:{evidenceId:string;section:'keywords'|'history'|'competitors';term:string;limit:number}){
 if(tenant!==marketingTenant)throw new MarketingError(403,'Unauthorized research workspace.');
 if(!Number.isInteger(query.limit)||query.limit<1||query.limit>10||query.term.length>200)throw new MarketingError(400,'Invalid saved evidence detail request.');
 const records=savedResearch(rows).filter(r=>r.scope===providerScope(tenant,r.query));
 const bundle=aggregate?.id===query.evidenceId?aggregate:records.find(r=>r.id===query.evidenceId)?.bundle;
 if(!bundle)throw new MarketingError(404,'Saved evidence not found in this workspace.');
 const term=normalizedTerm(query.term),matching=bundle.market.filter(m=>!term||normalizedTerm(m.term)===term);
 const data=query.section==='competitors'?bundle.competition.filter(c=>!term||normalizedTerm(c.term)===term).slice(0,query.limit).map(c=>({...c,results:c.results.slice(0,5)})):matching.slice(0,query.limit).map(m=>({...m,monthly:query.section==='history'?m.monthly.slice(-12):[]}));
 const result={evidenceId:query.evidenceId,section:query.section,observations:data,omittedObservations:(query.section==='competitors'?bundle.competition.length:matching.length)-data.length};
 while(Buffer.byteLength(JSON.stringify(result))>6000&&result.observations.length){result.observations.pop();result.omittedObservations++;}
 return JSON.stringify(result);
}
