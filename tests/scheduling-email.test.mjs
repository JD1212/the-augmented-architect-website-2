import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadScoutModule} from './helpers/scout-loader.mjs';
import {schedulingFixture} from './helpers/scheduling-fixture.mjs';
import {bookingFixture} from './helpers/booking-fixture.mjs';
const {normalizeSchedulingEmail}=loadScoutModule('src/lib/booking/email.ts');
const {parseBooking}=loadScoutModule('src/lib/booking/types.ts');
const {createDictationDraft}=loadScoutModule('src/lib/assistant/dictation.ts');
const {salesforceCommercial:copy}=loadScoutModule('src/content/salesforce-commercial.ts');
const details={requestId:randomUUID(),name:'Jane  Doe',email:'visitor42@example.invalid',start:'2026-11-16T14:00:00.000Z',timezone:'America/New_York',description:'Acme . Company @ Headquarters',confirmed:true};

test('normalizes only obvious email-delimiter spacing, including recognition chunk separators',()=>{
 for(const email of ['visitor42 @example.invalid','visitor42@ example.invalid','visitor42@example .invalid','visitor42 @ example . invalid','visitor42\u00a0@\u00a0example.\u202finvalid'])assert.equal(normalizeSchedulingEmail(email),'visitor42@example.invalid');
 assert.equal(normalizeSchedulingEmail('jane . doe + sales @ example . co . uk'),null,'Space within an email word is ambiguous');
 assert.equal(normalizeSchedulingEmail('jane . doe+sales @ example . co . uk'),'jane.doe+sales@example.co.uk');
 const original=createDictationDraft('').result([{0:{transcript:'visitor42@example'}},{0:{transcript:'.invalid'}}]).text;
 assert.equal(original,'visitor42@example .invalid');assert.equal(parseBooking({...details,email:original}).email,'visitor42@example.invalid');assert.equal(original,'visitor42@example .invalid');
});

test('preserves valid address characters and existing lowercase/trim policy',()=>{
 for(const email of ['visitor42@example.invalid','jane.doe+sales@example.co.uk',"o'connor@example.invalid",'jane_doe@example.invalid'])assert.equal(normalizeSchedulingEmail(email),email);
 assert.equal(normalizeSchedulingEmail('  Jane.Doe+Sales@Example.INVALID  '),'jane.doe+sales@example.invalid');
});

test('ambiguous addresses, prose, multiple candidates and control characters require clarification',()=>{
 for(const email of ['jane doe@example.invalid','jane@exam ple.invalid','Jane Doe <jane@example.invalid>','jane@example.invalid or other@example.invalid','jane@example.invalid, other@example.invalid','jane@@example.invalid','jane@example..invalid','jane@example.invalid\nBcc:other@example.invalid','jane\u200b@example.invalid','jane@','jane@example.invalid extra',null]){
  assert.equal(normalizeSchedulingEmail(email),null,String(email));
  assert.throws(()=>parseBooking({...details,email}),error=>error.status===400&&/confirm your email address/.test(error.message));
 }
});

test('booking normalization does not mutate the input, names, company text or original transcript',()=>{
 const original='I am Jane  Doe at Acme . Company. My email is visitor42 @ example . invalid.';
 const messages=[{id:'original',role:'user',content:original}];const input=Object.freeze({...details,email:'visitor42 @ example . invalid'});const before=structuredClone({input,messages});
 const result=parseBooking(input);assert.equal(result.email,'visitor42@example.invalid');assert.equal(result.name,details.name);assert.equal(result.description,details.description);assert.deepEqual({input,messages},before);
});

test('normalized address is displayed in the owned proposal and persists only after normal approval',async()=>{
 const f=schedulingFixture(),p=await f.service.prepareBooking('owner',{...details,email:'visitor42 @ example . invalid'});
 assert.equal(p.email,'visitor42@example.invalid');assert.equal((await f.service.ui('owner')).proposals[0].email,'visitor42@example.invalid');assert.equal((await f.service.confirmBooking('owner',p.id)).status,'confirmation_required');assert.equal(f.booking.creates,0);
 const same=await f.service.prepareBooking('owner',details);assert.equal(same.id,p.id);await assert.rejects(()=>f.service.approve('foreign-owner',p.id));await f.service.approve('owner',p.id);assert.equal((await f.service.confirmBooking('owner',p.id)).status,'confirmed');assert.equal(f.booking.creates,1);assert([...f.booking.leads].some(lead=>lead==='owner:visitor42@example.invalid'));
 const g=schedulingFixture();await assert.rejects(()=>g.service.prepareBooking('owner',{...details,email:'Jane visitor42@example.invalid'}));assert.equal(g.records.size,0);assert.equal(g.booking.creates,0);
});

test('trial preparation is exact and concise; ordinary consultation confirmations stay unchanged',async()=>{
 assert.equal(copy.trial.preparation,"You're booked! For your Salesforce trial setup, just have a Developer Sandbox ready. We'll walk you through everything during our appointment.");
 const {loadSchedulingSkill}=loadScoutModule('src/lib/scout/scheduling-skill.ts');const skill=loadSchedulingSkill();assert.match(skill,/original address characters and spacing/);assert.match(skill,/do not guess corrections or join words/);assert.match(skill,/ask only for a Developer Sandbox/);assert.doesNotMatch(skill,/Developer Edition|Full Copy|Partial Copy/);
 const f=bookingFixture();const result=await f.service.book(details,'owner');assert.equal(result.status,'confirmed');assert.equal(result.preparationMessage,undefined);assert.equal(result.purposeLabel,undefined);
});
