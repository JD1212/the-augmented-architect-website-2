import 'server-only';
import {createHash} from 'node:crypto';
import {SeoValidationError,safeSource} from '@augmented-architect/seo-analyst';
import type {ResearchCatalog} from './research-evidence';

export function findValidationError(value:unknown):SeoValidationError|null {
  const seen=new Set<unknown>();
  for(let i=0;i<4&&value&&typeof value==='object'&&!seen.has(value);i++){
    if(value instanceof SeoValidationError)return value;seen.add(value);
    const e=value as {cause?:unknown;originalError?:unknown};value=e.cause??e.originalError;
  }
  return null;
}
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
function reference(value:string){
  const fingerprint=hash(value);if(!safeSource(value))return {fingerprint,display:'[invalid or unsafe URL]',queryKeys:[],hasFragment:false};
  const u=new URL(value);
  return {fingerprint,display:(u.origin+u.pathname).slice(0,160),queryKeys:[...u.searchParams.keys()].slice(0,4).map(k=>/^[a-zA-Z0-9_-]{1,30}$/.test(k)?k:'[redacted]'),hasFragment:Boolean(u.hash)};
}
const identifier=(value:string)=>/^[a-zA-Z0-9_-]{1,100}$/.test(value)&&!/^(sk-|sb_secret_)/.test(value)?value:'sha256:'+hash(value);
export function validationDiagnostic(error:unknown,mapping?:ResearchCatalog['mapping']) {
  const e=findValidationError(error);if(!e)return null; // Never infer a historical rule from a generic message.
  const data={rule:e.code,path:/^[a-zA-Z0-9_.\[\]]{1,200}$/.test(e.path)?e.path:'unknown',opportunityIndex:e.opportunityIndex,
    references:e.references?{
      evidence:e.references.evidence.map(d=>({id:identifier(d.id),kind:d.kind,status:d.status,hasActualSearchData:d.hasActualSearchData,urls:d.urls.slice(0,15).map(reference)})),
      proposed:e.references.proposed.map(o=>({priority:o.priority,evidenceIds:o.evidenceIds.map(identifier),sourceUrls:o.sourceUrls.map(reference),basis:['external_research','actual_search_data','mixed'].includes(o.basis??'')?o.basis:'unknown'})),
    }:null,
    research:mapping?{annotated:mapping.annotatedUrls.slice(0,15).map(reference),catalog:mapping.catalogUrls.slice(0,15).map(reference),discovered:mapping.discoveredUrls.slice(0,30).map(reference),omittedUncitedCount:mapping.omittedUncitedCount}:null,
  };
  // No prompts, full research prose, recommended content, URL query values or fragments are retained.
  if(JSON.stringify(data).length>32000&&data.research)data.research.discovered=[];
  if(JSON.stringify(data).length>32000){const strip=(r:ReturnType<typeof reference>)=>({...r,display:'[size budget: compare fingerprints]',queryKeys:[]});if(data.references){for(const d of data.references.evidence)d.urls=d.urls.map(strip);for(const d of data.references.proposed)d.sourceUrls=d.sourceUrls.map(strip);}if(data.research){data.research.annotated=data.research.annotated.map(strip);data.research.catalog=data.research.catalog.map(strip);}}
  return data;
}
