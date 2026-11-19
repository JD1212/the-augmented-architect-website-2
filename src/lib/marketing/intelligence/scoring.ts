import 'server-only';
import {scoreOpportunity,initialWeights,type ScoreFactor,type FactorName} from '@augmented-architect/seo-analyst';
import type {Artifact} from '../opportunities/contracts';
import {savedResearch} from './service';
export function opportunityIntelligence(opportunityId:string,rows:Artifact[],now=new Date()){
  const research=savedResearch(rows),links=rows.filter(r=>r.parent_id===opportunityId&&r.payload.workflow==='intelligence-link/v1').map(r=>({id:r.id,researchId:String(r.payload.researchId),term:String(r.payload.term),createdAt:r.created_at})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const unknown=():ScoreFactor=>({value:null,rationale:'No approved evidence-backed assessment is available for this factor.',sourceReferences:[],confidence:'unknown'});
  const inputs:Record<FactorName,ScoreFactor>={commercialIntent:unknown(),businessRelevance:unknown(),demonstratedDemand:unknown(),competitiveFeasibility:unknown(),executionEfficiency:unknown()};
  const sourceIds:string[]=[];
  for(const link of links){
    const result=research.find(r=>r.id===link.researchId);if(!result)continue;
    const market=result.bundle.market.find(m=>m.term===link.term);
    if(market&&Date.parse(market.provenance.expiresAt)>now.getTime()&&market.estimatedMonthlySearches!==null&&inputs.demonstratedDemand.value===null){
      sourceIds.push(link.id);inputs.demonstratedDemand={value:Math.min(100,25*Math.log10(1+market.estimatedMonthlySearches)),rationale:`Initial log-scale heuristic: min(100, 25 × log10(1 + ${market.estimatedMonthlySearches})). Uses a provider estimate, not qualified lead demand.`,sourceReferences:[link.id],confidence:'unknown'};
    }
  }
  return {links,aiEvidenceLinks:rows.filter(r=>r.parent_id===opportunityId&&r.payload.workflow==='intelligence-ai-link/v1').map(r=>({id:r.id,evidenceArtifactId:String(r.payload.evidenceArtifactId),evidenceIds:r.payload.evidenceIds,planId:r.payload.planId})),score:scoreOpportunity(inputs,initialWeights,sourceIds)};
}
