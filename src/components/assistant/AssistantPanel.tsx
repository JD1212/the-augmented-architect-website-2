'use client';

import { useEffect, useRef, useState } from 'react';
import { assistantContent as copy, assistantWelcome } from '@/content/assistant';
import { ListeningWaveform } from './ListeningWaveform';
import { Icon } from '@/components/icon';
import { useSpeechDictation } from './useSpeechDictation';
import { ScoutScheduling } from './ScoutScheduling';
import { AssistantAvatar } from './AssistantAvatar';
import { AssistantMessage } from './AssistantMessage';
import { useGreetingSequence, useReducedMotion } from './useAssistant';
import type { ScoutConversationState } from './useScoutConversation';
import styles from './assistant.module.css';
import { bookingCopy } from '@/content/booking';
import { useBooking, useManualBooking } from '@/components/booking/booking-provider';

export function AssistantPanel({ onClose, conversation, bookingEntry, onBookingReset }: {
  onClose: (restoreFocus: boolean) => void; conversation: ScoutConversationState;
  bookingEntry: { focus: object } | null;
  onBookingReset: (keepBooking?: boolean) => void;
}) {
  const openBooking = useBooking();
  const openManual = useManualBooking();
  const inputRef = useRef<HTMLInputElement>(null);
  const focusedBooking = useRef<object | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const sequence = useGreetingSequence(reducedMotion);
  const { messages, draft, setDraft, partial, busy, loading, error, failed, returning, restoreFailed, send, reset, resume } = conversation;
  const [closing, setClosing] = useState(false);
  const inputDisabled = busy || loading || !!failed || returning || restoreFailed;
  const dictation = useSpeechDictation(draft, setDraft, inputDisabled || closing);
  const hasConversation = messages.length > 0;
  const welcome = !hasConversation && !returning;
  const recording = dictation.status !== 'idle';
  const restoreFocusRef = useRef(true);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    if (!closing) return;
    const timeout = setTimeout(() => onClose(restoreFocusRef.current), reducedMotion ? 0 : 230);
    return () => clearTimeout(timeout);
  }, [closing, onClose, reducedMotion]);

  useEffect(() => {
    if (hasConversation || error) feedbackRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [hasConversation, messages, partial, error]);

  useEffect(() => {
    if (!bookingEntry || inputDisabled || focusedBooking.current===bookingEntry.focus) return;
    const frame=requestAnimationFrame(() => {
      inputRef.current?.focus({preventScroll:true});
      focusedBooking.current=bookingEntry.focus;
    });
    return () => cancelAnimationFrame(frame);
  }, [bookingEntry,inputDisabled]);
  function submitDraft() {
    if (inputDisabled || !draft.trim()) return;
    dictation.cancel();
    void send(draft);
  }

  function close(restoreFocus = true) {
    dictation.cancel();
    restoreFocusRef.current = restoreFocus;
    setClosing(true);
  }

  return <dialog ref={dialogRef} id="scout-panel" className={`${styles.panel} ${closing ? styles.closing : ''}`}
    aria-labelledby="scout-title" aria-describedby="scout-availability"
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled)');
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } }}>
    <div className={styles.panelInner}>
      <header className={styles.header}>
        <div className={styles.headerAvatar}><AssistantAvatar /></div>
        <div><h2 id="scout-title">{copy.name}</h2><p>{copy.subtitle}</p></div>
        <button ref={closeRef} type="button" className={styles.close} aria-label={copy.closeLabel} onClick={() => close()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        </button>
      </header>
      <div className={`${styles.conversation} ${welcome ? styles.welcome : ''}`}>
        {!welcome && <p className={styles.kicker}>{copy.previewLabel}</p>}
        {hasConversation && <button type="button" className={styles.newConversation} onClick={() => { dictation.cancel();onBookingReset();void reset(); }} disabled={busy || loading}>{copy.newConversationLabel}</button>}
        {bookingEntry && <div className={styles.bookingIntro} data-scout-booking-entry>
          <button type="button" className={styles.bookingFallback} onClick={() => {dictation.cancel();openManual();}}>{copy.bookingEntry.manual}</button>
        </div>}
        <div className={styles.messages} aria-label={copy.conversationLabel} role={hasConversation ? 'log' : undefined} aria-live={hasConversation ? 'polite' : undefined} aria-relevant="additions" aria-busy={busy}>
          {returning ? <AssistantMessage message={{ id: 'returning', role: 'assistant', content: copy.returningGreeting }} /> : !hasConversation ? <>
            <AssistantMessage message={assistantWelcome[0]} visibleCharacters={sequence.characters} />
            {sequence.showSupport && <div className={styles.welcomeCopy}><p>{copy.supporting}</p><p>{copy.schedulingWelcome}</p><p><strong>{copy.welcomeClosing}</strong></p></div>}
          </> : <>
            {messages.map(message => <AssistantMessage key={message.id} message={message} conversation />)}
            {partial && <AssistantMessage message={{ id: 'streaming', role: 'assistant', content: partial }} conversation />}
          </>}
        </div>
        {returning && <div className={styles.starters} aria-label={copy.returningGreeting} role="group">
          <button type="button" className={`${styles.starter} ${styles.choice}`} disabled={busy || loading} onClick={() => void resume()}>{copy.continueLabel}</button>
          <button type="button" className={`${styles.starter} ${styles.choice}`} disabled={busy || loading} onClick={() => { dictation.cancel();onBookingReset(!!bookingEntry);void reset(); }}>{copy.startNewLabel}</button>
        </div>}
        {welcome && <div className={styles.starters} aria-label={copy.startersLabel} role="group">
          {copy.starters.slice(0, sequence.starterCount).map((starter, index) => <button type="button" key={starter.href} disabled={busy || loading || restoreFailed} onClick={() => { dictation.cancel(); if (starter.href === '/book') openBooking(); else void send(starter.message); }} className={styles.starter}>
            <span className={styles.starterIndex} aria-hidden="true">0{index + 1}</span><span>{starter.label}</span><span aria-hidden="true">↗</span>
          </button>)}
        </div>}
        {(busy || loading) && <p className={styles.replyStatus} role="status">{loading ? copy.restoreLabel : copy.thinking}</p>}
        {error && <div className={styles.feedback} role="status"><p>{error}</p>{failed && <button type="button" className={styles.retry} disabled={busy || loading} onClick={() => void send(failed.message, true)}>{copy.retryLabel}</button>}{restoreFailed && !returning && <button type="button" className={styles.retry} disabled={busy || loading} onClick={() => void resume(false)}>{copy.restoreRetryLabel}</button>}</div>}
        {hasConversation && !returning && !loading && <ScoutScheduling revision={`${messages.at(-1)?.id ?? ''}:${busy}`} disabled={busy || loading || !!failed} onSend={send} />}
        <div ref={feedbackRef} />
      </div>
      <footer className={styles.composer}>
        <button type="button" className={styles.bookingAction} onClick={() => { dictation.cancel(); openBooking(); }}>{bookingCopy.open}</button>
        <p id="scout-availability" className={styles.availability}>{copy.availability}</p>
        <form onSubmit={event => { event.preventDefault(); submitDraft(); }}>
          <label htmlFor="scout-draft" className={styles.srOnly}>{copy.inputLabel}</label>
          <div className={styles.voiceField} data-listening={recording}>
          <input ref={inputRef} id="scout-draft" value={draft} onChange={event => dictation.edit(event.target.value)} placeholder={copy.placeholder} aria-describedby="scout-availability scout-dictation-status" autoComplete="off" maxLength={1000} disabled={inputDisabled} />
          {recording && <ListeningWaveform listening={dictation.status === 'listening'} reducedMotion={reducedMotion} />}
          </div>
          {dictation.available && <button type="button" className={styles.microphone} disabled={inputDisabled || dictation.status === 'stopping'} aria-label={dictation.status === 'idle' ? copy.dictation.start : copy.dictation.stop} aria-pressed={dictation.status !== 'idle'} aria-describedby="scout-dictation-status" title={copy.dictation.hint} data-dictation-state={dictation.status} onClick={event => { event.currentTarget.focus({ preventScroll: true }); dictation.toggle(); }}><Icon name="microphone" /></button>}
          <button type="submit" disabled={!draft.trim() || busy || loading || !!failed || returning || restoreFailed} aria-label={copy.sendLabel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 18V6M6 12L12 6L18 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </form>
        <span id="scout-dictation-status" className={styles.srOnly} role="status">{dictation.error ? copy.dictation.errors[dictation.error] : dictation.status !== 'idle' ? copy.dictation[dictation.status] : !dictation.available ? copy.dictation.unsupported : ''}</span>
        {dictation.error && <p className={styles.dictationFeedback}>{copy.dictation.errors[dictation.error]}</p>}
      </footer>
    </div>
  </dialog>;
}
