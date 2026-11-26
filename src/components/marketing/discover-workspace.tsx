'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import type {Opportunity} from '@/lib/marketing/opportunities/contracts';
import {useResearchWorkflow} from './use-research-workflow';
import {ResearchSelection} from './research-selection';
import {discoverState} from './discover-state';
import flow from './discover-workspace.module.css';
import {OpportunityBacklog} from './opportunity-backlog';
import {KeywordIntelligence} from './keyword-intelligence';
import {ResearchPlanning} from './research-planning';
import {SeoAnalystPanel} from './seo-analyst-panel';
import type {SeoController} from './use-seo-analyst';
import {FocusPanel,WorkspaceTabs} from './workspace-ui';
import {workspaceLink} from '@/lib/marketing/workspace-navigation';
import ui from './workspace-ui.module.css';
import styles from './marketing.module.css';
const researchTabs=[['plans','Plan research'],['keywords','Collect keywords'],['analyst','SEO analysis'],['opportunities','Review opportunities']] as const;
export function DiscoverWorkspace({demo,days,section,seo,refresh}:{demo:boolean;days:7|28|90;section:string;seo:SeoController;refresh:()=>void}){
 const workflow=useResearchWorkflow(demo),[reviewed,setReviewed]=useState<Opportunity|null>(null);
 const params=useSearchParams(),opportunity=params.get('opportunity'),[research,setResearch]=useState(false),[step,setStep]=useState(1),[service,setService]=useState('Business-wide objective'),[goal,setGoal]=useState(''),[scope,setScope]=useState<{maximumRequests:number;maximumCostUsd:number;ready:boolean}|null>(null),[scopeError,setScopeError]=useState('');
 function start(){setStep(1);setResearch(true);setScopeError('');if(demo)return;void fetch('/api/admin/marketing/intelligence',{cache:'no-store'}).then(async r=>{const b=await r.json();if(!r.ok)throw Error('Keyword scope is unavailable.');setScope({maximumRequests:b.approval?.maximumRequests??0,maximumCostUsd:b.approval?.maximumCostUsd??0,ready:Boolean(b.connections?.some((c:{ready:boolean})=>c.ready))});}).catch(()=>setScopeError('Keyword availability could not be verified. No paid request can start from this wizard.'));}
 const activeSection=!params.get('section')&&params.get('view')==='discover'&&!opportunity?'plans':section;
 const latest=demo?undefined:workflow.data?.plans[0],selected=demo?undefined:workflow.selected;
 const progress=discoverState(selected,demo?null:workflow.data,workflow.researchIds,seo.data,reviewed?.id===opportunity?reviewed:null);
 function selectSection(value:string,id?:string){const next=new URLSearchParams(params);next.set('view','discover');next.set('section',value);if(id&&id!==workflow.planId){next.set('plan',id);next.delete('evidence');}window.history.pushState(null,'','?'+next.toString());}
 const updated=()=>{void workflow.refresh();};
 return <section data-discover-workspace className={flow.workspace}><div className={ui.actions}><button className={styles.primary} onClick={start} disabled={demo}>Start New Research</button><button className={styles.secondary} disabled={demo} onClick={updated}>Refresh research</button></div>
 {latest?<section className={flow.latest} aria-label="Latest research plan"><div><p className={styles.eyebrow}>LATEST RESEARCH PLAN</p><h2>{latest.plan.summary}</h2><div className={flow.facts}><span data-state={latest.decision==='approved'?'complete':'pending'}>{latest.decision==='pending'?'Pending review':latest.decision==='approved'?'Approved':latest.decision}</span><time dateTime={latest.createdAt}>{new Date(latest.createdAt).toLocaleString()}</time><span>{latest.plan.maximumRequests} proposed requests</span><span>${latest.plan.maximumCostUsd.toFixed(3)} estimated maximum</span></div>{selected&&selected.id!==latest.id&&<p className={styles.note}>A different plan is selected for this workflow.</p>}</div><button className={styles.primary} onClick={()=>selectSection('plans',latest.id)}>Review Plan</button></section>:<p role="status" className={styles.note}>{demo?'Live research is hidden in Demo Mode.':workflow.error||(!workflow.data?'Loading saved research…':'No saved plans yet. Start New Research to prepare one.')}</p>}
 {workflow.error&&latest&&<p role="alert" className={styles.error}>{workflow.error} Showing the last loaded research.</p>}
 <WorkspaceTabs value={activeSection} onChange={value=>{selectSection(value);updated();}} items={researchTabs} label="Discover research" statuses={progress.statuses}>
 {selected&&progress.next.section!=='plans'&&<div className={flow.next}><span>Next for the selected plan</span><button className={styles.secondary} onClick={()=>selectSection(progress.next.section)}>{progress.next.label}</button></div>}
 {!demo&&['keywords','analyst'].includes(activeSection)&&<ResearchSelection workflow={workflow}/>}
 {activeSection==='keywords'?<KeywordIntelligence demo={demo} days={days} workflow={workflow} connected/>:activeSection==='plans'?<ResearchPlanning demo={demo} days={days} opportunity={opportunity} refreshKey={workflow.data?.plans.map(p=>p.id+':'+p.decision).join('|')} selectedPlanId={workflow.planId} onSelectPlan={id=>selectSection('plans',id)} onChanged={updated}/>:activeSection==='analyst'?<SeoAnalystPanel controller={seo} days={days} demo={demo} opportunity={opportunity} workflow={workflow} connected/>:<OpportunityBacklog demo={demo} onWorkflowChange={()=>{refresh();updated();}} onSelected={setReviewed}/>}
 </WorkspaceTabs>
 <FocusPanel open={research} title={step===1?'Start new research':'Review research scope'} dirty={Boolean(goal.trim())} onClose={()=>{setResearch(false);setGoal('');}}><p className={ui.compact}>1. Plan research → 2. Review keyword data → 3. SEO analysis</p>{step===1?<div className={ui.filters}><label>Business service<select value={service} onChange={e=>setService(e.target.value)}>{['Business-wide objective','AI Solutions','Salesforce Modernization','Custom Business Applications'].map(s=><option key={s}>{s}</option>)}</select></label><label style={{flexBasis:'100%'}}>What would you like to investigate?<textarea aria-label="Research goal" rows={5} maxLength={1300} value={goal} onChange={e=>setGoal(e.target.value)}/></label><button className={styles.primary} disabled={goal.trim().length<10} onClick={()=>setStep(2)}>Review scope</button></div>:<><button className={styles.secondary} onClick={()=>setStep(1)}>Back to goal</button><p className={ui.notice}>{service} · {goal}</p><h3>Evidence sources</h3><p>Website · GA4 · Google Search Console · saved keyword evidence · previous research.</p><p>{days} complete days · existing evidence only.</p><p>Keyword collection: <strong>{scope?.ready?'Separate approval required':'Unavailable'}</strong></p>{scopeError&&<p role="status">{scopeError}</p>}<ResearchPlanning key={service+goal} onChanged={updated} creationMode onContinue={()=>{setResearch(false);setGoal('');}} initialObjective={service+': '+goal} demo={demo} days={days} opportunity={opportunity}/><details><summary>Saved research & next steps</summary><Link className={styles.textLink} href={workspaceLink('discover',opportunity,{section:'keywords',plan:params.get('plan')??'',evidence:params.get('evidence')??''})}>Review keyword evidence</Link><br/><Link className={styles.textLink} href={workspaceLink('discover',opportunity,{section:'analyst',plan:params.get('plan')??'',evidence:params.get('evidence')??''})}>Inspect SEO analysis</Link></details></>}</FocusPanel>
</section>;
}
