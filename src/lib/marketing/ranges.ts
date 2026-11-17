import type { DateRange } from './types';

export function reportingRange(value: string | null, now = new Date()): DateRange {
  const days = value === '7' ? 7 : value === '90' ? 90 : 28;
  // Exclude today for both providers; Search Console final data can still lag.
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - days + 1);
  return { days, start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
export function publicPath(value: string): string | undefined {
  if (value === '(not set)') return undefined;
  try {
    const url = new URL(value, 'https://theaugmentedarchitect.com');
    if (!['theaugmentedarchitect.com', 'www.theaugmentedarchitect.com'].includes(url.hostname) || !['https:','http:'].includes(url.protocol) || url.username || url.password) return undefined;
    const path = url.pathname.replace(/\/+$/, '') || '/';
    return /^\/(admin|api)(\/|$)/.test(path) ? undefined : path;
  } catch { return undefined; }
}
