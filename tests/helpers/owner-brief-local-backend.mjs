// Opt-in process-only fixture transport. Never imported by application code.
// Runs actual Next.js owner auth/API services against a private local JSON database.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
if(process.env.OWNER_BRIEF_BROWSER_TEST!=='1'||!process.env.OWNER_BRIEF_FIXTURE?.startsWith('/private/'))throw Error('Local fixture opt-in required');
const fixturePath=process.env.OWNER_BRIEF_FIXTURE,owner=process.env.MARKETING_OWNER_IDS,tenant='b329164a-f981-4acc-befc-2f0c70f8af10',email='owner-browser@example.invalid';
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const unsigned=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:owner,role:'authenticated',aud:'authenticated',aal:'aal1',session_id:owner,iss:'http://local-fixture.invalid/auth/v1',iat:1700000000,exp:4102444800});
const token=unsigned+'.'+createHmac('sha256','local-fixture-not-a-real-key').update(unsigned).digest('base64url');
const user={id:owner,aud:'authenticated',role:'authenticated',email,email_confirmed_at:'2026-11-27T00:00:00Z',confirmed_at:'2026-11-27T00:00:00Z',created_at:'2026-11-27T00:00:00Z',is_anonymous:false,app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],factors:[]};
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json',...extra}});
const originalFetch=globalThis.fetch;
function valueAt(row,key){if(key.includes('->>')){const [field,property]=key.split('->>');return row[field]?.[property];}return row[key];}
globalThis.fetch=async(input,init={})=>{
 const request=new Request(input,init),url=new URL(request.url),headers=request.headers,method=request.method;
 if(['localhost','127.0.0.1'].includes(url.hostname))return originalFetch(input,init);
 if(url.origin!=='https://cjldcaiybqguklzqtdjj.supabase.co'){process.send?.({fixture:'blocked-external',host:url.hostname});throw Error('External network disabled in local owner-brief verification');}
 const bearer=headers.get('authorization')?.replace(/^Bearer /,'');
 if(url.pathname==='/auth/v1/token'){
  const body=await request.json();if(body.email!==email||body.password!=='local-browser-test-only')return json({error:'invalid_grant',msg:'Fixture login rejected'},400);
  return json({access_token:token,refresh_token:'local-fixture-refresh',token_type:'bearer',expires_in:3600,expires_at:4102444800,user});
 }
 if(url.pathname==='/auth/v1/user')return bearer===token?json(user):json({msg:'No local fixture session'},401);
 if(url.pathname==='/auth/v1/logout')return json({});
 if(url.pathname==='/rest/v1/rpc/marketing_owner_status'){const body=await request.json();return bearer===token&&body.p_tenant===tenant?json('allowed'):json('denied');}
 if(![token,'sb_secret_local_browser_fixture'].includes(bearer))return json({message:'Local fixture authorization required'},401);
 const table=url.pathname.match(/^\/rest\/v1\/(marketing_\w+)$/)?.[1];if(!table)return json({message:'Unsupported local fixture route'},400);
 const data=JSON.parse(readFileSync(fixturePath,'utf8'));if(!Array.isArray(data[table]))return json({message:'Unsupported local fixture table'},400);
 if(method==='POST'){
  const body=await request.json();if(table!=='marketing_artifacts'||!['owner-article-brief/v1','seo-opportunity-review/v1'].includes(body.payload?.workflow)||body.tenant_id!==tenant||body.actor_id!==owner)throw Error('Unexpected write blocked by local test backend');
  if(data[table].some(r=>r.id===body.id))return json({code:'23505',message:'Fixture duplicate key'},409);
  data[table].push({created_at:new Date().toISOString(),execution_id:null,...body});writeFileSync(fixturePath,JSON.stringify(data),{mode:0o600});process.send?.({fixture:'artifact-saved',workflow:body.payload.workflow,id:body.id});return headers.get('prefer')?.includes('return=representation')?json([body],201):new Response(null,{status:201});
 }
 if(!['GET','HEAD'].includes(method))throw Error('Non-append write blocked by local fixture');
 let rows=data[table];
 for(const [key,v] of url.searchParams){if(['select','order','offset','limit'].includes(key))continue;const field=r=>valueAt(r,key);if(v.startsWith('eq.'))rows=rows.filter(r=>String(field(r))===v.slice(3));else if(v.startsWith('in.(')){const values=v.slice(4,-1).split(',');rows=rows.filter(r=>values.includes(String(field(r))));}else throw Error('Unsupported fixture filter');}
 for(const order of(url.searchParams.get('order')??'').split(',').reverse().filter(Boolean)){const [key,direction]=order.split('.');rows=[...rows].sort((a,b)=>String(a[key]).localeCompare(String(b[key]))*(direction==='desc'?-1:1));}
 const total=rows.length,range=headers.get('range')?.split('-').map(Number),offset=range?.[0]??Number(url.searchParams.get('offset')??0),limit=range?range[1]-range[0]+1:Number(url.searchParams.get('limit')??rows.length);rows=rows.slice(offset,offset+limit);
 if(headers.get('accept')?.includes('application/vnd.pgrst.object+json'))return rows.length===1?json(rows[0]):json({code:'PGRST116',message:'Expected one fixture row'},406);
 return json(rows,200,{'Content-Range':`${offset}-${Math.max(offset,offset+rows.length-1)}/${total}`});
};
