'use client';
import { salesforceCommercial as content } from '@/content/salesforce-commercial';
import { useSalesforceTrialBooking } from '@/components/booking/booking-provider';
import styles from './salesforce.module.css';

export function SalesforceTrialCta() {
  const open = useSalesforceTrialBooking();
  return <div className={styles.trial}>
    <button type="button" className="button" data-salesforce-trial onClick={open}>{content.trial.label}</button>
    <p>{content.trial.supporting}</p>
  </div>;
}
