import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { createScoutDatabase } from './store';
import { scoutDatabaseConfig } from './config';
import { ScoutError } from './errors';

export function createSharedRequestLimiter() {
  let db: ReturnType<typeof createScoutDatabase> | undefined;
  return async (request: Request, action: string) => {
    // Vercel overwrites this header; never trust arbitrary forwarded headers locally.
    const address = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() : 'local';
    if (!address || (process.env.VERCEL && !isIP(address))) throw new ScoutError(503, 'Scout cannot connect right now. Please try again later.');
    const { secret } = scoutDatabaseConfig();
    // A keyed digest avoids storing raw IP addresses or enumerable unsalted hashes.
    const hash = createHmac('sha256', secret).update(`scout-request-limit:v1:${address}`).digest('hex');
    db ??= createScoutDatabase();
    const { data, error } = await db.rpc('scout_consume_request_limit', { p_key_hash: hash, p_action: action });
    if (error) throw new ScoutError(503, 'Scout cannot connect right now. Please try again later.');
    if (data !== true) throw new ScoutError(429, 'Please wait a little before trying Scout again.');
  };
}
