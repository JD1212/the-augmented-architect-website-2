import {ownerAuth,requireOwner} from '@/lib/marketing/auth';
import {privateJson,marketingFailure,sameOrigin} from '@/lib/marketing/http';
import {marketingRows} from '@/lib/marketing/opportunities/repository';
import {projectBacklog} from '@/lib/marketing/opportunities/model';
import type {Artifact} from '@/lib/marketing/opportunities/contracts';
import {workflowSnapshot,type WorkflowRun} from '@/lib/marketing/workflow/model';
import {publicationEnvironment,publishingEnabled} from '@/lib/marketing/content/publication-contract';
import {contentCapabilities} from '@/lib/marketing/content/config';
export async function GET(request:Request){
 try{
  sameOrigin(request);const owner=await requireOwner(await ownerAuth());
  const [rows,runs]=await Promise.all([marketingRows(owner.db,'marketing_artifacts',owner.tenantId),marketingRows(owner.db,'marketing_executions',owner.tenantId)]);
  const artifacts=rows as Artifact[],executions=runs as (WorkflowRun&{agent_id:string})[];
  const capabilities=contentCapabilities();
  return privateJson(workflowSnapshot(projectBacklog(artifacts,executions),artifacts,executions,{environment:publicationEnvironment(),publishingEnabled:publishingEnabled(),generationEnabled:capabilities.executionEnabled,generationOpportunityId:capabilities.executionPlan.opportunityId}));
 }catch(error){return marketingFailure(error);}
}
