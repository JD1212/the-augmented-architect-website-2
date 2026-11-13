'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createIntroductionSession, introductionDelayMs } from '@/lib/assistant-introduction';

/** Observe activity from hydration, including the time before the avatar appears. */
export function useAssistantIntroduction(ready: boolean, onOpen: () => void) {
  const sessionRef = useRef<ReturnType<typeof createIntroductionSession> | null>(null);
  const finishIntroduction = useCallback(() => { sessionRef.current?.consume(); }, []);

  useEffect(() => {
    let storage: Storage | null = null;
    try { storage = window.sessionStorage; } catch { /* Privacy settings can deny access. */ }
    const session = createIntroductionSession(storage);
    sessionRef.current = session;
    if (session.isConsumed()) return;
    if (document.visibilityState !== 'visible') { session.consume(); return; }

    const events = ['pointerdown', 'click', 'keydown', 'wheel', 'touchstart', 'scroll', 'focusin', 'popstate', 'visibilitychange', 'blur'] as const;
    function removeListeners() {
      for (const event of events) window.removeEventListener(event, onActivity, true);
    }
    function onActivity(event: Event) {
      if (event.type === 'focusin' && event.target === document.body) return;
      if (event.type === 'visibilitychange' && document.visibilityState === 'visible') return;
      session.consume();
      removeListeners();
    }
    for (const event of events) window.addEventListener(event, onActivity, { capture: true, passive: true });
    return removeListeners;
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      const session = sessionRef.current;
      if (!session || session.isConsumed()) return;
      const active = document.activeElement;
      const hasActiveControl = active !== null && active !== document.body && active !== document.documentElement;
      const busy = document.visibilityState !== 'visible' || !document.hasFocus() || hasActiveControl ||
        !!window.location.hash || !!document.querySelector('dialog[open], .navigation.is-open');
      // Claim once before opening; skip this tab entirely when the visitor is busy.
      if (session.consume() && !busy) onOpen();
    }, introductionDelayMs);
    return () => clearTimeout(timer);
  }, [ready, onOpen]);

  return finishIntroduction;
}
