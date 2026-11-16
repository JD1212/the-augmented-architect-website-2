import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadScoutModule} from './helpers/scout-loader.mjs';
const {parseBooking}=loadScoutModule('src/lib/booking/types.ts');
const {candidateSlots,availableSlots,validatePolicy,localParts}=loadScoutModule('src/lib/booking/policy.ts');
import {bookingFixture as fixture} from './helpers/booking-fixture.mjs';
const {createBookingHandlers}=loadScoutModule('src/lib/booking/http.ts');
const {bookingConfig}=loadScoutModule('src/lib/booking/config.ts');
const {createGoogleCalendar,calendarEventId}=loadScoutModule('src/lib/booking/calendar.ts');
const policy={timezone:'America/New_York',hours:{1:[['09:00','17:00']]},bufferMinutes:15,noticeMinutes:120,horizonDays:30};
const now=Date.parse('2026-11-15T12:00:00Z');
const input=()=>({requestId:randomUUID(),name:'Test Visitor',email:'visitor@example.invalid',description:'Test project',timezone:'America/Costa_Rica',start:'2026-11-16T14:00:00.000Z',confirmed:true});
test('booking rejects invalid names, emails, dates, timezone and absent explicit confirmation',()=>{
 for(const change of [{name:'  '},{name:'Injected\nname'},{email:'not-an-email'},{email:'x\r\n@example.invalid'},{start:'yesterday'},{timezone:'not/a-zone'},{confirmed:false},{description:'x'.repeat(4001)},{extra:'unexpected'}])assert.throws(()=>parseBooking({...input(),...change}));
 assert.equal(parseBooking({...input(),email:' Visitor@Example.Invalid '}).email,'visitor@example.invalid');
});
test('configuration fails closed until credentials, hours, timezone and explicit enable flag exist',()=>{
 assert.throws(()=>bookingConfig({}),e=>e.status===503);assert.throws(()=>bookingConfig({CONSULTATION_BOOKING_ENABLED:'true'}),e=>e.status===503);
});
test('30-minute slots obey hours, notice, horizon, business timezone and buffer',()=>{
 const slots=candidateSlots('2026-11-16',validatePolicy(policy),now);assert.equal(slots[0].start,'2026-11-16T14:00:00.000Z');assert.equal(slots[1].start,'2026-11-16T14:15:00.000Z');assert(slots.every(s=>Date.parse(s.end)-Date.parse(s.start)===1800000));assert.equal(candidateSlots('2026-11-14',policy,now).length,0);assert.equal(candidateSlots('2027-02-01',policy,now).length,0);assert.throws(()=>candidateSlots('2026-02-30',policy,now));
 assert.equal(localParts(Date.parse(slots[0].start),'America/Costa_Rica').time,'08:00');
 assert.equal(availableSlots(slots,[{start:'2026-11-16T13:50:00Z',end:'2026-11-16T14:01:00Z'}],15)[0].start,slots[2].start);
});
test('DST missing times are skipped and repeated times have distinct instants',()=>{
 const p={...policy,hours:{0:[['00:00','04:00']]},bufferMinutes:0};
 const spring=candidateSlots('2027-03-14',p,Date.parse('2027-03-13T00:00:00Z'));assert(spring.every(s=>localParts(Date.parse(s.start),p.timezone).time.slice(0,2)!=='02'));
 const fall=candidateSlots('2026-11-01',p,Date.parse('2026-10-31T00:00:00Z'));const repeated=fall.filter(s=>localParts(Date.parse(s.start),p.timezone).time==='01:00');assert.equal(repeated.length,2);assert.notEqual(repeated[0].start,repeated[1].start);
});
test('availability returns only real free times, hides stored reservations and fails on calendar failure',async()=>{
 const f=fixture();f.busy=[{start:'2026-11-16T14:00:00Z',end:'2026-11-16T14:30:00Z'}];const slots=await f.service.availability('2026-11-16');assert(!slots.some(s=>s.start==='2026-11-16T14:00:00.000Z'));f.calendarFailure=true;await assert.rejects(()=>f.service.availability('2026-11-16'));
});
test('confirmed booking requires calendar event, Meet link, lead association and persistence',async()=>{
 const f=fixture(),i=input();const r=await f.service.book(i,'owner');assert.equal(r.status,'confirmed');assert.equal(r.meetUrl,'https://meet.google.com/abc-defg-hij');assert.equal(f.records.size,1);assert.equal(f.leads.size,1);assert.equal(f.creates,1);
 assert.deepEqual(await f.service.book(i,'owner'),r);assert.equal(f.creates,1);assert.equal(f.leads.size,1);
});
test('simultaneous duplicate submissions acquire only one execution lease',async()=>{
 const f=fixture(),i=input();const r=await Promise.all([f.service.book(i,'owner'),f.service.book(i,'owner')]);assert(r.some(r=>r.status==='confirmed'));assert.equal(f.creates,1);assert.equal(f.records.size,1);
});
test('calendar conflicts are checked again immediately before insertion',async()=>{
 const f=fixture();f.busy=[{start:'2026-11-16T14:00:00Z',end:'2026-11-16T14:30:00Z'}];await assert.rejects(()=>f.service.book(input(),'owner'),e=>e.status===409&&e.code==='slot_unavailable');assert.equal(f.creates,0);
});
test('storage failure before reservation never creates a calendar event',async()=>{
 const f=fixture();f.failReserve=true;await assert.rejects(()=>f.service.book(input(),'owner'));assert.equal(f.creates,0);
});
test('calendar failures never pretend success and retry the same reservation safely',async()=>{
 const f=fixture(),i=input();f.failCreate=true;assert.equal((await f.service.book(i,'owner')).status,'pending');f.failCreate=false;assert.equal((await f.service.book(i,'owner')).status,'confirmed');assert.equal(f.creates,1);assert.equal(f.leads.size,1);
});
test('lost event-create response reconciles the same event without creating another',async()=>{
 const f=fixture(),i=input();f.loseReply=true;assert.equal((await f.service.book(i,'owner')).status,'pending');assert.equal(f.creates,1);assert.equal((await f.service.book(i,'owner')).status,'confirmed');assert.equal(f.creates,1);
});
test('database failure after Google success is not reported as confirmed until reconciled',async()=>{
 const f=fixture(),i=input();f.failFinish=true;assert.equal((await f.service.book(i,'owner')).status,'pending');assert.equal(f.events.size,1);assert.equal((await f.service.book(i,'owner')).status,'confirmed');assert.equal(f.creates,1);
});
test('pending Meet conference generation stays pending until a real Meet link exists',async()=>{
 const f=fixture(),i=input();f.meetPending=true;assert.equal((await f.service.book(i,'owner')).status,'pending');f.events.values().next().value.conferenceData.entryPoints=[{entryPointType:'video',uri:'https://meet.google.com/abc-defg-hij'}];assert.equal((await f.service.book(i,'owner')).status,'confirmed');assert.equal(f.creates,1);
});
test('idempotency references cannot be reused with changed details',async()=>{
 const f=fixture(),i=input();await f.service.book(i,'owner');await assert.rejects(()=>f.service.book({...i,description:'Changed'},'owner'),e=>e.status===409&&e.code==='request_mismatch');assert.equal(f.creates,1);
});
test('HTTP uses an independent HttpOnly cookie, same-origin enforcement and explicit confirmation',async()=>{
 const f=fixture(),h=createBookingHandlers(()=>({service:f.service,policy}),async()=>{}),origin='https://website.example';
 const response=await h.GET(new Request(origin+'/api/booking'));assert.equal(response.status,200);const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert(!cookie.includes('scout_session='));
 const denied=await h.POST(new Request(origin+'/api/booking',{method:'POST',headers:{origin:'https://elsewhere.example','content-type':'application/json'},body:JSON.stringify(input())}));assert.equal(denied.status,403);
 const missing=await h.POST(new Request(origin+'/api/booking',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(input())}));assert.equal(missing.status,401);
 const invalid=await h.POST(new Request(origin+'/api/booking',{method:'POST',headers:{origin,cookie:cookie.split(';')[0],'content-type':'application/json'},body:JSON.stringify({...input(),confirmed:false})}));assert.equal(invalid.status,400);assert.equal(f.creates,0);
});
test('Google adapter uses freeBusy, attendee invitation, deterministic event ID and Meet creation',async()=>{
 const requests=[];const config={clientId:'fixture',clientSecret:'fixture',refreshToken:'fixture',calendarId:'business@example.invalid',policy};
 const request=async(url,init)=>{requests.push({url,init});if(url.includes('oauth2'))return Response.json({access_token:'fixture-token',expires_in:3600});if(url.endsWith('freeBusy'))return Response.json({calendars:{[config.calendarId]:{busy:[]}}});return Response.json({id:'event'});};
 const c=createGoogleCalendar(config,request);await c.busy('2026-11-16T00:00:00Z','2026-11-17T00:00:00Z');const i=input();await c.create(calendarEventId(config.calendarId,i.requestId),i,'2026-11-16T14:30:00Z','fingerprint');const sent=requests.at(-1);assert(sent.url.includes('conferenceDataVersion=1&sendUpdates=all'));const payload=JSON.parse(sent.init.body);assert.equal(payload.attendees[0].email,i.email);assert.equal(payload.conferenceData.createRequest.conferenceSolutionKey.type,'hangoutsMeet');assert.equal(requests.filter(r=>r.url.includes('oauth2')).length,1);
});

test('approved Costa Rica schedule is weekdays 10–16, no weekends, last call finishes at 16',()=>{
 const {consultationSettings}=loadScoutModule('src/lib/booking/settings.ts');const p=consultationSettings.policy;
 assert.equal(consultationSettings.calendarId,'jd@theaugmentedarchitect.com');assert.equal(p.timezone,'America/Costa_Rica');assert.equal(p.bufferMinutes,15);
 for(const date of ['2026-11-16','2026-11-17','2026-11-18','2026-11-19','2026-11-20']){const slots=candidateSlots(date,p,now);assert.equal(slots.length,4);assert.equal(localParts(Date.parse(slots[0].start),p.timezone).time,'10:00');assert.equal(localParts(Date.parse(slots.at(-1).start),p.timezone).time,'15:00');assert(slots.every(s=>localParts(Date.parse(s.end),p.timezone).time<='16:00'));}
 for(const date of ['2026-11-21','2026-11-22'])assert.equal(candidateSlots(date,p,now).length,0);
 const slots=candidateSlots('2026-11-16',p,now),busy=[slots[0]];const free=availableSlots(slots,busy,15);assert.equal(localParts(Date.parse(free[0].start),p.timezone).time,'11:30');
});

test('a reservation from another booking owner never exposes its confirmation',async()=>{
 const f=fixture(),i=input();await f.service.book(i,'first-owner');await assert.rejects(()=>f.service.book(i,'different-owner'),e=>e.status===409&&e.code==='request_mismatch');assert.equal(f.creates,1);
});
test('two different requests cannot reserve an overlapping appointment',async()=>{
 const f=fixture();const results=await Promise.allSettled([f.service.book(input(),'first-owner'),f.service.book(input(),'second-owner')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.events.size,1);assert.equal(f.records.size,1);
});
test('per-calendar freebusy errors fail closed rather than inventing empty availability',async()=>{
 const config={clientId:'fixture',clientSecret:'fixture',refreshToken:'fixture',calendarId:'business@example.invalid',policy};const calendar=createGoogleCalendar(config,async url=>url.includes('oauth2')?Response.json({access_token:'fixture-token',expires_in:3600}):Response.json({calendars:{[config.calendarId]:{errors:[{reason:'forbidden'}]}}}));await assert.rejects(()=>calendar.busy('2026-11-16T00:00:00Z','2026-11-17T00:00:00Z'),e=>e.status===503);
});
