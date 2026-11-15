import { scoutLimits, type Conversation } from './contracts';

/** Enforce inactivity for existing seven-day rows without changing their retention. */
export function anonymousSessionExpiry(conversation: Conversation): number {
  const activity = Date.parse(conversation.last_activity_at ?? conversation.created_at);
  return Math.min(Date.parse(conversation.expires_at), activity + scoutLimits.sessionSeconds * 1000);
}
