import 'server-only';
import {summarizeResponse,type BoundaryEvent} from '@augmented-architect/content-strategist';
/** Observe only the existing official Responses transport. No new request, retry, body logging or credential forwarding. */
export function observedOpenAIFetch(observe:(event:BoundaryEvent)=>Promise<void>,sourceIds:readonly string[],send:typeof fetch=fetch):typeof fetch{
 let request=0;
 return async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  const observed=url.origin==='https://api.openai.com'&&url.pathname==='/v1/responses'&&(init?.method??(input instanceof Request?input.method:'GET')).toUpperCase()==='POST';
  if(!observed)return send(input,init);
  const index=++request,response=await send(input,init);let summary;
  if(response.ok){try{summary=summarizeResponse(await response.clone().json(),sourceIds);}catch{/* Keep the status; malformed/missing bodies must not be logged. */}}
  await observe({phase:'provider_response',request:index,httpStatus:response.status,...(summary?{response:summary}:{})});
  return response;
 };
}
