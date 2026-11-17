import type { ScoutMessage } from '@/lib/scout/contracts';

/** UI deduplication only; the existing agent decides which booking details are missing. */
export function hasBookingRequest(messages: readonly ScoutMessage[]): boolean {
  return messages.some(message => message.role === 'user' &&
    /^(?:i(?:'d| would) like to|i want to|please)?\s*(?:book|schedule)\b.{0,60}\b(?:consultation|appointment)[.!?]?\s*$/i.test(message.content.trim()));
}
