import {loadScoutModule} from './scout-loader.mjs';
import {bookingFixture} from './booking-fixture.mjs';
import {randomUUID} from 'node:crypto';
export const schedulingFixtureCache=new Map();
const {createAppointmentVerification}=loadScoutModule('src/lib/booking/verification.ts',{},schedulingFixtureCache);
const {createSchedulingService}=loadScoutModule('src/lib/booking/scheduling.ts',{},schedulingFixtureCache);
export function schedulingFixture(){
 const records=new Map(),sent=[];let now=Date.parse('2026-11-15T12:00:00Z');
 const state={async get(key,owner){const r=records.get(key);return r?.owner_hash===owner?structuredClone(r):null;},async list(owner,kind){return [...records.values()].filter(r=>r.owner_hash===owner&&r.kind===kind).map(r=>structuredClone(r));},async insert(r){if(records.has(r.key))return false;records.set(r.key,structuredClone(r));return true;},async replace(old,payload){const r=records.get(old.key);if(!r||r.version!==old.version||r.owner_hash!==old.owner_hash)return false;records.set(r.key,{...r,payload:structuredClone(payload),version:r.version+1});return true;}};
 const mail={async send(email,code){sent.push({email,code});}},verification=createAppointmentVerification(state,mail,'fixture-secret',()=>now),booking=bookingFixture();
 const appointments=[{id:randomUUID(),start:'2026-11-16T14:00:00.000Z',end:'2026-11-16T14:30:00.000Z',timezone:'America/New_York',state:'confirmed'}];let changes=0;
 const management={async appointments(email){return email==='visitor@example.invalid'?appointments:[];},async execute(id,owner,email,appointment,kind,start){assert.equal(email,'visitor@example.invalid');changes++;return {status:'completed',action:kind,start};}};
 const service=createSchedulingService(state,booking.service,verification,management,()=>now);
 return {state,records,sent,mail,verification,booking,service,appointments,get changes(){return changes;},advance(ms){now+=ms;}};
}
