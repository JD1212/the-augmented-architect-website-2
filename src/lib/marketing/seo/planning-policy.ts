import 'server-only';
import {MarketingError} from '../config';

export function planningExecutionEnabled(env:NodeJS.ProcessEnv=process.env){
 return env.SEO_RESEARCH_PLANNING_ENABLED==='true';
}
export function requirePlanningExecution(){
 if(!planningExecutionEnabled())throw new MarketingError(503,'New research planning is disabled for this environment. Saved plans and evidence remain available.');
}
