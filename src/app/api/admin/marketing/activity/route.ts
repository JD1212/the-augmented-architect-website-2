import { ownerAuth, requireOwner } from '@/lib/marketing/auth';
import { privateJson, marketingFailure, sameOrigin } from '@/lib/marketing/http';
import {summarizeAgent,executionStatus} from '@/lib/marketing/execution-status';
import {seoRegistration} from '@/lib/marketing/seo/config';
import {contentAgentName,contentCapabilities} from '@/lib/marketing/content/config';
import type {ActivityRecord} from '@/lib/marketing/types';
import { MarketingError } from '@/lib/marketing/config';

export async function GET(request:Request) {
  try {
    sameOrigin(request);
    const owner=await requireOwner(await ownerAuth());
    const params=new URL(request.url).searchParams;
    if(params.size){
      if([...params.keys()].some(k=>!['stream','page','q','status','kind'].includes(k))||[...params.keys()].some(k=>params.getAll(k).length>1))throw new MarketingError(400,'Choose valid activity filters.');
      const stream=params.get('stream')??'reports',page=Number(params.get('page')??1),q=(params.get('q')??'').trim(),status=params.get('status')??'all',kind=params.get('kind')??'all';
      if(!['reports','executions','artifacts'].includes(stream)||!Number.isInteger(page)||page<1||page>10000||q.length>100||!['all','queued','running','completed','failed','cancelled','interrupted'].includes(status)||stream!=='executions'&&status!=='all'||!['all','approval','recommendation','content_draft','measurement'].includes(kind)||stream!=='artifacts'&&kind!=='all')throw new MarketingError(400,'Choose valid activity filters.');
      const table=stream==='reports'?'marketing_reports':stream==='executions'?'marketing_executions':'marketing_artifacts';
      const fields=stream==='reports'?'id,source,start_date,end_date,extracted_at':stream==='executions'?'id,state,started_at,created_at,finished_at':'id,kind,title,created_at';
      const sort=stream==='reports'?'extracted_at':'created_at';
      let query=owner.db.from(table).select(fields,{count:'exact'}).eq('tenant_id',owner.tenantId);
      // Text never becomes a PostgREST expression; escaping preserves literal wildcard input.
      if(stream==='artifacts'&&kind!=='all')query=query.eq('kind',kind);
      if(q)query=query.ilike(stream==='reports'?'source':stream==='executions'?'state':'title','%'+q.replace(/[\\%_]/g,'\\$&')+'%');
      if(stream==='executions'&&status!=='all'){
        if(status==='interrupted')query=query.eq('state','running').lt('started_at',new Date(Date.now()-300000).toISOString());
        else if(status==='running')query=query.eq('state','running').or('started_at.is.null,started_at.gte.'+new Date(Date.now()-300000).toISOString());
        else query=query.eq('state',status);
      }
      const result=await query.order(sort,{ascending:false}).order('id').range((page-1)*10,page*10-1).returns<ActivityRecord[]>();
      if(result.error)throw new MarketingError(503,'Activity records are temporarily unavailable.');
      return privateJson({stream,page,pages:Math.max(1,Math.ceil((result.count??0)/10)),total:result.count??0,rows:stream==='executions'?(result.data??[]).map((r)=>({...r,state:executionStatus(r.state??'unknown',r.started_at??null)})):result.data??[]});
    }
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
