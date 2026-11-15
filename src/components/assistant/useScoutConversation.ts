'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { assistantContent as copy } from '@/content/assistant';
import type { ScoutMessage } from '@/lib/scout/contracts';
import { readScoutStream } from '@/lib/scout/stream';
import { fetchScoutSnapshot, submitScoutTurn } from '@/lib/scout/transport';

type FailedTurn = { id: string; message: string };
export function useScoutConversation() {
  const [messages, setMessages] = useState<ScoutMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [partial, setPartial] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState<FailedTurn | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const active = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const initialized = useRef<Promise<void> | null>(null);
  const mounted = useRef(false);

  const restore = useCallback(async (signal?: AbortSignal) => {
    const state = await fetchScoutSnapshot(signal);
    if (!mounted.current) return;
    setMessages(state.messages); setBusy(state.busy); setFailed(state.failed);
    setExpiresAt(typeof state.expiresInMs === 'number' ? Date.now() + state.expiresInMs : null);
    if (!state.messages.length) { setPartial(''); setError(''); }
    if (state.failed) setError(copy.failure);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const abort = new AbortController();
    initialized.current = Promise.resolve().then(() => restore(abort.signal)).catch(e => {
      if (!abort.signal.aborted) setError(e instanceof Error ? e.message : copy.failure);
    }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => { mounted.current = false; abort.abort(); controller.current?.abort(); };
  }, [restore]);

  useEffect(() => {
    if (expiresAt === null || busy) return;
    let checking = false;
    const abort = new AbortController();
    const checkExpiry = () => {
      if (Date.now() < expiresAt || checking) return;
      checking = true;
      active.current = true; controller.current = abort;
      // Hide expired cached text even if the network is unavailable. The server
      // decides whether activity in another tab has extended this same session.
      setMessages([]); setPartial(''); setFailed(null); setDraft(''); setError(''); setLoading(true); setExpiresAt(null);
      initialized.current = restore(abort.signal).catch(e => {
        if (mounted.current && !abort.signal.aborted) setError(e instanceof Error ? e.message : copy.failure);
      }).finally(() => { active.current = false; if (mounted.current && !abort.signal.aborted) setLoading(false); });
    };
    const timer = setTimeout(checkExpiry, Math.max(0, expiresAt - Date.now()));
    const onReturn = () => { if (document.visibilityState === 'visible') checkExpiry(); };
    window.addEventListener('focus', onReturn); document.addEventListener('visibilitychange', onReturn);
    return () => { clearTimeout(timer); window.removeEventListener('focus', onReturn); document.removeEventListener('visibilitychange', onReturn); };
  }, [expiresAt, busy, restore]);

  useEffect(() => {
    if (!busy || active.current) return;
    // A refresh or another tab may find a running turn. Poll the authorized
    // snapshot; do not start another model execution or re-submit the message.
    const timer = setInterval(() => { restore().catch(() => setError(copy.failure)); }, 4000);
    return () => clearInterval(timer);
  }, [busy, restore]);

  async function send(message = draft, retry = false) {
    if (active.current || busy || loading || !message.trim()) return;
    active.current = true;
    const turn = retry && failed ? failed : { id: crypto.randomUUID(), message: message.trim() };
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError(''); setPartial(''); setFailed(null); setDraft('');
    setMessages(previous => previous.some(m => m.id === turn.id) ? previous : [...previous, { id: turn.id, role: 'user', content: turn.message }]);
    let completed = false;
    try {
      await initialized.current;
      const response = await submitScoutTurn(turn, abort.signal, () => {
        if (!mounted.current) return;
        setMessages([{ id: turn.id, role: 'user', content: turn.message }]); setPartial(''); setFailed(null); setExpiresAt(null);
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || copy.failure); }
      await readScoutStream(response, event => {
        if (!mounted.current) return;
        if (event.type === 'delta') setPartial(previous => previous + event.text);
        if (event.type === 'error') throw new Error(event.message);
        if (event.type === 'done') { completed = true; setMessages(event.messages); setPartial(''); setExpiresAt(typeof event.expiresInMs === 'number' ? Date.now() + event.expiresInMs : null); }
      });
    } catch (e) {
      if (mounted.current) { setError(e instanceof Error ? e.message : copy.failure); setFailed(turn); setPartial(''); setDraft(turn.message); }
    } finally {
      active.current = false;
      if (mounted.current) { setBusy(false); if (!completed) setFailed(turn); }
    }
  }
  async function reset() {
    if (active.current || busy) return;
    active.current = true; setLoading(true);
    try {
      const response = await fetch('/api/scout', { method: 'DELETE' });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || copy.failure); }
      setMessages([]); setPartial(''); setFailed(null); setError(''); setDraft(''); setExpiresAt(null);
    } catch (e) { setError(e instanceof Error ? e.message : copy.failure); }
    finally { active.current = false; setLoading(false); }
  }
  return { messages, draft, setDraft, partial, busy, loading, error, failed, send, reset };
}
export type ScoutConversationState = ReturnType<typeof useScoutConversation>;
