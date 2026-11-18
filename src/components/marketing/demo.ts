// Presentation-only fixtures. Imported exclusively by the client workspace, never a route/service.
import type { MarketingDashboard, ReportingData, ReportTable, SourceResult } from '@/lib/marketing/types';
const table=(columns:string[],rows:[string,number[]][]):ReportTable=>({columns,rows:rows.map(([label,values])=>({label,values}))});
export function demoReport(days:7|28|90):MarketingDashboard {
  const end=new Date('2026-11-16T12:00:00Z'),start=new Date(end);start.setUTCDate(start.getUTCDate()-days+1);
  const daily=Array.from({length:days},(_,i)=>{
    const date=new Date(start);date.setUTCDate(date.getUTCDate()+i);
    const sessions=Math.round(95+i*2.4+22*Math.sin(i*.78)+9*Math.cos(i*1.2));
    return {date:date.toISOString().slice(0,10),sessions,users:Math.round(sessions*.78),views:Math.round(sessions*2.2),clicks:Math.round(sessions*.46),impressions:Math.round(sessions*8.4)};
  });
  const sum=(key:'sessions'|'views'|'clicks'|'impressions')=>daily.reduce((total,row)=>total+row[key],0);
  const sessions=sum('sessions'),clicks=sum('clicks'),impressions=sum('impressions');
  const ga4:ReportingData={
    overview:table(['Active users','Sessions','Page views'],[['Selected period',[Math.round(sessions*.65),sessions,sum('views')]]]),
    daily:table(['Active users','Sessions','Page views'],daily.map(r=>[r.date,[r.users,r.sessions,r.views]])),
    acquisition:table(['Sessions','Active users'],[['Organic Search / google / organic',[Math.round(sessions*.46),Math.round(sessions*.33)]],['Direct / (direct) / (none)',[Math.round(sessions*.29),Math.round(sessions*.19)]],['Referral / partner.example / referral',[Math.round(sessions*.16),Math.round(sessions*.1)]],['Organic Social / linkedin / social',[Math.round(sessions*.09),Math.round(sessions*.06)]]]),
    pages:table(['Sessions'],[['/',[Math.round(sessions*.35)]],['/ai-solutions',[Math.round(sessions*.27)]],['/salesforce',[Math.round(sessions*.22)]],['/custom-applications',[Math.round(sessions*.16)]]]),
    services:table(['Engagement events'],[['/ai-solutions',[Math.round(sessions*.19)]],['/salesforce',[Math.round(sessions*.16)]],['/custom-applications',[Math.round(sessions*.12)]]]),
    conversions:table(['Event count'],[['scout_open',[Math.round(sessions*.16)]],['consultation_start',[Math.round(sessions*.045)]],['consultation_booked',[daily.reduce((n,r)=>n+Math.round(r.sessions*.018),0)]]]),
    conversionDaily:table(['Event count'],daily.map(r=>[r.date+' / consultation_booked',[Math.round(r.sessions*.018)]])),
    notes:['Simulated presentation data. These are not actual website results or verified appointments.'],
  };
  const search:ReportingData={
    overview:table(['Clicks','Impressions','CTR','Avg. position'],[['Selected period',[clicks,impressions,clicks/impressions,12.4]]]),
    daily:table(['Clicks','Impressions','CTR','Avg. position'],daily.map((r,i)=>[r.date,[r.clicks,r.impressions,r.clicks/r.impressions,15-i*.04]])),
    pages:table(['Clicks','Impressions','CTR','Avg. position'],[['/ai-solutions',[Math.round(clicks*.42),Math.round(impressions*.4),clicks*.42/(impressions*.4),9.6]],['/salesforce',[Math.round(clicks*.33),Math.round(impressions*.35),clicks*.33/(impressions*.35),11.2]],['/custom-applications',[Math.round(clicks*.25),Math.round(impressions*.25),clicks/impressions,14.8]]]),
    queries:table(['Clicks','Impressions','CTR','Avg. position'],[['business AI architecture',[Math.round(clicks*.3),Math.round(impressions*.3),clicks/impressions,8.4]],['salesforce modernization',[Math.round(clicks*.25),Math.round(impressions*.27),clicks*.25/(impressions*.27),10.3]],['custom business applications',[Math.round(clicks*.2),Math.round(impressions*.23),clicks*.2/(impressions*.23),12.6]]]),notes:['Simulated search performance. No production reports are modified.'],
  };
  const source=(data:ReportingData):SourceResult=>({data,status:'connected',message:'Simulated demonstration data',updatedAt:null,cached:false,persisted:false});
  return {range:{days,start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)},ga4:source(ga4),search:source(search)};
}
