import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Agent,Runner,OpenAIProvider,RunContext} from '@openai/agents';
import OpenAI from 'openai';
import {loadScoutModule} from './helpers/scout-loader.mjs';
import {bookingFixture} from './helpers/booking-fixture.mjs';
const {createAppointmentVerification}=loadScoutModule('src/lib/booking/verification.ts');
const {createSchedulingService}=loadScoutModule('src/lib/booking/scheduling.ts');
const {createSchedulingTools}=loadScoutModule('src/lib/scout/scheduling-tools.ts');
const {loadSchedulingSkill}=loadScoutModule('src/lib/scout/scheduling-skill.ts');
const {createAppointmentManagement}=loadScoutModule('src/lib/booking/management.ts');
const {createGmailVerification}=loadScoutModule('src/lib/booking/gmail.ts');
const {candidateSlots,localParts}=loadScoutModule('src/lib/booking/policy.ts');
const {consultationSettings}=loadScoutModule('src/lib/booking/settings.ts');
function fixture(){
 const records=new Map(),sent=[];let now=Date.parse('2026-11-15T12:00:00Z');
 const state={async get(key,owner){const r=records.get(key);return r?.owner_hash===owner?structuredClone(r):null;},async list(owner,kind){return [...records.values()].filter(r=>r.owner_hash===owner&&r.kind===kind).map(r=>structuredClone(r));},async insert(r){if(records.has(r.key))return false;records.set(r.key,structuredClone(r));return true;},async replace(old,payload){const r=records.get(old.key);if(!r||r.version!==old.version||r.owner_hash!==old.owner_hash)return false;records.set(r.key,{...r,payload:structuredClone(payload),version:r.version+1});return true;}};
 const mail={async send(email,code){sent.push({email,code});}},verification=createAppointmentVerification(state,mail,'fixture-secret',()=>now),booking=bookingFixture();
 const appointments=[{id:randomUUID(),start:'2026-11-16T14:00:00.000Z',end:'2026-11-16T14:30:00.000Z',timezone:'America/New_York',state:'confirmed'}];let changes=0;
 const management={async appointments(email){return email==='visitor@example.invalid'?appointments:[];},async execute(id,owner,email,appointment,kind,start){assert.equal(email,'visitor@example.invalid');if(kind==='cancel')assert.equal(start,null);changes++;return {status:'completed',action:kind,start};}};
 const service=createSchedulingService(state,booking.service,verification,management,()=>now);
 return {state,records,sent,mail,verification,booking,service,appointments,get changes(){return changes;},advance(ms){now+=ms;}};
}
const input={name:'Visitor',email:'visitor@example.invalid',start:'2026-11-16T14:00:00.000Z',timezone:'America/New_York',description:'Fixture project'};
async function verified(f,owner='owner'){await f.verification.request(owner,'visitor@example.invalid');await f.verification.verify(owner,f.sent.at(-1).code);}
test('seven native SDK tools have schemas; scheduling skill is explicitly loaded',()=>{
 const tools=createSchedulingTools(fixture().service);assert.deepEqual(tools.map(t=>t.name),['check_consultation_availability','prepare_consultation_booking','confirm_consultation_booking','request_appointment_verification','get_verified_appointments','cancel_consultation','reschedule_consultation']);assert(tools.every(t=>t.type==='function'&&t.parameters.additionalProperties===false));assert.match(loadSchedulingSkill(),/name: consultation-scheduling/);assert.match(loadSchedulingSkill(),/Textual assent does not authorize/);
});
test('proposals never book before secure control approval; foreign owners and model claims cannot authorize',async()=>{
 const f=fixture(),p=await f.service.prepareBooking('owner',input);assert.equal(f.booking.creates,0);assert.equal((await f.service.confirmBooking('owner',p.id)).status,'confirmation_required');await assert.rejects(()=>f.service.approve('attacker',p.id));await f.service.approve('owner',p.id);const result=await f.service.confirmBooking('owner',p.id);assert.equal(result.status,'confirmed');assert(result.meetUrl);assert.equal(f.booking.creates,1);assert.equal((await f.service.confirmBooking('owner',p.id)).status,'confirmed');assert.equal(f.booking.creates,1);
});
test('expired proposal cannot be approved; invalid or unavailable slots never create events',async()=>{
 const f=fixture(),p=await f.service.prepareBooking('owner',input);f.advance(600001);await assert.rejects(()=>f.service.approve('owner',p.id));await assert.rejects(()=>f.service.prepareBooking('owner',{...input,start:'2026-11-16T14:01:00.000Z'}));assert.equal(f.booking.creates,0);
});
test('six-digit email verification is private, single-use, owner-bound and time-limited',async()=>{
 const f=fixture();await f.verification.request('owner','visitor@example.invalid');const code=f.sent[0].code;assert.match(code,/^\d{6}$/);assert(!JSON.stringify([...f.records.values()]).includes('"'+code+'"'));await assert.rejects(()=>f.verification.email('owner'));await assert.rejects(()=>f.verification.verify('other',code));await assert.rejects(()=>f.verification.blockCodeInChat('owner','My code is '+code));await f.verification.verify('owner',code);assert.equal(await f.verification.email('owner'),'visitor@example.invalid');await assert.rejects(()=>f.verification.verify('owner',code));f.advance(15*60000+1);await assert.rejects(()=>f.verification.email('owner'));
});
test('incorrect, exhausted, expired, concurrent and reused codes fail closed',async()=>{
 const f=fixture();await f.verification.request('owner','visitor@example.invalid');const code=f.sent[0].code,wrong=code==='000000'?'111111':'000000';for(let n=0;n<5;n++)await assert.rejects(()=>f.verification.verify('owner',wrong));await assert.rejects(()=>f.verification.verify('owner',code));
 const g=fixture();await g.verification.request('owner','visitor@example.invalid');g.advance(600001);await assert.rejects(()=>g.verification.verify('owner',g.sent[0].code));
 const h=fixture();await h.verification.request('owner','visitor@example.invalid');const results=await Promise.allSettled([h.verification.verify('owner',h.sent[0].code),h.verification.verify('owner',h.sent[0].code)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
});
test('issuance is limited per owner and per email across independent sessions',async()=>{
 const f=fixture();for(let i=0;i<3;i++)await f.verification.request('owner-'+i,'visitor@example.invalid');await assert.rejects(()=>f.verification.request('attacker','visitor@example.invalid'),e=>e.status===429);assert.equal(f.sent.length,3);
 const g=fixture();for(let i=0;i<3;i++)await g.verification.request('owner',`visitor${i}@example.invalid`);await assert.rejects(()=>g.verification.request('owner','different@example.invalid'),e=>e.status===429);
});
test('failed email delivery does not claim success or grant identity; empty and populated addresses have same pre-verification result',async()=>{
 const f=fixture();f.mail.send=async()=>{throw Error('provider private details');};await assert.rejects(()=>f.verification.request('owner','visitor@example.invalid'),e=>!e.message.includes('private details'));assert.equal(await f.verification.pending('owner'),false);await assert.rejects(()=>f.verification.email('owner'));
 const g=fixture();assert.deepEqual(await g.verification.request('a','visitor@example.invalid'),await g.verification.request('b','nobody@example.invalid'));
});
test('cancel and reschedule require verified email plus an exact UI-approved proposal',async()=>{
 const f=fixture();await assert.rejects(()=>f.service.appointments('owner'));await assert.rejects(()=>f.service.change('owner','cancel',f.appointments[0].id,null,null));await verified(f);const list=await f.service.appointments('owner');assert.equal(list.length,1);assert(!JSON.stringify(list).includes('email'));await assert.rejects(()=>f.service.change('owner','cancel',randomUUID(),null,null));
 const p=await f.service.change('owner','cancel',list[0].id,null,null);assert.equal((await f.service.change('owner','cancel',list[0].id,null,p.proposal.id)).status,'confirmation_required');assert.equal(f.changes,0);await f.service.approve('owner',p.proposal.id);assert.equal((await f.service.change('owner','cancel',list[0].id,null,p.proposal.id)).status,'completed');assert.equal(f.changes,1);await f.service.change('owner','cancel',list[0].id,null,p.proposal.id);assert.equal(f.changes,1);
 const r=await f.service.change('owner','reschedule',list[0].id,'2026-11-16T15:30:00.000Z',null);await f.service.approve('owner',r.proposal.id);await f.service.change('owner','reschedule',list[0].id,null,r.proposal.id);assert.equal(f.changes,2);
});
test('SDK rejects tool execution without a server owner context',async()=>{
 const t=createSchedulingTools(fixture().service).find(t=>t.name==='confirm_consultation_booking');const output=await t.invoke(new RunContext({}),JSON.stringify({proposalId:randomUUID()}));assert.match(JSON.stringify(output),/authorization is unavailable/);
});
test('native Runner invokes registered availability tool and consumes its result before final response',async()=>{
 const f=fixture(),requests=[];let calls=0;
 const client=new OpenAI({apiKey:'fixture-only',fetch:async(url,init)=>{
  const body=JSON.parse(init.body);requests.push(body);calls++;
  const output=calls===1?[{type:'function_call',id:'fc_fixture',call_id:'call_fixture',name:'check_consultation_availability',arguments:JSON.stringify({date:'2026-11-16',timezone:'America/New_York',appointmentId:null}),status:'completed'}]:[{type:'message',id:'msg_fixture',role:'assistant',status:'completed',content:[{type:'output_text',text:'These times come from the calendar. Which works for you?',annotations:[]}]}];
  return Response.json({id:'resp_'+calls,object:'response',created_at:1,status:'completed',model:'fixture',output,usage:{input_tokens:10,output_tokens:5,total_tokens:15}});
 }});
 const agent=new Agent({name:'Scout scheduling fixture',instructions:loadSchedulingSkill(),model:'fixture',tools:createSchedulingTools(f.service)}),runner=new Runner({modelProvider:new OpenAIProvider({openAIClient:client,useResponses:true}),tracingDisabled:true});
 const result=await runner.run(agent,'What times are available on Monday?',{context:{ownerHash:'owner',signal:new AbortController().signal},maxTurns:8});
 assert.equal(calls,2);assert.match(result.finalOutput,/calendar/);assert(requests[1].input.some(i=>i.type==='function_call_output'&&String(i.output).includes('2026-11-16T14:00:00.000Z')));assert.equal(f.booking.creates,0);
});
test('fixed candidate policy enforces exactly four starts, three-call cap configuration and timezone conversions',()=>{
 const p=consultationSettings.policy,slots=candidateSlots('2026-11-16',p,Date.parse('2026-11-15T00:00:00Z'));assert.deepEqual(slots.map(s=>localParts(Date.parse(s.start),p.timezone).time),['10:00','11:30','13:30','15:00']);assert.equal(p.dailyLimit,3);assert.equal(candidateSlots('2026-11-21',p,Date.parse('2026-11-15T00:00:00Z')).length,0);assert.equal(localParts(Date.parse(slots[0].start),'America/Los_Angeles').time,'08:00');
});
test('Gmail adapter requires real enabled authorization, sends MIME through send-only API and rejects provider failures',async()=>{
 const base={SCOUT_VERIFICATION_EMAIL_ENABLED:'true',GOOGLE_CALENDAR_CLIENT_ID:'fixture',GOOGLE_CALENDAR_CLIENT_SECRET:'fixture',GOOGLE_GMAIL_REFRESH_TOKEN:'fixture'},requests=[];
 const send=async(url,init)=>{requests.push({url,init});return url.includes('oauth2')?Response.json({access_token:'fixture',scope:'https://www.googleapis.com/auth/gmail.send'}):Response.json({id:'message-fixture'});};
 await assert.rejects(()=>createGmailVerification({},send).send('visitor@example.invalid','123456'));await createGmailVerification(base,send).send('visitor@example.invalid','123456');const mime=Buffer.from(JSON.parse(requests[1].init.body).raw,'base64url').toString();assert.match(mime,/From: The Augmented Architect <jd@theaugmentedarchitect.com>/);assert.match(mime,/123456/);assert.equal(requests[1].url,'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');await assert.rejects(()=>createGmailVerification(base,async()=>new Response('',{status:403})).send('visitor@example.invalid','123456'));
});
function managementFixture(){
 let failedFinish=false,losePatch=false,conflict=false,cancels=0,patches=0;
 const a={id:randomUUID(),start:'2026-11-16T16:00:00.000Z',end:'2026-11-16T16:30:00.000Z',timezone:'America/Costa_Rica',eventId:'fixture-event',reference:randomUUID(),fingerprint:'fixture',state:'confirmed',meetUrl:'https://meet.google.com/abc-defg-hij'},ops=new Map();
 let event={id:a.eventId,status:'confirmed',etag:'fixture-etag',extendedProperties:{private:{websiteBookingId:a.reference,websiteBookingFingerprint:a.fingerprint}},start:{dateTime:a.start},end:{dateTime:a.end},conferenceData:{entryPoints:[{entryPointType:'video',uri:a.meetUrl}]}};
 const calendar={async get(){return structuredClone(event);},async busy(){return conflict?[{start:'2026-11-16T17:30:00.000Z',end:'2026-11-16T18:00:00.000Z'}]:[];},async cancel(id,etag){assert.equal(id,a.eventId);assert(etag);cancels++;event.status='cancelled';},async reschedule(id,etag,start,end,op){assert.equal(id,a.eventId);assert(etag);patches++;event={...event,start:{dateTime:start},end:{dateTime:end},extendedProperties:{private:{...event.extendedProperties.private,websiteManagementOperation:op}}};if(losePatch){losePatch=false;throw Error('Lost Google response');}return structuredClone(event);}};
 const store={async appointments(email){return email==='visitor@example.invalid'?[structuredClone(a)]:[];},async prepare(id,owner,booking,email,kind,start){if(!ops.has(id))ops.set(id,{id,owner_hash:owner,booking_id:booking,kind,target_start:start,state:'prepared'});return structuredClone(ops.get(id));},async claim(id,owner,lease){const o=ops.get(id);if(o.lease)return false;o.lease=lease;return true;},async finish(id,owner,lease,state){if(failedFinish&&state==='completed'){failedFinish=false;throw Error('Lost DB response');}const o=ops.get(id);o.state=state;o.lease=null;if(state==='completed'){if(o.kind==='cancel')a.state='cancelled';else{a.start=o.target_start;a.end=new Date(Date.parse(a.start)+1800000).toISOString();}}}};
 return {service:createAppointmentManagement(calendar,store,consultationSettings.policy,()=>Date.parse('2026-11-15T12:00:00Z')),a,ops,get cancels(){return cancels;},get patches(){return patches;},set failedFinish(v){failedFinish=v;},set losePatch(v){losePatch=v;},set conflict(v){conflict=v;}};
}
test('management cancellation is idempotent and never completes before database persistence',async()=>{
 const f=managementFixture(),id=randomUUID();f.failedFinish=true;assert.equal((await f.service.execute(id,'owner','visitor@example.invalid',f.a.id,'cancel',null)).status,'pending');assert.equal(f.cancels,1);assert.equal(f.a.state,'confirmed');assert.equal((await f.service.execute(id,'owner','visitor@example.invalid',f.a.id,'cancel',null)).status,'completed');assert.equal(f.a.state,'cancelled');await f.service.execute(id,'owner','visitor@example.invalid',f.a.id,'cancel',null);assert.equal(f.cancels,1);
});
test('rescheduling updates existing event, preserves original on conflicts, and reconciles a lost Google response',async()=>{
 const f=managementFixture(),id=randomUUID(),start='2026-11-16T17:30:00.000Z';f.conflict=true;await assert.rejects(()=>f.service.execute(id,'owner','visitor@example.invalid',f.a.id,'reschedule',start),e=>e.status===409);assert.equal(f.a.start,'2026-11-16T16:00:00.000Z');assert.equal(f.patches,0);
 const g=managementFixture(),other=randomUUID();g.losePatch=true;assert.equal((await g.service.execute(other,'owner','visitor@example.invalid',g.a.id,'reschedule',start)).status,'pending');assert.equal(g.a.start,'2026-11-16T16:00:00.000Z');assert.equal((await g.service.execute(other,'owner','visitor@example.invalid',g.a.id,'reschedule',start)).status,'completed');assert.equal(g.a.start,start);assert.equal(g.patches,1);
});
test('management rejects cross-visitor requests before Google operations',async()=>{
 const f=managementFixture();await assert.rejects(()=>f.service.execute(randomUUID(),'attacker','other@example.invalid',f.a.id,'cancel',null),e=>e.status===403);assert.equal(f.cancels,0);assert.equal(f.patches,0);
});
test('native Runner completes multi-turn availability, proposal and explicitly approved booking with sanitized tool trace',async()=>{
 const f=fixture();let call=0;const trace=[];
 const plan=[
  {name:'check_consultation_availability',input:{date:'2026-11-16',timezone:'America/New_York',appointmentId:null}},
  {text:'What is your name and invitation email, and which available time do you prefer?'},
  {name:'prepare_consultation_booking',input},
  {text:'Please review the exact 30-minute appointment and use Confirm booking.'},
  {name:'confirm_consultation_booking',input:null},
  {text:'Your consultation is confirmed. Your Google Meet link is https://meet.google.com/abc-defg-hij.'},
 ];
 const client=new OpenAI({apiKey:'fixture-only',fetch:async(url,init)=>{
  const body=JSON.parse(init.body),step=plan[call++];assert(step);
  const returned=body.input.filter(i=>i.type==='function_call_output');for(const r of returned){if(!trace.some(t=>t.callId===r.call_id))trace.push({callId:r.call_id,result:JSON.parse(r.output)});}
  if(step.name==='confirm_consultation_booking'){const p=[...f.records.values()].find(r=>r.kind==='proposal');step.input={proposalId:p.payload.id};}
  const output=step.name?[{type:'function_call',id:'fc_'+call,call_id:'call_'+call,name:step.name,arguments:JSON.stringify(step.input),status:'completed'}]:[{type:'message',id:'msg_'+call,role:'assistant',status:'completed',content:[{type:'output_text',text:step.text,annotations:[]}]}];
  if(step.name)trace.push({tool:step.name,input:step.input});
  return Response.json({id:'resp_'+call,object:'response',created_at:1,status:'completed',model:'fixture',output,usage:{input_tokens:10,output_tokens:5,total_tokens:15}});
 }});
 const agent=new Agent({name:'Scout',instructions:loadSchedulingSkill(),model:'fixture',tools:createSchedulingTools(f.service)}),runner=new Runner({modelProvider:new OpenAIProvider({openAIClient:client,useResponses:true}),tracingDisabled:true}),options={context:{ownerHash:'owner',signal:new AbortController().signal},maxTurns:8};
 await runner.run(agent,'Can you book a consultation next Monday morning?',options);
 await runner.run(agent,'My name is Visitor and my email is visitor@example.invalid. Choose the first time.',options);
 assert.equal(f.booking.creates,0);const p=[...f.records.values()].find(r=>r.kind==='proposal');await f.service.approve('owner',p.payload.id);
 const result=await runner.run(agent,'I approved the appointment using the secure confirmation control.',options);assert.match(result.finalOutput,/confirmed/);assert.equal(f.booking.creates,1);assert.equal(f.booking.records.size,1);assert.equal(f.booking.leads.size,1);assert.equal(call,6);
 console.log('SANITIZED FIXTURE SDK TRACE '+JSON.stringify({trace,finalResponse:result.finalOutput}));
});
test('Scout HTTP rejects an OTP before conversation preparation or model execution',async()=>{
 const cache=new Map(),{BookingError}=loadScoutModule('src/lib/booking/types.ts',{},cache);let prepared=0;
 const {createScoutHandlers}=loadScoutModule('src/lib/scout/http.ts',{'@/lib/booking/scheduling-server':{schedulingEnabled:()=>true,schedulingService:()=>({verification:{async blockCodeInChat(){throw new BookingError(400,'Use the secure code field.');}}})}},cache);
 const h=createScoutHandlers(()=>({async prepare(){prepared++;throw Error('must not persist');}}),async()=>{}),origin='http://website.invalid';
 const response=await h.POST(new Request(origin+'/api/scout',{method:'POST',headers:{origin,'content-type':'application/json',cookie:'scout_session='+'x'.repeat(43)},body:JSON.stringify({message:'123456',clientTurnId:randomUUID()})}));
 assert.equal(response.status,400);assert.equal(prepared,0);assert(!JSON.stringify(await response.json()).includes('123456'));
});
test('scheduling HTTP denies cross-origin, expired-session and malformed-owner requests; verification code is never returned',async()=>{
 const cache=new Map();let expired=false;const v={async ui(){return {proposals:[],verificationRequired:true};},verification:{async verify(owner,code){assert.equal(code,'123456');return {status:'verified'};}}};
 const {schedulingHTTP}=loadScoutModule('src/lib/booking/scheduling-http.ts',{'./scheduling-server':{schedulingEnabled:()=>true,schedulingService:()=>v},'@/lib/scout/store':{createScoutStore:()=>({find:async()=>expired?{status:'active',created_at:'2026-01-01T00:00:00Z',last_activity_at:'2026-01-01T00:00:00Z',expires_at:'2026-01-02T00:00:00Z'}:null})},'@/lib/scout/request-limits':{createSharedRequestLimiter:()=>async()=>{}}},cache);
 const origin='http://website.invalid',make=(cookie='scout_session='+'x'.repeat(43),source=origin)=>new Request(origin+'/api/scout/scheduling',{method:'POST',headers:{origin:source,cookie,'content-type':'application/json'},body:JSON.stringify({action:'verify',code:'123456'})});
 assert.equal((await schedulingHTTP(make('',origin))).status,401);assert.equal((await schedulingHTTP(make(undefined,'https://evil.invalid'))).status,403);const okay=await schedulingHTTP(make());assert.equal(okay.status,200);assert.deepEqual(await okay.json(),{status:'verified'});expired=true;assert.equal((await schedulingHTTP(make())).status,410);
});
test('daily-cap availability credits only a server-selected verified rescheduling appointment',async()=>{
 const f=fixture(),{createBookingService}=loadScoutModule('src/lib/booking/service.ts');f.booking.store.countDay=async()=>3;
 const booking=createBookingService(f.booking.calendar,f.booking.store,consultationSettings.policy,'fixture',()=>Date.parse('2026-11-15T12:00:00Z'));
 assert.deepEqual(await booking.availability('2026-11-16'),[]);assert.equal((await booking.availability('2026-11-16',{id:'verified-fixture',start:'2026-11-16T16:00:00.000Z'})).length,4);
 await assert.rejects(()=>f.service.availability('2026-11-16','attacker',f.appointments[0].id),e=>e.status===403);
});
test('existing Scout model streams through a real native tool turn with skill/context loading and bounded continuation',async()=>{
 const f=fixture(),requests=[];let calls=0;
 const client=new OpenAI({apiKey:'fixture-only',fetch:async(url,init)=>{
  const body=JSON.parse(init.body);requests.push(body);calls++;
  const text='These are real fixture-calendar times. Which would you prefer?';
  const item=calls===1?{type:'function_call',id:'fc_stream',call_id:'call_stream',name:'check_consultation_availability',arguments:JSON.stringify({date:'2026-11-16',timezone:'America/New_York',appointmentId:null}),status:'completed'}:{type:'message',id:'msg_stream',role:'assistant',status:'completed',content:[{type:'output_text',text,annotations:[]}]};
  const response={id:'resp_stream_'+calls,object:'response',created_at:1,status:'completed',model:'fixture',output:[item],usage:{input_tokens:10,output_tokens:5,total_tokens:15}};
  const events=[{type:'response.created',response:{...response,status:'in_progress',output:[]}}];
  if(calls===1){events.push({type:'response.output_item.added',output_index:0,item:{...item,arguments:'',status:'in_progress'}},{type:'response.function_call_arguments.delta',item_id:item.id,output_index:0,delta:item.arguments},{type:'response.function_call_arguments.done',item_id:item.id,output_index:0,arguments:item.arguments});}
  else events.push({type:'response.output_item.added',output_index:0,item:{...item,status:'in_progress',content:[]}},{type:'response.content_part.added',item_id:item.id,output_index:0,content_index:0,part:{type:'output_text',text:'',annotations:[]}},{type:'response.output_text.delta',item_id:item.id,output_index:0,content_index:0,delta:text},{type:'response.output_text.done',item_id:item.id,output_index:0,content_index:0,text},{type:'response.content_part.done',item_id:item.id,output_index:0,content_index:0,part:item.content[0]});
  events.push({type:'response.output_item.done',output_index:0,item},{type:'response.completed',response});
  return new Response(events.map((e,i)=>`event: ${e.type}\ndata: ${JSON.stringify({...e,sequence_number:i})}\n\n`).join(''),{headers:{'content-type':'text/event-stream'}});
 }});
 const {createScoutModel}=loadScoutModule('src/lib/scout/agent.ts',{'./config':{scoutConfig:()=>({apiKey:'fixture-only',model:'fixture'})},'@/lib/booking/scheduling-server':{schedulingEnabled:()=>true,schedulingService:()=>f.service}});
 const model=createScoutModel(client),chunks=[];const reply=await model.reply([{id:'fixture',role:'user',content:'Can you check Monday morning?'}],new AbortController().signal,t=>chunks.push(t),{ownerHash:'owner'});
 assert.equal(calls,2);assert.equal(chunks.join(''),reply.text);assert.match(reply.text,/fixture-calendar/);assert.equal(requests[0].tools.length,7);assert.match(requests[0].instructions,/consultation-scheduling/);assert(!requests[0].instructions.includes('You have NO tools'));assert(requests[0].input.some(i=>i.role==='system'&&i.content.includes('Server-owned proposals')));assert.equal(reply.usage.input_tokens,20);assert.equal(f.booking.creates,0);
});
test('existing booking form reads availability without new scheduling tables until explicit enablement',async()=>{
 const before=process.env.SCOUT_SCHEDULING_ENABLED;delete process.env.SCOUT_SCHEDULING_ENABLED;
 const calls=[],rows=[{requested_start_at:'2026-11-16T16:00:00.000Z',booking_end_at:'2026-11-16T16:30:00.000Z'},{requested_start_at:'2026-11-17T16:00:00.000Z',booking_end_at:'2026-11-17T16:30:00.000Z'}];
 const query={select(){return this;},eq(){return this;},in(){return this;},gte(){return this;},lt(){return this;},gt(){return this;},limit(){return Promise.resolve({data:rows,error:null});}};
 const db={from(table){calls.push(table);assert.equal(table,'scout_consultation_requests');return query;},async rpc(name){calls.push(name);return {data:3,error:null};}};
 try{const {createBookingStore}=loadScoutModule('src/lib/booking/store.ts',{'@/lib/scout/store':{createScoutDatabase:()=>db}}),store=createBookingStore();assert.equal(await store.countDay('2026-11-16','America/Costa_Rica','fixture'),1);assert.equal((await store.busy('2026-11-16T00:00:00Z','2026-11-18T00:00:00Z','fixture')).length,2);assert(!calls.includes('consultation_daily_count'));process.env.SCOUT_SCHEDULING_ENABLED='true';assert.equal(await store.countDay('2026-11-16','America/Costa_Rica','fixture'),3);assert(calls.includes('consultation_daily_count'));}finally{if(before===undefined)delete process.env.SCOUT_SCHEDULING_ENABLED;else process.env.SCOUT_SCHEDULING_ENABLED=before;}
});
test('a valid verified-email session is reused across management requests without another email',async()=>{
 const f=fixture();await verified(f);assert.equal(f.sent.length,1);const result=await f.verification.request('owner','visitor@example.invalid');assert.equal(result.status,'verified');assert.equal(f.sent.length,1);f.advance(15*60000+1);assert.equal((await f.verification.request('owner','visitor@example.invalid')).status,'verification_required');assert.equal(f.sent.length,2);
});
test('execution intent survives interruption and confirmation expiry without a second proposal',async()=>{
 const f=fixture(),p=await f.service.prepareBooking('owner',input);await f.service.approve('owner',p.id);const book=f.booking.service.book;f.booking.service.book=async()=>{throw Error('Interrupted before result');};await assert.rejects(()=>f.service.confirmBooking('owner',p.id));assert.equal((await f.state.get('proposal:'+p.id,'owner')).payload.state,'pending');f.advance(600001);f.booking.service.book=book;assert.equal((await f.service.confirmBooking('owner',p.id)).status,'confirmed');assert.equal(f.booking.creates,1);
});
