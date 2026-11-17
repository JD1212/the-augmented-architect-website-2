'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { assistantContent as copy } from '@/content/assistant';
import { AssistantAvatar } from './AssistantAvatar';
import { AssistantPanel } from './AssistantPanel';
import { useAssistantEntrance } from './useAssistant';
import { useAssistantIntroduction } from './useAssistantIntroduction';
import { useScoutBookingRegistration } from '@/components/booking/booking-provider';
import { salesforceCommercial, type BookingIntent } from '@/content/salesforce-commercial';
import { hasBookingRequest } from '@/lib/assistant/booking-entry';
import { useScoutConversation } from './useScoutConversation';
import styles from './assistant.module.css';
import { trackScoutOpen } from '@/lib/analytics';

export function AssistantLauncher() {
  return <Suspense fallback={null}><ScoutLauncher /></Suspense>;
}

function ScoutLauncher() {
  const ready = useAssistantEntrance();
  const conversation = useScoutConversation();
  const [open, setOpen] = useState(false);
  const openPanel = useCallback(() => setOpen(true), []);
  const finishIntroduction = useAssistantIntroduction(ready, openPanel);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const restoreFocus = useRef(false);
  const registerBooking = useScoutBookingRegistration();
  const [bookingEntry,setBookingEntry] = useState<{ focus: object; intent: BookingIntent } | null>(null);
  const bookingRequested = useRef<BookingIntent | null>(null);
  const enterBooking = useCallback((origin: HTMLElement | null, intent: BookingIntent = 'consultation') => {
    trackScoutOpen();
    trigger.current = origin; finishIntroduction(); setOpen(true);
    bookingRequested.current = intent;
    setBookingEntry({focus:{},intent});
  }, [finishIntroduction]);
  useEffect(() => registerBooking(enterBooking), [registerBooking,enterBooking]);
  useEffect(() => {
    if (!bookingRequested.current || conversation.loading || conversation.busy || conversation.restoreFailed) return;
    // This explicit CTA continues the existing session; restoration is not a reset.
    if (conversation.returning) { void conversation.resume(); return; }
    const intent = bookingRequested.current;
    bookingRequested.current = null;
    if (!hasBookingRequest(conversation.messages,intent)) {
      void conversation.send(intent === 'salesforce-trial' ? salesforceCommercial.trial.request : copy.bookingEntry.request, false, true).finally(() => {
        // Disabling the composer during the reply can blur its initial focus.
        setBookingEntry(previous => previous ? {...previous,focus:{}} : null);
      });
    }
  }, [bookingEntry,conversation]);

  const close = useCallback((shouldRestoreFocus: boolean) => {
    finishIntroduction();
    restoreFocus.current = shouldRestoreFocus;
    setOpen(false);
  }, [finishIntroduction]);
  useEffect(() => {
    if (open || !restoreFocus.current) return;
    restoreFocus.current = false;
    // Wait for the dialog to unmount and the launcher to become visible.
    const frame = requestAnimationFrame(() => {
      const target=trigger.current;trigger.current=null;
      if(target?.isConnected&&target.getClientRects().length)target.focus({preventScroll:true});
      else if(target?.closest('#main-navigation'))document.querySelector<HTMLButtonElement>('.menu-toggle')?.focus({preventScroll:true});
      else launcherRef.current?.focus({preventScroll:true});
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!ready && !open) return null;
  return <div className={styles.root}>
    <button ref={launcherRef} type="button" className={`${styles.launcher} ${open ? styles.hidden : ''}`} onClick={() => { trackScoutOpen();trigger.current=null;finishIntroduction(); openPanel(); }}
      aria-label={copy.launcherLabel} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'scout-panel' : undefined}>
      <AssistantAvatar /><span className={styles.launcherName}>{copy.name}</span>
    </button>
    {open && <AssistantPanel onClose={close} conversation={conversation} bookingEntry={bookingEntry} onBookingReset={(keepBooking=false) => { bookingRequested.current=keepBooking&&bookingEntry ? bookingEntry.intent : null;setBookingEntry(keepBooking&&bookingEntry ? {...bookingEntry,focus:{}} : null); }} />}
  </div>;
}
