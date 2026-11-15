import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScoutModule } from './helpers/scout-loader.mjs';

test('shared limiter uses a keyed IP digest, fixed actions, and fails closed', async () => {
  const previous=process.env.VERCEL;process.env.VERCEL='1';
  const calls=[];let allowed=true,failed=false;
  const {createSharedRequestLimiter}=loadScoutModule('src/lib/scout/request-limits.ts',{
    './store':{createScoutDatabase:()=>({rpc:async(name,input)=>{calls.push({name,input});return {data:allowed,error:failed?{message:'private database details'}:null};}})},
    './config':{scoutDatabaseConfig:()=>({secret:'test-only-key'})},
  });
  try {
    const limit=createSharedRequestLimiter(),request=new Request('https://scout.example/api/scout',{headers:{'x-vercel-forwarded-for':'192.0.2.10'}});
    await limit(request,'send');await limit(request,'read');
    assert.equal(calls[0].name,'scout_consume_request_limit');assert.match(calls[0].input.p_key_hash,/^[0-9a-f]{64}$/);
    assert.equal(calls[0].input.p_key_hash,calls[1].input.p_key_hash);assert.equal(calls[0].input.p_action,'send');
    assert.doesNotMatch(JSON.stringify(calls),/192\.0\.2\.10/);
    allowed=false;await assert.rejects(()=>limit(request,'send'),e=>e.status===429);
    failed=true;await assert.rejects(()=>limit(request,'send'),e=>e.status===503&&!e.message.includes('private database'));
    await assert.rejects(()=>limit(new Request('https://scout.example/api/scout'),'send'),e=>e.status===503);
  } finally {if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous;}
});
