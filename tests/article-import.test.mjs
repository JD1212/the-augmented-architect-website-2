import test from 'node:test';
import assert from 'node:assert/strict';
import * as seo from '@augmented-architect/seo-analyst';
import * as content from '@augmented-architect/content-strategist';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadScoutModule as load} from './helpers/scout-loader.mjs';
import {memoryDatabase} from './helpers/marketing-memory.mjs';
const base={'@augmented-architect/seo-analyst':seo,'@augmented-architect/content-strategist':content,'@/content/articles':{articles:[]},'@/lib/published-articles':{publishedArticles:async()=>[]}};
const cfg=load('src/lib/marketing/config.ts'),tenant=cfg.marketingTenant,actor='a2eba199-7949-49c9-828e-9d755e2e345b',request='11111111-1111-4111-a111-111111111111';
const importer=load('src/lib/marketing/content/importing.ts',base),repo=load('src/lib/marketing/content/repository.ts',base),publisher=load('src/lib/marketing/content/publishing.ts',base),state=load('src/lib/marketing/content/service.ts',base);
const metadata={title:'An independently written article',seoTitle:'An independently written article',summary:'Owner-provided listing text.',seoDescription:'Owner-provided SEO description.',slug:'independent-article',category:'ai-architecture'};
const markdown='# An independently written article\n\n**Bold** and *emphasis* stay intact.\n\n## A heading\n\n1. First\n2. Second\n\n- Nested\n  - Detail\n\n[Research](https://example.com/research) and [our services](/ai-solutions).\n\nReference [one][ref].\n\n[ref]: https://example.com/reference\n\nScientific example: 4 × 4 matrices.\n';
const doc={markdown,metadata};
test('independent import preserves exact original source and creates a real immutable editorial revision without an SEO opportunity or model',async()=>{
 const db=memoryDatabase(),a=await importer.importArticle(db,tenant,actor,request,doc,null),b=await importer.importArticle(db,tenant,actor,request,doc,null);assert.equal(a.documentId,b.documentId);assert(b.reused);assert.equal(db.rows.marketing_executions.length,0);assert(!db.rows.marketing_artifacts.some(r=>r.kind==='opportunity'));
 const root=db.rows.marketing_artifacts.find(r=>r.id===a.documentId),revision=repo.revisionHead(db.rows.marketing_artifacts,a.documentId);assert.equal(root.payload.originalMarkdown,markdown);assert.equal(revision.input.version,'owner-authored/v1');assert.equal(db.rows.marketing_artifacts.find(r=>r.id===revision.id).payload.origin,'owner-authored');assert.equal(db.rows.marketing_artifacts.find(r=>r.id===revision.id).payload.packageVersion,undefined);assert.equal(revision.input.assignment.findingId,null);assert.equal(revision.input.assignment.approvalId,null);assert.deepEqual(revision.input.sources,[]);
 const view=await state.contentState(db,tenant,a.documentId);assert.equal(view.origin,'owner-authored');assert.equal(view.grounding.assignment,null);assert.equal(view.imported.originalMarkdown,markdown);
 const article=publisher.draftArticle(revision,'2026-11-25');assert.equal(article.content[0].type,'markdown');assert.equal(article.content[0].text,markdown);assert.equal(article.category,'ai-architecture');assert.equal(article.references,undefined);
 await assert.rejects(importer.importArticle(db,tenant,actor,request,{...doc,markdown:markdown+'Changed'},null),/different document/);
});
test('editing creates a new revision and invalidates exact-revision approval while retaining original Markdown',async()=>{
 const db=memoryDatabase(),a=await importer.importArticle(db,tenant,actor,request,doc,null),first=repo.revisionHead(db.rows.marketing_artifacts,a.documentId);await repo.savePublicationApproval(db,tenant,actor,first,'website',first.hash);
 const updated={...doc,metadata:{...metadata,seoTitle:'New SEO title'},markdown:markdown+'\nAn owner edit.'};await importer.reviseImportedArticle(db,tenant,actor,first,updated);const head=repo.revisionHead(db.rows.marketing_artifacts,a.documentId);assert.notEqual(head.id,first.id);assert.equal(repo.approvedRevision(db.rows.marketing_artifacts,head,'website'),undefined);assert.equal(db.rows.marketing_artifacts.find(r=>r.id===a.documentId).payload.originalMarkdown,markdown);assert.equal(importer.importedDocument(head).markdown,updated.markdown);assert(repo.approvedRevision(db.rows.marketing_artifacts,first,'website'));
});
test('unsafe HTML, script URLs, oversized input, invalid metadata, unsafe links and cross-tenant associations are rejected',async()=>{
 for(const bad of ['<script>alert(1)</script>','<iframe src="https://example.com"/>','[x](javascript:alert%281%29)','[x](data:text/html,x)','[x](//evil.example.com)','[x](https://user:password@example.com)','[x](https://127.0.0.1/path)','[x](https://example.com/\\evil)'])assert.throws(()=>importer.validateImport({...doc,markdown:bad}),/HTML|link/);
 assert.throws(()=>importer.validateImport({...doc,markdown:'x'.repeat(120001)}));assert.throws(()=>importer.validateImport({...doc,metadata:{...metadata,slug:'../secret'}}));
 const db=memoryDatabase();await assert.rejects(importer.importArticle(db,'other',actor,request,doc,null),/Unauthorized/);await assert.rejects(importer.importArticle(db,tenant,actor,request,doc,'22222222-2222-4222-a222-222222222222'),/not found/);assert.equal(db.rows.marketing_artifacts.length,0);
});
test('an imported article joins the existing owner queue without a simulated Discover approval',async()=>{
 const db=memoryDatabase(),a=await importer.importArticle(db,tenant,actor,request,doc,null),workflow=load('src/lib/marketing/workflow/model.ts',base).workflowSnapshot({opportunities:[],evidence:{}},db.rows.marketing_artifacts,[],{environment:'development',publishingEnabled:true,generationEnabled:false});assert.equal(workflow.items.length,1);assert.equal(workflow.items[0].id,a.documentId);assert.equal(workflow.items[0].origin,'owner-authored');assert(!workflow.items[0].completedStages.includes('discover'));assert.equal(workflow.counts.needsReview,1);
});
test('the provided Red Queen acceptance source is preserved verbatim, including all five original references',async()=>{
 const path=process.env.RED_QUEEN_SOURCE;if(!path)return;const source=readFileSync(path,'utf8');assert.equal(createHash('sha256').update(source).digest('hex'),'2bc6ef4857cf335febd0508e970c05f2de297382f3a894008141788f0c32d87c');
 const title='Beyond the Boundaries of Intelligence: Why Architecture Is the Key to AI Discovery',db=memoryDatabase(),a=await importer.importArticle(db,tenant,actor,request,{markdown:source,metadata:{...metadata,title,seoTitle:title,slug:'beyond-the-boundaries-of-intelligence'}},null),r=repo.revisionHead(db.rows.marketing_artifacts,a.documentId);assert.equal(publisher.draftArticle(r).content[0].text,source);for(const term of ['AlphaTensor','FunSearch','AlphaEvolve','September 14, 2015','4 × 4','48 scalar multiplications'])assert(source.includes(term));assert.equal(load('src/lib/markdown.ts').inspectMarkdown(source).externalLinks.length,5);
});
test('import publishing reuses exact-revision approval and HTTP verification without requiring a research approval',async()=>{
 const db=memoryDatabase(),a=await importer.importArticle(db,tenant,actor,request,doc,null),revision=repo.revisionHead(db.rows.marketing_artifacts,a.documentId),owner={db,tenantId:tenant,user:{id:actor}};let phases=[];
 db.rpc=async(_name,{p_command:c})=>{phases.push(c.phase);assert.equal(c.origin,'owner-authored');assert.equal(c.sourceFindingId,null);assert.equal(c.sourceOpportunityId,null);assert.equal(c.article.content[0].text,markdown);return {data:{status:c.phase==='verified'?'live':'verifying'},error:null};};
 const api=load('src/lib/marketing/content/direct-publishing.ts',{...base,'@vercel/oidc':{getVercelOidcToken:async()=>''},'next/cache':{revalidatePath(){},revalidateTag(){}},'../auth':{requireOwner:async()=>owner},'./config':{contentDatabase:()=>db,contentDomain:'content-workflow'}}),old={...process.env};
 Object.assign(process.env,{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/content-strategist',ARTICLE_PUBLISHING_ENABLED:'true',SUPABASE_SECRET_KEY:'fixture'});
 try{const command={action:'publish',requestId:'22222222-2222-4222-a222-222222222222',revisionId:revision.id,revisionHash:revision.hash,opportunityId:a.documentId,publicationDate:'2026-11-25',expectedVersion:0};
 await assert.rejects(api.changePublication(owner,command,{verify:async()=>{},invalidate(){}}),/Approve this exact/);assert.equal(phases.length,0);
 await repo.savePublicationApproval(db,tenant,actor,revision,'website',revision.hash);const result=await api.changePublication(owner,command,{verify:async c=>{assert.equal(c.article.seoTitle,metadata.seoTitle);assert(!('originalMarkdown' in c.article));return {pageStatus:200,listStatus:200,sitemapStatus:200,versionMatched:true,canonicalMatched:true};},invalidate(){}});assert.equal(result.status,'live');assert.deepEqual(phases,['begin','verified']);
 }finally{for(const key of Object.keys(process.env))if(!(key in old))delete process.env[key];Object.assign(process.env,old);}
});
test('the private import API denies unauthenticated requests before accessing the draft store',async()=>{
 const http=load('src/lib/marketing/http.ts',{'./config':cfg});let writes=0;
 const route=load('src/app/api/admin/marketing/content/route.ts',{...base,'@/lib/marketing/http':http,'@/lib/marketing/config':cfg,'@/lib/marketing/auth':{ownerAuth:async()=>({}),requireOwner:async()=>{throw new cfg.MarketingError(401,'Sign in required.');}},'@/lib/marketing/content/config':{contentDatabase:()=>{writes++;throw Error('Unexpected write');}},'next/cache':{revalidatePath(){},revalidateTag(){}},'@vercel/oidc':{getVercelOidcToken:async()=>''}});
 const response=await route.POST(new Request('https://example.com/api/admin/marketing/content',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify({operation:'import',requestId:request,opportunityId:request,document:doc,linkedOpportunityId:null})}));assert.equal(response.status,401);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(writes,0);
});
