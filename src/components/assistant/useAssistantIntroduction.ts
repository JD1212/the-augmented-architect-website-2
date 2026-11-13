'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createIntroductionSession, introductionDelayMs } from '@/lib/assistant-introduction';

/** Introduce Scout on a quiet homepage visit; other pages cannot consume that opportunity. */
export function useAssistantIntroduction(ready: boolean, onOpen: () => void) {
  const pathname = usePathname();
  const sessionRef = useRef<ReturnType<typeof createIntroductionSession> | null>(null);
  const interruptedRef = useRef(false);
  const finishIntroduction = useCallback(() => { sessionRef.current?.consume(); }, []);

  useEffect(() => {
    let storage: Storage | null = null;
    try { storage = window.sessionStorage; } catch { /* Privacy settings can deny access. */ }
    sessionRef.current = createIntroductionSession(storage);
  }, []);

  useEffect(() => {
    if (pathname !== '/') return;
    interruptedRef.current = document.visibilityState !== 'visible';
    if (sessionRef.current?.isConsumed()) return;

    // Observe user input rather than scroll events: Next.js restores scroll on navigation.
    const events = ['pointerdown', 'click', 'keydown', 'wheel', 'touchstart', 'focusin', 'popstate', 'visibilitychange', 'blur'] as const;
    function removeListeners() {
      for (const event of events) window.removeEventListener(event, onActivity, true);
    }
    function onActivity(event: Event) {
      if (event.type === 'focusin' && event.target === document.body) return;
      if (event.type === 'visibilitychange' && document.visibilityState === 'visible') return;
      interruptedRef.current = true;
      removeListeners();
    }
    for (const event of events) window.addEventListener(event, onActivity, { capture: true, passive: true });
    return removeListeners;
  }, [pathname]);

  useEffect(() => {
    if (!ready || pathname !== '/') return;
    const timer = setTimeout(() => {
      const session = sessionRef.current;
      if (!session || session.isConsumed() || interruptedRef.current) return;
      const active = document.activeElement;
      // The home link can keep focus after navigation; it is not an active editor.
      const hasActiveControl = active !== null && active !== document.body && active !== document.documentElement &&
        !active.closest('.site-header a[href="/"]');
      const busy = document.visibilityState !== 'visible' || !document.hasFocus() || hasActiveControl ||
        !!window.location.hash || !!document.querySelector('dialog[open], .navigation.is-open');
      // Persist only an actual opening or explicit manual handling, never a skipped visit.
      if (!busy && session.consume()) onOpen();
    }, introductionDelayMs);
    return () => clearTimeout(timer);
  }, [ready, onOpen, pathname]);

  return finishIntroduction;
}
