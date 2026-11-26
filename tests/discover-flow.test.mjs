import test from 'node:test';
import assert from 'node:assert/strict';
import {loadScoutModule as load} from './helpers/scout-loader.mjs';
const {discoverState}=load('src/components/marketing/discover-state.ts');
const step={mode:'historical',service:'custom-applications',seeds:['custom application'],cachedResearchIds:[]},plan={id:'plan-1',decision:'pending',plan:{steps:[step]}},evidence={id:'evidence-1',planId:plan.id,mode:'historical',terms:['custom application'],eligible:true};
test('pending and deferred plans require review; provider gates remain explicit',()=>{
 for(const decision of ['pending','deferred','rejected']){const r=discoverState({...plan,decision},{evidence:[],providers:[],authorizations:[]},[],null);assert.equal(r.next.section,'plans');assert.equal(r.statuses.plans.state,'pending');assert.equal(r.statuses.keywords.state,'blocked');assert.equal(r.statuses.analyst.state,'blocked');}
 const p={...plan,decision:'approved'},r=discoverState(p,{evidence:[],providers:[{ready:false}],authorizations:[]},[],null);assert.equal(r.statuses.keywords.label,'Collection disabled');assert.equal(r.next.section,'keywords');
});
test('collection completion uses matching, eligible observations rather than clicks or unrelated evidence',()=>{
 const p={...plan,decision:'approved'};
 for(const e of [{...evidence,planId:'another-plan'},{...evidence,eligible:false},{...evidence,mode:'competition'},{...evidence,terms:['another term']}])assert.notEqual(discoverState(p,{evidence:[e],providers:[],authorizations:[]},[],null).statuses.keywords.state,'complete');
 assert.equal(discoverState(p,{evidence:[evidence],providers:[],authorizations:[]},[evidence.id],null).statuses.keywords.state,'complete');
 assert.equal(discoverState({...p,plan:{steps:[]}},{evidence:[]},[],null).statuses.keywords.label,'Not required by plan');
});
test('analysis completion requires the exact plan and selected evidence binding',()=>{
 const p={...plan,decision:'approved'},data={evidence:[evidence]},seo={analysis:{opportunities:[]},evidenceUsage:{researchWorkflow:{planId:p.id,researchIds:[evidence.id]}}};
 assert.equal(discoverState(p,data,[evidence.id],seo).statuses.analyst.state,'complete');
 assert.notEqual(discoverState(p,data,[],seo).statuses.analyst.state,'complete');
 assert.notEqual(discoverState({...p,id:'different'},data,[evidence.id],seo).statuses.analyst.state,'complete');
 assert.equal(discoverState(p,data,['stale'],null).statuses.analyst.state,'blocked');
});
test('owner review completion requires the current approved finding bound to the plan',()=>{
 const p={...plan,decision:'approved'},data={evidence:[evidence]},seo={analysis:{},evidenceUsage:{researchWorkflow:{planId:p.id,researchIds:[evidence.id]}}},o={status:'approved_for_drafting',findingId:'finding',observations:[{id:'finding',researchWorkflow:{planId:p.id}}],reviews:[{action:'approve',findingId:'finding'}]};
 assert.equal(discoverState(p,data,[evidence.id],seo,o).statuses.opportunities.state,'complete');
 assert.notEqual(discoverState(p,data,[evidence.id],seo,{...o,reviews:[{action:'approve',findingId:'older'}]}).statuses.opportunities.state,'complete');
 assert.notEqual(discoverState(p,data,[evidence.id],seo,{...o,observations:[]}).statuses.opportunities.state,'complete');
});

test('collected evidence is explicitly selected before the guided next analysis action',()=>{const p={...plan,decision:'approved'},data={evidence:[evidence]};assert.equal(discoverState(p,data,[],null).next.label,'Select keyword evidence');assert.equal(discoverState(p,data,[evidence.id],null).next.section,'analyst');});
