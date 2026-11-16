import { browserTimezone } from '@/lib/display-timezone';
import { assistantContent as copy } from '@/content/assistant';
import type { ScoutMessage } from './contracts';

export type ScoutSnapshot = { messages: ScoutMessage[]; busy: boolean; failed: { id: string; message: string } | null; expiresInMs?: number | null; sessionReset?: boolean };
type Fetch = typeof fetch;

/** Confirm that the browser returned the newly issued HttpOnly credential. */
export async function fetchScoutSnapshot(signal?: AbortSignal, request: Fetch = fetch): Promise<ScoutSnapshot> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await request('/api/scout', { cache: 'no-store', credentials: 'same-origin', signal });
    const state = await response.json();
    if (!response.ok) throw new Error(state.error || copy.failure);
    if (state.sessionReset !== true) return state;
  }
  throw new Error(copy.sessionRecoveryFailure);
}

/** Only the explicit pre-execution session-reset response permits one retry.
 * Keep the original message/id; never retry a partial stream or arbitrary error.
 */
export async function submitScoutTurn(turn: { id: string; message: string }, signal: AbortSignal, reset: () => void, request: Fetch = fetch) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await request('/api/scout', { method: 'POST', credentials: 'same-origin', signal,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: turn.message, clientTurnId: turn.id, timezone: browserTimezone() }) });
    if (response.status !== 401 && response.status !== 410) return response;
    const failure = await response.json();
    if (failure.code !== 'scout_session_reset') throw new Error(failure.error || copy.failure);
    reset();
    if (attempt === 1) break;
    await fetchScoutSnapshot(signal, request);
  }
  throw new Error(copy.sessionRecoveryFailure);
}
