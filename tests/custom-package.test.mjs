import test from 'node:test';
import assert from 'node:assert/strict';
import {loadScoutModule} from './helpers/scout-loader.mjs';
const cache=new Map();
const {customApplications:copy}=loadScoutModule('src/content/custom-applications.ts',{},cache);
const {scoutKnowledge,scoutInstructions}=loadScoutModule('src/lib/scout/knowledge.ts',{},cache);
test('approved starting package includes all nine launch capabilities and keeps the price',()=>{
 assert.equal(copy.hero.price,'Implementation starting at $10,000');
 assert.equal(copy.package.capabilities.length,9);
 const titles=copy.package.capabilities.map(([title])=>title);
 for(const expected of ['Modern business website','Defined secure customer portal','Private team/admin workspace','Structured data, identity & permissions','One customer-facing AI assistant','Real conversational appointment scheduling','One business integration & workflow','Architecture for further automation','Deployment, documentation & handoff'])assert(titles.includes(expected));
 assert(copy.hero.foundation.some(s=>s.includes('AI assistant & appointment scheduling')));
});
test('calendar scheduling and external integration are distinct; advanced capabilities remain bounded',()=>{
 assert.match(copy.package.note,/calendar connection, separate from the one included external business-system integration/);
 assert.match(copy.package.note,/Provider support, API permissions/);
 assert.match(copy.future.boundaries,/working assistant is included at launch/);
 for(const text of ['Additional agents','advanced multi-agent systems','complex workflows','further integrations'])assert(copy.future.boundaries.includes(text));
 assert.match(copy.assistant.boundaries,/hosting and provider\/service usage are not included/);
 assert(!JSON.stringify(copy).includes('not that custom agents or distributed workflows are included at launch'));
});
test('Scout uses the existing approved content registry, including the assistant section and precise scope rules',()=>{
 assert.equal(scoutKnowledge.applications.package,copy.package);
 assert.equal(scoutKnowledge.applications.assistant,copy.assistant);
 assert.equal(scoutKnowledge.applications.faqs,copy.faq);
 assert.match(scoutInstructions,/INCLUDES one customer-facing AI assistant/);
 assert.match(scoutInstructions,/real conversational appointment scheduling/);
 assert.match(scoutInstructions,/in addition to one agreed supported external business-system integration/);
 assert(!scoutInstructions.includes('Distinguish its AI-ready foundation from separately scoped custom AI-agent development'));
});
