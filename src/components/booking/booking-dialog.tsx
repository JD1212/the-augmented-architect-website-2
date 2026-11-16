'use client';

import { useEffect, useRef, useState } from 'react';
import { bookingCopy as copy } from '@/content/booking';
import type { BookingResult, Slot } from '@/lib/booking/types';
import styles from './booking.module.css';
type Availability = {timezone:string;today:string;lastDate:string;slots:Slot[]};
export function BookingDialog({open,onClose}:{open:boolean;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null),close=useRef<HTMLButtonElement>(null),locked=useRef(false),requestId=useRef<string | null>(null);
  const [metadata,setMetadata]=useState<Availability | null>(null),[date,setDate]=useState(''),[slots,setSlots]=useState<Slot[]>([]),[start,setStart]=useState('');
  const [timezone,setTimezone]=useState('UTC'),[name,setName]=useState(''),[email,setEmail]=useState(''),[description,setDescription]=useState(''),[confirmed,setConfirmed]=useState(false);
  const [loading,setLoading]=useState(false),[submitting,setSubmitting]=useState(false),[attempted,setAttempted]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<BookingResult | null>(null);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{ if(open){dialog.current?.showModal();close.current?.focus({preventScroll:true});}else dialog.current?.close(); },[open]);
  useEffect(()=>{
    if(!open || metadata)return;
    const abort=new AbortController();
    Promise.resolve().then(()=>{if(abort.signal.aborted)return;setLoading(true);setError('');setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);return fetch('/api/booking',{cache:'no-store',credentials:'same-origin',signal:abort.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||copy.failure);if(abort.signal.aborted)return;setMetadata(data);setDate(data.today);setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);})
      .catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error ? e.message : copy.failure);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});});
    return()=>abort.abort();
  },[open,metadata,retry]);
  useEffect(()=>{
    if(!open || !metadata || !date || attempted)return;
    const abort=new AbortController();
    Promise.resolve().then(()=>{if(abort.signal.aborted)return;setLoading(true);setError('');setStart('');setSlots([]);return fetch('/api/booking?date='+encodeURIComponent(date),{cache:'no-store',credentials:'same-origin',signal:abort.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||copy.failure);if(!abort.signal.aborted)setSlots(data.slots);})
      .catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error ? e.message : copy.failure);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});});
    return()=>abort.abort();
  },[open,metadata,date,attempted,retry]);
  function dismiss() { dialog.current?.close(); onClose(); }
  function format(value:string) {try{return new Intl.DateTimeFormat('en',{timeZone:timezone,dateStyle:'full',timeStyle:'short'}).format(new Date(value));}catch{return value;}}
  function timeLabel(value:string) {try{return new Intl.DateTimeFormat('en',{timeZone:timezone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'shortOffset'}).format(new Date(value));}catch{return value;}}
  async function submit() {
    if(!metadata || locked.current || !confirmed || !start)return;locked.current=true;setSubmitting(true);setError('');
    requestId.current ??= crypto.randomUUID();
    try {
      const response=await fetch('/api/booking',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:requestId.current,name,email,start,timezone,description,confirmed:true})});const data=await response.json();
      if(!response.ok){
        if([400,401,403,413,415].includes(response.status)||data.code==='slot_unavailable'){setAttempted(false);setResult(null);if(data.code==='slot_unavailable'){requestId.current=null;setSlots(previous=>previous.filter(slot=>slot.start!==start));setStart('');setConfirmed(false);}setError(data.error||copy.failure);return;}
        throw Error(data.error||copy.failure);
      }setAttempted(true);setResult(data);
    }catch(e){setAttempted(true);setError(e instanceof Error?e.message:copy.failure);setResult({status:'pending'});}
    finally{locked.current=false;setSubmitting(false);}
  }
  const unavailable=!metadata;
  return <dialog ref={dialog} id="consultation-booking" className={styles.dialog} aria-labelledby="booking-title" aria-describedby="booking-intro" onCancel={event=>{event.preventDefault();dismiss();}}
    onClick={event=>{if(event.target===event.currentTarget){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dismiss();}}}
    onKeyDown={event=>{if(event.key!=='Tab')return;const controls=event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]');const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}>
    <header className={styles.header}><div><h2 id="booking-title">{copy.title}</h2><p id="booking-intro">{copy.introduction}</p></div><button type="button" ref={close} className={styles.close} aria-label={copy.close} onClick={dismiss}>×</button></header>
    <div className={styles.body}>
      {result?.status==='confirmed'?<section role="status"><h3>{copy.confirmed}</h3><p>{format(result.start)} · {timezone}</p><p>{copy.invitation}</p><a className="button" href={result.meetUrl} target="_blank" rel="noopener noreferrer">{copy.meet}</a></section>:<>
        {loading&&<p role="status">{copy.loading}</p>}
        {error&&<p role="alert" className={styles.error}>{error}</p>}
        {unavailable&&!loading&&<button type="button" className="text-link" onClick={()=>setRetry(v=>v+1)}>{copy.retry}</button>}
        <form onSubmit={event=>{event.preventDefault();void submit();}}>
          <fieldset disabled={unavailable||attempted||loading||submitting} className={styles.fields}>
            <label>{copy.name}<input name="name" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} required maxLength={200}/></label>
            <label>{copy.email}<input name="email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254}/></label>
            <label>{copy.date}<input name="date" type="date" min={metadata?.today} max={metadata?.lastDate} value={date} onChange={e=>setDate(e.target.value)} required/>{metadata&&<small>{copy.schedule} {metadata.timezone}</small>}</label>
            <label>{copy.timezone}<select name="timezone" value={timezone} onChange={e=>setTimezone(e.target.value)}>{[...new Set([timezone,...(metadata?[metadata.timezone]:[]),'UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Costa_Rica','Europe/London'])].map(t=><option key={t}>{t}</option>)}</select></label>
            <label className={styles.full}>{copy.time}<select name="time" value={start} onChange={e=>setStart(e.target.value)} required><option value="">{copy.choose}</option>{slots.map(slot=><option key={slot.start} value={slot.start}>{timeLabel(slot.start)}</option>)}</select>{!unavailable&&!loading&&!error&&!slots.length&&<small>{copy.noSlots}</small>}</label>
            <label className={styles.full}>{copy.description}<textarea name="description" value={description} onChange={e=>setDescription(e.target.value)} maxLength={4000} rows={3}/></label>
          </fieldset>
          {start&&<p className={styles.summary}>{format(start)} · {timezone} · 30 minutes</p>}
          <label className={styles.confirm}><input type="checkbox" checked={confirmed} disabled={unavailable||attempted||submitting} onChange={e=>setConfirmed(e.target.checked)} required/>{copy.confirm}</label>
          {result?.status==='pending'&&<p role="status">{copy.pending}</p>}
          <p className={styles.privacy}>{copy.privacy}</p>
          <button className="button" type="submit" disabled={unavailable||!confirmed||!start||submitting||loading}>{submitting?copy.submitting:result?.status==='pending'?copy.retry:copy.submit}</button>
        </form>
      </>}
    </div>
  </dialog>;
}
