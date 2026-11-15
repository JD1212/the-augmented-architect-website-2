import type { ScoutEvent } from './contracts';

/** NDJSON framing survives UTF-8 characters and JSON records split across chunks. */
export async function readScoutStream(response: Response, receive: (event: ScoutEvent) => void) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Missing response stream');
  const decoder = new TextDecoder();
  let buffer = '', terminal = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (buffer.length > 600000) throw new Error('Response too large');
      let lineEnd: number;
      while ((lineEnd = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, lineEnd); buffer = buffer.slice(lineEnd + 1);
        if (!line.trim()) continue;
        if (terminal) throw new Error('Unexpected stream event');
        const event = JSON.parse(line) as ScoutEvent;
        if (!['delta', 'done', 'error'].includes(event.type)) throw new Error('Invalid stream event');
        terminal = event.type !== 'delta'; receive(event);
      }
      if (done) break;
    }
    if (!terminal || buffer.trim()) throw new Error('Incomplete response stream');
  } finally { reader.releaseLock(); }
}
