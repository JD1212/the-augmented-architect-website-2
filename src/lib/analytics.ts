import { privacy } from '@/content/privacy';

export const consentKey = 'aa.analytics.consent.v1';
const dedupeKey = 'aa.analytics.events.v1';
const armedKey = 'aa.analytics.pending.v1';
export const publicPages: Record<string, string> = {
  '/': 'The Augmented Architect', '/ai-solutions': 'AI Solutions', '/salesforce': 'Salesforce Modernization',
  '/custom-applications': 'Custom Business Applications', '/about': 'About', '/contact': 'Contact', '/book': 'Book a Consultation',
  '/our-approach': 'Our Approach', '/our-approach/philosophy': 'Our Philosophy',
  '/our-approach/ai-architecture': 'AI & Architecture', '/our-approach/salesforce': 'Our Approach to Salesforce', '/privacy': privacy.title,
};
export type ConsentChoice = 'granted' | 'denied';
declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; [key: `ga-disable-${string}`]: boolean }
}
const denied = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
let active = false, initialized = false, measurementId = '', currentPath = '', previousPath = '';
let seen = new Set<string>();
const armed = new Set<string>();
const win = () => window;
export function readConsent(raw: string | null, now = Date.now()): ConsentChoice | null {
  try { const value = JSON.parse(raw ?? 'null'); return value?.version === 1 && ['granted', 'denied'].includes(value.choice) && Number.isFinite(value.expires) && value.expires > now ? value.choice : null; } catch { return null; }
}
export function saveConsent(choice: ConsentChoice) {
  try { localStorage.setItem(consentKey, JSON.stringify({ version: 1, choice, expires: Date.now() + 180 * 86400000 })); } catch { /* The explicit choice still applies for this visit. */ }
}
export function browserAllowsAnalytics() {
  return !navigator.webdriver && navigator.doNotTrack !== '1' && !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
}
function command(...args: unknown[]) { try { win().gtag?.(...args); } catch { /* Optional analytics must never interrupt the website or booking. */ } }
function debugEnabled() { try { return localStorage.getItem('aa.analytics.debug') === '1'; } catch { return false; } }
function pageContext(path: string) {
  const safe = publicPages[path] ? path : '/';
  return { page_location: 'https://theaugmentedarchitect.com' + safe, page_title: publicPages[safe], page_referrer: previousPath ? 'https://theaugmentedarchitect.com' + previousPath : safeReferrer(document.referrer) };
}
function mark(key: string) {
  if (seen.has(key)) return false;
  seen.add(key);
  try { sessionStorage.setItem(dedupeKey, JSON.stringify([...seen].slice(-200))); } catch { /* Memory deduplication remains active. */ }
  return true;
}
export function safeReferrer(referrer: string) {
  try { const url = new URL(referrer); if (!['https:', 'http:'].includes(url.protocol)) return ''; return url.origin === 'https://theaugmentedarchitect.com' && publicPages[url.pathname] ? url.origin + url.pathname : url.origin; } catch { return ''; }
}
export function startAnalytics(id: string, path: string, choice: ConsentChoice | null) {
  if (choice !== 'granted' || !/^G-[A-Z0-9]+$/.test(id) || !publicPages[path] || !browserAllowsAnalytics()) return false;
  const wasActive = active;
  active = true; measurementId = id; win()[`ga-disable-${id}`] = false;
  if (!initialized) {
    initialized = true;
    win().dataLayer ??= [];
    win().gtag = function () {
      // Preserve Google's documented gtag command-queue shape.
      // eslint-disable-next-line prefer-rest-params
      win().dataLayer!.push(arguments);
    };
    try { const stored = JSON.parse(sessionStorage.getItem(dedupeKey) ?? '[]'); if (Array.isArray(stored)) seen = new Set(stored.filter(key => typeof key === 'string')); } catch { /* No persisted dedupe state. */ }
    try { const stored = JSON.parse(sessionStorage.getItem(armedKey) ?? '[]'); if (Array.isArray(stored)) for (const id of stored) if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) armed.add(id); } catch { /* No pending measurement state. */ }
    command('consent', 'default', denied);
    command('consent', 'update', { ...denied, analytics_storage: 'granted' });
    command('set', 'ads_data_redaction', true);
    command('set', 'url_passthrough', false);
    command('set', { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, ...pageContext(path), ...(debugEnabled() ? { debug_mode: true } : {}) });
    command('js', new Date());
    command('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, ...pageContext(path), ...(debugEnabled() ? { debug_mode: true } : {}) });
  }
  if (!wasActive) window.dispatchEvent?.(new Event('aa:analytics-ready'));
  return true;
}
export const analyticsActive = () => active;
function emit(name: string, parameters: Record<string, string | number> = {}) {
  if (!active || !browserAllowsAnalytics() || !publicPages[currentPath]) return;
  command('event', name, { send_to: measurementId, page_location: 'https://theaugmentedarchitect.com' + currentPath,
    page_title: publicPages[currentPath], page_referrer: previousPath ? 'https://theaugmentedarchitect.com' + previousPath : safeReferrer(document.referrer), ...(debugEnabled() ? { debug_mode: true } : {}), ...parameters });
}
export function analyticsPage(path: string) {
  if (!active || path === currentPath) return;
  previousPath = currentPath; currentPath = publicPages[path] ? path : '';
  command('set', { send_page_view: false, ...pageContext(currentPath) });
  if (currentPath) emit('page_view');
}
export function trackScoutOpen() { if (active && mark('scout_open')) emit('scout_open'); }
export function trackConsultationStart() { if (active && mark('consultation_start')) emit('consultation_start'); }
export function trackServiceEngagement(path: string) {
  const service = ({ '/ai-solutions': 'ai_solutions', '/salesforce': 'salesforce', '/custom-applications': 'custom_applications' } as Record<string, string>)[path];
  if (active && service && mark('service:' + path)) emit('service_engagement', { service, threshold_seconds: 10 });
}
function persistArmed() { try { sessionStorage.setItem(armedKey, JSON.stringify([...armed].slice(-20))); } catch { /* Memory state remains available. */ } }
export function armBooking(id: string) { if (active && /^[0-9a-f-]{36}$/i.test(id)) { trackConsultationStart(); armed.add(id); persistArmed(); } }
export function trackConfirmedBooking(id: string, source: 'scout' | 'form') {
  if (active && armed.has(id) && mark('booked:' + id)) { armed.delete(id); persistArmed(); emit('consultation_booked', { booking_channel: source }); }
}
export function stopAnalytics() {
  active = false; armed.clear(); seen.clear(); currentPath = ''; previousPath = '';
  win()[`ga-disable-${measurementId || privacy.measurementId}`] = true;
  try { sessionStorage.removeItem(dedupeKey); sessionStorage.removeItem(armedKey); } catch { /* No optional storage. */ }
  try { for (const cookie of document.cookie.split(';')) {
    const name = cookie.trim().split('=')[0]; if (name !== '_ga' && !name.startsWith('_ga_') && !name.startsWith('_gid')) continue;
    for (const domain of ['', location.hostname, '.' + location.hostname, '.theaugmentedarchitect.com']) document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? '; Domain=' + domain : ''}`;
  } } catch { /* A browser that blocks cookie access must still be able to decline analytics. */ }
  window.dispatchEvent?.(new Event('aa:analytics-ready'));
}
