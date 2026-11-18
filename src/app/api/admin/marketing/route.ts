import { ownerAuth, requireOwner } from '@/lib/marketing/auth';
import { privateJson, marketingFailure, sameOrigin } from '@/lib/marketing/http';
import { reportingRange, previousReportingRange } from '@/lib/marketing/ranges';
import { marketingReports } from '@/lib/marketing/reports';

export async function GET(request: Request) {
  try {
    sameOrigin(request);
    const owner = await requireOwner(await ownerAuth());
    const params = new URL(request.url).searchParams;
    const range = reportingRange(params.get('days'));
    return privateJson(await marketingReports(owner, params.get('period')==='previous' ? previousReportingRange(range) : range));
  } catch (error) { return marketingFailure(error); }
}
