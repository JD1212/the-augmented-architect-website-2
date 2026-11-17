import 'server-only';
import type { requireOwner } from './auth';
import { MarketingError, searchProperty } from './config';
import { googleReportingConfigured } from './google';
import { ga4Report, searchConsoleReport } from './providers';
import type { DateRange, MarketingDashboard, ReportingData, SourceResult } from './types';

type Owner = Awaited<ReturnType<typeof requireOwner>>;
async function sourceReport(owner: Owner, source: 'ga4'|'search_console', range: DateRange): Promise<SourceResult> {
  const property = source === 'ga4' ? process.env.GA4_PROPERTY_ID : searchProperty;
  const missing = !googleReportingConfigured() || !property || (source === 'ga4' && !/^\d+$/.test(property));
  if (missing) return { status: 'not_configured', message: source === 'ga4' ? 'Configure the numeric GA4 Property ID and dedicated read-only Google credentials.' : 'Configure dedicated Google credentials with access to sc-domain:theaugmentedarchitect.com.', updatedAt: null, cached: false, persisted: false, data: null };
  try {
    const cached = await owner.db.from('marketing_reports').select('payload,extracted_at').eq('tenant_id',owner.tenantId).eq('source',source).eq('property_id',property)
      .eq('start_date',range.start).eq('end_date',range.end).gte('extracted_at',new Date(Date.now()-300000).toISOString()).order('extracted_at',{ascending:false}).limit(1).maybeSingle();
    if (cached.error) throw new MarketingError(503, 'Private reporting storage is unavailable.');
    if (cached.data) return result(cached.data.payload as ReportingData,cached.data.extracted_at,true,true);
    const data = source === 'ga4' ? await ga4Report(property,range) : await searchConsoleReport(range);
    const extracted = new Date().toISOString();
    const saved = await owner.db.from('marketing_reports').insert({tenant_id:owner.tenantId,source,property_id:property,start_date:range.start,end_date:range.end,extracted_at:extracted,payload:data});
    return result(data,extracted,false,!saved.error);
  } catch (error) {
    return { status:'error', message: error instanceof MarketingError ? error.message : 'Reporting data could not be retrieved or validated. Please retry.', updatedAt:null,cached:false,persisted:false,data:null };
  }
}
function result(data: ReportingData, time: string, cached: boolean, persisted: boolean): SourceResult {
  const hasData = data.overview.rows.some(row => row.values.some(value => value > 0));
  return {status:hasData?'connected':'empty',message:hasData?'Read-only reporting connected.':'No reportable data for this period yet. Recently collected events may take time to appear.',updatedAt:time,cached,persisted,data};
}
export async function marketingReports(owner: Owner, range: DateRange): Promise<MarketingDashboard> {
  const [ga4,search] = await Promise.all([sourceReport(owner,'ga4',range),sourceReport(owner,'search_console',range)]);
  return {range,ga4,search};
}
