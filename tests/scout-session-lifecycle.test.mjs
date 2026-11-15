import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { scoutFixture } from './helpers/scout-fixture.mjs';
import { loadScoutModule } from './helpers/scout-loader.mjs';

const hour = 3600000;
async function exchange(f, owner = 'owner', message = 'Tell me about our project') {
  const turn = await f.service.prepare(owner, message, randomUUID());
  await turn.execute(new AbortController().signal, () => {});
}

test('new anonymous conversations receive a 24-hour inactivity window', async () => {
  const f=scoutFixture();await exchange(f);
  const state=await f.service.restore('owner');
  assert.equal(state.messages.length,2);assert.equal(state.expiresInMs,24*hour);
  assert.equal(Date.parse(f.conversations[0].expires_at)-Date.parse(f.conversations[0].last_activity_at),24*hour);
});
test('return visits and refresh snapshots preserve history without renewing inactivity', async () => {
  const f=scoutFixture();await exchange(f);const deadline=f.conversations[0].expires_at;
  f.tick(23*hour);
  for(let i=0;i<3;i++){const state=await f.service.restore('owner');assert.equal(state.messages.length,2);assert.equal(state.expiresInMs,hour);}
  assert.equal(f.conversations[0].expires_at,deadline);
  f.tick(hour);await assert.rejects(()=>f.service.restore('owner'),e=>e.status===410);
  assert.equal(f.conversations.length,1);assert.equal(f.turns.length,1);
});
test('a new conversation turn renews the deadline across multiple days of activity', async () => {
  const f=scoutFixture();await exchange(f);f.tick(23*hour);await exchange(f);
  assert.equal((await f.service.restore('owner')).expiresInMs,24*hour);
  f.tick(23*hour);assert.equal((await f.service.restore('owner')).messages.length,4);
  f.tick(hour);await assert.rejects(()=>f.service.restore('owner'),e=>e.status===410);
});
test('legacy seven-day rows respect last activity plus 24 hours without a data migration', async () => {
  const f=scoutFixture();await exchange(f);
  f.conversations[0].expires_at=new Date(Date.parse(f.conversations[0].created_at)+7*24*hour).toISOString();
  f.tick(24*hour);await assert.rejects(()=>f.service.restore('owner'),e=>e.status===410);
  assert.equal(f.conversations[0].status,'active');assert.equal(f.turns.length,1);
});
test('replaying a completed client turn never renews inactivity or executes again', async () => {
  const f=scoutFixture(),id=randomUUID();const prepared=await f.service.prepare('owner','A project question',id);await prepared.execute(new AbortController().signal,()=>{});
  f.tick(23*hour);const replay=await f.service.prepare('owner','A project question',id);
  assert.equal(replay.expiresInMs,hour);assert.equal(replay.execute,null);assert.equal(f.model.calls,1);
  f.tick(hour);await assert.rejects(()=>f.service.prepare('owner','A project question',id),e=>e.status===410);
});
test('expired GET rotates ownership and returns a fresh welcome without deleting records', async () => {
  const f=scoutFixture(),token='a'.repeat(43),hash=createHash('sha256').update(token).digest('hex');await exchange(f,hash);
  const {createScoutHandlers}=loadScoutModule('src/lib/scout/http.ts',{},f.cache);const h=createScoutHandlers(()=>f.service,()=>{});
  const cookieName=process.env.NODE_ENV==='production'?'__Host-scout_session':'scout_session';
  const request=()=>new Request('https://scout.example/api/scout',{headers:{cookie:`${cookieName}=${token}`}});
  const before=await h.GET(request());assert.equal(before.headers.has('set-cookie'),false);
  f.tick(24*hour);const expired=await h.GET(request());assert.equal(expired.status,200);
  assert.deepEqual(await expired.json(),{messages:[],busy:false,failed:null,expiresInMs:null,sessionReset:true});
  const rotated=expired.headers.get('set-cookie');assert.match(rotated,/Max-Age=86400/);assert.match(rotated,/HttpOnly/);assert.equal(rotated.includes(token),false);
  assert.equal(f.conversations.length,1);assert.equal(f.turns.length,1);
});
test('expired sends do not execute, reuse another owner, or silently create a new conversation', async () => {
  const f=scoutFixture(),token='a'.repeat(43),hash=createHash('sha256').update(token).digest('hex');await exchange(f,hash);await exchange(f,'different-owner');f.tick(24*hour);
  const {createScoutHandlers}=loadScoutModule('src/lib/scout/http.ts',{},f.cache);const h=createScoutHandlers(()=>f.service,()=>{});
  const cookieName=process.env.NODE_ENV==='production'?'__Host-scout_session':'scout_session';
  const response=await h.POST(new Request('https://scout.example/api/scout',{method:'POST',headers:{origin:'https://scout.example',cookie:`${cookieName}=${token}`,'content-type':'application/json'},body:JSON.stringify({message:'A new typed message',clientTurnId:randomUUID()})}));
  assert.equal(response.status,410);assert.ok(response.headers.get('set-cookie'));assert.equal(f.model.calls,2);assert.equal(f.conversations.length,2);assert.equal(f.turns.length,2);
});
test('New Conversation still archives rather than deleting previous records', async () => {
  const f=scoutFixture();await exchange(f);await f.service.reset('owner');
  assert.equal(f.conversations[0].status,'closed');assert.equal(f.turns.length,1);
  await exchange(f,'fresh-owner');assert.equal(f.conversations.length,2);assert.equal(f.turns.length,2);
});

test('a browser-expired or missing cookie gets fresh ownership without creating records', async () => {
  const f=scoutFixture();const {createScoutHandlers}=loadScoutModule('src/lib/scout/http.ts',{},f.cache);const h=createScoutHandlers(()=>f.service,()=>{});
  const response=await h.POST(new Request('https://scout.example/api/scout',{method:'POST',headers:{origin:'https://scout.example','content-type':'application/json'},body:JSON.stringify({message:'First message after a long idle period',clientTurnId:randomUUID()})}));
  assert.equal(response.status,401);assert.match(response.headers.get('set-cookie'),/Max-Age=86400/);assert.equal(f.conversations.length,0);assert.equal(f.model.calls,0);
});
