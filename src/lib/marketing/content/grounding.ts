import 'server-only';
import {createHash} from 'node:crypto';
import type {ContentInput,Fact} from '@augmented-architect/content-strategist';
import type {ContentAssignment,Evidence} from '@augmented-architect/seo-analyst';
import type {Backlog,Opportunity,Artifact} from '../opportunities/contracts';
import {contentAssignment} from '../opportunities/handoff';
import {seoBusinessConfig,approvedWebsiteEvidence} from '../seo/context';
import {savedResearch} from '../intelligence/service';
import {reviewedSources} from './sources';
import {site} from '@/content/site';
import {getPublishedArticles,articleHref} from '@/lib/articles';
import {approachPages,aboutEditorial} from '@/content/editorial';
import {howWeWork} from '@/content/how-we-work';

export const contentHash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).filter(([,v])=>v!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0)):item)).digest('hex');
export function reportFacts(documents:Evidence[]):Fact[]{
 const facts:Fact[]=[];
 for(const doc of documents.filter(d=>['ga4','search_console'].includes(d.kind))){
  facts.push({id:doc.id+':actual-search',evidenceId:doc.id,label:'Search-data provenance flag',value:doc.hasActualSearchData,unit:'boolean',period:'Original report',classification:'verified',display:`${doc.title}: hasActualSearchData is ${doc.hasActualSearchData}.`});
  if(!['connected','empty'].includes(doc.status))continue;
  const body=JSON.parse(doc.content) as Record<string,unknown>,range=body.range as {start?:string;end?:string}|undefined,period=`${range?.start??'unknown'} — ${range?.end??'unknown'}`;
  for(const [table,value] of Object.entries(body)){
   const v=value as {columns?:string[];rows?:{label:string;values:(number|null)[]}[]};if(!v?.columns||!Array.isArray(v.rows))continue;
   for(const row of v.rows){if(/@|\b\d{10,}\b/.test(row.label))continue;for(const [index,column] of v.columns.entries()){
    if(facts.length>=190)break;const raw=row.values[index],known=typeof raw==='number'&&Number.isFinite(raw),label=`${doc.kind} / ${table} / ${row.label} / ${column}`;
    facts.push({id:'fact-'+contentHash([doc.id,table,row.label,column]).slice(0,32),evidenceId:doc.id,label,value:known?raw:null,unit:column,period,classification:known?'verified':'unknown',display:`${label}: ${known?raw:'unknown'} (${period}).`});
   }}
  }
 }
 return facts;
}
export function groundedOpportunity(opportunity:Opportunity,backlog:Backlog,research:Artifact[],asOf=new Date()){
 const docs=backlog.evidence[opportunity.observations.find(o=>o.id===opportunity.reviews.filter(r=>r.action==='approve').at(-1)?.findingId)?.evidenceArtifactId??opportunity.observations.at(-1)!.evidenceArtifactId]??[];
 const facts=reportFacts(docs),original=contentAssignment(opportunity,backlog),sources=reviewedSources(original?.approvedSources.map(s=>s.url)??opportunity.finding.sourceUrls,asOf);
 const researchFreshness=savedResearch(research).map(r=>({researchId:r.id,service:r.query.service,providerReceipts:r.bundle.collections.map(c=>({provider:c.provider,observedAt:c.collectedAt,expiresAt:c.expiresAt,status:Date.parse(c.collectedAt)>asOf.getTime()?'unknown':Date.parse(c.expiresAt)>asOf.getTime()?'fresh':'expired'})),linkedToThisOpportunity:research.some(l=>l.parent_id===opportunity.id&&l.payload.workflow==='intelligence-link/v1'&&l.payload.researchId===r.id)}));
 const corrections=[{code:'MODEL_COMMENTARY_EXCLUDED',message:'Original model summaries, limitations and prior-plan commentary are retained in history but excluded as established facts.'},{code:'REPORT_FACTS_FROM_SNAPSHOT',message:'Report flags and numeric cells are reconstructed from the original saved reporting snapshots, not copied from model prose.'},{code:'FRESHNESS_RECOMPUTED',message:'Provider freshness is recomputed from original receipt dates at this review time; historical stale labels are not reused.'},{code:'CITATIONS_REVERIFIED',message:'Unresolved model citation tokens are excluded. Only independently reviewed primary-source notes are admitted.'}];
 const website=approvedWebsiteEvidence();
 const sanitized:ContentAssignment|null=original?{...original,existingPages:[...original.existingPages,{url:site.url+'/book',title:site.consultation.label},{url:site.url+'/how-we-work',title:howWeWork.seo.title}],approvedSources:sources.map(s=>({url:s.url,title:s.title})),evidence:[...docs.filter(d=>['ga4','search_console'].includes(d.kind)),{...website,content:JSON.stringify({approvedBusinessContent:JSON.parse(website.content),facts,sourceIds:sources.map(s=>s.id),keywordCoverage:researchFreshness.filter(r=>r.linkedToThisOpportunity),asOf:asOf.toISOString()})},{id:'verified-source-notes',kind:'external_research',title:'Reviewed primary-source notes',content:JSON.stringify(sources),sources:sources.map(s=>({url:s.url,title:s.title})),retrievedAt:asOf.toISOString(),status:sources.length?'connected':'empty',hasActualSearchData:false}],constraints:['Use only the current verified source notes and structured report facts. Historical model prose is not established fact.','No invented client claims, experiences, qualifications, savings or search demand.','No external research, publication, social posting, calendar actions or spending authority.','Omitted or unlinked keyword evidence is not proof of demand for this topic.',...(original.constraints.filter(c=>c.startsWith('Owner direction: ')))],brandRequirements:['Plain, specific, business-first language. Explain mechanisms and tradeoffs.','Preserve actual service and package boundaries.']}:null;
 return {assignment:sanitized,originalAssignmentHash:original?contentHash(original):null,evidenceBundleId:opportunity.observations.find(o=>o.id===original?.findingId)?.evidenceArtifactId??opportunity.observations.at(-1)!.evidenceArtifactId,facts,sources,corrections,researchFreshness,asOf:asOf.toISOString(),publicationBaseline:facts.filter(f=>f.period!=='Original report').map(f=>f.period).filter((v,i,a)=>a.indexOf(v)===i)};
}
/** Lossless references replace repeated copies in the model view; the approved host snapshot is unchanged. */
function modelAssignment(grounding:ReturnType<typeof groundedOpportunity>){
 const a=grounding.assignment!;
 return {...a,evidence:a.evidence.map(doc=>{
  let content=doc.content;
  if(['ga4','search_console'].includes(doc.kind))content=JSON.stringify({representation:'verified-fact-references/v1',facts:grounding.facts.filter(f=>f.evidenceId===doc.id).map(f=>f.id),hasActualSearchData:doc.hasActualSearchData,note:'All values, unknowns, labels and periods are preserved in the top-level facts array.'});
  else if(doc.id==='approved-website'){const body=JSON.parse(doc.content);delete body.facts;content=JSON.stringify(body);}
  else if(doc.id==='verified-source-notes')content=JSON.stringify({representation:'verified-source-references/v1',sources:grounding.sources.map(s=>({id:s.id,snapshotHash:s.snapshotHash})),note:'The complete reviewed notes are preserved in the top-level sources array and authorized source reader.'});
  return {...doc,content,originalContentHash:contentHash(doc.content)};
 })};
}
export function contentInput(grounding:ReturnType<typeof groundedOpportunity>,model:string):ContentInput{
 if(!grounding.assignment)throw Error('Approve this exact opportunity finding for drafting first.');
 return {assignment:modelAssignment(grounding),sources:grounding.sources,facts:grounding.facts,channels:['website','linkedin'],model,asOf:grounding.asOf,researchAuthorized:false,context:{categories:['philosophy','ai-architecture','salesforce'],preferredCategory:'ai-architecture',editorialFeedback:[],priorDraft:null,consultationUrls:[site.url+'/book'],positioning:JSON.stringify(seoBusinessConfig('context-only',28).business),voice:['Write naturally for business owners and technical decision-makers.','Explain what a control accomplishes and how to apply it.','Avoid generic SEO filler, inflated claims, and invented first-person experience.','Use precise technical explanations where the audience needs them.'],existingContent:[...grounding.assignment.existingPages.map(p=>({...p,summary:'Existing approved website destination; inspect supplied approved business context before proposing overlap.'})),...Object.entries(approachPages).map(([id,p])=>({url:site.url+'/our-approach/'+id,title:p.title,summary:p.introduction.join(' ').slice(0,1800)})),{url:site.url+'/about',title:aboutEditorial.title,summary:aboutEditorial.introduction.join(' ').slice(0,1800)},...getPublishedArticles().slice(0,20).map(a=>({url:site.url+articleHref(a.slug),title:a.title,summary:a.summary}))],guidelines:['Consultation destination: '+site.url+'/book','Website drafts use the existing editorial article renderer; publication requires an exact revision approval and Git review.','Existing article context is bounded to twenty published summaries; the full registry remains authoritative for release review.','LinkedIn is manual owner publication. An unpublished article has no live URL.','Reporting observations describe this website, not market demand. Include statistics only when relevant and through fact blocks.']}};
}
