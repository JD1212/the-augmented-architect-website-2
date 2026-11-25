import { ownerAuth, requireOwner } from '@/lib/marketing/auth';
import { privateJson, marketingFailure, sameOrigin } from '@/lib/marketing/http';
import {summarizeAgent,executionStatus} from '@/lib/marketing/execution-status';
import {seoRegistration} from '@/lib/marketing/seo/config';
import {contentAgentName,contentCapabilities} from '@/lib/marketing/content/config';
import { MarketingError } from '@/lib/marketing/config';

export async function GET(request:Request) {
  try {
    sameOrigin(request);
    const owner=await requireOwner(await ownerAuth());
    // JWT-scoped RLS and explicit tenant predicates. Never return prompts, diagnostics or report payloads.
    const [reports,executions,artifacts,agents]=await Promise.all([
      owner.db.from('marketing_reports').select('id,source,start_date,end_date,extracted_at').eq('tenant_id',owner.tenantId).order('extracted_at',{ascending:false}).limit(12),
      owner.db.from('marketing_executions').select('id,agent_id,state,started_at,created_at,finished_at').eq('tenant_id',owner.tenantId).order('created_at',{ascending:false}).limit(100),
      owner.db.from('marketing_artifacts').select('id,kind,title,created_at').eq('tenant_id',owner.tenantId).order('created_at',{ascending:false}).limit(12),
      owner.db.from('marketing_agents').select('id,name,enabled,version').eq('tenant_id',owner.tenantId).limit(100),
    ]);
    if(reports.error||executions.error||artifacts.error||agents.error)throw new MarketingError(503,'Workspace activity is temporarily unavailable.');
    const registered=agents.data??[],runs=executions.data??[];
    const seo=registered.find(a=>a.name===seoRegistration.name),content=registered.find(a=>a.name===contentAgentName());
    return privateJson({reports:reports.data??[],executions:runs.slice(0,12).map(r=>({id:r.id,state:executionStatus(r.state,r.started_at),created_at:r.created_at,finished_at:r.finished_at})),artifacts:artifacts.data??[],agentSummaries:{'seo-analyst':summarizeAgent(seo,runs,Boolean(seo?.enabled)),'content-strategist':summarizeAgent(content,runs,contentCapabilities().executionEnabled)}});
  }catch(error){return marketingFailure(error);}
}
