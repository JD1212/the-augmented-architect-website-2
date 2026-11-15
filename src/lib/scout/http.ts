import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { scoutLimits } from './contracts';
import { ScoutError, temporaryFailure } from './errors';
import type { createScoutService } from './service';

type Service = ReturnType<typeof createScoutService>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

// Bounded, process-local IP abuse control. Persistent per-conversation caps and
// execution exclusion live in the DB. Do not claim this is a distributed IP limiter.
export function createRequestLimiter(clock = () => Date.now()) {
  const entries = new Map<string, { count: number; until: number }>();
  return (request: Request, action: string, maximum: number, windowMs: number) => {
    const address = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for') ?? 'unknown' : 'local';
    const key = `${action}:${digest(address)}`;
    const now = clock();
    for (const [id, entry] of entries) if (entry.until <= now) entries.delete(id);
    const previous = entries.get(key);
    if ((previous?.count ?? 0) >= maximum || (!previous && entries.size >= 10000)) throw new ScoutError(429, 'Please wait a little before trying Scout again.');
    entries.set(key, { count: (previous?.count ?? 0) + 1, until: previous?.until ?? now + windowMs });
  };
}

type RequestLimit = (request: Request, action: string, maximum: number, windowMs: number) => void | Promise<void>;
export function createScoutHandlers(getService: () => Service, limit: RequestLimit = createRequestLimiter()) {
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff' };
  const cookieName = () => process.env.NODE_ENV === 'production' ? '__Host-scout_session' : 'scout_session';
  const cookie = (token: string) => `${cookieName()}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${scoutLimits.sessionSeconds}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  const session = (request: Request) => {
    const values = request.headers.get('cookie')?.split(';').map(v => v.trim())
      .filter(v => v.startsWith(`${cookieName()}=`)).map(v => v.slice(cookieName().length + 1)) ?? [];
    // Cookie headers omit Path. Never guess an owner when legacy paths send
    // multiple same-name credentials, even if one happens to be first.
    return values.length === 1 && tokenPattern.test(values[0]) ? values[0] : null;
  };
  function issueSession(response: Response, token: string) {
    response.headers.append('Set-Cookie', cookie(token));
    // A Path=/ replacement cannot overwrite a legacy /api/scout cookie.
    // __Host- cookies already require Path=/, so keep their strict scope intact.
    if (cookieName() === 'scout_session') for (const path of ['/api', '/api/', '/api/scout', '/api/scout/']) {
      response.headers.append('Set-Cookie', `${cookieName()}=; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
    }
    return response;
  }
  const welcome = () => ({ messages: [], busy: false, failed: null, expiresInMs: null, sessionReset: true });
  function checkOrigin(request: Request, mutation = false) {
    if (request.headers.get('sec-fetch-site') === 'cross-site' || (mutation && request.headers.get('origin') !== new URL(request.url).origin)) throw new ScoutError(403, 'Please open Scout on this website to continue.');
  }
  function failure(error: unknown) {
    return Response.json({ error: error instanceof ScoutError ? error.message : temporaryFailure }, { status: error instanceof ScoutError ? error.status : 503, headers });
  }
  return {
    async GET(request: Request) {
      try {
        checkOrigin(request); await limit(request, 'read', 90, 60000);
        const token = session(request);
        // Opening the greeting may set a cookie, but never creates a DB conversation.
        if (!token) return issueSession(Response.json(welcome(), { headers }), randomBytes(32).toString('base64url'));
        try {
          return Response.json({ ...await getService().restore(digest(token)), sessionReset: false }, { headers });
        } catch (error) {
          if (!(error instanceof ScoutError && error.status === 410)) throw error;
          // Rotate ownership after inactivity; keep the prior database records intact.
          return issueSession(Response.json(welcome(), { headers }), randomBytes(32).toString('base64url'));
        }
      } catch (error) { return failure(error); }
    },
    async DELETE(request: Request) {
      try {
        checkOrigin(request, true); await limit(request, 'reset', 5, 3600000);
        const token = session(request);
        if (token) await getService().reset(digest(token));
        return issueSession(Response.json(welcome(), { headers }), randomBytes(32).toString('base64url'));
      } catch (error) { return failure(error); }
    },
    async POST(request: Request) {
      try {
        checkOrigin(request, true); await limit(request, 'send', 20, 60000);
        if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ScoutError(415, 'Please send a text message through Scout.');
        const token = session(request);
        if (!token) throw new ScoutError(401, 'Please reopen Scout to begin a secure conversation.');
        // Bound the actual stream, not just the client-supplied Content-Length.
        const reader = request.body?.getReader();
        if (!reader) throw new ScoutError(400, 'Please enter a message.');
        let body = ''; const decoder = new TextDecoder(); let bytes = 0;
        try { while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length;
          if (bytes > 6000) { await reader.cancel(); throw new ScoutError(413, 'Please keep your message under 1,000 characters.'); }
          body += decoder.decode(value, { stream: true });
        } body += decoder.decode(); } finally { reader.releaseLock(); }
        let parsed: unknown;
        try { parsed = JSON.parse(body); } catch { throw new ScoutError(400, 'Please enter a valid message.'); }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new ScoutError(400, 'Please enter a valid message.');
        const input = parsed as Record<string, unknown>;
        if (Object.keys(input).some(key => !['message', 'clientTurnId'].includes(key)) || typeof input.message !== 'string' || !input.message.trim() || input.message.trim().length > scoutLimits.inputCharacters || typeof input.clientTurnId !== 'string' || !uuid.test(input.clientTurnId)) throw new ScoutError(400, 'Please enter a message under 1,000 characters.');
        const prepared = await getService().prepare(digest(token), input.message.trim(), input.clientTurnId);
        const controller = new AbortController();
        const signal = AbortSignal.any([request.signal, controller.signal, AbortSignal.timeout(scoutLimits.executionMs)]);
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(output) {
            let connected = true;
            const emit = (event: unknown) => { if (!connected) return; try { output.enqueue(encoder.encode(JSON.stringify(event) + '\n')); } catch { connected = false; controller.abort(); } };
            try {
              if (prepared.replay) emit({ type: 'done', messages: prepared.replay, expiresInMs: prepared.expiresInMs });
              else await prepared.execute!(signal, emit);
            } catch { emit({ type: 'error', message: temporaryFailure }); }
            finally { if (connected) { try { output.close(); } catch { /* Reader disconnected. */ } } }
          },
          cancel() { controller.abort(); },
        });
        return issueSession(new Response(stream, { headers: { ...headers, 'Content-Type': 'application/x-ndjson; charset=utf-8', 'X-Accel-Buffering': 'no' } }), token);
      } catch (error) {
        if (error instanceof ScoutError && (error.status === 410 || error.status === 401)) {
          return issueSession(Response.json({ error: error.message, code: 'scout_session_reset' }, { status: error.status, headers }), randomBytes(32).toString('base64url'));
        }
        return failure(error);
      }
    },
  };
}
