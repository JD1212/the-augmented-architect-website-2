/** Display-only helpers. IANA values and UTC instants remain unchanged for APIs. */
export function browserTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}
export function timezoneLabel(timezone: string, instant: string | number | Date = new Date()) {
  try {
    const date = instant instanceof Date ? instant : new Date(instant);
    const name = new Intl.DateTimeFormat('en', { timeZone: timezone, timeZoneName: 'longGeneric' }).formatToParts(date).find(p => p.type === 'timeZoneName')?.value;
    const offset = new Intl.DateTimeFormat('en', { timeZone: timezone, timeZoneName: 'shortOffset' }).formatToParts(date).find(p => p.type === 'timeZoneName')?.value;
    return name && offset && name !== offset ? `${name} (${offset})` : name || offset || 'Local time';
  } catch { return 'Local time'; }
}
export function appointmentLabel(start: string, timezone: string) {
  return new Intl.DateTimeFormat('en', { timeZone: timezone, dateStyle: 'full', timeStyle: 'short' }).format(new Date(start)) + ' · ' + timezoneLabel(timezone, start);
}
/** Extra presentation data only; ownership, proposal fields and tool operations are untouched. */
export function schedulingDisplay<T>(result: T, timezone?: string): T {
  if (!timezone || result === null || typeof result !== 'object') return result;
  const item = result as Record<string, unknown>;
  const display = (value: unknown) => {
    if (!value || typeof value !== 'object' || typeof (value as {start?:unknown}).start !== 'string') return value;
    const slot = value as {start:string};
    return {...value, display:{start:appointmentLabel(slot.start,timezone),timezone:timezoneLabel(timezone,slot.start)}};
  };
  if (Array.isArray(result)) return result.map(display) as T;
  return {...item,...(Array.isArray(item.slots)?{slots:item.slots.map(display)}:{}),...(item.proposal?{proposal:display(item.proposal)}:{}),...(typeof item.start==='string'?{display:(display(item) as {display:unknown}).display}:{})} as T;
}
