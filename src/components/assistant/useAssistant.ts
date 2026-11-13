'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { assistantContent } from '@/content/assistant';

const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(notify: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
}
export function useReducedMotion() {
  return useSyncExternalStore(subscribeMotion, () => window.matchMedia(motionQuery).matches, () => false);
}

export function useAssistantEntrance() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const start = () => { timer = setTimeout(() => setReady(true), 1800); };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => { clearTimeout(timer); window.removeEventListener('load', start); };
  }, []);
  return ready;
}

export function useGreetingSequence(reducedMotion: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (reducedMotion) return;
    const started = performance.now();
    const timer = setInterval(() => setElapsed(performance.now() - started), 35);
    const end = setTimeout(() => clearInterval(timer), 4200);
    return () => { clearInterval(timer); clearTimeout(end); };
  }, [reducedMotion]);
  const characters = reducedMotion ? assistantContent.greeting.length : Math.max(0, Math.floor((elapsed - 300) / 35));
  const greetingComplete = characters >= assistantContent.greeting.length;
  return {
    characters,
    greetingComplete,
    showSupport: reducedMotion || elapsed > 1750,
    starterCount: reducedMotion ? 4 : Math.min(4, Math.max(0, Math.floor((elapsed - 2000) / 150))),
  };
}

/** Local draft state only. Deliberately has no transport, persistence or fake replies. */
export function useAssistantDraft() {
  const [draft, setDraft] = useState('');
  const [attempted, setAttempted] = useState(false);
  return { draft, setDraft, attempted, checkAvailability: () => setAttempted(true) };
}
