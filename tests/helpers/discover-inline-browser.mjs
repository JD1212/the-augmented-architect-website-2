import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
export const novemberPlanId='db62cd2a-277f-45f5-a922-4bf661fe8089';
/** Reproduces the saved Nov 26 plan's date/count/quote, with synthetic scope and no provider/model call. */
export function inlinePlan(){return {id:novemberPlanId,createdAt:'2026-11-26T20:24:28.233Z',objective:'Fixture: qualified consulting opportunities',decision:'pending',plan:{summary:'Fixture: November 26 commercial research plan',targetCustomer:'Business decision makers',limitations:['Deterministic UI fixture, not new research.'],steps:[{mode:'ideas',service:'salesforce',seeds:['Salesforce modernization consulting'],evidenceIds:[],reason:'Discover related buyer searches',maximumCostUsd:.09,cachedResearchIds:[]},{mode:'historical',service:'custom-applications',seeds:['custom business applications'],evidenceIds:[],reason:'Review actual demand estimates',maximumCostUsd:.09,cachedResearchIds:[]},{mode:'competition',service:'salesforce',seeds:['Salesforce modernization consulting'],evidenceIds:[],reason:'Observe competing results',maximumCostUsd:.002,cachedResearchIds:[]}],maximumRequests:3,maximumCostUsd:.182,nextAction:'Review the plan, then separately authorize keyword collection.',rationale:'Fixture only',contentDecision:'investigate'}};}
export async function discoverInlineBrowser({send,ev,until,click,fill,check,origin,out,researchFixture}){
 for(const width of [1440,390]){
  researchFixture.plans=[inlinePlan()];researchFixture.enabled=false;
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<700});
  await send('Page.navigate',{url:origin+'/admin/marketing?view=discover'});
  await until("document.querySelector('#research-objective')?.getClientRects().length>0&&document.body.textContent.includes('Fixture: November 26 commercial research plan')");
  await ev("window.__inlineDocument='same-document'");
  check(await ev("!document.querySelector('dialog[open]')&&['Saved research plans','Saved provider evidence','Persistent research history'].every(t=>document.querySelector('[data-discover-workspace]').textContent.includes(t))&&![...document.querySelectorAll('button,a')].some(e=>['Start New Research','Explore Opportunities','Review scope'].includes(e.textContent))"),'Planning, saved plans, evidence and history are inline without wizard launchers '+width);
  check(await ev("[...document.querySelectorAll('[role=tablist][aria-label=\"Discover sections\"] button')].map(e=>e.textContent).join('|')==='Research|SEO analysis|Opportunities'&&document.querySelectorAll('[role=tablist][aria-label=\"Discover sections\"]').length===1"),'One simple navigation row, without stage-status controls '+width);
  // Opening a closed plan must select that plan without a second page/modal.
  await click('Research plan · 11/26/2026 · pending');
  await click('Research plan · 11/26/2026 · pending');
  await until(`location.search.includes('plan=${novemberPlanId}')&&document.querySelector('details[open] ol')?.children.length===3`);
  check(await ev("(()=>{const p=[...document.querySelectorAll('details[open]')].find(e=>e.textContent.includes('Fixture: November 26 commercial research plan'));return !!p&&p.querySelector('ol').children.length===3&&p.textContent.includes('$0.182')&&window.__inlineDocument==='same-document';})()"),'Opening November 26 plan shows all three requests and $0.182 without reload '+width);
  await click('Review decision');await fill('#plan-note-'+novemberPlanId,'Fixture review only; no spending authorized.');await click('Approve plan only');
  await until("document.body.textContent.includes('Owner decision: approved')&&document.querySelector('select[aria-label=\"Selected research plan\"]')?.selectedOptions[0]?.textContent.includes('approved')");
  assert.equal(researchFixture.reviews.at(-1).planId,novemberPlanId);
  assert.equal(researchFixture.reviews.at(-1).note,'Fixture review only; no spending authorized.');
  check(await ev("[...document.querySelectorAll('button')].some(b=>b.textContent==='Collect keywords for this plan')&&!document.querySelector('dialog[open]')"),'Mocked approval persists to saved-plan and shared collection state '+width);
  await click('Collect keywords for this plan');
  await until(`location.hash==='#keyword-collection'&&document.activeElement?.id==='keyword-collection'&&document.querySelector('select[aria-label="Selected research plan"]')?.value==='${novemberPlanId}'`);
  check(await ev("document.body.textContent.includes('Plan allowance: up to 3 provider requests / $0.182')&&[...document.querySelectorAll('button')].some(b=>b.textContent==='Authorize keyword allowance'&&b.disabled)&&![...document.querySelectorAll('input[type=checkbox]')].find(e=>e.parentElement.textContent.includes('quoted keyword allowance')).checked&&[...document.querySelectorAll('button')].some(b=>b.textContent==='Research keywords'&&b.disabled)"),'Exact plan reaches keyword collection; separate spending confirmation stays unchecked and collection disabled '+width);
  await click('Use plan step 2: historical');
  check(await ev("document.querySelector('#research-mode').value==='historical'&&document.querySelector('#research-seeds').value==='custom business applications'&&window.__inlineDocument==='same-document'"),'Selected plan step fills exact mode and seeds without a provider request '+width);
  await click('SEO analysis');await until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Run Analysis')");
  check(await ev(`location.search.includes('plan=${novemberPlanId}')&&!document.querySelector('dialog[open]')`),'SEO analysis retains the approved selected plan without execution '+width);
  await ev('history.back()');await until("document.querySelector('#research-objective')?.getClientRects().length>0");
  check(await ev("window.__inlineDocument==='same-document'&&document.body.textContent.includes('Persistent research history')&&document.documentElement.scrollWidth===innerWidth"),'Back navigation restores inline research and fits viewport '+width);
  // A newly prepared mocked plan must replace no records and appear immediately in the same list.
  researchFixture.plans=[];researchFixture.enabled=true;
  await send('Page.navigate',{url:origin+'/admin/marketing?view=discover'});
  await until("document.querySelector('#research-objective')?.getClientRects().length>0&&document.body.textContent.includes('Ready · explicit run required')");
  await fill('#research-objective','Fixture: investigate qualified custom software consulting inquiries.');
  await ev("[...document.querySelectorAll('label')].find(e=>e.textContent.includes('I authorize this bounded planning')).querySelector('input').click()");
  await click('Run research planning');await until("document.body.textContent.includes('Research plan saved')&&document.body.textContent.includes('Fixture: November 26 commercial research plan')");
  check(await ev(`document.querySelector('select[aria-label="Selected research plan"]')?.value==='${novemberPlanId}'&&!document.querySelector('dialog[open]')`),'Mocked new plan appears and is selected immediately, without reopening a saved-plan modal '+width);
  await ev("document.querySelector('#research-objective').scrollIntoView({block:'center'})");
  await writeFile(out+'/discover-inline-'+width+'.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }
 researchFixture.enabled=false;
 assert.equal(researchFixture.prepares,2);assert.equal(researchFixture.reviews.length,2);
 check(true,'Two mocked plan generations and decisions only; no real agent, spending authorization or paid collection');
}
