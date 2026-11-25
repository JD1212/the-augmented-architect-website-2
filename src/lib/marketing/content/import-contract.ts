import {z} from 'zod';
export const importLimit=120000;
export const importMetadataSchema=z.object({title:z.string().trim().min(1).max(160),seoTitle:z.string().trim().min(1).max(160),seoDescription:z.string().trim().min(1).max(320),summary:z.string().trim().min(1).max(800),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(150),category:z.enum(['philosophy','ai-architecture','salesforce'])}).strict();
export const importDocumentSchema=z.object({markdown:z.string().min(1).max(importLimit),metadata:importMetadataSchema}).strict();
export type ImportedDocument=z.infer<typeof importDocumentSchema>;
export type OwnerArticleInput={version:'owner-authored/v1';assignment:{version:'owner-import/v1';documentId:string;linkedOpportunityId:string|null;approvalId:null;findingId:null;deliverableType:'article';evidence:[]};sources:[];facts:[]};
export const ownerArticle=(input:unknown):input is OwnerArticleInput=>Boolean(input&&typeof input==='object'&&(input as {version?:string}).version==='owner-authored/v1');
