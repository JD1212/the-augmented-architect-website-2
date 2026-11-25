import 'server-only';
import {getVercelOidcToken} from '@vercel/oidc';
/** Safe configuration facts only. Never include token values, credentials or response bodies. */
export function publicationConfigurationSummary(env=process.env){
 const hostname=env.VERCEL_URL??null;
 return {environment:env.VERCEL_ENV??'development',branch:env.VERCEL_GIT_COMMIT_REF??null,hostname,legacyOriginMatched:typeof hostname==='string'&&/^the-augmented-architect-website-2-[a-z0-9]+\.vercel\.app$/.test(hostname),allowedOriginMatched:typeof hostname==='string'&&/^the-augmented-architect-website-2-[a-z0-9-]+\.vercel\.app$/.test(hostname),oidcTokenPresent:Boolean(env.VERCEL_OIDC_TOKEN)};
}

/** Owner-triggered read-only check. Never activates a candidate or retries publication. */
export async function publicationReadOnlyProbe(request:typeof fetch=fetch){
 if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!=='feature/content-strategist')throw Error('PREVIEW_DIAGNOSTIC_ONLY');
 const configuration=publicationConfigurationSummary();
 if(!configuration.allowedOriginMatched||!configuration.hostname)return {configuration,phase:'configuration',rule:'VERIFICATION_ORIGIN_INVALID'};
 const origin='https://'+configuration.hostname;
 const check=async(token:string|undefined)=>{try{const r=await request(origin+'/robots.txt',{headers:token?{'x-vercel-trusted-oidc-idp-token':token}:{},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10000)});await r.body?.cancel();return {status:r.status,requestId:r.headers.get('x-vercel-id')};}catch{return {status:null,rule:'READ_ONLY_PROBE_TRANSPORT_FAILED'};}};
 const legacy=await check(process.env.VERCEL_OIDC_TOKEN);let sdk;
 try{sdk=await check(await getVercelOidcToken());}catch{sdk={status:null,rule:'OIDC_SDK_TOKEN_UNAVAILABLE'};}
 const result={configuration,legacyOriginWouldReject:!configuration.legacyOriginMatched,legacyRobots:legacy,sdkRobots:sdk,publicationAttempted:false,databaseWrites:0};
 console.info('publication_read_only_probe',JSON.stringify(result));return result;
}
