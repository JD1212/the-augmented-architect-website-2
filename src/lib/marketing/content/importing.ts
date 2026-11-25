import 'server-only';
import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {ContentDraft} from '@augmented-architect/content-strategist';
import type {Article} from '@/content/articles/types';
import {inspectMarkdown} from '@/lib/markdown';
import {MarketingError,marketingTenant} from '../config';
import {loadBacklog} from '../opportunities/repository';
import {contentAssignment} from '../opportunities/handoff';
import {stableId} from '../opportunities/identity';
import {contentRows,saveRevision,type Revision} from './repository';
import {contentHash} from './grounding';
import {importDocumentSchema,ownerArticle,type ImportedDocument,type OwnerArticleInput} from './import-contract';
export function validateImport(value:unknown):ImportedDocument{
 const parsed=importDocumentSchema.safeParse(value);if(!parsed.success)throw new MarketingError(400,'Provide the complete Markdown and valid title, summary, SEO metadata, slug and category.');
 try{inspectMarkdown(parsed.data.markdown);}catch(e){throw new MarketingError(400,e instanceof Error?e.message:'Invalid Markdown.');}return parsed.data;
}
export function importedDocument(revision:Revision):ImportedDocument|null{
 if(!ownerArticle(revision.input))return null;
 const doc=validateImport(revision.grounding.ownerArticle);
 if(contentHash(doc)!==revision.grounding.ownerArticleHash)throw new MarketingError(503,'The imported revision failed its integrity check.');
 return doc;
}
function editorialDraft(doc:ImportedDocument):ContentDraft{
 return {version:'content-package/v1',decision:'article',rationale:'Independently written article imported by the owner. No model execution or research verification is implied.',audience:'Owner-authored editorial',searchIntent:'Not agent-assessed',website:{...doc.metadata,targetUrl:null,blocks:[]},linkedin:null,claims:[],additionalEvidenceNeeded:[],limitations:['Author-supplied links and references are syntax-checked; their scientific claims have not been independently verified by this import.']};
}
export async function importArticle(db:SupabaseClient,tenant:string,actor:string,requestId:string,value:unknown,linkedOpportunityId:string|null){
 if(tenant!==marketingTenant)throw new MarketingError(403,'Unauthorized article import.');const document=validateImport(value),documentId=stableId(tenant+':owner-article:'+requestId),rows=await contentRows(db,tenant),existing=rows.find(r=>r.id===documentId);
 let brief:unknown=null;
 if(linkedOpportunityId){const backlog=await loadBacklog(db,tenant),o=backlog.opportunities.find(o=>o.id===linkedOpportunityId);if(!o)throw new MarketingError(404,'Linked opportunity not found in this workspace.');const assignment=contentAssignment(o,backlog);brief=assignment?.version==='content-assignment/v2'?assignment.seoBrief:null;}
 const originalHash=createHash('sha256').update(document.markdown).digest('hex');
 if(existing&&(existing.payload.workflow!=='owner-article/v1'||existing.actor_id!==actor||existing.payload.originalHash!==originalHash||existing.payload.initialDocumentHash!==contentHash(document)||existing.payload.linkedOpportunityId!==linkedOpportunityId))throw new MarketingError(409,'This import request belongs to a different document.');
 if(!existing){const r=await db.from('marketing_artifacts').insert({id:documentId,tenant_id:tenant,kind:'content_draft',title:document.metadata.title,parent_id:linkedOpportunityId,actor_id:actor,payload:{domain:'content-workflow',workflow:'owner-article/v1',origin:'owner-authored',originalMarkdown:document.markdown,originalHash,initialDocumentHash:contentHash(document),linkedOpportunityId,seoBrief:brief}});if(r.error)throw new MarketingError(409,'Import was already claimed. Retry the same request to recover its saved draft.');}
 const input:OwnerArticleInput={version:'owner-authored/v1',assignment:{version:'owner-import/v1',documentId,linkedOpportunityId,approvalId:null,findingId:null,deliverableType:'article',evidence:[]},sources:[],facts:[]};
 const result=await saveRevision(db,tenant,actor,documentId,null,editorialDraft(document),input,{origin:'owner-authored',ownerArticle:document,ownerArticleHash:contentHash(document),originalHash,seoBrief:existing?.payload.seoBrief??brief},null);
 return {documentId,...result};
}
export async function reviseImportedArticle(db:SupabaseClient,tenant:string,actor:string,revision:Revision,value:unknown){
 if(!ownerArticle(revision.input))throw new MarketingError(400,'Choose an owner-imported article.');const doc=validateImport(value);
 return saveRevision(db,tenant,actor,revision.opportunityId,revision.id,editorialDraft(doc),revision.input,{...revision.grounding,ownerArticle:doc,ownerArticleHash:contentHash(doc)},null);
}
export function importedArticle(revision:Revision,publishedDate?:string):Article{
 const doc=importedDocument(revision);if(!doc)throw new MarketingError(400,'No imported article exists.');
 return {...doc.metadata,format:'Article',status:publishedDate?'published':'draft',...(publishedDate?{publishedDate}:{}),content:[{type:'markdown',text:doc.markdown}],publication:{id:stableId(revision.id+':publication:website'),revisionId:revision.id,revisionHash:revision.hash}};
}
