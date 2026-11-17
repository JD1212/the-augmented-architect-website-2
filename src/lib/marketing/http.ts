import 'server-only';
import { MarketingError } from './config';

export const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow', 'Vary': 'Cookie', 'Referrer-Policy': 'no-referrer' };
export function privateJson(value: unknown, status = 200) { return Response.json(value, { status, headers: privateHeaders }); }
export function marketingFailure(error: unknown) {
  return privateJson({ error: error instanceof MarketingError ? error.message : 'This private service is temporarily unavailable. Please retry.' }, error instanceof MarketingError ? error.status : 503);
}
export function sameOrigin(request: Request, mutation = false) {
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (mutation && request.headers.get('origin') !== new URL(request.url).origin)) throw new MarketingError(403, 'Please use the owner portal on this website.');
}
export async function privateBody(request: Request) {
  sameOrigin(request, true);
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new MarketingError(415, 'JSON is required.');
  const reader = request.body?.getReader();
  if (!reader) throw new MarketingError(400, 'A request body is required.');
  const chunks: Uint8Array[] = []; let length = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > 4096) { await reader.cancel(); throw new MarketingError(413, 'Request is too large.'); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  try { const value = JSON.parse(Buffer.concat(chunks).toString()); if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(); return value as Record<string, unknown>; } catch { throw new MarketingError(400, 'Invalid JSON.'); }
}
