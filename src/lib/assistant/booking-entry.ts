import { salesforceCommercial, type BookingIntent } from '@/content/salesforce-commercial';
import type { ScoutMessage } from '@/lib/scout/contracts';

/** UI deduplication only; the existing agent decides which booking details are missing. */
export function hasBookingRequest(messages: readonly ScoutMessage[], intent: BookingIntent = 'consultation'): boolean {
  const trial = messages.some(message => message.role === 'user' && message.content.trim() === salesforceCommercial.trial.request);
  if (intent === 'salesforce-trial') return trial;
  return trial || messages.some(message => message.role === 'user' &&
    /^(?:i(?:'d| would) like to|i want to|please)?\s*(?:book|schedule)\b.{0,60}\b(?:consultation|appointment)[.!?]?\s*$/i.test(message.content.trim()));
}
