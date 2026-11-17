import 'server-only';
import { salesforceCommercial } from '@/content/salesforce-commercial';
import { isSalesforceTrialDescription, salesforceTrialEnabled } from '@/lib/salesforce/trial';
import { randomUUID } from 'node:crypto';
import { BookingError, parseBooking, type BookingInput } from './types';
import type { SchedulingRecord, SchedulingState } from './scheduling-state';
import type { createBookingService } from './service';
import type { createAppointmentVerification } from './verification';
import type { createAppointmentManagement } from './management';
export type SchedulingProposal = {id:string;action:'book'|'cancel'|'reschedule';name?:string;email?:string;start:string;end:string;timezone:string;appointmentId?:string;state:'prepared'|'approved'|'pending'|'done';purposeLabel?:string;result?:unknown};
export type SchedulingUI = {proposals:SchedulingProposal[];verificationRequired:boolean};
export function createSchedulingService(state:SchedulingState,booking:ReturnType<typeof createBookingService>,verification:ReturnType<typeof createAppointmentVerification>,management:ReturnType<typeof createAppointmentManagement>,clock=()=>Date.now()) {
  const read=async(owner:string,id:string)=>{if(!/^[0-9a-f-]{36}$/i.test(id))throw new BookingError(400,'Invalid proposal.');const record=await state.get('proposal:'+id,owner);if(!record)throw new BookingError(403,'That proposal is unavailable.');return record;};
  const view=(record:SchedulingRecord)=>{const p=record.payload;return {id:p.id,action:p.action,name:p.name,email:p.email,start:p.start,end:p.end,timezone:p.timezone,appointmentId:p.appointmentId,state:p.state,result:p.result,...(p.action==='book'&&isSalesforceTrialDescription(String((p.input as BookingInput|undefined)?.description??''))?{purposeLabel:salesforceCommercial.trial.eventTitle}:{})} as SchedulingProposal;};
  async function save(owner:string,payload:Record<string,unknown>){
    const previous=await state.list(owner,'proposal');
    const pending=previous.find(r=>r.payload.state==='pending');
    if(pending)throw new BookingError(409,'Please resolve the pending appointment operation before preparing another change.');
    const same=previous.find(r=>Number(r.payload.until)>clock()&&r.payload.state!=='done'&&r.payload.action===payload.action&&r.payload.start===payload.start&&r.payload.email===payload.email&&r.payload.appointmentId===payload.appointmentId&&r.payload.name===payload.name&&JSON.stringify((r.payload.input as BookingInput|undefined)?.description)===JSON.stringify((payload.input as BookingInput|undefined)?.description));
    if(same)return view(same);
    if(previous.filter(r=>Number(r.payload.until)>clock()&&r.payload.state!=='done').length>=3)throw new BookingError(409,'Please complete or wait for an existing proposal to expire before preparing another.');
    const record:SchedulingRecord={key:'proposal:'+payload.id,owner_hash:owner,kind:'proposal',payload,version:0,expires_at:new Date(clock()+86400000).toISOString()};
    if(!await state.insert(record))throw new BookingError(409,'Please retry preparing that appointment.');return view(record);
  }
  async function execute(owner:string,id:string,action:SchedulingProposal['action']){
    let r=await read(owner,id);let p=r.payload;
    if(p.action!==action)throw new BookingError(403,'This proposal belongs to a different operation.');
    if(p.state==='done')return p.result;
    if(!['approved','pending'].includes(String(p.state)))return {status:'confirmation_required',proposal:view(r)};
    if(p.state==='approved'&&Number(p.until)<=clock()&&!(action==='book'&&await booking.hasReservation(id,owner)))throw new BookingError(409,'The proposal expired. Please prepare a new one.');
    // Persist execution intent before external work so interruption cannot strand
    // an already-approved operation behind its original confirmation timeout.
    if(p.state==='approved'){
      await state.replace(r,{...p,state:'pending'});
      r=await read(owner,id);p=r.payload;
      if(p.state==='done')return p.result;
      if(p.state!=='pending')throw new BookingError(409,'Please retry this same proposal.');
    }
    // Approval exists only after the same-origin UI endpoint updates this record.
    // Concurrent execution is excluded by the booking/management database leases.
    let result;
    try{result=action==='book'?await booking.book(p.input as BookingInput,owner):await management.execute(id,owner,await verification.email(owner),String(p.appointmentId),action,action==='cancel'?null:String(p.start));}
    catch(error){
      if(error instanceof BookingError&&error.status===409)await state.replace(r,{...p,state:'done',result:{status:'failed',message:error.message}});
      throw error;
    }
    const complete=result.status==='confirmed'||result.status==='completed';
    if(!await state.replace(r,{...p,state:complete?'done':'pending',result})){
      const latest=await read(owner,id);if(latest.payload.state==='done')return latest.payload.result;
      throw new BookingError(503,'The operation is being reconciled. Retry the same proposal.');
    }
    return result;
  }
  return {
    verification,
    async availability(date:string,owner?:string,appointmentId?:string|null){
      if(!appointmentId)return booking.availability(date);
      if(!owner)throw new BookingError(403,'Please verify your booking email first.');
      const email=await verification.email(owner),appointment=(await management.appointments(email)).find(a=>a.id===appointmentId);
      if(!appointment)throw new BookingError(403,'That appointment is unavailable.');
      return booking.availability(date,{id:appointment.id,start:appointment.start});
    },
    async prepareBooking(owner:string,value:Omit<BookingInput,'requestId'|'confirmed'>){
      const input=parseBooking({...value,requestId:randomUUID(),confirmed:true});
      if (isSalesforceTrialDescription(input.description) && !salesforceTrialEnabled()) throw new BookingError(503,'Salesforce trial setup is not available for booking yet. General consultations remain available.');
      const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(input.start));
      if(!(await booking.availability(date)).some(s=>s.start===input.start))throw new BookingError(409,'That time is unavailable. Please choose another.');
      return save(owner,{id:input.requestId,action:'book',name:input.name,email:input.email,start:input.start,end:new Date(Date.parse(input.start)+1800000).toISOString(),timezone:input.timezone,input,state:'prepared',until:clock()+10*60000});
    },
    confirmBooking:(owner:string,id:string)=>execute(owner,id,'book'),
    async appointments(owner:string){const email=await verification.email(owner);return (await management.appointments(email)).map(a=>({id:a.id,start:a.start,end:a.end,timezone:a.timezone}));},
    async change(owner:string,action:'cancel'|'reschedule',appointmentId:string,start:string|null,proposalId:string|null){
      if(proposalId)return execute(owner,proposalId,action);
      const email=await verification.email(owner),a=(await management.appointments(email)).find(a=>a.id===appointmentId);
      if(!a)throw new BookingError(403,'That appointment is unavailable. Please verify your booking email again.');
      const selected=action==='cancel'?a.start:start;
      if(!selected||!Number.isFinite(Date.parse(selected)))throw new BookingError(400,'Please select a valid available time.');
      if(action==='reschedule'){
        const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(selected));
        if(!(await booking.availability(date,{id:a.id,start:a.start})).some(s=>s.start===selected))throw new BookingError(409,'That replacement time is not available. Your original appointment is unchanged.');
      }
      return {status:'confirmation_required',proposal:await save(owner,{id:randomUUID(),action,appointmentId,start:selected,end:new Date(Date.parse(selected)+1800000).toISOString(),timezone:a.timezone,email,state:'prepared',until:clock()+10*60000})};
    },
    async approve(owner:string,id:string){
      const r=await read(owner,id);
      if(r.payload.state==='done')return view(r);
      if(r.payload.action!=='book')await verification.email(owner);
      if(Number(r.payload.until)<=clock()&&r.payload.state!=='pending')throw new BookingError(409,'That proposal expired. Please prepare a new proposal.');
      if(r.payload.state==='prepared'&&!await state.replace(r,{...r.payload,state:'approved'}))throw new BookingError(409,'Please retry confirming this proposal.');
      return view({...r,payload:{...r.payload,state:r.payload.state==='pending'?'pending':'approved'}});
    },
    async ui(owner:string):Promise<SchedulingUI>{
      const records=await state.list(owner,'proposal');
      return {verificationRequired:await verification.pending(owner),proposals:records.filter(r=>(Number(r.payload.until)>clock()||['pending','done'].includes(String(r.payload.state)))).slice(0,3).map(view)};
    },
  };
}
