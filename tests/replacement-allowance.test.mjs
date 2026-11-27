// Deterministic only: no browser session, real database, provider, or spending writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import * as seo from '@augmented-architect/seo-analyst';
import * as content from '@augmented-architect/content-strategist';
import {loadScoutModule as load} from './helpers/scout-loader.mjs';
import {memoryDatabase} from './helpers/marketing-memory.mjs';

const require=createRequire(import.meta.url);
const source=readFileSync('src/components/marketing/replacement-allowance.tsx','utf8');
function component(react=require('react'),fetcher=()=>{throw Error('Unexpected network');}) {
 const compiled={exports:{}};
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports','fetch',code)(id=>id==='react'?react:id.endsWith('.css')?{}:require(id),compiled,compiled.exports,fetcher);
 return compiled.exports.ReplacementAllowance;
}
const planId='d2e81d2a-89f0-430c-a9d3-c925aee8c11a';
const props={planId,maximumRequests:3,maximumCostUsd:.182,disabled:false,onAuthorized:async()=>{}};
// Exercise real component handlers with an in-memory hook state; not a browser test.
function harness(fetcher,extra={}) {
 const slots=[];let cursor=0;
 const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=value;}];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];}};
 const Component=component(react,fetcher);
 function render(){cursor=0;return Component({...props,...extra});}
 function find(type){let found;function visit(node){if(!node||typeof node!=='object')return;if(node.type===type)found=node;for(const child of [node.props?.children].flat(Infinity))visit(child);}visit(render());return found;}
 return {render,find,confirm(){find('input').props.onChange({target:{checked:true}});},click(){find('button').props.onClick();}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('replacement quote is visible and explicit confirmation is required; no request on render or unchecked click',async()=>{
 const html=renderToStaticMarkup(createElement(component(),props));
 assert.match(html,/3 requests \/ \$0\.182/);assert.match(html,/Authorize replacement allowance/);assert.match(html,/disabled=""/);assert.match(html,/reservation remain unchanged/);
 let calls=0;const h=harness(async()=>{calls++;return {ok:true};});h.render();h.click();await tick();assert.equal(calls,0);assert.equal(h.find('button').props.disabled,true);
});
test('one explicit confirmation posts only the existing owner API; double clicks cannot duplicate authorization or run research',async()=>{
 const requests=[];let release,refreshes=0;
 const h=harness(async(url,options)=>{requests.push({url,...options});await new Promise(resolve=>{release=resolve;});return {ok:true};},{onAuthorized:async()=>{refreshes++;}});
 h.confirm();assert.equal(h.find('button').props.disabled,false);h.click();h.click();assert.equal(requests.length,1);assert.equal(h.find('button').props.disabled,true);
 const sent=requests[0],body=JSON.parse(sent.body);assert.equal(sent.url,'/api/admin/marketing/research-plans');assert.equal(sent.method,'POST');assert.equal(sent.credentials,'same-origin');assert.deepEqual({...body,requestId:'redacted'},{operation:'authorizeResearch',planId,requestId:'redacted',maximumRequests:3,maximumCostUsd:.182,spendingConfirmed:true});assert.match(body.requestId,/^[0-9a-f-]{36}$/);
 release();await tick();assert.equal(refreshes,1);h.confirm();h.click();await tick();assert.equal(requests.length,1);assert.equal(h.find('button').props.disabled,true);
});
test('transport and API failures never retry automatically; an explicit retry retains the idempotency ID',async()=>{
 for(const failure of ['transport',401,403,409,500]){
  const ids=[];const h=harness(async(_url,options)=>{ids.push(JSON.parse(options.body).requestId);if(failure==='transport')throw Error('sensitive upstream detail');return {ok:false,status:failure};});
  h.confirm();h.click();await tick();assert.equal(ids.length,1);assert.match(JSON.stringify(h.render()),/Replacement allowance was not confirmed/);assert.doesNotMatch(JSON.stringify(h.render()),/sensitive upstream detail/);
  h.click();await tick();assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);
 }
});
test('disabled or invalid quotes cannot submit; fresh plan/allowance mounts require fresh confirmation',async()=>{
 let calls=0;
 for(const extra of [{disabled:true},{maximumRequests:0},{maximumRequests:11},{maximumCostUsd:NaN},{maximumCostUsd:1.01}]){const h=harness(async()=>{calls++;return {ok:true};},extra);h.confirm();h.click();await tick();assert.equal(h.find('button').props.disabled,true);}
 assert.equal(calls,0);const fresh=harness(async()=>({ok:true}));assert.equal(fresh.find('input').props.checked,false);
 const parent=readFileSync('src/components/marketing/keyword-intelligence.tsx','utf8');assert.match(parent,/workflow\.authorization\.blocked&&<ReplacementAllowance key=\{workflow\.planId\+':\'\+workflow\.authorization\.id\}/);
});

const config=load('src/lib/marketing/config.ts'),tenant=config.marketingTenant,owner='a2eba199-7949-49c9-828e-9d755e2e345b';
const base={'@augmented-architect/seo-analyst':seo,'@augmented-architect/content-strategist':content,'../config':config,'./config':config,'@/lib/marketing/config':config};
const planning=load('src/lib/marketing/intelligence/planning.ts',base),binding=load('src/lib/marketing/intelligence/workflow-binding.ts',base);
test('existing authenticated API appends an environment-bound replacement; original failed request and $0.09 reservation are immutable',async()=>{
 const oldId='11111111-1111-4111-a111-111111111111',requestId='22222222-2222-4222-a222-222222222222',failedId='4a60fd3a-ca40-4b37-acd4-30d2ee4d2111';
 const db=memoryDatabase({marketing_artifacts:[
  {id:planId,tenant_id:tenant,kind:'measurement',payload:{domain:'seo-research-planning',workflow:'seo-research-plan/v1',plan:{maximumRequests:3,maximumCostUsd:.182,steps:[]}}},
  {id:owner,tenant_id:tenant,parent_id:planId,kind:'approval',actor_id:owner,payload:{domain:'seo-research-planning',workflow:'seo-research-plan-review/v1',decision:'approved'}},
  {id:oldId,tenant_id:tenant,parent_id:planId,kind:'approval',actor_id:owner,payload:{domain:'seo-research-planning',workflow:'research-spend-approval/v1',maximumRequests:3,maximumCostUsd:.182}},
  {id:failedId,tenant_id:tenant,kind:'measurement',payload:{domain:'opportunity-intelligence',workflow:'intelligence-request/v1',query:{authorizationId:oldId},reservedMaximumUsd:.09}},
  {id:'failure',tenant_id:tenant,parent_id:failedId,kind:'measurement',payload:{domain:'opportunity-intelligence',workflow:'intelligence-failure/v1',diagnostic:{httpStatus:401,providerCode:40100,category:'authentication'},reportedCostUsd:0}},
 ]});
 const original=structuredClone(db.rows.marketing_artifacts);
 const api=load('src/app/api/admin/marketing/research-plans/route.ts',{...base,'@/lib/marketing/auth':{ownerAuth:async()=>({}),requireOwner:async()=>({tenantId:tenant,user:{id:owner},db})},'@/lib/marketing/seo/config':{seoDatabase:()=>db},'@/lib/marketing/intelligence/planning':planning});
 const body={operation:'authorizeResearch',planId,requestId,maximumRequests:3,maximumCostUsd:.182,spendingConfirmed:true};
 const post=patch=>api.POST(new Request('https://example.com/api/admin/marketing/research-plans',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:JSON.stringify({...body,...patch})}));
 assert.equal((await post({spendingConfirmed:false})).status,400);assert.equal((await post({maximumCostUsd:.183})).status,400);
 const response=await post({});assert.equal(response.status,200);const result=await response.json();assert.equal((await post({})).status,200);assert.equal(db.rows.marketing_artifacts.length,original.length+1);assert.deepEqual(db.rows.marketing_artifacts.slice(0,original.length),original);
 const replacement=db.rows.marketing_artifacts.find(r=>r.id===result.id);assert.equal(replacement.payload.environment,'development');assert.equal(replacement.payload.publishingAuthorized,false);assert.deepEqual(binding.allowanceStatus(db.rows.marketing_artifacts,replacement),{remainingRequests:3,reservedCostUsd:0,blocked:false});assert.deepEqual(binding.allowanceStatus(db.rows.marketing_artifacts,original[2]),{remainingRequests:2,reservedCostUsd:.09,blocked:true});assert.equal(db.rows.marketing_executions.length,0);
 await assert.rejects(planning.authorizeResearchPlan(db,'other-tenant',owner,{planId,requestId,maximumRequests:3,maximumCostUsd:.182}));
});
