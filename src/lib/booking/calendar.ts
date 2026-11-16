import 'server-only';
import { createHash } from 'node:crypto';
import { BookingError, type BookingInput, type Busy, type Slot } from './types';
import type { bookingConfig } from './config';
type Config = ReturnType<typeof bookingConfig>;
export type CalendarEvent = { id: string; status?: string; etag?:string; start?: { dateTime?: string }; end?: { dateTime?: string }; extendedProperties?: { private?: Record<string,string> }; conferenceData?: { createRequest?: { status?: { statusCode?: string } }; entryPoints?: { entryPointType: string; uri: string }[] } };
export interface BookingCalendar {
  busy(start: string, end: string): Promise<Busy[]>;
  get(id: string): Promise<CalendarEvent | null>;
  cancel?(id:string,etag:string):Promise<void>;
  reschedule?(id:string,etag:string,start:string,end:string,operation:string,properties?:Record<string,string>):Promise<CalendarEvent>;
  create(id: string, input: BookingInput, end: string, fingerprint: string): Promise<CalendarEvent>;
}
export const calendarEventId = (calendar: string, requestId: string) => createHash('sha256').update(`consultation:v1:${calendar}:${requestId}`).digest('hex');
export function meetingUrl(event: CalendarEvent) {
  const uri = event.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video')?.uri;
  if (!uri) return null;
  try { const url = new URL(uri); return url.protocol === 'https:' && url.hostname === 'meet.google.com' ? url.href : null; } catch { return null; }
}
export function createGoogleCalendar(config: Config, request: typeof fetch = fetch): BookingCalendar {
  let token: { value: string; until: number } | undefined;
  async function accessToken() {
    if (token && token.until > Date.now()) return token.value;
    const response = await request('https://oauth2.googleapis.com/token', { method:'POST', cache:'no-store', signal:AbortSignal.timeout(8000), headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,refresh_token:config.refreshToken,grant_type:'refresh_token'}) });
    if (!response.ok) throw new BookingError(503,'Calendar access is temporarily unavailable. Please try again later.');
    const data = await response.json();
    if (typeof data.access_token !== 'string' || !Number.isFinite(data.expires_in)) throw new BookingError(503,'Calendar access is temporarily unavailable.');
    token = { value:data.access_token, until:Date.now()+Math.max(0,data.expires_in-60)*1000 }; return token.value;
  }
  async function call(path: string, init: RequestInit = {}) {
    return request('https://www.googleapis.com/calendar/v3/'+path,{...init, cache:'no-store',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${await accessToken()}`,'Content-Type':'application/json',...init.headers}});
  }
  const eventPath = (id: string) => `calendars/${encodeURIComponent(config.calendarId)}/events/${id}`;
  const unavailable = () => new BookingError(503,'The calendar is temporarily unavailable. Please try again.');
  return {
    async busy(start,end) {
      const response = await call('freeBusy',{method:'POST',body:JSON.stringify({timeMin:start,timeMax:end,timeZone:config.policy.timezone,items:[{id:config.calendarId}]})});
      if (!response.ok) throw unavailable();
      const data = await response.json(), calendar = data.calendars?.[config.calendarId];
      if (!calendar || calendar.errors?.length || !Array.isArray(calendar.busy)) throw unavailable();
      if (calendar.busy.some((v: Busy) => !Number.isFinite(Date.parse(v.start)) || !Number.isFinite(Date.parse(v.end)) || Date.parse(v.start) >= Date.parse(v.end))) throw unavailable();
      return calendar.busy.map((v: Busy) => ({start:v.start,end:v.end}));
    },
    async get(id) {
      const response = await call(eventPath(id)); if (response.status === 404) return null; if(response.status===410)return {id,status:'cancelled'};
      if (!response.ok) throw unavailable(); return response.json();
    },
    async cancel(id,etag) {
      const response=await call(eventPath(id)+'?sendUpdates=all',{method:'DELETE',headers:{'If-Match':etag}});
      if(!response.ok && ![404,410].includes(response.status))throw unavailable();
    },
    async reschedule(id,etag,start,end,operation,properties) {
      const response=await call(eventPath(id)+'?conferenceDataVersion=1&sendUpdates=all',{method:'PATCH',headers:{'If-Match':etag},body:JSON.stringify({start:{dateTime:start,timeZone:config.policy.timezone},end:{dateTime:end,timeZone:config.policy.timezone},extendedProperties:{private:{...properties,websiteManagementOperation:operation}}})});
      if(!response.ok)throw unavailable(); return response.json();
    },
    async create(id,input,end,fingerprint) {
      const response = await call(`calendars/${encodeURIComponent(config.calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,{method:'POST',body:JSON.stringify({id,summary:'Free consultation — The Augmented Architect',description:input.description || '30-minute project consultation.',start:{dateTime:input.start,timeZone:config.policy.timezone},end:{dateTime:end,timeZone:config.policy.timezone},attendees:[{email:input.email,displayName:input.name}],extendedProperties:{private:{websiteBookingId:input.requestId,websiteBookingFingerprint:fingerprint}},conferenceData:{createRequest:{requestId:id,conferenceSolutionKey:{type:'hangoutsMeet'}}}})});
      if (response.status === 409) { const existing = await this.get(id); if (existing) return existing; }
      if (!response.ok) throw unavailable(); return response.json();
    },
  };
}
export function eventMatches(event: CalendarEvent, slot: Slot, requestId: string, fingerprint: string) {
  return event.status === 'confirmed' && event.extendedProperties?.private?.websiteBookingId === requestId &&
    event.extendedProperties?.private?.websiteBookingFingerprint === fingerprint && Date.parse(event.start?.dateTime ?? '') === Date.parse(slot.start) && Date.parse(event.end?.dateTime ?? '') === Date.parse(slot.end);
}
