import 'server-only';
import type {SeoConfig,Evidence} from '@augmented-architect/seo-analyst';
import { site } from '@/content/site';
import { salesforceOffering } from '@/content/salesforce';
import { salesforceCommercial } from '@/content/salesforce-commercial';
import { aiSolutions } from '@/content/ai-solutions';
import { customApplications } from '@/content/custom-applications';
import { experience } from '@/content/experience';
export function seoBusinessConfig(model:string,days:7|28|90,objective='Find evidence-backed ways to generate qualified consultations for our AI Solutions, Salesforce Modernization, and $10,000 starting Custom Business Applications offering.'):SeoConfig {
  return {model,reportingDays:days,business:{name:site.name,website:site.url,objective,targetCustomers:['Business owners seeking connected custom websites, customer portals and employee workspaces.','Salesforce administrators and technical leaders modernizing complex Apex triggers and Flows.','Organizations seeking practical AI architecture, governed agents and business integrations.']}};
}
export function approvedWebsiteEvidence():Evidence {
  return {id:'approved-website',kind:'website',title:'Approved consulting website content',retrievedAt:new Date().toISOString(),hasActualSearchData:false,status:'connected',sources:[{url:site.url+'/salesforce',title:'Salesforce Modernization'},{url:site.url+'/our-approach/salesforce',title:'Our Approach to Salesforce'},{url:site.url+'/ai-solutions',title:'AI Solutions'},{url:site.url+'/custom-applications',title:'Custom Business Applications'}],content:JSON.stringify({services:site.services,customApplications:{hero:customApplications.hero,features:customApplications.package.features,scope:customApplications.package.note,boundaries:customApplications.future.boundaries},ai:aiSolutions.hero,philosophy:experience.philosophy,salesforce:{hero:salesforceOffering.hero,problem:salesforceOffering.problem,architecture:{description:salesforceOffering.architecture.description,boundary:salesforceOffering.architecture.boundary},tools:{description:salesforceOffering.tools.description,capabilities:salesforceOffering.tools.capabilities,context:salesforceOffering.tools.context},approach:salesforceOffering.approach,commercial:salesforceCommercial}}).slice(0,15500)};
}
