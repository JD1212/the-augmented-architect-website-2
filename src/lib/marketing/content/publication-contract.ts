import 'server-only';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {Article} from '@/content/articles/types';
import {validateArticles} from '@/lib/articles';
export const pointerWorkflow='website-publication-pointer/v1';
export {publicationEnvironment} from '../environment';
export function publishingEnabled(env=process.env){return env.ARTICLE_PUBLISHING_ENABLED==='true'&&Boolean(env.SUPABASE_SECRET_KEY)&&(env.VERCEL_ENV==='production'||env.VERCEL_ENV==='preview'&&env.VERCEL_GIT_COMMIT_REF==='feature/content-strategist'||env.NODE_ENV!=='production'&&!env.VERCEL_ENV);}
const link=z.object({label:z.string().min(1).max(160),url:z.string().max(1000)}).strict();
const annotation={links:z.array(link).max(5).optional(),citationIds:z.array(z.string().max(100)).max(8).optional()};
const block=z.discriminatedUnion('type',[
 z.object({type:z.literal('markdown'),text:z.string().max(120000)}).strict(),
 z.object({type:z.literal('paragraph'),text:z.string().max(12000),...annotation}).strict(),
 z.object({type:z.literal('heading'),text:z.string().max(12000),level:z.union([z.literal(2),z.literal(3)]).optional()}).strict(),
 z.object({type:z.literal('list'),text:z.string().max(12000).optional(),items:z.array(z.string().max(2500)).max(20),ordered:z.boolean().optional(),...annotation}).strict(),
 z.object({type:z.literal('quote'),text:z.string().max(12000),...annotation}).strict(),
 z.object({type:z.literal('code'),text:z.string().max(12000),language:z.string().max(30),...annotation}).strict(),
 z.object({type:z.literal('diagram'),text:z.string().max(12000),items:z.array(z.string().max(2500)).max(20),...annotation}).strict(),
 z.object({type:z.literal('cta'),text:z.string().max(12000),link}).strict(),
]);
const articleSchema=z.object({slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(150),title:z.string().min(1).max(160),format:z.enum(['Technical guide','Article']).optional(),category:z.enum(['philosophy','ai-architecture','salesforce']),summary:z.string().max(800),seoDescription:z.string().max(320),seoTitle:z.string().max(160).optional(),status:z.literal('published'),publishedDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),content:z.array(block).min(1).max(65),references:z.array(z.object({id:z.string(),url:z.string(),title:z.string()}).strict()).max(15).optional(),publication:z.object({id:z.string().uuid()}).strict()}).strict();
/** Explicit projection: private IDs, source snapshots, model inputs and unknown fields are never returned. */
export function publicArticle(value:Article):Article{
 const article=articleSchema.parse({slug:value.slug,title:value.title,format:value.format,category:value.category,summary:value.summary,seoDescription:value.seoDescription,seoTitle:value.seoTitle,status:value.status,publishedDate:value.publishedDate,content:value.content,references:value.references,publication:{id:value.publication!.id}});
 validateArticles([article]);return article;
}
export const publicArticleHash=(article:Article)=>createHash('sha256').update(JSON.stringify(publicArticle(article))).digest('hex');
export type PublicationPointer={id:string;parent_id:string;payload:{environment:string;slug:string;version:number;active:boolean;status:string;requestId?:string;revisionId:string;revisionHash:string;publicHash?:string;firstPublicationDate:string;canonicalUrl:string;article:Article;verifiedAt?:string}};
