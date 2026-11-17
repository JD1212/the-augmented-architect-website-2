import 'server-only';
import { salesforceCommercial } from '@/content/salesforce-commercial';
import { isSalesforceTrialDescription, salesforceTrialEnabled } from '@/lib/salesforce/trial';
import { createHash } from 'node:crypto';
import { availableSlots, candidateSlots, localParts } from './policy';
import { calendarEventId, eventMatches, meetingUrl, type BookingCalendar } from './calendar';
import { BookingError, type BookingInput, type BookingPolicy, type BookingResult } from './types';
export type Reservation = { id: string; submission_reference: string; booking_payload_hash: string; booking_owner_hash: string; requested_start_at: string; booking_end_at: string; timezone: string; booking_state: string; calendar_event_id: string; calendar_meet_url: string | null };
export interface BookingStore {
  countDay?(date: string, timezone: string, calendarId: string): Promise<number>;
  find(reference: string, owner: string): Promise<Reservation | null>;
  reserve(input: BookingInput, owner: string, fingerprint: string, calendarId: string, end: string, buffer: number): Promise<Reservation>;
  claim(id: string, owner: string): Promise<string | null>;
  finish(id: string, owner: string, lease: string, state: 'confirmed' | 'failed' | 'reconciliation_required', meet?: string): Promise<void>;
  busy(start: string, end: string, calendarId: string): Promise<{start:string;end:string}[]>;
}
export function createBookingService(calendar: BookingCalendar, store: BookingStore, policy: BookingPolicy, calendarId: string, clock = () => Date.now()) {
  const confirmed = (r: Reservation, description: string): BookingResult => {
    if (!r.calendar_meet_url || !meetingUrl({id:r.calendar_event_id,conferenceData:{entryPoints:[{entryPointType:'video',uri:r.calendar_meet_url}]}})) throw new BookingError(503,'Booking confirmation is temporarily unavailable.');
    return {status:'confirmed',start:r.requested_start_at,end:r.booking_end_at,timezone:r.timezone,meetUrl:r.calendar_meet_url,...(isSalesforceTrialDescription(description)?{purposeLabel:salesforceCommercial.trial.eventTitle,preparationMessage:salesforceCommercial.trial.preparation}:{})};
  };
  return {
    async hasReservation(reference:string,owner:string){return !!await store.find(reference,owner);},
    async availability(date: string, replacing?: {id:string;start:string}) {
      const slots = candidateSlots(date,policy,clock()); if (!slots.length) return [];
      if (policy.dailyLimit && store.countDay) {
        const count=await store.countDay(date,policy.timezone,calendarId);
        const credit=replacing && localParts(Date.parse(replacing.start),policy.timezone).date===date ? 1 : 0;
        if(count-credit>=policy.dailyLimit)return [];
      }
      const start = new Date(Date.parse(slots[0].start)-policy.bufferMinutes*60000).toISOString(), end = new Date(Date.parse(slots.at(-1)!.end)+policy.bufferMinutes*60000).toISOString();
      const [calendarBusy,reservations] = await Promise.all([calendar.busy(start,end),store.busy(start,end,calendarId)]);
      return availableSlots(slots,[...calendarBusy,...reservations],policy.bufferMinutes);
    },
    async book(input: BookingInput, owner: string): Promise<BookingResult> {
      const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
      let reservation = await store.find(input.requestId,owner);
      if (reservation && reservation.booking_payload_hash !== fingerprint) throw new BookingError(409,'This request belongs to different booking details. Please resolve it before starting another booking.','request_mismatch');
      if (!reservation) {
        if (isSalesforceTrialDescription(input.description) && !salesforceTrialEnabled()) throw new BookingError(503,'Salesforce trial setup is not available for booking yet. General consultations remain available.');
        const date = localParts(Date.parse(input.start),policy.timezone).date;
        const slot = candidateSlots(date,policy,clock()).find(s => s.start === input.start);
        if (!slot) throw new BookingError(409,'That appointment is no longer available. Please choose another time.','slot_unavailable');
        reservation = await store.reserve(input,owner,fingerprint,calendarId,slot.end,policy.bufferMinutes);
      }
      if (reservation.booking_owner_hash !== owner || reservation.booking_payload_hash !== fingerprint) throw new BookingError(409,'This request belongs to different booking details. Please resolve it before starting another booking.','request_mismatch');
      if (reservation.booking_state === 'confirmed') return confirmed(reservation,input.description);
      if (reservation.booking_state === 'failed' || reservation.booking_state === 'cancelled') throw new BookingError(409,'That appointment could not be booked. Please choose another time.','slot_unavailable');
      const lease = await store.claim(reservation.id,owner); if (!lease) return {status:'pending'};
      const eventId = calendarEventId(calendarId,input.requestId), slot = {start:input.start,end:reservation.booking_end_at};
      let event;
      try {
        // Recover the deterministic event first. A previous insert may have
        // succeeded even when the HTTP response or persistence was interrupted.
        event = await calendar.get(eventId);
        if (!event) {
          const start = new Date(Date.parse(slot.start)-policy.bufferMinutes*60000).toISOString(), end = new Date(Date.parse(slot.end)+policy.bufferMinutes*60000).toISOString();
          const busy = await calendar.busy(start,end);
          if (Date.parse(slot.start) < clock()+policy.noticeMinutes*60000 || !availableSlots([slot],busy,policy.bufferMinutes).length) {
            await store.finish(reservation.id,owner,lease,'failed');
            throw new BookingError(409,'That appointment is no longer available. Please choose another time.','slot_unavailable');
          }
          event = await calendar.create(eventId,input,slot.end,fingerprint);
        }
        const meet = meetingUrl(event);
        if (event.id !== eventId || !eventMatches(event,slot,input.requestId,fingerprint) || !meet) {
          await store.finish(reservation.id,owner,lease,'reconciliation_required'); return {status:'pending'};
        }
        await store.finish(reservation.id,owner,lease,'confirmed',meet);
        return confirmed({...reservation,calendar_meet_url:meet},input.description);
      } catch (error) {
        if (error instanceof BookingError && error.status === 409) throw error;
        // Do not release an uncertain slot or invent success. A retry recovers
        // the same event ID, then persists confirmation before reporting it.
        await store.finish(reservation.id,owner,lease,'reconciliation_required').catch(() => undefined);
        return {status:'pending'};
      }
    },
  };
}
