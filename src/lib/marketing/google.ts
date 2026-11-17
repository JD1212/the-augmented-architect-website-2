import 'server-only';
import { GoogleAuth } from 'google-auth-library';
import { MarketingError } from './config';

const scopes = ['https://www.googleapis.com/auth/analytics.readonly', 'https://www.googleapis.com/auth/webmasters.readonly'];
let auth: GoogleAuth | undefined;
export function googleReportingConfigured() { return !!process.env.GOOGLE_MARKETING_SERVICE_ACCOUNT_JSON; }
export async function reportingRequest(url: string, body: object): Promise<unknown> {
  // Destinations are fixed in provider adapters, never accepted from a visitor or agent.
  if (!/^https:\/\/(analyticsdata|searchconsole)\.googleapis\.com\//.test(url)) throw new MarketingError(500, 'Unsupported reporting provider.');
  if (!auth) {
    let credentials;
    try { credentials = JSON.parse(process.env.GOOGLE_MARKETING_SERVICE_ACCOUNT_JSON ?? ''); } catch { throw new MarketingError(503, 'Google reporting credentials need configuration.'); }
    if (credentials.type !== 'service_account' || !credentials.client_email?.endsWith('.iam.gserviceaccount.com') || !credentials.private_key) throw new MarketingError(503, 'Google reporting credentials need configuration.');
    // Never reuse the application's Calendar/Gmail OAuth connection.
    auth = new GoogleAuth({ credentials, scopes });
  }
  const client = await auth.getClient();
  try {
    const result = await client.request({ url, method: 'POST', data: body, timeout: 15000, retry: false });
    return result.data;
  } catch (error) {
    // Provider errors can contain credentials, query values or private response bodies.
    const status = (error as { response?: { status?: number } }).response?.status;
    throw new MarketingError(503, status === 401 || status === 403 ? 'Google access was denied. Check API enablement and read-only property permissions.' : status === 429 ? 'Google reporting quota is temporarily limited. Please retry later.' : 'Google reporting is temporarily unavailable. Please retry.');
  }
}
