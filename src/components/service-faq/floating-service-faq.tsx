'use client';

import { useId, useRef, useState } from 'react';
import type { ServiceFaqCopy } from '@/content/faq-types';
import type { SiteLink } from '@/content/site';
import { FaqDialog } from './faq-dialog';
import styles from './floating-service-faq.module.css';

type Props = { idPrefix: string; content: ServiceFaqCopy; consultation: SiteLink; label: string; accessibleLabel: string };

export function FloatingServiceFaq({ idPrefix, content, consultation, label, accessibleLabel }: Props) {
  const [open, setOpen] = useState(false);
  const instanceId = useId();
  const dialogId = `${idPrefix}-${instanceId}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <div className={styles.root} data-service-faq>
    <button ref={triggerRef} type="button" className={styles.launcher} data-faq-launcher aria-label={accessibleLabel}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? dialogId : undefined} onClick={() => setOpen(true)}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.4 2.4 0 0 1 4.6 1c0 1.8-2.3 2-2.3 3.5M12 17h.01" /></svg>
      <span>{label}</span>
    </button>
    {open && <FaqDialog dialogId={dialogId} content={content} consultation={consultation} triggerRef={triggerRef} onClose={() => setOpen(false)} />}
  </div>;
}
