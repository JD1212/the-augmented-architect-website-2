import 'server-only';
import {MarketingError} from '../config';

export function planningExecutionEnabled(env:NodeJS.ProcessEnv=process.env){
 return env.SEO_RESEARCH_PLANNING_ENABLED==='true';
}
export function requirePlanningExecution(){
 if(!planningExecutionEnabled())throw new MarketingError(503,'New research planning is disabled for this environment. Saved plans and evidence remain available.');
}

/** Uses the existing reviewed model rate card; allowance, not a provider billing cap. */
export function planningReadiness(env:NodeJS.ProcessEnv=process.env){
 const model=env.OPENAI_SEO_MODEL||env.OPENAI_SCOUT_MODEL||null;
 const configured=Boolean(model&&env.OPENAI_API_KEY&&env.SUPABASE_SECRET_KEY&&env.GA4_PROPERTY_ID==='564904776');
 return {enabled:planningExecutionEnabled(env)&&configured,configured,model,maximumModelRequests:3,maximumOutputTokens:7200,maximumInputBytes:160000,timeoutSeconds:150,retries:0,estimatedCostUsd:model==='gpt-6-luna'?0.03:null,estimateBasis:'Existing reviewed gpt-6-luna rate card (2026-11-24), input-byte upper allowance plus output tokens and headroom; not a billing cap.',missing:[...(!planningExecutionEnabled(env)?['Planning execution is server-disabled']:[]),...(!configured?['OpenAI model, server credentials or authorized GA4 property are not configured']:[])]};
}
