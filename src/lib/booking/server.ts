import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { createScoutDatabase } from '@/lib/scout/store';
import { scoutDatabaseConfig } from '@/lib/scout/config';
import { bookingConfig } from './config';
import { createGoogleCalendar } from './calendar';
import { createBookingStore } from './store';
import { createBookingService } from './service';
import { createBookingHandlers } from './http';
import { BookingError } from './types';
let dependencies: {service:ReturnType<typeof createBookingService>;policy:ReturnType<typeof bookingConfig>['policy']} | undefined;
export const bookingHandlers = createBookingHandlers(() => {
  if (!dependencies) { const config=bookingConfig(); dependencies={service:createBookingService(createGoogleCalendar(config),createBookingStore(),config.policy,config.calendarId),policy:config.policy}; }
  return dependencies;
}, async(request,action) => {
  const address=process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() : 'local';
  if (!address || (process.env.VERCEL && !isIP(address))) throw new BookingError(503,'Booking is temporarily unavailable.');
  const hash=createHmac('sha256',scoutDatabaseConfig().secret).update(`consultation-rate:v1:${address}`).digest('hex');
  const {data,error}=await createScoutDatabase().rpc('scout_consume_request_limit',{p_key_hash:hash,p_action:action});
  if(error)throw new BookingError(503,'Booking is temporarily unavailable.');if(data!==true)throw new BookingError(429,'Please wait a little before trying again.');
});
