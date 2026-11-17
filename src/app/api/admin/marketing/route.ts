import { ownerAuth, requireOwner } from '@/lib/marketing/auth';
import { privateJson, marketingFailure, sameOrigin } from '@/lib/marketing/http';
import { reportingRange } from '@/lib/marketing/ranges';
import { marketingReports } from '@/lib/marketing/reports';

export async function GET(request: Request) {
  try {
    sameOrigin(request);
    const owner = await requireOwner(await ownerAuth());
    return privateJson(await marketingReports(owner,reportingRange(new URL(request.url).searchParams.get('days'))));
  } catch (error) { return marketingFailure(error); }
}
