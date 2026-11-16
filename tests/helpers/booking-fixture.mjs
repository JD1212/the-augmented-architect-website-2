import {randomUUID} from 'node:crypto';
import {loadScoutModule} from './scout-loader.mjs';
export const bookingModuleCache=new Map();
const {createBookingService}=loadScoutModule('src/lib/booking/service.ts',{},bookingModuleCache);
const {calendarEventId}=loadScoutModule('src/lib/booking/calendar.ts',{},bookingModuleCache);
const policy={timezone:'America/New_York',hours:{1:[['09:00','17:00']]},bufferMinutes:15,noticeMinutes:120,horizonDays:30};
const now=Date.parse('2026-11-15T12:00:00Z');
export function bookingFixture(){
 const records=new Map(),events=new Map(),leads=new Set();let creates=0,failFinish=false,failReserve=false,failCreate=false,loseReply=false,meetPending=false,calendarFailure=false;
 let busy=[];
 const store={
  async find(ref,owner){const r=records.get(ref);return r?.booking_owner_hash===owner?r:null;},
  async reserve(i,owner,fp,calendar,end,buffer){if(failReserve)throw Error('DB offline');if(records.has(i.requestId))return records.get(i.requestId);if([...records.values()].some(r=>r.booking_state!=='failed'&&Date.parse(r.requested_start_at)<Date.parse(end)+buffer*60000&&Date.parse(r.booking_end_at)>Date.parse(i.start)-buffer*60000))throw Error('Slot reserved');leads.add(owner+':'+i.email);const r={id:randomUUID(),submission_reference:i.requestId,booking_payload_hash:fp,booking_owner_hash:owner,requested_start_at:i.start,booking_end_at:end,timezone:i.timezone,booking_state:'reserved',calendar_event_id:calendarEventId(calendar,i.requestId),calendar_meet_url:null,claimed:false};records.set(i.requestId,r);return r;},
  async claim(id){const r=[...records.values()].find(r=>r.id===id);if(r.claimed)return null;r.claimed=true;return 'lease';},
  async finish(id,owner,lease,state,meet){if(failFinish&&state==='confirmed'){failFinish=false;throw Error('Lost DB confirmation');}const r=[...records.values()].find(r=>r.id===id&&r.booking_owner_hash===owner);Object.assign(r,{booking_state:state,calendar_meet_url:meet??null,claimed:false});},
  async busy(){return [...records.values()].filter(r=>r.booking_state!=='failed').map(r=>({start:r.requested_start_at,end:r.booking_end_at}));},
 };
 const calendar={async busy(){if(calendarFailure)throw Error('Calendar down');return busy;},async get(id){if(calendarFailure)throw Error('Calendar down');return events.get(id)??null;},async create(id,i,end,fp){if(failCreate)throw Error('Calendar rejected');creates++;const e={id,status:'confirmed',start:{dateTime:i.start},end:{dateTime:end},extendedProperties:{private:{websiteBookingId:i.requestId,websiteBookingFingerprint:fp}},conferenceData:{entryPoints:meetPending?[]:[{entryPointType:'video',uri:'https://meet.google.com/abc-defg-hij'}]}};events.set(id,e);if(loseReply){loseReply=false;throw Error('Lost HTTP response');}return e;}};
 return {service:createBookingService(calendar,store,policy,'business-calendar',()=>now),records,events,leads,calendar,store,get creates(){return creates;},set busy(v){busy=v;},set failFinish(v){failFinish=v;},set failReserve(v){failReserve=v;},set failCreate(v){failCreate=v;},set loseReply(v){loseReply=v;},set meetPending(v){meetPending=v;},set calendarFailure(v){calendarFailure=v;}};
}
