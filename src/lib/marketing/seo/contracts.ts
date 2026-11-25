import type {Analysis,Evidence,UsageReceipt} from '@augmented-architect/seo-analyst';
export type SeoUsage={receipts:UsageReceipt[];inputTokens:number|null;outputTokens:number|null;totalTokens:number|null;measuredCost:null};
export type SeoRun={id:string;state:'queued'|'running'|'completed'|'failed'|'interrupted';created_at:string;started_at:string|null;finished_at:string|null;usage:SeoUsage;stage:string;error:string|null};
export type EvidenceUse={savedCount:number;eligibleCount:number;includedCount:number;consumed:boolean;citedByFindings:number[]};
export type SeoPanelData={evidenceUsage?:EvidenceUse|null;agent:{id:string;enabled:boolean;version:string}|null;runs:SeoRun[];analysis:Analysis|null;evidence:Evidence[];analysisExecutionId:string|null;policy:{minimumIntervalMinutes:number;maximumDailyRuns:number};};
export function usageSummary(receipts:UsageReceipt[]):SeoUsage{
  const sum=(key:'inputTokens'|'outputTokens'|'totalTokens')=>receipts.length&&receipts.every(r=>r[key]!==null)?receipts.reduce((n,r)=>n+(r[key]??0),0):null;
  return {receipts,inputTokens:sum('inputTokens'),outputTokens:sum('outputTokens'),totalTokens:sum('totalTokens'),measuredCost:null};
}
