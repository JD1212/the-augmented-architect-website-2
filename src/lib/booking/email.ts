/** Normalize one extracted scheduling-email field, never a draft or conversation message. */
export function normalizeSchedulingEmail(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 254 || /[\x00-\x1f\x7f\u200b-\u200d\u2060\ufeff]/.test(value)) return null;
  // Dictation can split punctuation across recognition chunks. Only remove
  // horizontal whitespace next to explicit email delimiters; never join words.
  const email = value.trim().replace(/[ \u00a0\u202f]*([@.])[ \u00a0\u202f]*/g, '$1');
  if (!/^[^\s@<>,;:"()[\]\\]+@[^\s@<>,;:"()[\]\\]+\.[^\s@<>,;:"()[\]\\]+$/.test(email)) return null;
  const [local, domain] = email.split('@');
  if (local.startsWith('.') || local.endsWith('.') || domain.startsWith('.') || domain.endsWith('.') || email.includes('..')) return null;
  return email.toLowerCase(); // Preserve the existing scheduling address policy.
}
