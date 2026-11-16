import { BookingError, validTimezone, type BookingPolicy, type Busy, type Slot } from './types';

export function validatePolicy(policy: BookingPolicy) {
  if (!validTimezone(policy.timezone) || !Number.isInteger(policy.bufferMinutes) || policy.bufferMinutes < 0 || policy.bufferMinutes > 120 ||
    !Number.isInteger(policy.noticeMinutes) || policy.noticeMinutes < 60 || policy.noticeMinutes > 10080 || !Number.isInteger(policy.horizonDays) || policy.horizonDays < 1 || policy.horizonDays > 60) throw new Error('Invalid booking policy');
  if (!policy.hours || typeof policy.hours !== 'object' || !Object.keys(policy.hours).length) throw new Error('Missing consultation hours');
  for (const [day, windows] of Object.entries(policy.hours)) {
    if (!/^[0-6]$/.test(day) || !Array.isArray(windows) || windows.length > 4) throw new Error('Invalid consultation hours');
    for (const window of windows) if (!Array.isArray(window) || window.length !== 2 || window.some(t => typeof t !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) || window[0] >= window[1]) throw new Error('Invalid consultation hours');
  }
  return policy;
}
const formatters = new Map<string, Intl.DateTimeFormat>();
export function localParts(time: number, timezone: string) {
  let formatter = formatters.get(timezone);
  if (!formatter) { formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }); if (formatters.size < 8) formatters.set(timezone,formatter); }
  const parts = formatter.formatToParts(time);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` };
}
export function candidateSlots(date: string, policy: BookingPolicy, now = Date.now()): Slot[] {
  const midnight = Date.parse(date+'T00:00:00Z');
  if (!/^\d{4}-\d\d-\d\d$/.test(date) || !Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0,10) !== date) throw new BookingError(400, 'Please choose a valid date.');
  const day = new Date(midnight).getUTCDay();
  // Walk UTC minutes and compare local wall time: missing DST times are skipped;
  // repeated times remain distinct instants and are shown with their UTC offset.
  const result: Slot[] = [];
  for (let start = midnight-14*3600000; start < midnight+38*3600000; start += 60000) {
    if (start < now+policy.noticeMinutes*60000 || start > now+policy.horizonDays*86400000) continue;
    const a = localParts(start,policy.timezone), b = localParts(start+30*60000,policy.timezone);
    if (a.date !== date || b.date !== date) continue;
    if ((policy.hours[day] ?? []).some(([from,to]) => {
      const minutes = (t: string) => Number(t.slice(0,2))*60+Number(t.slice(3));
      return a.time >= from && b.time <= to && minutes(b.time)-minutes(a.time) === 30 && (minutes(a.time)-minutes(from))%15 === 0;
    })) result.push({start:new Date(start).toISOString(),end:new Date(start+30*60000).toISOString()});
  }
  return result;
}
export function availableSlots(slots: Slot[], busy: Busy[], buffer: number) {
  return slots.filter(slot => !busy.some(b => Date.parse(slot.start)-buffer*60000 < Date.parse(b.end) && Date.parse(slot.end)+buffer*60000 > Date.parse(b.start)));
}
