import 'server-only';

export const marketingTenant = 'b329164a-f981-4acc-befc-2f0c70f8af10';
export const searchProperty = 'sc-domain:theaugmentedarchitect.com';
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class MarketingError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function ownerIds(env = process.env) {
  return new Set((env.MARKETING_OWNER_IDS ?? '').split(',').map(id => id.trim()).filter(id => uuidPattern.test(id)));
}
export function authConfig(env = process.env) {
  if (env.SUPABASE_URL !== 'https://cjldcaiybqguklzqtdjj.supabase.co' || !env.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')) {
    throw new MarketingError(503, 'Owner authentication is not configured. Contact the site owner.');
  }
  return { url: env.SUPABASE_URL, key: env.SUPABASE_PUBLISHABLE_KEY };
}
