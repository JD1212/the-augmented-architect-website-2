import 'server-only';
import { salesforceCommercial } from '@/content/salesforce-commercial';

/** Enables consultation booking only, not package distribution or entitlement management. */
export function salesforceTrialEnabled(): boolean {
  return salesforceCommercial.trialBookingEnabled;
}

/** The existing persisted project summary carries the explicit appointment purpose. */
export function isSalesforceTrialDescription(description: string): boolean {
  return description === salesforceCommercial.trial.eventTitle || description.startsWith(salesforceCommercial.trial.eventTitle + '\n');
}
