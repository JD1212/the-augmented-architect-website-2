import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadScoutModule } from './helpers/scout-loader.mjs';
import { scoutFixture } from './helpers/scout-fixture.mjs';
const { createScoutHandlers, createRequestLimiter } = loadScoutModule('src/lib/scout/http.ts');
const { scoutConfig } = loadScoutModule('src/lib/scout/config.ts');
const { readScoutStream } = loadScoutModule('src/lib/scout/stream.ts');
const origin = 'https://scout.example';
const tokenA = 'a'.repeat(43), tokenB = 'b'.repeat(43);
const cookieName = process.env.NODE_ENV === 'production' ? '__Host-scout_session' : 'scout_session';
const request = (method, token = tokenA, body, extra = {}) => new Request(origin + '/api/scout', {
  method, headers: { origin, cookie: `${cookieName}=${token}`, 'content-type': 'application/json', ...extra },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const post = (handlers, message = 'Tell me about AI', id = randomUUID(), token = tokenA) => handlers.POST(request('POST', token, { message, clientTurnId: id }));
const events = async response => { const list=[]; await readScoutStream(response, e=>list.push(e)); return list; };
const handlersFor = f => loadScoutModule('src/lib/scout/http.ts', {}, f.cache).createScoutHandlers(() => f.service, () => {});

test('opening the introduction issues an HttpOnly session but creates no database conversation', async () => {
  let calls = 0;
  const h = createScoutHandlers(() => { calls++; throw Error('Must not access database'); });
  const response = await h.GET(new Request(origin + '/api/scout'));
  assert.equal(response.status,200); assert.deepEqual((await response.json()).messages,[]);
  assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/); assert.equal(calls,0);
});
test('production session cookie is host-only and Secure', async () => {
  const previous = process.env.NODE_ENV; process.env.NODE_ENV='production';
  try {
    const r = await createScoutHandlers(()=>{throw Error();}).GET(new Request(origin+'/api/scout'));
    assert.match(r.headers.get('set-cookie'),/^__Host-scout_session=/);
    assert.match(r.headers.get('set-cookie'),/; Secure$/);
    assert.doesNotMatch(r.headers.get('set-cookie'),/Domain=/);
  } finally { if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous; }
});
test('required settings fail closed, require modern backend key, and reject other project URLs', () => {
  assert.throws(()=>scoutConfig({}),/not connected/);
  const env={OPENAI_API_KEY:'test-only',OPENAI_SCOUT_MODEL:'test-model',SUPABASE_URL:'https://cjldcaiybqguklzqtdjj.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_'};
  assert.equal(scoutConfig(env).model,'test-model');
  assert.throws(()=>scoutConfig({...env,SUPABASE_URL:'https://other.supabase.co'}),/unavailable/);
  assert.throws(()=>scoutConfig({...env,SUPABASE_SECRET_KEY:'legacy-key'}),/unavailable/);
  assert.throws(()=>scoutConfig({...env,OPENAI_SCOUT_MODEL:''}),/not connected/);
});
test('requests reject cross-site mutation, missing ownership, arbitrary conversation IDs, and invalid input', async () => {
  const f=scoutFixture(),h=handlersFor(f);
  assert.equal((await h.POST(request('POST',tokenA,{message:'hi',clientTurnId:randomUUID()},{origin:'https://attacker.example'}))).status,403);
  assert.equal((await h.POST(request('POST','invalid',{message:'hi',clientTurnId:randomUUID()}))).status,401);
  assert.equal((await h.POST(request('POST',tokenA,{message:'hi',clientTurnId:randomUUID(),conversationId:randomUUID()}))).status,400);
  assert.equal((await post(h,'x'.repeat(1001))).status,400);
  assert.equal((await post(h,' ')).status,400);
  assert.equal((await post(h,'hello','not-a-uuid')).status,400);
  assert.equal((await post(h,'x'.repeat(7000))).status,413);
  assert.equal(f.conversations.length,0);
});
test('a valid streamed reply persists once and restores on subsequent requests', async () => {
  const f=scoutFixture(),h=handlersFor(f); const r=await post(h);
  assert.equal(r.status,200); assert.match(r.headers.get('content-type'),/ndjson/);
  const output=await events(r);assert.equal(output.filter(e=>e.type==='delta').length,2);assert.equal(output.at(-1).type,'done');
  const restored=await (await h.GET(request('GET'))).json();
  assert.equal(restored.messages.length,2);assert.equal(restored.messages[1].content,'We can help you connect your business systems.');
  assert.equal(f.conversations.length,1);assert.equal(f.turns.length,1);assert.equal(f.turns[0].status,'completed');
  assert.equal(f.conversations[0].session_token_hash.length,64);assert.notEqual(f.conversations[0].session_token_hash,tokenA);
});
test('separate anonymous sessions cannot read or reset another conversation', async () => {
  const f=scoutFixture(),h=handlersFor(f);await events(await post(h));
  const outsider=await (await h.GET(request('GET',tokenB))).json();assert.deepEqual(outsider.messages,[]);
  await h.DELETE(request('DELETE',tokenB));assert.equal(f.conversations[0].status,'active');
  await events(await post(h,'Another visitor',randomUUID(),tokenB));assert.equal(f.conversations.length,2);
  const restored=await (await h.GET(request('GET',tokenA))).json();assert.equal(restored.messages[0].content,'Tell me about AI');
});
test('completed retries replay the persisted answer without a second model execution', async () => {
  const f=scoutFixture(),h=handlersFor(f),id=randomUUID();
  await events(await post(h,'Hello',id));const replay=await events(await post(h,'Hello',id));
  assert.equal(replay.length,1);assert.equal(replay[0].type,'done');assert.equal(f.model.calls,1);assert.equal(f.turns.length,1);
  assert.equal((await post(h,'Changed payload',id)).status,409);
});
test('pending execution blocks overlapping sends across request instances', async () => {
  const f=scoutFixture();const p=await f.service.prepare('owner','First',randomUUID());
  await assert.rejects(()=>f.service.prepare('owner','Second',randomUUID()),e=>e.status===409);
  const restored=await f.service.restore('owner');assert.equal(restored.busy,true);
  await p.execute(new AbortController().signal,()=>{});assert.equal(f.model.calls,1);
});
test('simultaneous first sends rely on the unique turn slot, not process-local locks', async () => {
  const f=scoutFixture();const results=await Promise.allSettled([f.service.prepare('owner','First',randomUUID()),f.service.prepare('owner','Second',randomUUID())]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.turns.length,1);
});
test('failed streaming retries reuse the same row and never return private provider errors', async () => {
  const f=scoutFixture(),h=handlersFor(f),id=randomUUID();f.model.fail=true;
  const failed=await events(await post(h,'Help me',id));assert.equal(failed.at(-1).type,'error');
  assert.doesNotMatch(JSON.stringify(failed),/PRIVATE_PROVIDER_DIAGNOSTIC/);
  assert.equal(f.turns[0].status,'failed');assert.equal(f.turns[0].assistant_message,null);
  f.model.fail=false;const retried=await events(await post(h,'Help me',id));assert.equal(retried.at(-1).type,'done');
  assert.equal(f.turns.length,1);assert.equal(f.turns[0].agent_state.attempts,2);
});
test('abandoned execution expires, but a fresh retry does not inherit the original lease age', async () => {
  const f=scoutFixture(),id=randomUUID();await f.service.prepare('owner','Help',id);f.tick(121000);
  assert.equal((await f.service.restore('owner')).failed.id,id);
  await f.service.prepare('owner','Help',id);assert.equal((await f.service.restore('owner')).busy,true);
});
test('new conversation closes the old one, rotates the cookie, and waits for another message to create a row', async () => {
  const f=scoutFixture(),h=handlersFor(f);await events(await post(h));
  const reset=await h.DELETE(request('DELETE'));assert.equal(reset.status,200);assert.match(reset.headers.get('set-cookie'),/HttpOnly/);
  assert.equal(f.conversations.length,1);assert.equal(f.conversations[0].status,'closed');
  const cookie=reset.headers.get('set-cookie').split(';')[0].split('=')[1];assert.notEqual(cookie,tokenA);
  assert.deepEqual((await (await h.GET(request('GET',cookie))).json()).messages,[]);
  await events(await post(h,'New topic',randomUUID(),cookie));assert.equal(f.conversations.length,2);
});
test('model access is checked before conversation creation, and expired sessions do not execute', async () => {
  const f=scoutFixture(),h=handlersFor(f);f.model.unavailable=true;
  assert.equal((await post(h)).status,503);assert.equal(f.conversations.length,0);
  f.model.unavailable=false;await events(await post(h));f.tick(8*86400000);
  assert.equal((await post(h)).status,410);assert.equal(f.model.calls,1);
});
test('persistent conversation caps and bounded retries apply', async () => {
  const f=scoutFixture();for(let i=0;i<20;i++){const p=await f.service.prepare('owner','Message '+i,randomUUID());await p.execute(new AbortController().signal,()=>{});}
  await assert.rejects(()=>f.service.prepare('owner','Limit',randomUUID()),e=>e.status===429);
  const g=scoutFixture();g.model.fail=true;const id=randomUUID();for(let i=0;i<3;i++){const p=await g.service.prepare('owner','Retry',id);await p.execute(new AbortController().signal,()=>{});}
  await assert.rejects(()=>g.service.prepare('owner','Retry',id),e=>e.status===429);
});
test('request limiter rejects bursts and recovers after its time window', () => {
  let now=0;const limit=createRequestLimiter(()=>now);const r=request('GET');
  limit(r,'test',2,1000);limit(r,'test',2,1000);assert.throws(()=>limit(r,'test',2,1000),e=>e.status===429);now=1001;limit(r,'test',2,1000);
});
test('approved knowledge covers all three offerings, limitations, shared context and off-topic boundaries', () => {
  const {scoutInstructions,scoutKnowledge}=loadScoutModule('src/lib/scout/knowledge.ts');
  assert.match(scoutInstructions,/\$10,000/);assert.match(scoutInstructions,/separately scoped/);assert.match(scoutInstructions,/Politely redirect unrelated/);
  assert.match(scoutInstructions,/cannot check calendars, book appointments, save leads, submit requests/);
  assert.match(JSON.stringify(scoutKnowledge),/Architecture Command Center/);assert.match(JSON.stringify(scoutKnowledge),/shared|memory/i);
  assert.equal(scoutKnowledge.applications.package.capabilities.length,3);assert.equal(scoutKnowledge.applications.faqs.items.length,8);
});
test('mocked on-topic and off-topic replies flow through the same conversational path', async () => {
  for(const [question,answer] of [
    ['What about Salesforce?','We assess Salesforce automation and modernize incrementally.'],
    ['What does a custom application cost?','Implementation starts at $10,000 for a defined scope; custom AI agents and additional integrations are scoped separately.'],
    ['Can AI help my company?','We start with your business processes, identity and shared context.'],
    ['Write my school essay','I can help with our consulting services. What business process would you like to improve?'],
  ]){const f=scoutFixture(answer),h=handlersFor(f);const result=await events(await post(h,question));assert.equal(result.at(-1).messages[1].content,answer);assert.equal(f.inputs[0][0].content,question);}
});
test('stream framing preserves split UTF-8 and rejects interrupted replies', async () => {
  const bytes=new TextEncoder().encode(JSON.stringify({type:'delta',text:'Hello — 👋'})+'\n'+JSON.stringify({type:'done',messages:[]})+'\n');
  const stream=new ReadableStream({start(c){for(const byte of bytes)c.enqueue(Uint8Array.of(byte));c.close();}});
  const output=await events(new Response(stream));assert.equal(output[0].text,'Hello — 👋');
  await assert.rejects(()=>events(new Response('{"type":"delta","text":"partial"}\n')),/Incomplete/);
});
