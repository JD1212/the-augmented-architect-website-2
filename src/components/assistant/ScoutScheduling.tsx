'use client';
import { useEffect, useRef, useState } from 'react';
import { appointmentLabel, browserTimezone } from '@/lib/display-timezone';
import type { SchedulingUI, SchedulingProposal } from '@/lib/booking/scheduling';
import styles from './assistant.module.css';
/** Secure controls are separate from chat: OTPs never enter send() or transcript state. */
export function ScoutScheduling({revision,disabled,onSend}:{revision:string;disabled:boolean;onSend:(message:string)=>Promise<void>}){
  const controls=useRef<HTMLDivElement>(null);
  const [state,setState]=useState<(SchedulingUI&{enabled:boolean;visitorTimezone:string})|null>(null),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    const abort=new AbortController();
    fetch('/api/scout/scheduling',{cache:'no-store',signal:abort.signal}).then(async r=>{if(!r.ok)throw Error('Scheduling controls could not be loaded.');return r.json();}).then(data=>{if(!abort.signal.aborted)setState({...data,visitorTimezone:browserTimezone()});}).catch(()=>{/* Chat and the existing booking form remain available. */});
    return()=>abort.abort();
  },[revision]);
  const actionKey=state?.enabled ? `${state.verificationRequired}:${state.proposals.filter(p=>p.state!=='done').map(p=>p.id).join(',')}` : '';
  useEffect(()=>{if(actionKey&&actionKey!=='false:')controls.current?.scrollIntoView({block:'nearest',behavior:'instant'});},[actionKey]);
  async function action(payload:Record<string,string>){
    if(busy||disabled)return;setBusy(true);setError('');
    try{
      const response=await fetch('/api/scout/scheduling',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),data=await response.json();
      if(!response.ok)throw Error(data.error||'Please retry this action.');
      setCode('');
      if(payload.action==='verify'){setState(s=>s?{...s,verificationRequired:false}:s);await onSend("I've verified my email. Please show my appointments.");}
      else await onSend(data.action==='cancel'?'Please cancel the appointment I just approved.':data.action==='reschedule'?'Please reschedule the appointment to the time I just approved.':'Please confirm the consultation I just approved.');
    }catch(e){setError(e instanceof Error?e.message:'Please try again.');}
    finally{setBusy(false);}
  }
  const summary=(p:SchedulingProposal)=>appointmentLabel(p.start,state?.visitorTimezone??p.timezone);
  if(!state?.enabled)return null;
  return <div ref={controls} className={styles.scheduling} aria-label="Secure appointment controls">
    {state.verificationRequired&&<form onSubmit={event=>{event.preventDefault();void action({action:'verify',code});}}>
      <label htmlFor="scout-verification">Email verification code</label>
      <p>Enter the six-digit code here, never in chat. It expires after 10 minutes.</p>
      <input id="scout-verification" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,''))} disabled={busy||disabled} required/>
      <button type="submit" className={styles.schedulingAction} disabled={busy||disabled||code.length!==6}>Verify email</button>
    </form>}
    {state.proposals.filter(p=>p.state!=='done').map(p=><section key={p.id} aria-label="Appointment confirmation">
      <strong>{p.action==='book'?'Confirm consultation':p.action==='cancel'?'Confirm cancellation':'Confirm rescheduling'}</strong>
      {p.name&&<p>{p.name} · {p.email}</p>}
      <p>{summary(p)} · 30 minutes</p>
      <button type="button" className={styles.schedulingAction} disabled={busy||disabled} onClick={()=>void action({action:'approve',proposalId:p.id})}>{p.state==='pending'?'Retry this same operation':p.action==='book'?'Confirm booking':p.action==='cancel'?'Confirm cancellation':'Confirm new time'}</button>
    </section>)}
    {busy&&<p role="status">Checking your scheduling request…</p>}
    {error&&<p role="alert">{error}</p>}
  </div>;
}
