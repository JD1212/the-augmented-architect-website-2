import 'server-only';
import type {SeoConfig,Evidence} from '@augmented-architect/seo-analyst';
import { site } from '@/content/site';
import { salesforceOffering } from '@/content/salesforce';
import { salesforceCommercial } from '@/content/salesforce-commercial';
import { aiSolutions } from '@/content/ai-solutions';
import { customApplications } from '@/content/custom-applications';
import { experience } from '@/content/experience';
export function seoOfferings(){return [
 {id:'salesforce',name:'Salesforce Modernization',description:'Architecture, Apex and Flow automation cleanup, technical debt and developer tooling.',audiences:['Salesforce administrators and technical leaders modernizing complex orgs.'],commercialContext:'Scoped modernization consulting and implementation; separate from the default custom application stack.',pages:[site.url+'/salesforce',site.url+'/our-approach/salesforce']},
 {id:'ai-solutions',name:'AI Solutions and Architecture',description:'Business-first AI architecture, governed agents, identity, integration and practical implementation.',audiences:['Organizations connecting AI capabilities to real business processes.'],commercialContext:'Consulting and implementation scoped to business requirements.',pages:[site.url+'/ai-solutions',site.url+'/our-approach/ai-architecture']},
 {id:'custom-applications',name:'Custom Business Applications',description:'Modern websites, customer portals, employee workspaces, connected data and AI-ready applications.',audiences:['Business owners seeking connected customer and employee experiences.'],commercialContext:customApplications.package.note,pages:[site.url+'/custom-applications']}
 ];}
export function seoBusinessConfig(model:string,days:7|28|90,objective='Find evidence-backed ways to generate qualified consultations for our AI Solutions, Salesforce Modernization, and $10,000 starting Custom Business Applications offering.'):SeoConfig {
  return {model,reportingDays:days,asOf:new Date().toISOString(),offerings:seoOfferings(),business:{name:site.name,website:site.url,objective,targetCustomers:['Business owners seeking connected custom websites, customer portals and employee workspaces.','Salesforce administrators and technical leaders modernizing complex Apex triggers and Flows.','Organizations seeking practical AI architecture, governed agents and business integrations.']}};
}
export function approvedWebsiteEvidence():Evidence {
  return {id:'approved-website',kind:'website',title:'Approved consulting website content',retrievedAt:new Date().toISOString(),hasActualSearchData:false,status:'connected',sources:[{url:site.url+'/salesforce',title:'Salesforce Modernization'},{url:site.url+'/our-approach/salesforce',title:'Our Approach to Salesforce'},{url:site.url+'/ai-solutions',title:'AI Solutions'},{url:site.url+'/custom-applications',title:'Custom Business Applications'}],content:JSON.stringify({offerings:seoOfferings(),customApplications:{hero:customApplications.hero,features:customApplications.package.features,scope:customApplications.package.note,boundaries:customApplications.future.boundaries},ai:aiSolutions.hero,philosophy:experience.philosophy,salesforce:{hero:salesforceOffering.hero,problem:salesforceOffering.problem,architecture:{description:salesforceOffering.architecture.description,boundary:salesforceOffering.architecture.boundary},tools:{description:salesforceOffering.tools.description,capabilities:salesforceOffering.tools.capabilities,context:salesforceOffering.tools.context},approach:salesforceOffering.approach,commercial:salesforceCommercial}})};
}
