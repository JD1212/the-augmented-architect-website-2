import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { MarketingError,marketingTenant } from '../config';
import { limits,packageVersion,instructionsVersion } from '@augmented-architect/seo-analyst';

export const seoRegistration={name:'SEO Analyst',version:packageVersion,instructions_version:instructionsVersion,enabled:true};
export const seoPolicy=Object.freeze({minimumIntervalMs:600000,maximumDailyRuns:6,leaseMs:300000});
export function seoConfiguration() {
  const {SUPABASE_URL:url,SUPABASE_SECRET_KEY:key,OPENAI_API_KEY:apiKey}=process.env;
  const model=process.env.OPENAI_SEO_MODEL||process.env.OPENAI_SCOUT_MODEL;
  if(url!=='https://cjldcaiybqguklzqtdjj.supabase.co'||!key?.startsWith('sb_secret_')||!apiKey||!model)throw new MarketingError(503,'SEO Analyst execution is not configured.');
  if(process.env.GA4_PROPERTY_ID!=='564904776')throw new MarketingError(503,'The authorized marketing property must be configured before running analysis.');
  return {url,key,apiKey,model,tenantId:marketingTenant,ga4Property:'564904776',searchProperty:'sc-domain:theaugmentedarchitect.com',limits};
}
export function seoDatabase(){const {url,key}=seoConfiguration();return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store',signal:AbortSignal.any([AbortSignal.timeout(10000),...(init?.signal?[init.signal]:[])])})}});}
