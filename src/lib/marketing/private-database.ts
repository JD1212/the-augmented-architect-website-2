import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {MarketingError} from './config';
/** Owner-only handlers call this after authorization. Database edits never need a model key. */
export function marketingDatabase(){
 if(process.env.SUPABASE_URL!=='https://cjldcaiybqguklzqtdjj.supabase.co'||!process.env.SUPABASE_SECRET_KEY?.startsWith('sb_secret_'))throw new MarketingError(503,'Private marketing writes are not configured for this environment.');
 return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store',signal:AbortSignal.any([AbortSignal.timeout(10000),...(init?.signal?[init.signal]:[])])})}});
}
