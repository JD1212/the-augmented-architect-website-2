'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {SeoPanelData} from '@/lib/marketing/seo/contracts';
export function useSeoAnalyst(demo:boolean){
  const router=useRouter(),requestId=useRef<string|null>(null),selectionKey=useRef('');
  const [data,setData]=useState<SeoPanelData|null>(null),[statusError,setStatusError]=useState(''),[runError,setRunError]=useState(''),[submitting,setSubmitting]=useState(false);
  const load=useCallback(async(signal?:AbortSignal)=>{
    if(demo||signal?.aborted)return;
    try{const r=await fetch('/api/admin/marketing/seo',{cache:'no-store',signal});if(r.status===401||r.status===403){router.replace('/admin/login');router.refresh();return;}const body=await r.json();if(!r.ok)throw Error(body.error||'SEO Analyst status is unavailable.');if(signal?.aborted)return;setData(body);setStatusError('');const ownRun=body.runs.find((run:{id:string})=>run.id===requestId.current);if(ownRun&&!['running','queued'].includes(ownRun.state))requestId.current=null;
    }catch(e){if(!signal?.aborted)setStatusError(e instanceof Error?e.message:'SEO Analyst status is unavailable.');}
  },[demo,router]);
  useEffect(()=>{if(demo)return;const abort=new AbortController();void Promise.resolve().then(()=>load(abort.signal));return()=>abort.abort();},[demo,load]);
  const running=!demo&&Boolean(data?.runs.some(run=>['running','queued'].includes(run.state)));
  useEffect(()=>{if(demo||!running&&!submitting)return;const abort=new AbortController(),timer=setInterval(()=>void load(abort.signal),2500);return()=>{abort.abort();clearInterval(timer);};},[demo,running,submitting,load]);
  async function run(days:7|28|90,planId:string,researchIds:string[]){
    if(demo||submitting||running||!planId)return;const key=JSON.stringify([days,planId,researchIds]);if(key!==selectionKey.current){requestId.current=null;selectionKey.current=key;}setSubmitting(true);setRunError('');requestId.current??=crypto.randomUUID();
    try{const r=await fetch('/api/admin/marketing/seo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:requestId.current,days,planId,researchIds,executionConfirmed:true})});const body=await r.json();if(!r.ok)throw Error(body.error||'Analysis could not complete.');}
    catch(e){setRunError(e instanceof Error?e.message:'Analysis could not complete. Refresh status before trying again.');}
    finally{await load();setSubmitting(false);}
  }
  return {data:demo?null:data,error:demo?'':runError||statusError,submitting,running,run,refresh:()=>load()};
}
export type SeoController=ReturnType<typeof useSeoAnalyst>;
