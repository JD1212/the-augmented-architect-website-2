import test from 'node:test';
import assert from 'node:assert/strict';
import {loadScoutModule} from './helpers/scout-loader.mjs';
const cache=new Map();
const {customApplications:copy}=loadScoutModule('src/content/custom-applications.ts',{},cache);
const {scoutKnowledge,scoutInstructions}=loadScoutModule('src/lib/scout/knowledge.ts',{},cache);
test('starting offer leads with the application foundation, supported management and one included assistant',()=>{
 assert.equal(copy.hero.title,'Your website is just the beginning.');assert.equal(copy.hero.price,'Implementation starting at $10,000');assert.equal(copy.package.capabilities.length,3);
 assert.deepEqual(copy.package.features.map(feature=>feature.title),['AI Agent + Dashboard','Modern Website + Database','Employee Portal','Customer Portal','Integration Drivers','SEO + Analytics']);
 assert.equal(new Set(copy.package.features.map(feature=>feature.id)).size,6);
 assert(copy.package.features.every(feature=>!feature.href),'No placeholder detail links');
 assert.match(copy.hero.clarification,/up to four/);
});
test('four-connection allowance includes the calendar and unverified monitoring is not sold as complete',()=>{
 assert.match(copy.package.note,/up to four agreed, supported integrations in total/);assert.match(copy.package.note,/scheduling\/calendar connection counts toward/);
 assert.match(copy.future.boundaries,/not verified launch features/);assert.match(copy.package.capabilities[0][1],/not a completed launch capability/);
 assert.match(copy.package.note,/one agreed AI-agent use case/);assert.match(copy.package.note,/custom portal workflows/);assert.match(copy.package.note,/ongoing SEO services, hosting/);
 assert(!JSON.stringify(copy).includes('separate from the one included external business-system integration'));
});
test('Scout uses the existing registry and the revised sales/scheduling role without overpromising',()=>{
 assert.equal(scoutKnowledge.applications.package,copy.package);assert.equal(scoutKnowledge.applications.assistant,copy.assistant);assert.equal(scoutKnowledge.applications.faqs,copy.faq);
 assert.match(scoutInstructions,/UP TO FOUR agreed supported integrations TOTAL/);assert.match(scoutInstructions,/ONE customer-facing AI sales\/website assistant/);assert.match(scoutInstructions,/website guide, product expert, sales assistant, and scheduling assistant/);
 assert.match(scoutInstructions,/immediately begin the existing scheduling workflow/);assert.match(scoutInstructions,/do not repeat an invitation after a decline/);assert.match(scoutInstructions,/discovery interviews/);
});
