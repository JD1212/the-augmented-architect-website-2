export type ScoutMessage = { id: string; role: 'user' | 'assistant'; content: string };
export type ScoutEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; messages: ScoutMessage[] }
  | { type: 'error'; message: string };

export const scoutLimits = {
  inputCharacters: 1000, outputCharacters: 12000, turns: 40,
  hourlyTurns: 20, attempts: 3, executionMs: 45000, leaseMs: 120000,
  sessionSeconds: 7 * 24 * 60 * 60,
} as const;

export type Conversation = {
  id: string; session_token_hash: string; status: string;
  created_at: string; expires_at: string;
};
export type Turn = {
  id: string; conversation_id: string; turn_number: number; client_turn_id: string;
  user_message: string; assistant_message: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string; started_at: string | null; completed_at: string | null;
  agent_state: { attempts?: number };
};

export function turnMessages(turns: Turn[]): ScoutMessage[] {
  return turns.flatMap(turn => [
    { id: turn.client_turn_id, role: 'user' as const, content: turn.user_message },
    ...(turn.status === 'completed' && turn.assistant_message
      ? [{ id: `${turn.client_turn_id}-reply`, role: 'assistant' as const, content: turn.assistant_message }] : []),
  ]);
}
