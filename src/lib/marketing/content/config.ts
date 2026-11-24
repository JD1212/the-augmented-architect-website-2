import 'server-only';
import {marketingDatabase} from '../private-database';
import {MarketingError} from '../config';
import {seoRegistrationIdentity} from '../seo/config';
export const contentDomain='content-workflow';
export function contentCapabilities(env=process.env){return {writeConfigured:Boolean(env.SUPABASE_SECRET_KEY),executionEnabled:env.CONTENT_STRATEGIST_ENABLED==='true'&&/^[a-zA-Z0-9_-]{8,80}$/.test(env.CONTENT_STRATEGIST_APPROVAL_ID??'')&&Boolean(env.OPENAI_API_KEY&&env.SUPABASE_SECRET_KEY&&(env.OPENAI_CONTENT_MODEL||env.OPENAI_SEO_MODEL||env.OPENAI_SCOUT_MODEL)),publishingEnabled:false,externalResearchEnabled:false};}
export function requireContentExecution(){if(!contentCapabilities().executionEnabled)throw new MarketingError(503,'Content Strategist execution is disabled pending a separately approved live test.');}
export function contentConfiguration(){requireContentExecution();return {model:(process.env.OPENAI_CONTENT_MODEL||process.env.OPENAI_SEO_MODEL||process.env.OPENAI_SCOUT_MODEL)!,apiKey:process.env.OPENAI_API_KEY!,approvalId:process.env.CONTENT_STRATEGIST_APPROVAL_ID!};}
export function contentAgentName(){return seoRegistrationIdentity().name.replace('SEO Analyst','Content Strategist');}
export const contentDatabase=marketingDatabase;
