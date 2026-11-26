import {provenanceSchema} from '@augmented-architect/seo-analyst';
import {ownerAuth,requireOwner} from '@/lib/marketing/auth';
import {privateJson,privateBody,marketingFailure,sameOrigin} from '@/lib/marketing/http';
import {MarketingError,uuidPattern} from '@/lib/marketing/config';
import {seoDatabase} from '@/lib/marketing/seo/config';
import {researchConnections,researchPolicy,type ProviderConnection} from '@/lib/marketing/intelligence/providers';
import {intelligenceRecords,savedResearch,parseResearchCommand,executeResearch,linkResearch,providerScope,selectIntelligence} from '@/lib/marketing/intelligence/service';
import {dataForSeoTarget,dataForSeoApproval,firstResearchExperiment,sanitizeDataForSeoDiagnostic} from '@/lib/marketing/intelligence/dataforseo';
export const maxDuration=60;
export async function GET(request:Request){
  try{
    sameOrigin(request);const owner=await requireOwner(await ownerAuth()),params=new URL(request.url).searchParams;
    if([...params.keys()].some(k=>!['q','page','id'].includes(k)))throw new MarketingError(400,'Unsupported research filter.');
    const q=(params.get('q')??'').trim().toLowerCase(),page=Number(params.get('page')??1),id=params.get('id');if(q.length>200||!Number.isInteger(page)||page<1||id&&!uuidPattern.test(id))throw new MarketingError(400,'Invalid research history filter.');
    const rows=await intelligenceRecords(owner.db,owner.tenantId),all=savedResearch(rows),filtered=all.filter(r=>!q||[...r.query.seeds,...r.bundle.market.flatMap(m=>[m.term,...m.variants]),...r.bundle.competition.flatMap(c=>[c.term,...c.results.flatMap(p=>[p.domain,p.title])])].some(s=>s.toLowerCase().includes(q))),pages=Math.max(1,Math.ceil(filtered.length/10));
    const selected=id?all.find(r=>r.id===id):null;if(id&&!selected)throw new MarketingError(404,'Research not found in this workspace.');
    const requests=rows.filter(r=>r.payload.workflow==='intelligence-request/v1').length,failures=rows.filter(r=>r.payload.workflow==='intelligence-failure/v1').length;
    const collections=all.filter(r=>r.scope===providerScope(owner.tenantId,r.query)).flatMap(r=>r.bundle.collections),connections=researchConnections().filter(c=>c.id!=='google_ads').map((c):ProviderConnection=>{const last=collections.filter(p=>p.provider===c.id).sort((a,b)=>b.collectedAt.localeCompare(a.collectedAt))[0];return {...c,lastRetrievedAt:last?.collectedAt??null,...(c.ready&&last&&Date.parse(last.expiresAt)>Date.now()?{state:'connected' as const,message:'A successful read-only provider response is recorded for the configured account. Collection time is shown; credentials are not probed on page load.'}:{})};});
    const failureHistory=rows.filter(r=>r.payload.workflow==='intelligence-failure/v1').sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,5).map(r=>({id:r.id,createdAt:r.created_at,diagnostic:sanitizeDataForSeoDiagnostic(r.payload.diagnostic),receipt:provenanceSchema.safeParse(r.payload.receipt).success?provenanceSchema.parse(r.payload.receipt):null}));
    const {country,language,locationCode}=dataForSeoTarget(),approval=dataForSeoApproval();
    return privateJson({evidenceSelection:selectIntelligence(rows,owner.tenantId),connections,failureHistory,target:{country,language},locationCode,experiment:firstResearchExperiment,approval:{maximumRequests:approval.maximumRequests,maximumCostUsd:approval.maximumCostUsd,configured:approval.configured},policy:{minimumIntervalSeconds:60,maximumDailyRequests:researchPolicy.maximumDailyRequests,maximumResults:50,maximumSerpResults:10},history:filtered.slice((Math.min(page,pages)-1)*10,Math.min(page,pages)*10).map(r=>({id:r.id,createdAt:r.createdAt,query:r.query,marketTerms:r.bundle.market.length,observedPages:r.bundle.competition.reduce((n,c)=>n+c.results.length,0)})),page:Math.min(page,pages),pages,total:filtered.length,requests,failures,selected,latest:all[0]??null});
  }catch(error){return marketingFailure(error);}
}
export async function POST(request:Request){
  try{
    const owner=await requireOwner(await ownerAuth()),body=await privateBody(request),operation=body.operation;
    const authorize=async()=>{const current=await requireOwner(owner.db);if(current.tenantId!==owner.tenantId||current.user.id!==owner.user.id)throw new MarketingError(403,'Research authorization changed.');};
    if(operation==='link'){
      if(Object.keys(body).some(k=>!['operation','researchId','opportunityId','term'].includes(k))||!['researchId','opportunityId'].every(k=>typeof body[k]==='string'&&uuidPattern.test(body[k] as string))||typeof body.term!=='string'||body.term.length>200)throw new MarketingError(400,'A saved research term and opportunity are required.');
      await authorize();return privateJson(await linkResearch(seoDatabase(),owner.tenantId,owner.user.id,body.researchId as string,body.opportunityId as string,body.term));
    }
    if(operation!=='research')throw new MarketingError(400,'Choose research or link.');
    const {operation:_operation,...command}=body;void _operation;
    const parsed=parseResearchCommand(command);const connection=researchConnections().find(c=>c.id===(parsed.mode==='competition'?'dataforseo':'dataforseo_keywords'))!;
    if(!connection.ready)throw new MarketingError(503,connection.message);if(!parsed.planId||!parsed.authorizationId)throw new MarketingError(403,'Choose an approved plan and confirm its research allowance.');
    return privateJson(await executeResearch({db:seoDatabase(),tenant:owner.tenantId,actor:owner.user.id,command:parsed,authorize}));
  }catch(error){return marketingFailure(error);}
}
