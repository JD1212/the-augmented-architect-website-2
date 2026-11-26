'use client';
import {useSearchParams} from 'next/navigation';
import {OpportunityBacklog} from './opportunity-backlog';
import {KeywordIntelligence} from './keyword-intelligence';
import {ResearchPlanning} from './research-planning';
import {ResearchSelection} from './research-selection';
import {SeoAnalystPanel} from './seo-analyst-panel';
import {useResearchWorkflow} from './use-research-workflow';
import type {SeoController} from './use-seo-analyst';
import {WorkspaceTabs} from './workspace-ui';

export function DiscoverWorkspace({demo,days,section,seo,refresh}:{demo:boolean;days:7|28|90;section:string;seo:SeoController;refresh:()=>void}){
 const params=useSearchParams(),opportunity=params.get('opportunity'),workflow=useResearchWorkflow(demo);
 const active=params.get('section')==='plans'?'keywords':!params.get('section')&&!opportunity?'keywords':section;
 function navigate(value:string,id?:string){
  const next=new URLSearchParams(params);next.set('view','discover');next.set('section',value);
  if(id&&id!==workflow.planId){next.set('plan',id);next.delete('evidence');}
  window.history.pushState(null,'','?'+next.toString()+(id?'#keyword-collection':''));
  if(id)requestAnimationFrame(()=>{const collection=document.getElementById('keyword-collection');collection?.scrollIntoView({block:'start'});collection?.focus({preventScroll:true});});
 }
 function changed(id?:string){if(id)workflow.choose(id,id===workflow.planId?workflow.researchIds:[]);void workflow.refresh();}
 return <section data-discover-workspace>
  <WorkspaceTabs value={active} onChange={value=>navigate(value)} items={[["keywords","Research"],["analyst","SEO analysis"],["opportunities","Opportunities"]]} label="Discover sections">
   {active==='keywords'?<>
    <ResearchPlanning inline demo={demo} days={days} opportunity={opportunity} selectedPlanId={workflow.planId} onSelectPlan={id=>workflow.choose(id,id===workflow.planId?workflow.researchIds:[])} onChanged={changed} onCollectPlan={id=>navigate('keywords',id)}/>
    {!demo&&<ResearchSelection workflow={workflow}/>}
    <KeywordIntelligence demo={demo} days={days} workflow={workflow} connected/>
   </>:active==='analyst'?<>{!demo&&<ResearchSelection workflow={workflow}/>}<SeoAnalystPanel controller={seo} days={days} demo={demo} opportunity={opportunity} workflow={workflow} connected/></>:<OpportunityBacklog demo={demo} onWorkflowChange={refresh}/>}
  </WorkspaceTabs>
 </section>;
}
