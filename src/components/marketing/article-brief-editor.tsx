'use client';
import {useRef,useState} from 'react';
import {articleBriefFields,articleBriefSchema,suggestedArticleBrief} from '@/lib/marketing/opportunities/article-brief';
import type {Opportunity} from '@/lib/marketing/opportunities/contracts';
import styles from './marketing.module.css';
import layout from './opportunity-backlog.module.css';

export function ArticleBriefEditor({opportunity:o,disabled,onDirtyChange,onSaved}:{opportunity:Opportunity;disabled:boolean;onDirtyChange:(dirty:boolean)=>void;onSaved:()=>Promise<void>}){
 const initial=o.ownerBrief?.content??suggestedArticleBrief(o.id,o.finding.title,o.finding.targetCustomer,o.finding.title,o.finding.recommendedAction,o.finding.limitations.join(' '));
 const [brief,setBrief]=useState(initial),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const inflight=useRef(false),valid=articleBriefSchema.safeParse(brief).success;
 async function save(){
  if(inflight.current||disabled||!valid)return;inflight.current=true;setBusy(true);setError('');
  try{
   const r=await fetch('/api/admin/marketing/opportunities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'saveBrief',opportunityId:o.id,expectedFindingId:o.findingId,expectedBriefId:o.ownerBrief?.id??null,brief})});
   const body=await r.json();if(!r.ok)throw Error(body.error||'Article brief could not be saved.');
   onDirtyChange(false);setEditing(false);await onSaved();
  }catch(e){setError(e instanceof Error?e.message:'Article brief could not be saved.');}finally{inflight.current=false;setBusy(false);}
 }
 return <section className={layout.review} aria-label="Owner article brief"><h3>Article brief</h3><p className={styles.note}>{o.ownerBrief?'Owner-directed · Version '+o.ownerBrief.version:'Suggested brief · save before approval'}. Saving is not approval and does not run an agent.</p>
  <div className={styles.seoControls}>{!editing&&<button type="button" className={styles.secondary} disabled={busy||disabled} onClick={()=>setEditing(true)}>Edit article brief</button>}{(editing||!o.ownerBrief)&&<button type="button" className={styles.secondary} disabled={!valid||busy||disabled} onClick={()=>void save()}>{busy?'Saving brief…':'Save article brief'}</button>}{editing&&<button type="button" className={styles.secondary} disabled={busy} onClick={()=>{setBrief(initial);setEditing(false);onDirtyChange(false);}}>Cancel brief edits</button>}</div>
  {editing?<>{articleBriefFields.map(([key,label])=><label key={key}>{label}<textarea rows={key==='coverage'?3:2} maxLength={key==='title'||key==='cta'?200:key==='problem'?400:key==='technicalSupport'?300:key==='limitations'?450:500} value={brief[key]} disabled={busy||disabled} onChange={e=>{const next={...brief,[key]:e.target.value};setBrief(next);onDirtyChange(JSON.stringify(next)!==JSON.stringify(initial));}}/></label>)}<p className={styles.note}>Title, problem, coverage and technical support: 1,350 characters combined.</p></>:<dl className={layout.facts}>{articleBriefFields.map(([key,label])=><div key={key}><dt>{label}</dt><dd>{brief[key]}</dd></div>)}</dl>}

  {!valid&&<p role="alert">Complete the brief within the field and combined length limits.</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}
  {o.briefHistory&&o.briefHistory.length>0&&<details className={styles.ownerDetails}><summary>Advanced Details · brief history</summary>{o.briefHistory.map(b=><p key={b.id}>Version {b.version} · {new Date(b.createdAt).toLocaleString()} · {b.content.title}<small> · {b.hash}</small></p>)}</details>}
 </section>;
}
