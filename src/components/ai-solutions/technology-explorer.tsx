'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Technology } from '@/content/ai-technologies';
import type { ComparisonContent } from './technology-comparison';
import styles from './technology-comparison.module.css';

type Copy = Pick<ComparisonContent, 'bestForLabel' | 'detailsLabel' | 'closeLabel' | 'sourceLabel' | 'exampleLabel' | 'headings' | 'previewAction' | 'externalLinkHint'>;

function TechnologyLogo({ technology }: { technology: Technology }) {
  return <span className={`${styles.logo} ${technology.logo?.dark ? styles.darkLogo : ''}`}>
    {technology.logo ? <Image src={technology.logo.src} alt={technology.logo.alt} width={180} height={64} className={technology.logo.shape === 'wordmark' ? styles.wordmark : styles.symbol} /> : <span className={styles.textIdentity}>{technology.textIdentity ?? technology.name}</span>}
  </span>;
}

function TechnologyPreview({ technology, id, action }: { technology: Technology; id: string; action: string }) {
  return <span role="tooltip" id={id} className={styles.preview}>
    <strong>{technology.name}</strong><span className={styles.category}>{technology.category}</span><span>{technology.strength}</span><span className={styles.previewAction}>{action}<span aria-hidden="true"> ↗</span></span>
  </span>;
}

function TechnologyCard({ technology, copy, dialogOpen, selected, onSelect }: { technology: Technology; copy: Copy; dialogOpen: boolean; selected: boolean; onSelect: (technology: Technology, trigger: HTMLButtonElement) => void }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const preview = (hovered || focused) && !dismissed && !dialogOpen;
  const previewId = `technology-${technology.id}-preview`;
  useEffect(() => {
    if (!preview) return;
    function dismiss(event: KeyboardEvent) { if (event.key === 'Escape') setDismissed(true); }
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [preview]);
  return <li className={styles.card} data-preview={preview || undefined}
    onMouseEnter={() => { setHovered(true); setDismissed(false); }} onMouseLeave={() => setHovered(false)}>
    <button type="button" className={styles.cardButton} aria-haspopup="dialog" aria-expanded={selected} aria-controls={selected ? 'technology-detail-dialog' : undefined}
      aria-describedby={preview ? previewId : undefined}
      onFocus={() => { setFocused(true); setDismissed(false); }} onBlur={() => setFocused(false)}
      onKeyDown={event => { if (event.key === 'Escape' && preview) { setDismissed(true); event.stopPropagation(); } }}
      onClick={event => { setDismissed(true); onSelect(technology, event.currentTarget); }}>
      <TechnologyLogo technology={technology} />
      <span className={styles.category}>{technology.category}</span>
      <span className={styles.name}>{technology.name}</span>
      <span className={styles.bestFor}><strong>{copy.bestForLabel}</strong>{technology.bestFor}</span>
      <span className={styles.cardAction}>{copy.detailsLabel}<span aria-hidden="true">↗</span></span>
    </button>
    {preview && <TechnologyPreview technology={technology} id={previewId} action={copy.previewAction} />}
  </li>;
}

function TechnologyDialog({ technology, copy, triggerRef, onClose }: { technology: Technology; copy: Copy; triggerRef: RefObject<HTMLButtonElement | null>; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    dialog?.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => { dialog?.close(); trigger?.focus({ preventScroll: true }); };
  }, [triggerRef]);

  return <dialog id="technology-detail-dialog" ref={dialogRef} className={styles.dialog} aria-labelledby="technology-detail-title" aria-describedby="technology-detail-category"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('button, a[href]');
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <div className={styles.dialogHeader}>
      <div><p id="technology-detail-category" className={styles.category}>{technology.category}</p><h2 id="technology-detail-title">{technology.name}</h2></div>
      <button ref={closeRef} type="button" className={styles.close} aria-label={copy.closeLabel} onClick={onClose}><span aria-hidden="true">×</span></button>
    </div>
    <div className={styles.dialogBody}>
      <TechnologyLogo technology={technology} />
      {(Object.keys(copy.headings) as (keyof Technology['details'])[]).map(key => <section key={key} className={key === 'example' ? styles.example : styles.detailSection}>
        <h3>{copy.headings[key]}</h3>{key === 'example' && <p className={styles.exampleLabel}>{copy.exampleLabel}</p>}<p>{technology.details[key]}</p>
      </section>)}
      <section className={styles.documentation}><h3>{copy.sourceLabel}</h3><a href={technology.href} target="_blank" rel="noopener noreferrer">{technology.name}<span aria-hidden="true"> ↗</span><span className={styles.linkHint}> ({copy.externalLinkHint})</span></a></section>
    </div>
  </dialog>;
}

export function TechnologyExplorer({ content }: { content: ComparisonContent }) {
  const [selected, setSelected] = useState<Technology | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedGroup = content.groups.find(group => group.items.some(item => item.id === selected?.id));
  const dialogCopy = { ...content, headings: selectedGroup?.headings ?? content.headings };
  return <>
    {content.groups.map((group, index) => <section key={group.id} className={styles.group} aria-labelledby={`technology-group-${group.id}`}>
      <div className={styles.groupHeading}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3 id={`technology-group-${group.id}`}>{group.title}</h3><p>{group.description}</p></div></div>
      <ul className={`${styles.grid} ${group.id === 'visual-managed' ? styles.managed : ''}`}>
        {group.items.map(technology => <TechnologyCard key={technology.id} technology={technology} copy={content} selected={selected?.id === technology.id} dialogOpen={selected !== null}
          onSelect={(item, trigger) => { triggerRef.current = trigger; setSelected(item); }} />)}
      </ul>
    </section>)}
    {selected && <TechnologyDialog technology={selected} copy={dialogCopy} triggerRef={triggerRef} onClose={() => setSelected(null)} />}
  </>;
}
