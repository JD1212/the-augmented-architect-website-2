import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
export async function discoverFlowBrowser({send,ev,until,click,press,fill,check,origin,out,researchFixture,sleep}){
 for(const width of [1440,390]){
  researchFixture.plans=[];researchFixture.enabled=false;
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<700});
  await send('Page.navigate',{url:origin+'/admin/marketing?view=discover'});
  await until("document.querySelector('[aria-label=\"Latest research plan\"]')?.textContent.includes('0.090')");
  check(await ev("document.querySelector('[role=tab][aria-selected=true]')?.getAttribute('aria-label')==='Plan research'&&!document.querySelector('dialog[open]')"),'Discover opens saved planning in place '+width);
  researchFixture.enabled=true;
  await click('Start New Research');await fill('textarea[aria-label="Research goal"]','Prepare a bounded fixture research plan for qualified consultation inquiries.');await click('Review scope');
  await until("document.querySelector('dialog[open]')?.textContent.includes('Ready · explicit run required')");
  await ev("(()=>{const e=[...document.querySelectorAll('dialog[open] label')].find(e=>e.textContent.includes('I authorize this bounded planning'));e.querySelector('input').click();})()");
  await click('Run research planning');await until("document.querySelector('dialog[open]')?.textContent.includes('Research plan saved')");
  check(await ev("document.querySelector('[aria-label=\"Latest research plan\"]')?.textContent.includes('0.182')"),'Mocked preparation refreshes the separate latest-plan card '+width);
  const close=press('dialog[open] header button');let accepted=false;for(let i=0;i<60;i++){await sleep(50);try{await send('Page.handleJavaScriptDialog',{accept:true});accepted=true;break;}catch{}}assert(accepted);await close;
  await until("!document.querySelector('dialog[open]')");await click('Review Plan');
  await until("location.search.includes('plan=88888888-8888-4888-a888-888888888888')&&document.querySelector('[role=tabpanel]')?.textContent.includes('Fixture: November 26 pending research plan')");
  check(await ev("document.querySelector('[aria-label=\"Latest research plan\"]').textContent.includes('Pending review')&&document.querySelector('[aria-label=\"Latest research plan\"]').textContent.includes('3 proposed requests')&&document.querySelector('[role=tabpanel]').textContent.includes('Review decision')&&!document.querySelector('dialog[open]')"),'November 26 plan reopens from saved list with pending status and existing review action '+width);
  await click('Collect keywords');await until("!!document.querySelector('[aria-label=\"Keyword collection\"]')");
  check(await ev("document.querySelector('[aria-label=\"Keyword collection\"]').textContent.includes('Choose and approve a research plan first')&&[...document.querySelectorAll('button')].some(b=>b.textContent==='Research keywords'&&b.disabled)&&!document.querySelector('dialog[open]')"),'Pending plan blocks paid collection without an added approval stage '+width);
  await click('SEO analysis');await until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Run Analysis')");
  check(await ev("[...document.querySelectorAll('button')].some(b=>b.textContent==='Run Analysis'&&b.disabled)"),'Pending plan keeps existing analysis guard intact '+width);
  await click('Plan research');await until("document.querySelector('[role=tabpanel]')?.textContent.includes('Fixture: November 26 pending research plan')");
  check(await ev("document.documentElement.scrollWidth===innerWidth&&document.querySelectorAll('[role=tablist][aria-label=\"Discover research\"]').length===1"),'One connected navigation fits viewport '+width);
  await writeFile(out+'/discover-flow-'+width+'.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }
 researchFixture.enabled=false;
 check(researchFixture.prepares===2,'Only two in-memory planning fixtures were prepared; no real agent/provider calls');
}
