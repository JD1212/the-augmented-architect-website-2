// Stage an owner-approved export for normal Git review. Never commits or deploys.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function validateRelease(bundle){
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 assert.equal(bundle.kind,'article_release','Export an approved article release from Content Strategist.');
 assert.equal(bundle.channel,'website');assert(uuid.test(bundle.approvalId));assert(uuid.test(bundle.revisionId));assert(/^[a-f0-9]{64}$/.test(bundle.revisionHash));
 const a=bundle.article;assert(a&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug));assert.equal(a.status,'published');assert(/^\d{4}-\d{2}-\d{2}$/.test(a.publishedDate));assert.equal(new Date(a.publishedDate+'T00:00:00Z').toISOString().slice(0,10),a.publishedDate);
 assert.equal(a.publication.revisionId,bundle.revisionId);assert.equal(a.publication.revisionHash,bundle.revisionHash);assert.equal(a.publishedDate,bundle.publicationDate);
 assert.equal(bundle.filename,'src/content/articles/'+a.slug+'.ts');assert(Array.isArray(a.content)&&a.content.length>0);assert(['ai-architecture','salesforce','philosophy'].includes(a.category));
 return a;
}
export function stageRelease(bundle,base=root){
 const a=validateRelease(bundle),folder=join(base,'src/content/articles'),registry=join(folder,'index.ts'),file=join(folder,a.slug+'.ts');
 // Do not execute downloaded JavaScript. Serialize only the reviewed article object.
 const source="import type {Article} from './types';\n\nexport const article:Article = "+JSON.stringify(a,null,2)+';\n';
 const previous=readFileSync(registry,'utf8');const alias='article_'+a.slug.replaceAll('-','_');let next=previous;
 if(!previous.includes("from './"+a.slug+"'")){
  assert(/export const articles:\s*readonly Article\[\]\s*=\s*\[/.test(previous),'Registry format changed; review manually.');
  next="import {article as "+alias+"} from './"+a.slug+"';\n"+previous.replace(/(export const articles:\s*readonly Article\[\]\s*=\s*\[)/,'$1'+alias+',');
 }
 // Existing article updates remain visible in Git; never touch other source files.
 writeFileSync(file,source);if(next!==previous)writeFileSync(registry,next);
 return {file,registry,revisionId:bundle.revisionId,revisionHash:bundle.revisionHash,requiresGitReview:true};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const input=process.argv[2];assert(input&&existsSync(input),'Usage: node scripts/stage-content-release.mjs /path/to/approved-article-release.json');
 console.log(JSON.stringify(stageRelease(JSON.parse(readFileSync(input,'utf8'))),null,2));
 console.log('Staged locally only. Run checks and protected Preview, then obtain Production release approval. Record publication only after the live URL and commit are verified.');
}
