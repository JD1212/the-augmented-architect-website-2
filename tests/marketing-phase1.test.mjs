import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {loadScoutModule as load} from './helpers/scout-loader.mjs';
const {summarizeAgent,executionStatus}=load('src/lib/marketing/execution-status.ts');
test('agent summary uses matching registration only, real recent states, and an independent execution gate',()=>{
 const agent={id:'content-preview',version:'0.1.2',enabled:true},runs=[{agent_id:'content-preview',state:'completed',started_at:'2026-11-24T00:00:00Z'},{agent_id:'production-seo',state:'failed',started_at:'2026-11-23T00:00:00Z'}];
 const summary=summarizeAgent(agent,runs,false);assert.equal(summary.recentRuns,1);assert.equal(summary.latestState,'completed');assert.equal(summary.executionEnabled,false);assert.equal(summarizeAgent(undefined,runs,false).recentRuns,0);
 assert.equal(executionStatus('running','2026-11-24T00:00:00Z',Date.parse('2026-11-24T00:06:00Z')),'interrupted');assert.equal(executionStatus('running','2026-11-24T00:00:00Z',Date.parse('2026-11-24T00:01:00Z')),'running');
});
test('normal content editor has one website publisher and separate manual LinkedIn preparation without legacy exports',()=>{
 const ui=readFileSync('src/components/marketing/content-studio.tsx','utf8');assert.equal((ui.match(/<PublicationControls /g)||[]).length,1);assert(!ui.includes('Download approved release bundle'));assert(!ui.includes('Prepare website release'));assert(!ui.includes('legacy exports'));assert(ui.includes('Prepare LinkedIn post'));assert(ui.includes('Record LinkedIn publication'));
});
