'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createIntroductionVisit, introductionDelayMs } from '@/lib/assistant-introduction';

/** Each homepage entry/refresh is eligible. Scrolling never controls opening. */
export function useAssistantIntroduction(ready: boolean, onOpen: () => void) {
  const pathname = usePathname();
  const visit = useRef<ReturnType<typeof createIntroductionVisit> | null>(null);
  const finishIntroduction = useCallback(() => { visit.current?.consume(); }, []);

  useEffect(() => {
    visit.current = pathname === '/' ? createIntroductionVisit() : null;
    return () => { visit.current = null; };
  }, [pathname]);

  useEffect(() => {
    if (!ready || pathname !== '/') return;
    let timer: ReturnType<typeof setTimeout>;
    function attempt() {
      const current = visit.current;
      if (!current || current.isConsumed()) return;
      if (document.querySelector('#scout-panel[open]')) { current.consume(); return; }
      const active = document.activeElement;
      const editing = active?.matches('input, textarea, select, [contenteditable="true"]');
      // Defer for another modal, navigation, or active typing; never suppress for scroll.
      const busy = document.visibilityState !== 'visible' || !document.hasFocus() || editing ||
        !!document.querySelector('dialog[open], .navigation.is-open');
      if (busy) { timer = setTimeout(attempt, 500); return; }
      if (current.consume()) onOpen();
    }
    timer = setTimeout(attempt, introductionDelayMs);
    const onReturn = (event: PageTransitionEvent) => { if(event.persisted){visit.current=createIntroductionVisit();clearTimeout(timer);timer=setTimeout(attempt,introductionDelayMs);} };
    window.addEventListener('pageshow',onReturn);
    return () => {clearTimeout(timer);window.removeEventListener('pageshow',onReturn);};
  }, [ready, onOpen, pathname]);

  return finishIntroduction;
}
