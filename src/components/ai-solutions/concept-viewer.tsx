'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { aiSolutions, type AiConcept } from '@/content/ai-solutions';
import styles from './ai-solutions.module.css';

/** A progressively enhanced image link: no-JS and modified clicks retain the original PNG. */
export function ConceptViewer({ concept }: { concept: AiConcept }) {
  const [open, setOpen] = useState(false);
  const [actualSize, setActualSize] = useState(false);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const copy = aiSolutions.viewer;
  const dialogId = `${concept.id}-viewer`;

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog?.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => dialog?.close();
  }, [open]);

  function close() {
    setOpen(false);
    setActualSize(false);
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  }

  return <>
    <a ref={triggerRef} href={concept.image.src} className={styles.imageTrigger} aria-label={`${copy.openLabel}: ${concept.title}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? dialogId : undefined}
      onClick={event => { if (event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return; event.preventDefault(); setOpen(true); }}>
      <Image src={concept.image.src} alt={concept.image.alt} width={concept.image.width} height={concept.image.height} sizes="(max-width: 800px) 100vw, 1248px" className={styles.conceptImage} />
      <span className={styles.enlargeHint}>{copy.hint}<span aria-hidden="true">↗</span></span>
    </a>
    {open && <dialog ref={dialogRef} id={dialogId} className={styles.viewer} aria-labelledby={`${dialogId}-title`} aria-describedby={`${dialogId}-notice`}
      onCancel={event => { event.preventDefault(); close(); }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = event.currentTarget.querySelectorAll<HTMLButtonElement>('button');
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onClick={event => { if (event.target !== event.currentTarget) return; const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); }}>
      <div className={styles.viewerHeader}><div><p>{aiSolutions.enterprise.conceptLabel}</p><h2 id={`${dialogId}-title`}>{concept.title}</h2></div><button ref={closeRef} type="button" className={styles.viewerClose} onClick={close} aria-label={copy.closeLabel}>×</button></div>
      <div className={styles.viewerToolbar}><button type="button" aria-pressed={!actualSize} onClick={() => setActualSize(false)}>{copy.fitLabel}</button><button type="button" aria-pressed={actualSize} onClick={() => setActualSize(true)}>{copy.actualSizeLabel}</button><p>{copy.scrollHint}</p></div>
      <div className={`${styles.viewerCanvas} ${actualSize ? styles.actualSize : ''}`}><Image unoptimized src={concept.image.src} alt={concept.image.alt} width={concept.image.width} height={concept.image.height} className={styles.enlargedImage} /></div>
      <p id={`${dialogId}-notice`} className={styles.viewerNotice}>{concept.notice}</p>
    </dialog>}
  </>;
}
