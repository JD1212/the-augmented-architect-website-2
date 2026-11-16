import 'server-only';
import { createScoutDatabase } from '@/lib/scout/store';
import { BookingError } from './types';
import type { AppointmentStore, ManagementOperation } from './management';
export function createAppointmentStore():AppointmentStore {
  const db=createScoutDatabase(),unavailable=()=>new BookingError(503,'Appointment storage is temporarily unavailable.');
  return {
    async appointments(email){
      const {data:leads,error}=await db.from('scout_leads').select('id').eq('email',email).is('conversation_id',null).limit(100);
      if(error||leads?.length===100)throw unavailable();if(!leads?.length)return [];
      const {data,error:failure}=await db.from('scout_consultation_requests').select('*').in('lead_id',leads.map(l=>l.id)).in('booking_state',['confirmed','cancelled']).order('requested_start_at').limit(100);
      if(failure||data?.length===100)throw unavailable();return (data??[]).map(a=>({id:a.id,start:a.requested_start_at,end:a.booking_end_at,timezone:a.timezone,eventId:a.calendar_event_id,reference:a.submission_reference,fingerprint:a.booking_payload_hash,meetUrl:a.calendar_meet_url,state:a.booking_state}));
    },
    async prepare(id,owner,appointment,email,kind,start){const {data,error}=await db.rpc('consultation_prepare_management',{p_id:id,p_owner:owner,p_booking:appointment,p_email:email,p_kind:kind,p_start:start});if(error?.code==='23P01')throw new BookingError(409,'That appointment time is unavailable. Your original booking was preserved.');if(error||!data)throw unavailable();return data as ManagementOperation;},
    async claim(id,owner,lease){const {data,error}=await db.from('scout_scheduling_operations').update({lease,lease_until:new Date(Date.now()+90000).toISOString()}).eq('id',id).eq('owner_hash',owner).in('state',['prepared','pending']).or(`lease_until.is.null,lease_until.lt.${new Date().toISOString()}`).select('id');if(error)throw unavailable();return data?.length===1;},
    async finish(id,owner,lease,state){const {data,error}=await db.rpc('consultation_finish_management',{p_id:id,p_owner:owner,p_lease:lease,p_state:state});if(error||data!==true)throw unavailable();},
  };
}
