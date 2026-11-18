import 'server-only';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { authConfig, MarketingError, marketingTenant, ownerIds } from './config';

export async function ownerAuth() {
  // Auth SDK session expiry reads the clock. Never evaluate it during prerendering.
  await connection();
  const jar = await cookies();
  const { url, key } = authConfig();
  return createServerClient(url, key, {
    cookieOptions: { name: 'aa-owner-auth', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400 },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => { try { for (const { name, value, options } of values) jar.set(name, value, options); } catch { /* Server Components are read-only; /admin proxy refreshes cookies first. */ } },
    },
  });
}
// Reusable verified identity for future role-specific portals. It grants no role.
export async function verifiedIdentity(db: Awaited<ReturnType<typeof ownerAuth>>) {
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new MarketingError(401, 'Please sign in.');
  if (!data.user.email_confirmed_at || data.user.is_anonymous) throw new MarketingError(403, 'A verified account is required.');
  return data.user;
}
export async function ownerIdentity(db: Awaited<ReturnType<typeof ownerAuth>>) {
  const user=await verifiedIdentity(db);
  if(!ownerIds().has(user.id))throw new MarketingError(403, 'This account does not have owner access.');
  return user;
}
export async function ownerAccess(db: Awaited<ReturnType<typeof ownerAuth>>) {
  const user = await ownerIdentity(db);
  const { data, error } = await db.auth.getClaims();
  if (error || data?.claims.sub !== user.id || !['aal1','aal2'].includes(String(data.claims.aal))) throw new MarketingError(403, 'A verified owner session is required.');
  // Role, live-session ownership and the optional MFA policy are enforced in SQL
  // as well as at every page/API boundary. Password login grants no broader role.
  const access = await db.rpc('marketing_owner_status', { p_tenant: marketingTenant });
  if (access.error) throw new MarketingError(503, 'Owner database access is not configured or temporarily unavailable.');
  if (!['allowed','mfa_required'].includes(access.data)) throw new MarketingError(403, 'Owner membership or session is no longer active.');
  return { db, user, tenantId: marketingTenant, state: access.data as 'allowed'|'mfa_required' };
}
export async function requireOwner(db: Awaited<ReturnType<typeof ownerAuth>>) {
  const access=await ownerAccess(db);
  if(access.state!=='allowed')throw new MarketingError(403, 'Authenticator verification is required by this account’s opted-in policy.');
  return access;
}
