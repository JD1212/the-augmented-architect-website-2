import type OpenAI from 'openai';

type Response = OpenAI.Responses.Response;
const statuses=['completed','incomplete','failed','cancelled','queued','in_progress'];
const reasons=['max_output_tokens','content_filter','max_tool_calls'];
const codes=['invalid_api_key','insufficient_quota','rate_limit_exceeded','model_not_found','server_error','permission_denied','invalid_request_error'];
export function researchBoundary(response?:Response,stage='api_request',error?:unknown){
 const e=error as {name?:string;status?:number;code?:string}|undefined;
 const httpStatus=Number.isInteger(e?.status)&&e!.status!>=400&&e!.status!<=599?e!.status!:null;
 const errorCategory=httpStatus===401?'authentication':httpStatus===403?'permissions':httpStatus===429?'rate_limit':httpStatus!==null?'provider_http':e?.name==='AbortError'?'interrupted':e?.name==='SeoValidationError'?'source_validation':error?'transport_or_processing':null;
 const extra=response as unknown as {tool_usage?:{web_search?:{num_requests?:unknown}}}|undefined;
 const requests=extra?.tool_usage?.web_search?.num_requests;
 const output=Array.isArray(response?.output)?response.output:[],tools=output.filter(i=>i?.type==='web_search_call');
 return {stage,httpStatus,errorCategory,responseId:response?.id&&/^resp_[a-zA-Z0-9_-]{1,180}$/.test(response.id)?response.id:null,
  status:statuses.includes(response?.status??'')?response!.status:'unknown',
  incompleteReason:response?.incomplete_details?reasons.includes(String(response.incomplete_details.reason))?String(response.incomplete_details.reason):'other':null,
  providerCode:codes.includes(String(response?.error?.code))?String(response!.error!.code):null,
  outputTypes:output.slice(0,32).map(i=>['message','reasoning','web_search_call','function_call'].includes(i?.type)?i.type:'other'),
  searchItems:tools.length,tools:tools.slice(0,16).map(i=>({status:['completed','failed','in_progress','searching'].includes(i.status)?i.status:'unknown',action:['search','open_page','find'].includes(i.action?.type)?i.action.type:'other'})),
  billableSearchRequests:typeof requests==='number'&&Number.isSafeInteger(requests)&&requests>=0?requests:null};
}
export class ResearchBoundaryError extends Error{
 readonly name='ResearchBoundaryError';
 constructor(readonly code:string,readonly boundary:ReturnType<typeof researchBoundary>,cause?:unknown){super(code,{cause});}
}
export function assertResearchComplete(response:Response){
 const boundary=researchBoundary(response,'response_validation');
 if(response.status!=='completed')throw new ResearchBoundaryError(response.status==='incomplete'?'RESEARCH_INCOMPLETE':response.status==='failed'?'RESEARCH_FAILED':'RESEARCH_INTERRUPTED',boundary);
 if(boundary.billableSearchRequests!==null&&boundary.billableSearchRequests>1)throw new ResearchBoundaryError('RESEARCH_SEARCH_BUDGET_EXCEEDED',boundary);
 if(!boundary.tools.some(t=>t.status==='completed'))throw new ResearchBoundaryError('RESEARCH_TOOL_NOT_COMPLETED',boundary);
 if(response.output.length>32)throw new ResearchBoundaryError('RESEARCH_OUTPUT_ITEM_LIMIT',boundary);
}
export function researchFailure(value:unknown):ResearchBoundaryError|null{
 const pending=[value],seen=new Set<unknown>();
 while(pending.length&&seen.size<12){const item=pending.shift();if(!item||typeof item!=='object'||seen.has(item))continue;seen.add(item);if(item instanceof ResearchBoundaryError)return item;const e=item as {cause?:unknown;originalError?:unknown;error?:unknown};pending.push(e.cause,e.originalError,e.error);}
 return null;
}
