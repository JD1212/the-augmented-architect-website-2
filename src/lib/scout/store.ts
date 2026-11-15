import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { scoutDatabaseConfig } from './config';
import { ScoutError } from './errors';
import type { Conversation, Turn } from './contracts';
import { scoutLimits } from './contracts';

export interface ScoutStore {
  find(hash: string): Promise<Conversation | null>;
  create(hash: string, now: string, expires: string): Promise<Conversation>;
  turns(id: string): Promise<Turn[]>;
  claim(turn: Turn, retry: boolean): Promise<Turn>;
  finish(turn: Turn, answer: string | null, metadata?: { model?: string; usage?: object }): Promise<void>;
  expireRuns(id: string, before: string, now: string): Promise<void>;
  close(id: string): Promise<void>;
}

export function createScoutDatabase() {
  const { url, secret } = scoutDatabaseConfig();
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store',
      signal: AbortSignal.any([AbortSignal.timeout(8000), ...(init?.signal ? [init.signal] : [])]) }) },
  });
}

export function createScoutStore(): ScoutStore {
  const db = createScoutDatabase();
  return {
    async find(hash) {
      const { data, error } = await db.from('scout_conversations').select('*').eq('session_token_hash', hash).maybeSingle();
      if (error) throw new Error('Database unavailable');
      return data as Conversation | null;
    },
    async create(hash, now, expires) {
      const { data, error } = await db.from('scout_conversations').insert({ session_token_hash: hash, created_at: now, last_activity_at: now, expires_at: expires }).select().single();
      if (error?.code === '23505') {
        const existing = await this.find(hash);
        if (existing) return existing;
      }
      if (error) throw new Error('Database unavailable');
      return data as Conversation;
    },
    async turns(id) {
      const { data, error } = await db.from('scout_conversation_turns').select('*').eq('conversation_id', id).order('turn_number').limit(41);
      if (error) throw new Error('Database unavailable');
      return data as Turn[];
    },
    async claim(turn, retry) {
      const query = retry
        ? db.from('scout_conversation_turns').update({ status: 'running', started_at: turn.started_at, completed_at: null, assistant_message: null, agent_state: turn.agent_state }).eq('id', turn.id).eq('conversation_id', turn.conversation_id).eq('status', 'failed')
        : db.from('scout_conversation_turns').insert(turn);
      const { data, error } = await query.select().maybeSingle();
      if (error?.code === '23505' || (!error && !data)) throw new ScoutError(409, 'A reply is already in progress. Please wait a moment, then retry.');
      if (error) throw new Error('Database unavailable');
      return data as Turn;
    },
    async finish(turn, answer, metadata) {
      const now = new Date(Math.max(Date.now(), Date.parse(turn.started_at!))).toISOString();
      const { data, error } = await db.from('scout_conversation_turns').update({ status: answer ? 'completed' : 'failed', assistant_message: answer,
        completed_at: now, model: metadata?.model ?? null, model_usage: metadata?.usage ?? null,
        diagnostic_metadata: answer ? null : { code: 'reply_incomplete' } })
        .eq('id', turn.id).eq('conversation_id', turn.conversation_id).eq('status', 'running').eq('started_at', turn.started_at!).select('id');
      if (error || data?.length !== 1) throw new Error('Reply persistence failed');
      // Activity updates cannot change the conversation's ownership or status.
      const { error: activityError } = await db.from('scout_conversations').update({ last_activity_at: now, expires_at: new Date(Date.parse(now) + scoutLimits.sessionSeconds * 1000).toISOString() }).eq('id', turn.conversation_id).eq('status', 'active');
      if (activityError) throw new Error('Activity persistence failed');
    },
    async expireRuns(id, before, now) {
      const { error } = await db.from('scout_conversation_turns').update({ status: 'failed', completed_at: now, diagnostic_metadata: { code: 'execution_expired' } })
        .eq('conversation_id', id).in('status', ['pending', 'running']).lt('started_at', before);
      if (error) throw new Error('Database unavailable');
    },
    async close(id) {
      const { error } = await db.from('scout_conversations').update({ status: 'closed' }).eq('id', id).eq('status', 'active');
      if (error) throw new Error('Database unavailable');
    },
  };
}
