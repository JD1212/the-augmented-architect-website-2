import 'server-only';
import { randomUUID } from 'node:crypto';
import { availableSlots, candidateSlots, localParts } from './policy';
import { meetingUrl, type BookingCalendar } from './calendar';
import { BookingError, type BookingPolicy } from './types';
export type Appointment = {id:string;start:string;end:string;timezone:string;eventId:string;reference:string;fingerprint:string;meetUrl:string;state:string};
export type ManagementOperation={id:string;booking_id:string;owner_hash:string;kind:'cancel'|'reschedule';target_start:string|null;state:string};
export interface AppointmentStore {
  appointments(email:string):Promise<Appointment[]>;
  prepare(id:string,owner:string,appointment:string,email:string,kind:'cancel'|'reschedule',start:string|null):Promise<ManagementOperation>;
  claim(id:string,owner:string,lease:string):Promise<boolean>;
  finish(id:string,owner:string,lease:string,state:'pending'|'failed'|'completed'):Promise<void>;
}
export function createAppointmentManagement(calendar:BookingCalendar,store:AppointmentStore,policy:BookingPolicy,clock=()=>Date.now()) {
  return {
    async appointments(email:string){return (await store.appointments(email)).filter(a=>a.state==='confirmed'&&Date.parse(a.start)>clock());},
    async execute(id:string,owner:string,email:string,appointmentId:string,kind:'cancel'|'reschedule',start:string|null){
      // Only verified server identity reaches this service. Never accept a model-selected owner.
      const appointment=(await store.appointments(email)).find(a=>a.id===appointmentId);
      if(!appointment)throw new BookingError(403,'That appointment is unavailable. Please verify your booking email again.');
      const operation=await store.prepare(id,owner,appointmentId,email,kind,start);
      if(operation.state==='completed')return {status:'completed',action:kind};
      if(operation.state==='failed')throw new BookingError(409,'That change could not be completed. Your original appointment was preserved.');
      const lease=randomUUID();if(!await store.claim(id,owner,lease))return {status:'pending'};
      try {
        let event=await calendar.get(appointment.eventId);
        if(event?.status==='confirmed'&&(event.id!==appointment.eventId||event.extendedProperties?.private?.websiteBookingId!==appointment.reference||event.extendedProperties?.private?.websiteBookingFingerprint!==appointment.fingerprint))throw new BookingError(503,'The calendar appointment could not be reconciled safely.');
        if(kind==='cancel'){
          if(event?.status!=='cancelled'){
            if(!event?.etag||!calendar.cancel)throw new BookingError(503,'The appointment could not be verified.');
            await calendar.cancel(appointment.eventId,event.etag);
            event=await calendar.get(appointment.eventId);
          }
          if(event&&event.status!=='cancelled')throw new BookingError(503,'Cancellation is still being reconciled.');
        } else {
          const end=new Date(Date.parse(start!)+1800000).toISOString();
          const alreadyApplied=event?.extendedProperties?.private?.websiteManagementOperation===id&&Date.parse(event.start?.dateTime??'')===Date.parse(start!)&&Date.parse(event.end?.dateTime??'')===Date.parse(end);
          if(!alreadyApplied){
            if(!event?.etag||!calendar.reschedule||event.status!=='confirmed'||Date.parse(event.start?.dateTime??'')!==Date.parse(appointment.start))throw new BookingError(503,'The appointment changed. Please retry to reconcile it.');
            const candidate=candidateSlots(localParts(Date.parse(start!),policy.timezone).date,policy,clock()).find(s=>s.start===start);
            // Query the replacement interval only. Do not subtract the old event from merged free/busy data.
            if(!candidate||!availableSlots([candidate],await calendar.busy(new Date(Date.parse(start!)-policy.bufferMinutes*60000).toISOString(),new Date(Date.parse(end)+policy.bufferMinutes*60000).toISOString()),policy.bufferMinutes).length){
              await store.finish(id,owner,lease,'failed');throw new BookingError(409,'That time is no longer available. Your original appointment was preserved.');
            }
            event=await calendar.reschedule(appointment.eventId,event.etag,start!,end,id,event.extendedProperties?.private);
          }
          if(!event||event.status!=='confirmed'||!meetingUrl(event)||Date.parse(event.start?.dateTime??'')!==Date.parse(start!)||Date.parse(event.end?.dateTime??'')!==Date.parse(end))throw new BookingError(503,'The change is still being reconciled.');
        }
        await store.finish(id,owner,lease,'completed');
        return {status:'completed',action:kind,...(kind==='reschedule'?{start,end:new Date(Date.parse(start!)+1800000).toISOString(),meetUrl:meetingUrl(event!)}:{})};
      }catch(error){
        if(error instanceof BookingError&&error.status===409)throw error;
        await store.finish(id,owner,lease,'pending').catch(()=>undefined);
        return {status:'pending',message:'The change is being reconciled. Do not submit a different change yet; retry this same proposal.'};
      }
    },
  };
}
