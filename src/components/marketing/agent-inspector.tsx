'use client';
import {useState,useEffect} from 'react';
import Link from 'next/link';
import type {MarketingAgent} from '@/content/marketing-workspace';
import type {WorkspaceActivity} from '@/lib/marketing/types';
import type {SeoController} from './use-seo-analyst';
import {WorkspaceTabs} from './workspace-ui';
import {SeoAnalystPanel} from './seo-analyst-panel';
import type {contentState} from '@/lib/marketing/content/service';
import {AgentDetail} from './agent-team';
import {workspaceLink} from '@/lib/marketing/workspace-navigation';
import styles from './marketing.module.css';
export function AgentInspector({agent,seo,activity,demo,days,opportunity}:{agent:MarketingAgent;seo:SeoController;activity:WorkspaceActivity|null;demo:boolean;days:7|28|90;opportunity:string|null}){
 const [tab,setTab]=useState('overview'),summary=activity?.agentSummaries?.[agent.id];
 return <WorkspaceTabs label="Agent inspection" value={tab} onChange={setTab} items={[["overview","Overview"],["actions","Actions"],["details","Details"]]}>{tab==='overview'?<section><h3>{agent.name}</h3><p>{agent.description}</p><p>Status: <strong>{agent.id==='performance-analyst'?'Planned':demo?'Live status hidden':agent.id==='seo-analyst'?seo.data?.agent?.enabled?'Manual execution available':'Not configured or disabled':summary?.executionEnabled?'Manual · authorization required':'Drafting execution disabled'}</strong></p><p>Recent runs: {demo?'Hidden':agent.id==='seo-analyst'?seo.data?.runs.length??'Unavailable':summary?.recentRuns??'Unavailable'}{summary?.latestState?' · latest '+summary.latestState:''}</p><h4>What it uses</h4><p>{agent.context}</p><h4>What it produces</h4><p>{agent.output}</p><button className={styles.secondary} onClick={()=>setTab('actions')}>View available actions</button><p>No agent runs or changes are started by opening this panel.</p></section>:agent.id==='performance-analyst'?<AgentDetail agent={agent} activity={activity} opportunity={opportunity}/>:agent.id==='seo-analyst'?<SeoAnalystPanel controller={seo} days={days} demo={demo} opportunity={opportunity} detailsOnly={tab==='details'}/>:tab==='details'&&opportunity?<ContentAgentHistory opportunity={opportunity} demo={demo}/>:<section><p>Content Strategist prepares website and LinkedIn drafts from approved research. Review its assignment and any required one-run authorization in Create before execution.</p><Link className={styles.secondary} href={workspaceLink('create',opportunity)}>Open Create</Link></section>}</WorkspaceTabs>;
}

function ContentAgentHistory({opportunity,demo}:{opportunity:string;demo:boolean}){
 const [data,setData]=useState<Awaited<ReturnType<typeof contentState>>|null>(null),[error,setError]=useState('');
 useEffect(()=>{if(demo)return;const abort=new AbortController();void fetch('/api/admin/marketing/content?opportunityId='+opportunity,{cache:'no-store',signal:abort.signal}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error||'Drafting history unavailable.');if(!abort.signal.aborted)setData(body);}).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Drafting history unavailable.');});return()=>abort.abort();},[opportunity,demo]);
 if(demo)return <p>Private execution history is hidden in Demo Mode.</p>;
 if(error)return <p role="alert">{error}</p>;
 if(!data)return <p role="status">Loading drafting history…</p>;
 return <section><h3>Inputs & outputs</h3><p>{data.opportunity.title}</p><p>{data.grounding.sources.length} supporting sources · {data.revisions.length} immutable revisions</p><h3>Recent executions</h3>{!data.runs.length?<p>No recorded drafting attempts for this article.</p>:data.runs.map(run=><details key={String(run.id)}><summary>{String(run.state)} · {new Date(String(run.created_at)).toLocaleString()}</summary><pre>{JSON.stringify({usage:run.usage,diagnostics:run.diagnostics},null,2)}</pre></details>)}</section>;
}
