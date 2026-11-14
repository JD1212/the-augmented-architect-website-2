'use client';

import Link from 'next/link';
import { useEffect, useRef, type RefObject } from 'react';
import type { ServiceFaqCopy } from '@/content/faq-types';
import type { SiteLink } from '@/content/site';
import { Arrow } from '@/components/icon';
import styles from './faq-dialog.module.css';

type FaqProps = { content: ServiceFaqCopy; consultation: SiteLink };

export function FaqDialog({ content, consultation, triggerRef, onClose, dialogId }: FaqProps & { triggerRef: RefObject<HTMLButtonElement | null>; dialogId: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Match the site's existing native-dialog focus and restoration pattern.
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    dialog?.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => { dialog?.close(); trigger?.focus({ preventScroll: true }); };
  }, [triggerRef]);

  return <dialog data-service-faq-dialog id={dialogId} ref={dialogRef} className={styles.dialog}
    aria-labelledby={`${dialogId}-title`} aria-describedby={`${dialogId}-introduction`}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]');
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <header className={styles.header}>
      <div><h2 id={`${dialogId}-title`}>{content.title}</h2><p id={`${dialogId}-introduction`}>{content.introduction}</p></div>
      <button type="button" ref={closeRef} className={styles.close} aria-label={content.closeLabel} onClick={onClose}><span aria-hidden="true">×</span></button>
    </header>
    <div className={styles.body} role="region" aria-label={content.scrollLabel} tabIndex={0}>
      {content.items.map((item, index) => <section key={item.question} className={styles.answer} aria-labelledby={`${dialogId}-question-${index + 1}`}>
        <span className={styles.number} aria-hidden="true">0{index + 1}</span>
        <h3 id={`${dialogId}-question-${index + 1}`}>{item.question}</h3>
        {item.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      </section>)}
      <div className={styles.consultation}><Link className="button" href={consultation.href} onNavigate={onClose}>{consultation.label}<Arrow /></Link></div>
    </div>
  </dialog>;
}
