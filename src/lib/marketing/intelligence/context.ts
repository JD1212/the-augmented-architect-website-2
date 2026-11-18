import 'server-only';
import {businessEvidenceSchema} from '@augmented-architect/seo-analyst';
import {approvedWebsiteEvidence,seoBusinessConfig} from '../seo/context';
export function approvedBusinessEvidence(service:string,now=new Date()){
  const website=approvedWebsiteEvidence(),business=seoBusinessConfig('context-only',28).business;
  const services=website.sources.filter(s=>!s.url.includes('/our-approach/'));
  const selected=services.find(s=>s.url.endsWith('/'+service));
  return businessEvidenceSchema.parse({category:'business_intelligence',objectives:[`Generate qualified consultation inquiries for ${selected?.title??'the approved business services'}.`],services:services.map(s=>s.title),targetCustomers:service==='salesforce'?business.targetCustomers:[],existingPages:website.sources.map(s=>s.url),conversionObservations:[],estimatedEffortHours:null,potentialCustomerValue:null,provenance:{provider:'approved_website_content',apiVersion:(process.env.VERCEL_GIT_COMMIT_SHA??'local-approved-content').slice(0,40),collectedAt:now.toISOString(),expiresAt:new Date(now.getTime()+86400000).toISOString(),requestId:null,reportedCostUsd:null,sourceUrls:website.sources.slice(0,5).map(s=>s.url)}});
}
