import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScoutModule } from './helpers/scout-loader.mjs';
import { schedulingFixture } from './helpers/scheduling-fixture.mjs';

// Opt in locally: SCOUT_INTRO_LIVE=1 node --env-file=.env.local --test tests/scout-intro.test.mjs
// Uses the configured model and real SDK/skill; all scheduling/storage/email services
// are fixtures. No website session, database row, invitation, or appointment is created.
test('suggested business introduction is conversational; requested package facts remain complete', {
  skip: process.env.SCOUT_INTRO_LIVE !== '1', timeout: 240000,
}, async t => {
  const f = schedulingFixture(), calls = [];
  const service = new Proxy(f.service, { get(target, key) {
    const value = Reflect.get(target, key);
    if (typeof value !== 'function') return value;
    return (...args) => { if (key !== 'ui') calls.push(key); return value.apply(target, args); };
  } });
  const { createScoutModel } = loadScoutModule('src/lib/scout/agent.ts', {
    '@/lib/booking/scheduling-server': { schedulingEnabled: () => true, schedulingService: () => service },
  });
  const { assistantContent } = loadScoutModule('src/content/assistant.ts');
  const question = assistantContent.starters[0].message;
  assert.equal(question, 'What can you build for my business?');
  const model = createScoutModel();
  await model.verify();
  const ask = messages => model.reply(messages, AbortSignal.timeout(45000), () => {}, {
    ownerHash: 'synthetic-intro-review', visitorTimezone: 'America/Los_Angeles',
  });
  let introduction;
  // Multiple fresh runs exercise natural variation, not a canned UI response.
  for (let i = 0; i < 3; i++) {
    const reply = await ask([{ id: 'intro', role: 'user', content: question }]);
    const text = reply.text.trim(); introduction ??= text;
    t.diagnostic(`Introduction ${i + 1}: ${text}`);
    assert(text.split(/\s+/).length <= 95, 'Brief introductory response');
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
    assert(sentences.length >= 2 && sentences.length <= 4, 'Two to four short sentences');
    for (const topic of [/custom (?:business )?(?:applications?|software|apps)|business applications?/i, /Salesforce/i, /AI|artificial intelligence/i]) assert.match(text, topic);
    assert((text.match(/\?/g) ?? []).length <= 1, 'At most one useful follow-up');
    assert.doesNotMatch(text, /\$|\bpric(?:e|ing)\b|\b10,?000\b|up to four|integration limits/i, 'No unsolicited package specifications or pricing');
  }
  const facts = (await ask([
    { id: 'intro', role: 'user', content: question },
    { id: 'reply', role: 'assistant', content: introduction },
    { id: 'facts', role: 'user', content: 'What is the starting price, how many supported integrations are included, does calendar scheduling count toward that total, and is an AI assistant included? What happens beyond the agreed scope?' },
  ])).text;
  t.diagnostic(`Requested package facts: ${facts}`);
  assert.match(facts, /\$10,000/);
  assert.match(facts, /up to (?:four|4)/i);
  assert.match(facts, /(?:calendar|scheduling).*(?:count|includ|total)|(?:count|includ|total).*(?:calendar|scheduling)/is);
  assert.match(facts, /(?:one|1).*assistant|assistant.*(?:one|1)/is);
  assert.match(facts, /separately|additional scope|separate scope|scoped|extra|additional cost/i);
  const approach = (await ask([{id:'approach',role:'user',content:'What is your architectural approach, and do you always require a particular technology platform?'}])).text;
  t.diagnostic(`Our Approach: ${approach}`);
  assert.match(approach, /business/i); assert.match(approach, /modular|maintain|evolv|change/i);
  assert.match(approach, /technology.independent|platform.agnostic|right (?:tools|technology|combination)|not.*(?:single|particular|one).*platform/i);
  const {assistantContent: copy} = loadScoutModule('src/content/assistant.ts');
  const fresh = (await ask([{id:'cta',role:'user',content:copy.bookingEntry.request}])).text;
  t.diagnostic(`Fresh booking: ${fresh}`);
  assert.match(fresh,/name/i); assert.match(fresh,/email/i); assert.match(fresh,/date|day|time/i);
  assert.doesNotMatch(fresh,/what (?:kind|type).*business|what.*business.*(?:run|operate)|technical requirements|pain points/i);
  const resumed = (await ask([
    {id:'intro',role:'user',content:"I'd like to schedule a free 30-minute consultation.\n\nMy name is Alex and my email is alex@example.invalid. We run a small business."},
    {id:'discovery',role:'assistant',content:'What kind of business do you run, and what would you like to improve?'},
    {id:'cta',role:'user',content:copy.bookingEntry.request},
  ])).text;
  t.diagnostic(`Booking overrides discovery: ${resumed}`);
  assert.match(resumed,/date|day|time/i);
  assert.doesNotMatch(resumed,/what (?:kind|type).*business|what.*business.*(?:run|operate)|what(?:'s| is) your name|what(?:'s| is) your email/i);
  assert.deepEqual(calls, [], 'Introductory/factual and missing-details answers need no scheduling actions');
  assert.equal(f.sent.length, 0); assert.equal(f.records.size, 0); assert.equal(f.booking.creates, 0);
});
