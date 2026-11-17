import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Agent,Runner,OpenAIProvider} from '@openai/agents';
import OpenAI from 'openai';
import {loadScoutModule} from './helpers/scout-loader.mjs';
import {bookingFixture} from './helpers/booking-fixture.mjs';
import {schedulingFixture} from './helpers/scheduling-fixture.mjs';
const {salesforceCommercial:copy}=loadScoutModule('src/content/salesforce-commercial.ts');
const trial=loadScoutModule('src/lib/salesforce/trial.ts');
const {consultationSettings}=loadScoutModule('src/lib/booking/settings.ts');
const enabled={...trial,salesforceTrialEnabled:()=>true};
const overrides={'@/lib/salesforce/trial':enabled};
const {createBookingService}=loadScoutModule('src/lib/booking/service.ts',overrides);
const {createSchedulingService}=loadScoutModule('src/lib/booking/scheduling.ts',overrides);
const {createGoogleCalendar}=loadScoutModule('src/lib/booking/calendar.ts');
const input={name:'Test Visitor',email:'visitor@example.invalid',start:'2026-11-16T16:00:00.000Z',timezone:'America/Costa_Rica',description:copy.trial.eventTitle};
const user=content=>({id:randomUUID(),role:'user',content});
function fixture(){
 const f=bookingFixture(consultationSettings.policy);
 f.service=createBookingService(f.calendar,f.store,consultationSettings.policy,'business-calendar',()=>Date.parse('2026-11-15T12:00:00Z'));
 return f;
}
function scheduling(){
 const base=schedulingFixture(),booking=fixture(),changes=[];
 const appointments=[{id:randomUUID(),start:input.start,end:'2026-11-16T16:30:00.000Z',timezone:input.timezone}];
 const management={async appointments(email){return email===input.email?appointments:[];},async execute(id,owner,email,appointmentId,action,start){assert.equal(email,input.email);changes.push({action,start});return {status:'completed',action,start};}};
 return {...base,booking,changes,appointments,service:createSchedulingService(base.state,booking.service,base.verification,management,()=>Date.parse('2026-11-15T12:00:00Z'))};
}
test('owner-approved guided trial booking is public without package licensing prerequisites',()=>{
 assert.equal(copy.trialBookingEnabled,true);assert.equal(trial.salesforceTrialEnabled(),true);
 assert.match(copy.trial.arrangement,/personally handle eligibility, installation/);
 assert.match(copy.trial.eventDetails,/does not automatically install, activate, or expire/);
 const standard=readFileSync('src/lib/scout/skills/consultation-scheduling/SKILL.md','utf8');
 const {loadSchedulingSkill}=loadScoutModule('src/lib/scout/scheduling-skill.ts');
 assert(loadSchedulingSkill().startsWith(standard),'Original general scheduling guidance remains unchanged');
 const disabled=loadScoutModule('src/lib/scout/scheduling-skill.ts',{'@/lib/salesforce/trial':{...trial,salesforceTrialEnabled:()=>false}});
 assert.equal(disabled.loadSchedulingSkill(),standard);
});
test('trial request deduplicates independently of an earlier general consultation request',()=>{
 const {hasBookingRequest}=loadScoutModule('src/lib/assistant/booking-entry.ts');
 const general=user("I'd like to book a free 30-minute consultation.");
 assert.equal(hasBookingRequest([general],'salesforce-trial'),false);
 assert.equal(hasBookingRequest([general,user(copy.trial.request)],'salesforce-trial'),true);
 assert.equal(hasBookingRequest([user(copy.trial.request)]),true,'General CTA does not restart a trial flow');
 assert.equal(hasBookingRequest([],'salesforce-trial'),false);
});
test('booking feature switch can pause new trial bookings without affecting general consultation infrastructure',async()=>{
 const disabled={'@/lib/salesforce/trial':{...trial,salesforceTrialEnabled:()=>false}};
 const {createSchedulingService:disabledScheduling}=loadScoutModule('src/lib/booking/scheduling.ts',disabled);
 const f=schedulingFixture();const service=disabledScheduling(f.state,f.booking.service,f.verification,{},()=>Date.parse('2026-11-15T12:00:00Z'));
 await assert.rejects(()=>service.prepareBooking('owner',input),e=>e.status===503);assert.equal(f.records.size,0);
 const {createBookingService:disabledBooking}=loadScoutModule('src/lib/booking/service.ts',disabled);
 const b=bookingFixture(consultationSettings.policy);const booking=disabledBooking(b.calendar,b.store,consultationSettings.policy,'business-calendar',()=>Date.parse('2026-11-15T12:00:00Z'));
 await assert.rejects(()=>booking.book({...input,requestId:randomUUID(),confirmed:true},'owner'),e=>e.status===503);assert.equal(b.creates,0);assert.equal(b.records.size,0);
});
test('pending and failed trial attempts never provide preparation; confirmed retry preserves purpose and deduplicates',async()=>{
 const f=fixture(),request={...input,requestId:randomUUID(),confirmed:true};f.meetPending=true;
 const pending=await f.service.book(request,'owner');assert.equal(pending.status,'pending');assert(!('preparationMessage'in pending));assert.equal(f.creates,1);
 const event=[...f.events.values()][0];event.conferenceData.entryPoints=[{entryPointType:'video',uri:'https://meet.google.com/abc-defg-hij'}];
 const result=await f.service.book(request,'owner');assert.equal(result.status,'confirmed');assert.equal(result.preparationMessage,copy.trial.preparation);assert.equal(result.purposeLabel,copy.trial.eventTitle);await f.service.book(request,'owner');assert.equal(f.creates,1);
 await assert.rejects(()=>f.service.book(request,'different-owner'));assert.equal(f.creates,1);
 const g=fixture();g.failCreate=true;const failed=await g.service.book({...request,requestId:randomUUID()},'owner');assert.equal(failed.status,'pending');assert(!('preparationMessage'in failed));
});
test('trial purpose appears before confirmation; only approved confirmed result carries preparation',async()=>{
 const f=scheduling();const p=await f.service.prepareBooking('owner',input),same=await f.service.prepareBooking('owner',input);
 assert.equal(p.id,same.id);assert.equal(p.purposeLabel,copy.trial.eventTitle);assert(!JSON.stringify(p).includes("You're booked!"));assert.equal(f.booking.creates,0);
 assert.equal((await f.service.confirmBooking('owner',p.id)).status,'confirmation_required');assert.equal(f.booking.creates,0);await assert.rejects(()=>f.service.approve('foreign',p.id));
 await f.service.approve('owner',p.id);const result=await f.service.confirmBooking('owner',p.id);assert.equal(result.status,'confirmed');assert.equal(result.preparationMessage,copy.trial.preparation);assert.equal(Date.parse(result.end)-Date.parse(result.start),1800000);
 assert.equal((await f.service.confirmBooking('owner',p.id)).preparationMessage,copy.trial.preparation);assert.equal(f.booking.creates,1);
});
test('Google adapter labels trial and leaves ordinary events unchanged; updates preserve identity',async()=>{
 const requests=[],events=new Map();let count=0;
 const config={clientId:'fixture',clientSecret:'fixture',refreshToken:'fixture',calendarId:'business@example.invalid',policy:consultationSettings.policy};
 const calendar=createGoogleCalendar(config,async(url,init={})=>{
  requests.push({url,init});if(url.includes('oauth2'))return Response.json({access_token:'fixture',expires_in:3600});
  const id=new URL(url).pathname.split('/').at(-1);
  if(init.method==='POST'){const body=JSON.parse(init.body);const e={...body,status:'confirmed',etag:'fixture',conferenceData:{entryPoints:[{entryPointType:'video',uri:'https://meet.google.com/abc-defg-hij'}]}};events.set(e.id,e);count++;return Response.json(e);}
  if(init.method==='PATCH'){const e={...events.get(id),...JSON.parse(init.body)};events.set(id,e);return Response.json(e);}
  if(init.method==='DELETE'){events.delete(id);return new Response(null,{status:204});}
  return Response.json(events.get(id));
 });
 const i={...input,requestId:randomUUID(),confirmed:true};await calendar.create('trial-event',i,'2026-11-16T16:30:00.000Z','fp');
 const payload=JSON.parse(requests.at(-1).init.body);assert.equal(payload.summary,copy.trial.eventTitle);assert.match(payload.description,/30-minute setup consultation for a personally guided 30-day/);assert(requests.at(-1).url.includes('sendUpdates=all'));assert.equal(payload.attendees[0].email,input.email);assert.equal(payload.conferenceData.createRequest.conferenceSolutionKey.type,'hangoutsMeet');
 await calendar.create('ordinary-event',{...i,description:'Architecture discussion'},'2026-11-16T16:30:00.000Z','general');
 const ordinary=JSON.parse(requests.at(-1).init.body);assert.equal(ordinary.summary,'Free consultation — The Augmented Architect');assert.equal(ordinary.description,'Architecture discussion');
 await calendar.reschedule('trial-event','fixture','2026-11-16T17:30:00.000Z','2026-11-16T18:00:00.000Z','move');assert.equal(events.get('trial-event').summary,copy.trial.eventTitle);assert.match(events.get('trial-event').description,/30-day/);
 await calendar.cancel('trial-event','fixture');assert.equal(events.has('trial-event'),false);assert.equal(count,2);
});
test('existing verified management flow still requires approval for rescheduling and cancellation',async()=>{
 const f=scheduling();await assert.rejects(()=>f.service.change('owner','cancel',f.appointments[0].id,null,null));await f.verification.request('owner',input.email);await f.verification.verify('owner',f.sent[0].code);
 const move=await f.service.change('owner','reschedule',f.appointments[0].id,'2026-11-16T17:30:00.000Z',null);assert.equal((await f.service.change('owner','reschedule',f.appointments[0].id,null,move.proposal.id)).status,'confirmation_required');assert.equal(f.changes.length,0);
 await f.service.approve('owner',move.proposal.id);await f.service.change('owner','reschedule',f.appointments[0].id,null,move.proposal.id);assert.equal(f.changes.length,1);
 const cancel=await f.service.change('owner','cancel',f.appointments[0].id,null,null);await f.service.approve('owner',cancel.proposal.id);await f.service.change('owner','cancel',f.appointments[0].id,null,cancel.proposal.id);assert.equal(f.changes.length,2);
});
test('native Agents SDK uses existing tools for trial availability, proposal and approved confirmation',async()=>{
 const f=scheduling(),requests=[];let step=0,mode='prepare';
 const {createSchedulingTools}=loadScoutModule('src/lib/scout/scheduling-tools.ts',overrides);
 const {loadSchedulingSkill}=loadScoutModule('src/lib/scout/scheduling-skill.ts',overrides);
 const fc=(name,args)=>({type:'function_call',id:'fc_'+step,call_id:'call_'+step,name,arguments:JSON.stringify(args),status:'completed'});
 const message=text=>({type:'message',id:'msg_'+step,role:'assistant',status:'completed',content:[{type:'output_text',text,annotations:[]}]});
 let proposalId;
 const client=new OpenAI({apiKey:'fixture-only',fetch:async(url,init)=>{
  const body=JSON.parse(init.body);requests.push(body);let output;step++;
  if(mode==='prepare'&&step===1)output=[fc('check_consultation_availability',{date:'2026-11-16',timezone:input.timezone,appointmentId:null})];
  else if(mode==='prepare'&&step===2)output=[fc('prepare_consultation_booking',input)];
  else if(mode==='prepare')output=[message('Please review the Salesforce trial setup details and use Confirm booking.')];
  else if(step===1)output=[fc('confirm_consultation_booking',{proposalId})];
  else {const raw=body.input.filter(i=>i.type==='function_call_output').at(-1).output;const result=typeof raw==='string'?JSON.parse(raw):raw;output=[message(result.status==='confirmed'?result.preparationMessage+' '+result.meetUrl:'Please use the secure confirmation control.')];}
  return Response.json({id:'resp_'+step,object:'response',created_at:1,status:'completed',model:'fixture',output,usage:{input_tokens:10,output_tokens:5,total_tokens:15}});
 }});
 const agent=new Agent({name:'Scout trial fixture',instructions:loadSchedulingSkill(),model:'fixture',tools:createSchedulingTools(f.service)});const runner=new Runner({modelProvider:new OpenAIProvider({openAIClient:client,useResponses:true}),tracingDisabled:true});const options={context:{ownerHash:'owner',signal:new AbortController().signal},maxTurns:8};
 const prepared=await runner.run(agent,[{role:'user',content:copy.trial.request},{role:'user',content:'My name is Test Visitor, visitor@example.invalid, Monday at 10 AM Costa Rica time.'}],options);assert.match(prepared.finalOutput,/Confirm booking/);assert.equal(f.booking.creates,0);
 proposalId=(await f.service.ui('owner')).proposals[0].id;mode='confirm';step=0;
 const unapproved=await runner.run(agent,'Confirm my consultation',options);assert(!unapproved.finalOutput.includes("You're booked!"));assert.equal(f.booking.creates,0);
 await f.service.approve('owner',proposalId);step=0;const confirmed=await runner.run(agent,'Please confirm the consultation I just approved.',options);assert(confirmed.finalOutput.includes(copy.trial.preparation));assert.match(confirmed.finalOutput,/meet.google.com/);assert.equal(f.booking.creates,1);
 assert(requests.some(r=>r.input.some(i=>i.type==='function_call_output'&&String(i.output).includes(copy.trial.eventTitle))));
});
