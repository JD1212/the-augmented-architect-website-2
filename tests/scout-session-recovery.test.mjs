import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { scoutFixture } from './helpers/scout-fixture.mjs';
import { loadScoutModule } from './helpers/scout-loader.mjs';

const {fetchScoutSnapshot,submitScoutTurn}=loadScoutModule('src/lib/scout/transport.ts');
const {readScoutStream}=loadScoutModule('src/lib/scout/stream.ts');
const origin='http://localhost:3191';
function setup({acceptCookies=true,legacyPath='/api/scout'}={}) {
  const f=scoutFixture(),token='a'.repeat(43),hash=createHash('sha256').update(token).digest('hex');
  const jar=new Map([[legacyPath,token]]),requests=[];
  const {createScoutHandlers}=loadScoutModule('src/lib/scout/http.ts',{},f.cache);
  const h=createScoutHandlers(()=>f.service,()=>{});
  const request=async(_url,init={})=>{
    const method=init.method||'GET';requests.push({method,body:init.body});
    const cookies=[...jar].sort((a,b)=>b[0].length-a[0].length).map(([,value])=>'scout_session='+value).join('; ');
    const result=await h[method](new Request(origin+'/api/scout',{...init,headers:{...init.headers,origin,cookie:cookies}}));
    if(acceptCookies)for(const line of result.headers.getSetCookie()){
      const path=/; Path=([^;]+)/.exec(line)?.[1];const value=line.split(';')[0].split('=')[1];
      if(line.includes('Max-Age=0'))jar.delete(path);else jar.set(path,value);
    }
    return result;
  };
  return {f,jar,requests,request,token,hash};
}
async function seedLegacy(s) {
  const p=await s.f.service.prepare(s.hash,'An old conversation',randomUUID());await p.execute(new AbortController().signal,()=>{});
  s.f.conversations[0].expires_at=new Date(Date.parse(s.f.conversations[0].created_at)+7*86400000).toISOString();s.f.tick(25*3600000);
}
test('legacy seven-day narrow-path cookie is removed and welcome handshake establishes usable ownership',async()=>{
  const s=setup();await seedLegacy(s);const snapshot=await fetchScoutSnapshot(undefined,s.request);
  assert.equal(snapshot.messages.length,0);assert.equal(snapshot.sessionReset,false);assert.deepEqual([...s.jar.keys()],['/']);assert.notEqual(s.jar.get('/'),s.token);
  const r=await submitScoutTurn({id:randomUUID(),message:'hi'},new AbortController().signal,()=>{},s.request);const output=[];await readScoutStream(r,e=>output.push(e));assert.equal(output.at(-1).type,'done');assert.equal(s.f.model.calls,2);assert.equal(s.f.conversations.length,2);assert.equal(s.f.turns[0].user_message,'An old conversation');
});
test('expiration during submit recovers automatically once using the same draft and turn ID',async()=>{
  const s=setup({legacyPath:'/'});await seedLegacy(s);const turn={id:randomUUID(),message:'hi'};let resets=0;
  const r=await submitScoutTurn(turn,new AbortController().signal,()=>resets++,s.request);await r.text();
  const sends=s.requests.filter(r=>r.method==='POST').map(r=>JSON.parse(r.body));assert.deepEqual(sends.map(value=>({message:value.message,clientTurnId:value.clientTurnId})),[{message:'hi',clientTurnId:turn.id},{message:'hi',clientTurnId:turn.id}]);assert(sends[0].timezone);assert.equal(sends[0].timezone,sends[1].timezone);assert.equal(resets,1);assert.equal(r.status,200);assert.equal(s.f.conversations.length,2);assert.equal(s.f.model.calls,2);
});
test('ambiguous duplicate credentials never select either old owner',async()=>{
  const s=setup();await seedLegacy(s);s.jar.set('/','b'.repeat(43));const state=await fetchScoutSnapshot(undefined,s.request);
  assert.deepEqual(state.messages,[]);assert.equal(s.jar.size,1);assert.notEqual(s.jar.get('/'),s.token);assert.notEqual(s.jar.get('/'),'b'.repeat(43));assert.equal(s.f.conversations.length,1);
});
test('blocked cookies stop at a bounded actionable failure instead of repeated 410 resends',async()=>{
  const s=setup({acceptCookies:false});await seedLegacy(s);const turn={id:randomUUID(),message:'Keep this draft'};
  await assert.rejects(()=>submitScoutTurn(turn,new AbortController().signal,()=>{},s.request),/allow cookies/);
  assert.equal(s.requests.filter(r=>r.method==='POST').length,1);assert.equal(s.requests.filter(r=>r.method==='GET').length,2);assert.equal(s.f.model.calls,1);assert.equal(turn.message,'Keep this draft');
});
test('a second explicit reset stops rather than looping, and unrelated 401s are not retried',async()=>{
  let sends=0;const request=async(_url,init)=>init.method==='POST'?(sends++,Response.json({code:'scout_session_reset'},{status:410})):Response.json({messages:[],busy:false,failed:null,sessionReset:false});
  await assert.rejects(()=>submitScoutTurn({id:randomUUID(),message:'hi'},new AbortController().signal,()=>{},request),/secure session/);assert.equal(sends,2);
  let calls=0;await assert.rejects(()=>submitScoutTurn({id:randomUUID(),message:'hi'},new AbortController().signal,()=>{},async()=>{calls++;return Response.json({error:'Not an anonymous-session reset'},{status:401});}),/Not an anonymous/);assert.equal(calls,1);
});
