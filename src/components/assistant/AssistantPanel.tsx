'use client';

import { useEffect, useRef, useState } from 'react';
import { assistantContent as copy, assistantWelcome } from '@/content/assistant';
import { ScoutScheduling } from './ScoutScheduling';
import { AssistantAvatar } from './AssistantAvatar';
import { AssistantMessage } from './AssistantMessage';
import { useGreetingSequence, useReducedMotion } from './useAssistant';
import type { ScoutConversationState } from './useScoutConversation';
import styles from './assistant.module.css';
import { bookingCopy } from '@/content/booking';
import { useBooking } from '@/components/booking/booking-provider';

export function AssistantPanel({ onClose, conversation }: { onClose: (restoreFocus: boolean) => void; conversation: ScoutConversationState }) {
  const openBooking = useBooking();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const sequence = useGreetingSequence(reducedMotion);
  const { messages, draft, setDraft, partial, busy, loading, error, failed, returning, restoreFailed, send, reset, resume } = conversation;
  const hasConversation = messages.length > 0;
  const [closing, setClosing] = useState(false);
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

  function close(restoreFocus = true) {
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
      <div className={styles.conversation}>
        <p className={styles.kicker}>{copy.previewLabel}</p>
        {hasConversation && <button type="button" className={styles.newConversation} onClick={() => void reset()} disabled={busy || loading}>{copy.newConversationLabel}</button>}
        <div className={styles.messages} aria-label={copy.conversationLabel} role={hasConversation ? 'log' : undefined} aria-live={hasConversation ? 'polite' : undefined} aria-relevant="additions" aria-busy={busy}>
          {returning ? <AssistantMessage message={{ id: 'returning', role: 'assistant', content: copy.returningGreeting }} /> : !hasConversation ? <>
            <AssistantMessage message={assistantWelcome[0]} visibleCharacters={sequence.characters} />
            {sequence.showSupport && <AssistantMessage message={assistantWelcome[1]} />}
          </> : <>
            {messages.map(message => <AssistantMessage key={message.id} message={message} conversation />)}
            {partial && <AssistantMessage message={{ id: 'streaming', role: 'assistant', content: partial }} conversation />}
          </>}
        </div>
        {returning && <div className={styles.starters} aria-label={copy.returningGreeting} role="group">
          <button type="button" className={`${styles.starter} ${styles.choice}`} disabled={busy || loading} onClick={() => void resume()}>{copy.continueLabel}</button>
          <button type="button" className={`${styles.starter} ${styles.choice}`} disabled={busy || loading} onClick={() => void reset()}>{copy.startNewLabel}</button>
        </div>}
        {!hasConversation && !returning && <div className={styles.starters} aria-label={copy.startersLabel} role="group">
          {copy.starters.slice(0, sequence.starterCount).map((starter, index) => <button type="button" key={starter.href} disabled={busy || loading || restoreFailed} onClick={() => void send(starter.message)} className={styles.starter}>
            <span className={styles.starterIndex} aria-hidden="true">0{index + 1}</span><span>{starter.label}</span><span aria-hidden="true">↗</span>
          </button>)}
        </div>}
        {(busy || loading) && <p className={styles.replyStatus} role="status">{loading ? copy.restoreLabel : copy.thinking}</p>}
        {error && <div className={styles.feedback} role="status"><p>{error}</p>{failed && <button type="button" className={styles.retry} disabled={busy || loading} onClick={() => void send(failed.message, true)}>{copy.retryLabel}</button>}{restoreFailed && !returning && <button type="button" className={styles.retry} disabled={busy || loading} onClick={() => void resume(false)}>{copy.restoreRetryLabel}</button>}</div>}
        {hasConversation && !returning && !loading && <ScoutScheduling revision={`${messages.at(-1)?.id ?? ''}:${busy}`} disabled={busy || loading || !!failed} onSend={send} />}
        <div ref={feedbackRef} />
      </div>
      <footer className={styles.composer}>
        <button type="button" className={styles.bookingAction} onClick={openBooking}>{bookingCopy.open}</button>
        <p id="scout-availability" className={styles.availability}>{copy.availability}</p>
        <form onSubmit={event => { event.preventDefault(); void send(); }}>
          <label htmlFor="scout-draft" className={styles.srOnly}>{copy.inputLabel}</label>
          <input id="scout-draft" value={draft} onChange={event => setDraft(event.target.value)} placeholder={copy.placeholder} aria-describedby="scout-availability" autoComplete="off" maxLength={1000} disabled={busy || loading || !!failed || returning || restoreFailed} />
          <button type="submit" disabled={!draft.trim() || busy || loading || !!failed || returning || restoreFailed} aria-label={copy.sendLabel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 18V6M6 12L12 6L18 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </form>
      </footer>
    </div>
  </dialog>;
}
