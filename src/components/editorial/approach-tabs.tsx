'use client';
import {useRef,useSyncExternalStore,type KeyboardEvent,type ReactNode} from 'react';
import Link from 'next/link';
import styles from './editorial.module.css';

type Tab={id:string;label:string;href:string};
function subscribe(notify:()=>void){
 window.addEventListener('popstate',notify);window.addEventListener('hashchange',notify);
 return()=>{window.removeEventListener('popstate',notify);window.removeEventListener('hashchange',notify);};
}

/** In-place navigation; existing category URLs remain independently server-rendered. */
export function ApproachTabs({initialId,tabs,panels}:{initialId:string;tabs:Tab[];panels:ReactNode[]}){
 const nav=useRef<HTMLUListElement>(null);
 const selected=useSyncExternalStore(subscribe,()=>tabs.find(t=>'#'+t.id===window.location.hash)?.id??initialId,()=>initialId);
 function select(id:string){
  if(id===selected)return;
  window.history.pushState(null,'','#'+id);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
 }
 function key(event:KeyboardEvent<HTMLUListElement>){
  const index=tabs.findIndex(t=>t.id===selected);let next=index;
  if(event.key==='ArrowRight')next=(index+1)%tabs.length;
  else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=tabs.length-1;
  else return;
  event.preventDefault();select(tabs[next].id);nav.current?.querySelectorAll<HTMLAnchorElement>('[role=tab]')[next]?.focus();
 }
 return <main id="main" className={`container ${styles.page} ${selected==='ai-architecture'?styles.aiPage:''}`}>
  <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link href="/our-approach">Our Approach</Link><span aria-hidden="true">/</span><span aria-current="page">{tabs.find(t=>t.id===selected)?.label}</span></nav>
  <nav className="insights-category-navigation" aria-label="Explore our approach"><ul ref={nav} role="tablist" onKeyDown={key}>{tabs.map(t=><li key={t.id} role="presentation"><a id={'approach-tab-'+t.id} href={t.href} role="tab" aria-selected={selected===t.id} aria-controls={'approach-panel-'+t.id} aria-current={selected===t.id?'page':undefined} tabIndex={selected===t.id?0:-1} onClick={event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();select(t.id);}}>{t.label}</a></li>)}</ul></nav>
  {tabs.map((t,index)=><section key={t.id} id={'approach-panel-'+t.id} role="tabpanel" tabIndex={0} aria-labelledby={'approach-tab-'+t.id} hidden={selected!==t.id} className={styles.tabPanel}>{panels[index]}</section>)}
 </main>;
}
