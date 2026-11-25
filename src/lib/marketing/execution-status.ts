/** Read-only status projection. A stale running row is not presented as an active execution. */
export function executionStatus(state:string,startedAt:string|null,now=Date.now()){
 return state==='running'&&startedAt&&now-Date.parse(startedAt)>300000?'interrupted':state;
}
export function summarizeAgent(agent:{id:string;enabled:boolean;version:string}|undefined,runs:{agent_id:string;state:string;started_at:string|null}[],executionEnabled:boolean){
 const recent=agent?runs.filter(r=>r.agent_id===agent.id):[];
 return {registered:Boolean(agent),enabled:Boolean(agent?.enabled),version:agent?.version??null,executionEnabled,recentRuns:recent.length,latestState:recent[0]?executionStatus(recent[0].state,recent[0].started_at):null};
}
