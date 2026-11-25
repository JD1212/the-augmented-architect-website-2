/** Chromium can expire paused Next.js assets/prefetches during navigation without a Network ID. */
export function expectedContinuationEnd(error,event,abortedRequests,origin){
 if(!/^Invalid InterceptionId\.?$/.test(error?.message??''))return null;
 if(event.networkId&&abortedRequests.has(event.networkId))return 'canceled-network-request';
 try{const url=new URL(event.request.url);if(!event.networkId&&url.origin===origin){
  if(event.resourceType==='Script'&&/^\/_next\/static\/immutable\/chunks\/[^/]+\.js$/.test(url.pathname))return 'expired-static-script-pause';
  if(event.resourceType==='Stylesheet'&&/^\/_next\/static\/immutable\/chunks\/[^/]+\.css$/.test(url.pathname))return 'expired-static-style-pause';
  const headers=Object.fromEntries(Object.entries(event.request.headers??{}).map(([key,value])=>[key.toLowerCase(),value]));
  if(event.resourceType==='XHR'&&!url.pathname.startsWith('/api/')&&headers['next-router-prefetch']==='1'&&headers.rsc==='1')return 'expired-next-prefetch-pause';
 }}catch{}
 return null;
}
