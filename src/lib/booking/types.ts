import { normalizeSchedulingEmail } from './email';

export type Slot = { start: string; end: string };
export type BookingInput = { requestId: string; name: string; email: string; start: string; timezone: string; description: string; confirmed: true };
export type BookingResult = { status: 'confirmed'; start: string; end: string; timezone: string; meetUrl: string; purposeLabel?: string; preparationMessage?: string } | { status: 'pending' };
export type BookingPolicy = { timezone: string; hours: Record<string, [string, string][]>; bufferMinutes: number; noticeMinutes: number; horizonDays: number; candidateTimes?: readonly string[]; dailyLimit?: number };
export type Busy = { start: string; end: string };
export class BookingError extends Error { constructor(public status: number, message: string, public code?: 'slot_unavailable' | 'request_mismatch') { super(message); } }
export function validTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 100 || (value !== 'UTC' && !value.includes('/'))) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}
export function parseBooking(value: unknown): BookingInput {
  const invalid = () => new BookingError(400, 'Please enter a valid name, email, available time, and timezone, and confirm the appointment.');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(k => !['requestId','name','email','start','timezone','description','confirmed'].includes(k))) throw invalid();
  const email = normalizeSchedulingEmail(v.email);
  if (!email) throw new BookingError(400, 'Please confirm your email address as a single address without spaces between letters or numbers.');
  if (typeof v.name !== 'string' || !v.name.trim() || v.name.trim().length > 200 || /[\r\n\x00-\x1f]/.test(v.name) ||
    typeof v.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.requestId) ||
    typeof v.start !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:00\.000Z$/.test(v.start) || !Number.isFinite(Date.parse(v.start)) ||
    !validTimezone(v.timezone) || typeof v.description !== 'string' || v.description.length > 4000 || /\x00/.test(v.description) || v.confirmed !== true) throw invalid();
  return { requestId: v.requestId, name: v.name.trim(), email, start: v.start, timezone: v.timezone, description: v.description.trim(), confirmed: true };
}
