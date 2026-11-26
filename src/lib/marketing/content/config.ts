import 'server-only';
import {marketingDatabase} from '../private-database';
import {MarketingError,uuidPattern} from '../config';
import {limits} from '@augmented-architect/content-strategist';
import {seoRegistrationIdentity} from '../seo/config';
export const contentDomain='content-workflow';
export function contentExecutionPlan(env=process.env){
 const model=env.OPENAI_CONTENT_MODEL||env.OPENAI_SEO_MODEL||env.OPENAI_SCOUT_MODEL||null;
 return {model,opportunityId:uuidPattern.test(env.CONTENT_STRATEGIST_OPPORTUNITY_ID??'')?env.CONTENT_STRATEGIST_OPPORTUNITY_ID!:null,maximumExecutions:1,maximumModelRequests:limits.maxModelRequests,maximumOutputTokensPerRequest:limits.maxOutputTokensPerRequest,maximumOutputTokens:limits.maxModelRequests*limits.maxOutputTokensPerRequest,maximumInputBytes:limits.maxInputBytes,timeoutSeconds:limits.maxRuntimeMs/1000,maximumSourceReads:limits.maxSourceReads,retries:0,externalResearch:false,publishing:false,estimatedCostUsd:model==='gpt-6-luna'?0.04:null,pricing:{model:'gpt-6-luna',inputPerMillionUsd:0.10,outputPerMillionUsd:0.50,checkedOn:'2026-11-24',source:'https://developers.openai.com/api/docs/models/gpt-6-luna',basis:'Planning allowance: 240,000 aggregate input bytes conservatively treated as 240,000 tokens plus 18,000 output tokens, with headroom. Provider formatting, billing and future prices can differ; this is not a measured charge or hard monetary cap.'}};
}
export function contentCapabilities(env=process.env){const plan=contentExecutionPlan(env);return {writeConfigured:Boolean(env.SUPABASE_SECRET_KEY),executionEnabled:(env.VERCEL_ENV==='preview'&&env.VERCEL_GIT_COMMIT_REF===(env.CONTENT_STRATEGIST_PREVIEW_BRANCH||'feature/content-strategist')||env.VERCEL_ENV==='production'&&env.CONTENT_STRATEGIST_PRODUCTION_ENABLED==='true')&&Boolean(plan.opportunityId)&&env.CONTENT_STRATEGIST_ENABLED==='true'&&/^[a-zA-Z0-9_-]{8,80}$/.test(env.CONTENT_STRATEGIST_APPROVAL_ID??'')&&Boolean(env.OPENAI_API_KEY&&env.SUPABASE_SECRET_KEY&&plan.model),publishingEnabled:false,externalResearchEnabled:false,executionPlan:plan};}
export function requireContentExecution(){if(!contentCapabilities().executionEnabled)throw new MarketingError(503,'Content Strategist execution is disabled pending a separately approved live test.');}
export function contentConfiguration(){requireContentExecution();return {model:(process.env.OPENAI_CONTENT_MODEL||process.env.OPENAI_SEO_MODEL||process.env.OPENAI_SCOUT_MODEL)!,apiKey:process.env.OPENAI_API_KEY!,approvalId:process.env.CONTENT_STRATEGIST_APPROVAL_ID!,opportunityId:process.env.CONTENT_STRATEGIST_OPPORTUNITY_ID!};}
export function contentAgentName(){return seoRegistrationIdentity().name.replace('SEO Analyst','Content Strategist');}
export const contentDatabase=marketingDatabase;
