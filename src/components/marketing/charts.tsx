'use client';
import { useId, useState } from 'react';
import type { ReportTable } from '@/lib/marketing/types';
import { chartDate, formatted, seriesPositions } from './report-utils';
import styles from './marketing.module.css';

export function Empty({children}:{children:React.ReactNode}) {return <div className={styles.empty}><span className={styles.emptyMark} aria-hidden="true">↗</span><div><strong>Good foundations. More signal to come.</strong><p>{children}</p></div></div>;}
export function ReportTableView({title,table,label='Dimension'}:{title:string;table?:ReportTable;label?:string}) {
  return <section className={styles.panel}><div className={styles.panelHeading}><h3>{title}</h3><span className={styles.micro}>TOP {Math.min(table?.rows.length??0,10)}</span></div>{!table?.rows.length?<Empty>No reportable rows for this period. Your provider connection and retrieval status are shown in Integrations.</Empty>:<><div className={styles.tableWrap}><table><caption className={styles.srOnly}>{title}</caption><thead><tr><th scope="col">{label}</th>{table.columns.map(c=><th scope="col" key={c}>{c}</th>)}</tr></thead><tbody>{table.rows.slice(0,10).map((r,i)=><tr key={r.label+i}><th scope="row">{r.label}</th>{r.values.map((v,j)=><td key={j}>{formatted(v,table.columns[j])}</td>)}</tr>)}</tbody></table></div>{(table.rows.length>10||table.limited)&&<p className={styles.note}>Top 10 rows shown. Source limits and privacy thresholds may omit rows.</p>}</>}</section>;
}
export function Sparkline({values}:{values:number[]}) {
  if(!values.length)return <span className={styles.noSpark}>Awaiting daily signal</span>;
  const max=Math.max(...values,1),min=Math.min(...values,0),points=values.map((v,i)=>`${values.length===1?70:i*140/(values.length-1)},${35-(v-min)/(max-min)*30}`).join(' ');
  return <svg className={styles.spark} viewBox="0 0 140 40" aria-hidden="true"><polyline points={points}/>{values.length===1&&<circle cx="70" cy={35-(values[0]-min)/(max-min)*30} r="2"/>}</svg>;
}
export function TrendChart({title,table,metric,source}:{title:string;table?:ReportTable;metric:string;source:string}) {
  const id=useId().replaceAll(':',''),[active,setActive]=useState<number|null>(null),column=table?.columns.indexOf(metric)??-1,rows=column<0?[]:table?.rows??[];
  const positions=seriesPositions(rows.map(r=>r.label));
  const max=Math.max(...rows.map(r=>r.values[column]),1),x=(i:number)=>38+positions[i]*644,y=(v:number)=>190-v/max*152;
  const points=rows.map((r,i)=>`${x(i)},${y(r.values[column])}`).join(' '),chosen=active===null?null:rows[active];
  return <section className={styles.panel} data-chart-tone={metric==='Clicks'?'violet':metric==='Impressions'?'blue':metric==='Bookings'?'amber':'cyan'}><div className={styles.panelHeading}><div><p className={styles.micro}>{source}</p><h3>{title}</h3></div><span className={styles.chartLegend}>{metric}</span></div>{rows.length?<><div className={styles.chartFrame}>
    <svg className={styles.trend} viewBox="0 0 720 230" role="img" aria-label={`${metric} trend. Focus the chart explorer or view exact daily data below.`}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".22"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
      {[0,.5,1].map(f=><g key={f}><line x1="38" x2="682" y1={y(max*f)} y2={y(max*f)}/><text x="0" y={y(max*f)+4}>{formatted(max*f,metric)}</text></g>)}
      {rows.length>1&&<><polygon points={`38,190 ${points} ${x(rows.length-1)},190`} fill={`url(#${id})`}/><polyline points={points}/></>}
      {rows.length===1&&<circle cx={x(0)} cy={y(rows[0].values[column])} r="4"/>}
      <text x="38" y="220">{chartDate(rows[0].label)}</text><text x="682" y="220" textAnchor="end">{chartDate(rows[rows.length-1].label)}</text>
      {chosen&&<g><line className={styles.crosshair} x1={x(active!)} x2={x(active!)} y1="25" y2="190"/><circle cx={x(active!)} cy={y(chosen.values[column])} r="5"/></g>}
      <rect x="38" y="24" width="644" height="166" fill="transparent" onPointerMove={e=>{const rect=e.currentTarget.getBoundingClientRect();const ratio=(e.clientX-rect.left)/rect.width;setActive(positions.reduce((best,p,i)=>Math.abs(p-ratio)<Math.abs(positions[best]-ratio)?i:best,0));}} onPointerLeave={()=>setActive(null)}/>
    </svg>
    <div className={styles.chartReadout} aria-live="polite">{chosen?<><span>{chartDate(chosen.label)}</span><strong>{formatted(chosen.values[column],metric)} {metric.toLowerCase()}</strong></>:<span>Hover over the chart or use the daily explorer</span>}</div>
  </div><label className={styles.srOnly} htmlFor={'explore-'+id}>Explore daily {metric.toLowerCase()}</label><input className={styles.chartSlider} id={'explore-'+id} type="range" min="0" max={Math.max(rows.length-1,0)} value={active??0} aria-valuetext={chosen?`${chartDate(chosen.label)}: ${formatted(chosen.values[column],metric)}`:'Select a day'} onChange={e=>setActive(Number(e.target.value))}/>
  <details className={styles.chartDetails}><summary>View exact daily data</summary><div className={styles.tableWrap}><table><caption className={styles.srOnly}>{title} daily data</caption><thead><tr><th scope="col">Date</th>{table!.columns.map(c=><th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.label}><th scope="row">{chartDate(r.label)}</th>{r.values.map((v,i)=><td key={i}>{formatted(v,table!.columns[i])}</td>)}</tr>)}</tbody></table></div></details></>:<Empty>A trend will appear once the provider has daily data. Missing dates are not invented as zero.</Empty>}</section>;
}
export function ChannelBars({table,demo=false}:{table?:ReportTable;demo?:boolean}) {
  const rows=table?.rows.slice(0,5)??[],max=Math.max(...rows.map(r=>r.values[0]),1);
  return <section className={styles.panel}><div className={styles.panelHeading}><div><p className={styles.micro}>{demo?'SIMULATED · DEMO':'GA4 · SESSIONS'}</p><h3>Where attention begins</h3></div><span className={styles.micro}>ACQUISITION</span></div>{rows.length?<div className={styles.bars}>{rows.map((r,i)=><div key={r.label}><div><span>{r.label.split(' / ')[0]}</span><strong>{formatted(r.values[0],'Sessions')}</strong></div><svg viewBox="0 0 400 8" preserveAspectRatio="none" role="img" aria-label={`${r.label}: ${r.values[0]} sessions`}><rect width="400" height="8" rx="4"/><rect className={styles.barFill} data-tone={i%3} width={Math.max(0,r.values[0]/max*400)} height="8" rx="4"/></svg><small>{r.label.split(' / ').slice(1).join(' / ')}</small></div>)}</div>:<Empty>Acquisition channels will appear here as consented visits become reportable.</Empty>}</section>;
}
