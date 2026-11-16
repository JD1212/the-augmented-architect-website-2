import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID,createHash} from 'node:crypto';import {RunContext} from '@openai/agents';import {loadScoutModule} from './helpers/scout-loader.mjs';import {schedulingFixture} from './helpers/scheduling-fixture.mjs';
test('validated visitor timezone is display context and does not change session ownership',async()=>{
 const seen=[];const {createScoutHandlers}=loadScoutModule('src/lib/scout/http.ts',{'@/lib/booking/scheduling-server':{schedulingEnabled:()=>false}});
 const h=createScoutHandlers(()=>({async prepare(...args){seen.push(args);return {replay:[],expiresInMs:null};}}),async()=>{}),origin='http://website.invalid',token='x'.repeat(43);
 const send=timezone=>h.POST(new Request(origin+'/api/scout',{method:'POST',headers:{origin,cookie:'scout_session='+token,'content-type':'application/json'},body:JSON.stringify({message:'When are appointments available?',clientTurnId:randomUUID(),timezone})}));
 assert.equal((await send('America/Los_Angeles')).status,200);assert.equal((await send('Asia/Tokyo')).status,200);assert.equal(seen[0][0],createHash('sha256').update(token).digest('hex'));assert.equal(seen[0][0],seen[1][0]);assert.equal(seen[0][3],'America/Los_Angeles');assert.equal(seen[1][3],'Asia/Tokyo');assert.equal((await send('Unknown/Timezone')).status,400);assert.equal(seen.length,2);
});
test('native tool adds visitor-local labels without changing slots or performing appointment actions',async()=>{
 const f=schedulingFixture(),{createSchedulingTools}=loadScoutModule('src/lib/scout/scheduling-tools.ts'),tool=createSchedulingTools(f.service).find(t=>t.name==='check_consultation_availability');
 const r=await tool.invoke(new RunContext({ownerHash:'owner',visitorTimezone:'Asia/Tokyo',signal:new AbortController().signal}),JSON.stringify({date:'2026-11-16',timezone:'Asia/Tokyo',appointmentId:null}));
 assert.equal(r.slots[0].start,'2026-11-16T14:00:00.000Z');assert.match(r.slots[0].display.start,/11:00 PM/);assert.match(r.slots[0].display.timezone,/Japan/);assert.equal(f.booking.creates,0);
});
