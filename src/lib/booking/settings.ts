import 'server-only';
import type { BookingPolicy } from './types';
/** Owner-approved consultation calendar/policy; optional server env overrides. */
export const consultationSettings = {
  calendarId: 'jd@theaugmentedarchitect.com',
  policy: {
    timezone: 'America/Costa_Rica',
    hours: { '1': [['10:00','16:00']], '2': [['10:00','16:00']], '3': [['10:00','16:00']], '4': [['10:00','16:00']], '5': [['10:00','16:00']] },
    bufferMinutes: 15, noticeMinutes: 120, horizonDays: 30,
  } satisfies BookingPolicy,
};
