'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { assistantContent as copy, assistantWelcome } from '@/content/assistant';
import { AssistantAvatar } from './AssistantAvatar';
import { AssistantMessage } from './AssistantMessage';
import { useAssistantDraft, useGreetingSequence, useReducedMotion } from './useAssistant';
import styles from './assistant.module.css';

export function AssistantPanel({ onClose }: { onClose: (restoreFocus: boolean) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const sequence = useGreetingSequence(reducedMotion);
  const { draft, setDraft, attempted, checkAvailability } = useAssistantDraft();
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
    if (attempted) feedbackRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [attempted]);

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
        <div className={styles.messages} aria-label={copy.subtitle}>
          <AssistantMessage message={assistantWelcome[0]} visibleCharacters={sequence.characters} />
          {sequence.showSupport && <AssistantMessage message={assistantWelcome[1]} />}
        </div>
        <nav className={styles.starters} aria-label={copy.startersLabel}>
          {copy.starters.slice(0, sequence.starterCount).map((starter, index) => <Link key={starter.href} href={starter.href} onNavigate={() => close(false)} className={styles.starter}>
            <span className={styles.starterIndex} aria-hidden="true">0{index + 1}</span><span>{starter.label}</span><span aria-hidden="true">↗</span>
          </Link>)}
        </nav>
        {attempted && <div ref={feedbackRef} className={styles.feedback} role="status"><p>{copy.unavailable}</p><Link href="/contact" onNavigate={() => close(false)}>{copy.contactLabel} <span aria-hidden="true">→</span></Link></div>}
      </div>
      <footer className={styles.composer}>
        <p id="scout-availability" className={styles.availability}>{copy.availability}</p>
        <form onSubmit={event => { event.preventDefault(); if (draft.trim()) checkAvailability(); }}>
          <label htmlFor="scout-draft" className={styles.srOnly}>{copy.inputLabel}</label>
          <input id="scout-draft" value={draft} onChange={event => setDraft(event.target.value)} placeholder={copy.placeholder} aria-describedby="scout-availability" autoComplete="off" maxLength={1000} />
          <button type="submit" disabled={!draft.trim()} aria-label={copy.sendLabel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 18V6M6 12L12 6L18 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </form>
      </footer>
    </div>
  </dialog>;
}
