import { randomUUID } from 'node:crypto';
import { loadScoutModule } from './scout-loader.mjs';
export function scoutFixture(reply = 'We can help you connect your business systems.') {
  let now = Date.now();
  const conversations = [], turns = [], inputs = [];
  const cache = new Map();
  const { ScoutError } = loadScoutModule('src/lib/scout/errors.ts', {}, cache);
  const clone = value => structuredClone(value);
  const store = {
    async find(hash) { return clone(conversations.find(c => c.session_token_hash === hash) ?? null); },
    async create(hash, created_at, expires_at) {
      const old = conversations.find(c => c.session_token_hash === hash);
      if (old) return clone(old);
      const c = { id: randomUUID(), session_token_hash: hash, created_at, expires_at, status: 'active' };
      conversations.push(c); return clone(c);
    },
    async turns(id) { return clone(turns.filter(t => t.conversation_id === id).sort((a,b) => a.turn_number-b.turn_number)); },
    async claim(turn, retry) {
      const old = turns.find(t => t.id === turn.id);
      if (retry) {
        if (old?.status !== 'failed') throw new ScoutError(409, 'Reply already in progress');
        Object.assign(old, clone(turn)); return clone(old);
      }
      if (turns.some(t => t.conversation_id === turn.conversation_id && (t.turn_number === turn.turn_number || t.client_turn_id === turn.client_turn_id))) throw new ScoutError(409, 'Reply already in progress');
      turns.push(clone(turn)); return clone(turn);
    },
    async finish(turn, answer) {
      const old = turns.find(t => t.id === turn.id && t.started_at === turn.started_at && t.status === 'running');
      if (!old) throw Error('Stale claim');
      Object.assign(old, { status: answer ? 'completed' : 'failed', assistant_message: answer, completed_at: new Date(now).toISOString() });
    },
    async expireRuns(id, before, at) {
      for (const t of turns) if (t.conversation_id === id && ['pending','running'].includes(t.status) && t.started_at < before) Object.assign(t, { status:'failed', completed_at:at });
    },
    async close(id) { conversations.find(c => c.id === id).status = 'closed'; },
  };
  const model = {
    calls: 0, fail: false, unavailable: false,
    async verify() { if (this.unavailable) throw Error('Private model configuration'); },
    async reply(messages, signal, delta) {
      this.calls++; inputs.push(clone(messages));
      if (this.fail) { delta('Partial reply'); throw Error('PRIVATE_PROVIDER_DIAGNOSTIC'); }
      if (signal.aborted) throw Error('Aborted');
      for (const text of [reply.slice(0,10),reply.slice(10)]) delta(text);
      return { text: reply, usage: { input_tokens:12,output_tokens:8 } };
    },
  };
  const { createScoutService } = loadScoutModule('src/lib/scout/service.ts', {}, cache);
  const service = createScoutService(store, model, 'mock-model', () => now);
  return { store, service, model, conversations, turns, inputs, cache, tick(ms) { now += ms; } };
}
