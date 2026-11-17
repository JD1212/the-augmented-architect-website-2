import 'server-only';
import { reportingRequest } from './google';
import { searchProperty } from './config';
import { publicPath } from './ranges';
import type { DateRange, ReportingData, ReportRow, ReportTable } from './types';

type GAResponse = { rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[]; rowCount?: number; metadata?: { subjectToThresholding?: boolean; dataLossFromOtherRow?: boolean; timeZone?: string } };
type SearchResponse = { rows?: { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }[] };
function number(value: unknown) {
  const n = typeof value === 'string' && value.trim() ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) throw Error('Invalid reporting metric');
  return n;
}
function gaTable(response: GAResponse, columns: string[], path = false): ReportTable {
  if (response.rows !== undefined && !Array.isArray(response.rows)) throw Error('Invalid report rows');
  const rows = (response.rows ?? []).map(row => {
    const raw = row.dimensionValues?.map(v => v.value ?? '(not set)').join(' / ') || 'Selected period';
    if (row.metricValues?.length !== columns.length) throw Error('Incomplete reporting metrics');
    return { label: path ? publicPath(raw) ?? raw : raw, ...(path && publicPath(raw) ? { path: publicPath(raw) } : {}), values: row.metricValues.map(v => number(v.value)) };
  }).filter(row => !path || row.path);
  return { columns, rows, limited: (response.rowCount ?? rows.length) > rows.length };
}
function mergePageRows(table: ReportTable): ReportTable {
  const found = new Map<string, ReportRow>();
  for (const row of table.rows) {
    const existing = found.get(row.label);
    if (existing) existing.values = existing.values.map((v, i) => v + row.values[i]);
    else found.set(row.label, { ...row, values: [...row.values] });
  }
  return { ...table, rows: [...found.values()] };
}
export async function ga4Report(property: string, range: DateRange, request = reportingRequest): Promise<ReportingData> {
  if (!/^\d+$/.test(property)) throw Error('Numeric GA4 Property ID required');
  const run = async (dimensions: string[], metrics: string[], extra: object = {}) => await request(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    dimensions: dimensions.map(name => ({ name })), metrics: metrics.map(name => ({ name })), limit: '1000', ...extra,
  }) as GAResponse;
  const [overview, daily, acquisition, pages, services, conversions] = await Promise.all([
    run([], ['activeUsers', 'sessions', 'screenPageViews']),
    run(['date'], ['activeUsers', 'sessions', 'screenPageViews'], { orderBys: [{ dimension: { dimensionName: 'date' } }] }),
    run(['sessionDefaultChannelGroup','sessionSourceMedium'], ['sessions','activeUsers'], { orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] }),
    run(['landingPagePlusQueryString'], ['sessions'], { orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] }),
    run(['pagePath'], ['eventCount'], { dimensionFilter: { andGroup: { expressions: [
      { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'service_engagement' } } },
      { filter: { fieldName: 'pagePath', inListFilter: { values: ['/ai-solutions','/salesforce','/custom-applications'] } } },
    ] } } }),
    run(['eventName'], ['eventCount'], { dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['scout_open','consultation_start','consultation_booked'] } } } }),
  ]);
  const responses = [overview,daily,acquisition,pages,services,conversions];
  const notes = [
    `GA4 dates use the property's reporting timezone${overview.metadata?.timeZone ? ': '+overview.metadata.timeZone : ''}. Active users are distinct within each reported period; daily users must not be summed.`,
    'Consultation bookings are consented browser events, not the complete first-party booking ledger. Starts and Scout opens are not bookings.',
    'Standard reports can take 24–48 hours to populate. DebugView and Realtime are separate from this reporting API.',
  ];
  if (responses.some(r => r.metadata?.subjectToThresholding)) notes.push('Google applied reporting thresholds; some rows may be withheld.');
  if (responses.some(r => r.metadata?.dataLossFromOtherRow)) notes.push('High-cardinality aggregation affected this report.');
  if (responses.some(r => (r.rowCount ?? 0) > 1000)) notes.push('Tables show at most 1,000 source rows; totals come from a separate aggregate report.');
  return {
    overview: gaTable(overview,['Active users','Sessions','Page views']),
    daily: gaTable(daily,['Active users','Sessions','Page views']),
    acquisition: gaTable(acquisition,['Sessions','Active users']),
    pages: mergePageRows(gaTable(pages,['Sessions'],true)),
    services: gaTable(services,['Engagement events'],true),
    conversions: gaTable(conversions,['Event count']), notes,
  };
}
function searchTable(response: SearchResponse, grouped: boolean, paths = false): ReportTable {
  if (response.rows !== undefined && !Array.isArray(response.rows)) throw Error('Invalid search rows');
  const rows = (response.rows ?? []).map(row => {
    const raw = grouped ? row.keys?.[0] ?? '(not set)' : 'Selected period';
    return { label: paths ? publicPath(raw) ?? raw : raw, ...(paths && publicPath(raw) ? { path: publicPath(raw) } : {}), values: [number(row.clicks),number(row.impressions),number(row.ctr),number(row.position)] };
  }).filter(row => !paths || row.path);
  // www/non-www and query variants can share a path. Combine only Search metrics,
  // with impression-weighted position and recomputed CTR (never averaged CTRs).
  const merged = new Map<string, ReportRow>();
  for (const row of rows) {
    const prior = merged.get(row.label);
    if (!paths || !prior) { merged.set(row.label, { ...row, values: [...row.values] }); continue; }
    const impressions = prior.values[1] + row.values[1], clicks = prior.values[0] + row.values[0];
    prior.values = [clicks, impressions, impressions ? clicks/impressions : 0, impressions ? (prior.values[3]*prior.values[1]+row.values[3]*row.values[1])/impressions : 0];
  }
  return { columns: ['Clicks','Impressions','CTR','Avg. position'], rows: [...merged.values()], limited: rows.length >= 1000 };
}
export async function searchConsoleReport(range: DateRange, request = reportingRequest): Promise<ReportingData> {
  const run = async (dimensions: string[]) => await request(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(searchProperty)}/searchAnalytics/query`, {
    startDate: range.start, endDate: range.end, dimensions, type: 'web', dataState: 'final', rowLimit: 1000,
  }) as SearchResponse;
  const [overview, daily, queries, pages] = await Promise.all([run([]),run(['date']),run(['query']),run(['page'])]);
  const trend = searchTable(daily,true); trend.rows.sort((a,b) => a.label.localeCompare(b.label));
  return {
    overview: searchTable(overview,false), daily: trend,
    queries: searchTable(queries,true), pages: searchTable(pages,true,true),
    notes: [
      'Google Search Console web results, final data only. Dates use Pacific Time; recent days may not be available yet.',
      'Queries can be anonymized or withheld. Top rows are limited to 1,000; query/page totals need not equal the independent property totals.',
      'Search clicks and impressions are not GA4 sessions or page views. Shared paths help comparison, not metric equivalence.',
    ],
  };
}
