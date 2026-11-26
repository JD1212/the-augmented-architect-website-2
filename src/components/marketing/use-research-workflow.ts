'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import type {SavedPlan} from '@/lib/marketing/intelligence/planning';
export type ResearchWorkflowState={plans:SavedPlan[];authorizations:{id:string;planId:string;maximumRequests:number;maximumCostUsd:number;remainingRequests:number;blocked:boolean}[];providers?:{id:string;ready:boolean;message:string}[];evidence:{id:string;planId:string|null;planIds?:string[];mode:string;terms:string[];eligible:boolean}[]};
export function useResearchWorkflow(demo:boolean){
 const params=useSearchParams(),planId=params.get('plan')??'',researchIds=(params.get('evidence')??'').split(',').filter(Boolean);
 const revision=useRef(0);
 const [data,setData]=useState<ResearchWorkflowState|null>(null),[error,setError]=useState('');
 const refresh=useCallback(async(signal?:AbortSignal)=>{if(demo)return;const request=++revision.current;try{const r=await fetch('/api/admin/marketing/research-plans',{cache:'no-store',signal}),body=await r.json();if(!r.ok)throw Error(body.error||'Research workflow unavailable.');if(!signal?.aborted&&request===revision.current){setData(body);setError('');}}catch(e){if(!signal?.aborted&&request===revision.current)setError(e instanceof Error?e.message:'Research unavailable.');}},[demo]);
 useEffect(()=>{const a=new AbortController();void Promise.resolve().then(()=>refresh(a.signal));return()=>a.abort();},[refresh]);
 const selected=data?.plans.find(p=>p.id===planId),authorization=data?.authorizations?.filter(a=>a.planId===planId).at(-1);
 const evidence=(data?.evidence??[]).filter(e=>e.planId===planId||e.planIds?.includes(planId)||selected?.plan.steps.some(s=>s.cachedResearchIds.includes(e.id)));
 function choose(id:string,ids:string[]=[]){const next=new URLSearchParams(params);if(id)next.set('plan',id);else next.delete('plan');if(ids.length)next.set('evidence',ids.join(','));else next.delete('evidence');window.history.replaceState(null,'','?'+next.toString());}
 return {data,error,refresh,planId,researchIds,selected,authorization,evidence,choose,ready:selected?.decision==='approved'&&researchIds.every(id=>evidence.some(e=>e.id===id&&e.eligible))};
}
