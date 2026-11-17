'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MarketingDashboard, ReportTable, SourceResult } from '@/lib/marketing/types';
import styles from './marketing.module.css';

function formatted(value:number,column:string) {
  return column==='CTR'?new Intl.NumberFormat(undefined,{style:'percent',maximumFractionDigits:2}).format(value):new Intl.NumberFormat(undefined,{maximumFractionDigits:column==='Avg. position'?1:0}).format(value);
}
function Table({title,table,label='Dimension'}:{title:string;table?:ReportTable;label?:string}) {
  return <section className={styles.panel}><h3>{title}</h3>{!table?.rows.length?<p className={styles.empty}>No reportable rows for this period.</p>:<>
    <div className={styles.tableWrap}><table><caption className={styles.srOnly}>{title}</caption><thead><tr><th scope="col">{label}</th>{table.columns.map(c=><th scope="col" key={c}>{c}</th>)}</tr></thead><tbody>{table.rows.slice(0,25).map((row,i)=><tr key={row.label+':'+i}><th scope="row">{row.label}</th>{row.values.map((n,j)=><td key={j}>{formatted(n,table.columns[j])}</td>)}</tr>)}</tbody></table></div>
    {(table.rows.length>25||table.limited)&&<p className={styles.note}>Showing up to 25 rows. Provider limits and privacy thresholds can omit additional rows.</p>}
  </>}</section>;
}
function Metrics({source}:{source:SourceResult}) {
  const values=source.data?.overview.rows[0]?.values;
  return <div className={styles.metrics}>{source.data?.overview.columns.map((label,i)=><div key={label}><span>{label}</span><strong>{values?formatted(values[i],label):'—'}</strong></div>)}</div>;
}
function Trend({table,metric}:{table:ReportTable;metric:string}) {
  const column=table.columns.indexOf(metric),rows=table.rows,maximum=Math.max(...rows.map(r=>r.values[column]),1);
  const points=rows.map((r,i)=>`${rows.length===1?300:20+i*560/(rows.length-1)},${150-r.values[column]/maximum*125}`).join(' ');
  return <section className={styles.panel}><h3>Daily {metric.toLowerCase()}</h3>{rows.length?<>
    <svg className={styles.trend} viewBox="0 0 600 180" role="img" aria-label={`${metric} trend. Exact daily values are in the table below.`}><line x1="20" x2="580" y1="150" y2="150"/><polyline points={points}/>{rows.length===1&&<circle cx="300" cy={150-rows[0].values[column]/maximum*125} r="4"/>}</svg>
    <details><summary>View daily data</summary><div className={styles.tableWrap}><table><caption className={styles.srOnly}>Daily {metric.toLowerCase()}</caption><thead><tr><th scope="col">Date</th>{table.columns.map(c=><th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.label}><th scope="row">{r.label.replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3')}</th>{r.values.map((n,i)=><td key={i}>{formatted(n,table.columns[i])}</td>)}</tr>)}</tbody></table></div></details>
  </>:<p className={styles.empty}>A trend will appear once the provider has daily data. Missing dates are not invented as zero.</p>}</section>;
}
function Source({title,source,children}:{title:string;source:SourceResult;children:React.ReactNode}) {
  return <section className={styles.source} aria-label={title}>
    <div className={styles.sourceHeading}><h2>{title}</h2><span className={styles.status} data-state={source.status}>{source.status.replaceAll('_',' ')}</span></div>
    <p className={styles.muted}>{source.message}</p>
    <p className={styles.note}>{source.updatedAt?`Retrieved ${new Date(source.updatedAt).toLocaleString()}${source.cached?' · cached for up to five minutes':''}`:'No successful retrieval yet.'}{source.data&&!source.persisted?' · Snapshot could not be saved; these are live provider results.':''}</p>
    {source.data&&<><Metrics source={source}/>{children}<ul className={styles.notes}>{source.data.notes.map(note=><li key={note}>{note}</li>)}</ul></>}
  </section>;
}
export function MarketingDashboardView() {
  const router=useRouter();
  const [days,setDays]=useState('28'),[report,setReport]=useState<MarketingDashboard|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{const abort=new AbortController();
    fetch('/api/admin/marketing?days='+days,{cache:'no-store',signal:abort.signal}).then(async response=>{const data=await response.json();if(!response.ok){if(response.status===401||response.status===403){setReport(null);router.replace('/admin/login');router.refresh();return;}throw Error(data.error||'Reports are unavailable.');}if(!abort.signal.aborted){setReport(data);setError('');setBusy(false);}}).catch(error=>{if(!abort.signal.aborted){setError(error instanceof Error?error.message:'Reports are unavailable.');setBusy(false);}});
    return()=>abort.abort();
  },[days,retry,router]);
  async function logout(){try{const response=await fetch('/api/admin/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(!response.ok)throw Error('Sign out failed. Please retry.');setReport(null);router.replace('/admin/login');router.refresh();}catch(error){setError(error instanceof Error?error.message:'Please retry.');}}
  return <div className={styles.dashboard}>
    <header className={styles.heading}><div><p className={styles.eyebrow}>THE AUGMENTED ARCHITECT · OWNER INTELLIGENCE</p><h1>Marketing, with context.</h1><p className={styles.muted}>Real website and search performance. Evidence before assumptions.</p></div><button className={styles.secondary} onClick={()=>void logout()}>Sign out</button></header>
    <div className={styles.toolbar}><label htmlFor="marketing-range">Reporting period</label><select id="marketing-range" value={days} onChange={event=>{setBusy(true);setReport(null);setDays(event.target.value);}}>{['7','28','90'].map(d=><option key={d} value={d}>Last {d} complete days</option>)}</select><button className={styles.secondary} onClick={()=>{setBusy(true);setRetry(value=>value+1);}} disabled={busy}>Refresh reports</button><span className={styles.note}>{report&&`${report.range.start} – ${report.range.end}`}</span></div>
    {busy&&<p role="status" className={styles.empty}>Retrieving private reports…</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {report&&<div aria-busy={busy}>
      <Source title="Website traffic & acquisition" source={report.ga4}>
        {report.ga4.data&&<><Trend table={report.ga4.data.daily} metric="Sessions"/><div className={styles.grid}><Table title="Traffic sources & channels" table={report.ga4.data.acquisition}/><Table title="Top landing pages" table={report.ga4.data.pages} label="Landing page"/><Table title="Service-page engagement" table={report.ga4.data.services} label="Service page"/><Table title="Consultation & Scout activity" table={report.ga4.data.conversions} label="Observed event"/></div></>}
      </Source>
      <Source title="Google Search performance" source={report.search}>
        {report.search.data&&<><Trend table={report.search.data.daily} metric="Clicks"/><div className={styles.grid}><Table title="Top search queries" table={report.search.data.queries} label="Search query"/><Table title="Search landing-page performance" table={report.search.data.pages} label="Page"/></div></>}
      </Source>
      <aside className={styles.context}><h2>Compare paths. Keep metrics distinct.</h2><p>Landing pages use consistent paths without query strings or fragments. Search Console clicks describe Google Search activity; GA4 sessions describe consented website visits. Their totals, timezones, latency and coverage differ. Neither alone proves why a result changed.</p></aside>
    </div>}
  </div>;
}
