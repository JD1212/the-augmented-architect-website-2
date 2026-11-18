'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './marketing.module.css';

type Stage = 'loading'|'login'|'enroll'|'challenge';
export function OwnerLogin() {
  const router=useRouter();
  const [stage,setStage]=useState<Stage>('loading'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [factorId,setFactor]=useState(''),[qr,setQr]=useState(''),[factorName,setFactorName]=useState('Marketing owner'),[recovery,setRecovery]=useState(false);
  const applyStatus=useCallback((data:{stage:string;factorId?:string;factorName?:string;error?:string},status:number)=>{
    if(status>=400){setStage('login');if(status!==401)setError(data.error??'Owner access unavailable.');return;}
    if(data.stage==='ready'){router.replace('/admin/marketing');router.refresh();return;}
    setFactor(data.factorId??'');setFactorName(data.factorName??'Marketing owner');setStage(data.stage==='challenge'?'challenge':'enroll');
  },[router]);
  async function status() {
    const response=await fetch('/api/admin/auth',{cache:'no-store'});
    const data=await response.json();applyStatus(data,response.status);
  }
  useEffect(()=>{const controller=new AbortController();fetch('/api/admin/auth',{cache:'no-store',signal:controller.signal}).then(async response=>{const data=await response.json();if(!controller.signal.aborted)applyStatus(data,response.status);}).catch(()=>{if(!controller.signal.aborted){setStage('login');setError('Owner authentication is temporarily unavailable.');}});return()=>controller.abort();},[applyStatus]);
  async function action(payload:object) {
    if(busy)return;setBusy(true);setError('');
    try {
      const response=await fetch('/api/admin/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),data=await response.json();
      if(!response.ok)throw Error(data.error||'Please retry.');
      if(data.stage==='ready'){router.replace('/admin/marketing');router.refresh();return;}
      if(data.qr){setQr(data.qr);setFactor(data.factorId);setFactorName('Marketing owner');setRecovery(false);setStage('challenge');}
      else if(data.stage==='login'){setQr('');setFactor('');setRecovery(false);setStage('login');}
      else await status();
    }catch(error){setError(error instanceof Error?error.message:'Please retry.');}
    finally{setBusy(false);}
  }
  return <section className={styles.login} aria-labelledby="owner-title">
    <p className={styles.eyebrow}>PRIVATE OWNER ACCESS</p><h1 id="owner-title">Marketing intelligence.</h1>
    <p className={styles.muted}>Secure access to your website’s traffic, search performance and consultation activity.</p>
    {stage==='loading'&&<p role="status">Checking your session…</p>}
    {stage==='login'&&<form onSubmit={event=>{event.preventDefault();const form=event.currentTarget,data=new FormData(form);void action({action:'login',email:data.get('email'),password:data.get('password')});form.reset();}}>
      <label htmlFor="owner-email">Owner email</label><input id="owner-email" name="email" type="email" autoComplete="username" required disabled={busy}/>
      <label htmlFor="owner-password">Password</label><input id="owner-password" name="password" type="password" autoComplete="current-password" maxLength={256} required disabled={busy}/>
      <button className={styles.primary} disabled={busy}>{busy?'Signing in…':'Sign in securely'}</button>
      <p className={styles.note}>Access is provisioned privately. There is no public owner registration. For password or authenticator recovery, use the verified Supabase project administrator.</p>
    </form>}
    {stage==='enroll'&&<div><h2>Set up your authenticator</h2><p>This account has authenticator verification enabled. Use your authenticator app to scan the setup code, then enter its six-digit code.</p><button className={styles.primary} onClick={()=>void action({action:'enroll'})} disabled={busy}>Set up authenticator</button></div>}
    {stage==='challenge'&&<form onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);void action({action:'verify',factorId,code:data.get('code')});event.currentTarget.reset();}}>
      <h2>{qr?'Scan, then verify':'Verify your authenticator'}</h2>
      <p className={styles.note}>{qr?'Scan this QR code with your authenticator app, then enter its current six-digit code.':`Use the current six-digit code from your ${factorName} authenticator. Look for “The Augmented Architect” in the app or password manager you used during setup. This code is not sent by email or SMS.`}</p>
      {qr&&<div className={styles.qr}>{/* Provisioning QR stays in this authenticated, no-store response; never logged. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr.startsWith('data:image/svg+xml')?qr:`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(qr)))}`} width={220} height={220} alt="Authenticator enrollment QR code"/>
      </div>}
      <label htmlFor="owner-code">Six-digit authenticator code</label><input id="owner-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy}/>
      <button className={styles.primary} disabled={busy}>{busy?'Verifying…':'Verify and open dashboard'}</button>
    </form>}
    {stage==='challenge'&&!qr&&<div><button className={styles.secondary} type="button" aria-expanded={recovery} aria-controls="owner-mfa-recovery" onClick={()=>setRecovery(value=>!value)}>I can’t access my authenticator</button>{recovery&&<p id="owner-mfa-recovery" className={styles.note}>MFA is already registered for this account. A verified Supabase project administrator must confirm your identity, revoke existing sessions and reset the unavailable factor. Then sign in again to scan a new QR code and verify its first code before accessing reports. A password alone cannot replace a registered authenticator.</p>}</div>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {stage!=='login'&&stage!=='loading'&&<button className={styles.secondary} disabled={busy} onClick={()=>void action({action:'logout'})}>Sign out</button>}
  </section>;
}
