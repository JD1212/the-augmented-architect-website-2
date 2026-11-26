'use client';
import {useRef,useState} from 'react';
import type {contentState} from '@/lib/marketing/content/service';
import {articleHref} from '@/lib/article-path';
import styles from './marketing.module.css';
import scoped from './content-studio.module.css';
type State=Awaited<ReturnType<typeof contentState>>;
export function PublicationControls({data,dirty,reload}:{data:State;dirty:boolean;reload:()=>Promise<void>}){
 const [date,setDate]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[probe,setProbe]=useState<Record<string,unknown>|null>(null);const lock=useRef(false);
 const state=data.publication,head=data.head,pointer=state?.pointer,approved=Boolean((data.origin==='owner-authored'||data.grounding.assignment)&&head&&data.approvals.some(a=>a.parent_id===head.id&&a.payload.channel==='website'&&a.payload.revisionHash===head.hash));
 const pending=pointer?.payload.status==='verifying',live=pointer?.payload.active&&pointer.payload.status==='live',current=live&&pointer.payload.revisionHash===head?.hash;
 const destination=state?.environment==='production'?'Production website':'Protected Preview';
 async function run(action:'publish'|'unpublish',resume=false){
  if(lock.current||!head||!state)return;lock.current=true;setBusy(true);setMessage('');
  const history=state.history.find(h=>h.id===pointer?.payload.requestId),actualAction=resume?history?.payload.action:action;
  try{
   const body={operation:actualAction,opportunityId:data.opportunity.id,requestId:resume?pointer?.payload.requestId:crypto.randomUUID(),revisionId:resume||action==='unpublish'?pointer?.payload.revisionId:head.id,revisionHash:resume||action==='unpublish'?pointer?.payload.revisionHash:head.hash,publicationDate:pointer?.payload.firstPublicationDate||date,expectedVersion:pointer?.payload.version??0,publishConfirmed:true};
   const r=await fetch('/api/admin/marketing/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),result=await r.json();if(!r.ok)throw Error(result.error||'Publication could not be completed.');
   setMessage(result.status==='live'?'Article verified and available in '+destination+'.':result.status==='unpublished'?'Article withdrawal verified.':'Publication status: '+result.status);setConfirmed(false);
  }catch(error){setMessage(error instanceof Error?error.message:'Publication could not be completed.');}
  finally{await reload();lock.current=false;setBusy(false);}
 }
 return <section className={styles.panel} data-publication-controls><p className={styles.eyebrow}>WEBSITE PUBLICATION</p><h3>{live?'Published':'Publish the revision you approved'}</h3>{live&&pointer&&<p><a className={styles.textLink} href={state?.environment==='production'?'https://theaugmentedarchitect.com'+articleHref(pointer.payload.slug):articleHref(pointer.payload.slug)} target="_blank" rel="noopener noreferrer">{state?.environment==='production'?'https://theaugmentedarchitect.com'+articleHref(pointer.payload.slug):articleHref(pointer.payload.slug)} ↗</a></p>}
 <p>Destination: <strong>{destination}</strong>. {state?.environment!=='production'&&'This does not publish to the public Production website.'}</p>
 <p>Website approval: <strong>{approved?'Exact revision approved':'Approval required'}</strong> · revision {head?.hash.slice(0,12)}</p>
 <p>Next: {dirty?'Return to Create and save or review the current revision.':!approved?'Review this revision, then approve it for the website.':current?'This approved revision is already live in this destination.':!state?.enabled?'Publishing is disabled in this environment.':pending?'Confirm and verify the pending publication.':'Choose a publication date and explicitly confirm publishing below.'}</p>
 <p role="status">Status: <strong>{pending?'Publishing · verification pending':live?'Live in '+destination:pointer?.payload.status==='unpublished'?'Unpublished':'Not published'}</strong></p>
 {!state?.enabled&&<p>Direct publishing is disabled in this environment.</p>}
 {!approved&&<p>Review and approve the exact website revision above before publishing. Approval alone does not publish it.</p>}

 {pointer?.payload.firstPublicationDate?<p>Publication date: <time>{pointer.payload.firstPublicationDate}</time>. </p>:<><label htmlFor="direct-publication-date">Publication date</label><input id="direct-publication-date" type="date" value={date} onChange={e=>setDate(e.target.value)}/></>}
 <label><input id="direct-publication-confirm" type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I explicitly authorize this publication or withdrawal in {destination}.</label>
 <div className={scoped.controls}>{pending?<button className={styles.primary} disabled={!state?.enabled||busy||!confirmed} onClick={()=>void run('publish',true)}>Verify publication</button>:<><button className={styles.primary} disabled={!state?.enabled||!approved||dirty||busy||!confirmed||current||!pointer?.payload.firstPublicationDate&&!date} onClick={()=>void run('publish')}>{busy?'Publishing & verifying…':live?'Publish approved update':'Publish website article'}</button><button className={styles.secondary} disabled={!state?.enabled||!live||busy||!confirmed} onClick={()=>void run('unpublish')}>Unpublish website article</button></>}
 {pointer?.payload.active&&<a className={styles.textLink} href={articleHref(pointer.payload.slug)}>View article →</a>}</div>
 {message&&<p role="status">{message}</p>}
 {state?.environment.startsWith('preview:')&&<details><summary>Advanced Details · verification diagnostics</summary><button className={styles.secondary} disabled={busy} onClick={()=>{setBusy(true);void fetch('/api/admin/marketing/content?opportunityId='+data.opportunity.id+'&diagnostics=1',{cache:'no-store'}).then(async r=>{const result=await r.json();if(!r.ok)throw Error(result.error||'Read-only check failed.');setProbe(result.verificationProbe);}).catch(e=>setMessage(e.message)).finally(()=>setBusy(false));}}>Check verification setup (read only)</button>{probe&&<pre>{JSON.stringify(probe,null,2)}</pre>}<p>This checks Preview configuration and access to robots.txt. It does not publish, retry or change database records.</p></details>}
 <p className={styles.note}>LinkedIn approval and manual posting are separate.</p>
 <details><summary>Advanced Details · publication history</summary>{!state?.history.length?<p>No publishing attempts yet.</p>:state.history.map(item=><div className={scoped.history} key={item.id}><p>{item.title} · {String(item.payload.status)} · {new Date(item.created_at).toLocaleString()}</p><details><summary>Revision and verification details</summary><pre>{JSON.stringify(item.payload,null,2)}</pre></details></div>)}</details></section>;
}
