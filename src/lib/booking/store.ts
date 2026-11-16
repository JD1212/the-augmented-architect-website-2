import 'server-only';
import { randomUUID } from 'node:crypto';
import { createScoutDatabase } from '@/lib/scout/store';
import { localParts } from './policy';
import { calendarEventId } from './calendar';
import { BookingError } from './types';
import type { BookingStore, Reservation } from './service';
export function createBookingStore(): BookingStore {
  const db = createScoutDatabase();
  const unavailable = () => new BookingError(503,'Booking storage is temporarily unavailable. Please retry the same request.');
  return {
    async countDay(date,timezone,calendarId) {
      if(process.env.SCOUT_SCHEDULING_ENABLED==='true'){
        const {data,error}=await db.rpc('consultation_daily_count',{p_date:date,p_timezone:timezone,p_calendar:calendarId});
        if(error || !Number.isInteger(data))throw unavailable(); return data;
      }
      // Preserve the working form while the separate scheduling migration is pending.
      // Release still requires the migration's atomic reservation/cap enforcement.
      const midnight=Date.parse(date+'T00:00:00Z');
      const {data,error}=await db.from('scout_consultation_requests').select('requested_start_at').eq('calendar_id',calendarId).in('booking_state',['reserved','reconciliation_required','confirmed']).gte('requested_start_at',new Date(midnight-14*3600000).toISOString()).lt('requested_start_at',new Date(midnight+38*3600000).toISOString()).limit(1000);
      if(error||data?.length===1000)throw unavailable();
      return (data??[]).filter(r=>localParts(Date.parse(r.requested_start_at),timezone).date===date).length;
    },
    async find(reference,owner) {
      const {data,error} = await db.from('scout_consultation_requests').select('*').eq('submission_reference',reference).eq('booking_owner_hash',owner).maybeSingle();
      if (error) throw unavailable(); return data as Reservation | null;
    },
    async reserve(input,owner,fingerprint,calendarId,end,buffer) {
      const {data,error} = await db.rpc('consultation_reserve',{p_reference:input.requestId,p_owner:owner,p_fingerprint:fingerprint,p_name:input.name,p_email:input.email,p_summary:input.description,p_start:input.start,p_end:end,p_timezone:input.timezone,p_calendar:calendarId,p_event:calendarEventId(calendarId,input.requestId),p_buffer:buffer});
      if (error?.code === '23P01') throw new BookingError(409,'That appointment is no longer available. Please choose another time.','slot_unavailable');
      if (error?.code === '23505') throw new BookingError(409,'That appointment or request is no longer available. Please check your booking before trying another time.');
      if (error || !data) throw unavailable(); return data as Reservation;
    },
    async claim(id,owner) {
      const lease = randomUUID();
      const {data,error} = await db.rpc('consultation_claim',{p_id:id,p_owner:owner,p_lease:lease});
      if (error) throw unavailable(); return data === true ? lease : null;
    },
    async finish(id,owner,lease,state,meet) {
      const {data,error} = await db.from('scout_consultation_requests').update({booking_state:state,calendar_meet_url:meet ?? null,booking_lease:null,booking_lease_until:null,
        status:state === 'confirmed' ? 'confirmed' : state === 'failed' ? 'declined' : 'pending_confirmation',reviewed_at:state === 'reconciliation_required' ? null : new Date().toISOString()})
        .eq('id',id).eq('booking_owner_hash',owner).eq('booking_lease',lease).select('id');
      if (error || data?.length !== 1) throw unavailable();
    },
    async busy(start,end,calendarId) {
      const {data,error} = await db.from('scout_consultation_requests').select('requested_start_at,booking_end_at').eq('calendar_id',calendarId).in('booking_state',['reserved','reconciliation_required','confirmed']).lt('requested_start_at',end).gt('booking_end_at',start).limit(1000);
      if (error || data?.length === 1000) throw unavailable();
      if(process.env.SCOUT_SCHEDULING_ENABLED!=='true')return (data??[]).map(r=>({start:r.requested_start_at,end:r.booking_end_at}));
      const {data:operations,error:operationError}=await db.from('scout_scheduling_operations').select('target_start').eq('calendar_id',calendarId).eq('kind','reschedule').in('state',['prepared','pending']).lt('target_start',end).gt('target_start',new Date(Date.parse(start)-1800000).toISOString()).limit(1000);
      if(operationError||operations?.length===1000)throw unavailable();
      return [...(data ?? []).map(r => ({start:r.requested_start_at,end:r.booking_end_at})),...(operations??[]).map(r=>({start:r.target_start,end:new Date(Date.parse(r.target_start)+1800000).toISOString()}))];
    },
  };
}
