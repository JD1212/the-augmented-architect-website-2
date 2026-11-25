import * as phase3Content from '@augmented-architect/content-strategist';
// In-memory database only: no real registrations, models, providers or credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as pkg from '@augmented-architect/seo-analyst';
import {loadScoutModule as load} from './helpers/scout-loader.mjs';
import {memoryDatabase} from './helpers/marketing-memory.mjs';
const config=load('src/lib/marketing/config.ts'),tenant=config.marketingTenant,actor='a2eba199-7949-49c9-828e-9d755e2e345b';
const packageOverride={'@augmented-architect/content-strategist':phase3Content,'@augmented-architect/seo-analyst':pkg};
const {seoRegistrationIdentity}=load('src/lib/marketing/seo/config.ts',packageOverride);
const productionIdentity=seoRegistrationIdentity({VERCEL_ENV:'production'}),previewIdentity=seoRegistrationIdentity({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/seo-analyst-v1'});
const policy={minimumIntervalMs:600000,maximumDailyRuns:6,leaseMs:300000};
function moduleFor(identity,version){return load('src/lib/marketing/seo/store.ts',{...packageOverride,'./config':{seoRegistration:{name:identity.name,version,instructions_version:'fixture',enabled:true},seoRegistrationScope:identity,seoPolicy:policy}});}
const productionRow={id:'11111111-1111-4111-a111-111111111111',tenant_id:tenant,name:'SEO Analyst',version:'0.2.0',instructions_version:'seo-research-continuity-v1',enabled:true,config:{recentStarts:[],readOnly:true},created_at:'2026-11-18T00:00:00Z'};

test('registration identity is server environment/branch scoped and keeps the legacy Production name',()=>{
 assert.equal(productionIdentity.name,'SEO Analyst');assert.equal(productionIdentity.environment,'production');
 assert.notEqual(previewIdentity.name,productionIdentity.name);assert.equal(previewIdentity.environment,'preview');
 assert.deepEqual(previewIdentity,seoRegistrationIdentity({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/seo-analyst-v1',VERCEL_GIT_COMMIT_SHA:'different-redeploy'}));
 assert.notEqual(previewIdentity.name,seoRegistrationIdentity({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'another-branch'}).name);
 assert.notEqual(productionIdentity.name,seoRegistrationIdentity({}).name);
 for(const env of [{VERCEL_ENV:'preview'},{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:' '},{VERCEL_ENV:'unexpected'}])assert.throws(()=>seoRegistrationIdentity(env));
});
test('Preview v0.4.0 can register, claim, complete and release without mutating Production v0.2.0',async()=>{
 const db=memoryDatabase({marketing_agents:[productionRow]}),before=JSON.stringify(db.rows.marketing_agents[0]);
 const preview=moduleFor(previewIdentity,'0.4.0').createSeoStore(db,tenant),production=moduleFor(productionIdentity,'0.2.0').createSeoStore(db,tenant);
 assert.equal(await preview.findAgent(),null); // Never fall back to Production.
 const registered=await preview.register();assert.notEqual(registered.id,productionRow.id);assert.equal(registered.name,previewIdentity.name);assert.equal(registered.version,'0.4.0');assert.deepEqual(registered.config.registrationScope,previewIdentity);
 const id='22222222-2222-4222-a222-222222222222',assignment={mode:'research_plan',objective:'Find qualified consultation opportunities.'};
 await preview.claim(id,actor,28,assignment);await preview.progress(id,'model',[]);await preview.completePlan(id,[],assignment);await preview.release(registered.id,id);
 assert.equal(db.rows.marketing_executions[0].agent_id,registered.id);assert.equal(db.rows.marketing_executions[0].diagnostics.packageVersion,'0.4.0');
 assert.equal(JSON.stringify(db.rows.marketing_agents[0]),before);
 // Exercise the unchanged version guard with the legacy Production package version.
 assert.equal((await production.register()).version,'0.2.0');assert.equal(JSON.stringify(db.rows.marketing_agents[0]),before);
 const prodRun='33333333-3333-4333-a333-333333333333';await production.claim(prodRun,actor,28);assert.equal(db.rows.marketing_executions[1].agent_id,productionRow.id);assert.equal(db.rows.marketing_executions[1].diagnostics.packageVersion,'0.2.0');await production.release(productionRow.id,prodRun);
});
test('environment ownership isolates leases, disable flags and rate limits while same-branch concurrency/idempotency remains bounded',async()=>{
 const busyProduction={...productionRow,enabled:false,config:{recentStarts:[new Date().toISOString()],lease:{id:actor,expiresAt:new Date(Date.now()+60000).toISOString()}}};
 const db=memoryDatabase({marketing_agents:[busyProduction]}),before=JSON.stringify(db.rows.marketing_agents[0]),storeModule=moduleFor(previewIdentity,'0.4.0'),first=storeModule.createSeoStore(db,tenant),second=storeModule.createSeoStore(db,tenant);
 const ids=['22222222-2222-4222-a222-222222222222','33333333-3333-4333-a333-333333333333'];
 const results=await Promise.allSettled([first.claim(ids[0],actor,28),second.claim(ids[1],actor,28)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(db.rows.marketing_executions.length,1);
 const actual=db.rows.marketing_executions[0],agent=await first.findAgent();assert.equal((await first.claim(actual.id,actor,28)).reused,true);await first.release(agent.id,actual.id);
 await assert.rejects(first.claim('44444444-4444-4444-a444-444444444444',actor,28),e=>e.status===429);
 assert.equal(JSON.stringify(db.rows.marketing_agents[0]),before);
 const daily={recentStarts:Array(6).fill(new Date(Date.now()-3600000).toISOString())};assert.throws(()=>storeModule.leaseDecision(daily,actor),e=>e.status===429);
});
test('tenant scope, scoped upgrades and newer-version guard remain enforced',async()=>{
 const storeModule=moduleFor(previewIdentity,'0.4.0');assert.throws(()=>storeModule.createSeoStore(memoryDatabase(),'another-tenant'),e=>e.status===403);
 const row={...productionRow,id:actor,name:previewIdentity.name,version:'0.3.0',config:{recentStarts:[]}};
 const db=memoryDatabase({marketing_agents:[productionRow,row]}),before=JSON.stringify(db.rows.marketing_agents[0]),preview=storeModule.createSeoStore(db,tenant);
 assert.equal((await preview.register()).version,'0.4.0');assert.equal(JSON.stringify(db.rows.marketing_agents[0]),before);
 const oldPreview=moduleFor(previewIdentity,'0.3.0').createSeoStore(db,tenant);await assert.rejects(oldPreview.register(),e=>e.status===409);
 assert.equal((await moduleFor(productionIdentity,'0.2.0').createSeoStore(db,tenant).register()).version,'0.2.0');
});
test('Preview status/history reads stay scoped and cannot replace Production analysis history',async()=>{
 const db=memoryDatabase({marketing_agents:[productionRow],marketing_executions:[{id:actor,tenant_id:tenant,agent_id:productionRow.id,state:'completed',created_at:'2026-11-18T00:00:00Z',diagnostics:{stage:'completed'},usage:{}}],marketing_artifacts:[{id:'bundle',tenant_id:tenant,execution_id:actor,kind:'measurement',payload:{analysis:{summary:'Existing Production findings.',limitations:[],opportunities:[]},documents:[]}}]});
 const prod=moduleFor(productionIdentity,'0.2.0'),preview=moduleFor(previewIdentity,'0.4.0');assert.equal((await prod.readSeoPanel(db,tenant)).analysis.summary,'Existing Production findings.');
 const empty=await preview.readSeoPanel(db,tenant);assert.equal(empty.agent,null);assert.deepEqual(empty.runs,[]);
 await preview.createSeoStore(db,tenant).register();assert.deepEqual((await preview.readSeoPanel(db,tenant)).runs,[]);assert.equal((await prod.readSeoPanel(db,tenant)).analysis.summary,'Existing Production findings.');
});
test('candidate package and legacy Production coexist; status reads are rollback-safe and newer registrations reject old execution',async()=>{
 const db=memoryDatabase({marketing_agents:[productionRow]}),before=JSON.stringify(db.rows.marketing_agents[0]);
 const preview=moduleFor(previewIdentity,pkg.packageVersion);
 await preview.createSeoStore(db,tenant).register();assert.equal(JSON.stringify(db.rows.marketing_agents[0]),before);
 const production=moduleFor(productionIdentity,pkg.packageVersion);await production.readSeoPanel(db,tenant);assert.equal(JSON.stringify(db.rows.marketing_agents[0]),before);
 // First explicit execution registration is an upgrade boundary, never a deployment side effect.
 await production.createSeoStore(db,tenant).register();assert.equal(db.rows.marketing_agents[0].version,pkg.packageVersion);
 await assert.rejects(moduleFor(productionIdentity,'0.3.0').createSeoStore(db,tenant).register(),e=>e.status===409);
 assert.equal(db.rows.marketing_agents[0].config.readOnly,true);
});
