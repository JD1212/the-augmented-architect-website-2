'use client';

import { useCallback, useRef, useState } from 'react';
import { assistantContent as copy } from '@/content/assistant';
import { AssistantAvatar } from './AssistantAvatar';
import { AssistantPanel } from './AssistantPanel';
import { useAssistantEntrance } from './useAssistant';
import styles from './assistant.module.css';

export function AssistantLauncher() {
  const ready = useAssistantEntrance();
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => launcherRef.current?.focus({ preventScroll: true }));
  }, []);

  if (!ready) return null;
  return <div className={styles.root}>
    <button ref={launcherRef} type="button" className={`${styles.launcher} ${open ? styles.hidden : ''}`} onClick={() => setOpen(true)}
      aria-label={copy.launcherLabel} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'scout-panel' : undefined}>
      <AssistantAvatar /><span className={styles.launcherName}>{copy.name}</span>
    </button>
    {open && <AssistantPanel onClose={close} />}
  </div>;
}
