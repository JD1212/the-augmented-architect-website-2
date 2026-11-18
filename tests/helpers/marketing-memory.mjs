// In-memory PostgREST-shaped fixture. No credentials, network or provider calls.
export function memoryDatabase(initial={}){
 const rows={marketing_agents:[],marketing_executions:[],marketing_artifacts:[],marketing_reports:[],marketing_evidence:[],...structuredClone(initial)};let clock=0;
 return {rows,from(table){let action='select',payload,filters=[],bounds=null,orders=[];const q={
  select(){return q;},eq(k,v){filters.push([k,v]);return q;},order(k,options={}){orders.push([k,options.ascending!==false]);return q;},range(a,b){bounds=[a,b];return q;},limit(n){bounds=[0,n-1];return q;},insert(p){action='insert';payload=p;return q;},upsert(p){action='upsert';payload=p;return q;},update(p){action='update';payload=p;return q;},
  async maybeSingle(){const r=await execute();return {...r,data:r.data[0]??null};},async single(){const r=await execute();return {...r,data:r.data[0]??null,error:r.error??(r.data.length!==1?{code:'fixture_single'}:null)};},then(resolve,reject){return execute().then(resolve,reject);},
 };
 async function execute(){await Promise.resolve();
  const matches=row=>filters.every(([k,v])=>k==='config'?JSON.stringify(row[k])===JSON.stringify(JSON.parse(v)):row[k]===v);
  let found=rows[table].filter(matches);
  if(action==='insert'||action==='upsert'){
   const list=Array.isArray(payload)?payload:[payload],saved=[];
   for(const item of list){const existing=rows[table].find(r=>item.id?r.id===item.id:r.tenant_id===item.tenant_id&&r.artifact_id===item.artifact_id&&r.report_id===item.report_id);if(existing&&action==='insert')return {data:[],error:{code:'23505'}};
    if(existing){Object.assign(existing,structuredClone(item));saved.push(existing);}else{const row={created_at:new Date(Date.UTC(2026,10,18,4,0,clock++)).toISOString(),...structuredClone(item)};rows[table].push(row);saved.push(row);}}
   return {data:structuredClone(saved),error:null};
  }
  if(action==='update'){for(const row of found)Object.assign(row,structuredClone(payload));}
  for(const [key,ascending] of [...orders].reverse())found.sort((a,b)=>String(a[key]).localeCompare(String(b[key]))*(ascending?1:-1));if(bounds)found=found.slice(bounds[0],bounds[1]+1);
  return {data:structuredClone(found),error:null};
 }
 return q;}};
}
