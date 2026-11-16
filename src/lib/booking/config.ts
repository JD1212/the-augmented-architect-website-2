import 'server-only';
import { validatePolicy } from './policy';
import { BookingError, type BookingPolicy } from './types';
import { consultationSettings } from './settings';
import { bookingCopy } from '@/content/booking';
export function bookingConfig(env: NodeJS.ProcessEnv = process.env) {
  const required = ['GOOGLE_CALENDAR_CLIENT_ID','GOOGLE_CALENDAR_CLIENT_SECRET','GOOGLE_CALENDAR_REFRESH_TOKEN'] as const;
  if (env.CONSULTATION_BOOKING_ENABLED !== 'true' || required.some(k => !env[k])) throw new BookingError(503,bookingCopy.unavailable);
  try {
    const policy: BookingPolicy = validatePolicy({ timezone:env.CONSULTATION_TIMEZONE ?? consultationSettings.policy.timezone, hours:env.CONSULTATION_HOURS_JSON ? JSON.parse(env.CONSULTATION_HOURS_JSON) : consultationSettings.policy.hours, bufferMinutes:Number(env.CONSULTATION_BUFFER_MINUTES ?? 15), noticeMinutes:Number(env.CONSULTATION_NOTICE_MINUTES ?? 120), horizonDays:Number(env.CONSULTATION_HORIZON_DAYS ?? 30) });
    return { clientId:env.GOOGLE_CALENDAR_CLIENT_ID!, clientSecret:env.GOOGLE_CALENDAR_CLIENT_SECRET!, refreshToken:env.GOOGLE_CALENDAR_REFRESH_TOKEN!, calendarId:env.GOOGLE_CONSULTATION_CALENDAR_ID ?? consultationSettings.calendarId, policy };
  } catch { throw new BookingError(503,bookingCopy.unavailable); }
}
