'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ModernizationFaqCopy } from '@/content/custom-applications';
import type { SiteLink } from '@/content/site';
import { Arrow } from '@/components/icon';
import styles from './modernization-faq.module.css';

type FaqProps = { content: ModernizationFaqCopy; consultation: SiteLink };

function FaqDialog({ content, consultation, triggerRef, onClose }: FaqProps & { triggerRef: RefObject<HTMLButtonElement | null>; onClose: () => void }) {
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

  return <dialog id="modernization-faq-dialog" ref={dialogRef} className={styles.dialog}
    aria-labelledby="modernization-faq-title" aria-describedby="modernization-faq-introduction"
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
      <div><h2 id="modernization-faq-title">{content.title}</h2><p id="modernization-faq-introduction">{content.introduction}</p></div>
      <button type="button" ref={closeRef} className={styles.close} aria-label={content.closeLabel} onClick={onClose}><span aria-hidden="true">×</span></button>
    </header>
    <div className={styles.body} role="region" aria-label={content.scrollLabel} tabIndex={0}>
      {content.items.map((item, index) => <section key={item.question} className={styles.answer} aria-labelledby={`modernization-question-${index + 1}`}>
        <span className={styles.number} aria-hidden="true">0{index + 1}</span>
        <h3 id={`modernization-question-${index + 1}`}>{item.question}</h3>
        {item.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      </section>)}
      <div className={styles.consultation}><Link className="button" href={consultation.href} onNavigate={onClose}>{consultation.label}<Arrow /></Link></div>
    </div>
  </dialog>;
}

export function ModernizationFaq({ content, consultation }: FaqProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <div className={styles.entry}>
    <button ref={triggerRef} type="button" className={`text-link ${styles.trigger}`} aria-haspopup="dialog" aria-expanded={open}
      aria-controls={open ? 'modernization-faq-dialog' : undefined} onClick={() => setOpen(true)}>{content.title}<span aria-hidden="true">↗</span></button>
    {open && <FaqDialog content={content} consultation={consultation} triggerRef={triggerRef} onClose={() => setOpen(false)} />}
  </div>;
}
