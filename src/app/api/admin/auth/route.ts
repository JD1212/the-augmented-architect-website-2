import { ownerAccess, ownerAuth, ownerIdentity, requireOwner } from '@/lib/marketing/auth';
import { MarketingError, ownerIds, uuidPattern } from '@/lib/marketing/config';
import { privateBody, privateJson, marketingFailure, sameOrigin } from '@/lib/marketing/http';

export async function GET(request: Request) {
  try {
    sameOrigin(request);
    const db = await ownerAuth();
    const access=await ownerAccess(db);
    if(access.state==='allowed')return privateJson({stage:'ready'});
    const factors = await db.auth.mfa.listFactors();
    if (factors.error) throw new MarketingError(503, 'Authenticator status is unavailable.');
    const factor = factors.data.totp.find(f => f.status === 'verified');
    return privateJson({ stage: factor ? 'challenge' : 'enroll', factorId: factor?.id, factorName: factor ? factor.friendly_name || 'Marketing owner' : undefined });
  } catch (error) { return marketingFailure(error); }
}
export async function POST(request: Request) {
  try {
    const body = await privateBody(request), db = await ownerAuth();
    if (!ownerIds().size) throw new MarketingError(503, 'Owner access must be configured before login.');
    if (body.action === 'logout') {
      const result = await db.auth.signOut({ scope: 'local' });
      if (result.error) throw new MarketingError(503, 'Sign out could not be completed. Please retry.');
      return privateJson({ stage: 'login' });
    }
    if (body.action === 'login') {
      if (typeof body.email !== 'string' || body.email.length > 254 || typeof body.password !== 'string' || body.password.length > 256 || !body.password) throw new MarketingError(400, 'Enter your email and password.');
      const result = await db.auth.signInWithPassword({ email: body.email, password: body.password });
      if (result.error) throw new MarketingError(401, 'Sign in failed. Check your credentials or try again later.');
      try {
        const access=await ownerAccess(db);
        return privateJson({stage:access.state==='allowed'?'ready':'verify'});
      } catch(error) {
        if(error instanceof MarketingError&&error.status===403)await db.auth.signOut({scope:'local'});
        throw error;
      }
    }
    await ownerIdentity(db);
    const factors = await db.auth.mfa.listFactors();
    if (factors.error) throw new MarketingError(503, 'Authenticator status is unavailable.');
    if (body.action === 'enroll') {
      if (factors.data.totp.some(f => f.status === 'verified')) throw new MarketingError(409, 'Use your existing authenticator.');
      for (const f of factors.data.all.filter(f => f.factor_type === 'totp' && f.status === 'unverified')) {
        const removed = await db.auth.mfa.unenroll({ factorId: f.id });
        if (removed.error) throw new MarketingError(503, 'Please retry authenticator setup.');
      }
      const enrolled = await db.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Marketing owner', issuer: 'The Augmented Architect' });
      if (enrolled.error) throw new MarketingError(503, 'Authenticator enrollment is unavailable. Check Supabase MFA configuration.');
      return privateJson({ stage: 'challenge', factorId: enrolled.data.id, qr: enrolled.data.totp.qr_code });
    }
    if (body.action === 'verify') {
      if (typeof body.factorId !== 'string' || !uuidPattern.test(body.factorId) || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code) || !factors.data.all.some(f => f.factor_type === 'totp' && f.id === body.factorId)) throw new MarketingError(400, 'Enter the six-digit authenticator code.');
      const verified = await db.auth.mfa.challengeAndVerify({ factorId: body.factorId, code: body.code });
      if (verified.error) throw new MarketingError(401, 'That code could not be verified. Please try a current code.');
      await requireOwner(db);
      return privateJson({ stage: 'ready' });
    }
    throw new MarketingError(400, 'Unknown owner action.');
  } catch (error) { return marketingFailure(error); }
}
