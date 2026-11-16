import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { BookingError, parseBooking } from './types';
import { bookingCopy } from '@/content/booking';
import { localParts, nextEligibleDate } from './policy';
import type { createBookingService } from './service';
import type { BookingPolicy } from './types';
type Service = ReturnType<typeof createBookingService>;
export function createBookingHandlers(get: () => {service:Service;policy:BookingPolicy}, limit: (request: Request, action: 'read'|'send') => Promise<void>) {
  const headers = {'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
  const name = () => process.env.NODE_ENV === 'production' ? '__Host-consultation_session' : 'consultation_session';
  const token = (request: Request) => {
    const values = (request.headers.get('cookie') ?? '').split(';').map(s => s.trim()).filter(s => s.startsWith(name()+'=')).map(s => s.slice(name().length+1));
    return values.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(values[0]) ? values[0] : null;
  };
  const error = (e: unknown) => Response.json({error:e instanceof BookingError ? e.message : bookingCopy.failure,code:e instanceof BookingError ? e.code : undefined},{status:e instanceof BookingError ? e.status : 503,headers});
  function origin(request: Request, mutation = false) {
    if (request.headers.get('sec-fetch-site') === 'cross-site' || (mutation && request.headers.get('origin') !== new URL(request.url).origin)) throw new BookingError(403,'Please book from this website.');
  }
  return {
    async GET(request: Request) {
      try {
        origin(request); const {service,policy} = get(); await limit(request,'read');
        const date = new URL(request.url).searchParams.get('date');
        const today = localParts(Date.now(),policy.timezone).date;
        const response = Response.json({timezone:policy.timezone,today,initialDate:nextEligibleDate(policy),lastDate:localParts(Date.now()+policy.horizonDays*86400000,policy.timezone).date,slots:date ? await service.availability(date) : []},{headers});
        if (!token(request)) response.headers.set('Set-Cookie',`${name()}=${randomBytes(32).toString('base64url')}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
        return response;
      } catch(e) { return error(e); }
    },
    async POST(request: Request) {
      try {
        origin(request,true); const {service} = get(); await limit(request,'send');
        const credential = token(request); if (!credential) throw new BookingError(401,'Please reopen booking to establish a secure session. Your details have not been submitted.');
        if (!request.headers.get('content-type')?.startsWith('application/json')) throw new BookingError(415,'Please use the booking form.');
        const reader = request.body?.getReader(); if (!reader) throw new BookingError(400,'Please complete the booking form.');
        let size=0,body='';const decoder=new TextDecoder();
        try { while(true) { const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>24000){await reader.cancel();throw new BookingError(413,'The booking details are too long.');}body+=decoder.decode(value,{stream:true}); } body+=decoder.decode(); } finally {reader.releaseLock();}
        let parsed;try {parsed=JSON.parse(body);} catch {throw new BookingError(400,'Please complete the booking form.');}
        const result=await service.book(parseBooking(parsed),createHash('sha256').update(credential).digest('hex'));
        return Response.json(result,{status:result.status === 'confirmed' ? 200 : 202,headers});
      } catch(e) {return error(e);}
    },
  };
}
