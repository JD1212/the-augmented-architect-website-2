'use client';
import {useCallback,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {WorkflowSnapshot} from '@/lib/marketing/workflow/model';
export function useWorkflow(demo:boolean,revision:number|string){
 const router=useRouter(),[data,setData]=useState<WorkflowSnapshot|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  if(demo||signal?.aborted)return;setLoading(true);
  try{const r=await fetch('/api/admin/marketing/workflow',{cache:'no-store',signal});if(r.status===401||r.status===403){router.replace('/admin/login');throw Error('Please sign in.');}const body=await r.json();if(!r.ok||!Array.isArray(body.items)||!body.counts)throw Error(body.error||'Workflow status is unavailable.');if(!signal?.aborted){setData(body);setError('');}}
  catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'Workflow status is unavailable.');}finally{if(!signal?.aborted)setLoading(false);}
 },[demo,router]);
 useEffect(()=>{const abort=new AbortController();void Promise.resolve().then(()=>refresh(abort.signal));return()=>abort.abort();},[refresh,revision]);
 return {data:demo?null:data,error:demo?'':error,loading:!demo&&loading,refresh};
}
