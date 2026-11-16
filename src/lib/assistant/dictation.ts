/** Browser-owned speech recognition. No audio collection, networking or message submission. */
export type RecognitionResult = { readonly 0: { transcript: string } };
export type RecognitionEvent = { results: ArrayLike<RecognitionResult> };
export type Recognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  onstart: (() => void) | null; onend: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null; onnomatch: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
export type RecognitionConstructor = new () => Recognition;
export type DictationStatus = 'idle' | 'starting' | 'listening' | 'stopping';
export type DictationError = 'denied' | 'network' | 'unavailable' | 'noSpeech' | 'failed' | 'tooLong';
export function recognitionConstructor(scope: { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }) {
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

/** Own only the current dictated span. Edits outside it survive interim replacements. */
export function createDictationDraft(initial: string, maxLength = 1000) {
  let text = initial, start = text.length, end = start, ignored = 0, resultCount = 0;
  return {
    edit(next: string) {
      let first = 0, suffix = 0;
      while (first < text.length && first < next.length && text[first] === next[first]) first++;
      while (suffix < text.length - first && suffix < next.length - first && text[text.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix++;
      const oldEnd = text.length - suffix, delta = next.length - text.length;
      if (oldEnd <= start) { start += delta; end += delta; }
      else if (first < end) {
        // A visitor edited the speech itself: their edit wins over later corrections.
        ignored = resultCount; start = end = next.length;
      }
      text = next;
    },
    result(results: ArrayLike<RecognitionResult>) {
      resultCount = results.length;
      const words = Array.from(results).slice(ignored).map(r => r[0].transcript.trim()).filter(Boolean).join(' ');
      const separator = start > 0 && !/\s$/.test(text.slice(0, start)) && words ? ' ' : '';
      const available = Math.max(0, maxLength - (text.length - (end - start)));
      const inserted = (separator + words).slice(0, available);
      text = text.slice(0, start) + inserted + text.slice(end); end = start + inserted.length;
      return { text, full: words.length + separator.length > available };
    },
  };
}

export function createDictation(options: {
  Constructor: RecognitionConstructor; lang: string; onDraft: (text: string) => void;
  onStatus: (status: DictationStatus) => void; onError: (error: DictationError | null) => void;
  timeouts?: { startup: number; silence: number; stop: number };
}) {
  let active: Recognition | null = null, draft: ReturnType<typeof createDictationDraft> | null = null;
  let heard = false, stopping = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const durations = options.timeouts ?? { startup: 15000, silence: 12000, stop: 1500 };
  const clear = () => { clearTimeout(timer); timer = undefined; };
  const detach = (recognition: Recognition) => {
    recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = recognition.onnomatch = null;
  };
  const release = (abort: boolean, notify = true) => {
    clear(); const previous = active; active = null; draft = null; stopping = false;
    if (previous) { detach(previous); if (abort) { try { previous.abort(); } catch { /* Already ended. */ } } }
    if (notify) options.onStatus('idle');
  };
  function stop() {
    if (!active || stopping) return;
    stopping = true; clear(); options.onStatus('stopping');
    try { active.stop(); } catch { release(true); return; }
    // Some implementations omit end after stop; never leave a stuck recording UI.
    if (active) timer = setTimeout(() => release(true), durations.stop);
  }
  return {
    start(text: string) {
      if (active) return;
      options.onError(null);
      if (text.length >= 1000) { options.onError('tooLong'); return; }
      let recognition: Recognition;
      try { recognition = new options.Constructor(); } catch { options.onError('unavailable'); return; }
      active = recognition; draft = createDictationDraft(text); heard = false; stopping = false;
      recognition.continuous = true; recognition.interimResults = true; recognition.lang = options.lang;
      options.onStatus('starting');
      recognition.onstart = () => {
        if (active !== recognition || stopping) return;
        clear(); options.onStatus('listening');
        timer = setTimeout(() => { options.onError('noSpeech'); stop(); }, durations.silence);
      };
      recognition.onresult = event => {
        if (active !== recognition || !draft) return;
        clear(); const result = draft.result(event.results); heard = true; options.onDraft(result.text);
        if (result.full) { options.onError('tooLong'); stop(); }
        else if (!stopping) timer = setTimeout(stop, durations.silence);
        else timer = setTimeout(() => release(true), durations.stop);
      };
      recognition.onerror = event => {
        if (active !== recognition) return;
        if (!(stopping && event.error === 'aborted')) options.onError(
          ['not-allowed', 'service-not-allowed'].includes(event.error) ? 'denied' :
          event.error === 'network' ? 'network' : event.error === 'no-speech' ? 'noSpeech' :
          ['audio-capture', 'language-not-supported'].includes(event.error) ? 'unavailable' : 'failed');
        release(true);
      };
      recognition.onnomatch = () => { if (active === recognition) { options.onError('noSpeech'); stop(); } };
      recognition.onend = () => { if (active === recognition) { if (!heard && !stopping) options.onError('noSpeech'); release(false); } };
      timer = setTimeout(() => { options.onError('unavailable'); release(true); }, durations.startup);
      try { recognition.start(); } catch (error) {
        const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
        options.onError(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed'); release(true);
      }
    },
    edit(text: string) { draft?.edit(text); options.onDraft(text); },
    stop,
    cancel() { release(true); },
    dispose() { release(true, false); },
  };
}
