import 'server-only';
import type {SeoConfig,Evidence} from '@augmented-architect/seo-analyst';
import { site } from '@/content/site';
import { salesforceOffering } from '@/content/salesforce';
import { salesforceCommercial } from '@/content/salesforce-commercial';
import { aiSolutions } from '@/content/ai-solutions';
import { customApplications } from '@/content/custom-applications';
import { experience } from '@/content/experience';
export function seoBusinessConfig(model:string,days:7|28|90):SeoConfig {
  return {model,reportingDays:days,business:{name:site.name,website:site.url,objective:'Generate qualified Salesforce modernization consulting inquiries for The Augmented Architect through useful, evidence-backed SEO opportunities. Recommend focused owner-reviewed content and positioning, not automated marketing actions.',targetCustomers:['Salesforce administrators and developers maintaining complex Apex triggers and record-triggered Flows.','Small and midsize organizations whose Salesforce automation has become difficult or risky to change.','Technical leaders seeking incremental Salesforce modernization, architecture assessment, and AI-assisted engineering.']}};
}
export function approvedWebsiteEvidence():Evidence {
  return {id:'approved-website',kind:'website',title:'Approved consulting website content',retrievedAt:new Date().toISOString(),hasActualSearchData:false,status:'connected',sources:[{url:site.url+'/salesforce',title:'Salesforce Modernization'},{url:site.url+'/our-approach/salesforce',title:'Our Approach to Salesforce'},{url:site.url+'/ai-solutions',title:'AI Solutions'},{url:site.url+'/custom-applications',title:'Custom Business Applications'}],content:JSON.stringify({services:site.services,salesforce:{hero:salesforceOffering.hero,problem:salesforceOffering.problem,architecture:{description:salesforceOffering.architecture.description,boundary:salesforceOffering.architecture.boundary},tools:{description:salesforceOffering.tools.description,capabilities:salesforceOffering.tools.capabilities,context:salesforceOffering.tools.context},approach:salesforceOffering.approach,commercial:salesforceCommercial},ai:aiSolutions.hero,customApplications:customApplications.hero,philosophy:experience.philosophy}).slice(0,15500)};
}
