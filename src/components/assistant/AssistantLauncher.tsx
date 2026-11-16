'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { assistantContent as copy } from '@/content/assistant';
import { AssistantAvatar } from './AssistantAvatar';
import { AssistantPanel } from './AssistantPanel';
import { useAssistantEntrance } from './useAssistant';
import { useAssistantIntroduction } from './useAssistantIntroduction';
import { useScoutBookingRegistration } from '@/components/booking/booking-provider';
import { useScoutConversation } from './useScoutConversation';
import styles from './assistant.module.css';

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
  const registerBooking = useScoutBookingRegistration();
  const [bookingEntry,setBookingEntry] = useState<{ focus: object; pending: boolean } | null>(null);
  const freshConversation=!conversation.messages.length&&!conversation.returning&&!conversation.loading;
  const enterBooking = useCallback((origin: HTMLElement | null) => {
    trigger.current = origin; finishIntroduction(); setOpen(true);
    setBookingEntry(previous => ({ focus: {}, pending: freshConversation ? true : previous?.pending ?? true }));
  }, [finishIntroduction,freshConversation]);
  useEffect(() => registerBooking(enterBooking), [registerBooking,enterBooking]);
  const consumeBooking = () => setBookingEntry(previous => previous ? {...previous,pending:false} : null);

  const close = useCallback((restoreFocus: boolean) => {
    finishIntroduction();
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => {
      const target=trigger.current;trigger.current=null;
      if(target?.isConnected&&target.getClientRects().length)target.focus({preventScroll:true});
      else if(target?.closest('#main-navigation'))document.querySelector<HTMLButtonElement>('.menu-toggle')?.focus({preventScroll:true});
      else launcherRef.current?.focus({preventScroll:true});
    });
  }, [finishIntroduction]);

  if (!ready && !open) return null;
  return <div className={styles.root}>
    <button ref={launcherRef} type="button" className={`${styles.launcher} ${open ? styles.hidden : ''}`} onClick={() => { trigger.current=null;finishIntroduction(); openPanel(); }}
      aria-label={copy.launcherLabel} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'scout-panel' : undefined}>
      <AssistantAvatar /><span className={styles.launcherName}>{copy.name}</span>
    </button>
    {open && <AssistantPanel onClose={close} conversation={conversation} bookingEntry={bookingEntry} onBookingConsumed={consumeBooking} onBookingReset={(keepBooking=false) => setBookingEntry(previous => keepBooking && previous ? {focus:{},pending:true} : null)} />}
  </div>;
}
