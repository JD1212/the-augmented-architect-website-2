import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { authConfig, MarketingError, marketingTenant, ownerIds } from './config';

export async function ownerAuth() {
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
export async function ownerIdentity(db: Awaited<ReturnType<typeof ownerAuth>>) {
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new MarketingError(401, 'Please sign in.');
  if (!data.user.email_confirmed_at || data.user.is_anonymous || !ownerIds().has(data.user.id)) throw new MarketingError(403, 'This account does not have owner access.');
  return data.user;
}
export async function requireOwner(db: Awaited<ReturnType<typeof ownerAuth>>) {
  const user = await ownerIdentity(db);
  const { data, error } = await db.auth.getClaims();
  if (error || data?.claims.sub !== user.id || data.claims.aal !== 'aal2') throw new MarketingError(403, 'Authenticator verification is required.');
  // Database authorization also checks the live Auth session, active membership and AAL2.
  const access = await db.rpc('marketing_authorized', { p_tenant: marketingTenant });
  if (access.error) throw new MarketingError(503, 'Owner database access is not configured or temporarily unavailable.');
  if (access.data !== true) throw new MarketingError(403, 'Owner membership or session is no longer active.');
  return { db, user, tenantId: marketingTenant };
}
