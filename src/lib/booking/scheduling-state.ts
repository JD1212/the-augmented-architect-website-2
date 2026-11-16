import 'server-only';
import { createScoutDatabase } from '@/lib/scout/store';
import { BookingError } from './types';
export type SchedulingRecord = { key:string; owner_hash:string; kind:'proposal'|'verification'|'identity'|'rate'; payload:Record<string,unknown>; version:number; expires_at:string };
export interface SchedulingState {
  get(key:string,owner:string):Promise<SchedulingRecord|null>;
  list(owner:string,kind:SchedulingRecord['kind']):Promise<SchedulingRecord[]>;
  insert(record:SchedulingRecord):Promise<boolean>;
  replace(record:SchedulingRecord,payload:Record<string,unknown>):Promise<boolean>;
}
export function createSchedulingState():SchedulingState {
  const db=createScoutDatabase();
  const unavailable=()=>new BookingError(503,'Scheduling is temporarily unavailable. Please retry.');
  return {
    async get(key,owner){const {data,error}=await db.from('scout_scheduling_state').select('*').eq('key',key).eq('owner_hash',owner).maybeSingle();if(error)throw unavailable();return data as SchedulingRecord|null;},
    async list(owner,kind){const {data,error}=await db.from('scout_scheduling_state').select('*').eq('owner_hash',owner).eq('kind',kind).gt('expires_at',new Date().toISOString()).order('expires_at',{ascending:false}).limit(20);if(error)throw unavailable();return data as SchedulingRecord[];},
    async insert(record){const {error}=await db.from('scout_scheduling_state').insert(record);if(error?.code==='23505')return false;if(error)throw unavailable();return true;},
    async replace(record,payload){const {data,error}=await db.from('scout_scheduling_state').update({payload,version:record.version+1,...(record.kind!=='proposal'&&typeof payload.until==='number'?{expires_at:new Date(payload.until).toISOString()}:{})}).eq('key',record.key).eq('owner_hash',record.owner_hash).eq('version',record.version).select('key');if(error)throw unavailable();return data?.length===1;},
  };
}
