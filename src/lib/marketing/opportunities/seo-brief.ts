import 'server-only';
import {intelligenceSchema,type Evidence} from '@augmented-architect/seo-analyst';
import {seoBriefSchema,type SeoBrief} from '@augmented-architect/content-strategist';
import type {Finding,Artifact} from './contracts';
import {savedResearch} from '../intelligence/service';

/** Historical recommendations never acquire new observations retroactively. */
export function searchBrief(finding:Finding,findingId:string,documents:Evidence[],rows:Artifact[]=[]):SeoBrief{
 const assessment=finding.searchAssessment,doc=documents.find(d=>d.id==='saved-intelligence'&&finding.evidenceIds.includes(d.id));
 const parsed=doc?intelligenceSchema.safeParse(JSON.parse(doc.content)):null,intel=parsed?.success?parsed.data:null;
 const refs=assessment?[...(assessment.primaryKeyword?[assessment.primaryKeyword]:[]),...assessment.supportingKeywords].filter((k,i,all)=>all.findIndex(v=>v.term===k.term&&v.providerRequestId===k.providerRequestId)===i):[];
 const saved=savedResearch(rows);
 const demand=refs.flatMap(ref=>{
  const m=intel?.market.find(m=>m.term===ref.term&&m.provenance.requestId===ref.providerRequestId);
  const c=intel?.competition.find(c=>c.term===ref.term&&c.provenance.requestId===ref.providerRequestId);
  const r=m?saved.find(r=>r.bundle.market.some(v=>v.term===m.term&&JSON.stringify(v)===JSON.stringify(m))):c?saved.find(r=>r.bundle.competition.some(v=>JSON.stringify(v)===JSON.stringify(c))):null;
  const observation=m??c;
  // A SERP observation supports the query and competitors, never an invented monthly volume.
  return observation&&r?[{term:observation.term,estimatedMonthlySearches:m?.estimatedMonthlySearches??null,researchId:r.id,sourceId:doc!.id,providerRequestId:observation.provenance.requestId,collectedAt:observation.provenance.collectedAt,expiresAt:observation.provenance.expiresAt}]:[];
 });
 const terms=new Set(demand.map(m=>m.term));
 const competition=(intel?.competition??[]).filter(c=>terms.has(c.term)).flatMap(c=>{
  const r=saved.find(r=>r.bundle.competition.some(v=>JSON.stringify(v)===JSON.stringify(c)));
  return r?[{term:c.term,sourceId:doc!.id,researchId:r.id,observedAt:c.observedAt,urls:c.results.map(r=>r.url)}]:[];
 });
 const primary=assessment?.primaryKeyword&&terms.has(assessment.primaryKeyword.term)?assessment.primaryKeyword.term:null;
 const missing=[...(assessment?.missingObservations??['This historical finding has no structured keyword assessment.']),...(!demand.length?['No provider keyword observations are proven to support this finding.']:[]),...(!competition.length?['Organic SERP competition and ranking feasibility are unknown.']:[]),...(refs.length>demand.length?['Some keyword references could not be matched to the exact saved provider observation.']:[])];
 return seoBriefSchema.parse({version:'seo-brief/v1',findingId,audience:finding.targetCustomer,customerProblem:assessment?.customerProblem??finding.title,whyWorthPursuing:assessment?.whyWorthPursuing??finding.businessRelevance,primaryKeyword:primary,supportingKeywords:demand.map(m=>m.term).filter(t=>t!==primary).slice(0,5),searchIntent:finding.searchIntent,demand,organicCompetition:competition,evidenceIds:[...new Set([...finding.evidenceIds,...demand.map(d=>d.researchId),...competition.map(c=>c.researchId)])],existingContentConsiderations:assessment?.existingContentConsiderations??'Existing coverage requires editorial review; no duplication assessment was recorded.',recommendedContentType:assessment?.contentAction??'investigate',internalLinkUrls:assessment?.internalLinkUrls??[],conversionAction:'Qualified consultation inquiry through the existing consultation flow.',confidence:finding.confidence,limitations:[...finding.limitations,...missing,'Search-volume estimates are not traffic or lead forecasts. Advertising competition is not organic difficulty.'].slice(0,20),nextAction:missing.length?'Review the evidence gaps and approve only a draft supported by the available sources.':finding.recommendedAction,expectedAdditionalResearchCostUsd:null});
}
