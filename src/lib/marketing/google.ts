import 'server-only';
import { ExternalAccountClient } from 'google-auth-library';
import { getVercelOidcToken } from '@vercel/oidc';
import { MarketingError } from './config';
import { federationConfig, reportingScopes } from './federation';

let auth: ReturnType<typeof ExternalAccountClient.fromJSON>;
export function googleReportingConfigured() { try { federationConfig(); return true; } catch { return false; } }
export async function reportingRequest(url: string, body: object, method:'POST'|'GET'='POST'): Promise<unknown> {
  // Destinations are fixed in provider adapters, never accepted from a visitor or agent.
  if (!/^https:\/\/(analyticsdata|searchconsole)\.googleapis\.com\//.test(url)) throw new MarketingError(500, 'Unsupported reporting provider.');
  if(method==='GET'&&!/^https:\/\/analyticsdata\.googleapis\.com\/v1beta\/properties\/\d+\/metadata$/.test(url))throw new MarketingError(500,'Unsupported reporting metadata.');
  const configuration = federationConfig();
  try {
    auth ??= ExternalAccountClient.fromJSON({
      type: 'external_account', audience: configuration.audience,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      token_url: 'https://sts.googleapis.com/v1/token',
      service_account_impersonation_url: configuration.impersonationUrl,
      service_account_impersonation: { token_lifetime_seconds: 900 },
      scopes: reportingScopes,
      subject_token_supplier: {
        // Never cache the subject token: the official helper reads the current
        // request token or rotating local token file at each exchange.
        getSubjectToken: () => getVercelOidcToken(),
      },
    });
    if (!auth) throw Error('Keyless client unavailable');
    const result = await auth.request({ url, method, ...(method==='POST'?{data:body}:{}), timeout: 15000, retry: false });
    return result.data;
  } catch (error) {
    // Provider errors can contain credentials, query values or private response bodies.
    const status = (error as { response?: { status?: number } }).response?.status;
    throw new MarketingError(503, status === 401 || status === 403 ? 'Google access was denied. Check federation, service-account impersonation and read-only property permissions.' : status === 429 ? 'Google reporting quota is temporarily limited. Please retry later.' : 'Keyless Google reporting is unavailable. Check federation setup or refresh the local short-lived OIDC token.');
  }
}
