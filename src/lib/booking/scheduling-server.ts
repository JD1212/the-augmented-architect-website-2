import 'server-only';
import { scoutDatabaseConfig } from '@/lib/scout/config';
import { bookingConfig } from './config';
import { createGoogleCalendar } from './calendar';
import { createBookingStore } from './store';
import { createBookingService } from './service';
import { createSchedulingState } from './scheduling-state';
import { createGmailVerification } from './gmail';
import { createAppointmentVerification } from './verification';
import { createAppointmentStore } from './management-store';
import { createAppointmentManagement } from './management';
import { createSchedulingService } from './scheduling';
import { BookingError } from './types';
let service:ReturnType<typeof createSchedulingService>|undefined;
export const schedulingEnabled=()=>process.env.SCOUT_SCHEDULING_ENABLED==='true';
export function schedulingService(){
  if(!schedulingEnabled())throw new BookingError(503,'Conversational scheduling is not available yet. Please use the booking form.');
  if(!service){const config=bookingConfig(),state=createSchedulingState(),calendar=createGoogleCalendar(config);
    service=createSchedulingService(state,createBookingService(calendar,createBookingStore(),config.policy,config.calendarId),createAppointmentVerification(state,createGmailVerification(),scoutDatabaseConfig().secret),createAppointmentManagement(calendar,createAppointmentStore(),config.policy));}
  return service;
}
