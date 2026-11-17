import 'server-only';
import { MarketingError } from './config';

export const reportingScopes = ['https://www.googleapis.com/auth/analytics.readonly', 'https://www.googleapis.com/auth/webmasters.readonly'];
export function federationConfig(env = process.env) {
  const number = env.GOOGLE_MARKETING_PROJECT_NUMBER;
  const pool = env.GOOGLE_MARKETING_POOL_ID;
  const provider = env.GOOGLE_MARKETING_PROVIDER_ID;
  const account = env.GOOGLE_MARKETING_SERVICE_ACCOUNT_EMAIL;
  if (!number || !/^\d{6,20}$/.test(number) || !pool || !/^[a-z][a-z0-9-]{3,31}$/.test(pool) || !provider || !/^[a-z][a-z0-9-]{3,31}$/.test(provider) || account !== 'marketing-intelligence-reader@the-augmented-architect-web.iam.gserviceaccount.com') {
    throw new MarketingError(503, 'Configure the dedicated keyless Google reporting connection.');
  }
  return {
    audience: `//iam.googleapis.com/projects/${number}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`,
    impersonationUrl: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${account}:generateAccessToken`,
  };
}
