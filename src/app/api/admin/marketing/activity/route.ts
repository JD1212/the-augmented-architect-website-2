import { ownerAuth, requireOwner } from '@/lib/marketing/auth';
import { privateJson, marketingFailure, sameOrigin } from '@/lib/marketing/http';
import { MarketingError } from '@/lib/marketing/config';

export async function GET(request:Request) {
  try {
    sameOrigin(request);
    const owner=await requireOwner(await ownerAuth());
    // JWT-scoped RLS and explicit tenant predicates. Never return prompts, diagnostics or report payloads.
    const [reports,executions,artifacts]=await Promise.all([
      owner.db.from('marketing_reports').select('id,source,start_date,end_date,extracted_at').eq('tenant_id',owner.tenantId).order('extracted_at',{ascending:false}).limit(12),
      owner.db.from('marketing_executions').select('id,state,created_at,finished_at').eq('tenant_id',owner.tenantId).order('created_at',{ascending:false}).limit(12),
      owner.db.from('marketing_artifacts').select('id,kind,title,created_at').eq('tenant_id',owner.tenantId).order('created_at',{ascending:false}).limit(12),
    ]);
    if(reports.error||executions.error||artifacts.error)throw new MarketingError(503,'Workspace activity is temporarily unavailable.');
    return privateJson({reports:reports.data??[],executions:executions.data??[],artifacts:artifacts.data??[]});
  }catch(error){return marketingFailure(error);}
}
