import {createHash} from 'node:crypto';
import type {Finding,Opportunity} from './contracts';
import type {Evidence} from '@augmented-architect/seo-analyst';
export function stableId(value:string){const h=createHash('sha256').update(value).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
export const reviewSlot=(tenant:string,opportunity:string,previous:string|null)=>stableId(`${tenant}:seo-review-v1:${opportunity}:${previous??'initial'}`);
export function topicCluster(tenant:string,original:Finding){
  const text=(original.title+' '+original.searchIntent).toLowerCase();
  const label=/bulk|regression|governor/.test(text)?'Salesforce testing & safety':/salesforce|apex|flow|trigger/.test(text)?'Salesforce automation':/agent|runtime|\bai\b/.test(text)?'AI architecture':/portal|application|integration/.test(text)?'Connected applications':'Other research';
  return {id:stableId(tenant+':topic-v1:'+label),label};
}
// Host-specific vocabulary, never model-supplied permissions or an LLM duplicate verdict.
const aliases:Record<string,string>={mapping:'inventory',map:'inventory',discover:'inventory',discovery:'inventory',dependencies:'dependency',refactoring:'modernization',refactor:'modernization',modernize:'modernization',audit:'assessment',review:'assessment',choose:'decision',choosing:'decision',comparison:'decision',compare:'decision',versus:'decision',admins:'administrator',admin:'administrator',developers:'developer',testing:'test',tests:'test',bulkification:'bulk',bulkify:'bulk'};
const stop=new Set('a an the to for of and or in on with your our their create publish offer build develop draft practical guide checklist page content salesforce owner reviewed business organization org organizations'.split(' '));
function words(text:string){return new Set(text.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).map(w=>aliases[w]??w).filter(w=>w.length>2&&!stop.has(w)));}
function overlap(a:Set<string>,b:Set<string>){const union=new Set([...a,...b]);return union.size?[...a].filter(w=>b.has(w)).length/union.size:0;}
function facets(f:Finding){
  const text=(f.title+' '+f.searchIntent).toLowerCase(),audience=f.targetCustomer.toLowerCase();
  const topic=/bulk|governor|regression/.test(text)?'bulk-regression':/choos|decis|compar|versus|\bvs\b|when to use/.test(text)&&/flow|apex|automation/.test(text)?'flow-apex-decision':/inventor|mapping|\bmap\b|dependency|dependencies|discover|what runs|trace|execution order/.test(text)&&/flow|apex|automation|trigger/.test(text)?'automation-inventory':null;
  const vertical=['healthcare','hospital','financial','banking','nonprofit','retail','manufacturing'].filter(v=>audience.includes(v)).join('|');
  return {topic,vertical};
}
export function semanticIdentity(f:Finding){const a=facets(f);return a.topic?`${a.topic}|${a.vertical}`:[...words(f.title+' '+f.searchIntent+' '+f.targetCustomer)].sort().join('|');}
export function reconcileFinding(f:Finding,existing:Opportunity[]):{opportunity:Opportunity|null;reason:string}{
  const a=facets(f),matches=existing.map(o=>{
    const b=facets(o.finding),sameTopic=a.topic&&a.topic===b.topic&&a.vertical===b.vertical;
    const distinct=a.vertical!==b.vertical||a.topic&&b.topic&&a.topic!==b.topic;
    const score=distinct?0:overlap(words(f.title+' '+f.searchIntent+' '+f.recommendedAction),words(o.finding.title+' '+o.finding.searchIntent+' '+o.finding.recommendedAction));
    return {o,score,sameTopic};
  }).sort((a,b)=>b.score-a.score);
  const strong=matches.filter(m=>m.sameTopic||m.score>=.65);
  if(strong.length>1)throw Error('Ambiguous opportunity continuity; owner review is needed before accepting another result.');
  if(strong.length)return {opportunity:strong[0].o,reason:strong[0].sameTopic?'host-topic-and-audience-v1':'normalized-concept-overlap-v1'};
  // An LLM's update hint never creates or merges an identity by itself.
  if(f.existingOpportunityId||matches.some(m=>m.score>=.45&&a.vertical===facets(m.o.finding).vertical))throw Error('Uncertain opportunity continuity; no new identity was accepted.');
  return {opportunity:null,reason:'new-host-identity-v1'};
}
export function materiallyChanged(a:Finding,b:Finding){return a.priority!==b.priority||a.basis!==b.basis||a.confidence!==b.confidence||a.sourceUrls.some(u=>!b.sourceUrls.includes(u));}
export function measuredEvidenceChanged(finding:Finding,current:Evidence[],previous:Evidence[]){
  const measured=(docs:Evidence[])=>docs.filter(e=>finding.evidenceIds.includes(e.id)&&['ga4','search_console'].includes(e.kind)&&e.status==='connected').map(e=>[e.kind,e.content]).sort((a,b)=>a[0].localeCompare(b[0]));
  const now=measured(current);return now.length>0&&JSON.stringify(now)!==JSON.stringify(measured(previous));
}
