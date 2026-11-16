'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { createDictation, recognitionConstructor, type RecognitionConstructor, type DictationStatus, type DictationError } from '@/lib/assistant/dictation';

type SpeechWindow = Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
const subscribe = () => () => {};
const supported = () => !!recognitionConstructor(window as SpeechWindow);
export function useSpeechDictation(draft: string, setDraft: (text: string) => void, disabled: boolean) {
  const pathname = usePathname();
  const available = useSyncExternalStore(subscribe, supported, () => false);
  const [status, setStatus] = useState<DictationStatus>('idle');
  const [error, setError] = useState<DictationError | null>(null);
  const controller = useRef<ReturnType<typeof createDictation> | null>(null);
  // Recognition callbacks must use the current setter without recreating a session.
  const setter = useRef(setDraft);
  useEffect(() => { setter.current = setDraft; }, [setDraft]);
  useEffect(() => {
    const Constructor = recognitionConstructor(window as SpeechWindow);
    if (!Constructor) return;
    const instance = createDictation({ Constructor, lang: document.documentElement.lang || navigator.language || 'en-US', onDraft: text => setter.current(text), onStatus: setStatus, onError: setError });
    controller.current = instance;
    instance.cancel();
    const leave = () => instance.cancel();
    const hide = () => { if (document.hidden) leave(); };
    window.addEventListener('pagehide', leave); document.addEventListener('visibilitychange', hide);
    return () => { controller.current = null; instance.dispose(); window.removeEventListener('pagehide', leave); document.removeEventListener('visibilitychange', hide); };
  }, [pathname]);
  useEffect(() => { if (disabled) controller.current?.cancel(); }, [disabled]);
  return {
    available, status, error,
    toggle() { if (!disabled) { if (status === 'idle') controller.current?.start(draft); else controller.current?.stop(); } },
    edit(text: string) { if (controller.current) controller.current.edit(text); else setDraft(text); },
    cancel() { controller.current?.cancel(); },
  };
}
