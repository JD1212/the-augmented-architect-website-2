// Uses the existing Vercel CLI login. No Google private key or persistent Google credential.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,chmodSync,unlinkSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const linked=JSON.parse(readFileSync('.vercel/project.json','utf8'));
assert.equal(linked.projectId,'prj_mSGGBQyKYm20H8Rl57tjm72qCQHq','Wrong linked project');
assert.equal(linked.orgId,'team_gIBiazQzKNJ8DmNLOuAfpecs','Wrong linked team');
const snapshot='.vercel/marketing-oidc-'+randomUUID()+'.env';
try{
  execFileSync('vercel',['env','pull',snapshot,'--environment=development','--yes','--scope','jd-burkholders-projects'],{stdio:'ignore',timeout:60000});
  const token=parseEnv(readFileSync(snapshot,'utf8')).VERCEL_OIDC_TOKEN;
  assert(token,'Vercel did not provide a development OIDC token');
  // These checks confirm the configuration source, not token authenticity.
  // Google's STS verifies signatures, issuer, audience and provider conditions.
  const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));
  assert.equal(claims.iss,'https://oidc.vercel.com/jd-burkholders-projects');
  assert.equal(claims.aud,'https://vercel.com/jd-burkholders-projects');
  assert.equal(claims.project_id,linked.projectId);assert.equal(claims.owner_id,linked.orgId);assert.equal(claims.environment,'development');
  assert(claims.exp*1000>Date.now()+60000,'Received an expired token');
  writeFileSync('.vercel/marketing-oidc-token',token+'\n',{mode:0o600});chmodSync('.vercel/marketing-oidc-token',0o600);
  console.log('Short-lived local OIDC token refreshed. Expires '+new Date(claims.exp*1000).toISOString()+'. No token value displayed.');
}catch{
  throw Error('OIDC refresh failed. Check your Vercel CLI login and the existing website project link. No credential values displayed.');
}finally{if(existsSync(snapshot))unlinkSync(snapshot);}
