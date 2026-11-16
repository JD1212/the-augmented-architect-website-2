import 'server-only';
import { createHash } from 'node:crypto';
import { BookingError } from './types';
import { schedulingEnabled, schedulingService } from './scheduling-server';
import { createScoutStore } from '@/lib/scout/store';
import { anonymousSessionExpiry } from '@/lib/scout/session-lifecycle';
import { ScoutError } from '@/lib/scout/errors';
import { createSharedRequestLimiter } from '@/lib/scout/request-limits';
const limit=createSharedRequestLimiter();
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
export function scoutSchedulingOwner(request:Request){
  const name=process.env.NODE_ENV==='production'?'__Host-scout_session':'scout_session';
  const tokens=(request.headers.get('cookie')??'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(name+'=')).map(s=>s.slice(name.length+1));
  if(tokens.length!==1||!/^[A-Za-z0-9_-]{43}$/.test(tokens[0]))throw new BookingError(401,'Please reopen Scout to establish a secure session.');
  return createHash('sha256').update(tokens[0]).digest('hex');
}
export async function schedulingHTTP(request:Request){
  try{
    if(request.headers.get('sec-fetch-site')==='cross-site'||(request.method==='POST'&&request.headers.get('origin')!==new URL(request.url).origin))throw new BookingError(403,'Please use Scout on this website.');
    if(!schedulingEnabled())return Response.json({enabled:false,proposals:[],verificationRequired:false},{headers});
    const owner=scoutSchedulingOwner(request);
    const conversation=await createScoutStore().find(owner);
    if(conversation&&(conversation.status!=='active'||anonymousSessionExpiry(conversation)<=Date.now()))throw new BookingError(410,'This conversation expired. Please reopen Scout.');
    await limit(request,request.method==='GET'?'read':'send');
    const service=schedulingService();
    if(request.method==='GET')return Response.json({enabled:true,...await service.ui(owner)},{headers});
    if(!request.headers.get('content-type')?.startsWith('application/json'))throw new BookingError(415,'Please use the secure scheduling controls.');
    const reader=request.body?.getReader();if(!reader)throw new BookingError(400,'Missing scheduling action.');
    const chunks:Uint8Array[]=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1500){await reader.cancel();throw new BookingError(413,'Scheduling request is too large.');}chunks.push(value);}}finally{reader.releaseLock();}
    let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new BookingError(400,'Invalid scheduling action.');}
    if(!input||typeof input!=='object'||Array.isArray(input))throw new BookingError(400,'Invalid scheduling action.');
    if(input.action==='verify'&&Object.keys(input).every(k=>['action','code'].includes(k))&&typeof input.code==='string')return Response.json(await service.verification.verify(owner,input.code),{headers});
    if(input.action==='approve'&&Object.keys(input).every(k=>['action','proposalId'].includes(k))&&typeof input.proposalId==='string')return Response.json(await service.approve(owner,input.proposalId),{headers});
    throw new BookingError(400,'Invalid scheduling action.');
  }catch(error){return Response.json({error:error instanceof BookingError||error instanceof ScoutError?error.message:'Scheduling is temporarily unavailable.'},{status:error instanceof BookingError||error instanceof ScoutError?error.status:503,headers});}
}
