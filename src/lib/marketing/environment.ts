import 'server-only';
import {createHash} from 'node:crypto';
/** Existing publication namespace, shared by explicitly environment-bound research approvals. */
export function publicationEnvironment(env=process.env){
 if(env.VERCEL_ENV==='production')return 'production';
 if(env.VERCEL_ENV==='preview'&&env.VERCEL_GIT_COMMIT_REF)return 'preview:'+createHash('sha256').update(env.VERCEL_GIT_COMMIT_REF).digest('hex').slice(0,16);
 return 'development';
}
