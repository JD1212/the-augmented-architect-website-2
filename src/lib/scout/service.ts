import 'server-only';
import { randomUUID } from 'node:crypto';
import { scoutLimits, turnMessages, type ScoutEvent, type Turn } from './contracts';
import { ScoutError, temporaryFailure } from './errors';
import type { ScoutStore } from './store';
import type { ScoutModel } from './agent';
import { anonymousSessionExpiry } from './session-lifecycle';

export function createScoutService(store: ScoutStore, model: ScoutModel, modelName: string, clock = () => Date.now()) {
  async function owned(hash: string) {
    const conversation = await store.find(hash);
    if (conversation && (conversation.status !== 'active' || anonymousSessionExpiry(conversation) <= clock())) {
      throw new ScoutError(410, 'This conversation has ended. Please start a new conversation.');
    }
    return conversation;
  }
  async function history(id: string) {
    await store.expireRuns(id, new Date(clock() - scoutLimits.leaseMs).toISOString(), new Date(clock()).toISOString());
    return store.turns(id);
  }
  return {
    async restore(hash: string) {
      const conversation = await owned(hash);
      if (!conversation) return { messages: [], busy: false, failed: null, expiresInMs: null };
      const turns = await history(conversation.id);
      const last = turns.at(-1);
      return { messages: turnMessages(turns), busy: turns.some(t => ['running', 'pending'].includes(t.status)),
        expiresInMs: Math.max(0, anonymousSessionExpiry(conversation) - clock()),
        failed: last?.status === 'failed' ? { id: last.client_turn_id, message: last.user_message } : null };
    },
    async reset(hash: string) {
      const conversation = await owned(hash).catch(error => { if (error instanceof ScoutError && error.status === 410) return null; throw error; });
      if (!conversation) return;
      const turns = await history(conversation.id);
      if (turns.some(t => ['running', 'pending'].includes(t.status))) throw new ScoutError(409, 'Please wait for the current reply before starting a new conversation.');
      await store.close(conversation.id);
    },
    async prepare(hash: string, message: string, clientTurnId: string, visitorTimezone?: string) {
      // Verify model access before making any persistent conversation or turn.
      try { await model.verify(); } catch { throw new ScoutError(503, 'Scout cannot connect right now. Please try again later.'); }
      const now = new Date(clock()).toISOString();
      const conversation = await owned(hash) ?? await store.create(hash, now, new Date(clock() + scoutLimits.sessionSeconds * 1000).toISOString());
      if (conversation.status !== 'active' || anonymousSessionExpiry(conversation) <= clock()) throw new ScoutError(410, 'Please start a new conversation.');
      const turns = await history(conversation.id);
      const existing = turns.find(t => t.client_turn_id === clientTurnId);
      if (existing && existing.user_message !== message) throw new ScoutError(409, 'That retry belongs to a different message. Please start a new message.');
      if (existing?.status === 'completed') return { replay: turnMessages(turns), expiresInMs: Math.max(0, anonymousSessionExpiry(conversation) - clock()), execute: null };
      if (turns.some(t => ['pending', 'running'].includes(t.status))) throw new ScoutError(409, 'A reply is already in progress. Please wait a moment, then retry.');
      if (existing && existing !== turns.at(-1)) throw new ScoutError(409, 'Only the latest unanswered message can be retried.');
      if ((existing?.agent_state.attempts ?? 0) >= scoutLimits.attempts) throw new ScoutError(429, 'Please start a new conversation or visit Contact to discuss your project.');
      if (!existing && (turns.length >= scoutLimits.turns || turns.filter(t => Date.parse(t.created_at) > clock() - 3600000).length >= scoutLimits.hourlyTurns)) {
        throw new ScoutError(429, 'You have reached this conversation’s message limit. Please return later or visit Contact.');
      }
      const turn: Turn = { id: existing?.id ?? randomUUID(), conversation_id: conversation.id, client_turn_id: clientTurnId,
        turn_number: existing?.turn_number ?? (turns.at(-1)?.turn_number ?? 0) + 1, user_message: message, assistant_message: null,
        status: 'running', created_at: existing?.created_at ?? now, started_at: now, completed_at: null,
        agent_state: { attempts: (existing?.agent_state.attempts ?? 0) + 1 } };
      const claimed = await store.claim(turn, Boolean(existing));
      const context = turnMessages(turns.filter(t => t.status === 'completed').slice(-12));
      // Bound the replayed context as well as the number of messages.
      while (context.length && context.reduce((size, item) => size + item.content.length, 0) > 24000) context.splice(0, 2);
      context.push({ id: clientTurnId, role: 'user', content: message });
      return { replay: null, execute: async (signal: AbortSignal, emit: (event: ScoutEvent) => void) => {
        try {
          let characters = 0;
          const reply = await model.reply(context, signal, text => {
            characters += text.length;
            if (characters > scoutLimits.outputCharacters || signal.aborted) throw new Error('Reply interrupted');
            emit({ type: 'delta', text });
          }, {ownerHash:hash,visitorTimezone});
          if (!reply.text.trim() || reply.text.length > scoutLimits.outputCharacters || signal.aborted) throw new Error('Incomplete response');
          await store.finish(claimed, reply.text, { model: modelName, usage: reply.usage });
          emit({ type: 'done', expiresInMs: scoutLimits.sessionSeconds * 1000, messages: turnMessages([...turns.filter(t => t.id !== claimed.id), { ...claimed, status: 'completed', assistant_message: reply.text }]) });
        } catch {
          // Never expose provider errors, prompts, database details or credentials.
          await store.finish(claimed, null).catch(() => undefined);
          emit({ type: 'error', message: temporaryFailure });
        }
      } };
    },
  };
}
