import type { ReportTable } from '@/lib/marketing/types';
export function formatted(value:number|undefined,column:string) {
  if(value===undefined||!Number.isFinite(value))return '—';
  return new Intl.NumberFormat('en-US',column==='CTR'?{style:'percent',maximumFractionDigits:2}:{maximumFractionDigits:column==='Avg. position'?1:0}).format(value);
}
export function metric(table:ReportTable|undefined,column:string):number|undefined {
  const index=table?.columns.indexOf(column)??-1;
  return index<0?undefined:table?.rows[0]?.values[index];
}
export function comparison(current:number|undefined,previous:number|undefined,column:string):string {
  // Small samples produce impressive but unhelpful percentage changes.
  if(current===undefined||previous===undefined)return 'Comparison unavailable';
  if(column==='CTR'||column==='Avg. position')return 'See search context below';
  if(current<10||previous<10)return 'More data needed to compare';
  const change=(current-previous)/previous*100;
  return `${change>0?'+':''}${change.toFixed(1)}% vs previous period`;
}
export function eventValue(table:ReportTable|undefined,event:string) {
  // Absence in a successfully returned event table means no reportable events;
  // a missing source/table means unavailable, never an invented zero.
  return table?table.rows.find(row=>row.label===event)?.values[0]??0:undefined;
}
export function chartDate(label:string) {return label.replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3');}

export function seriesPositions(labels:string[]):number[] {
  const times=labels.map(label=>Date.parse(chartDate(label)+'T00:00:00Z'));
  const min=Math.min(...times),max=Math.max(...times);
  if(times.every(Number.isFinite)&&max>min)return times.map(t=>(t-min)/(max-min));
  return labels.map((_,i)=>labels.length===1?.5:i/Math.max(labels.length-1,1));
}
